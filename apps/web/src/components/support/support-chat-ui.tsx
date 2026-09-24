'use client';

import { Fragment, useEffect, useId, useLayoutEffect, useRef } from 'react';
import { Send } from '@proai/icons';
import { cn } from '@proai/ui';
import { SUPPORT_MESSAGE_MAX, type SupportMessageDto } from '@proai/types';

/**
 * Спільні частини чату підтримки — однакові у віджеті слухача й на сторінці
 * адміністратора, щоб розмова з обох боків виглядала як одна й та сама.
 */

/** Час показуємо за Києвом явно: інакше сервер і браузер можуть намалювати різне. */
const TIME_ZONE = 'Europe/Kyiv';

function dayKey(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: TIME_ZONE });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', timeZone: TIME_ZONE });
}

/** «Сьогодні» / «Вчора» / «12 вересня» — роздільник днів у розмові. */
export function formatDay(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (dayKey(date) === dayKey(now)) return 'Сьогодні';
  if (dayKey(date) === dayKey(yesterday)) return 'Вчора';
  return date.toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
    ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' as const } : {}),
    timeZone: TIME_ZONE,
  });
}

/** Коротка мітка для списку розмов: сьогодні — час, раніше — дата. */
export function formatShortStamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  if (dayKey(date) === dayKey(now)) return formatTime(iso);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (dayKey(date) === dayKey(yesterday)) return 'вчора';
  return date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', timeZone: TIME_ZONE });
}

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

/**
 * Текст повідомлення з клікабельними посиланнями. Лише http(s) — схеми на
 * кшталт `javascript:` сюди не потрапляють за побудовою регулярного виразу.
 * Розділові знаки в кінці («…див. https://x.ua.») до посилання не належать.
 */
function Linkified({ text }: { text: string }) {
  const parts = text.split(URL_PATTERN);
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
        const trailing = part.match(/[.,;:!?)»"']+$/)?.[0] ?? '';
        const href = trailing ? part.slice(0, -trailing.length) : part;
        return (
          <Fragment key={i}>
            <a href={href} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-2">
              {href}
            </a>
            {trailing}
          </Fragment>
        );
      })}
    </>
  );
}

/**
 * Стрічка повідомлень.
 *
 * `side` — хто дивиться. Свої повідомлення праворуч: для слухача це його
 * питання, для адміністратора — відповіді підтримки (свої й колег).
 *
 * Прокрутка: при відкритті — до кінця; при новому повідомленні — теж, але
 * лише якщо людина й так унизу або написала сама. Інакше відповідь, що
 * прийшла, поки вона перечитує початок розмови, смикала б її вниз.
 */
export function MessageList({
  messages,
  side,
  empty,
  className,
}: {
  messages: SupportMessageDto[];
  side: 'learner' | 'admin';
  empty?: React.ReactNode;
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const lastIdRef = useRef<string | null>(null);

  const isOwnSide = (m: SupportMessageDto) => (side === 'learner' ? !m.fromAdmin : m.fromAdmin);
  const lastMessage = messages[messages.length - 1];
  const lastOwn = [...messages].reverse().find(isOwnSide);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !lastMessage) return;
    const isFirstRender = lastIdRef.current === null;
    const isNew = lastMessage.id !== lastIdRef.current;
    lastIdRef.current = lastMessage.id;
    if (isFirstRender || (isNew && (nearBottomRef.current || lastMessage.isMine))) {
      el.scrollTop = el.scrollHeight;
    }
  }, [lastMessage]);

  if (messages.length === 0) {
    return <div className={cn('flex flex-1 flex-col overflow-y-auto', className)}>{empty}</div>;
  }

  let prevDay = '';
  let prevPagePath: string | null = null;

  return (
    <div
      ref={scrollRef}
      onScroll={(e) => {
        const el = e.currentTarget;
        nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      }}
      className={cn('flex flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto overscroll-contain', className)}
      role="log"
      aria-live="polite"
      aria-label="Повідомлення"
    >
      {messages.map((m, index) => {
        const own = isOwnSide(m);
        const day = formatDay(m.createdAt);
        const showDay = day !== prevDay;
        prevDay = day;

        // Контекст сторінки показуємо лише коли він змінився: десять питань
        // з одного уроку не мають десять разів повторювати його назву.
        const showPage = !m.fromAdmin && m.pagePath !== null && m.pagePath !== prevPagePath;
        if (!m.fromAdmin && m.pagePath) prevPagePath = m.pagePath;

        const prev = messages[index - 1];
        const sameAuthorAsPrev = prev && !showDay && prev.fromAdmin === m.fromAdmin && prev.authorName === m.authorName;
        // Імʼя над бульбашкою: адміністратору — хто з колег відповідав, якщо не він сам.
        const showAuthor = side === 'admin' && m.fromAdmin && !m.isMine && !sameAuthorAsPrev;

        return (
          <Fragment key={m.id}>
            {showDay && (
              <p className="my-2 self-center rounded-full bg-paper-2 px-3 py-1 text-xs font-bold text-ink-mute">{day}</p>
            )}
            <div className={cn('flex max-w-[86%] min-w-0 flex-col', own ? 'items-end self-end' : 'items-start self-start')}>
              {showPage && (
                <PageContext path={m.pagePath!} title={m.pageTitle} clickable={side === 'admin'} />
              )}
              {showAuthor && <p className="mb-1 px-2 text-xs font-bold text-ink-mute">{m.authorName}</p>}
              <div
                className={cn(
                  // overflow-wrap: anywhere, а не break-words: бульбашка — flex-елемент, і
                  // лише `anywhere` зменшує її мінімальну ширину. Інакше довгий рядок без
                  // пробілів (посилання, код помилки, «ааааа…») розпирав би вікно чату.
                  'max-w-full min-w-0 rounded-[20px] border-2 border-ink px-4 py-2.5 text-[15px] leading-snug [overflow-wrap:anywhere] whitespace-pre-wrap shadow-[2px_3px_0_0_var(--color-ink)]',
                  own ? 'rounded-br-[6px] bg-blue text-white' : 'rounded-bl-[6px] bg-surface text-ink',
                )}
              >
                <Linkified text={m.body} />
              </div>
              <p className="mt-1 px-2 text-[11.5px] font-semibold text-ink-mute">
                {formatTime(m.createdAt)}
                {own && m.id === lastOwn?.id && (m.readAt ? ' · Прочитано' : ' · Надіслано')}
              </p>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

/** «З уроку: …» над повідомленням людини — звідки вона писала. */
function PageContext({ path, title, clickable }: { path: string; title: string | null; clickable: boolean }) {
  const label = title || path;
  const content = (
    <>
      <span aria-hidden="true">📍</span> <span className="truncate">{label}</span>
    </>
  );
  const cls =
    'mb-1 inline-flex max-w-full items-center gap-1 rounded-full bg-paper-2 px-2.5 py-1 text-xs font-semibold text-ink-soft';

  if (!clickable) {
    return (
      <p className={cls} title={`Написано зі сторінки: ${label}`}>
        {content}
      </p>
    );
  }
  // Нова вкладка: адміністратор дивиться, про що питають, не втрачаючи відкриту розмову.
  return (
    <a href={path} target="_blank" rel="noopener" className={cn(cls, 'hover:bg-blue-tint hover:text-blue-deep')} title={`Відкрити: ${label}`}>
      {content}
    </a>
  );
}

/** Сенсорні екрани: Enter там — новий рядок, а надсилає кнопка (як у месенджерах на телефоні). */
function isTouchDevice(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
}

/**
 * Поле вводу з кнопкою «Надіслати».
 *
 * Кероване ззовні (`value`): чернетка має переживати згортання чату, а
 * компонент при згортанні зникає.
 */
export function Composer({
  value,
  onChange,
  onSubmit,
  pending,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  pending: boolean;
  placeholder: string;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fieldId = useId();
  const canSend = value.trim().length > 0 && value.length <= SUPPORT_MESSAGE_MAX && !pending;
  const nearLimit = value.length > SUPPORT_MESSAGE_MAX - 200;

  // Поле росте разом із текстом — до п'яти-шести рядків, далі прокрутка.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  useEffect(() => {
    if (autoFocus && !isTouchDevice()) ref.current?.focus();
  }, [autoFocus]);

  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSend) onSubmit();
      }}
    >
      <div className="min-w-0 flex-1">
        <label htmlFor={fieldId} className="sr-only">
          Повідомлення
        </label>
        <textarea
          id={fieldId}
          ref={ref}
          rows={1}
          value={value}
          maxLength={SUPPORT_MESSAGE_MAX + 200}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && !isTouchDevice()) {
              e.preventDefault();
              if (canSend) onSubmit();
            }
          }}
          className="block max-h-40 min-h-[48px] w-full resize-none rounded-[24px] bg-paper-2 px-4 py-3 font-body text-[15px] text-ink shadow-[inset_0_3px_7px_rgba(93,88,128,0.12)] placeholder:text-ink-mute focus:outline-none focus-visible:ring-3 focus-visible:ring-blue"
        />
        {nearLimit && (
          <p
            className={cn(
              'mt-1 pl-3 text-xs font-semibold',
              value.length > SUPPORT_MESSAGE_MAX ? 'text-red' : 'text-ink-mute',
            )}
          >
            {value.length} / {SUPPORT_MESSAGE_MAX}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={!canSend}
        aria-label="Надіслати"
        className="mb-px grid h-12 w-12 flex-none place-items-center rounded-full border-[2.5px] border-ink bg-blue text-white shadow-[3px_3px_0_0_var(--color-ink)] transition-transform hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-40 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue focus-visible:ring-offset-2"
      >
        <Send size={19} />
      </button>
    </form>
  );
}
