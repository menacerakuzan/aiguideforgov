import { NextResponse } from 'next/server';
import { prisma } from '@yasno/db';
import { requireCurrentUser } from '@yasno/auth';
import { withApiErrors } from '@/lib/api-guard';

/** Публічний (для будь-якого авторизованого) перелік бібліотеки — керування лише через /api/admin/resources. */
export async function GET() {
  return withApiErrors(async () => {
    await requireCurrentUser();
    const resources = await prisma.resource.findMany({ orderBy: { updatedAt: 'desc' } });
    return NextResponse.json({
      resources: resources.map((r) => ({
        id: r.id,
        title: r.title,
        summary: r.summary,
        body: r.body,
        kind: r.kind,
        version: r.version,
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  });
}
