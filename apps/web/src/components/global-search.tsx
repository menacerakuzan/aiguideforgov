'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Book, Search, Spark } from '@proai/icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, Input } from '@proai/ui';
import type { SearchResponse, SearchResultItem } from '@proai/types';
import { api } from '@/lib/api-client';

const KIND_ICON: Record<SearchResultItem['kind'], React.ReactNode> = {
  lesson: <Book size={15} />,
  prompt: <Spark size={15} />,
  resource: <Book size={15} />,
};

const KIND_LABEL: Record<SearchResultItem['kind'], string> = {
  lesson: 'Урок',
  prompt: 'Промпт',
  resource: 'Ресурс',
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const { data, isFetching } = useQuery({
    enabled: debounced.trim().length >= 2,
    queryKey: ['search', debounced],
    queryFn: () => api.get<SearchResponse>(`/api/search?q=${encodeURIComponent(debounced)}`),
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Пошук"
        className="grid h-11 w-11 place-items-center rounded-full text-ink-soft transition-colors hover:bg-paper-2"
      >
        <Search size={19} />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[18%] max-h-[70vh] w-[min(560px,calc(100vw-2rem))] translate-y-0 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Пошук</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Урок, промпт, чек-лист…"
            className="mb-4"
          />
          {debounced.trim().length < 2 && <p className="px-2 text-sm text-ink-soft">Введіть щонайменше 2 символи.</p>}
          {isFetching && <p className="px-2 text-sm text-ink-soft">Шукаємо…</p>}
          {!isFetching && debounced.trim().length >= 2 && data?.results.length === 0 && (
            <p className="px-2 text-sm text-ink-soft">Нічого не знайдено.</p>
          )}
          <div className="flex flex-col gap-1">
            {(data?.results ?? []).map((r) => (
              <Link
                key={`${r.kind}-${r.id}`}
                href={r.href}
                onClick={() => setOpen(false)}
                className="flex items-start gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-paper-2"
              >
                <span className="mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-full bg-blue-tint text-blue-deep">
                  {KIND_ICON[r.kind]}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{r.title}</span>
                  <span className="block truncate text-xs text-ink-mute">
                    {KIND_LABEL[r.kind]} · {r.snippet}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
