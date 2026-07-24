import { NextResponse } from 'next/server';
import { prisma } from '@yasno/db';
import { withApiErrors } from '@/lib/api-guard';

/** Публічний список організацій для форми реєстрації (не потребує входу). */
export async function GET() {
  return withApiErrors(async () => {
    const organizations = await prisma.organization.findMany({
      select: { id: true, name: true, kind: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ organizations });
  });
}
