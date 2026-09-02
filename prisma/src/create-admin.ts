/**
 * Створює адміністратора з ADMIN_EMAIL / ADMIN_PASSWORD або скидає йому пароль.
 *
 * Запуск: pnpm db:create-admin
 *
 * На відміну від `db:seed`, нічого не стирає: контент, слухачі, їхній прогрес і
 * сертифікати лишаються на місці. Тому це безпечний спосіб
 *   • завести адміністратора на вже робочій платформі;
 *   • повернути доступ, якщо пароль загублено.
 *
 * Автоматичного відновлення пароля в платформі немає (немає поштового
 * провайдера), тож для адміністратора це єдиний шлях.
 */
import { prisma } from './client';
import { resolveAdminCredentials, upsertAdmin } from './lib/admin';

async function main() {
  const creds = await resolveAdminCredentials();
  const { created } = await upsertAdmin(prisma, creds);

  console.log(created ? `Створено адміністратора: ${creds.email}` : `Оновлено пароль адміністратора: ${creds.email}`);

  // Показуємо загальну картину: якщо адміністраторів раптом більше одного,
  // це видно одразу, а не через місяць у списку користувачів.
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { email: true } });
  console.log(`Адміністраторів у базі: ${admins.length} (${admins.map((a) => a.email).join(', ')})`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
