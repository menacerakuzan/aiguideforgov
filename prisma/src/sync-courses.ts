/**
 * Оновлює МЕТАДАНІ курсів (назва, опис, відкритість) по slug — без стирання бази.
 *
 * Той самий принцип, що в `sync-content.ts` і `sync-quiz.ts`: `seed.ts` чистить
 * усе разом із користувачами й прогресом, тому на робочій базі структурні
 * дрібниці міняємо окремим ідемпотентним скриптом.
 *
 * Запуск: pnpm db:sync-courses
 *
 * Розділів, модулів і уроків не чіпає — лише поля самого курсу.
 */
import { prisma } from './client';

interface CourseMeta {
  slug: string;
  title: string;
  description: string;
  /** Курс закритий для навчання: видно в списку з позначкою «скоро», всередину не пускає. */
  comingSoon: boolean;
}

/** Джерело істини для метаданих курсів — звідси ж їх бере `seed.ts`. */
const courses: CourseMeta[] = [
  {
    slug: 'shi-v-publichnii-sluzhbi',
    title: 'ШІ в публічній службі',
    description:
      'Базовий курс для працівників органів влади: як безпечно й ефективно використовувати штучний інтелект у щоденній роботі — від першого запиту до готового документа.',
    comingSoon: false,
  },
  {
    slug: 'shi-za-napriamamy-roboty',
    title: 'Продвинутий курс',
    description:
      'Продовження базового курсу: інструменти ШІ під конкретні задачі — документи й тексти, таблиці та дані, щоденна робота, презентації, аудіо, зображення, пошук і переклад.',
    comingSoon: true,
  },
];

async function main() {
  let updated = 0;
  let missing = 0;

  for (const c of courses) {
    const res = await prisma.course.updateMany({
      where: { slug: c.slug },
      data: { title: c.title, description: c.description, comingSoon: c.comingSoon },
    });
    if (res.count > 0) {
      updated += res.count;
      console.log(`  ✓ ${c.slug} → «${c.title}»${c.comingSoon ? ' (закритий)' : ''}`);
    } else {
      missing += 1;
      console.warn(`  ⚠ курсу немає в базі (slug: ${c.slug}) — пропущено`);
    }
  }

  // Курс, який щойно закрили, більше не може лишатися активним у слухачів:
  // інакше дашборд просив би в getMyProgress прогрес по недоступному курсу.
  const closed = courses.filter((c) => c.comingSoon).map((c) => c.slug);
  const reset = await prisma.user.updateMany({
    where: { activeCourse: { slug: { in: closed } } },
    data: { activeCourseId: null },
  });

  console.log(`Оновлено курсів: ${updated}. Пропущено (немає в базі): ${missing}.`);
  console.log(`Скинуто активний курс у слухачів (курс закрито): ${reset.count}.`);
  console.log('Розділи, модулі, уроки та прогрес не змінено.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
