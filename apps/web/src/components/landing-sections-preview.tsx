'use client';

import { useQuery } from '@tanstack/react-query';
import { Book, Lock } from '@proai/icons';
import { ClayCard, cn, Orb, Reveal, Skeleton } from '@proai/ui';
import type { SectionColor } from '@proai/types';
import { api } from '@/lib/api-client';

const ORB_COLOR: Record<SectionColor, 'blue' | 'green' | 'amber' | 'red' | 'sun' | 'gold' | 'muted'> = {
  BLUE: 'blue',
  GREEN: 'green',
  AMBER: 'amber',
  RED: 'red',
  SUN: 'sun',
  GOLD: 'gold',
  MUTED: 'muted',
  INK: 'muted',
};

interface SectionPreview {
  id: string;
  title: string;
  description: string;
  color: SectionColor;
  /** Картка закритого курсу: видно, що буде, але всередину ще не пускає. */
  comingSoon: boolean;
  moduleCount: number;
  lessonCount: number;
}

/** Українське узгодження числівника: 1 модуль · 3 модулі · 5 модулів. */
function plural(n: number, [one, few, many]: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} ${one}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} ${few}`;
  return `${n} ${many}`;
}

/** Розділи й курси тягнуться напряму з бази — картки завжди відповідають реальному змісту. */
export function LandingSectionsPreview() {
  const { data, isLoading } = useQuery({
    queryKey: ['stats', 'sections'],
    queryFn: () => api.get<{ sections: SectionPreview[] }>('/api/stats/sections'),
  });

  const sections = data?.sections ?? [];

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[200px] rounded-[26px]" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sections.map((section, i) => (
        <Reveal key={section.id} index={i}>
          <ClayCard
            className={cn('animate-floaty flex h-full flex-col gap-3', section.comingSoon && 'opacity-75')}
            style={{ animationDelay: `${i * 0.4}s` }}
          >
            <div className="flex items-start justify-between gap-3">
              <Orb size="sm" color={ORB_COLOR[section.color]}>
                {section.comingSoon ? <Lock size={17} /> : <Book size={19} />}
              </Orb>
              {section.comingSoon ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-paper px-3 py-1 text-xs font-bold text-ink-soft">
                  <Lock size={11} /> Скоро
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border-2 border-ink bg-green-tint px-3 py-1 text-xs font-bold text-green-deep">
                  Відкрито
                </span>
              )}
            </div>
            <h3 className="font-display text-[17px] font-bold">{section.title}</h3>
            <p className="text-sm text-ink-soft">{section.description}</p>
            <p className="mt-auto pt-1 text-xs font-bold text-ink-mute">
              {section.comingSoon
                ? 'Зміст готується — відкриємо згодом'
                : `${plural(section.moduleCount, ['модуль', 'модулі', 'модулів'])} · ${plural(section.lessonCount, ['урок', 'уроки', 'уроків'])}`}
            </p>
          </ClayCard>
        </Reveal>
      ))}
    </div>
  );
}
