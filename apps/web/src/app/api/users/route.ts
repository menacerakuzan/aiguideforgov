import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@proai/db';
import { cachedStreak } from '@proai/learning';
import { requireCurrentUser, requireAdmin, ForbiddenError } from '@proai/auth';
import { UpdateUserRoleInputSchema, type UsersListResponse } from '@proai/types';
import { withApiErrors } from '@/lib/api-guard';

/**
 * Скільки модулів пройшов кожен користувач — трьома запитами на всю таблицю,
 * а не запитом на кожного користувача. Попередня версія робила
 * `prisma.module.count()` у циклі по users: на 500 слухачах це 500 запитів
 * до SQLite на одне відкриття сторінки адміністрування.
 */
async function completedModulesByUser(): Promise<Map<string, number>> {
  const [lessons, progress] = await Promise.all([
    prisma.lesson.findMany({ select: { id: true, moduleId: true } }),
    prisma.progress.findMany({ select: { userId: true, lessonId: true } }),
  ]);

  const moduleOfLesson = new Map(lessons.map((l) => [l.id, l.moduleId]));
  const lessonsInModule = new Map<string, number>();
  for (const lesson of lessons) {
    lessonsInModule.set(lesson.moduleId, (lessonsInModule.get(lesson.moduleId) ?? 0) + 1);
  }

  // userId → moduleId → скільки уроків цього модуля пройдено
  const doneByUser = new Map<string, Map<string, number>>();
  for (const row of progress) {
    const moduleId = moduleOfLesson.get(row.lessonId);
    if (!moduleId) continue;
    let perModule = doneByUser.get(row.userId);
    if (!perModule) {
      perModule = new Map();
      doneByUser.set(row.userId, perModule);
    }
    perModule.set(moduleId, (perModule.get(moduleId) ?? 0) + 1);
  }

  const result = new Map<string, number>();
  for (const [userId, perModule] of doneByUser) {
    let completed = 0;
    for (const [moduleId, done] of perModule) {
      const total = lessonsInModule.get(moduleId) ?? 0;
      if (total > 0 && done >= total) completed++;
    }
    result.set(userId, completed);
  }
  return result;
}

/** Адмін бачить усіх користувачів, їхній прогрес курсу і статус сертифікації. */
export async function GET() {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);

    const [users, totalModules, completedByUser] = await Promise.all([
      prisma.user.findMany({
        include: { organization: true, certificates: { where: { revoked: false }, take: 1 } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.module.count(),
      completedModulesByUser(),
    ]);

    const response: UsersListResponse = {
      total: users.length,
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        organizationName: u.organization?.name ?? null,
        streak: cachedStreak(u.streak, u.lastActiveAt),
        progressPct: totalModules > 0 ? Math.round(((completedByUser.get(u.id) ?? 0) / totalModules) * 100) : 0,
        certified: u.certificates.length > 0,
        lastActiveAt: u.lastActiveAt ? u.lastActiveAt.toISOString() : null,
        createdAt: u.createdAt.toISOString(),
      })),
    };
    return NextResponse.json(response);
  });
}

/** Зміна ролі користувача (LEARNER ⇄ ADMIN) — лише ADMIN. */
export async function PATCH(request: NextRequest) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);

    const input = UpdateUserRoleInputSchema.parse(await request.json());

    // Зняти з себе адміністратора — це вихід із розділу без шляху назад:
    // повернути роль може лише інший ADMIN, а якщо він був єдиним, то ніхто.
    if (input.userId === me.id && input.role !== 'ADMIN') {
      throw new ForbiddenError('Не можна зняти адміністратора із себе — попросіть про це іншого адміністратора');
    }

    // Останній адміністратор платформи так само не має зникати.
    if (input.role !== 'ADMIN') {
      const admins = await prisma.user.count({ where: { role: 'ADMIN' } });
      if (admins <= 1) {
        throw new ForbiddenError('Це останній адміністратор платформи — спершу призначте іншого');
      }
    }

    const updated = await prisma.user.update({
      where: { id: input.userId },
      data: { role: input.role },
    });

    return NextResponse.json({ id: updated.id, role: updated.role });
  });
}
