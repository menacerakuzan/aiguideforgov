'use client';

import { useQuery } from '@tanstack/react-query';
import { CountUp } from '@proai/ui';
import type { PublicStatsResponse } from '@proai/types';
import { api } from '@/lib/api-client';

function formatHours(totalMinutes: number): string {
  const hours = totalMinutes / 60;
  return hours % 1 === 0 ? `${hours}` : hours.toFixed(1).replace('.', ',');
}

/** Лічильники на лендингу — завжди актуальні цифри курсу, не хардкод. */
export function LandingStats() {
  const { data } = useQuery({
    queryKey: ['stats', 'public'],
    queryFn: () => api.get<PublicStatsResponse>('/api/stats/public'),
  });

  return (
    <div className="mt-8 flex flex-wrap gap-6 text-sm text-ink-soft">
      <div>
        <b className="block font-display text-2xl font-bold text-ink">
          <CountUp value={data?.moduleCount ?? 0} />
        </b>
        модулів
      </div>
      <div>
        <b className="block font-display text-2xl font-bold text-ink">{data ? formatHours(data.totalMinutes) : '—'} год</b>
        всього
      </div>
      <div>
        <b className="block font-display text-2xl font-bold text-ink">
          <CountUp value={data?.learnerCount ?? 0} />
        </b>
        вже вчаться
      </div>
    </div>
  );
}
