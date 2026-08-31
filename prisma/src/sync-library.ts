/**
 * Перебудовує бібліотеку з контенту уроків.
 *
 * Запуск: pnpm --filter @proai/db sync-library
 *
 * Джерела матеріалів:
 *   1. блоки уроків (prompt, builder, pair, trafficLight, file, image) — автоматично;
 *   2. content/library-extras.ts — памʼятки, принципи й глосарій, написані руками.
 *
 * Що робить із базою:
 *   • оновлює або створює записи з `sourceKey` (згенеровані);
 *   • видаляє згенеровані записи, яких більше немає в контенті;
 *   • НЕ чіпає записи без `sourceKey` — це матеріали, створені в адмінці.
 *
 * Прогрес слухачів не змінюється: скрипт працює лише з Resource і Prompt.
 */
import { sanitizeRichHtml } from '@proai/infra';
import type { LessonBlock } from '@proai/types';
import { prisma } from './client';
import { extractLibraryItems } from './library-extract';
import { extraResources, extraPrompts, handAuthoredLessonMap } from './content/library-extras';

/** `extras:<slug-уроку>:<індекс>` — щоб не перетнутися з ключами блоків (`<slug>#<i>`). */
function extraKey(lessonSlug: string, i: number): string {
  return `extras:${lessonSlug}:${i}`;
}

async function main() {
  const lessons = await prisma.lesson.findMany({ select: { id: true, slug: true, title: true, content: true } });
  const lessonBySlug = new Map(lessons.map((l) => [l.slug, l]));

  const resourceRows: Array<{
    sourceKey: string;
    lessonId: string;
    title: string;
    summary: string;
    body: string;
    kind: string;
  }> = [];
  const promptRows: Array<{
    sourceKey: string;
    lessonId: string;
    title: string;
    useCase: string;
    body: string;
    category: string;
  }> = [];

  /* 1. Автоматично — з блоків кожного уроку. */
  for (const lesson of lessons) {
    let blocks: LessonBlock[];
    try {
      blocks = JSON.parse(lesson.content) as LessonBlock[];
    } catch {
      console.warn(`  ⚠ урок ${lesson.slug}: контент не розбирається як JSON — пропущено`);
      continue;
    }

    const { prompts, resources } = extractLibraryItems(lesson.slug, lesson.title, blocks);
    for (const r of resources) {
      resourceRows.push({ ...r, lessonId: lesson.id, body: sanitizeRichHtml(r.body) });
    }
    for (const p of prompts) {
      // Тіло промпту — звичайний текст із плейсхолдерами, а не розмітка:
      // санітизація тут тільки зіпсувала б кутові дужки.
      promptRows.push({ ...p, lessonId: lesson.id });
    }
  }

  /* 2. Руками — памʼятки, принципи, глосарій. */
  extraResources.forEach((r, i) => {
    const lesson = lessonBySlug.get(r.lesson);
    if (!lesson) {
      console.warn(`  ⚠ library-extras: уроку «${r.lesson}» немає в базі — матеріал «${r.title}» пропущено`);
      return;
    }
    resourceRows.push({
      sourceKey: extraKey(r.lesson, i),
      lessonId: lesson.id,
      title: r.title,
      summary: r.summary,
      body: sanitizeRichHtml(r.body),
      kind: r.kind,
    });
  });

  extraPrompts.forEach((p, i) => {
    const lesson = lessonBySlug.get(p.lesson);
    if (!lesson) {
      console.warn(`  ⚠ library-extras: уроку «${p.lesson}» немає в базі — промпт «${p.title}» пропущено`);
      return;
    }
    promptRows.push({
      sourceKey: extraKey(p.lesson, i),
      lessonId: lesson.id,
      title: p.title,
      useCase: p.useCase,
      body: p.body,
      category: p.category,
    });
  });

  /* 3. Запис. Upsert по sourceKey — повторний запуск не плодить дублів. */
  for (const r of resourceRows) {
    const data = {
      title: r.title,
      summary: r.summary,
      body: r.body,
      kind: r.kind as never,
      lessonId: r.lessonId,
    };
    await prisma.resource.upsert({
      where: { sourceKey: r.sourceKey },
      create: { ...data, sourceKey: r.sourceKey, version: '1.0' },
      update: data,
    });
  }

  for (const p of promptRows) {
    const data = {
      title: p.title,
      useCase: p.useCase,
      body: p.body,
      category: p.category as never,
      lessonId: p.lessonId,
    };
    await prisma.prompt.upsert({
      where: { sourceKey: p.sourceKey },
      create: { ...data, sourceKey: p.sourceKey },
      // copyCount навмисно не чіпаємо: це статистика слухачів, а не контент.
      update: data,
    });
  }

  /* 4. Прибирання: згенеровані записи, яких більше немає в контенті. */
  const keptResources = resourceRows.map((r) => r.sourceKey);
  const keptPrompts = promptRows.map((p) => p.sourceKey);

  const staleResources = await prisma.resource.deleteMany({
    where: { sourceKey: { not: null, notIn: keptResources } },
  });
  const stalePrompts = await prisma.prompt.deleteMany({
    where: { sourceKey: { not: null, notIn: keptPrompts } },
  });

  /* 5. Матеріали з адмінки: проставляємо урок за таблицею, вміст не чіпаємо. */
  let linked = 0;
  for (const [title, lessonSlug] of Object.entries(handAuthoredLessonMap)) {
    const lesson = lessonBySlug.get(lessonSlug);
    if (!lesson) {
      console.warn(`  ⚠ привʼязка «${title}»: уроку «${lessonSlug}» немає в базі`);
      continue;
    }
    const [r, p] = await Promise.all([
      prisma.resource.updateMany({ where: { title, sourceKey: null }, data: { lessonId: lesson.id } }),
      prisma.prompt.updateMany({ where: { title, sourceKey: null }, data: { lessonId: lesson.id } }),
    ]);
    linked += r.count + p.count;
  }

  /*
   * Попередження про матеріали, які до слухача не дійдуть. Найчастіша причина —
   * запис створили в адмінці й не заповнили тіло: картка відкривалася б порожнім
   * діалогом. Друга — немає привʼязки до уроку.
   */
  const orphans = await prisma.resource.findMany({
    where: { sourceKey: null, OR: [{ lessonId: null }, { body: '' }] },
    select: { title: true, lessonId: true, body: true },
  });
  for (const o of orphans) {
    const why = !o.lessonId ? 'немає привʼязки до уроку' : 'порожній текст';
    console.warn(`  ⚠ «${o.title}» не потрапить у бібліотеку слухача: ${why}`);
  }

  const lessonsWithTrophies = new Set([
    ...resourceRows.map((r) => r.lessonId),
    ...promptRows.map((p) => p.lessonId),
  ]);

  console.log(`Матеріалів (Resource): ${resourceRows.length}, промптів: ${promptRows.length}.`);
  console.log(`Привʼязано до уроків матеріалів з адмінки: ${linked}.`);
  console.log(`Уроків, які щось дають у бібліотеку: ${lessonsWithTrophies.size} з ${lessons.length}.`);
  console.log(`Прибрано застарілих: ресурсів ${staleResources.count}, промптів ${stalePrompts.count}.`);
  console.log('Матеріали, створені в адмінці (без sourceKey), не змінювалися.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
