import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLearnerDetail } from '@proai/analytics';
import { dayStamp } from '@proai/learning';
import { LEARNER_STATUS_LABELS, ROLE_LABELS, type ModuleProgressRow } from '@proai/types';
import { ArrowLeft, Award, Book, Check, Clock, Flame, Shield, Spark, XIcon } from '@proai/icons';
import { Avatar, Badge, ClayCard, EmptyState, Orb, ProgressBar, ProgressRing } from '@proai/ui';
import { requirePageAdmin, requirePageUser } from '@/lib/page-guard';
import { ActivityHeatmap } from '@/components/activity-heatmap';
import {
  DataRow,
  SectionHeading,
  StatTile,
  daysWord,
  formatDate,
  formatDateTime,
  formatMinutes,
} from '@/components/admin/analytics-ui';

export const metadata = { title: 'Аналітика людини' };

/**
 * Повна картка однієї людини.
 *
 * Свідомо показує те саме, що людина бачить у себе на /progress, і додає зверху
 * те, чого їй не показують: історію спроб, помилки з останніх тестів і стрічку
 * пройденого. Так розмова «у вас не зараховано модуль» ведеться по одних і тих
 * самих числах з обох боків.
 */
export default async function AdminLearnerPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requirePageUser();
  requirePageAdmin(me);

  const { id } = await params;
  const detail = await getLearnerDetail(id);
  if (!detail) notFound();

  const { user, stats } = detail;
  const today = dayStamp(new Date());
  const coursePct = stats.lessons.total ? Math.round((stats.lessons.completed / stats.lessons.total) * 100) : 0;
  const activeCert = detail.certificates.find((c) => !c.revoked) ?? null;

  const status = activeCert
    ? 'CERTIFIED'
    : stats.modules.total > 0 && stats.modules.completed === stats.modules.total
      ? 'MODULES_DONE'
      : stats.lessons.completed > 0
        ? 'IN_PROGRESS'
        : 'NOT_STARTED';

  return (
    <div className="pt-8 pb-16">
      <Link
        href="/admin/analytics"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink"
      >
        <ArrowLeft size={15} /> До списку людей
      </Link>

      {/* --- Хто це ---------------------------------------------------------- */}
      <ClayCard className="mb-5">
        <div className="flex flex-wrap items-start gap-5">
          <Avatar name={user.name} size="lg" />
          <div className="min-w-[240px] flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-bold">{user.name}</h1>
              <Badge color={status === 'CERTIFIED' ? 'gold' : status === 'MODULES_DONE' ? 'green' : 'blue'}>
                {LEARNER_STATUS_LABELS[status]}
              </Badge>
              {user.role === 'ADMIN' && <Badge color="red">{ROLE_LABELS.ADMIN}</Badge>}
              {user.banned && <Badge color="red">заблокований</Badge>}
            </div>
            <p className="mt-1 text-ink-soft">{user.email}</p>
            {(user.organizationName || user.position) && (
              <p className="text-[14px] text-ink-mute">
                {[user.organizationName, user.position].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>

          <div className="flex min-w-[260px] flex-col gap-2.5">
            <DataRow label="Зареєстрований" value={formatDate(user.registeredAt)} />
            <DataRow label="Перший урок" value={formatDate(stats.startedAt)} />
            <DataRow label="Остання активність" value={stats.lastActivityAt ?? '—'} />
            {user.activeCourseTitle && <DataRow label="Активний курс" value={user.activeCourseTitle} />}
          </div>
        </div>
      </ClayCard>

      {/* --- Головні числа ---------------------------------------------------- */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={<Book size={16} />}
          color="blue"
          value={`${stats.lessons.completed} з ${stats.lessons.total}`}
          label="уроків пройдено"
          hint={`${formatMinutes(stats.minutes)} навчального часу`}
        />
        <StatTile
          icon={<Check size={16} />}
          color="green"
          value={`${stats.modules.completed} з ${stats.modules.total}`}
          label="модулів закрито"
          hint={`тестів складено: ${stats.quizzes.passed} з ${stats.quizzes.total}`}
        />
        <StatTile
          icon={<Spark size={16} />}
          color="amber"
          value={detail.correctAnswersPct === null ? '—' : `${detail.correctAnswersPct}%`}
          label="правильних відповідей"
          hint={
            stats.quizzes.averageBest === null
              ? 'тестів ще не проходив'
              : `середній найкращий бал — ${stats.quizzes.averageBest}%`
          }
        />
        <StatTile
          icon={<Flame size={16} />}
          color="gold"
          variant="gold"
          value={`${stats.totalPoints}`}
          label="балів"
          hint={`серія ${stats.streak.current} ${daysWord(stats.streak.current)} · рекорд ${stats.streak.longest}`}
        />
      </div>

      {/* --- Кільце, «де зараз» і календар ------------------------------------ */}
      <div className="mb-5 grid gap-5 lg:grid-cols-[300px_1fr]">
        <div className="flex flex-col gap-5">
          <ClayCard className="flex flex-col items-center gap-3 text-center">
            <ProgressRing value={coursePct} complete={coursePct === 100} size={150}>
              <span className="font-display text-3xl font-bold">{coursePct}%</span>
              <span className="block text-xs font-semibold text-ink-mute">курсу</span>
            </ProgressRing>
            <p className="text-[13px] text-ink-soft">
              {stats.course ? `Курс «${stats.course.title}»` : 'Прогрес по всіх відкритих курсах'}
            </p>
          </ClayCard>

          <ClayCard padding="sm">
            <h2 className="mb-2 text-[15px] font-bold">Зупинився на</h2>
            {detail.currentModuleTitle ? (
              <>
                <p className="text-[15px] font-semibold">{detail.currentLessonTitle}</p>
                <p className="text-[13px] text-ink-mute">{detail.currentModuleTitle}</p>
              </>
            ) : (
              <p className="text-[15px] font-semibold text-green-deep">Увесь курс пройдено</p>
            )}
            {detail.recentLessons[0] && (
              <p className="mt-3 text-[12px] text-ink-mute">
                Останній зарахований урок: «{detail.recentLessons[0].title}»,{' '}
                {formatDate(detail.recentLessons[0].completedAt)}
              </p>
            )}
          </ClayCard>
        </div>

        <ClayCard>
          <SectionHeading
            title="Активність по днях"
            hint="Один квадрат — день. Насиченість показує, скільки уроків і спроб тестів того дня."
          />
          <ActivityHeatmap days={stats.activity} today={today} />
          <p className="mt-3 text-[13px] text-ink-soft">
            Днів навчання: {stats.streak.activeDays} · поточна серія: {stats.streak.current}{' '}
            {daysWord(stats.streak.current)} · рекорд: {stats.streak.longest} {daysWord(stats.streak.longest)}
          </p>
        </ClayCard>
      </div>

      {/* --- Розділи ---------------------------------------------------------- */}
      {stats.sections.length > 0 && (
        <ClayCard className="mb-5">
          <SectionHeading title="Розділи" hint="Скільки уроків і модулів закрито в кожному розділі програми." />
          <div className="flex flex-col gap-4">
            {stats.sections.map((s) => (
              <div key={s.slug}>
                <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-[15px] font-bold">
                    Розділ {s.order}. {s.title}
                  </span>
                  <span className="text-[13px] font-semibold text-ink-mute">
                    {s.completedLessons} з {s.lessonCount} уроків · {s.completedModules} з {s.moduleCount} модулів
                  </span>
                </div>
                <ProgressBar
                  color={s.lessonCount > 0 && s.completedLessons === s.lessonCount ? 'green' : 'blue'}
                  value={s.lessonCount ? (s.completedLessons / s.lessonCount) * 100 : 0}
                />
              </div>
            ))}
          </div>
        </ClayCard>
      )}

      {/* --- Модулі ----------------------------------------------------------- */}
      <ClayCard className="mb-5">
        <SectionHeading
          title="Модулі й тести"
          hint="Модуль зараховано, коли пройдено всі уроки й остання спроба тесту набрала прохідний бал."
        />
        {stats.moduleRows.length === 0 ? (
          <EmptyState icon={<Book size={22} />} title="Модулів у програмі ще немає" />
        ) : (
          <div className="flex flex-col gap-1">
            {stats.moduleRows.map((row) => (
              <ModuleRow key={row.slug} row={row} />
            ))}
          </div>
        )}
      </ClayCard>

      {/* --- Спроби тестів ----------------------------------------------------- */}
      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <ClayCard>
          <SectionHeading title="Історія тестів" hint="Кожна спроба: бал, скільки питань узято, чи зараховано." />
          {detail.quizHistory.length === 0 ? (
            <EmptyState icon={<Spark size={22} />} title="Тестів ще не проходив" />
          ) : (
            <div className="flex max-h-[420px] flex-col gap-1 overflow-y-auto">
              {detail.quizHistory.map((a, i) => (
                <div
                  key={`${a.moduleSlug}-${a.createdAt}-${i}`}
                  className="flex items-center gap-3 rounded-[22px] px-3.5 py-2.5 odd:bg-paper-2"
                >
                  <Orb size="sm" color={a.passed ? 'green' : 'red'}>
                    {a.passed ? <Check size={14} strokeWidth={3} /> : <XIcon size={14} strokeWidth={3} />}
                  </Orb>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold">{a.moduleTitle}</p>
                    <p className="text-[12px] text-ink-mute">
                      {formatDateTime(a.createdAt)}
                      {a.total > 0 && ` · ${a.correct} з ${a.total} правильно`}
                    </p>
                  </div>
                  <span className={`text-[15px] font-bold ${a.passed ? 'text-green-deep' : 'text-red-deep'}`}>
                    {a.score}%
                  </span>
                  <span className="w-[74px] text-right text-[11px] font-semibold text-ink-mute">
                    поріг {a.passScore}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </ClayCard>

        <ClayCard>
          <SectionHeading
            title="Що розуміє не так"
            hint="Помилки з ОСТАННЬОЇ спроби кожного тесту — те, що людина досі відповідає неправильно."
          />
          {detail.mistakes.length === 0 ? (
            <EmptyState
              icon={<Check size={22} />}
              title="Помилок немає"
              description="В останніх спробах усі відповіді правильні, тестів ще не було — або спроби зроблено до того, як тест переписали, і зіставити їх із нинішніми питаннями вже не можна."
            />
          ) : (
            <div className="flex max-h-[420px] flex-col gap-2.5 overflow-y-auto">
              {detail.mistakes.map((m, i) => (
                <div key={i} className="rounded-[22px] bg-paper-2 px-4 py-3">
                  <p className="text-[14px] font-semibold">{m.questionText}</p>
                  <p className="mt-1 text-[12px] text-red-deep">Відповів: «{m.pickedText}»</p>
                  <p className="text-[12px] text-green-deep">Правильно: «{m.correctText}»</p>
                  <p className="mt-1 text-[11px] text-ink-mute">{m.moduleTitle}</p>
                </div>
              ))}
            </div>
          )}
        </ClayCard>
      </div>

      {/* --- Атестація, сертифікати, стрічка ----------------------------------- */}
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="flex flex-col gap-5">
          <ClayCard variant={stats.exam.passed ? 'gold' : undefined}>
            <SectionHeading title="Фінальна атестація" hint="Відкривається, коли закрито всі модулі курсу." />
            <div className="flex flex-col gap-3">
              <DataRow label="Спроб" value={`${detail.examHistory.length}`} />
              <DataRow
                label="Найкращий бал"
                value={stats.exam.bestScore === null ? '—' : `${stats.exam.bestScore}%`}
              />
              <DataRow label="Зараховано" value={stats.exam.passed ? 'так' : 'ні'} />
            </div>
            {detail.examHistory.length > 0 && (
              <div className="mt-4 flex flex-col gap-1">
                {detail.examHistory.map((e, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 rounded-[20px] px-3 py-2 odd:bg-paper-2">
                    <span className="text-[13px] text-ink-soft">{formatDateTime(e.createdAt)}</span>
                    <span className="text-[13px] font-semibold">
                      {e.score}% · безпека {e.securityScore}%
                    </span>
                    <Badge color={e.passed ? 'green' : 'red'}>{e.passed ? 'склав' : 'не склав'}</Badge>
                  </div>
                ))}
              </div>
            )}
          </ClayCard>

          <ClayCard>
            <SectionHeading title="Сертифікати" hint="Видані платформою після складеної атестації." />
            {detail.certificates.length === 0 ? (
              <p className="text-[15px] text-ink-soft">Сертифікатів ще немає.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {detail.certificates.map((c) => (
                  <div key={c.code} className="rounded-[22px] bg-paper-2 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-[13px] font-bold">{c.code}</span>
                      {c.revoked ? (
                        <Badge color="red">відкликано</Badge>
                      ) : new Date(c.validUntil) < new Date() ? (
                        <Badge color="amber">прострочений</Badge>
                      ) : (
                        <Badge color="gold">
                          <Award size={12} /> чинний
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-[13px] text-ink-soft">
                      {c.score}%{c.withHonors && ' · з відзнакою'} · виданий {formatDate(c.issuedAt)} · чинний до{' '}
                      {formatDate(c.validUntil)}
                    </p>
                    {c.revokedReason && <p className="mt-1 text-[12px] text-red-deep">Причина: {c.revokedReason}</p>}
                  </div>
                ))}
              </div>
            )}
          </ClayCard>
        </div>

        <ClayCard>
          <SectionHeading title="Останні пройдені уроки" hint="Двадцять найсвіжіших зарахувань, від нових до старих." />
          {detail.recentLessons.length === 0 ? (
            <EmptyState icon={<Clock size={22} />} title="Жодного уроку ще не зараховано" />
          ) : (
            <div className="flex max-h-[520px] flex-col gap-1 overflow-y-auto">
              {detail.recentLessons.map((l, i) => (
                <div key={i} className="flex items-baseline gap-3 rounded-[20px] px-3.5 py-2 odd:bg-paper-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold">{l.title}</p>
                    <p className="text-[12px] text-ink-mute">{l.moduleTitle}</p>
                  </div>
                  <span className="shrink-0 text-[12px] text-ink-mute">{formatDateTime(l.completedAt)}</span>
                </div>
              ))}
            </div>
          )}
        </ClayCard>
      </div>

      {/* --- Бали ------------------------------------------------------------- */}
      <ClayCard className="mt-5">
        <SectionHeading title="Звідки бали" hint="Та сама арифметика, яку людина бачить у себе на сторінці «Прогрес»." />
        <div className="flex flex-col gap-1">
          {stats.points.map((entry) => (
            <div key={entry.label} className="flex items-center gap-3 rounded-[22px] px-3.5 py-2.5 odd:bg-paper-2">
              <span className="flex-1 text-[15px] font-medium">{entry.label}</span>
              <span className="text-[13px] text-ink-mute">
                {entry.count} × {entry.each}
              </span>
              <span className="w-14 text-right text-[15px] font-bold">{entry.points}</span>
            </div>
          ))}
          <div className="flex items-center gap-3 px-3.5 pt-2">
            <span className="flex-1 text-[15px] font-bold">Разом</span>
            <span className="w-14 text-right font-display text-lg font-bold">{stats.totalPoints}</span>
          </div>
        </div>
      </ClayCard>
    </div>
  );
}

const STATUS_LABEL: Record<ModuleProgressRow['status'], string> = {
  DONE: 'Завершено',
  IN_PROGRESS: 'У процесі',
  NOT_STARTED: 'Не почато',
};

function ModuleRow({ row }: { row: ModuleProgressRow }) {
  const pct = row.lessonCount ? (row.completedLessons / row.lessonCount) * 100 : 0;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[26px] px-4 py-3 odd:bg-paper-2">
      <Orb size="sm" color={row.status === 'DONE' ? 'green' : row.status === 'IN_PROGRESS' ? 'blue' : 'muted'}>
        {row.status === 'DONE' ? <Check size={15} strokeWidth={3} /> : row.isKey ? <Shield size={15} /> : row.order}
      </Orb>

      <div className="min-w-[180px] flex-1">
        <p className="text-[15px] font-bold">{row.title}</p>
        <p className="text-[12px] text-ink-mute">
          {row.sectionTitle} · {row.minutes} хв{row.isKey && ' · ключовий модуль'}
        </p>
      </div>

      <div className="w-[150px]">
        <ProgressBar
          color={row.status === 'DONE' ? 'green' : 'blue'}
          value={pct}
          valueLabel={`${row.completedLessons}/${row.lessonCount}`}
        />
      </div>

      <div className="w-[170px] text-[13px] font-semibold">
        {!row.hasQuiz ? (
          <span className="text-ink-mute">без тесту</span>
        ) : row.bestScore === null ? (
          <span className="text-ink-mute">тест не складали</span>
        ) : (
          <span className={row.quizPassed ? 'text-green-deep' : 'text-red-deep'}>
            тест {row.bestScore}% · спроб {row.attempts}
            {row.quizPassed ? ' · зараховано' : ` · треба ${row.passScore}%`}
          </span>
        )}
      </div>

      <span
        className={`rounded-full px-3 py-1 text-[12px] font-bold ${
          row.status === 'DONE'
            ? 'bg-green-tint text-green-deep'
            : row.status === 'IN_PROGRESS'
              ? 'bg-blue-tint text-blue-deep'
              : 'bg-paper-2 text-ink-mute'
        }`}
      >
        {STATUS_LABEL[row.status]}
      </span>
    </div>
  );
}
