/**
 * Генерує зону «📄 Контент уроку» у файлах `lessons/**.md` із того, що реально лежить
 * у базі. Зони «🎯 Для розробника» і «🛠 Матеріали для виробництва» пишуться руками
 * й не чіпаються.
 *
 * Навіщо: контент уроку живе у двох місцях — у `.md` і в `content/lessons-module-*.ts`.
 * Правки доводилось вносити двічі, і файли регулярно розходились. Тепер джерело істини
 * для тексту — контент на платформі, а `.md` лишається робочим документом автора
 * (задум, обґрунтування рішень, ТЗ на зйомку) з актуальним дзеркалом тексту всередині.
 *
 * Запуск: pnpm --filter @yasno/db export-lessons
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { LessonBlock } from '@yasno/types';
import { prisma } from './client';

const LESSONS_DIR = join(process.cwd(), '..', 'lessons');
const START = '## 📄 Контент уроку';
const END = '## 🛠 Матеріали для виробництва';

function renderBlock(b: LessonBlock, checkNo: { n: number }): string {
  switch (b.type) {
    case 'text':
      return `### [text]\n\n${b.html.trim()}`;
    case 'prompt':
      return [
        `### [prompt]${b.title ? ` ${b.title}` : ''}`,
        '',
        '```',
        b.body,
        '```',
        b.note ? `\n- **note під промптом:** ${b.note}` : '',
      ].join('\n');
    case 'image':
      return [
        `### [image] ${b.alt}`,
        '',
        `- **alt:** «${b.alt}»`,
        b.note ? `- **note (заглушка):** ${b.note}` : '',
        b.src ? `- **файл:** \`${b.src}\`` : '- **файл:** ще не знято',
      ]
        .filter(Boolean)
        .join('\n');
    case 'video':
      return [
        `### [video]${b.caption ? ` ${b.caption}` : ''}`,
        '',
        b.note ? `- **опис заглушки:** ${b.note}` : '',
        b.duration ? `- **орієнтовна тривалість:** ${b.duration}` : '',
        b.url ? `- **url:** ${b.url}` : '- **url:** ще немає, показуємо заглушку',
      ]
        .filter(Boolean)
        .join('\n');
    case 'check': {
      checkNo.n += 1;
      const opts = b.options
        .map((o, i) => `  ${i + 1}) ${o}${i === b.correctIndex ? ' ✅' : ''}`)
        .join('\n');
      return [
        `### [check] Мікроперевірка ${checkNo.n}`,
        '',
        `- **Питання:** ${b.question}`,
        '- **Варіанти:**',
        opts,
        `- **Якщо правильно:** ${b.explainCorrect}`,
        `- **Якщо помилка:** ${b.explainWrong}`,
      ].join('\n');
    }
    case 'pair':
      return [
        '### [pair]',
        '',
        `- **${b.dangerTitle ?? 'Ніколи так не робіть'}:** ${b.danger.note}`,
        '  ```',
        b.danger.example,
        '  ```',
        `- **${b.safeTitle ?? 'Ось як безпечно'}:** ${b.safe.note}`,
        '  ```',
        b.safe.example,
        '  ```',
      ].join('\n');
    case 'trafficLight':
      return `### [trafficLight]\n\n${b.categories.map((c) => `- **${c.label}** — ${c.description}: ${c.examples.join(' · ')}`).join('\n')}`;
    case 'redact':
      return `### [redact]\n\n- **intro:** ${b.intro}\n- **бланк:** ${b.letterhead}\n- фрагментів: ${b.segments.length}`;
    case 'file':
      return [
        `### [file] ${b.name}`,
        '',
        `- **url:** \`${b.url}\``,
        b.note ? `- **навіщо:** ${b.note}` : '',
        b.meta ? `- **дрібним:** ${b.meta}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    case 'sort':
      return [
        '### [sort] Тренажер-сортувальник',
        '',
        `- **intro:** ${b.intro}`,
        `- **категорії:** ${b.buckets.map((x) => `${x.label} (${x.tone})`).join(' · ')}`,
        '- **фрагменти:**',
        ...b.items.map((it, i) => `  ${i + 1}) ${it.text} → **${b.buckets[it.bucket]?.label ?? '?'}**\n     _${it.why}_`),
      ].join('\n');
    case 'pick':
      return [
        '### [pick] Тренажер-картки',
        '',
        `- **intro:** ${b.intro}`,
        `- **варіанти:** ${b.options.join(' / ')}`,
        '- **картки:**',
        ...b.cards.map((c, i) => `  ${i + 1}) ${c.text} → **${b.options[c.answer] ?? '?'}**\n     _${c.why}_`),
      ].join('\n');
    case 'builder':
      return [
        '### [builder] Конструктор промпту',
        '',
        `- **intro:** ${b.intro}`,
        '- **поля:**',
        ...b.fields.map(
          (f, i) =>
            `  ${i + 1}) **${f.label}**${f.optional ? ' _(за потреби)_' : ''} — ${f.hint}\n     _плейсхолдер:_ ${f.placeholder}` +
            (f.examples?.length ? `\n     _приклади:_ ${f.examples.map((e) => `«${e}»`).join(' · ')}` : ''),
        ),
        b.outro ? `- **під результатом:** ${b.outro}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    case 'spot': {
      const segs = b.paragraphs.flat();
      const flags = segs.filter((s2): s2 is Extract<typeof s2, { flag: true }> => 'flag' in s2);
      return [
        '### [spot] Вправа «знайди помилки»',
        '',
        `- **intro:** ${b.intro}`,
        `- **шапка документа:** ${b.docHead}`,
        `- **помилок:** ${flags.filter((f) => f.wrong).length} · **приманок:** ${flags.filter((f) => !f.wrong).length}`,
        '',
        '**Текст документа** (клікабельні фрагменти в подвійних дужках):',
        '',
        ...b.paragraphs.map(
          (para) => para.map((s2) => ('flag' in s2 ? `[[${s2.text}]]` : s2.text)).join(''),
        ),
        '',
        '**Розбір фрагментів:**',
        ...flags.map((f) => `- ${f.wrong ? '❌' : '✅'} «${f.text}» — ${f.why}`),
      ].join('\n');
    }
    default:
      return '';
  }
}

async function main() {
  const files: string[] = [];
  for (const dir of readdirSync(LESSONS_DIR, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    for (const f of readdirSync(join(LESSONS_DIR, dir.name))) {
      if (f.endsWith('.md')) files.push(join(LESSONS_DIR, dir.name, f));
    }
  }

  let updated = 0;
  let skipped = 0;

  for (const file of files) {
    const md = readFileSync(file, 'utf-8');
    const slugMatch = md.match(/\*\*Слуг:\*\*\s*`([^`]+)`/);
    if (!slugMatch) {
      console.log(`  ⚠️  ${file.split('/').pop()}: у шапці немає «**Слуг:** \`...\`» — пропускаю`);
      skipped += 1;
      continue;
    }

    const lesson = await prisma.lesson.findUnique({ where: { slug: slugMatch[1] } });
    if (!lesson) {
      console.log(`  ⚠️  ${slugMatch[1]}: уроку немає в базі — пропускаю`);
      skipped += 1;
      continue;
    }

    const i = md.indexOf(START);
    const j = md.indexOf(END);
    if (i === -1 || j === -1 || j < i) {
      console.log(`  ⚠️  ${slugMatch[1]}: не знайдено зон 📄/🛠 — пропускаю`);
      skipped += 1;
      continue;
    }

    const blocks = JSON.parse(lesson.content) as LessonBlock[];
    const checkNo = { n: 0 };
    const body = blocks.map((b) => renderBlock(b, checkNo)).filter(Boolean).join('\n\n---\n\n');

    const zone = `${START}\n\n> Згенеровано з контенту платформи (\`pnpm --filter @yasno/db export-lessons\`).\n> Правити текст уроку — у \`prisma/src/content/lessons-module-*.ts\`, а не тут.\n\n${body}\n\n---\n\n`;

    writeFileSync(file, md.slice(0, i) + zone + md.slice(j), 'utf-8');
    updated += 1;
  }

  console.log(`\nОновлено зону 📄 у ${updated} файлах. Пропущено: ${skipped}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
