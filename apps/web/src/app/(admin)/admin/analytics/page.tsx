import { getAdminAnalytics } from '@proai/analytics';
import { dayStamp } from '@proai/learning';
import { Award, Book, Chart, Clock, Flame, Users } from '@proai/icons';
import { ClayCard } from '@proai/ui';
import { requirePageAdmin, requirePageUser } from '@/lib/page-guard';
import { AnalyticsRoster } from '@/components/admin/analytics-roster';
import {
  AnalyticsTabs,
  DataRow,
  Funnel,
  SectionHeading,
  StatTile,
  formatMinutes,
} from '@/components/admin/analytics-ui';

export const metadata = { title: 'Аналітика: люди' };

/**
 * Аналітика → «Люди».
 *
 * Сторінка відповідає на два питання адміністратора в тому порядку, в якому
 * він їх ставить: «як справи загалом» (плитки й воронка) і «як справи в цієї
 * конкретної людини» (таблиця, звідки клік веде в її картку).
 */
export default async function AdminAnalyticsPeoplePage() {
  const me = await requirePageUser();
  requirePageAdmin(me);

  const data = await getAdminAnalytics();
  const today = dayStamp(new Date());

  const organizations = [...new Set(data.learners.map((l) => l.organizationName).filter(Boolean))].sort() as string[];

  return (
    <div className="pt-8 pb-16">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold">Аналітика</h1>
        <p className="mt-1 max-w-[70ch] text-ink-soft">
          Усі числа порахувано з історії навчання — завершених уроків і спроб тестів, — тому вони збігаються з тим,
          що кожна людина бачить у себе на сторінці «Прогрес».
        </p>
      </header>

      <AnalyticsTabs active="/admin/analytics" />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={<Users size={16} />}
          color="blue"
          value={`${data.totals.learners}`}
          label="слухачів"
          hint={`${data.engagement.neverStarted} ще не починали`}
        />
        <StatTile
          icon={<Flame size={16} />}
          color="sun"
          variant="sun"
          value={`${data.engagement.active7}`}
          label="активні за 7 днів"
          hint={`сьогодні — ${data.engagement.activeToday}, за 30 днів — ${data.engagement.active30}`}
        />
        <StatTile
          icon={<Chart size={16} />}
          color="green"
          value={`${data.completion.averageCoursePct}%`}
          label="середній прогрес курсу"
          hint={`у середньому ${data.completion.averageLessonsPerLearner} з ${data.totals.lessons} уроків`}
        />
        <StatTile
          icon={<Award size={16} />}
          color="gold"
          variant="gold"
          value={`${data.certificates.active}`}
          label="чинних сертифікатів"
          hint={data.certificates.revoked > 0 ? `відкликано: ${data.certificates.revoked}` : 'жодного не відкликано'}
        />
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <ClayCard>
          <SectionHeading
            title="Шлях слухача"
            hint="Скільки людей доходять до кожного етапу. Найбільший розрив між сусідніми смугами — і є місце, де курс втрачає людей."
          />
          <Funnel steps={data.funnel} />
        </ClayCard>

        <div className="flex flex-col gap-5">
          <ClayCard>
            <SectionHeading title="Хто потребує уваги" hint="Люди, до яких варто написати або нагадати." />
            <div className="flex flex-col gap-3">
              <DataRow label="Зареєструвались, але не почали" value={`${data.engagement.neverStarted}`} />
              <DataRow label="Почали й зникли (14+ днів)" value={`${data.engagement.dormant}`} />
              <DataRow
                label="Пройшли модулі, але без сертифіката"
                value={`${data.funnel.find((s) => s.key === 'allModules')!.count - data.certificates.active}`}
              />
            </div>
            <p className="mt-4 text-[13px] text-ink-soft">
              Відібрати цих людей у таблиці нижче можна фільтром «Стан навчання».
            </p>
          </ClayCard>

          <ClayCard padding="sm">
            <div className="flex flex-col gap-3">
              <DataRow
                label="Уроків пройдено разом"
                value={
                  <span>
                    {data.completion.lessonsCompleted}{' '}
                    <span className="text-[13px] font-semibold text-ink-mute">
                      ({formatMinutes(data.completion.minutesLearned)})
                    </span>
                  </span>
                }
              />
              <DataRow label="Модулів закрито разом" value={`${data.completion.modulesCompleted}`} />
              <DataRow
                label="Правильних відповідей у тестах"
                value={data.quizzes.correctAnswersPct === null ? '—' : `${data.quizzes.correctAnswersPct}%`}
              />
            </div>
          </ClayCard>
        </div>
      </div>

      <ClayCard padding="sm">
        <div className="px-2">
          <SectionHeading
            title="Люди"
            hint="Один рядок — одна людина: скільки пройдено, які бали, де зупинилась, чи є сертифікат."
          />
        </div>
        <AnalyticsRoster rows={data.learners} today={today} organizations={organizations} />
      </ClayCard>

      <p className="mt-6 flex items-center gap-2 px-2 text-[13px] text-ink-mute">
        <Book size={14} /> Знаменники («з 49 уроків») рахують лише відкриті курси — закритий курс не роздуває цифри.
        <Clock size={14} className="ml-2" /> Дані станом на{' '}
        {new Date(data.generatedAt).toLocaleString('uk-UA', { hour: '2-digit', minute: '2-digit' })}.
      </p>
    </div>
  );
}
