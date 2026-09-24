import type { SupportMessageDto } from '@proai/types';

/**
 * Чисті перетворення без звернень до бази — окремо, щоб їх можна було
 * тестувати без Prisma.
 */

/** Як повідомлення підписане для слухача: підтримка для нього — одна, без імен адміністраторів. */
export const SUPPORT_DISPLAY_NAME = 'Підтримка';

export interface MessageRow {
  id: string;
  body: string;
  fromAdmin: boolean;
  authorId: string | null;
  author: { name: string } | null;
  pagePath: string | null;
  pageTitle: string | null;
  createdAt: Date;
  readAt: Date | null;
}

/**
 * Рядок бази → DTO з точки зору того, хто дивиться.
 *
 * Слухач бачить відповіді як «Підтримка»: адміністраторів може бути кілька, і
 * людині не треба знати, хто саме з них сьогодні черговий. Адміністратор,
 * навпаки, бачить імʼя колеги — щоб розуміти, хто вже відповідав.
 */
export function toMessageDto(
  row: MessageRow,
  viewer: { id: string; side: 'learner' | 'admin' },
): SupportMessageDto {
  const authorName = row.fromAdmin
    ? viewer.side === 'learner'
      ? SUPPORT_DISPLAY_NAME
      : (row.author?.name ?? SUPPORT_DISPLAY_NAME)
    : (row.author?.name ?? null);

  return {
    id: row.id,
    body: row.body,
    fromAdmin: row.fromAdmin,
    authorName,
    isMine: row.authorId === viewer.id,
    pagePath: row.pagePath,
    pageTitle: row.pageTitle,
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt ? row.readAt.toISOString() : null,
  };
}

/** Короткий однорядковий уривок для списку розмов. */
export function previewOf(body: string, max = 90): string {
  const flat = body.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

/**
 * Пошук людини за імʼям або поштою без урахування регістру.
 *
 * Фільтруємо в JS, а не через `contains` у Prisma: у SQLite `LIKE` ігнорує
 * регістр лише для латиниці, тож «іван» не знайшов би «Іван».
 */
export function matchesPerson(person: { name: string; email: string }, query: string): boolean {
  const q = query.trim().toLocaleLowerCase('uk');
  if (!q) return true;
  return person.name.toLocaleLowerCase('uk').includes(q) || person.email.toLocaleLowerCase('uk').includes(q);
}
