'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ROLES, ROLE_LABELS, type Role } from '@proai/types';
import { Award, Search } from '@proai/icons';
import { Badge, Input, ProgressBar, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, toast } from '@proai/ui';
import { api } from '@/lib/api-client';

interface Row {
  id: string;
  name: string;
  email: string;
  role: Role;
  organizationId: string | null;
  organizationName: string | null;
  progressPct: number;
  certified: boolean;
  lastActiveAt: string | null;
}

interface OrgOption {
  id: string;
  name: string;
}

export function UsersTable({ users, organizations = [] }: { users: Row[]; organizations?: OrgOption[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return users;
    return users.filter((u) => u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query));
  }, [users, q]);

  async function changeRole(userId: string, role: Role) {
    setPendingId(userId);
    try {
      await api.patch('/api/users', { userId, role });
      toast.success('Роль оновлено');
      router.refresh();
    } catch {
      toast.error('Не вдалося змінити роль');
    } finally {
      setPendingId(null);
    }
  }

  async function changeOrg(userId: string, organizationId: string) {
    setPendingId(userId);
    try {
      await api.post('/api/admin/users/assign-org', { userId, organizationId: organizationId || null });
      toast.success('Організацію оновлено');
      router.refresh();
    } catch {
      toast.error('Не вдалося оновити організацію');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <>
      <div className="relative mb-4 px-2">
        <Search size={16} className="pointer-events-none absolute top-1/2 left-6 -translate-y-1/2 text-ink-mute" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Пошук за іменем або поштою…"
          className="max-w-[320px] !pl-11"
        />
      </div>
      {filtered.length === 0 && <p className="px-2 text-sm text-ink-soft">Нікого не знайдено.</p>}
      {filtered.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Користувач</TableHead>
              <TableHead>Організація</TableHead>
              <TableHead>Прогрес курсу</TableHead>
              <TableHead>Сертифікат</TableHead>
              <TableHead>Роль</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <p className="font-semibold text-ink">{u.name}</p>
                  <p className="text-xs text-ink-mute">{u.email}</p>
                </TableCell>
                <TableCell className="text-ink-soft">
                  <Select
                    value={u.organizationId ?? ''}
                    disabled={pendingId === u.id}
                    onChange={(e) => changeOrg(u.id, e.target.value)}
                    className="!py-2 !pr-9 !pl-4 text-sm"
                  >
                    <option value="">Без організації</option>
                    {organizations.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </Select>
                </TableCell>
                <TableCell className="min-w-[140px]">
                  <ProgressBar value={u.progressPct} valueLabel={`${u.progressPct}%`} />
                </TableCell>
                <TableCell>
                  {u.certified ? (
                    <Badge color="gold">
                      <Award size={13} /> Є
                    </Badge>
                  ) : (
                    <span className="text-ink-mute">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Select
                    value={u.role}
                    disabled={pendingId === u.id}
                    onChange={(e) => changeRole(u.id, e.target.value as Role)}
                    className="!py-2 !pr-9 !pl-4 text-sm"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
