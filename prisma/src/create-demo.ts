/**
 * Демо-слухачка для промо-ролика: акаунт із ЖИВИМ прогресом, а не намальованим.
 *
 * Навіщо. Порожній кабінет платформу не показує: у кадрі має бути смуга
 * прогресу, зараховані тести, замок на ще недоступному модулі й серія днів.
 * Усе це платформа рахує сама з таблиць `Progress` і `Attempt`, тому підробити
 * картинку не можна — можна лише створити справжню історію навчання.
 *
 * Головна пастка — СЕРІЯ ДНІВ. `User.streak` це лише кеш; дашборд рахує серію
 * заново з дат активності (services/learning/src/streak.ts), і поточна серія
 * дорівнює нулю, якщо остання активність не сьогодні й не вчора. Тому дати
 * розкладаються по ПОСЛІДОВНИХ київських днях, і останній день — сьогодні.
 * Саме через це в наявної Наталії Осадчої в базі `streak: 21`, а на екрані нуль.
 *
 * Запуск: pnpm --filter @proai/db create-demo
 * Ідемпотентний: прогрес і спроби цієї слухачки щоразу перескладаються з нуля,
 * решта бази не змінюється.
 */
import { hashPassword } from 'better-auth/crypto';
import { prisma } from './client';

const COURSE_SLUG = 'shi-v-publichnii-sluzhbi';

const PROFILE = {
  name: 'Марина Гончаренко',
  position: 'Головний спеціаліст відділу звернень громадян',
};

interface ModulePlan {
  /** 'all' — модуль пройдено повністю; число — скільки перших уроків зараховано. */
  lessons: 'all' | number;
  /** Бал зарахованого тесту, або null, якщо до тесту ще не дійшли. */
  score: number | null;
}

/**
 * Модулі 1–3 закриті повністю, четвертий у роботі, пʼятий ще під замком —
 * саме той стан, який цікаво показати: видно і пройдене, і шлях далі.
 */
const PLAN: ModulePlan[] = [
  { lessons: 'all', score: 90 },
  { lessons: 'all', score: 88 },
  { lessons: 'all', score: 92 }, // ключовий модуль, поріг 90 %
  { lessons: 4, score: null },
  { lessons: 0, score: null },
];

/** Скільки днів поспіль тривало навчання. Останній день — сьогодні. */
const STREAK_DAYS = 12;

/** Години київського дня, в які «навчалась» людина. Київ у вересні — UTC+3. */
const HOURS = ['09:20', '12:45', '16:30', '20:10'];
const KYIV_OFFSET = '+03:00';

/**
 * Елемент масиву з перевіркою. У проєкті ввімкнено `noUncheckedIndexedAccess`,
 * і мовчазний `undefined` у розкладі дат обернувся б порожньою датою в базі —
 * краще впасти тут, ніж показати в кадрі порожній кабінет.
 */
function nth<T>(arr: readonly T[], index: number, what: string): T {
  const value = arr[index];
  if (value === undefined) throw new Error(`${what}: немає елемента ${index}`);
  return value;
}

/** Дати останніх STREAK_DAYS днів, від найдавнішої до сьогоднішньої. */
function activityDays(): string[] {
  const today = new Date();
  const out: string[] = [];
  for (let i = STREAK_DAYS - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    out.push(`${d.getFullYear()}-${month}-${day}`);
  }
  return out;
}

/**
 * Розкладає події по днях і одразу зшиває кожну з її датою — щоб далі не
 * ходити по двох масивах за індексом.
 *
 * Кожен день дістає хоча б одну подію: пропущений день розриває серію, і
 * кабінет показав би не дванадцять днів поспіль, а два.
 */
function schedule<T>(items: readonly T[]): Array<{ item: T; at: Date }> {
  const days = activityDays();
  const perDay = days.map(() => 1);
  for (let i = days.length; i < items.length; i += 1) {
    const slot = i % days.length;
    perDay[slot] = nth(perDay, slot, 'розклад днів') + 1;
  }

  // Сьогоднішні події мусять лежати в МИНУЛОМУ. Фіксовані вечірні години
  // ставили останній урок на 16:30 навіть тоді, коли скрипт запускали опівдні,
  // і кабінет показував активність, якої ще не було.
  const cutoff = Date.now() - 12 * 60 * 1000;

  const moments: Date[] = [];
  days.forEach((day, dayIndex) => {
    const count = nth(perDay, dayIndex, 'кількість подій за день');

    if (dayIndex === days.length - 1) {
      // Сьогодні: розкладаємо рівно до «щойно», щоб остання подія в базі була
      // найсвіжішою і серія читалась як активна.
      const morning = new Date(`${day}T09:20:00${KYIV_OFFSET}`).getTime();
      const dayStart = new Date(`${day}T00:10:00${KYIV_OFFSET}`).getTime();
      const start = Math.min(morning < cutoff ? morning : dayStart, cutoff);
      const step = count > 1 ? (cutoff - start) / (count - 1) : 0;
      for (let k = 0; k < count; k += 1) moments.push(new Date(start + step * k));
      return;
    }

    for (let k = 0; k < count; k += 1) {
      const hour = nth(HOURS, k % HOURS.length, 'година дня');
      // Кілька подій в одну годину розводимо хвилинами, щоб порядок був явний.
      const minuteShift = Math.floor(k / HOURS.length) * 7;
      const base = new Date(`${day}T${hour}:00${KYIV_OFFSET}`);
      base.setMinutes(base.getMinutes() + minuteShift);
      moments.push(base);
    }
  });

  moments.sort((a, b) => a.getTime() - b.getTime());
  return items.map((item, i) => ({ item, at: nth(moments, i, 'момент часу') }));
}

type LearningEvent =
  | { kind: 'lesson'; lessonId: string }
  | { kind: 'quiz'; quizId: string; questions: number; score: number };

async function main() {
  const email = process.env.DEMO_EMAIL;
  const password = process.env.DEMO_PASSWORD;
  if (!email || !password) {
    throw new Error('Потрібні DEMO_EMAIL і DEMO_PASSWORD у .env');
  }

  const org = await prisma.organization.findFirst({ select: { id: true, name: true } });
  if (!org) throw new Error('У базі немає жодного органу влади — спершу pnpm db:seed');

  const course = await prisma.course.findUnique({
    where: { slug: COURSE_SLUG },
    select: {
      id: true,
      sections: {
        orderBy: { order: 'asc' },
        select: {
          modules: {
            orderBy: { order: 'asc' },
            select: {
              title: true,
              lessons: { orderBy: { order: 'asc' }, select: { id: true } },
              quiz: { select: { id: true, questions: { select: { id: true } } } },
            },
          },
        },
      },
    },
  });
  if (!course) throw new Error(`Курсу ${COURSE_SLUG} немає в базі`);

  const modules = course.sections.flatMap((s) => s.modules);
  if (modules.length !== PLAN.length) {
    throw new Error(`У курсі ${modules.length} модулів, а план розписано на ${PLAN.length}`);
  }

  // Модулі одразу зшиваємо з планом — далі по індексах не ходимо.
  const planned = modules.map((module, i) => ({ module, plan: nth(PLAN, i, 'план модуля') }));

  // ── акаунт ────────────────────────────────────────────────────────────────
  const hash = await hashPassword(password);
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });

  const profile = {
    name: PROFILE.name,
    position: PROFILE.position,
    organizationId: org.id,
    role: 'LEARNER' as const,
    emailVerified: true,
    activeCourseId: course.id,
  };

  const user = existing
    ? await prisma.user.update({ where: { id: existing.id }, data: profile })
    : await prisma.user.create({ data: { ...profile, email } });

  const account = await prisma.account.findFirst({
    where: { userId: user.id, providerId: 'credential' },
    select: { id: true },
  });
  if (account) {
    await prisma.account.update({ where: { id: account.id }, data: { password: hash } });
  } else {
    // accountId = userId — так само, як це робить Better Auth для email/password.
    await prisma.account.create({
      data: { userId: user.id, accountId: user.id, providerId: 'credential', password: hash },
    });
  }

  console.log(`  ${existing ? '✓' : '+'} слухачка ${PROFILE.name} <${email}>, ${org.name}`);

  // ── історія навчання складається щоразу заново ────────────────────────────
  await prisma.progress.deleteMany({ where: { userId: user.id } });
  await prisma.attempt.deleteMany({ where: { userId: user.id } });
  await prisma.examAttempt.deleteMany({ where: { userId: user.id } });

  // Порядок подій навчальний: спершу уроки модуля, потім його тест.
  const events: LearningEvent[] = [];

  for (const { module, plan } of planned) {
    const take = plan.lessons === 'all' ? module.lessons.length : plan.lessons;
    for (const lesson of module.lessons.slice(0, take)) {
      events.push({ kind: 'lesson', lessonId: lesson.id });
    }
    if (plan.score !== null && module.quiz) {
      events.push({
        kind: 'quiz',
        quizId: module.quiz.id,
        questions: module.quiz.questions.length,
        score: plan.score,
      });
    }
  }

  // Розклад рахуємо РАЗ: другий виклик узяв би новий «зараз» і остання дата
  // в базі розійшлася б із тією, що ми запишемо в lastActiveAt.
  const scheduled = schedule(events);

  for (const { item, at } of scheduled) {
    if (item.kind === 'lesson') {
      await prisma.progress.create({ data: { userId: user.id, lessonId: item.lessonId, completedAt: at } });
      continue;
    }
    // Відповіді зберігаємо як індекси обраних варіантів — рівно стільки,
    // скільки питань у тесті. Формат той самий, що пише services/learning.
    const answers = Array.from({ length: item.questions }, () => 1);
    await prisma.attempt.create({
      data: {
        userId: user.id,
        quizId: item.quizId,
        score: item.score,
        passed: true,
        answers: JSON.stringify(answers),
        createdAt: at,
      },
    });
  }

  const last = scheduled[scheduled.length - 1];
  const doneLessons = events.filter((e) => e.kind === 'lesson').length;
  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const streak = activityDays().length;

  await prisma.user.update({
    where: { id: user.id },
    data: { streak, lastActiveAt: last ? last.at : new Date() },
  });

  const percent = Math.round((doneLessons / totalLessons) * 100);
  console.log(`  ✓ уроків: ${doneLessons} з ${totalLessons} (${percent} %)`);
  planned.forEach(({ module, plan }, i) => {
    const mark = plan.score !== null ? `тест ${plan.score} %` : plan.lessons === 0 ? 'ще не починали' : 'у роботі';
    console.log(`     ${i + 1}. ${module.title} — ${mark}`);
  });
  console.log(`  ✓ серія днів: ${streak}, остання активність сьогодні`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
