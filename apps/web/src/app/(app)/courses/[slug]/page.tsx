'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Award, Check, Clock, Shield } from '@proai/icons';
import { Button, ClayCard, Lift, Orb, ProgressBar, toast } from '@proai/ui';
import type { Course } from '@proai/types';
import { api } from '@/lib/api-client';

export default function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['courses', slug],
    queryFn: () => api.get<{ course: Course }>(`/api/courses/${slug}`),
  });

  const selectCourse = useMutation({
    mutationFn: () => api.post<{ courseSlug: string }>('/api/courses/select', { courseId: data!.course.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Курс розпочато');
      router.push('/dashboard');
    },
  });

  if (isLoading || !data) return <div className="pt-8 text-ink-soft">Завантаження…</div>;
  const course = data.course;
  const sections = course.sections ?? [];
  const started = (course.completedModules ?? 0) > 0;

  return (
    <div className="pt-8 pb-16">
      <Link href="/courses" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft">
        <ArrowLeft size={14} /> Усі курси
      </Link>

      <ClayCard className="mb-8 flex flex-wrap items-center justify-between gap-5">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-[28px]">{course.title}</h1>
          <p className="mt-2.5 max-w-[62ch] text-[15px] text-ink-soft">{course.description}</p>
          <div className="mt-3 flex items-center gap-3 text-xs font-bold text-ink-mute">
            <span>{course.sectionCount ?? 0} розділів</span>
            <span>{course.moduleCount ?? 0} модулів</span>
            <span>{course.lessonCount ?? 0} уроків</span>
          </div>
        </div>
        <Button variant={course.isActive ? 'ghost' : 'blue'} size="lg" disabled={selectCourse.isPending || course.isActive} onClick={() => selectCourse.mutate()}>
          <Award size={17} /> {course.isActive ? 'Це ваш активний курс' : started ? 'Продовжити курс' : 'Розпочати курс'}
        </Button>
      </ClayCard>

      <div className="flex flex-col gap-8">
        {sections.map((section) => (
          <div key={section.id}>
            <div className="mb-4 flex items-center gap-2.5">
              <span className="rounded-full bg-paper-2 px-3 py-1 text-xs font-bold text-ink-soft">
                Розділ {section.order}
              </span>
              <h2 className="font-display text-xl font-bold">{section.title}</h2>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {(section.modules ?? []).map((module_) => {
                const done =
                  (module_.completedLessons ?? 0) === (module_.lessonCount ?? 0) &&
                  (module_.hasQuiz ? (module_.quizPassed ?? false) : true);

                return (
                  <Lift key={module_.id}>
                    <Link href={`/module/${module_.slug}`}>
                      <ClayCard className="flex h-full flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-blue-tint px-3 py-1 text-xs font-bold text-blue-deep">
                            Модуль {module_.order}
                          </span>
                          {module_.isKey && (
                            <span className="rounded-full bg-red-tint px-3 py-1 text-xs font-bold text-red-deep">
                              Ключовий
                            </span>
                          )}
                        </div>
                        <div className="flex items-start gap-3">
                          <Orb size="sm" color={done ? 'green' : 'blue'}>
                            {done ? <Check size={16} /> : <Shield size={16} />}
                          </Orb>
                          <h3 className="font-display text-lg font-bold">{module_.title}</h3>
                        </div>
                        <p className="text-sm text-ink-soft">{module_.description}</p>
                        <ProgressBar
                          className="mt-auto"
                          color={done ? 'green' : 'blue'}
                          value={((module_.completedLessons ?? 0) / (module_.lessonCount || 1)) * 100}
                          valueLabel={`${module_.completedLessons ?? 0} з ${module_.lessonCount}`}
                        />
                        <div className="flex items-center gap-1.5 text-xs font-bold text-ink-mute">
                          <Clock size={14} /> {module_.minutes} хв
                          {module_.hasQuiz && (
                            <>
                              <Award size={14} className="ml-2" />
                              {module_.quizPassed ? 'тест складено' : `тест від ${module_.passScore}%`}
                            </>
                          )}
                        </div>
                      </ClayCard>
                    </Link>
                  </Lift>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
