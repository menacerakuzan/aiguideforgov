'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, ClayCard, FilterTabs, Input, Select, Textarea, toast } from '@yasno/ui';
import { XIcon } from '@yasno/icons';
import type { Prompt, PromptCategory, Resource, ResourceKind } from '@yasno/types';
import { RESOURCE_KIND_LABELS } from '@yasno/types';
import { api } from '@/lib/api-client';

const PROMPT_CATEGORIES: PromptCategory[] = ['CITIZENS', 'LETTERS', 'MEETINGS', 'ANALYTICS', 'INTERNAL'];
const RESOURCE_KINDS: ResourceKind[] = ['GUIDE', 'CHECKLIST', 'TEMPLATE', 'REGULATION', 'TABLE', 'RULE'];

export function AdminLibraryClient({ prompts, resources }: { prompts: Prompt[]; resources: Resource[] }) {
  const [tab, setTab] = useState<'prompts' | 'resources'>('prompts');

  return (
    <div className="pt-8 pb-16">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold">Бібліотека</h1>
        <p className="mt-1 text-ink-soft">Промпти й ресурси (чек-листи, правила, таблиці, шаблони, регламенти).</p>
      </header>

      <FilterTabs
        label="Тип"
        className="mb-6"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'prompts', label: `Промпти (${prompts.length})` },
          { value: 'resources', label: `Ресурси (${resources.length})` },
        ]}
      />

      {tab === 'prompts' ? <PromptsAdmin prompts={prompts} /> : <ResourcesAdmin resources={resources} />}
    </div>
  );
}

function PromptsAdmin({ prompts }: { prompts: Prompt[] }) {
  const [editing, setEditing] = useState<Prompt | 'new' | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <Button variant="blue" onClick={() => setEditing('new')} className="self-start">
        + Новий промпт
      </Button>

      {editing && <PromptForm prompt={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {prompts.map((p) => (
          <ClayCard key={p.id} className="flex flex-col gap-2">
            <p className="font-display font-bold">{p.title}</p>
            <p className="text-sm text-ink-soft">{p.useCase}</p>
            <div className="mt-auto flex items-center justify-between">
              <span className="text-xs font-bold text-ink-mute">{p.category}</span>
              <div className="flex gap-2">
                <button className="text-xs font-bold text-blue-deep" onClick={() => setEditing(p)}>
                  Редагувати
                </button>
                <DeleteButton kind="prompts" id={p.id} />
              </div>
            </div>
          </ClayCard>
        ))}
      </div>
    </div>
  );
}

function PromptForm({ prompt, onClose }: { prompt: Prompt | null; onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState(prompt?.title ?? '');
  const [useCase, setUseCase] = useState(prompt?.useCase ?? '');
  const [body, setBody] = useState(prompt?.body ?? '');
  const [category, setCategory] = useState<PromptCategory>(prompt?.category ?? 'CITIZENS');
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    try {
      if (prompt) {
        await api.patch(`/api/admin/prompts/${prompt.id}`, { title, useCase, body, category });
      } else {
        await api.post('/api/admin/prompts', { title, useCase, body, category });
      }
      toast.success('Збережено');
      router.refresh();
      onClose();
    } catch {
      toast.error('Не вдалося зберегти');
    } finally {
      setPending(false);
    }
  }

  return (
    <ClayCard className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold">{prompt ? 'Редагування промпту' : 'Новий промпт'}</p>
        <button type="button" onClick={onClose} aria-label="Закрити">
          <XIcon size={16} />
        </button>
      </div>
      <Input placeholder="Назва" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Input placeholder="Для чого (useCase)" value={useCase} onChange={(e) => setUseCase(e.target.value)} />
      <Select value={category} onChange={(e) => setCategory(e.target.value as PromptCategory)}>
        {PROMPT_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>
      <Textarea className="min-h-[140px] font-mono text-sm" placeholder="Текст промпту" value={body} onChange={(e) => setBody(e.target.value)} />
      <Button variant="blue" disabled={pending} onClick={save}>
        {pending ? 'Зберігаємо…' : 'Зберегти'}
      </Button>
    </ClayCard>
  );
}

function ResourcesAdmin({ resources }: { resources: Resource[] }) {
  const [editing, setEditing] = useState<Resource | 'new' | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <Button variant="blue" onClick={() => setEditing('new')} className="self-start">
        + Новий ресурс
      </Button>

      {editing && <ResourceForm resource={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {resources.map((r) => (
          <ClayCard key={r.id} className="flex flex-col gap-2">
            <p className="font-display font-bold">{r.title}</p>
            <p className="text-sm text-ink-soft">{r.summary}</p>
            <div className="mt-auto flex items-center justify-between">
              <span className="text-xs font-bold text-ink-mute">{RESOURCE_KIND_LABELS[r.kind]} · v{r.version}</span>
              <div className="flex gap-2">
                <button className="text-xs font-bold text-blue-deep" onClick={() => setEditing(r)}>
                  Редагувати
                </button>
                <DeleteButton kind="resources" id={r.id} />
              </div>
            </div>
          </ClayCard>
        ))}
      </div>
    </div>
  );
}

function ResourceForm({ resource, onClose }: { resource: Resource | null; onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState(resource?.title ?? '');
  const [summary, setSummary] = useState(resource?.summary ?? '');
  const [body, setBody] = useState(resource?.body ?? '');
  const [kind, setKind] = useState<ResourceKind>(resource?.kind ?? 'CHECKLIST');
  const [version, setVersion] = useState(resource?.version ?? 'v1.0');
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    try {
      if (resource) {
        await api.patch(`/api/admin/resources/${resource.id}`, { title, summary, body, kind, version });
      } else {
        await api.post('/api/admin/resources', { title, summary, body, kind, version });
      }
      toast.success('Збережено');
      router.refresh();
      onClose();
    } catch {
      toast.error('Не вдалося зберегти');
    } finally {
      setPending(false);
    }
  }

  return (
    <ClayCard className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold">{resource ? 'Редагування ресурсу' : 'Новий ресурс'}</p>
        <button type="button" onClick={onClose} aria-label="Закрити">
          <XIcon size={16} />
        </button>
      </div>
      <Input placeholder="Назва" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Input placeholder="Короткий опис" value={summary} onChange={(e) => setSummary(e.target.value)} />
      <div className="flex gap-3">
        <Select value={kind} onChange={(e) => setKind(e.target.value as ResourceKind)}>
          {RESOURCE_KINDS.map((k) => (
            <option key={k} value={k}>
              {RESOURCE_KIND_LABELS[k]}
            </option>
          ))}
        </Select>
        <Input placeholder="Версія" value={version} onChange={(e) => setVersion(e.target.value)} />
      </div>
      <Textarea
        className="min-h-[180px] font-mono text-sm"
        placeholder="HTML-вміст (можна таблиці <table>, списки <ul>/<ol>, <blockquote> — той самий рендер, що й в уроках)"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <Button variant="blue" disabled={pending} onClick={save}>
        {pending ? 'Зберігаємо…' : 'Зберегти'}
      </Button>
    </ClayCard>
  );
}

function DeleteButton({ kind, id }: { kind: 'prompts' | 'resources'; id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onDelete() {
    if (!confirm('Видалити? Це незворотно.')) return;
    setPending(true);
    try {
      await api.delete(`/api/admin/${kind}/${id}`);
      toast.success('Видалено');
      router.refresh();
    } catch {
      toast.error('Не вдалося видалити');
    } finally {
      setPending(false);
    }
  }

  return (
    <button className="text-xs font-bold text-red-deep disabled:opacity-50" disabled={pending} onClick={onDelete}>
      Видалити
    </button>
  );
}
