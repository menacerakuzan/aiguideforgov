import { z } from 'zod';

/**
 * Перевірка серверного оточення в одному місці.
 *
 * Навіщо: Better Auth, якщо не дати йому secret, мовчки бере власний
 * запасний ключ — застосунок стартує, вхід працює, і ніхто не помічає, що
 * сесійні куки підписані передбачуваним ключем. Так само тихо працює
 * лишений з шаблону `change-me-...`. Тому в продакшні ми падаємо на старті:
 * зламаний деплой видно одразу, а дірку в автентифікації — ні.
 *
 * У розробці таких вимог немає: там достатньо попередження, щоб `pnpm dev`
 * на чистій копії репозиторію не впав до першого рядка коду.
 */

/** Значення з .env.example — воно не є секретом, бо лежить у git. */
const PLACEHOLDER_SECRET = 'change-me-to-a-long-random-string';

/** Нижче 32 символів секрет не дає осмисленої стійкості до перебору. */
const MIN_SECRET_LENGTH = 32;

/**
 * `next build` виконується з NODE_ENV=production і при цьому імпортує кожен
 * route handler, щоб зібрати про них дані. Якби ми падали тут, зібрати
 * застосунок без бойових секретів було б неможливо — а саме так працює
 * будь-який CI: секрети він отримує на деплої, не на збірці.
 *
 * Тому «продакшн» для цієї перевірки — це обслуговування запитів, а не збірка.
 */
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
const isProduction = process.env.NODE_ENV === 'production' && !isBuildPhase;

const ServerEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL обовʼязковий'),
  BETTER_AUTH_SECRET: isProduction
    ? z
        .string()
        .min(MIN_SECRET_LENGTH, `BETTER_AUTH_SECRET має бути не коротшим за ${MIN_SECRET_LENGTH} символів`)
        .refine((v) => v !== PLACEHOLDER_SECRET, 'BETTER_AUTH_SECRET лишився шаблонним — згенеруйте власний')
    : z.string().min(1).optional(),
  BETTER_AUTH_URL: isProduction ? z.string().url() : z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  /** Кілька доменів через кому — для стенду чи прев'ю. */
  TRUSTED_ORIGINS: z.string().optional(),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

let cached: ServerEnv | null = null;

/**
 * Читає й валідує оточення один раз на процес. Ліниво, а не на імпорті
 * модуля: інакше будь-який інструмент, що просто підтягує цей пакет
 * (typecheck, lint, збірка клієнтського бандла), падав би без .env.
 */
export function serverEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = ServerEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `  • ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Некоректне оточення сервера:\n${details}`);
  }

  const env = parsed.data;

  if (!isProduction && (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET === PLACEHOLDER_SECRET)) {
    console.warn(
      '[env] BETTER_AUTH_SECRET не задано або лишився шаблонним. Для розробки і збірки це ' +
        'припустимо, але застосунок із таким значенням не почне обслуговувати запити у продакшні.',
    );
  }

  cached = env;
  return env;
}
