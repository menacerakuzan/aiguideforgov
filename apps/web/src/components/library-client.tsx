'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, Book, Check, Copy, Doc, Lock, Search, Shield, Spark, TlSafe } from '@proai/icons';
import {
  Button,
  ClayCard,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  EmptyState,
  FilterTabs,
  Input,
  Orb,
  ProgressBar,
  useCopyToClipboard,
} from '@proai/ui';
import type { LibraryItem, LibraryKind, LibraryResponse } from '@proai/types';
import { LIBRARY_KIND_LABELS } from '@proai/types';
import { api } from '@/lib/api-client';

/**
 * Бібліотека — це «трофеї», а не каталог.
 *
 * Матеріал зʼявляється тут лише після проходження уроку, який його дає, тому
 * сторінка влаштована навколо прогресу: скільки вже відкрито, скільки чекає.
 * Порожня бібліотека — нормальний стан новачка, і вона мусить це пояснювати,
 * а не виглядати як помилка чи як «нічого не знайдено».
 *
 * `initialData` приходить із серверного компонента сторінки — тому вміст є вже
 * в першому HTML, без окремого рейсу браузера до /api/library. Запит лишається
 * тільки для пошуку й оновлення лічильника копіювань.
 */

type Filter = 'all' | LibraryKind;

/** Кожному типу — свій колір і значок, щоб стрічка читалася без вчитування в підписи. */
const KIND_STYLE: Record<LibraryKind, { icon: React.ReactNode; orb: 'blue' | 'green' | 'sun' | 'red' | 'gold' | 'muted' }> = {
  PROMPT: { icon: <Spark size={16} />, orb: 'blue' },
  TABLE: { icon: <TlSafe size={16} />, orb: 'green' },
  CHECKLIST: { icon: <Check size={16} />, orb: 'green' },
  RULE: { icon: <Shield size={16} />, orb: 'red' },
  CONCEPT: { icon: <Book size={16} />, orb: 'sun' },
  TEMPLATE: { icon: <Doc size={16} />, orb: 'gold' },
  ILLUSTRATION: { icon: <Book size={16} />, orb: 'muted' },
  GUIDE: { icon: <Book size={16} />, orb: 'muted' },
  REGULATION: { icon: <Doc size={16} />, orb: 'muted' },
};

/** Порядок фільтрів — від найкориснішого в щоденній роботі до довідкового. */
const KIND_ORDER: LibraryKind[] = [
  'PROMPT',
  'TABLE',
  'CHECKLIST',
  'RULE',
  'CONCEPT',
  'TEMPLATE',
  'ILLUSTRATION',
  'GUIDE',
  'REGULATION',
];

export function LibraryClient({ initialData }: { initialData: LibraryResponse }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<LibraryItem | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['library', q],
    queryFn: () => api.get<LibraryResponse>(`/api/library${q ? `?q=${encodeURIComponent(q)}` : ''}`),
    // Дані без пошуку вже приїхали з сервера в HTML — повторно їх не питаємо.
    // Щойно людина щось вводить, ключ запиту змінюється й react-query йде в API.
    initialData: q === '' ? initialData : undefined,
    placeholderData: (previous) => previous,
  });

  const items = useMemo(
    () => (data?.items ?? []).filter((i) => filter === 'all' || i.kind === filter),
    [data, filter],
  );

  // Показуємо лише ті фільтри, під якими справді щось є: вкладка, яка завжди
  // порожня, виглядає як зламана.
  const filters = useMemo(() => {
    const counts = data?.countsByKind ?? {};
    const present = KIND_ORDER.filter((k) => (counts[k] ?? 0) > 0);
    return [
      { value: 'all' as const, label: `Усі · ${data?.items.length ?? 0}` },
      ...present.map((k) => ({ value: k, label: `${LIBRARY_KIND_LABELS[k]} · ${counts[k]}` })),
    ];
  }, [data]);

  const nothingUnlocked = !isLoading && (data?.items.length ?? 0) === 0 && !q;

  return (
    <div className="pt-8 pb-16">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold">Бібліотека</h1>
        <p className="mt-2 text-ink-soft">
          Усе, що ви забрали з уроків: промпти, таблиці, памʼятки й поняття. Кожен матеріал відкривається, коли ви
          проходите урок, який його дає.
        </p>
      </header>

      {data && data.totalTrophyLessons > 0 && (
        <ClayCard variant={data.lockedCount === 0 ? 'gold' : undefined} className="mb-6 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Orb color={data.lockedCount === 0 ? 'gold' : 'blue'}>
                <Award size={22} />
              </Orb>
              <div>
                <p className="font-display text-lg font-bold">
                  {data.items.length} {materialsWord(data.items.length)} у вашій бібліотеці
                </p>
                <p className="text-sm text-ink-soft">
                  {data.lockedCount > 0
                    ? `Ще ${data.lockedCount} ${materialsWord(data.lockedCount)} відкриється далі в курсі`
                    : 'Ви зібрали всі матеріали курсу'}
                </p>
              </div>
            </div>
          </div>
          <ProgressBar
            value={(data.unlockedLessons / (data.totalTrophyLessons || 1)) * 100}
            label="Уроків із матеріалами пройдено"
            valueLabel={`${data.unlockedLessons} з ${data.totalTrophyLessons}`}
          />
        </ClayCard>
      )}

      {nothingUnlocked ? (
        <ClayCard>
          <EmptyState
            icon={<Lock size={22} />}
            title="Бібліотека поки порожня — і це нормально"
            description="Тут збирається те, що ви забираєте з уроків: готові промпти, порівняльні таблиці, памʼятки й пояснення понять. Пройдіть перший урок — і перший матеріал зʼявиться тут."
            action={
              <Button variant="blue" asChild>
                <Link href="/dashboard">Перейти до навчання</Link>
              </Button>
            }
          />
        </ClayCard>
      ) : (
        <>
          <div className="mb-5">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Пошук у бібліотеці…"
              className="max-w-[420px]"
            />
          </div>

          {filters.length > 1 && (
            <FilterTabs label="Тип матеріалу" options={filters} value={filter} onChange={setFilter} className="mb-7" />
          )}

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <ClayCard key={i} className="h-52 animate-pulse opacity-50" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <ClayCard>
              <EmptyState
                icon={<Search size={22} />}
                title="Нічого не знайдено"
                description="У відкритих матеріалах немає нічого за цим запитом. Спробуйте інші слова або інший тип."
              />
            </ClayCard>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <TrophyCard key={item.id} item={item} onOpen={() => setOpen(item)} />
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[85vh] w-[min(720px,calc(100vw-2rem))] overflow-y-auto">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>{open.title}</DialogTitle>
              </DialogHeader>
              <p className="mb-4 text-sm text-ink-soft">{open.summary}</p>

              {open.kind === 'PROMPT' ? (
                <PromptBody item={open} />
              ) : (
                <div
                  className="prose-lesson text-[15px] leading-[1.7]"
                  dangerouslySetInnerHTML={{ __html: open.body }}
                />
              )}

              <p className="mt-6 border-t border-ink/10 pt-4 text-sm text-ink-soft">
                З уроку{' '}
                <Link href={`/lesson/${open.lesson.id}`} className="font-semibold text-blue-deep">
                  {open.lesson.title}
                </Link>{' '}
                · {open.lesson.moduleTitle}
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function materialsWord(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'матеріал';
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'матеріали';
  return 'матеріалів';
}

function TrophyCard({ item, onOpen }: { item: LibraryItem; onOpen: () => void }) {
  const style = KIND_STYLE[item.kind];

  return (
    <ClayCard className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2">
        <Orb size="sm" color={style.orb}>
          {style.icon}
        </Orb>
        <span className="rounded-full bg-paper-2 px-2.5 py-0.5 text-xs font-bold text-ink-soft">
          {LIBRARY_KIND_LABELS[item.kind]}
        </span>
      </div>

      <h3 className="font-display text-[17px] font-bold">{item.title}</h3>
      <p className="text-sm text-ink-soft">{item.summary}</p>

      {item.kind === 'PROMPT' && (
        <pre className="max-h-28 overflow-hidden rounded-2xl bg-ink p-3.5 font-mono text-[12.5px] whitespace-pre-wrap text-white/90">
          {item.body}
        </pre>
      )}

      <div className="mt-auto flex items-end justify-between gap-3 pt-1">
        <Link
          href={`/lesson/${item.lesson.id}`}
          className="text-xs font-semibold text-ink-mute underline-offset-2 hover:text-blue-deep hover:underline"
          title={`Урок: ${item.lesson.title}`}
        >
          {item.lesson.title}
        </Link>
        {item.kind === 'PROMPT' ? <CopyButton item={item} /> : <OpenButton onOpen={onOpen} />}
      </div>
    </ClayCard>
  );
}

function OpenButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex-none rounded-full border-2 border-ink bg-surface px-3.5 py-1.5 text-xs font-bold transition-colors hover:bg-blue-tint hover:text-blue-deep"
    >
      Відкрити
    </button>
  );
}

function CopyButton({ item }: { item: LibraryItem }) {
  const { copied, copy } = useCopyToClipboard();
  const queryClient = useQueryClient();

  return (
    <button
      type="button"
      aria-label="Скопіювати промпт"
      onClick={async () => {
        await copy(item.body);
        // Лічильник копіювань — метрика з плану («скільки промптів забирають»).
        // Помилка тут не має ламати копіювання: текст уже в буфері.
        try {
          await api.post('/api/prompts/copied', { promptId: item.id });
          queryClient.invalidateQueries({ queryKey: ['library'] });
        } catch {
          /* лічильник не критичний */
        }
      }}
      className={`grid h-9 w-9 flex-none place-items-center rounded-full border-2 border-ink bg-surface ${
        copied ? 'text-green' : 'text-ink-soft'
      }`}
    >
      {copied ? <Check size={15} /> : <Copy size={15} />}
    </button>
  );
}

function PromptBody({ item }: { item: LibraryItem }) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <div className="flex flex-col gap-3">
      <pre className="rounded-2xl bg-ink p-4 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-white/90">
        {item.body}
      </pre>
      <Button variant="blue" className="self-start" onClick={() => copy(item.body)}>
        {copied ? (
          <>
            <Check size={16} /> Скопійовано
          </>
        ) : (
          <>
            <Copy size={16} /> Копіювати промпт
          </>
        )}
      </Button>
    </div>
  );
}
