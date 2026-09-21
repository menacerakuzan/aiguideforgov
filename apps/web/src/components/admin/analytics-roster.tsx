'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  LEARNER_STATUS_LABELS,
  ROLE_LABELS,
  type AdminLearnerRow,
  type LearnerJourneyStatus,
} from '@proai/types';
import { Award, Flame, Search } from '@proai/icons';
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Input,
  ProgressBar,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@proai/ui';

/**
 * Таблиця людей — головний екран аналітики.
 *
 * Один рядок = одна людина, і в ньому вже є відповідь на «як у неї справи»:
 * скільки уроків, скільки модулів, які бали, де саме зупинилась, чи є
 * сертифікат. Клік по рядку веде в її повну картку — таблиця навмисно не
 * намагається вмістити все.
 *
 * Сортування й фільтри тут, а не на сервері: людей на платформі сотні, не
 * мільйони, а перезавантаження сторінки заради зміни порядку колонки —
 * найшвидший спосіб зробити аналітику незручною.
 */

type SortKey =
  | 'name'
  | 'lessons'
  | 'modules'
  | 'score'
  | 'correct'
  | 'points'
  | 'activity'
  | 'registered';

const STATUS_COLOR: Record<LearnerJourneyStatus, 'neutral' | 'blue' | 'green' | 'gold'> = {
  NOT_STARTED: 'neutral',
  IN_PROGRESS: 'blue',
  MODULES_DONE: 'green',
  CERTIFIED: 'gold',
};

const MONTHS = ['січ', 'лют', 'бер', 'квіт', 'трав', 'черв', 'лип', 'серп', 'вер', 'жовт', 'лист', 'груд'];

/** 'РРРР-ММ-ДД' → '3 вер'. Без Date, щоб день не з'їхав через часовий пояс читача. */
function shortDay(stamp: string): string {
  const [, m, d] = stamp.split('-').map(Number);
  return `${d} ${MONTHS[m! - 1] ?? ''}`;
}

function dayNumber(stamp: string): number {
  const [y, m, d] = stamp.split('-').map(Number);
  return Date.UTC(y!, m! - 1, d!) / 86_400_000;
}

function sinceLabel(stamp: string | null, today: string): string {
  if (!stamp) return 'нічого не робив';
  const gap = dayNumber(today) - dayNumber(stamp);
  if (gap <= 0) return 'сьогодні';
  if (gap === 1) return 'учора';
  if (gap < 7) return `${gap} дні тому`;
  if (gap < 31) return `${Math.floor(gap / 7)} тиж. тому`;
  return shortDay(stamp);
}

function csvCell(value: string | number | null): string {
  const text = value === null ? '' : String(value);
  return /[",;\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function AnalyticsRoster({
  rows,
  today,
  organizations,
}: {
  rows: AdminLearnerRow[];
  /** Сьогодні за київським часом, 'РРРР-ММ-ДД' — прийшло з сервера. */
  today: string;
  organizations: string[];
}) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<LearnerJourneyStatus | 'ALL'>('ALL');
  const [org, setOrg] = useState('ALL');
  const [role, setRole] = useState<'ALL' | 'LEARNER' | 'ADMIN'>('LEARNER');
  const [sort, setSort] = useState<SortKey>('activity');
  const [asc, setAsc] = useState(false);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    const list = rows.filter((r) => {
      if (role !== 'ALL' && r.role !== role) return false;
      if (status !== 'ALL' && r.status !== status) return false;
      if (org !== 'ALL' && (r.organizationName ?? '') !== org) return false;
      if (!query) return true;
      return (
        r.name.toLowerCase().includes(query) ||
        r.email.toLowerCase().includes(query) ||
        (r.organizationName ?? '').toLowerCase().includes(query) ||
        (r.position ?? '').toLowerCase().includes(query)
      );
    });

    const value = (r: AdminLearnerRow): number | string => {
      switch (sort) {
        case 'name':
          return r.name.toLowerCase();
        case 'lessons':
          return r.lessonsCompleted;
        case 'modules':
          return r.modulesCompleted;
        case 'score':
          return r.averageQuizScore ?? -1;
        case 'correct':
          return r.correctAnswersPct ?? -1;
        case 'points':
          return r.points;
        case 'registered':
          return r.registeredAt;
        case 'activity':
        default:
          return r.lastActivityAt ?? '';
      }
    };

    return list.sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      const cmp = typeof va === 'string' ? va.localeCompare(String(vb)) : (va as number) - (vb as number);
      return asc ? cmp : -cmp;
    });
  }, [rows, q, status, org, role, sort, asc]);

  function toggleSort(key: SortKey) {
    if (key === sort) {
      setAsc((v) => !v);
      return;
    }
    setSort(key);
    // Імена читають від А, числа — від найбільшого: саме так їх і шукають очима.
    setAsc(key === 'name');
  }

  function exportCsv() {
    const header = [
      'Ім’я',
      'Пошта',
      'Роль',
      'Організація',
      'Посада',
      'Статус',
      'Уроків пройдено',
      'Уроків усього',
      'Модулів завершено',
      'Модулів усього',
      'Тестів складено',
      'Спроб тестів',
      'Середній бал',
      'Правильних відповідей, %',
      'Балів',
      'Серія',
      'Днів навчання',
      'Поточний модуль',
      'Поточний урок',
      'Сертифікат',
      'Бал сертифіката',
      'Зареєстрований',
      'Остання активність',
    ];

    const lines = filtered.map((r) =>
      [
        r.name,
        r.email,
        ROLE_LABELS[r.role],
        r.organizationName,
        r.position,
        LEARNER_STATUS_LABELS[r.status],
        r.lessonsCompleted,
        r.lessonsTotal,
        r.modulesCompleted,
        r.modulesTotal,
        r.quizzesPassed,
        r.quizAttempts,
        r.averageQuizScore,
        r.correctAnswersPct,
        r.points,
        r.streak,
        r.activeDays,
        r.currentModuleTitle,
        r.currentLessonTitle,
        r.certificate && !r.certificate.revoked ? r.certificate.code : '',
        r.certificate?.score ?? null,
        r.registeredAt.slice(0, 10),
        r.lastActivityAt,
      ]
        .map(csvCell)
        .join(';'),
    );

    // BOM — щоб Excel не прочитав кирилицю як кракозябри.
    const blob = new Blob(['﻿' + [header.join(';'), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3 px-2">
        <div className="relative min-w-[240px] flex-1">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-ink-mute" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ім’я, пошта, організація, посада…"
            className="!py-3 !pl-11"
          />
        </div>

        <Select
          value={role}
          onChange={(e) => setRole(e.target.value as typeof role)}
          aria-label="Роль"
          className="!w-auto !py-3 !pr-10 !pl-5 text-sm"
        >
          <option value="LEARNER">Слухачі</option>
          <option value="ADMIN">Адміністратори</option>
          <option value="ALL">Усі ролі</option>
        </Select>

        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          aria-label="Стан навчання"
          className="!w-auto !py-3 !pr-10 !pl-5 text-sm"
        >
          <option value="ALL">Будь-який стан</option>
          {(Object.keys(LEARNER_STATUS_LABELS) as LearnerJourneyStatus[]).map((s) => (
            <option key={s} value={s}>
              {LEARNER_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>

        {organizations.length > 0 && (
          <Select
            value={org}
            onChange={(e) => setOrg(e.target.value)}
            aria-label="Організація"
            className="!w-auto !py-3 !pr-10 !pl-5 text-sm"
          >
            <option value="ALL">Усі організації</option>
            {organizations.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
        )}

        <Button variant="ghost" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
          Вивантажити CSV
        </Button>
      </div>

      <p className="mb-3 px-2 text-[13px] text-ink-soft">
        Показано {filtered.length} із {rows.length}. Клік по рядку відкриває повну картку людини.
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={22} />}
          title="Нікого не знайдено"
          description="Спробуйте змінити пошук або зняти фільтри."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label="Людина" sortKey="name" sort={sort} asc={asc} onSort={toggleSort} />
              <TableHead>Стан</TableHead>
              <SortableHead label="Уроки" sortKey="lessons" sort={sort} asc={asc} onSort={toggleSort} />
              <SortableHead label="Модулі" sortKey="modules" sort={sort} asc={asc} onSort={toggleSort} />
              <SortableHead label="Тести" sortKey="score" sort={sort} asc={asc} onSort={toggleSort} />
              <SortableHead label="Правильних" sortKey="correct" sort={sort} asc={asc} onSort={toggleSort} />
              <TableHead>Зупинився на</TableHead>
              <TableHead>Сертифікат</TableHead>
              <SortableHead label="Бали" sortKey="points" sort={sort} asc={asc} onSort={toggleSort} />
              <SortableHead label="Активність" sortKey="activity" sort={sort} asc={asc} onSort={toggleSort} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id} className="relative cursor-pointer">
                <TableCell>
                  <Link
                    href={`/admin/analytics/user/${r.id}`}
                    className="flex items-center gap-3 after:absolute after:inset-0 after:content-['']"
                  >
                    <Avatar name={r.name} size="sm" />
                    <span className="min-w-0">
                      <span className="block font-semibold text-ink">{r.name}</span>
                      <span className="block text-xs text-ink-mute">{r.email}</span>
                      {(r.organizationName || r.position) && (
                        <span className="block text-xs text-ink-mute">
                          {[r.organizationName, r.position].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </span>
                  </Link>
                </TableCell>

                <TableCell>
                  <Badge color={STATUS_COLOR[r.status]}>{LEARNER_STATUS_LABELS[r.status]}</Badge>
                </TableCell>

                <TableCell className="min-w-[150px]">
                  <ProgressBar
                    color={r.lessonsTotal > 0 && r.lessonsCompleted === r.lessonsTotal ? 'green' : 'blue'}
                    value={r.lessonsTotal ? (r.lessonsCompleted / r.lessonsTotal) * 100 : 0}
                    valueLabel={`${r.lessonsCompleted} / ${r.lessonsTotal}`}
                  />
                </TableCell>

                <TableCell className="whitespace-nowrap">
                  <span className="font-bold">{r.modulesCompleted}</span>
                  <span className="text-ink-mute"> / {r.modulesTotal}</span>
                </TableCell>

                <TableCell className="whitespace-nowrap">
                  <span className="font-semibold">
                    {r.quizzesPassed} / {r.quizzesTotal}
                  </span>
                  <span className="block text-xs text-ink-mute">
                    {r.averageQuizScore === null
                      ? 'спроб не було'
                      : `середній ${r.averageQuizScore}% · спроб ${r.quizAttempts}`}
                  </span>
                </TableCell>

                <TableCell className="whitespace-nowrap">
                  {r.correctAnswersPct === null ? (
                    <span className="text-ink-mute">—</span>
                  ) : (
                    <span
                      className={`font-bold ${
                        r.correctAnswersPct >= 80
                          ? 'text-green-deep'
                          : r.correctAnswersPct >= 60
                            ? 'text-amber-deep'
                            : 'text-red-deep'
                      }`}
                    >
                      {r.correctAnswersPct}%
                    </span>
                  )}
                </TableCell>

                <TableCell className="max-w-[220px]">
                  {r.currentModuleTitle ? (
                    <>
                      <span className="block text-[13px] font-semibold">{r.currentLessonTitle}</span>
                      <span className="block text-xs text-ink-mute">{r.currentModuleTitle}</span>
                    </>
                  ) : (
                    <span className="text-[13px] font-semibold text-green-deep">увесь курс пройдено</span>
                  )}
                </TableCell>

                <TableCell className="whitespace-nowrap">
                  {r.certificate && !r.certificate.revoked ? (
                    <Badge color="gold">
                      <Award size={13} /> {r.certificate.score}%
                    </Badge>
                  ) : r.certificate?.revoked ? (
                    <Badge color="red">відкликано</Badge>
                  ) : r.examPassed ? (
                    <span className="text-xs text-ink-mute">іспит складено</span>
                  ) : (
                    <span className="text-ink-mute">—</span>
                  )}
                </TableCell>

                <TableCell className="font-bold whitespace-nowrap">{r.points}</TableCell>

                <TableCell className="whitespace-nowrap">
                  <span className="text-[13px] font-semibold">{sinceLabel(r.lastActivityAt, today)}</span>
                  <span className="block text-xs text-ink-mute">
                    {r.streak > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <Flame size={11} /> серія {r.streak}
                      </span>
                    ) : (
                      `днів навчання: ${r.activeDays}`
                    )}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}

function SortableHead({
  label,
  sortKey,
  sort,
  asc,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  sort: SortKey;
  asc: boolean;
  onSort: (key: SortKey) => void;
}) {
  const active = sort === sortKey;
  return (
    <TableHead aria-sort={active ? (asc ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 uppercase transition-colors hover:text-ink ${
          active ? 'text-ink' : ''
        }`}
      >
        {label}
        <span aria-hidden className={active ? 'opacity-100' : 'opacity-25'}>
          {active && asc ? '↑' : '↓'}
        </span>
      </button>
    </TableHead>
  );
}
