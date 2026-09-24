import { prisma } from '@proai/db';
import { infra } from '@proai/infra';
import type {
  AdminSupportThreadResponse,
  SendSupportMessageInput,
  SupportMessageDto,
  SupportPeopleResponse,
  SupportPerson,
  SupportThreadResponse,
  SupportThreadRow,
} from '@proai/types';
import { matchesPerson, previewOf, toMessageDto } from './format';

/**
 * Чат підтримки: одна розмова на людину, з іншого боку — будь-який
 * адміністратор. Живого зʼєднання (websocket) немає: віджет і сторінка
 * адміністратора опитують API, поки відкриті. Для сотень людей і кількох
 * адміністраторів це дешевше й надійніше, ніж тримати сокети поруч із SQLite.
 */

/** Скільки останніх повідомлень віддаємо в розмову. Старіші лишаються в базі. */
const HISTORY_LIMIT = 300;

/**
 * Скільки повідомлень людина може надіслати за вікно. Кілька поспіль — норма
 * («ось ще скріншот описую…»), сотня за хвилину — ні: це або скрипт, або
 * залипла клавіша, а на іншому боці — черга адміністратора.
 */
const SEND_LIMIT = 15;
const SEND_WINDOW_SECONDS = 5 * 60;

const MESSAGE_SELECT = {
  id: true,
  body: true,
  fromAdmin: true,
  authorId: true,
  author: { select: { name: true } },
  pagePath: true,
  pageTitle: true,
  createdAt: true,
  readAt: true,
} as const;

const PERSON_SELECT = {
  id: true,
  name: true,
  email: true,
  position: true,
  organization: { select: { name: true } },
} as const;

function toPerson(user: {
  id: string;
  name: string;
  email: string;
  position: string | null;
  organization: { name: string } | null;
}): SupportPerson {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    position: user.position,
    organizationName: user.organization?.name ?? null,
  };
}

/** Людина пише частіше, ніж дозволено. */
export class SupportRateLimitError extends Error {
  constructor(message = 'Ви надіслали багато повідомлень поспіль. Зачекайте кілька хвилин — ми вже бачимо ваше звернення.') {
    super(message);
    this.name = 'SupportRateLimitError';
  }
}

/** Адресата немає або йому не можна писати через підтримку. */
export class SupportRecipientError extends Error {
  constructor(message = 'Такого користувача немає') {
    super(message);
    this.name = 'SupportRecipientError';
  }
}

async function loadMessages(userId: string) {
  const rows = await prisma.supportMessage.findMany({
    where: { thread: { userId } },
    orderBy: { createdAt: 'desc' },
    take: HISTORY_LIMIT,
    select: MESSAGE_SELECT,
  });
  return rows.reverse();
}

/**
 * Додає повідомлення в розмову людини, створюючи її за потреби.
 * Одна транзакція — інакше розмова могла б лишитись без повідомлення, а
 * список в адмінці показав би порожній рядок.
 */
async function appendMessage(
  userId: string,
  data: { fromAdmin: boolean; authorId: string; body: string; pagePath?: string; pageTitle?: string },
) {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const thread = await tx.supportThread.upsert({
      where: { userId },
      create: { userId, lastMessageAt: now },
      update: { lastMessageAt: now },
      select: { id: true },
    });
    return tx.supportMessage.create({
      data: {
        threadId: thread.id,
        fromAdmin: data.fromAdmin,
        authorId: data.authorId,
        body: data.body,
        pagePath: data.pagePath ?? null,
        pageTitle: data.pageTitle ?? null,
        createdAt: now,
      },
      select: MESSAGE_SELECT,
    });
  });
}

/* --- Бік слухача ----------------------------------------------------------------- */

export async function getLearnerThread(userId: string): Promise<SupportThreadResponse> {
  const [rows, unread] = await Promise.all([loadMessages(userId), countUnreadForLearner(userId)]);
  return {
    messages: rows.map((row) => toMessageDto(row, { id: userId, side: 'learner' })),
    unread,
  };
}

/** Непрочитані відповіді підтримки — число біля кнопки чату. */
export function countUnreadForLearner(userId: string): Promise<number> {
  return prisma.supportMessage.count({ where: { fromAdmin: true, readAt: null, thread: { userId } } });
}

export async function sendLearnerMessage(userId: string, input: SendSupportMessageInput): Promise<SupportMessageDto> {
  const key = `support-send:${userId}`;
  const used = (await infra.cache.get<number>(key)) ?? 0;
  if (used >= SEND_LIMIT) throw new SupportRateLimitError();
  await infra.cache.set(key, used + 1, SEND_WINDOW_SECONDS);

  const row = await appendMessage(userId, {
    fromAdmin: false,
    authorId: userId,
    body: input.body,
    pagePath: input.pagePath,
    // Заголовок без шляху (шлях не пройшов перевірку) нічого не пояснює — не зберігаємо.
    pageTitle: input.pagePath ? input.pageTitle : undefined,
  });
  return toMessageDto(row, { id: userId, side: 'learner' });
}

/** Людина відкрила чат — усі відповіді підтримки вважаються прочитаними. */
export async function markReadByLearner(userId: string): Promise<void> {
  await prisma.supportMessage.updateMany({
    where: { fromAdmin: true, readAt: null, thread: { userId } },
    data: { readAt: new Date() },
  });
}

/* --- Бік адміністратора ------------------------------------------------------------ */

/**
 * Усі непрочитані повідомлення від людей. Спільний лічильник на всіх
 * адміністраторів: прочитав один — звернення вже в роботі, і дублювати його
 * решті не треба.
 */
export function countUnreadForAdmins(): Promise<number> {
  return prisma.supportMessage.count({ where: { fromAdmin: false, readAt: null } });
}

/** Список розмов: найсвіжіші зверху. */
export async function listSupportThreads(): Promise<SupportThreadRow[]> {
  const [threads, unreadGroups] = await Promise.all([
    prisma.supportThread.findMany({
      orderBy: { lastMessageAt: 'desc' },
      select: {
        id: true,
        user: { select: PERSON_SELECT },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { body: true, fromAdmin: true, createdAt: true },
        },
      },
    }),
    prisma.supportMessage.groupBy({
      by: ['threadId'],
      where: { fromAdmin: false, readAt: null },
      _count: { _all: true },
    }),
  ]);

  const unreadByThread = new Map(unreadGroups.map((g) => [g.threadId, g._count._all]));

  return threads.flatMap((thread) => {
    const last = thread.messages[0];
    if (!last) return [];
    return [
      {
        user: toPerson(thread.user),
        lastMessage: { body: previewOf(last.body), fromAdmin: last.fromAdmin, createdAt: last.createdAt.toISOString() },
        unread: unreadByThread.get(thread.id) ?? 0,
        awaitingReply: !last.fromAdmin,
      },
    ];
  });
}

/** Розмова з людиною. `null` — такого користувача немає. Порожня — ще ніхто не писав. */
export async function getAdminThread(userId: string, adminId: string): Promise<AdminSupportThreadResponse | null> {
  const [user, rows] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: PERSON_SELECT }),
    loadMessages(userId),
  ]);
  if (!user) return null;

  return {
    user: toPerson(user),
    messages: rows.map((row) => toMessageDto(row, { id: adminId, side: 'admin' })),
  };
}

export async function sendAdminMessage(adminId: string, userId: string, body: string): Promise<SupportMessageDto> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) throw new SupportRecipientError();
  // Чат — між людиною й підтримкою. Розмова «адмін — адмін» лягла б у список
  // як звернення слухача, а з боку адресата її ніде було б побачити: у
  // адміністратора замість чату кнопка веде в цей самий розділ.
  if (user.role === 'ADMIN') throw new SupportRecipientError('Адміністраторам не пишуть через підтримку');

  const row = await appendMessage(userId, { fromAdmin: true, authorId: adminId, body });
  return toMessageDto(row, { id: adminId, side: 'admin' });
}

/** Адміністратор відкрив розмову — повідомлення людини прочитані. */
export async function markReadByAdmin(userId: string): Promise<void> {
  await prisma.supportMessage.updateMany({
    where: { fromAdmin: false, readAt: null, thread: { userId } },
    data: { readAt: new Date() },
  });
}

/** Кому можна написати першим: слухачі, знайдені за імʼям або поштою. */
export async function findSupportPeople(query: string, limit = 30): Promise<SupportPeopleResponse['people']> {
  // Людей на платформі сотні, тож беремо всіх і фільтруємо в памʼяті — див. matchesPerson.
  const users = await prisma.user.findMany({
    where: { role: 'LEARNER' },
    orderBy: { name: 'asc' },
    select: { ...PERSON_SELECT, supportThread: { select: { id: true } } },
  });

  return users
    .filter((u) => matchesPerson(u, query))
    .slice(0, limit)
    .map((u) => ({ ...toPerson(u), hasThread: u.supportThread !== null }));
}
