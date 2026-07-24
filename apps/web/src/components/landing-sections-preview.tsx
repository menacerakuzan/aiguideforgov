'use client';

import { useQuery } from '@tanstack/react-query';
import { Book } from '@yasno/icons';
import { ClayCard, Orb, Reveal, Skeleton } from '@yasno/ui';
import type { SectionColor } from '@yasno/types';
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
}

/** Розділи курсу тягнуться напряму з бази — картки завжди відповідають реальному змісту. */
export function LandingSectionsPreview() {
  const { data, isLoading } = useQuery({
    queryKey: ['stats', 'sections'],
    queryFn: () => api.get<{ sections: SectionPreview[] }>('/api/stats/sections'),
  });

  const sections = data?.sections ?? [];

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[132px] rounded-[26px]" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {sections.map((section, i) => (
        <Reveal key={section.id}>
          <ClayCard className="animate-floaty flex h-full flex-col gap-3" style={{ animationDelay: `${i * 0.4}s` }}>
            <Orb size="sm" color={ORB_COLOR[section.color]}>
              <Book size={19} />
            </Orb>
            <h3 className="font-display text-[17px] font-bold">{section.title}</h3>
            <p className="text-sm text-ink-soft">{section.description}</p>
          </ClayCard>
        </Reveal>
      ))}
    </div>
  );
}
