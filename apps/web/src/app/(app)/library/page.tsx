'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Book, Check, Copy, Search, Spark } from '@yasno/icons';
import {
  ClayCard,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  EmptyState,
  FilterTabs,
  Input,
  Orb,
  useCopyToClipboard,
} from '@yasno/ui';
import type { LibraryResponse, Prompt, Resource, ResourceKind } from '@yasno/types';
import { RESOURCE_KIND_LABELS } from '@yasno/types';
import { api } from '@/lib/api-client';

type Filter = 'all' | 'prompts' | ResourceKind;

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'Усі' },
  { value: 'prompts', label: 'Промпти' },
  { value: 'CHECKLIST', label: RESOURCE_KIND_LABELS.CHECKLIST },
  { value: 'RULE', label: RESOURCE_KIND_LABELS.RULE },
  { value: 'TABLE', label: RESOURCE_KIND_LABELS.TABLE },
  { value: 'TEMPLATE', label: RESOURCE_KIND_LABELS.TEMPLATE },
  { value: 'REGULATION', label: RESOURCE_KIND_LABELS.REGULATION },
  { value: 'GUIDE', label: RESOURCE_KIND_LABELS.GUIDE },
];

export default function LibraryPage() {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [openResource, setOpenResource] = useState<Resource | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['library', q],
    queryFn: () => api.get<LibraryResponse>(`/api/library${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  });

  const prompts = filter === 'all' || filter === 'prompts' ? (data?.prompts ?? []) : [];
  const resources = useMemo(
    () => (data?.resources ?? []).filter((r) => filter === 'all' || filter === 'prompts' || r.kind === filter),
    [data, filter],
  );
  const showPrompts = filter === 'all' || filter === 'prompts';

  const empty = !isLoading && prompts.length === 0 && resources.length === 0;

  return (
    <div className="pt-8 pb-16">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold">Бібліотека</h1>
        <p className="mt-2 text-ink-soft">Промпти, чек-листи, правила й таблиці — усе в одному місці.</p>
      </header>

      <div className="mb-5">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Пошук у бібліотеці…"
          className="max-w-[420px]"
        />
      </div>

      <FilterTabs label="Тип матеріалу" options={FILTERS} value={filter} onChange={setFilter} className="mb-7" />

      {isLoading ? (
        <p className="text-ink-soft">Завантаження…</p>
      ) : empty ? (
        <ClayCard>
          <EmptyState icon={<Search size={22} />} title="Нічого не знайдено" description="Спробуйте інший запит або фільтр." />
        </ClayCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {showPrompts && prompts.map((p) => <PromptCard key={p.id} prompt={p} />)}
          {resources.map((r) => (
            <ResourceCard key={r.id} resource={r} onOpen={() => setOpenResource(r)} />
          ))}
        </div>
      )}

      <Dialog open={!!openResource} onOpenChange={(open) => !open && setOpenResource(null)}>
        <DialogContent className="max-h-[85vh] w-[min(720px,calc(100vw-2rem))] overflow-y-auto">
          {openResource && (
            <>
              <DialogHeader>
                <DialogTitle>{openResource.title}</DialogTitle>
              </DialogHeader>
              <div className="prose-lesson text-[15px] leading-[1.7]" dangerouslySetInnerHTML={{ __html: openResource.body }} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PromptCard({ prompt }: { prompt: Prompt }) {
  const { copied, copy } = useCopyToClipboard();
  const queryClient = useQueryClient();

  return (
    <ClayCard className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Orb size="sm" color="blue">
          <Spark size={16} />
        </Orb>
        <span className="rounded-full bg-blue-tint px-2.5 py-0.5 text-xs font-bold text-blue-deep">Промпт</span>
      </div>
      <h3 className="font-display text-[17px] font-bold">{prompt.title}</h3>
      <p className="text-sm text-ink-soft">{prompt.useCase}</p>
      <pre className="max-h-32 overflow-hidden rounded-2xl bg-ink p-3.5 font-mono text-[12.5px] whitespace-pre-wrap text-white/90">
        {prompt.body}
      </pre>
      <div className="mt-auto flex items-center justify-between">
        <span className="text-xs font-semibold text-ink-mute">Скопійовано {prompt.copyCount} разів</span>
        <button
          type="button"
          aria-label="Скопіювати промпт"
          onClick={async () => {
            await copy(prompt.body);
            void api.post('/api/prompts/copied', { promptId: prompt.id });
            queryClient.invalidateQueries({ queryKey: ['library'] });
          }}
          className={`grid h-9 w-9 flex-none place-items-center rounded-full border-2 border-ink bg-surface ${copied ? 'text-green' : 'text-ink-soft'}`}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </button>
      </div>
    </ClayCard>
  );
}

function ResourceCard({ resource, onOpen }: { resource: Resource; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="text-left">
      <ClayCard className="flex h-full flex-col gap-3">
        <div className="flex items-center gap-2">
          <Orb size="sm" color="green">
            <Book size={16} />
          </Orb>
          <span className="rounded-full bg-green-tint px-2.5 py-0.5 text-xs font-bold text-green-deep">
            {RESOURCE_KIND_LABELS[resource.kind]}
          </span>
        </div>
        <h3 className="font-display text-[17px] font-bold">{resource.title}</h3>
        <p className="text-sm text-ink-soft">{resource.summary}</p>
        <p className="mt-auto text-xs font-semibold text-ink-mute">Версія {resource.version}</p>
      </ClayCard>
    </button>
  );
}
