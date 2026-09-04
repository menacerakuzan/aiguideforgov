'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Mail, XIcon } from '@proai/icons';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
  useCopyToClipboard,
} from '@proai/ui';
import {
  PASSWORD_RESET_STATUS_LABELS,
  type HandlePasswordResetResponse,
  type PasswordResetRequestRow,
} from '@proai/types';
import { api } from '@/lib/api-client';

/**
 * Черга заявок на відновлення пароля.
 *
 * Скидання повертає новий пароль РІВНО ОДИН РАЗ — у базі лишається лише хеш.
 * Тому діалог із паролем не можна відкрити повторно: якщо адміністратор його
 * загубив, треба скидати заново. Це навмисно: збережений відкритим тимчасовий
 * пароль небезпечніший за незручність повторного скидання.
 */
export function PasswordResetQueue({ requests }: { requests: PasswordResetRequestRow[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ email: string; password: string } | null>(null);

  const pending = requests.filter((r) => r.status === 'PENDING');

  async function handle(row: PasswordResetRequestRow, action: 'RESET' | 'DISMISS') {
    setPendingId(row.id);
    try {
      const { password } = await api.post<HandlePasswordResetResponse>('/api/admin/password-reset', {
        requestId: row.id,
        action,
      });

      if (password) setIssued({ email: row.email, password });
      else toast.success('Заявку закрито');

      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не вдалося опрацювати заявку');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-2">
        <h2 className="text-lg font-bold">Заявки на відновлення пароля</h2>
        {pending.length > 0 && (
          <Badge color="amber">
            {pending.length} у черзі
          </Badge>
        )}
      </div>

      {requests.length === 0 ? (
        <EmptyState icon={<Mail size={22} />} title="Заявок немає" description="Тут зʼявляться звернення зі сторінки «Забули пароль»." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Пошта</TableHead>
              <TableHead>Подано</TableHead>
              <TableHead>Стан</TableHead>
              <TableHead>Дія</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <p className="font-semibold text-ink break-all">{row.email}</p>
                  <p className="text-xs text-ink-mute">
                    {row.accountExists ? row.accountName : 'акаунта з такою поштою немає'}
                  </p>
                </TableCell>
                <TableCell className="text-ink-soft whitespace-nowrap">
                  {new Date(row.createdAt).toLocaleString('uk-UA', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </TableCell>
                <TableCell>
                  <Badge color={row.status === 'PENDING' ? 'amber' : row.status === 'DONE' ? 'green' : 'neutral'}>
                    {PASSWORD_RESET_STATUS_LABELS[row.status]}
                  </Badge>
                  {row.handledByName && <p className="mt-1 text-xs text-ink-mute">{row.handledByName}</p>}
                </TableCell>
                <TableCell>
                  {row.status !== 'PENDING' ? (
                    <span className="text-ink-mute">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {row.accountExists && (
                        <Button
                          size="sm"
                          variant="blue"
                          disabled={pendingId === row.id}
                          onClick={() => handle(row, 'RESET')}
                        >
                          <Check size={15} /> Скинути пароль
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pendingId === row.id}
                        onClick={() => handle(row, 'DISMISS')}
                      >
                        <XIcon size={15} /> Закрити
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <IssuedPasswordDialog issued={issued} onClose={() => setIssued(null)} />
    </>
  );
}

/** Показує новий пароль один раз — далі його не знає ніхто, крім власника. */
function IssuedPasswordDialog({
  issued,
  onClose,
}: {
  issued: { email: string; password: string } | null;
  onClose: () => void;
}) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <Dialog open={!!issued} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новий пароль створено</DialogTitle>
          <DialogDescription>
            Надішліть його на {issued?.email}. Пароль показується один раз — у базі лишається лише хеш.
          </DialogDescription>
        </DialogHeader>

        <p className="rounded-2xl bg-paper-2 p-4 text-center font-mono text-xl font-bold tracking-wide select-all">
          {issued?.password}
        </p>

        <p className="text-sm text-ink-soft">
          Усі попередні сесії цього користувача завершено — увійти можна лише з новим паролем. Попросіть змінити його
          в налаштуваннях після входу.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button variant="blue" onClick={() => issued && copy(issued.password)}>
            <Copy size={16} /> {copied ? 'Скопійовано' : 'Копіювати пароль'}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Готово
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
