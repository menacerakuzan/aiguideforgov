'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { LessonBlock, LessonRevisionsResponse } from '@proai/types';
import { ArrowLeft, Check, XIcon } from '@proai/icons';
import { Button, ClayCard, Input, Label, Select, Textarea, toast } from '@proai/ui';
import { api, ApiFetchError } from '@/lib/api-client';

interface AdminLesson {
  id: string;
  moduleId: string;
  slug: string;
  title: string;
  minutes: number;
  order: number;
  kind: 'LESSON' | 'EXERCISE';
  blocks: LessonBlock[];
  updatedAt: string;
  validAsOf: string | null;
}

function emptyBlock(type: LessonBlock['type']): LessonBlock {
  if (type === 'text') return { type: 'text', html: '' };
  if (type === 'check')
    return { type: 'check', question: '', options: ['', ''], correctIndex: 0, explainCorrect: '', explainWrong: '' };
  if (type === 'pair')
    return { type: 'pair', danger: { note: '', example: '' }, safe: { note: '', example: '' } };
  if (type === 'trafficLight')
    return {
      type: 'trafficLight',
      categories: [
        { label: '', description: '', examples: [] },
        { label: '', description: '', examples: [] },
        { label: '', description: '', examples: [] },
      ],
    };
  if (type === 'video') return { type: 'video', caption: '', note: '' };
  if (type === 'image') return { type: 'image', alt: '', caption: '', note: '' };
  if (type === 'prompt') return { type: 'prompt', body: '', title: '' };
  if (type === 'file') return { type: 'file', url: '', name: '', note: '', meta: '' };
  if (type === 'sort')
    return {
      type: 'sort',
      intro: '',
      buckets: [
        { label: '', tone: 'green' },
        { label: '', tone: 'red' },
      ],
      items: [{ text: '', bucket: 0, why: '' }],
    };
  if (type === 'pick') return { type: 'pick', intro: '', options: ['', ''], cards: [{ text: '', answer: 0, why: '' }] };
  return { type: 'redact', intro: '', letterhead: '', segments: [{ text: '' }] };
}

export default function LessonEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'lesson', id],
    queryFn: () => api.get<{ lesson: AdminLesson }>(`/api/admin/lessons/${id}`),
  });

  const { data: revisionsData } = useQuery({
    queryKey: ['admin', 'lesson', id, 'revisions'],
    queryFn: () => api.get<LessonRevisionsResponse>(`/api/admin/lessons/${id}/revisions`),
  });

  const [draft, setDraft] = useState<AdminLesson | null>(null);
  const lesson = draft ?? data?.lesson ?? null;
  const [saving, setSaving] = useState(false);

  if (isLoading || !lesson) return <div className="pt-8 text-ink-soft">Завантаження…</div>;

  function update(patch: Partial<AdminLesson>) {
    setDraft({ ...lesson!, ...patch });
  }

  function updateBlock(i: number, block: LessonBlock) {
    const blocks = [...lesson!.blocks];
    blocks[i] = block;
    update({ blocks });
  }

  function addBlock(type: LessonBlock['type']) {
    update({ blocks: [...lesson!.blocks, emptyBlock(type)] });
  }

  function removeBlock(i: number) {
    update({ blocks: lesson!.blocks.filter((_, idx) => idx !== i) });
  }

  async function save() {
    setSaving(true);
    try {
      await api.patch(`/api/admin/lessons/${id}`, {
        slug: lesson!.slug,
        title: lesson!.title,
        minutes: lesson!.minutes,
        order: lesson!.order,
        kind: lesson!.kind,
        moduleId: lesson!.moduleId,
        blocks: lesson!.blocks,
        validAsOf: lesson!.validAsOf,
      });
      toast.success('Урок збережено');
      queryClient.invalidateQueries({ queryKey: ['admin', 'lesson', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'lesson', id, 'revisions'] });
    } catch (e) {
      // Причину показуємо дослівно: урок перевіряється цілим, і без номера
      // блоку автор шукав би помилку там, де щойно правив, а не там, де вона є.
      toast.error(e instanceof ApiFetchError ? `Не вдалося зберегти. ${e.message}` : 'Не вдалося зберегти');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-[820px] pt-8 pb-16">
      <div className="mb-6 flex items-center justify-between gap-4">
        <button
          onClick={() => router.push('/admin/content')}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft"
        >
          <ArrowLeft size={14} /> До контенту курсу
        </button>
        <Button variant="green" onClick={save} disabled={saving}>
          <Check size={16} /> {saving ? 'Зберігаємо…' : 'Зберегти'}
        </Button>
      </div>

      <ClayCard className="mb-6 flex flex-col gap-3">
        <Input value={lesson.title} onChange={(e) => update({ title: e.target.value })} placeholder="Назва уроку" />
        <div className="grid grid-cols-3 gap-3">
          <Input value={lesson.slug} onChange={(e) => update({ slug: e.target.value })} placeholder="slug" />
          <Input
            type="number"
            value={lesson.minutes}
            onChange={(e) => update({ minutes: Number(e.target.value) })}
            placeholder="Хвилини"
          />
          <Select value={lesson.kind} onChange={(e) => update({ kind: e.target.value as AdminLesson['kind'] })}>
            <option value="LESSON">Урок</option>
            <option value="EXERCISE">Вправа</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="validAsOf">Дата актуальності контенту</Label>
          <Input
            id="validAsOf"
            type="date"
            value={lesson.validAsOf ? lesson.validAsOf.slice(0, 10) : ''}
            onChange={(e) => update({ validAsOf: e.target.value ? new Date(e.target.value).toISOString() : null })}
            className="max-w-[220px]"
          />
          <p className="mt-1.5 pl-2 text-xs text-ink-mute">
            Останнє редагування: {new Date(lesson.updatedAt).toLocaleString('uk-UA')}
          </p>
        </div>
      </ClayCard>

      {(revisionsData?.revisions.length ?? 0) > 0 && (
        <ClayCard padding="sm" className="mb-6">
          <p className="mb-3 px-2 text-sm font-bold">Історія версій ({revisionsData!.revisions.length})</p>
          <div className="flex flex-col gap-1">
            {revisionsData!.revisions.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-ink-soft">
                <span>{new Date(r.createdAt).toLocaleString('uk-UA')}</span>
                <span className="font-semibold">{r.editedByName}</span>
              </div>
            ))}
          </div>
        </ClayCard>
      )}

      <div className="flex flex-col gap-5">
        {lesson.blocks.map((block, i) => (
          <ClayCard key={i} padding="sm" className="relative">
            <button
              onClick={() => removeBlock(i)}
              className="absolute top-3 right-3 grid h-8 w-8 place-items-center rounded-full text-ink-mute hover:bg-paper-2"
              aria-label="Видалити блок"
            >
              <XIcon size={15} />
            </button>
            <p className="mb-3 px-2 text-xs font-bold tracking-wide text-ink-mute uppercase">{block.type}</p>
            <BlockEditor block={block} onChange={(b) => updateBlock(i, b)} />
          </ClayCard>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {(['text', 'video', 'image', 'prompt', 'file', 'check', 'sort', 'pick', 'pair', 'trafficLight', 'redact'] as const).map((t) => (
          <Button key={t} variant="ghost" size="sm" onClick={() => addBlock(t)}>
            + {t}
          </Button>
        ))}
      </div>
    </div>
  );
}

function BlockEditor({ block, onChange }: { block: LessonBlock; onChange: (b: LessonBlock) => void }) {
  if (block.type === 'text') {
    return (
      <Textarea
        className="min-h-[160px] font-mono text-sm"
        value={block.html}
        onChange={(e) => onChange({ type: 'text', html: e.target.value })}
        placeholder="HTML контенту уроку"
      />
    );
  }

  if (block.type === 'video') {
    return (
      <div className="flex flex-col gap-3 px-2">
        <Input
          value={block.url ?? ''}
          onChange={(e) => onChange({ ...block, url: e.target.value || undefined })}
          placeholder="Посилання на відео — порожньо, доки ролик не знято"
        />
        <Input
          value={block.note ?? ''}
          onChange={(e) => onChange({ ...block, note: e.target.value })}
          placeholder="Що буде у відео — текст заглушки"
        />
        <Input
          value={block.caption ?? ''}
          onChange={(e) => onChange({ ...block, caption: e.target.value })}
          placeholder="Підпис під відео (необов'язково)"
        />
      </div>
    );
  }

  if (block.type === 'image') {
    return (
      <div className="flex flex-col gap-3 px-2">
        <Input
          value={block.src ?? ''}
          onChange={(e) => onChange({ ...block, src: e.target.value || undefined })}
          placeholder="Шлях до файлу, напр. /lessons/2-1/01-novyi-chat.png"
        />
        <Input
          value={block.alt}
          onChange={(e) => onChange({ ...block, alt: e.target.value })}
          placeholder="Alt-текст (обов'язково)"
        />
        <Input
          value={block.note ?? ''}
          onChange={(e) => onChange({ ...block, note: e.target.value })}
          placeholder="Що має бути на зображенні — текст заглушки"
        />
        <Input
          value={block.caption ?? ''}
          onChange={(e) => onChange({ ...block, caption: e.target.value })}
          placeholder="Підпис (необов'язково)"
        />
      </div>
    );
  }

  if (block.type === 'sort' || block.type === 'pick') {
    return (
      <p className="px-2 text-sm text-ink-soft">
        Тренажер редагується в контенті:{' '}
        <code className="font-mono text-[13px]">prisma/src/content/lessons-module-*.ts</code>. Тут
        показано лише те, що блок присутній у структурі уроку.
      </p>
    );
  }

  if (block.type === 'file') {
    return (
      <div className="flex flex-col gap-3 px-2">
        <Input
          value={block.url}
          onChange={(e) => onChange({ ...block, url: e.target.value })}
          placeholder="Шлях до файлу, напр. /lessons/2-2/zvit-3-kvartal.md"
        />
        <Input
          value={block.name}
          onChange={(e) => onChange({ ...block, name: e.target.value })}
          placeholder="Назва файлу для слухача"
        />
        <Input
          value={block.note ?? ''}
          onChange={(e) => onChange({ ...block, note: e.target.value })}
          placeholder="Навіщо цей файл (необов'язково)"
        />
        <Input
          value={block.meta ?? ''}
          onChange={(e) => onChange({ ...block, meta: e.target.value })}
          placeholder="Формат, обсяг, розмір (необов'язково)"
        />
      </div>
    );
  }

  if (block.type === 'prompt') {
    return (
      <div className="flex flex-col gap-3 px-2">
        <Input
          value={block.title ?? ''}
          onChange={(e) => onChange({ ...block, title: e.target.value })}
          placeholder="Назва промпту (необов'язково)"
        />
        <Textarea
          className="min-h-[160px] font-mono text-sm"
          value={block.body}
          onChange={(e) => onChange({ ...block, body: e.target.value })}
          placeholder="Текст промпту"
        />
        <Input
          value={block.note ?? ''}
          onChange={(e) => onChange({ ...block, note: e.target.value })}
          placeholder="Пояснення під промптом (необов'язково)"
        />
      </div>
    );
  }

  if (block.type === 'check') {
    return (
      <div className="flex flex-col gap-3 px-2">
        <Input
          value={block.question}
          onChange={(e) => onChange({ ...block, question: e.target.value })}
          placeholder="Питання мікроперевірки"
        />
        {block.options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              checked={block.correctIndex === i}
              onChange={() => onChange({ ...block, correctIndex: i })}
              aria-label={`Варіант ${i + 1} правильний`}
            />
            <Input
              value={opt}
              onChange={(e) => {
                const options = [...block.options];
                options[i] = e.target.value;
                onChange({ ...block, options });
              }}
              placeholder={`Варіант ${i + 1}`}
            />
            <button
              type="button"
              onClick={() => onChange({ ...block, options: block.options.filter((_, idx) => idx !== i) })}
              aria-label="Видалити варіант"
            >
              <XIcon size={14} />
            </button>
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange({ ...block, options: [...block.options, ''] })}
        >
          + Варіант
        </Button>
        <Textarea
          value={block.explainCorrect}
          onChange={(e) => onChange({ ...block, explainCorrect: e.target.value })}
          placeholder="Пояснення правильної відповіді"
        />
        <Textarea
          value={block.explainWrong}
          onChange={(e) => onChange({ ...block, explainWrong: e.target.value })}
          placeholder="Пояснення неправильної відповіді"
        />
      </div>
    );
  }

  if (block.type === 'pair') {
    return (
      <div className="grid gap-4 px-2 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold text-red-deep uppercase">Небезпечно</p>
          <Textarea
            value={block.danger.note}
            onChange={(e) => onChange({ ...block, danger: { ...block.danger, note: e.target.value } })}
            placeholder="Пояснення"
          />
          <Textarea
            className="font-mono text-sm"
            value={block.danger.example}
            onChange={(e) => onChange({ ...block, danger: { ...block.danger, example: e.target.value } })}
            placeholder="Приклад"
          />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold text-green-deep uppercase">Безпечно</p>
          <Textarea
            value={block.safe.note}
            onChange={(e) => onChange({ ...block, safe: { ...block.safe, note: e.target.value } })}
            placeholder="Пояснення"
          />
          <Textarea
            className="font-mono text-sm"
            value={block.safe.example}
            onChange={(e) => onChange({ ...block, safe: { ...block.safe, example: e.target.value } })}
            placeholder="Приклад"
          />
        </div>
      </div>
    );
  }

  if (block.type === 'trafficLight') {
    const tlBlock = block;
    type Category = (typeof tlBlock.categories)[number];
    function updateCategory(i: number, patch: Partial<Category>) {
      const categories = tlBlock.categories.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) as typeof tlBlock.categories;
      onChange({ ...tlBlock, categories });
    }

    return (
      <div className="grid gap-4 px-2 sm:grid-cols-3">
        {tlBlock.categories.map((cat, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Input value={cat.label} onChange={(e) => updateCategory(i, { label: e.target.value })} placeholder="Назва категорії" />
            <Textarea
              value={cat.description}
              onChange={(e) => updateCategory(i, { description: e.target.value })}
              placeholder="Опис"
            />
            <Textarea
              value={cat.examples.join('\n')}
              onChange={(e) => updateCategory(i, { examples: e.target.value.split('\n').filter(Boolean) })}
              placeholder="Приклади (по одному в рядку)"
            />
          </div>
        ))}
      </div>
    );
  }

  // redact — рідкісний і найскладніший блок; редагується як структурований JSON.
  return (
    <Textarea
      className="min-h-[200px] font-mono text-xs"
      defaultValue={JSON.stringify(block, null, 2)}
      onBlur={(e) => {
        try {
          onChange(JSON.parse(e.target.value));
        } catch {
          toast.error('Некоректний JSON');
        }
      }}
    />
  );
}
