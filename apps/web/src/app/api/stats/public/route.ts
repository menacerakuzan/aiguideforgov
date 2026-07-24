import { NextResponse } from 'next/server';
import { getPublicStats } from '@yasno/analytics';
import { withApiErrors } from '@/lib/api-guard';

/** Публічна статистика для лендингу — без авторизації, універсальна незалежно від курсу в фокусі. */
export async function GET() {
  return withApiErrors(async () => {
    const stats = await getPublicStats();
    return NextResponse.json(stats);
  });
}
