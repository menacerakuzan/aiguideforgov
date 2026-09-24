'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Chat, XIcon } from '@proai/icons';
import { Button, Orb, cn, toast, useReducedMotion } from '@proai/ui';
import type { SupportMessageDto, SupportThreadResponse, SupportUnreadResponse } from '@proai/types';
import { api } from '@/lib/api-client';
import { Composer, MessageList } from './support-chat-ui';

/**
 * Кругла кнопка підтримки в правому нижньому куті — на кожній сторінці
 * платформи, поверх прокрутки.
 *
 * Слухачу вона відкриває невелике вікно чату з адміністраторами. Адміністратору
 * — веде в розділ «Підтримка», де зібрані всі розмови: сам собі він не пише.
 * В обох випадках біля кнопки висить число непрочитаних.
 *
 * Живого зʼєднання немає — опитування: лічильник раз на пів хвилини, відкрита
 * розмова раз на 5 секунд. У фоновій вкладці react-query опитування зупиняє, а
 * при поверненні на вкладку одразу оновлює.
 */

const UNREAD_KEY = ['support', 'unread'] as const;
const THREAD_KEY = ['support', 'thread'] as const;

/** Лічильник біля кнопки. */
function useUnread() {
  return useQuery({
    queryKey: UNREAD_KEY,
    queryFn: () => api.get<SupportUnreadResponse>('/api/support/unread'),
    refetchInterval: 30_000,
    staleTime: 10_000,
    select: (data) => data.unread,
  });
}

export function SupportWidget({ isAdmin }: { isAdmin: boolean }) {
  return isAdmin ? <AdminSupportLink /> : <LearnerSupportChat />;
}

/* --- Адміністратор: кнопка-посилання на розділ «Підтримка» ------------------------- */

function AdminSupportLink() {
  const pathname = usePathname();
  const { data: unread = 0 } = useUnread();

  // На самій сторінці підтримки кнопка вела б туди ж, де людина вже є.
  if (pathname.startsWith('/admin/support')) return null;

  return (
    <div className="fixed right-4 bottom-4 z-[80] sm:right-6 sm:bottom-6 print:hidden">
      <Link
        href="/admin/support"
        aria-label={unread > 0 ? `Підтримка: ${unread} непрочитаних` : 'Підтримка'}
        title="Підтримка — усі розмови"
        className={FAB_CLASS}
      >
        <Chat size={28} />
        <UnreadBadge count={unread} />
      </Link>
    </div>
  );
}

/* --- Слухач: чат у вікні ----------------------------------------------------------- */

function LearnerSupportChat() {
  const queryClient = useQueryClient();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  // Чернетка живе тут, а не в полі: вікно при згортанні зникає, а недописане
  // питання має дочекатися, поки людина відкриє чат знову.
  const [draft, setDraft] = useState('');

  const { data: unread = 0 } = useUnread();

  const thread = useQuery({
    queryKey: THREAD_KEY,
    queryFn: () => api.get<SupportThreadResponse>('/api/support'),
    enabled: open,
    refetchInterval: open ? 5_000 : false,
    staleTime: 0,
  });

  const markRead = useMutation({
    mutationFn: () => api.post('/api/support/read'),
    onSuccess: () => {
      queryClient.setQueryData<SupportUnreadResponse>(UNREAD_KEY, { unread: 0 });
      // Без цього наступна відповідь, що прийде до оновлення розмови, дала б те
      // саме число, і ефект нижче не спрацював би вдруге.
      queryClient.setQueryData<SupportThreadResponse>(THREAD_KEY, (old) => (old ? { ...old, unread: 0 } : old));
    },
  });

  // Поки вікно відкрите, усе, що прийшло, людина бачить — тож воно прочитане.
  const threadUnread = thread.data?.unread ?? 0;
  useEffect(() => {
    if (open && threadUnread > 0 && !markRead.isPending) markRead.mutate();
    // markRead — стабільний обʼєкт мутації; залежність від нього зациклила б ефект.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, threadUnread]);

  const send = useMutation({
    mutationFn: (body: string) =>
      api.post<{ message: SupportMessageDto }>('/api/support', { body, ...currentPageContext() }),
    onSuccess: ({ message }) => {
      setDraft('');
      queryClient.setQueryData<SupportThreadResponse>(THREAD_KEY, (old) =>
        old ? { ...old, messages: [...old.messages, message] } : { messages: [message], unread: 0 },
      );
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Не вдалося надіслати повідомлення'),
  });

  // Esc згортає чат — як будь-яке спливне вікно.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const badge = open ? 0 : unread;

  return (
    <div className="print:hidden">
      <AnimatePresence>
        {open && (
          <motion.section
            key="support-panel"
            role="dialog"
            aria-label="Чат підтримки"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            style={{ transformOrigin: 'bottom right' }}
            className={cn(
              'fixed z-[80] flex flex-col overflow-hidden rounded-[30px] border-[2.5px] border-ink bg-paper shadow-[5px_6px_0_0_var(--color-ink)]',
              // Телефон: майже на весь екран, кнопка лишається видимою під вікном.
              'inset-x-3 top-3 bottom-[92px]',
              'sm:inset-x-auto sm:top-auto sm:right-6 sm:bottom-[104px] sm:h-[min(580px,calc(100dvh-8.5rem))] sm:w-[390px]',
            )}
          >
            <header className="flex items-center gap-3 border-b-[2.5px] border-ink bg-blue px-4 py-3.5 text-white">
              <span className="grid h-10 w-10 flex-none place-items-center rounded-full border-2 border-ink bg-white text-blue">
                <Chat size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-lg leading-tight font-extrabold">Підтримка</h2>
                <p className="text-[13px] text-white/85">Відповідає адміністратор платформи</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Згорнути чат"
                className="grid h-10 w-10 flex-none place-items-center rounded-full text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-white"
              >
                <XIcon size={20} />
              </button>
            </header>

            {thread.isError && !thread.data ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
                <p className="font-display font-bold">Не вдалося завантажити розмову</p>
                <Button size="sm" variant="ghost" onClick={() => thread.refetch()}>
                  Спробувати ще
                </Button>
              </div>
            ) : !thread.data ? (
              <div className="flex flex-1 items-center justify-center text-sm text-ink-soft">Завантаження…</div>
            ) : (
              <MessageList messages={thread.data.messages} side="learner" className="px-4 py-4" empty={<Welcome />} />
            )}

            <div className="border-t-2 border-ink/10 bg-surface p-3">
              <Composer
                value={draft}
                onChange={setDraft}
                onSubmit={() => send.mutate(draft.trim())}
                pending={send.isPending}
                placeholder="Напишіть питання…"
                autoFocus
              />
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <div className="fixed right-4 bottom-4 z-[80] sm:right-6 sm:bottom-6">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? 'Згорнути чат підтримки' : badge > 0 ? `Підтримка: ${badge} нових відповідей` : 'Написати в підтримку'}
          title={open ? undefined : 'Написати в підтримку'}
          className={FAB_CLASS}
        >
          <motion.span
            key={open ? 'close' : 'chat'}
            initial={reduced ? false : { rotate: -90, scale: 0.6, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 20 }}
            className="grid place-items-center"
          >
            {open ? <XIcon size={24} /> : <Chat size={28} />}
          </motion.span>
          <UnreadBadge count={badge} />
        </button>
      </div>
    </div>
  );
}

/** Порожня розмова: пояснюємо, як це працює, щоб перше повідомлення було не «ау?». */
function Welcome() {
  return (
    <div className="m-auto flex max-w-[300px] flex-col items-center gap-3 px-2 text-center">
      <Orb color="sun" size="lg">
        <Chat size={26} />
      </Orb>
      <p className="font-display text-lg font-bold">Чим допомогти?</p>
      <p className="text-[14.5px] text-ink-soft">
        Опишіть, що не виходить або що незрозуміло. Якщо пишете з уроку — ми одразу побачимо, з якого саме.
      </p>
      <p className="text-[14.5px] text-ink-soft">
        Чат можна згорнути: коли відповімо, біля кнопки зʼявиться позначка.
      </p>
    </div>
  );
}

/**
 * Звідки людина пише: шлях і заголовок сторінки. Заголовок беремо з <h1> —
 * на сторінці уроку це назва уроку, тоді як <title> там загальний.
 */
function currentPageContext(): { pagePath?: string; pageTitle?: string } {
  if (typeof window === 'undefined') return {};
  const heading = document.querySelector('h1')?.textContent?.trim();
  const title = heading || document.title.replace(/\s*·\s*ПРО\.ШІ$/, '').trim();
  return { pagePath: window.location.pathname, pageTitle: title ? title.slice(0, 200) : undefined };
}

const FAB_CLASS =
  'relative grid h-[60px] w-[60px] place-items-center rounded-full border-[2.5px] border-ink bg-blue text-white shadow-[4px_5px_0_0_var(--color-ink)] transition-[transform,box-shadow] duration-200 hover:-translate-y-[3px] hover:shadow-[5px_6px_0_0_var(--color-ink)] active:translate-x-[3px] active:translate-y-[4px] active:shadow-none focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue focus-visible:ring-offset-2';

/** Червоний кружечок із числом. Підстрибує, коли число зростає. */
function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      key={count}
      aria-hidden="true"
      className="absolute -top-1.5 -right-1.5 grid h-[26px] min-w-[26px] animate-bump place-items-center rounded-full border-2 border-ink bg-red px-1.5 font-display text-[13px] leading-none font-extrabold text-white"
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
