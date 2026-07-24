import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@yasno/db';
import { requireCurrentUser, requireAdmin } from '@yasno/auth';
import { UpdateUserRoleInputSchema, type UsersListResponse } from '@yasno/types';
import { withApiErrors } from '@/lib/api-guard';

/** Адмін бачить усіх користувачів, їхній прогрес курсу і статус сертифікації. */
export async function GET() {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);

    const [users, totalModules] = await Promise.all([
      prisma.user.findMany({
        include: { organization: true, certificates: { where: { revoked: false }, take: 1 } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.module.count(),
    ]);

    const completedModuleCounts = await Promise.all(
      users.map((u) =>
        prisma.module.count({
          where: { lessons: { some: {} }, AND: { lessons: { every: { progress: { some: { userId: u.id } } } } } },
        }),
      ),
    );

    const response: UsersListResponse = {
      total: users.length,
      users: users.map((u, i) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        organizationName: u.organization?.name ?? null,
        streak: u.streak,
        progressPct: totalModules > 0 ? Math.round((completedModuleCounts[i]! / totalModules) * 100) : 0,
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
    const updated = await prisma.user.update({
      where: { id: input.userId },
      data: { role: input.role },
    });

    return NextResponse.json({ id: updated.id, role: updated.role });
  });
}
