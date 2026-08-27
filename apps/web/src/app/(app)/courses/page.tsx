'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Award, Book, Check, Clock, Shield } from '@proai/icons';
import { ClayCard, EmptyState, Lift, Orb, ProgressBar } from '@proai/ui';
import type { Course } from '@proai/types';
import { api } from '@/lib/api-client';

export default function CoursesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['courses', 'list'],
    queryFn: () => api.get<{ courses: Course[] }>('/api/courses'),
  });

  const courses = data?.courses ?? [];

  return (
    <div className="pt-8">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold">Курси</h1>
        <p className="mt-2 text-ink-soft">Оберіть курс, щоб побачити програму й розпочати навчання.</p>
      </header>

      {isLoading ? (
        <p className="text-ink-soft">Завантаження…</p>
      ) : courses.length === 0 ? (
        <ClayCard>
          <EmptyState icon={<Book size={22} />} title="Курсів поки немає" />
        </ClayCard>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            const moduleCount = course.moduleCount ?? 0;
            const done = moduleCount > 0 && (course.completedModules ?? 0) === moduleCount;
            const started = (course.completedModules ?? 0) > 0;

            return (
              <Lift key={course.id}>
                <Link href={`/courses/${course.slug}`}>
                  <ClayCard current={course.isActive} className="flex h-full flex-col gap-3">
                    <div className="flex items-center gap-2">
                      {course.isActive && (
                        <span className="rounded-full bg-blue-tint px-3 py-1 text-xs font-bold text-blue-deep">
                          Активний курс
                        </span>
                      )}
                      {done && (
                        <span className="rounded-full bg-green-tint px-3 py-1 text-xs font-bold text-green-deep">
                          Пройдено
                        </span>
                      )}
                    </div>
                    <div className="flex items-start gap-3">
                      <Orb size="sm" color={done ? 'green' : 'blue'}>
                        {done ? <Check size={16} /> : <Shield size={16} />}
                      </Orb>
                      <h3 className="font-display text-lg font-bold">{course.title}</h3>
                    </div>
                    <p className="text-sm text-ink-soft">{course.description}</p>
                    <ProgressBar
                      className="mt-auto"
                      color={done ? 'green' : 'blue'}
                      value={(((course.completedModules ?? 0) / (moduleCount || 1)) * 100)}
                      valueLabel={`${course.completedModules ?? 0} з ${moduleCount}`}
                    />
                    <div className="flex items-center gap-3 text-xs font-bold text-ink-mute">
                      <span className="flex items-center gap-1">
                        <Book size={13} /> {course.sectionCount ?? 0} розділів
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={13} /> {moduleCount} модулів
                      </span>
                      {started && (
                        <span className="flex items-center gap-1 text-blue-deep">
                          <Award size={13} /> у процесі
                        </span>
                      )}
                    </div>
                  </ClayCard>
                </Link>
              </Lift>
            );
          })}
        </div>
      )}
    </div>
  );
}
