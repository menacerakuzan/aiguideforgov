/**
 * Оновлює МЕТАДАНІ курсів (назва, опис, відкритість, порядок) по slug —
 * без стирання бази. Курс, якого ще немає, СТВОРЮЄ.
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
  /**
   * Місце в списку. Без явного поля закриті курси шикувалися за назвою, і
   * «Продвинутий курс» ставав перед «ШІ для відкритих даних»: у кириличній
   * абетці П іде раніше за Ш. Порядок задаємо тут, а не вгадуємо з назви.
   */
  order: number;
}

/** Джерело істини для метаданих курсів — звідси ж їх бере `seed.ts`. */
const courses: CourseMeta[] = [
  {
    slug: 'shi-v-publichnii-sluzhbi',
    title: 'ШІ в публічній службі',
    description:
      'Базовий курс для працівників органів влади: як безпечно й ефективно використовувати штучний інтелект у щоденній роботі — від першого запиту до готового документа.',
    comingSoon: false,
    order: 1,
  },
  {
    slug: 'shi-dlia-vidkrytykh-danykh',
    title: 'ШІ для відкритих даних',
    description:
      'Прикладний курс про набори відкритих даних: де їх шукати, як вивантажити й привести масив до ладу. Далі — аналіз за допомогою ШІ: закономірності, аномалії, висновки для керівництва, візуалізація та підготовка даних до оприлюднення.',
    comingSoon: true,
    order: 2,
  },
  {
    slug: 'shi-za-napriamamy-roboty',
    title: 'Продвинутий курс',
    description:
      'Продовження базового курсу: інструменти ШІ під конкретні задачі — документи й тексти, таблиці та дані, щоденна робота, презентації, аудіо, зображення, пошук і переклад.',
    comingSoon: true,
    order: 3,
  },
];

async function main() {
  let updated = 0;
  let created = 0;

  for (const c of courses) {
    // Чи курс уже є, питаємо ОКРЕМО, перед upsert: сам upsert не каже, якою
    // гілкою пішов, а в журналі різниця між «оновив» і «створив» важлива —
    // саме вона показує, що новий курс справді зʼявився в базі.
    const existing = await prisma.course.findUnique({ where: { slug: c.slug }, select: { id: true } });

    await prisma.course.upsert({
      where: { slug: c.slug },
      update: { title: c.title, description: c.description, comingSoon: c.comingSoon, order: c.order },
      create: {
        slug: c.slug,
        title: c.title,
        description: c.description,
        comingSoon: c.comingSoon,
        order: c.order,
      },
    });

    const mark = c.comingSoon ? ' (закритий)' : '';
    if (existing) {
      updated += 1;
      console.log(`  ✓ ${c.slug} → «${c.title}»${mark}`);
    } else {
      created += 1;
      console.log(`  + ${c.slug} → «${c.title}»${mark} — створено`);
    }
  }

  // Курс, який щойно закрили, більше не може лишатися активним у слухачів:
  // інакше дашборд просив би в getMyProgress прогрес по недоступному курсу.
  const closed = courses.filter((c) => c.comingSoon).map((c) => c.slug);
  const reset = await prisma.user.updateMany({
    where: { activeCourse: { slug: { in: closed } } },
    data: { activeCourseId: null },
  });

  console.log(`Оновлено курсів: ${updated}. Створено: ${created}.`);
  console.log(`Скинуто активний курс у слухачів (курс закрито): ${reset.count}.`);
  console.log('Розділи, модулі, уроки та прогрес не змінено.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
