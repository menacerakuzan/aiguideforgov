import { notFound } from 'next/navigation';
import { getDemoLesson } from '@proai/learning';
import { LessonClient } from '@/components/lesson-client';

export const metadata = { title: 'Демо-урок' };

/**
 * Урок 1.1 «Демонстрація» без реєстрації. Сесія тут не потрібна й не
 * перевіряється: `/demo` немає в PROTECTED_PREFIXES middleware, а
 * `getDemoLesson` віддає рівно один урок і нічого не знає про користувача.
 */
export default async function DemoLessonPage() {
  const lesson = await getDemoLesson();
  if (!lesson) notFound();

  return <LessonClient id={lesson.id} initialLesson={lesson} demo />;
}
