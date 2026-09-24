import { describe, expect, it } from 'vitest';
import { matchesPerson, previewOf, toMessageDto, type MessageRow } from './format';

const base: MessageRow = {
  id: 'm1',
  body: 'Привіт',
  fromAdmin: true,
  authorId: 'admin-1',
  author: { name: 'Олена Адмін' },
  pagePath: null,
  pageTitle: null,
  createdAt: new Date('2026-09-24T10:00:00Z'),
  readAt: null,
};

describe('toMessageDto', () => {
  it('слухач бачить відповідь підтримки без імені адміністратора', () => {
    const dto = toMessageDto(base, { id: 'user-1', side: 'learner' });
    expect(dto.authorName).toBe('Підтримка');
    expect(dto.isMine).toBe(false);
  });

  it('адміністратор бачить, хто з колег відповідав', () => {
    expect(toMessageDto(base, { id: 'admin-2', side: 'admin' }).authorName).toBe('Олена Адмін');
    expect(toMessageDto(base, { id: 'admin-1', side: 'admin' }).isMine).toBe(true);
  });

  it('відповідь видаленого адміністратора лишається підписаною як «Підтримка»', () => {
    const dto = toMessageDto({ ...base, authorId: null, author: null }, { id: 'admin-2', side: 'admin' });
    expect(dto.authorName).toBe('Підтримка');
  });

  it('повідомлення людини — її власне', () => {
    const row = { ...base, fromAdmin: false, authorId: 'user-1', author: { name: 'Іван' } };
    const dto = toMessageDto(row, { id: 'user-1', side: 'learner' });
    expect(dto).toMatchObject({ authorName: 'Іван', isMine: true, readAt: null });
  });
});

describe('previewOf', () => {
  it('складає рядки в один і обрізає довгий текст', () => {
    expect(previewOf('раз\n\nдва   три')).toBe('раз два три');
    const long = previewOf('а'.repeat(200), 20);
    expect(long).toHaveLength(20);
    expect(long.endsWith('…')).toBe(true);
  });
});

describe('matchesPerson', () => {
  const person = { name: 'Іван Петренко', email: 'Ivan@Example.gov.ua' };

  it('кирилиця без урахування регістру', () => {
    expect(matchesPerson(person, 'іван')).toBe(true);
    expect(matchesPerson(person, 'ПЕТРЕНКО')).toBe(true);
  });

  it('пошта без урахування регістру; порожній запит — усі', () => {
    expect(matchesPerson(person, 'ivan@example')).toBe(true);
    expect(matchesPerson(person, '  ')).toBe(true);
    expect(matchesPerson(person, 'марія')).toBe(false);
  });
});
