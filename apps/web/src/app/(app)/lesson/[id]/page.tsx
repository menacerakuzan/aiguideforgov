import { notFound } from 'next/navigation';
import { requireCurrentUser } from '@proai/auth';
import { getLesson } from '@proai/learning';
import { LessonClient } from '@/components/lesson-client';

/**
 * Серверна оболонка уроку: текст і блоки приходять разом із HTML, а не окремим
 * запитом після завантаження JS. Інтерактив (тренажери, прогрес) лишається в
 * LessonClient.
 */
export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireCurrentUser();
  const { id } = await params;

  const lesson = await getLesson(me.id, id);
  if (!lesson) notFound();

  return <LessonClient id={id} initialLesson={lesson} />;
}
