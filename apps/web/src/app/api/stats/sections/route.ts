import { NextResponse } from 'next/server';
import { prisma } from '@proai/db';
import type { SectionColor } from '@proai/types';
import { withApiErrors } from '@/lib/api-guard';

/**
 * Колір картки закритого курсу. Власного кольору в курсу немає (він є лише в
 * розділів), тож задаємо тут за slug — інакше обидві картки «Скоро» злилися б.
 */
const CLOSED_COURSE_COLOR: Record<string, SectionColor> = {
  'shi-dlia-vidkrytykh-danykh': 'GREEN',
  'shi-za-napriamamy-roboty': 'GOLD',
};

/**
 * Публічний, безпечний для показу на лендингу зріз структури платформи —
 * лише назви, описи й лічильники (без прогресу чи будь-яких даних користувача).
 *
 * Розділи відкритих курсів ідуть як є, з кількістю модулів і уроків. Закриті
 * курси показуються однією карткою кожен, з позначкою «Скоро»: людина бачить,
 * що буде далі, але зміст закритого курсу (його розділи-заглушки) не розкривається.
 */
export async function GET() {
  return withApiErrors(async () => {
    const [open, closed] = await Promise.all([
      prisma.section.findMany({
        where: { course: { comingSoon: false } },
        orderBy: [{ course: { order: 'asc' } }, { order: 'asc' }],
        take: 4,
        select: {
          id: true,
          title: true,
          description: true,
          color: true,
          modules: { select: { _count: { select: { lessons: true } } } },
        },
      }),
      prisma.course.findMany({
        where: { comingSoon: true },
        orderBy: { order: 'asc' },
        select: { id: true, slug: true, title: true, description: true },
      }),
    ]);

    const sections = [
      ...open.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        color: s.color,
        comingSoon: false,
        moduleCount: s.modules.length,
        lessonCount: s.modules.reduce((sum, m) => sum + m._count.lessons, 0),
      })),
      ...closed.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        color: CLOSED_COURSE_COLOR[c.slug] ?? 'MUTED',
        comingSoon: true,
        moduleCount: 0,
        lessonCount: 0,
      })),
    ];

    return NextResponse.json({ sections });
  });
}
