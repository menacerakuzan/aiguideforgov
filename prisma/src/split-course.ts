/**
 * Разовий скрипт: виносить розділи 2–8 із курсу «ШІ в публічній службі» в окремий курс.
 *
 * Навіщо: Розділ 1 «Основи ШІ» — самодостатній базовий курс (реєстрація → перші задачі →
 * безпека → промптинг → перевірка) з власною атестацією й сертифікатом. Розділи 2–8 —
 * прикладні, за напрямами роботи й інструментами; змішувати їх в одному курсі означає
 * показувати новачкові вісім розділів одразу.
 *
 * Чому окремий скрипт, а не seed: `db:seed` очищає базу разом із користувачами, сесіями
 * й прогресом. Тут ми лише створюємо новий курс і переносимо в нього наявні розділи —
 * жодних видалень.
 *
 * Запуск: pnpm --filter @proai/db split-course
 * Скрипт ідемпотентний: повторний запуск нічого не зламає.
 */
import { prisma } from './client';

const SOURCE_COURSE = 'shi-v-publichnii-sluzhbi';
const TARGET_COURSE = {
  slug: 'shi-za-napriamamy-roboty',
  title: 'ШІ за напрямами роботи',
  description:
    'Продовження базового курсу: інструменти ШІ під конкретні задачі — документи й тексти, таблиці та дані, щоденна робота, презентації, аудіо, зображення, пошук і переклад.',
};

/** Розділи, що лишаються в базовому курсі. Решта переїжджає. */
const KEEP_IN_SOURCE = ['osnovy-shi'];

async function main() {
  const source = await prisma.course.findUnique({
    where: { slug: SOURCE_COURSE },
    include: { sections: { orderBy: { order: 'asc' } } },
  });

  if (!source) throw new Error(`Курс «${SOURCE_COURSE}» не знайдено — нічого переносити.`);

  const moving = source.sections.filter((s) => !KEEP_IN_SOURCE.includes(s.slug));

  if (moving.length === 0) {
    console.log('Розділи вже перенесено — курс містить лише «Основи ШІ». Нічого не роблю.');
    return;
  }

  const target = await prisma.course.upsert({
    where: { slug: TARGET_COURSE.slug },
    update: { title: TARGET_COURSE.title, description: TARGET_COURSE.description },
    create: TARGET_COURSE,
  });

  console.log(`Переношу ${moving.length} розділів у курс «${target.title}»:`);

  for (const [i, section] of moving.entries()) {
    await prisma.section.update({
      where: { id: section.id },
      data: { courseId: target.id, order: i + 1 },
    });
    console.log(`  ${i + 1}. ${section.title}`);
  }

  /* Розділ, що лишився, має бути першим у базовому курсі. */
  const kept = source.sections.filter((s) => KEEP_IN_SOURCE.includes(s.slug));
  for (const [i, section] of kept.entries()) {
    await prisma.section.update({ where: { id: section.id }, data: { order: i + 1 } });
  }

  /* Опис базового курсу — тепер він саме про основи. */
  await prisma.course.update({
    where: { id: source.id },
    data: {
      description:
        'Базовий курс для працівників органів влади: як безпечно й ефективно використовувати штучний інтелект у щоденній роботі — від першого запиту до готового документа.',
    },
  });

  const [srcCount, tgtCount] = await Promise.all([
    prisma.section.count({ where: { courseId: source.id } }),
    prisma.section.count({ where: { courseId: target.id } }),
  ]);

  console.log(`\nГотово. «${source.title}»: ${srcCount} розділ(и). «${target.title}»: ${tgtCount} розділ(и).`);
  console.log('Користувачів, сесії, прогрес і сертифікати не змінено.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
