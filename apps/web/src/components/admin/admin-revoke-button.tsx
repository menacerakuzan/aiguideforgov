'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@proai/ui';
import { api } from '@/lib/api-client';

export function AdminRevokeButton({ certificateId }: { certificateId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function revoke() {
    const reason = prompt('Причина відкликання сертифіката:');
    if (!reason || reason.trim().length < 3) return;
    setPending(true);
    try {
      await api.post('/api/certificates/revoke', { certificateId, reason });
      toast.success('Сертифікат відкликано');
      router.refresh();
    } catch {
      toast.error('Не вдалося відкликати сертифікат');
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={revoke}
      disabled={pending}
      className="rounded-full px-3 py-1.5 text-xs font-bold text-red-deep transition-colors hover:bg-red-tint disabled:opacity-50"
    >
      Відкликати
    </button>
  );
}
