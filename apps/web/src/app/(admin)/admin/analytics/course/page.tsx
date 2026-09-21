import { getAdminAnalytics } from '@proai/analytics';
import { Award, Book, Check, Chart, Shield, Spark } from '@proai/icons';
import { ClayCard, EmptyState, ProgressBar, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@proai/ui';
import { requirePageAdmin, requirePageUser } from '@/lib/page-guard';
import { AnalyticsTabs, DailyChart, DataRow, SectionHeading, StatTile } from '@/components/admin/analytics-ui';

export const metadata = { title: 'Аналітика: курс' };

/** Скільки найпроблемніших уроків і питань показувати — далі списки перестають читати. */
const TOP = 12;

/**
 * Аналітика → «Курс».
 *
 * Тут курс дивиться на себе: які модулі закривають, де уроки кидають, які
 * питання тесту люди стабільно не беруть. Це список того, що варто переписати —
 * тому кожна секція відсортована від найгіршого.
 */
export default async function AdminAnalyticsCoursePage() {
  const me = await requirePageUser();
  requirePageAdmin(me);

  const data = await getAdminAnalytics();

  const startedLessons = data.lessons.filter((l) => l.started > 0);
  const worstLessons = [...startedLessons].sort((a, b) => b.dropoffPct - a.dropoffPct).slice(0, TOP);
  const hardestQuestions = [...data.questions].sort((a, b) => a.correctPct - b.correctPct).slice(0, TOP);
  const orgs = data.organizations.filter((o) => o.users > 0);

  return (
    <div className="pt-8 pb-16">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold">Аналітика</h1>
        <p className="mt-1 max-w-[70ch] text-ink-soft">
          Курс очима платформи: що проходять, де зупиняються й які питання тесту стабільно не беруть.
        </p>
      </header>

      <AnalyticsTabs active="/admin/analytics/course" />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={<Book size={16} />}
          color="blue"
          value={`${data.totals.lessons}`}
          label="уроків у програмі"
          hint={`${data.totals.sections} розділів · ${data.totals.modules} модулів`}
        />
        <StatTile
          icon={<Check size={16} />}
          color="green"
          value={data.quizzes.averageScore === null ? '—' : `${data.quizzes.averageScore}%`}
          label="середній бал спроби тесту"
          hint={`спроб: ${data.quizzes.attempts} · зараховано ${data.quizzes.passRate ?? 0}%`}
        />
        <StatTile
          icon={<Spark size={16} />}
          color="amber"
          value={data.quizzes.correctAnswersPct === null ? '—' : `${data.quizzes.correctAnswersPct}%`}
          label="правильних відповідей"
          hint={`питань у банку: ${data.totals.questions}`}
        />
        <StatTile
          icon={<Award size={16} />}
          color="gold"
          variant="gold"
          value={data.exam.passRate === null ? '—' : `${data.exam.passRate}%`}
          label="атестацій зараховано"
          hint={`спроб: ${data.exam.attempts} від ${data.exam.learners} людей`}
        />
      </div>

      <ClayCard className="mb-5">
        <SectionHeading
          title="Активність платформи за 30 днів"
          hint="Синє — завершені уроки, жовте — спроби тестів. Наведіть на стовпчик, щоб побачити день."
        />
        <DailyChart days={data.daily} />
      </ClayCard>

      <ClayCard padding="sm" className="mb-5">
        <div className="px-2">
          <SectionHeading
            title="Модулі"
            hint="«Почали» — завершили в модулі хоча б один урок. «Закрили» — усі уроки плюс зарахований тест."
          />
        </div>
        {data.modules.length === 0 ? (
          <EmptyState icon={<Book size={22} />} title="Модулів ще немає" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Модуль</TableHead>
                <TableHead>Уроків</TableHead>
                <TableHead>Почали</TableHead>
                <TableHead>Закрили</TableHead>
                <TableHead>Тест</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.modules.map((m) => (
                <TableRow key={m.slug}>
                  <TableCell>
                    <p className="font-semibold text-ink">
                      {m.order}. {m.title}
                      {m.isKey && (
                        <span className="ml-2 inline-flex items-center gap-1 text-xs font-bold text-blue-deep">
                          <Shield size={12} /> ключовий
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-ink-mute">{m.sectionTitle}</p>
                  </TableCell>
                  <TableCell className="text-ink-soft">{m.lessonCount}</TableCell>
                  <TableCell className="font-semibold">{m.started}</TableCell>
                  <TableCell className="min-w-[150px]">
                    <ProgressBar
                      color={m.started > 0 && m.completed === m.started ? 'green' : 'blue'}
                      value={m.started ? (m.completed / m.started) * 100 : 0}
                      valueLabel={`${m.completed} з ${m.started}`}
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {!m.hasQuiz ? (
                      <span className="text-ink-mute">без тесту</span>
                    ) : m.quizAttempts === 0 ? (
                      <span className="text-ink-mute">спроб не було</span>
                    ) : (
                      <>
                        <span className="font-semibold">середній {m.averageQuizScore}%</span>
                        <span className="block text-xs text-ink-mute">
                          зараховано {m.quizPassRate}% зі {m.quizAttempts} спроб · поріг {m.passScore}%
                        </span>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ClayCard>

      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <ClayCard padding="sm">
          <div className="px-2">
            <SectionHeading
              title="Уроки, де зупиняються"
              hint="Скільки з тих, хто почав модуль, дійшли саме до цього уроку. Найгірші — зверху."
            />
          </div>
          {worstLessons.length === 0 ? (
            <EmptyState icon={<Chart size={22} />} title="Ще немає даних" description="Жоден урок не пройдено." />
          ) : (
            <div className="flex flex-col gap-3 px-2 pb-2">
              {worstLessons.map((l) => (
                <div key={l.id}>
                  <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-[14px] font-semibold">{l.title}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        l.dropoffPct >= 40
                          ? 'bg-red-tint text-red-deep'
                          : l.dropoffPct >= 15
                            ? 'bg-amber-tint text-amber-deep'
                            : 'bg-green-tint text-green-deep'
                      }`}
                    >
                      −{l.dropoffPct}%
                    </span>
                  </div>
                  <p className="mb-1.5 text-[12px] text-ink-mute">{l.moduleTitle}</p>
                  <ProgressBar
                    color={l.dropoffPct >= 40 ? 'blue' : 'green'}
                    value={l.completionPct}
                    valueLabel={`${l.completed} з ${l.started} дійшли`}
                  />
                </div>
              ))}
            </div>
          )}
        </ClayCard>

        <ClayCard padding="sm">
          <div className="px-2">
            <SectionHeading
              title="Найважчі питання тестів"
              hint="Частка правильних відповідей. Низький відсоток — або питання незрозуміле, або урок його не пояснює. Спроби, зроблені до переписування тесту, сюди не потрапляють: зіставити їх із нинішніми питаннями неможливо."
            />
          </div>
          {hardestQuestions.length === 0 ? (
            <EmptyState
              icon={<Spark size={22} />}
              title="Немає що показати"
              description="Тести ще не проходили — або всі спроби зроблено до того, як банк питань переписали."
            />
          ) : (
            <div className="flex flex-col gap-3 px-2 pb-2">
              {hardestQuestions.map((q) => (
                <div key={q.id} className="rounded-[22px] bg-paper-2 px-4 py-3">
                  <div className="mb-1 flex items-baseline justify-between gap-3">
                    <span className="text-[14px] font-semibold">{q.text}</span>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        q.correctPct >= 80
                          ? 'bg-green-tint text-green-deep'
                          : q.correctPct >= 50
                            ? 'bg-amber-tint text-amber-deep'
                            : 'bg-red-tint text-red-deep'
                      }`}
                    >
                      {q.correctPct}%
                    </span>
                  </div>
                  <p className="text-[12px] text-ink-mute">
                    {q.moduleTitle} · {q.correct} з {q.answers} відповідей правильні
                  </p>
                  {q.topWrongOption && (
                    <p className="mt-1 text-[12px] text-red-deep">Найчастіше плутають: «{q.topWrongOption}»</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ClayCard>
      </div>

      {orgs.length > 0 && (
        <ClayCard padding="sm">
          <div className="px-2">
            <SectionHeading title="Організації" hint="Середній прогрес курсу по людях кожної організації." />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Організація</TableHead>
                <TableHead>Людей</TableHead>
                <TableHead>Почали</TableHead>
                <TableHead>Середній прогрес</TableHead>
                <TableHead>Сертифікатів</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <p className="font-semibold text-ink">{o.name}</p>
                    <p className="text-xs text-ink-mute">{o.kind}</p>
                  </TableCell>
                  <TableCell className="font-semibold">{o.users}</TableCell>
                  <TableCell className="text-ink-soft">{o.started}</TableCell>
                  <TableCell className="min-w-[150px]">
                    <ProgressBar value={o.averageProgressPct} valueLabel={`${o.averageProgressPct}%`} />
                  </TableCell>
                  <TableCell className="font-semibold">{o.certified}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ClayCard>
      )}

      <ClayCard padding="sm" className="mt-5">
        <div className="grid gap-3 px-2 sm:grid-cols-2">
          <DataRow label="Спроб тестів усього" value={`${data.quizzes.attempts}`} />
          <DataRow label="Спроб атестації" value={`${data.exam.attempts}`} />
          <DataRow
            label="Середній бал атестації"
            value={data.exam.averageScore === null ? '—' : `${data.exam.averageScore}%`}
          />
          <DataRow label="Атестацію склали" value={`${data.exam.passed}`} />
        </div>
      </ClayCard>
    </div>
  );
}
