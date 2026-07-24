import { prisma } from '@yasno/db';
import type { MyProgressResponse } from '@yasno/types';
import { getCourseOverview } from './courses';
import { hasCompletedAllModules } from './lib/completion';

/** Зведення для дашборда: єдиний курс з прогресом, серія, допуск до атестації. */
export async function getMyProgress(userId: string, courseSlug: string): Promise<MyProgressResponse | null> {
  const [user, course] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    getCourseOverview(userId, courseSlug),
  ]);
  if (!course) return null;

  const [examEligible, hasCertificate] = await Promise.all([
    hasCompletedAllModules(userId, course.id),
    prisma.certificate.findFirst({ where: { userId, revoked: false } }).then((c) => !!c),
  ]);

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
    streak: user.streak,
    totalMinutes,
    completedModules: course.completedModules ?? 0,
    moduleCount: course.moduleCount ?? 0,
    examEligible,
    hasCertificate,
  };
}
