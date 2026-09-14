import { prisma } from '@proai/db';
import { isModuleUnfinished, type Module, type MyProgressResponse } from '@proai/types';
import { getModuleBySlug } from './courses';
import { getMyProgress } from './summary';

/**
 * Дані дашборда одним серверним проходом.
 *
 * Раніше сторінка була клієнтською й будувала їх двома послідовними запитами:
 * спершу /api/progress, а з його відповіді дізнавалася поточний модуль і аж тоді
 * питала /api/modules/<slug>. Тобто гарантований водоспад — другий запит не міг
 * навіть початися, доки не приїхав перший. Тут обидва кроки відбуваються на
 * сервері поруч із базою, і сторінка віддається вже зі вмістом.
 */

export interface DashboardData {
  progress: MyProgressResponse | null;
  /** Модуль, який слухач проходить зараз, — разом зі списком уроків. */
  currentModule: Module | null;
  /** Курсів кілька і жоден не обрано — дашборд пропонує вибір. */
  noActiveCourse: boolean;
}

/**
 * Курс, який показуємо слухачеві.
 *
 * Явно обраний → він. Інакше, якщо на платформі рівно один ВІДКРИТИЙ курс,
 * беремо його: це єдиний можливий вибір, а не припущення. Якщо доступних
 * кілька й жоден не обрано — повертаємо null, і сторінка пропонує обрати.
 *
 * Закриті курси (`comingSoon`) тут не рахуються взагалі: інакше поява
 * курсу-анонсу мовчки зламала б дашборд усім, хто ще не натискав «Розпочати».
 * Якщо курс закрили вже після вибору — обраним він теж більше не вважається.
 */
export async function resolveActiveCourseSlug(userId: string): Promise<string | null> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { activeCourse: { select: { slug: true, comingSoon: true } } },
  });
  if (user.activeCourse && !user.activeCourse.comingSoon) return user.activeCourse.slug;

  const courses = await prisma.course.findMany({ where: { comingSoon: false }, select: { slug: true }, take: 2 });
  return courses.length === 1 ? courses[0]!.slug : null;
}

export async function getDashboard(userId: string): Promise<DashboardData> {
  const courseSlug = await resolveActiveCourseSlug(userId);
  if (!courseSlug) return { progress: null, currentModule: null, noActiveCourse: true };

  const progress = await getMyProgress(userId, courseSlug);
  if (!progress) return { progress: null, currentModule: null, noActiveCourse: true };

  // Поточний модуль — перший незавершений. Незавершений означає «лишились
  // уроки АБО не складено тест»: раніше тест не враховувався, і модуль, у
  // якому лишалось тільки скласти тест, дашборд мовчки перескакував.
  const allModules = (progress.course.sections ?? []).flatMap((s) => s.modules ?? []);
  const current = allModules.find(isModuleUnfinished);

  const currentModule = current ? await getModuleBySlug(userId, current.slug) : null;

  return { progress, currentModule, noActiveCourse: false };
}
