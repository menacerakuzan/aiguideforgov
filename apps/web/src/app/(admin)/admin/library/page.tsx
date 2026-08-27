import { requireCurrentUser } from '@proai/auth';
import { prisma } from '@proai/db';
import { requirePageAdmin } from '@/lib/page-guard';
import { AdminLibraryClient } from '@/components/admin/admin-library-client';

export default async function AdminLibraryPage() {
  const me = await requireCurrentUser();
  requirePageAdmin(me);

  const [prompts, resources] = await Promise.all([
    prisma.prompt.findMany({ orderBy: { title: 'asc' } }),
    prisma.resource.findMany({ orderBy: { title: 'asc' } }),
  ]);

  return (
    <AdminLibraryClient
      prompts={prompts.map((p) => ({
        id: p.id,
        title: p.title,
        useCase: p.useCase,
        body: p.body,
        category: p.category,
        verified: p.verified,
        copyCount: p.copyCount,
      }))}
      resources={resources.map((r) => ({
        id: r.id,
        title: r.title,
        summary: r.summary,
        body: r.body,
        kind: r.kind,
        version: r.version,
        updatedAt: r.updatedAt.toISOString(),
      }))}
    />
  );
}
