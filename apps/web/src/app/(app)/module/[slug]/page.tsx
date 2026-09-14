import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getModuleBySlug } from '@proai/learning';
import { ArrowLeft, Award, Book, Check, Clock, Lock, Play } from '@proai/icons';
import { Button, ClayCard, Orb } from '@proai/ui';
import { requirePageUser } from '@/lib/page-guard';

export default async function ModuleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requirePageUser();
  const module_ = await getModuleBySlug(user.id, slug);
  if (!module_) notFound();

  const lessons = module_.lessons ?? [];
  const allLessonsDone = lessons.length > 0 && lessons.every((l) => l.completed);
  const firstIncompleteIndex = lessons.findIndex((l) => !l.completed);

  const backToCourse = module_.courseSlug && (
    <div className="mb-6">
      <Link
        href={`/courses/${module_.courseSlug}`}
        className="inline-flex items-center gap-1.5 rounded-full bg-surface px-4 py-2 text-sm font-semibold text-ink-soft shadow-[0_9px_18px_-9px_rgba(38,34,74,0.14)]"
      >
        <ArrowLeft size={14} /> {module_.courseTitle ?? 'До курсу'}
      </Link>
    </div>
  );

  // Модуль закритий послідовністю. Не 404: людині корисно бачити, що попереду,
  // і головне — чим саме воно відкривається, з посиланням просто туди.
  if (module_.locked) {
    return (
      <div className="pt-8">
        {backToCourse}
        <ClayCard className="flex flex-col items-start gap-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-paper-2 px-3 py-1 text-xs font-bold text-ink-soft">
            <Lock size={12} /> Модуль закрито
          </span>
          <div className="flex items-start gap-3">
            <Orb size="sm" color="muted">
              <Lock size={16} />
            </Orb>
            <div>
              <h1 className="font-display text-2xl font-bold sm:text-[28px]">{module_.title}</h1>
              <p className="mt-2.5 max-w-[68ch] text-[15px] text-ink-soft">{module_.description}</p>
            </div>
          </div>
          <p className="max-w-[68ch] rounded-2xl bg-paper-2 px-5 py-4 text-[15px] font-semibold text-ink-soft">
            Модулі проходяться по черзі — так курс веде від першого запиту до готового документа.
            {module_.lockedBy
              ? ` Спершу завершіть модуль «${module_.lockedBy.title}»: усі його уроки та тест.`
              : ' Спершу завершіть попередній модуль: усі його уроки та тест.'}
          </p>
          {module_.lockedBy && (
            <Button variant="blue" size="lg" asChild>
              <Link href={`/module/${module_.lockedBy.slug}`}>
                <Play size={17} /> До модуля «{module_.lockedBy.title}»
              </Link>
            </Button>
          )}
        </ClayCard>
      </div>
    );
  }

  return (
    <div className="pt-8">
      {backToCourse}

      <ClayCard className="mb-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-blue-tint px-3 py-1 text-xs font-bold text-blue-deep">
            {module_.sectionTitle} · модуль {module_.order}
          </span>
          {module_.isKey && (
            <span className="rounded-full bg-red-tint px-3 py-1 text-xs font-bold text-red-deep">Ключовий</span>
          )}
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-paper-2 px-3 py-1 text-xs font-bold text-ink-soft">
            <Clock size={13} /> {module_.minutes} хв
          </span>
        </div>
        <h1 className="font-display text-2xl font-bold sm:text-[28px]">{module_.title}</h1>
        <p className="mt-2.5 max-w-[68ch] text-[15px] text-ink-soft">{module_.description}</p>
      </ClayCard>

      <ClayCard padding="none" className="overflow-hidden">
        {lessons.length === 0 && (
          <div className="flex items-center gap-3 px-6 py-6 text-ink-soft">
            <Book size={18} className="flex-none" /> Уроки цього модуля ще наповнюються.
          </div>
        )}
        {lessons.map((lesson, i) => {
          const isCurrent = i === firstIncompleteIndex;
          // Уроки всередині модуля навмисно НЕ замикаються — лише приглушуємо
          // ті, що йдуть після рекомендованого. Порядок тут радимо, а не
          // нав'язуємо: людина, яка застрягла на одному уроці, має змогу
          // рухатись далі, а не впертися в стіну.
          const ahead = firstIncompleteIndex >= 0 && i > firstIncompleteIndex;
          return (
            <Link
              key={lesson.id}
              href={`/lesson/${lesson.id}`}
              title={ahead ? 'Рекомендуємо спершу пройти попередні уроки' : undefined}
              className={`flex min-h-14 items-center gap-3 border-b border-ink/6 px-6 py-3.5 transition-colors last:border-0 hover:bg-paper-2 ${
                ahead ? 'opacity-60' : ''
              }`}
            >
              {lesson.completed ? (
                <Check size={18} className="flex-none text-green" />
              ) : isCurrent ? (
                <Play size={16} className="flex-none text-blue" />
              ) : (
                <span className="h-[18px] w-[18px] flex-none rounded-full bg-paper-2" />
              )}
              <span className={`font-medium ${lesson.completed ? 'text-ink-mute line-through decoration-2' : ''}`}>
                {lesson.title}
              </span>
              <span className="ml-auto rounded-full bg-paper-2 px-2.5 py-1 text-xs font-bold text-ink-soft">
                {lesson.kind === 'EXERCISE' ? 'Вправа' : 'Урок'}
              </span>
              <span className="flex items-center gap-1 text-xs font-bold text-ink-mute">
                <Clock size={13} /> {lesson.minutes} хв
              </span>
            </Link>
          );
        })}

        {/* Тест — доступний лише коли всі уроки пройдено */}
        {module_.hasQuiz &&
          (allLessonsDone ? (
            <Link
              href={`/quiz/${module_.slug}`}
              className="flex min-h-14 items-center gap-3 bg-blue-tint px-6 py-3.5 font-semibold text-blue-deep"
            >
              <Award size={18} className="flex-none" />
              Тест модуля
              <span className="ml-auto text-xs font-bold">Прохідний бал {module_.passScore}%</span>
            </Link>
          ) : (
            <div
              className="flex min-h-14 items-center gap-3 px-6 py-3.5 text-ink-mute"
              title="Завершіть усі уроки модуля, щоб відкрити тест"
            >
              <Lock size={16} className="flex-none" />
              Тест модуля
              <span className="ml-auto text-xs font-bold">Заблоковано</span>
            </div>
          ))}
      </ClayCard>
    </div>
  );
}
