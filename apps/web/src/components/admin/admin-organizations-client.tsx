'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, ClayCard, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input, Textarea, toast } from '@proai/ui';
import { Upload, Users, XIcon } from '@proai/icons';
import type { ImportUsersResponse } from '@proai/types';
import { api } from '@/lib/api-client';

interface OrgRow {
  id: string;
  name: string;
  kind: string;
  userCount: number;
}

export function AdminOrganizationsClient({ organizations }: { organizations: OrgRow[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState('');
  const [pending, setPending] = useState(false);
  const [importOrg, setImportOrg] = useState<OrgRow | null>(null);

  async function create() {
    setPending(true);
    try {
      await api.post('/api/admin/organizations', { name, kind });
      toast.success('Організацію створено');
      setCreating(false);
      setName('');
      setKind('');
      router.refresh();
    } catch {
      toast.error('Не вдалося створити — перевірте поля');
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string, userCount: number) {
    if (userCount > 0) {
      toast.error('Спочатку заберіть усіх користувачів із цієї організації');
      return;
    }
    if (!confirm('Видалити організацію?')) return;
    try {
      await api.delete(`/api/admin/organizations/${id}`);
      toast.success('Видалено');
      router.refresh();
    } catch {
      toast.error('Не вдалося видалити');
    }
  }

  return (
    <div className="pt-8 pb-16">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold">Організації</h1>
        <p className="mt-1 text-ink-soft">Органи влади й установи — призначайте користувачів у розділі «Користувачі».</p>
      </header>

      {!creating ? (
        <Button variant="blue" className="mb-6" onClick={() => setCreating(true)}>
          + Нова організація
        </Button>
      ) : (
        <ClayCard className="mb-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold">Нова організація</p>
            <button type="button" onClick={() => setCreating(false)} aria-label="Скасувати">
              <XIcon size={16} />
            </button>
          </div>
          <Input placeholder="Назва (напр. Львівська обласна державна адміністрація)" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Тип (напр. Обласна державна адміністрація)" value={kind} onChange={(e) => setKind(e.target.value)} />
          <Button variant="blue" disabled={pending} onClick={create}>
            {pending ? 'Створюємо…' : 'Створити'}
          </Button>
        </ClayCard>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {organizations.map((o) => (
          <ClayCard key={o.id} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 flex-none place-items-center rounded-full border-2 border-ink bg-blue-tint text-blue-deep">
                <Users size={16} />
              </span>
              <div>
                <p className="font-display font-bold">{o.name}</p>
                <p className="text-xs text-ink-mute">{o.kind}</p>
              </div>
            </div>
            <p className="text-sm text-ink-soft">{o.userCount} користувачів</p>
            <div className="mt-auto flex items-center justify-between">
              <button className="flex items-center gap-1.5 text-xs font-bold text-blue-deep" onClick={() => setImportOrg(o)}>
                <Upload size={13} /> Імпорт CSV
              </button>
              <button className="text-xs font-bold text-red-deep" onClick={() => remove(o.id, o.userCount)}>
                Видалити
              </button>
            </div>
          </ClayCard>
        ))}
      </div>

      <ImportDialog organization={importOrg} onClose={() => setImportOrg(null)} />
    </div>
  );
}

function ImportDialog({ organization, onClose }: { organization: OrgRow | null; onClose: () => void }) {
  const router = useRouter();
  const [csv, setCsv] = useState('');
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ImportUsersResponse | null>(null);

  async function submit() {
    if (!organization) return;
    setPending(true);
    try {
      const res = await api.post<ImportUsersResponse>('/api/admin/users/import', {
        organizationId: organization.id,
        csv,
      });
      setResult(res);
      toast.success(`Створено ${res.created}, пропущено ${res.skipped}`);
      router.refresh();
    } catch {
      toast.error('Не вдалося імпортувати — перевірте формат CSV');
    } finally {
      setPending(false);
    }
  }

  function handleClose() {
    setCsv('');
    setResult(null);
    onClose();
  }

  return (
    <Dialog open={!!organization} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-h-[80vh] w-[min(560px,calc(100vw-2rem))] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Імпорт користувачів — {organization?.name}</DialogTitle>
          <DialogDescription>
            По одному рядку на людину: <code>ім&apos;я,пошта,посада</code>. Посада необов&apos;язкова. Пароль
            згенерується автоматично й надійде на пошту (у режимі розробки — у консоль сервера).
          </DialogDescription>
        </DialogHeader>
        <Textarea
          className="min-h-[180px] font-mono text-sm"
          placeholder={'Оксана Коваленко,o.kovalenko@example.gov.ua,Головний спеціаліст\nІван Петренко,i.petrenko@example.gov.ua'}
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
        />
        <Button variant="blue" className="mt-4" disabled={pending || !csv.trim()} onClick={submit}>
          {pending ? 'Імпортуємо…' : 'Імпортувати'}
        </Button>

        {result && (
          <div className="mt-5 flex flex-col gap-1.5">
            {result.rows.map((r, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl bg-paper-2 px-3 py-2 text-sm">
                <span>{r.email}</span>
                <span
                  className={
                    r.status === 'created'
                      ? 'font-bold text-green-deep'
                      : r.status === 'skipped_exists'
                        ? 'font-bold text-amber-deep'
                        : 'font-bold text-red-deep'
                  }
                >
                  {r.status === 'created' ? 'Створено' : r.status === 'skipped_exists' ? 'Вже існує' : r.message ?? 'Помилка'}
                </span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
