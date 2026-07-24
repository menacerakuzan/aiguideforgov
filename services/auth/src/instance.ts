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
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'sqlite' }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
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
