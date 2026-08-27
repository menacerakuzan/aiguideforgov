'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, FieldError, Input, Label, Select, toast } from '@proai/ui';
import { ApiFetchError, api } from '@/lib/api-client';

export function SettingsForm({
  initialPosition,
  initialOrganizationId,
  organizations,
}: {
  initialPosition: string;
  initialOrganizationId: string;
  organizations: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [position, setPosition] = useState(initialPosition);
  const [organizationId, setOrganizationId] = useState(initialOrganizationId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = position !== initialPosition || organizationId !== initialOrganizationId;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      // Порожні значення надсилаємо як null, а не пропускаємо: інакше
      // «прибрати орган влади» нічого не робило б — сервер не бачив би поля.
      await api.patch('/api/profile', { position: position || null, organizationId: organizationId || null });
      toast.success('Зміни збережено');
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiFetchError ? e.message : 'Не вдалося зберегти. Спробуйте ще раз.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div>
        <Label htmlFor="position">Посада</Label>
        <Input id="position" value={position} onChange={(e) => setPosition(e.target.value)} />
      </div>

      <div>
        <Label htmlFor="organizationId">Орган влади</Label>
        <Select id="organizationId" value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}>
          <option value="">Не вказано</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </Select>
        <p className="mt-1.5 pl-2 text-[13.5px] text-ink-mute">
          Імʼя та орган влади зʼявляються на сертифікаті.
        </p>
      </div>

      <FieldError>{error}</FieldError>

      <Button type="submit" variant="blue" className="self-start" disabled={!dirty || saving}>
        {saving ? 'Зберігаємо…' : 'Зберегти зміни'}
      </Button>
    </form>
  );
}
