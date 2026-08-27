import Link from 'next/link';
import { prisma } from '@proai/db';
import { requireCurrentUser } from '@proai/auth';
import { Book } from '@proai/icons';
import { ClayCard, EmptyState } from '@proai/ui';
import { requirePageAdmin } from '@/lib/page-guard';
import { AddCourseForm } from '@/components/admin/content-forms';

export default async function AdminCoursesPage() {
  const me = await requireCurrentUser();
  requirePageAdmin(me);

  const courses = await prisma.course.findMany({
    orderBy: { title: 'asc' },
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
                <h2 className="font-display text-lg font-bold">{course.title}</h2>
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
