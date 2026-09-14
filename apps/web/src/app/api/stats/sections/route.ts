import { NextResponse } from 'next/server';
import { prisma } from '@proai/db';
import { withApiErrors } from '@/lib/api-guard';

/**
 * Публічний, безпечний для показу на лендингу зріз поточної структури курсу —
 * лише назви й описи розділів (без прогресу чи будь-яких даних користувача).
 * Дозволяє лендингу лишатися актуальним, навіть якщо фокус курсу зміниться.
 */
export async function GET() {
  return withApiErrors(async () => {
    const sections = await prisma.section.findMany({
      // Лише розділи відкритих курсів: лендинг не має рекламувати те, чого на
      // платформі ще не відкрито.
      where: { course: { comingSoon: false } },
      orderBy: { order: 'asc' },
      take: 4,
      select: { id: true, title: true, description: true, color: true },
    });
    return NextResponse.json({ sections });
  });
}
