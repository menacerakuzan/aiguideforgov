import { prisma } from '@proai/db';
import type { PlatformStatsResponse, PublicStatsResponse } from '@proai/types';

/**
 * Публічна статистика для лендингу — не прив'язана до жодного конкретного
 * курсу чи набору модулів, аби текст на головній лишався універсальним і при
 * зміні фокусу курсу (інший розділ, інший склад модулів) не потребував правок.
 */
export async function getPublicStats(): Promise<PublicStatsResponse> {
  const [learnerCount, moduleCount, sectionCount, modules] = await Promise.all([
    prisma.user.count({ where: { role: 'LEARNER' } }),
    prisma.module.count(),
    prisma.section.count(),
    prisma.module.findMany({ select: { minutes: true } }),
  ]);

  const totalMinutes = modules.reduce((sum, m) => sum + m.minutes, 0);

  return { learnerCount, moduleCount, totalMinutes, sectionCount };
}

/** Платформенна статистика для адмін-дашборда. */
export async function getPlatformStats(): Promise<PlatformStatsResponse> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);

  const [totalUsers, activeLast7Days, certificatesIssued, attempts, totalLessons, learners] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { lastActiveAt: { gte: sevenDaysAgo } } }),
    prisma.certificate.count({ where: { revoked: false } }),
    prisma.attempt.aggregate({ _avg: { score: true } }),
    prisma.lesson.count(),
    prisma.user.findMany({
      where: { role: 'LEARNER' },
      select: { id: true, _count: { select: { progress: true } } },
    }),
  ]);

  const started = learners.filter((l) => l._count.progress > 0).length;
  const completedAllModules = totalLessons > 0 ? learners.filter((l) => l._count.progress >= totalLessons).length : 0;

  return {
    totalUsers,
    activeLast7Days,
    certificatesIssued,
    averageQuizScore: Math.round(attempts._avg.score ?? 0),
    started,
    completedAllModules,
  };
}
