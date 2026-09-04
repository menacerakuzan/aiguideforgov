import { NextResponse, type NextRequest } from 'next/server';
import { requestPasswordReset } from '@proai/auth';
import { infra } from '@proai/infra';
import { RequestPasswordResetInputSchema } from '@proai/types';
import { withApiErrors } from '@/lib/api-guard';

/**
 * Заявка на відновлення пароля — публічний маршрут, без сесії.
 *
 * Відповідь однакова завжди: чи існує акаунт із такою поштою, форма не
 * повідомляє. Інакше вона стає зручним способом перебрати, хто зареєстрований
 * на платформі, — а це державний орган, де сам факт реєстрації є інформацією.
 */

/** Скільки заявок приймаємо з однієї адреси за годину. */
const LIMIT = 5;
const WINDOW_SECONDS = 60 * 60;

/**
 * Обмеження частоти живе в памʼяті процесу — так само, як у Better Auth
 * (див. rateLimit у services/auth/src/instance.ts). Для одного інстансу цього
 * досить; кластер потребував би спільного сховища, і тоді змінюється
 * реалізація infra.cache, а не цей код.
 */
async function tooManyRequests(request: NextRequest): Promise<boolean> {
  // За reverse proxy справжня адреса приходить у X-Forwarded-For (nginx її
  // проставляє, див. deploy/README.md). Беремо перший елемент ланцюжка.
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const key = `password-reset:${ip}`;

  const used = (await infra.cache.get<number>(key)) ?? 0;
  if (used >= LIMIT) return true;

  await infra.cache.set(key, used + 1, WINDOW_SECONDS);
  return false;
}

export async function POST(request: NextRequest) {
  return withApiErrors(async () => {
    if (await tooManyRequests(request)) {
      return NextResponse.json(
        { error: 'Забагато заявок. Спробуйте за годину або напишіть у підтримку.' },
        { status: 429 },
      );
    }

    const { email } = RequestPasswordResetInputSchema.parse(await request.json());
    await requestPasswordReset(email);

    return NextResponse.json({ ok: true });
  });
}
