/**
 * Приводить спадщину в базі до поточного стану платформи — на ЖИВІЙ базі.
 *
 * `dev.db` старша за кілька перейменувань: у ній лишились і колишній орган
 * влади, і коди сертифікатів із префіксом попередньої назви платформи. Код уже
 * давно правильний (`services/certificates/src/code.ts` видає `PROAI-`), але
 * старі рядки самі себе не оновлять.
 *
 * Навіщо окремий скрипт. У `seed.ts` (рядки ~97) правильна назва стоїть давно,
 * але `dev.db` створена ще до того комміта й відтоді не пересіювалась: у базі
 * лишилася Львівська. Пересіювати не можна — `seed.ts` стирає користувачів,
 * прогрес і сесії. Адмінка теж не допоможе: /admin/organizations уміє
 * створювати й видаляти організації, але не перейменовувати.
 *
 * Три зміни, і третя — не очевидна:
 *   1. сама організація (за нею одразу оновлюється список «Орган влади» на
 *      /register, бо він тягнеться з /api/organizations/list);
 *   2. пошти користувачів зі старого домену органу;
 *   3. `Certificate.organizationName` — це ЗНІМОК на момент видачі
 *      (services/certificates/src/issue.ts), а не звʼязок із таблицею. Сам він
 *      за організацією не піде, і перейменування без цього кроку лишає у вже
 *      виданому сертифікаті стару назву.
 *
 * Пошту міняти безпечно: Better Auth тримає в `Account.accountId` ідентифікатор
 * користувача, а не адресу (перевірено в базі), тож вхід не ламається.
 *
 * Запуск: pnpm --filter @proai/db fix-legacy-data
 * Ідемпотентний: повторний запуск нічого не змінює.
 */
import { prisma } from './client';

const ORG_NAME = 'Одеська обласна державна адміністрація';
const OLD_EMAIL_DOMAIN = '@loda.gov.ua';
const NEW_EMAIL_DOMAIN = '@od.gov.ua';

/**
 * Префікс коду сертифіката. Міняємо саме префікс, а не генеруємо код наново:
 * випадковий сегмент — це і є ідентичність сертифіката, і людина могла вже
 * десь його записати. Формат звіряємо з `services/certificates/src/code.ts`
 * (`PROAI-РРРР-XXXXXX`), імпортувати звідти не можна — вийшов би цикл
 * залежностей: пакет сертифікатів сам залежить від цього.
 */
const OLD_CODE_PREFIX = 'ЯСНО-';
const NEW_CODE_PREFIX = 'PROAI-';

async function main() {
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true } });
  const stale = orgs.filter((o) => o.name !== ORG_NAME);

  for (const o of stale) {
    await prisma.organization.update({ where: { id: o.id }, data: { name: ORG_NAME } });
    console.log(`  ✓ орган влади: «${o.name}» → «${ORG_NAME}»`);
  }
  if (stale.length === 0) console.log('  · орган влади вже названий правильно');

  // Пошти. Через updateMany це не робиться: SQLite-конектор Prisma не вміє
  // підставляти вираз від поточного значення поля, тому кожну адресу міняємо
  // окремо, зібравши новий рядок у Node.
  const users = await prisma.user.findMany({
    where: { email: { endsWith: OLD_EMAIL_DOMAIN } },
    select: { id: true, email: true },
  });

  for (const u of users) {
    const email = u.email.slice(0, -OLD_EMAIL_DOMAIN.length) + NEW_EMAIL_DOMAIN;
    await prisma.user.update({ where: { id: u.id }, data: { email } });
    console.log(`  ✓ пошта: ${u.email} → ${email}`);
  }
  if (users.length === 0) console.log('  · пошт на старому домені немає');

  const certs = await prisma.certificate.updateMany({
    where: { organizationName: { not: ORG_NAME } },
    data: { organizationName: ORG_NAME },
  });
  console.log(`  ✓ сертифікатів із оновленою назвою органу: ${certs.count}`);

  const legacyCodes = await prisma.certificate.findMany({
    where: { code: { startsWith: OLD_CODE_PREFIX } },
    select: { id: true, code: true },
  });

  for (const c of legacyCodes) {
    const code = NEW_CODE_PREFIX + c.code.slice(OLD_CODE_PREFIX.length);
    await prisma.certificate.update({ where: { id: c.id }, data: { code } });
    console.log(`  ✓ код сертифіката: ${c.code} → ${code}`);
  }
  if (legacyCodes.length === 0) console.log('  · коди сертифікатів уже в поточному форматі');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
