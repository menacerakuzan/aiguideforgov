/**
 * Оновлює ЛИШЕ контент уроків (по slug) — без очищення бази.
 * На відміну від `seed.ts`, не видаляє користувачів, сесії та прогрес,
 * тож розробник не вилітає з акаунта й не втрачає прогрес під час правок контенту.
 *
 * Запуск: pnpm --filter @yasno/db sync-content
 *
 * Оновлює title / minutes / kind / content для наявних уроків. Структуру
 * (нові/видалені уроки, модулі, порядок) не змінює — для цього потрібен повний seed.
 */
import { prisma } from './client';
import { module1Lessons } from './content/lessons-module-1';
import { module2Lessons } from './content/lessons-module-2';
import { module3Lessons } from './content/lessons-module-3';
import { module4Lessons } from './content/lessons-module-4';
import { module5Lessons } from './content/lessons-module-5';
import type { SeedLesson } from './content/lessons-module-1';

async function main() {
  const all: SeedLesson[] = [
    ...module1Lessons,
    ...module2Lessons,
    ...module3Lessons,
    ...module4Lessons,
    ...module5Lessons,
  ];

  let updated = 0;
  let missing = 0;

  for (const l of all) {
    const res = await prisma.lesson.updateMany({
      where: { slug: l.slug },
      data: {
        title: l.title,
        minutes: l.minutes,
        kind: l.kind ?? 'LESSON',
        content: JSON.stringify(l.blocks),
      },
    });
    if (res.count > 0) updated += res.count;
    else {
      missing += 1;
      console.warn(`  ⚠ уроку немає в базі (slug: ${l.slug}) — пропущено`);
    }
  }

  console.log(`Оновлено контент уроків: ${updated}. Пропущено (немає в базі): ${missing}.`);
  console.log('Користувачів, сесії та прогрес не змінено.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
