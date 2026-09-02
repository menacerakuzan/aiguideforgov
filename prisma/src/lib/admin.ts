/**
 * Єдиний адміністратор платформи — з ADMIN_EMAIL / ADMIN_PASSWORD.
 *
 * Живе окремим модулем, бо потрібен двом сценаріям:
 *   • `db:seed` — створює його разом із порожньою базою;
 *   • `db:create-admin` — створює або скидає пароль на вже робочій базі,
 *     не чіпаючи ні контенту, ні слухачів, ні їхнього прогресу.
 *
 * Другий сценарій не косметичний: автоматичного відновлення пароля в платформі
 * немає (немає поштового провайдера), тож якщо адміністратор загубить пароль,
 * єдиний спосіб повернути доступ — цей скрипт на сервері.
 */
import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
import { hashPassword } from 'better-auth/crypto';
import type { PrismaClient } from '@prisma/client';

/**
 * Мінімум для пароля адміністратора — свідомо вищий за 8 символів, які вимагає
 * форма реєстрації слухача. Це єдиний акаунт із доступом до всіх користувачів,
 * контенту й сертифікатів, і задає його не випадкова людина, а той, хто
 * розгортає платформу.
 */
const MIN_ADMIN_PASSWORD_LENGTH = 12;

export interface AdminCredentials {
  email: string;
  password: string;
  name: string;
}

/** Питає пароль, не показуючи його на екрані й не лишаючи в історії команд. */
function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    let muted = false;
    // Власний потік виводу: поки muted, символи не потрапляють на екран.
    const output = new Writable({
      write(chunk, encoding, callback) {
        if (!muted) process.stdout.write(chunk, encoding);
        callback();
      },
    });

    const rl = createInterface({ input: process.stdin, output, terminal: true });
    process.stdout.write(question);
    muted = true;

    rl.question('', (answer) => {
      muted = false;
      process.stdout.write('\n');
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Пароль адміністратора: зі змінної оточення або, якщо її немає, з клавіатури.
 *
 * Клавіатура — основний шлях, і це не зручність, а вимога безпеки. Пароль,
 * залишений у `.env`, потрапляє через `EnvironmentFile=` у оточення самого
 * веб-процесу, хоча застосунку він не потрібен узагалі: будь-яке виконання
 * стороннього коду всередині процесу (RCE, скомпрометована залежність) читає
 * `process.env.ADMIN_PASSWORD` і одразу отримує повний доступ до платформи.
 *
 * ADMIN_PASSWORD лишається підтримуваним для автоматизованих розгортань, але
 * після створення адміністратора його треба прибрати з `.env`.
 */
async function resolveAdminPassword(): Promise<string> {
  const fromEnv = process.env.ADMIN_PASSWORD;
  if (fromEnv) return fromEnv;

  if (!process.stdin.isTTY) {
    throw new Error(
      'ADMIN_PASSWORD не задано, а ввести його з клавіатури неможливо (немає терміналу).\n' +
        'Для автоматизованого запуску передайте змінну лише на час команди:\n' +
        "  ADMIN_PASSWORD='…' pnpm db:create-admin",
    );
  }

  const first = await promptHidden('Пароль адміністратора: ');
  const second = await promptHidden('Повторіть пароль: ');
  if (first !== second) throw new Error('Паролі не збігаються — нічого не змінено.');
  return first;
}

/**
 * Читає й перевіряє облікові дані адміністратора з оточення.
 * Кидає з зрозумілим текстом: краще зупинити розгортання, ніж мовчки створити
 * платформу без жодного адміністратора або з паролем «12345678».
 */
export async function resolveAdminCredentials(): Promise<AdminCredentials> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const name = process.env.ADMIN_NAME?.trim() || 'Адміністратор платформи';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(
      `ADMIN_EMAIL ${email ? `не схожий на адресу: ${email}` : 'не задано'}.\n\n` +
        'Задайте в .env (файл один, у корені монорепо):\n' +
        '  ADMIN_EMAIL="admin@ваш-домен"',
    );
  }

  const password = await resolveAdminPassword();

  const problems: string[] = [];
  if (password.length < MIN_ADMIN_PASSWORD_LENGTH)
    problems.push(`пароль коротший за ${MIN_ADMIN_PASSWORD_LENGTH} символів`);
  if (/^(admin|password|proai|123)/i.test(password))
    problems.push('пароль починається з очевидного слова — візьміть випадковий');

  if (problems.length > 0) {
    throw new Error(
      `Пароль адміністратора не підходить:\n${problems.map((p) => `  • ${p}`).join('\n')}\n\n` +
        'Згенерувати надійний:\n' +
        '  node -e "console.log(require(\'crypto\').randomBytes(18).toString(\'base64url\'))"',
    );
  }

  return { email, password, name };
}

/**
 * Створює адміністратора або оновлює пароль наявного.
 *
 * Ідемпотентна: повторний запуск не плодить акаунтів і не змінює нічого, крім
 * пароля, імені та ролі. Прогрес і сертифікати цього користувача (якщо він ще
 * й вчиться) лишаються недоторканими.
 */
export async function upsertAdmin(prisma: PrismaClient, creds: AdminCredentials): Promise<{ created: boolean }> {
  const password = await hashPassword(creds.password);

  const existing = await prisma.user.findUnique({ where: { email: creds.email }, select: { id: true } });

  if (!existing) {
    const user = await prisma.user.create({
      data: { name: creds.name, email: creds.email, role: 'ADMIN', emailVerified: true },
    });
    // accountId = userId — так само, як це робить Better Auth для email/password.
    await prisma.account.create({
      data: { userId: user.id, accountId: user.id, providerId: 'credential', password },
    });
    return { created: true };
  }

  await prisma.user.update({ where: { id: existing.id }, data: { role: 'ADMIN', name: creds.name } });

  // Акаунта з паролем може не бути, якщо користувача колись завели інакше —
  // тоді створюємо, інакше просто міняємо хеш.
  const account = await prisma.account.findFirst({
    where: { userId: existing.id, providerId: 'credential' },
    select: { id: true },
  });
  if (account) await prisma.account.update({ where: { id: account.id }, data: { password } });
  else
    await prisma.account.create({
      data: { userId: existing.id, accountId: existing.id, providerId: 'credential', password },
    });

  return { created: false };
}
