'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Select, Textarea, toast } from '@yasno/ui';
import { XIcon } from '@yasno/icons';
import { api } from '@/lib/api-client';

const SECTION_COLORS = ['BLUE', 'GREEN', 'AMBER', 'RED', 'SUN', 'GOLD', 'MUTED', 'INK'] as const;

function useAdminForm(onSubmit: () => Promise<void>) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await onSubmit();
      toast.success('Збережено');
      setOpen(false);
      router.refresh();
    } catch {
      toast.error('Не вдалося зберегти');
    } finally {
      setPending(false);
    }
  }

  return { open, setOpen, pending, submit };
}

export function AddCourseForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const { course } = await api.post<{ course: { id: string } }>('/api/admin/courses', {
        slug,
        title,
        description,
      });
      toast.success('Курс створено');
      router.push(`/admin/content/${course.id}`);
    } catch {
      toast.error('Не вдалося створити курс — перевірте, що slug унікальний');
      setPending(false);
    }
  }

  if (!open) {
    return (
      <Button variant="blue" onClick={() => setOpen(true)}>
        + Новий курс
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-[22px] bg-paper-2 p-5">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Новий курс</p>
        <button type="button" onClick={() => setOpen(false)} aria-label="Скасувати">
          <XIcon size={16} />
        </button>
      </div>
      <Input placeholder="slug (напр. shi-dlya-mistsevoho-samovryaduvannya)" value={slug} onChange={(e) => setSlug(e.target.value)} required />
      <Input placeholder="Назва курсу" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <Textarea placeholder="Опис курсу" value={description} onChange={(e) => setDescription(e.target.value)} required />
      <Button type="submit" variant="blue" disabled={pending}>
        {pending ? 'Створюємо…' : 'Створити курс'}
      </Button>
    </form>
  );
}

export function AddSectionForm({ courseId, nextOrder }: { courseId: string; nextOrder: number }) {
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<(typeof SECTION_COLORS)[number]>('BLUE');
  const { open, setOpen, pending, submit } = useAdminForm(() =>
    api.post('/api/admin/sections', { courseId, slug, title, description, order: nextOrder, color }),
  );

  if (!open) {
    return (
      <Button variant="ghost" onClick={() => setOpen(true)}>
        + Новий розділ
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-[22px] bg-paper-2 p-5">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Новий розділ</p>
        <button type="button" onClick={() => setOpen(false)} aria-label="Скасувати">
          <XIcon size={16} />
        </button>
      </div>
      <Input placeholder="slug (напр. dokumenty-i-teksty)" value={slug} onChange={(e) => setSlug(e.target.value)} required />
      <Input placeholder="Назва розділу" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <Textarea placeholder="Опис" value={description} onChange={(e) => setDescription(e.target.value)} required />
      <Select value={color} onChange={(e) => setColor(e.target.value as typeof color)}>
        {SECTION_COLORS.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>
      <Button type="submit" variant="blue" disabled={pending}>
        {pending ? 'Зберігаємо…' : 'Створити розділ'}
      </Button>
    </form>
  );
}

export function AddModuleForm({ sectionId, nextOrder }: { sectionId: string; nextOrder: number }) {
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [minutes, setMinutes] = useState(30);
  const [isKey, setIsKey] = useState(false);
  const [passScore, setPassScore] = useState(75);
  const { open, setOpen, pending, submit } = useAdminForm(() =>
    api.post('/api/admin/modules', { sectionId, slug, title, description, order: nextOrder, minutes, isKey, passScore }),
  );

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        + Новий модуль
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-[22px] bg-surface p-5">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Новий модуль</p>
        <button type="button" onClick={() => setOpen(false)} aria-label="Скасувати">
          <XIcon size={16} />
        </button>
      </div>
      <Input placeholder="slug" value={slug} onChange={(e) => setSlug(e.target.value)} required />
      <Input placeholder="Назва модуля" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <Textarea placeholder="Опис" value={description} onChange={(e) => setDescription(e.target.value)} required />
      <div className="flex gap-3">
        <Input
          type="number"
          placeholder="Хвилини"
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          required
        />
        <Input
          type="number"
          placeholder="Прохідний бал %"
          value={passScore}
          onChange={(e) => setPassScore(Number(e.target.value))}
          required
        />
      </div>
      <label className="flex items-center gap-2 pl-2 text-sm font-semibold">
        <input type="checkbox" checked={isKey} onChange={(e) => setIsKey(e.target.checked)} /> Ключовий модуль
        (вищий прохідний бал)
      </label>
      <Button type="submit" variant="blue" disabled={pending}>
        {pending ? 'Зберігаємо…' : 'Створити модуль'}
      </Button>
    </form>
  );
}

export function AddLessonForm({ moduleId, nextOrder }: { moduleId: string; nextOrder: number }) {
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState(10);
  const [kind, setKind] = useState<'LESSON' | 'EXERCISE'>('LESSON');
  const { open, setOpen, pending, submit } = useAdminForm(() =>
    api.post('/api/admin/lessons', {
      moduleId,
      slug,
      title,
      minutes,
      order: nextOrder,
      kind,
      blocks: [{ type: 'text', html: `<p>${title}</p>` }],
    }),
  );

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        + Новий урок
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Новий урок</p>
        <button type="button" onClick={() => setOpen(false)} aria-label="Скасувати">
          <XIcon size={16} />
        </button>
      </div>
      <Input placeholder="slug" value={slug} onChange={(e) => setSlug(e.target.value)} required />
      <Input placeholder="Назва уроку" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <div className="flex gap-3">
        <Input
          type="number"
          placeholder="Хвилини"
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          required
        />
        <Select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
          <option value="LESSON">Урок</option>
          <option value="EXERCISE">Вправа</option>
        </Select>
      </div>
      <Button type="submit" variant="blue" size="sm" disabled={pending}>
        {pending ? 'Зберігаємо…' : 'Створити (текст редагується далі)'}
      </Button>
    </form>
  );
}

export function DeleteEntityButton({
  kind,
  id,
  label,
}: {
  kind: 'sections' | 'modules' | 'lessons';
  id: string;
  label: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onDelete() {
    if (!confirm(`${label}? Це незворотно.`)) return;
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
    <button
      type="button"
      onClick={onDelete}
      disabled={pending}
      className="rounded-full px-3 py-1.5 text-xs font-bold text-red-deep transition-colors hover:bg-red-tint disabled:opacity-50"
    >
      {label}
    </button>
  );
}
