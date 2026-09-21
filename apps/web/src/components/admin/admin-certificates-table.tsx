'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Award, Search } from '@proai/icons';
import {
  Badge,
  EmptyState,
  Input,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@proai/ui';
import { AdminRevokeButton } from '@/components/admin/admin-revoke-button';

export interface AdminCertificateRowData {
  id: string;
  code: string;
  userId: string;
  holderName: string;
  holderEmail: string;
  holderPosition: string | null;
  organizationName: string | null;
  courseTitle: string;
  score: number;
  withHonors: boolean;
  issuedAt: string;
  validUntil: string;
  revoked: boolean;
}

type Status = 'VALID' | 'EXPIRED' | 'REVOKED';

function statusOf(cert: AdminCertificateRowData, now: number): Status {
  if (cert.revoked) return 'REVOKED';
  return new Date(cert.validUntil).getTime() < now ? 'EXPIRED' : 'VALID';
}

const STATUS_LABEL: Record<Status, string> = {
  VALID: 'Чинний',
  EXPIRED: 'Прострочений',
  REVOKED: 'Відкликано',
};

const STATUS_COLOR: Record<Status, 'green' | 'amber' | 'red'> = {
  VALID: 'green',
  EXPIRED: 'amber',
  REVOKED: 'red',
};

/**
 * Усі сертифікати платформи. Курс — окрема колонка й окремий фільтр: коли
 * курсів кілька, «видано 40 сертифікатів» нічого не означає, поки не видно,
 * за який саме курс їх видано.
 *
 * `now` приходить із сервера: обчислення «прострочений» від часу браузера
 * розійшлося б із серверним рендером і дало б розбіжність при гідратації.
 */
export function AdminCertificatesTable({
  certificates,
  now,
}: {
  certificates: AdminCertificateRowData[];
  now: number;
}) {
  const [q, setQ] = useState('');
  const [course, setCourse] = useState('ALL');
  const [status, setStatus] = useState<Status | 'ALL'>('ALL');

  const courses = useMemo(
    () => [...new Set(certificates.map((c) => c.courseTitle))].sort((a, b) => a.localeCompare(b)),
    [certificates],
  );

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return certificates.filter((c) => {
      if (course !== 'ALL' && c.courseTitle !== course) return false;
      if (status !== 'ALL' && statusOf(c, now) !== status) return false;
      if (!query) return true;
      return (
        c.holderName.toLowerCase().includes(query) ||
        c.holderEmail.toLowerCase().includes(query) ||
        c.code.toLowerCase().includes(query) ||
        c.courseTitle.toLowerCase().includes(query) ||
        (c.organizationName ?? '').toLowerCase().includes(query)
      );
    });
  }, [certificates, q, course, status, now]);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3 px-2">
        <div className="relative min-w-[240px] flex-1">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-ink-mute" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ім’я, пошта, код, курс, організація…"
            className="!py-3 !pl-11"
          />
        </div>

        {courses.length > 1 && (
          <Select
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            aria-label="Курс"
            className="!w-auto !py-3 !pr-10 !pl-5 text-sm"
          >
            <option value="ALL">Усі курси</option>
            {courses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        )}

        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          aria-label="Стан сертифіката"
          className="!w-auto !py-3 !pr-10 !pl-5 text-sm"
        >
          <option value="ALL">Будь-який стан</option>
          <option value="VALID">Чинні</option>
          <option value="EXPIRED">Прострочені</option>
          <option value="REVOKED">Відкликані</option>
        </Select>
      </div>

      <p className="mb-3 px-2 text-[13px] text-ink-soft">
        Показано {filtered.length} із {certificates.length}.
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Award size={22} />}
          title="Нічого не знайдено"
          description="Спробуйте змінити пошук або зняти фільтри."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Отримувач</TableHead>
              <TableHead>Курс</TableHead>
              <TableHead>Код</TableHead>
              <TableHead>Бал</TableHead>
              <TableHead>Дійсний</TableHead>
              <TableHead>Стан</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => {
              const state = statusOf(c, now);
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/admin/analytics/user/${c.userId}`} className="block hover:underline">
                      <p className="font-semibold text-ink">{c.holderName}</p>
                      <p className="text-xs text-ink-mute">{c.holderEmail}</p>
                      {c.organizationName && <p className="text-xs text-ink-mute">{c.organizationName}</p>}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[240px]">
                    <p className="font-semibold">{c.courseTitle}</p>
                  </TableCell>
                  <TableCell className="font-mono text-xs whitespace-nowrap">{c.code}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="font-bold">{c.score}%</span>
                    {c.withHonors && <span className="block text-xs text-gold-deep">з відзнакою</span>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-ink-soft">
                    <span className="block text-[13px]">
                      з {new Date(c.issuedAt).toLocaleDateString('uk-UA')}
                    </span>
                    <span className="block text-xs text-ink-mute">
                      до {new Date(c.validUntil).toLocaleDateString('uk-UA')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge color={STATUS_COLOR[state]}>{STATUS_LABEL[state]}</Badge>
                  </TableCell>
                  <TableCell>{!c.revoked && <AdminRevokeButton certificateId={c.id} />}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </>
  );
}
