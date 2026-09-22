import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { prismaAdapter } from '@better-auth/prisma-adapter';
import { prisma } from '@proai/db';
import { infra, serverEnv } from '@proai/infra';

/**
 * Better Auth: лише email/password.
 *
 * RBAC платформи (LEARNER/ADMIN) — наше власне поле User.role і перевірка
 * в rbac.ts. Зміна ролі відбувається виключно через /api/users (лише ADMIN).
 *
 * Плагіна admin() тут НЕМАЄ, і це свідомо. Він:
 *   1. Ламав реєстрацію. Плагін проставляє новому користувачеві свою роль
 *      за замовчуванням — рядок "user", якого немає в enum Role
 *      (LEARNER | ADMIN). Prisma відхиляла INSERT, і будь-яка спроба
 *      зареєструватися завершувалася 422 FAILED_TO_CREATE_USER.
 *   2. Був нікому не потрібен: ані бани, ані імперсонація в коді платформи
 *      не використовуються (поля banned/banExpires у схемі лишилися
 *      незадіяними).
 *   3. Відкривав другий шлях керування ролями — /api/auth/admin/set-role
 *      тощо, — який обходить перевірки в /api/users (заборону зняти
 *      адміністратора із себе й прибрати останнього адміністратора).
 *
 * Якщо колись знадобляться бани — вмикати його треба з явними
 * `defaultRole: 'LEARNER'` і `adminRoles: ['ADMIN']`, інакше пункт 1 повернеться.
 */

const env = serverEnv();

/** Довжина посади в профілі — рівно стільки, скільки вміщає сертифікат. */
const MAX_POSITION_LENGTH = 160;

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
    env.BETTER_AUTH_URL,
    env.NEXT_PUBLIC_APP_URL,
    // Кілька доменів через кому — для стенду чи прев'ю.
    ...(env.TRUSTED_ORIGINS ?? '').split(','),
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => !!value);

  if (env.NODE_ENV === 'production') return configured;

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

/**
 * Проксі, яким довіряємо в ланцюжку X-Forwarded-For.
 *
 * Запит до застосунку йде так: людина → зовнішній проксі (TLS) → наш nginx →
 * Next. Кожен проксі дописує в X-Forwarded-For адресу, звідки прийшов запит,
 * і до застосунку доходить `людина, зовнішній-проксі`.
 *
 * Better Auth 1.6 без списку довірених проксі з кількох адрес НЕ вибирає
 * жодної — і вмикає запасний режим: ОДИН лічильник спроб на всю платформу.
 * На практиці це виглядало так: п'ятеро будь-яких людей за хвилину вичерпували
 * ліміт входу, і решта отримувала «Забагато спроб» з першої ж спроби, щойно
 * хвилина минала — безкінечно. Реєстрація впиралася в 10 на годину для всіх.
 *
 * Зі списком довірених Better Auth іде ланцюжком справа наліво, відкидає
 * довірені проксі й бере першу адресу, що лишилась, — справжню адресу людини.
 * Підробити її не вийде: те, що людина дописала в заголовок сама, стоїть лівіше.
 *
 * За замовчуванням довіряємо локальній і приватним мережам — там зазвичай і
 * стоять проксі. Точніше задати адресу зовнішнього проксі в TRUSTED_PROXIES:
 * тоді й люди з внутрішньої мережі (з приватними адресами) рахуватимуться
 * окремо, а не одним лічильником.
 */
const LOCAL_PROXIES = ['127.0.0.0/8', '::1'];
const PRIVATE_NETWORKS = ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', 'fc00::/7'];

function trustedProxies(): string[] {
  const configured = (env.TRUSTED_PROXIES ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return configured.length ? [...LOCAL_PROXIES, ...configured] : [...LOCAL_PROXIES, ...PRIVATE_NETWORKS];
}

/**
 * Поля, які клієнт надсилає на реєстрації, — довільний рядок із браузера.
 * Тут вони стають або справжнім посиланням на організацію, або null:
 * неіснуючий organizationId інакше впав би порушенням зовнішнього ключа
 * (реєстрація віддавала б 500 замість акаунта), а посада без обмеження
 * довжини поїхала б у базу й на сертифікат як є.
 */
async function normalizeProfileFields(input: Record<string, unknown>) {
  // Better Auth типізує додаткові поля лише як Record<string, unknown> —
  // звідси перевірки typeof замість прямого доступу.
  const rawOrgId = typeof input.organizationId === 'string' ? input.organizationId.trim() : '';
  const rawPosition = typeof input.position === 'string' ? input.position.trim() : '';

  const organizationId = rawOrgId
    ? ((await prisma.organization.findUnique({ where: { id: rawOrgId }, select: { id: true } }))?.id ?? null)
    : null;

  return {
    organizationId,
    position: rawPosition ? rawPosition.slice(0, MAX_POSITION_LENGTH) : null,
  };
}

/** Код, за яким форма входу показує «такого акаунта немає — зареєструйтесь». */
export const ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND';

/**
 * Вхід із поштою, якої немає в системі, отримує ОКРЕМУ відповідь.
 *
 * Better Auth навмисно відповідає однаково («неправильна пошта або пароль»),
 * щоб форма входу не підказувала, хто зареєстрований. На цій платформі така
 * обережність нічого не захищала: форма реєстрації й так каже «ця пошта вже
 * зареєстрована». Зате люди, які помилились у пошті або ще не реєструвались,
 * отримували «неправильний пароль» і намагались згадати пароль, якого немає.
 *
 * Перевірка живе ВСЕРЕДИНІ запиту входу, а не окремим ендпоінтом «чи є така
 * пошта»: так на неї діє той самий ліміт — 5 спроб на хвилину (rateLimit
 * нижче спрацьовує раніше за хуки), і окремого довідника адрес не з'являється.
 *
 * Шукаємо тим самим методом, що й сам Better Auth (`findUserByEmail`), —
 * інакше нормалізація пошти (регістр) могла б розійтися, і людина з
 * наявним акаунтом побачила б «акаунта немає».
 */
const accountNotFoundOnSignIn = createAuthMiddleware(async (ctx) => {
  if (ctx.path !== '/sign-in/email') return;

  const email = typeof ctx.body?.email === 'string' ? ctx.body.email.trim() : '';
  // Некоректну адресу лишаємо самому ендпоінту — він відповість INVALID_EMAIL.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;

  const user = await ctx.context.internalAdapter.findUserByEmail(email);
  if (!user) {
    throw APIError.from('UNAUTHORIZED', {
      code: ACCOUNT_NOT_FOUND,
      message: 'No account with this email',
    });
  }
});

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'sqlite' }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // MVP: без зовнішнього поштового провайдера
    minPasswordLength: 8,
    // Верхня межа не косметична: без неї запит на кілька мегабайт пароля
    // змушує сервер хешувати їх scrypt'ом — дешевий спосіб покласти вхід.
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 60 * 60, // 1 година
    sendResetPassword: async ({ user, url }) => {
      await infra.mailer.send({
        to: user.email,
        subject: 'Відновлення пароля — ПРО.ШІ',
        text: `Ви (або хтось інший) запросили відновлення пароля для акаунта ${user.email}.\n\nПосилання дійсне 1 годину:\n${url}\n\nЯкщо це були не ви — просто проігноруйте цей лист.`,
      });
    },
  },
  /**
   * Обмеження частоти. Без нього форма входу — це готовий стенд для перебору
   * паролів: 8 символів мінімум нічого не варті, якщо пробувати можна
   * необмежено. Загальне вікно тримаємо м'яким, а на самих чутливих
   * маршрутах — жорсткі окремі правила.
   */
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    // Ліміти рахуються НА АДРЕСУ, а за однією адресою часто цілий офіс
    // (спільний вихід в інтернет). Тому вони щедріші за «класичні»: 10 входів
    // на хвилину досі нічого не дають перебору пароля, а реєстрація з вікном
    // у годину блокувала цілу установу, яка реєструвалась одного ранку.
    customRules: {
      '/sign-in/email': { window: 60, max: 10 },
      '/sign-up/email': { window: 10 * 60, max: 10 },
      '/forget-password': { window: 60 * 60, max: 5 },
      '/reset-password': { window: 60 * 60, max: 10 },
    },
  },
  hooks: {
    before: accountNotFoundOnSignIn,
  },
  advanced: {
    ipAddress: { trustedProxies: trustedProxies() },
    // За HTTPS куки мають бути Secure. Better Auth виводить це з baseURL,
    // але за проксі (nginx/ingress) baseURL іноді лишається http — тому
    // в продакшні вмикаємо явно.
    useSecureCookies: env.NODE_ENV === 'production',
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: 'lax',
    },
  },
  user: {
    additionalFields: {
      // input: false — роль НЕ приймається від клієнта на реєстрації.
      role: { type: 'string', required: false, defaultValue: 'LEARNER', input: false },
      position: { type: 'string', required: false },
      organizationId: { type: 'string', required: false },
      streak: { type: 'number', required: false, defaultValue: 0, input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => ({
          data: {
            ...user,
            ...(await normalizeProfileFields(user)),
            // Роль на реєстрації завжди LEARNER — незалежно від того, що
            // прийшло в тілі запиту. `input: false` вище вже це гарантує;
            // тут те саме ще раз, бо ціна помилки — чужий адміністратор.
            role: 'LEARNER',
          },
        }),
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 днів, як у PRODUCT_SPEC (remember-me за замовчуванням)
    updateAge: 60 * 60 * 24, // продовжуємо сесію не частіше разу на добу
  },
});

export type Session = typeof auth.$Infer.Session;
