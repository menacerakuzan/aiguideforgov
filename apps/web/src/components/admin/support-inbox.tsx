'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Chat, Search } from '@proai/icons';
import {
  Avatar,
  Badge,
  Button,
  ClayCard,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  EmptyState,
  FilterTabs,
  Input,
  cn,
  toast,
} from '@proai/ui';
import type {
  AdminSupportThreadResponse,
  SupportMessageDto,
  SupportPeopleResponse,
  SupportThreadRow,
  SupportThreadsResponse,
} from '@proai/types';
import { api, ApiFetchError } from '@/lib/api-client';
import { Composer, MessageList, formatShortStamp } from '@/components/support/support-chat-ui';

/**
 * Скринька підтримки: ліворуч — розмови, праворуч — відкрита розмова.
 * На телефоні — одне з двох, з кнопкою «До розмов».
 *
 * Сторінка опитує API, поки відкрита: список раз на 10 секунд, відкриту
 * розмову раз на 5. Відкрита розмова одразу позначається прочитаною — для
 * всіх адміністраторів, бо звернення вже в роботі.
 */

type Filter = 'all' | 'unread' | 'awaiting';

const THREADS_KEY = ['admin-support', 'threads'] as const;
const threadKey = (userId: string) => ['admin-support', 'thread', userId] as const;
/** Той самий ключ, що в кнопки підтримки (support-widget) — щоб число там гасло одразу. */
const UNREAD_KEY = ['support', 'unread'] as const;

export function SupportInbox({
  initialThreads,
  initialUserId,
}: {
  initialThreads: SupportThreadRow[];
  initialUserId: string | null;
}) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(initialUserId);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  // Чернетки окремо для кожної розмови: перемкнувся глянути іншу — недописане не зникло.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data } = useQuery({
    queryKey: THREADS_KEY,
    queryFn: () => api.get<SupportThreadsResponse>('/api/admin/support'),
    initialData: { threads: initialThreads },
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
  const threads = data.threads;

  const unreadThreads = threads.filter((t) => t.unread > 0).length;
  const awaitingThreads = threads.filter((t) => t.awaitingReply).length;

  const q = search.trim().toLocaleLowerCase('uk');
  const visible = threads.filter((t) => {
    if (filter === 'unread' && t.unread === 0) return false;
    if (filter === 'awaiting' && !t.awaitingReply) return false;
    if (!q) return true;
    return t.user.name.toLocaleLowerCase('uk').includes(q) || t.user.email.toLocaleLowerCase('uk').includes(q);
  });

  /** Вибір розмови відбивається в адресі — її можна оновити, закласти чи переслати колезі. */
  function select(userId: string | null) {
    setSelectedId(userId);
    const url = userId ? `?user=${encodeURIComponent(userId)}` : window.location.pathname;
    window.history.replaceState(null, '', url);
  }

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Підтримка</h1>
          <p className="mt-1 max-w-[62ch] text-ink-soft">
            Питання, які люди пишуть через кнопку чату. Відкрита розмова позначається прочитаною, а ваша відповідь
            зʼявляється в людини біля кнопки підтримки.
          </p>
        </div>
        <Button onClick={() => setPickerOpen(true)}>
          <Chat size={18} /> Написати людині
        </Button>
      </header>

      <div className="grid gap-5 lg:h-[calc(100dvh-250px)] lg:min-h-[560px] lg:grid-cols-[360px_minmax(0,1fr)]">
        {/* --- Список розмов --------------------------------------------------- */}
        <ClayCard
          padding="none"
          className={cn('flex h-[calc(100dvh-220px)] min-h-[460px] flex-col overflow-hidden lg:h-auto', selectedId && 'max-lg:hidden')}
        >
          <div className="flex flex-col gap-3 border-b-2 border-ink/10 p-4">
            <div className="relative">
              <Search size={17} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-mute" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Імʼя або пошта"
                aria-label="Пошук розмови"
                className="py-2.5 pl-11 text-[15px]"
              />
            </div>
            <FilterTabs
              label="Які розмови показати"
              value={filter}
              onChange={setFilter}
              className="gap-2 [&>button]:px-3.5 [&>button]:py-2"
              options={[
                { value: 'all', label: 'Усі' },
                { value: 'unread', label: unreadThreads ? `Нові · ${unreadThreads}` : 'Нові' },
                { value: 'awaiting', label: awaitingThreads ? `Без відповіді · ${awaitingThreads}` : 'Без відповіді' },
              ]}
            />
          </div>

          {visible.length === 0 ? (
            <EmptyState
              className="py-10"
              icon={<Chat size={24} />}
              title={threads.length === 0 ? 'Звернень ще немає' : 'Нічого не знайдено'}
              description={
                threads.length === 0
                  ? 'Щойно хтось напише через кнопку підтримки, розмова зʼявиться тут.'
                  : 'Змініть фільтр або пошуковий запит.'
              }
            />
          ) : (
            <ul className="flex-1 overflow-y-auto p-2">
              {visible.map((t) => (
                <li key={t.user.id}>
                  <ThreadItem thread={t} selected={t.user.id === selectedId} onSelect={() => select(t.user.id)} />
                </li>
              ))}
            </ul>
          )}
        </ClayCard>

        {/* --- Відкрита розмова ------------------------------------------------ */}
        <ClayCard
          padding="none"
          className={cn('flex h-[calc(100dvh-140px)] min-h-[460px] flex-col overflow-hidden lg:h-auto', !selectedId && 'max-lg:hidden')}
        >
          {selectedId ? (
            <Conversation
              key={selectedId}
              userId={selectedId}
              draft={drafts[selectedId] ?? ''}
              onDraftChange={(value) => setDrafts((d) => ({ ...d, [selectedId]: value }))}
              onBack={() => select(null)}
              onSent={() => {
                setDrafts((d) => ({ ...d, [selectedId]: '' }));
                queryClient.invalidateQueries({ queryKey: THREADS_KEY });
              }}
              onRead={() => {
                queryClient.setQueryData<SupportThreadsResponse>(THREADS_KEY, (old) =>
                  old
                    ? { threads: old.threads.map((t) => (t.user.id === selectedId ? { ...t, unread: 0 } : t)) }
                    : old,
                );
                queryClient.invalidateQueries({ queryKey: UNREAD_KEY });
              }}
            />
          ) : (
            <EmptyState
              className="m-auto"
              icon={<Chat size={24} />}
              title="Оберіть розмову"
              description="Або натисніть «Написати людині», щоб почати розмову першим."
            />
          )}
        </ClayCard>
      </div>

      <PeoplePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(userId) => {
          setPickerOpen(false);
          setFilter('all');
          setSearch('');
          select(userId);
        }}
      />
    </>
  );
}

function ThreadItem({ thread, selected, onSelect }: { thread: SupportThreadRow; selected: boolean; onSelect: () => void }) {
  const { user, lastMessage, unread, awaitingReply } = thread;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'flex w-full items-start gap-3 rounded-[22px] p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue',
        selected ? 'bg-blue-tint' : 'hover:bg-paper-2',
      )}
    >
      <Avatar name={user.name} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className={cn('min-w-0 flex-1 truncate', unread > 0 ? 'font-extrabold' : 'font-bold')}>{user.name}</p>
          <span className="flex-none text-xs font-semibold text-ink-mute">{formatShortStamp(lastMessage.createdAt)}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <p className={cn('min-w-0 flex-1 truncate text-sm', unread > 0 ? 'font-semibold text-ink' : 'text-ink-soft')}>
            {lastMessage.fromAdmin && <span className="text-ink-mute">Підтримка: </span>}
            {lastMessage.body}
          </p>
          {unread > 0 && (
            <span
              aria-label={`${unread} непрочитаних`}
              className="grid h-6 min-w-6 flex-none place-items-center rounded-full border-2 border-ink bg-red px-1.5 font-display text-xs font-extrabold text-white"
            >
              {unread}
            </span>
          )}
        </div>
        {awaitingReply && unread === 0 && (
          <p className="mt-1 text-xs font-bold text-amber-deep">чекає на відповідь</p>
        )}
      </div>
    </button>
  );
}

function Conversation({
  userId,
  draft,
  onDraftChange,
  onBack,
  onSent,
  onRead,
}: {
  userId: string;
  draft: string;
  onDraftChange: (value: string) => void;
  onBack: () => void;
  onSent: () => void;
  onRead: () => void;
}) {
  const queryClient = useQueryClient();

  const thread = useQuery({
    queryKey: threadKey(userId),
    queryFn: () => api.get<AdminSupportThreadResponse>(`/api/admin/support/${encodeURIComponent(userId)}`),
    refetchInterval: (query) => (query.state.error ? false : 5_000),
    staleTime: 0,
    retry: (count, error) => !(error instanceof ApiFetchError && error.status === 404) && count < 1,
  });

  const markRead = useMutation({
    mutationFn: () => api.post(`/api/admin/support/${encodeURIComponent(userId)}/read`),
    onSuccess: () => {
      const now = new Date().toISOString();
      queryClient.setQueryData<AdminSupportThreadResponse>(threadKey(userId), (old) =>
        old
          ? { ...old, messages: old.messages.map((m) => (!m.fromAdmin && !m.readAt ? { ...m, readAt: now } : m)) }
          : old,
      );
      onRead();
    },
  });

  // Відкрита розмова — прочитана. Спрацьовує й на нові повідомлення, що
  // прийшли, поки адміністратор у ній.
  const hasUnread = thread.data?.messages.some((m) => !m.fromAdmin && !m.readAt) ?? false;
  useEffect(() => {
    if (hasUnread && !markRead.isPending) markRead.mutate();
    // markRead — стабільний обʼєкт мутації; залежність від нього зациклила б ефект.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnread]);

  const send = useMutation({
    mutationFn: (body: string) =>
      api.post<{ message: SupportMessageDto }>(`/api/admin/support/${encodeURIComponent(userId)}`, { body }),
    onSuccess: ({ message }) => {
      queryClient.setQueryData<AdminSupportThreadResponse>(threadKey(userId), (old) =>
        old ? { ...old, messages: [...old.messages, message] } : old,
      );
      onSent();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Не вдалося надіслати повідомлення'),
  });

  const backButton = (
    <button
      type="button"
      onClick={onBack}
      aria-label="До розмов"
      className="grid h-10 w-10 flex-none place-items-center rounded-full text-ink-soft hover:bg-paper-2 lg:hidden"
    >
      <ArrowLeft size={18} />
    </button>
  );

  if (thread.isError && !thread.data) {
    const missing = thread.error instanceof ApiFetchError && thread.error.status === 404;
    return (
      <>
        <div className="flex items-center gap-2 px-3 pt-3">{backButton}</div>
        <EmptyState
          className="m-auto"
          icon={<Chat size={24} />}
          title={missing ? 'Такого користувача немає' : 'Не вдалося завантажити розмову'}
          description={missing ? 'Можливо, акаунт видалили.' : 'Перевірте зʼєднання й спробуйте ще раз.'}
          action={
            missing ? undefined : (
              <Button size="sm" variant="ghost" onClick={() => thread.refetch()}>
                Спробувати ще
              </Button>
            )
          }
        />
      </>
    );
  }

  if (!thread.data) {
    return <div className="m-auto text-sm text-ink-soft">Завантаження…</div>;
  }

  const { user, messages } = thread.data;

  return (
    <>
      <header className="flex items-center gap-3 border-b-2 border-ink/10 px-4 py-3">
        {backButton}
        <Avatar name={user.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display font-bold">{user.name}</p>
          <p className="truncate text-sm text-ink-mute">
            {[user.email, user.organizationName, user.position].filter(Boolean).join(' · ')}
          </p>
        </div>
        <Button size="sm" variant="ghost" asChild className="max-sm:hidden">
          <Link href={`/admin/analytics/user/${user.id}`}>Картка людини</Link>
        </Button>
      </header>

      <MessageList
        messages={messages}
        side="admin"
        className="px-5 py-4"
        empty={
          <EmptyState
            className="m-auto px-6"
            icon={<Chat size={24} />}
            title="Розмови ще немає"
            description={`Напишіть першим — ${user.name} побачить позначку на кнопці підтримки й відкриє чат.`}
          />
        }
      />

      <div className="border-t-2 border-ink/10 bg-surface p-3">
        <Composer
          value={draft}
          onChange={onDraftChange}
          onSubmit={() => send.mutate(draft.trim())}
          pending={send.isPending}
          placeholder={`Відповідь для ${user.name}…`}
          autoFocus
        />
      </div>
    </>
  );
}

/** Невелика затримка пошуку: не смикати сервер на кожну літеру. */
function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

/** Вибір людини, якій адміністратор пише першим. */
function PeoplePicker({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (userId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query.trim(), 250);

  const people = useQuery({
    queryKey: ['admin-support', 'people', debounced],
    queryFn: () => api.get<SupportPeopleResponse>(`/api/admin/support/people?q=${encodeURIComponent(debounced)}`),
    enabled: open,
    placeholderData: keepPreviousData,
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setQuery('');
      }}
    >
      <DialogContent className="w-[min(540px,calc(100vw-2rem))] p-7">
        <DialogHeader>
          <DialogTitle>Написати людині</DialogTitle>
          <DialogDescription>
            Оберіть зареєстрованого слухача — повідомлення зʼявиться в нього в чаті підтримки.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search size={17} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-mute" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Імʼя або пошта"
            aria-label="Пошук людини"
            className="py-3 pl-11"
          />
        </div>

        <ul className="-mx-2 mt-4 max-h-[min(420px,50vh)] overflow-y-auto">
          {people.data?.people.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onPick(p.id)}
                className="flex w-full items-center gap-3 rounded-[20px] p-2.5 text-left transition-colors hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue"
              >
                <Avatar name={p.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{p.name}</p>
                  <p className="truncate text-sm text-ink-mute">
                    {[p.email, p.organizationName].filter(Boolean).join(' · ')}
                  </p>
                </div>
                {p.hasThread && <Badge color="blue">є розмова</Badge>}
              </button>
            </li>
          ))}
        </ul>

        {people.isLoading && <p className="py-6 text-center text-sm text-ink-soft">Завантаження…</p>}
        {people.data && people.data.people.length === 0 && (
          <p className="py-6 text-center text-sm text-ink-soft">
            {debounced ? 'Нікого не знайдено.' : 'Слухачів ще немає.'}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
