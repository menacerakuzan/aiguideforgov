import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireCurrentUser } from '@proai/auth';
import { getModuleBySlug } from '@proai/learning';
import { ArrowLeft, Award, Book, Check, Clock, Lock, Play } from '@proai/icons';
import { ClayCard } from '@proai/ui';

export default async function ModuleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireCurrentUser();
  const module_ = await getModuleBySlug(user.id, slug);
  if (!module_) notFound();

  const lessons = module_.lessons ?? [];
  const allLessonsDone = lessons.length > 0 && lessons.every((l) => l.completed);
  const firstIncompleteIndex = lessons.findIndex((l) => !l.completed);

  return (
    <div className="pt-8">
      {module_.courseSlug && (
        <div className="mb-6">
          <Link
            href={`/courses/${module_.courseSlug}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface px-4 py-2 text-sm font-semibold text-ink-soft shadow-[0_9px_18px_-9px_rgba(38,34,74,0.14)]"
          >
            <ArrowLeft size={14} /> {module_.courseTitle ?? 'До курсу'}
          </Link>
        </div>
      )}

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
          return (
            <Link
              key={lesson.id}
              href={`/lesson/${lesson.id}`}
              className="flex min-h-14 items-center gap-3 border-b border-ink/6 px-6 py-3.5 transition-colors last:border-0 hover:bg-paper-2"
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
