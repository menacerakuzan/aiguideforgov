import { getLessonDropoff } from '@proai/analytics';
import { ClayCard, ProgressBar } from '@proai/ui';
import { requirePageAdmin, requirePageUser } from '@/lib/page-guard';

export default async function AdminAnalyticsPage() {
  const me = await requirePageUser();
  requirePageAdmin(me);

  const { rows } = await getLessonDropoff();
  const withData = rows.filter((r) => r.reached > 0).sort((a, b) => b.dropoffPct - a.dropoffPct);

  return (
    <div className="pt-8 pb-16">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold">Аналітика: відвал по уроках</h1>
        <p className="mt-1 text-ink-soft">
          Для кожного уроку — скільки людей почали модуль проти скільки дійшли саме до нього. Найгірші зверху.
        </p>
      </header>

      {withData.length === 0 ? (
        <ClayCard>Ще немає даних — жоден урок не пройдено.</ClayCard>
      ) : (
        <div className="flex flex-col gap-3">
          {withData.map((r) => (
            <ClayCard key={r.lessonId} padding="sm" className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2 px-2">
                <div>
                  <p className="font-semibold">{r.lessonTitle}</p>
                  <p className="text-xs text-ink-mute">{r.moduleTitle}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    r.dropoffPct >= 40
                      ? 'bg-red-tint text-red-deep'
                      : r.dropoffPct >= 15
                        ? 'bg-amber-tint text-amber-deep'
                        : 'bg-green-tint text-green-deep'
                  }`}
                >
                  {r.dropoffPct}% відвалу
                </span>
              </div>
              <div className="px-2">
                <ProgressBar
                  color={r.dropoffPct >= 40 ? 'blue' : 'green'}
                  value={(r.completed / r.reached) * 100}
                  valueLabel={`${r.completed} з ${r.reached} дійшли`}
                />
              </div>
            </ClayCard>
          ))}
        </div>
      )}
    </div>
  );
}
