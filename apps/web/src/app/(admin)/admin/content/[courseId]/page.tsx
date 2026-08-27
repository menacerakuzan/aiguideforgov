import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@proai/db';
import { requireCurrentUser } from '@proai/auth';
import { ArrowLeft, Award, Book, Check, Clock } from '@proai/icons';
import { Button, ClayCard } from '@proai/ui';
import { requirePageAdmin } from '@/lib/page-guard';
import { AddSectionForm, AddModuleForm, AddLessonForm, DeleteEntityButton } from '@/components/admin/content-forms';

export default async function AdminCourseContentPage({ params }: { params: Promise<{ courseId: string }> }) {
  const me = await requireCurrentUser();
  requirePageAdmin(me);
  const { courseId } = await params;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        include: {
          modules: {
            orderBy: { order: 'asc' },
            include: {
              lessons: { orderBy: { order: 'asc' } },
              quiz: { select: { id: true } },
            },
          },
        },
      },
      finalExam: { select: { id: true } },
    },
  });

  if (!course) notFound();

  return (
    <div className="pt-8 pb-16">
      <Link href="/admin/content" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft">
        <ArrowLeft size={14} /> Усі курси
      </Link>

      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">{course.title}</h1>
          <p className="mt-1 text-ink-soft">{course.description}</p>
        </div>
        <Button variant="sun" asChild>
          <Link href={`/admin/content/${course.id}/exam`}>
            <Award size={17} /> Фінальна атестація {course.finalExam ? '' : '(не створена)'}
          </Link>
        </Button>
      </header>

      <div className="mb-8">
        <AddSectionForm courseId={course.id} nextOrder={course.sections.length + 1} />
      </div>

      <div className="flex flex-col gap-6">
        {course.sections.map((section) => (
          <ClayCard key={section.id} padding="sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-2">
              <div className="flex items-center gap-2.5">
                <span className="rounded-full bg-paper-2 px-3 py-1 text-xs font-bold text-ink-soft">
                  Розділ {section.order} · {section.color}
                </span>
                <h2 className="font-display text-lg font-bold">{section.title}</h2>
              </div>
              <DeleteEntityButton kind="sections" id={section.id} label="Видалити розділ" />
            </div>
            <p className="mb-4 px-2 text-sm text-ink-soft">{section.description}</p>

            <div className="flex flex-col gap-4">
              {section.modules.map((module_) => (
                <div key={module_.id} className="rounded-[22px] bg-paper-2 p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {module_.title}
                        {module_.isKey && (
                          <span className="ml-2 rounded-full bg-red-tint px-2.5 py-0.5 text-xs font-bold text-red-deep">
                            Ключовий · {module_.passScore}%
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-ink-mute">
                        {module_.lessons.length} уроків · {module_.minutes} хв
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/content/quiz/${module_.id}`}>
                          <Check size={14} /> {module_.quiz ? 'Тест модуля' : 'Створити тест'}
                        </Link>
                      </Button>
                      <DeleteEntityButton kind="modules" id={module_.id} label="Видалити модуль" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    {module_.lessons.map((lesson) => (
                      <Link
                        key={lesson.id}
                        href={`/admin/content/lesson/${lesson.id}`}
                        className="flex items-center gap-2.5 rounded-2xl bg-surface px-4 py-2.5 text-sm transition-colors hover:bg-blue-tint"
                      >
                        <Book size={14} className="flex-none text-ink-mute" />
                        <span className="font-medium">{lesson.title}</span>
                        <span className="ml-auto flex items-center gap-1 text-xs text-ink-mute">
                          <Clock size={12} /> {lesson.minutes} хв
                        </span>
                      </Link>
                    ))}
                  </div>

                  <div className="mt-3">
                    <AddLessonForm moduleId={module_.id} nextOrder={module_.lessons.length + 1} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <AddModuleForm sectionId={section.id} nextOrder={section.modules.length + 1} />
            </div>
          </ClayCard>
        ))}
      </div>
    </div>
  );
}
