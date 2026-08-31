/**
 * Скидає паролі демо-акаунтів на поточний DEMO_PASSWORD.
 *
 * Запуск: pnpm --filter @proai/db reset-demo-passwords
 *
 * Навіщо окремий скрипт: seed переписує пароль лише разом з усією базою, а він
 * стирає користувачів і прогрес. Після перейменування платформи (Ясно → ПРО.ШІ)
 * у базі лишилися хеші від старого пароля, і демо-акаунти просто не пускали —
 * при тому що в коді й README вже стояв новий. Цей скрипт лагодить рівно це,
 * не чіпаючи нічого іншого.
 *
 * Працює лише з акаунтами провайдера `credential` і лише для вказаних адрес,
 * тому справжнім користувачам, які самі зареєструвалися, пароль не змінить.
 */
import { hashPassword } from 'better-auth/crypto';
import { prisma } from './client';

/** Мусить збігатися з DEMO_PASSWORD у seed.ts і з README. */
const DEMO_PASSWORD = 'ProAI2026!';

/** Домен демо-організації із seed.ts. Інших акаунтів не чіпаємо. */
const DEMO_EMAIL_SUFFIX = '@loda.gov.ua';

async function main() {
  const users = await prisma.user.findMany({
    where: { email: { endsWith: DEMO_EMAIL_SUFFIX } },
    select: { id: true, email: true },
  });

  if (users.length === 0) {
    console.log(`Демо-акаунтів (${DEMO_EMAIL_SUFFIX}) у базі немає — нічого робити.`);
    return;
  }

  const password = await hashPassword(DEMO_PASSWORD);
  let updated = 0;
  let missing = 0;

  for (const user of users) {
    const res = await prisma.account.updateMany({
      where: { userId: user.id, providerId: 'credential' },
      data: { password },
    });
    if (res.count > 0) {
      updated += res.count;
      console.log(`  ✓ ${user.email}`);
    } else {
      missing += 1;
      console.warn(`  ⚠ ${user.email}: немає акаунта з паролем (providerId: credential) — пропущено`);
    }
  }

  console.log(`\nОновлено паролів: ${updated}. Пропущено: ${missing}.`);
  console.log(`Пароль для всіх демо-акаунтів: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
