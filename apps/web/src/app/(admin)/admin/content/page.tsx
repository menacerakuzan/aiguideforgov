import Link from 'next/link';
import { prisma } from '@proai/db';
import { Book } from '@proai/icons';
import { ClayCard, EmptyState } from '@proai/ui';
import { requirePageAdmin, requirePageUser } from '@/lib/page-guard';
import { AddCourseForm } from '@/components/admin/content-forms';

export default async function AdminCoursesPage() {
  const me = await requirePageUser();
  requirePageAdmin(me);

  const courses = await prisma.course.findMany({
    // Той самий порядок, що бачить слухач на /courses, — інакше адміністратор
    // читав би список курсів у іншій послідовності, ніж той, ким він керує.
    orderBy: [{ order: 'asc' }, { title: 'asc' }],
    include: { _count: { select: { sections: true } } },
  });

  return (
    <div className="pt-8 pb-16">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold">Курси</h1>
        <p className="mt-1 text-ink-soft">Керуйте контентом будь-якого курсу платформи або створіть новий.</p>
      </header>

      <div className="mb-8">
        <AddCourseForm />
      </div>

      {courses.length === 0 ? (
        <ClayCard>
          <EmptyState icon={<Book size={22} />} title="Курсів ще немає" description="Створіть перший курс вище." />
        </ClayCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link key={course.id} href={`/admin/content/${course.id}`}>
              <ClayCard className="flex h-full flex-col gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg font-bold">{course.title}</h2>
                  {/* Курс закрито для слухачів — адміністратор має бачити це у списку,
                      бо редагувати його контент можна як завжди. */}
                  {course.comingSoon && (
                    <span className="rounded-full bg-paper-2 px-2.5 py-0.5 text-[11px] font-bold text-ink-soft">
                      Закритий
                    </span>
                  )}
                </div>
                <p className="text-sm text-ink-soft">{course.description}</p>
                <p className="mt-auto text-xs font-bold text-ink-mute">{course._count.sections} розділів</p>
              </ClayCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
