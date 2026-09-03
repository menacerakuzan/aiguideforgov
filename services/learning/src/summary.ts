import { prisma } from '@proai/db';
import type { MyProgressResponse } from '@proai/types';
import { getCourseOverview } from './courses';
import { getStreak } from './streak';

/** Зведення для дашборда: єдиний курс з прогресом, серія, допуск до атестації. */
export async function getMyProgress(userId: string, courseSlug: string): Promise<MyProgressResponse | null> {
  const [streak, course] = await Promise.all([getStreak(userId), getCourseOverview(userId, courseSlug)]);
  if (!course) return null;

  // getCourseOverview уже порахував проходження кожного модуля — повторний
  // hasCompletedAllModules() означав би ще один повний обхід курсу по базі.
  const examEligible = (course.moduleCount ?? 0) > 0 && (course.completedModules ?? 0) === course.moduleCount;

  const hasCertificate = await prisma.certificate
    .findFirst({ where: { userId, revoked: false } })
    .then((c) => !!c);

  let totalMinutes = 0;
  for (const s of course.sections ?? []) {
    for (const m of s.modules ?? []) {
      if (!m.lessonCount) continue;
      const share = (m.completedLessons ?? 0) / m.lessonCount;
      totalMinutes += Math.round(m.minutes * share);
    }
  }

  return {
    course,
    streak,
    totalMinutes,
    completedModules: course.completedModules ?? 0,
    moduleCount: course.moduleCount ?? 0,
    examEligible,
    hasCertificate,
  };
}
