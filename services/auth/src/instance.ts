import { betterAuth } from 'better-auth';
import { prismaAdapter } from '@better-auth/prisma-adapter';
import { admin } from 'better-auth/plugins';
import { prisma } from '@yasno/db';
import { infra } from '@yasno/infra';

/**
 * Better Auth: email/password + admin-плагін (лише для банів/сесій).
 *
 * ВАЖЛИВО: фактичний RBAC платформи (LEARNER/ADMIN) реалізовано в rbac.ts
 * і НЕ залежить від внутрішньої системи прав admin-плагіна. Роль
 * (User.role: Role) — наше власне поле, admin-плагін до нього не звертається;
 * зміна ролі відбувається виключно через /api/users (лише ADMIN).
 */
/**
 * Приватні мережі за RFC 1918 + loopback. Тільки такі адреси вважаємо «своїми»
 * у режимі розробки: 192.168.x.x, 10.x.x.x, 172.16–31.x.x, localhost, 127.x.x.x.
 */
const PRIVATE_HOST =
  /^(localhost|127(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|10(?:\.\d{1,3}){3}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})$/;

/**
 * Origin'и, з яких приймаємо запити автентифікації.
 *
 * За замовчуванням Better Auth довіряє лише `baseURL` — тобто `http://localhost:3000`.
 * Через це вхід ламався, коли застосунок відкривали з іншого пристрою в локальній
 * мережі (`http://192.168.x.x:3000`): сервер відповідав 403 «Invalid origin».
 *
 * Тому в **розробці** додатково довіряємо origin'у самого запиту, якщо він веде на
 * приватну адресу. У продакшні цього не відбувається за жодних умов — там список
 * лишається рівно таким, як задано в змінних середовища.
 */
function trustedOrigins(request?: Request): string[] {
  const configured = [
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    // Кілька доменів через кому — для стенду чи прев'ю.
    ...(process.env.TRUSTED_ORIGINS ?? '').split(','),
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => !!value);

  if (process.env.NODE_ENV === 'production') return configured;

  const origin = request?.headers.get('origin');
  if (!origin) return configured;
  try {
    const url = new URL(origin);
    const isHttp = url.protocol === 'http:' || url.protocol === 'https:';
    if (isHttp && PRIVATE_HOST.test(url.hostname)) return [...configured, url.origin];
  } catch {
    /* Некоректний Origin — просто не додаємо нічого. */
  }
  return configured;
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'sqlite' }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // MVP: без зовнішнього поштового провайдера
    minPasswordLength: 8,
    resetPasswordTokenExpiresIn: 60 * 60, // 1 година
    sendResetPassword: async ({ user, url }) => {
      await infra.mailer.send({
        to: user.email,
        subject: 'Відновлення пароля — Ясно',
        text: `Ви (або хтось інший) запросили відновлення пароля для акаунта ${user.email}.\n\nПосилання дійсне 1 годину:\n${url}\n\nЯкщо це були не ви — просто проігноруйте цей лист.`,
      });
    },
  },
  plugins: [admin()],
  user: {
    additionalFields: {
      role: { type: 'string', required: false, defaultValue: 'LEARNER', input: false },
      position: { type: 'string', required: false },
      organizationId: { type: 'string', required: false },
      streak: { type: 'number', required: false, defaultValue: 0 },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 днів, як у PRODUCT_SPEC (remember-me за замовчуванням)
  },
});

export type Session = typeof auth.$Infer.Session;
