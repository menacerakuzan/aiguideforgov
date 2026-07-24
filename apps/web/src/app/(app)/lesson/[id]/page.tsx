'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Lesson, LessonBlock } from '@yasno/types';
import { ArrowLeft, Check, Clock, TlCaution, TlForbid, TlSafe } from '@yasno/icons';
import { Button, ClayCard, Orb, QuizOption, type QuizOptionState, RedactWord } from '@yasno/ui';
import { api } from '@/lib/api-client';
import { useFireConfetti } from '@/components/confetti-provider';
import { LessonComments } from '@/components/lesson-comments';

export default function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const fireConfetti = useFireConfetti();

  const { data, isLoading } = useQuery({
    queryKey: ['lessons', id],
    queryFn: () => api.get<{ lesson: Lesson }>(`/api/lessons/${id}`),
  });

  const complete = useMutation({
    mutationFn: () => api.post<{ moduleCompleted: boolean }>('/api/progress/complete-lesson', { lessonId: id }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['progress', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      if (result.moduleCompleted) fireConfetti(100);

      const lesson = data?.lesson;
      if (lesson?.nextLesson) router.push(`/lesson/${lesson.nextLesson.id}`);
      else if (lesson) router.push(`/module/${lesson.moduleSlug}`);
    },
  });

  if (isLoading || !data) return <div className="pt-8 text-ink-soft">Завантаження…</div>;
  const lesson = data.lesson;

  return (
    <article className="mx-auto max-w-[720px] pt-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href={`/module/${lesson.moduleSlug}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-surface px-4 py-2 text-sm font-semibold text-ink-soft shadow-[0_9px_18px_-9px_rgba(38,34,74,0.14)]"
        >
          <ArrowLeft size={14} /> {lesson.moduleTitle}
        </Link>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-sun-tint px-3 py-1.5 text-xs font-bold text-sun-deep">
          <Clock size={13} /> {lesson.minutes} хв
        </span>
      </div>

      <h1 className="mb-2 font-display text-[28px] font-bold sm:text-[34px]">{lesson.title}</h1>
      {lesson.validAsOf && (
        <p className="mb-8 text-xs font-semibold text-ink-mute">
          Актуально станом на {new Date(lesson.validAsOf).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      )}
      {!lesson.validAsOf && <div className="mb-8" />}

      <div className="flex flex-col gap-7">
        {lesson.blocks.map((block, i) => (
          <BlockRenderer key={i} block={block} />
        ))}
      </div>

      <ClayCard className="mt-9 text-center">
        <h2 className="mb-1.5 text-lg font-bold">Готові рухатись далі?</h2>
        {lesson.nextLesson && (
          <p className="mb-5 text-sm text-ink-soft">
            Наступний урок: {lesson.nextLesson.title} · {lesson.nextLesson.minutes} хв
          </p>
        )}
        <Button
          variant="green"
          size="lg"
          disabled={complete.isPending}
          onClick={() => complete.mutate()}
        >
          <Check size={18} /> {complete.isPending ? 'Зберігаємо…' : 'Завершити урок'}
        </Button>
      </ClayCard>

      <LessonComments lessonId={id} />
    </article>
  );
}

function BlockRenderer({ block }: { block: LessonBlock }) {
  switch (block.type) {
    case 'text':
      return (
        <div
          className="prose-lesson text-[17px] leading-[1.7] [&_p]:mb-4"
          dangerouslySetInnerHTML={{ __html: block.html }}
        />
      );
    case 'trafficLight':
      return <TrafficLightBlock categories={block.categories} />;
    case 'pair':
      return <PairBlock danger={block.danger} safe={block.safe} />;
    case 'redact':
      return <RedactBlock block={block} />;
    case 'check':
      return <CheckBlock block={block} />;
    case 'video':
      return <VideoBlock url={block.url} caption={block.caption} />;
    default:
      return null;
  }
}

function isDirectVideoFile(url: string): boolean {
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
}

function toEmbedUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtube.com') || parsed.hostname.includes('youtu.be')) {
      const id = parsed.hostname.includes('youtu.be')
        ? parsed.pathname.slice(1)
        : (parsed.searchParams.get('v') ?? '');
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : url;
    }
    if (parsed.hostname.includes('vimeo.com')) {
      const id = parsed.pathname.split('/').filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : url;
    }
    return url;
  } catch {
    return url;
  }
}

function VideoBlock({ url, caption }: { url: string; caption?: string }) {
  return (
    <figure>
      <div className="relative aspect-video overflow-hidden rounded-[26px] bg-ink">
        {isDirectVideoFile(url) ? (
          <video src={url} controls className="h-full w-full" />
        ) : (
          <iframe
            src={toEmbedUrl(url)}
            title={caption ?? 'Відео уроку'}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
      </div>
      {caption && <figcaption className="mt-2.5 text-sm text-ink-soft">{caption}</figcaption>}
    </figure>
  );
}

type TrafficLightBlockType = Extract<LessonBlock, { type: 'trafficLight' }>;

function TrafficLightBlock({ categories }: { categories: TrafficLightBlockType['categories'] }) {
  const ICONS = [<TlSafe key="s" size={22} />, <TlCaution key="c" size={22} />, <TlForbid key="f" size={22} />];
  const COLORS = ['green', 'amber', 'red'] as const;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {categories.map((cat, i) => (
        <ClayCard key={cat.label} variant={COLORS[i]} padding="sm">
          <Orb size="sm" color={COLORS[i]} className="mb-3">
            {ICONS[i]}
          </Orb>
          <h3 className="font-display text-lg font-bold">{cat.label}</h3>
          <p className="mt-1.5 text-sm font-medium">{cat.description}</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-sm font-medium">
            {cat.examples.map((ex) => (
              <li key={ex} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-current opacity-50" />
                {ex}
              </li>
            ))}
          </ul>
        </ClayCard>
      ))}
    </div>
  );
}

function PairBlock({
  danger,
  safe,
}: {
  danger: { note: string; example: string };
  safe: { note: string; example: string };
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <ClayCard variant="red" padding="sm">
        <p className="mb-2.5 flex items-center gap-2 font-bold">
          <TlForbid size={18} /> Ніколи так не робіть
        </p>
        <p className="mb-3 text-sm">{danger.note}</p>
        <pre className="rounded-2xl bg-surface/60 p-3.5 font-mono text-[13px] whitespace-pre-wrap">{danger.example}</pre>
      </ClayCard>
      <ClayCard variant="green" padding="sm">
        <p className="mb-2.5 flex items-center gap-2 font-bold">
          <TlSafe size={18} /> Ось як безпечно
        </p>
        <p className="mb-3 text-sm">{safe.note}</p>
        <pre className="rounded-2xl bg-surface/60 p-3.5 font-mono text-[13px] whitespace-pre-wrap">{safe.example}</pre>
      </ClayCard>
    </div>
  );
}

function RedactBlock({ block }: { block: LessonBlock & { type: 'redact' } }) {
  const [redacted, setRedacted] = useState<Record<number, boolean>>({});
  const [feedback, setFeedback] = useState<{ tone: 'green' | 'amber' | 'red'; text: string } | null>(null);

  const piiIndices = block.segments
    .map((s, i) => (('redactable' in s && s.redactable && s.pii) ? i : -1))
    .filter((i) => i !== -1);
  const extraIndices = block.segments
    .map((s, i) => ('redactable' in s && s.redactable && !s.pii ? i : -1))
    .filter((i) => i !== -1);

  function check() {
    const missed = piiIndices.filter((i) => !redacted[i]).length;
    const extra = extraIndices.filter((i) => redacted[i]).length;
    if (missed === 0 && extra === 0) {
      setFeedback({ tone: 'green', text: `Ідеально! Усі ${piiIndices.length} знайдено, зайвого не сховано.` });
    } else if (missed > 0) {
      setFeedback({ tone: 'red', text: `Пропущено ${missed}. Перевірте контакти та номер справи.` });
    } else {
      setFeedback({
        tone: 'amber',
        text: `Знайдено все, але ${extra} сховано даремно. Це службова інформація — вона потрібна для якісної відповіді.`,
      });
    }
  }

  return (
    <ClayCard>
      <div className="mb-4 flex items-center gap-3">
        <Orb size="sm" color="amber">
          <TlCaution size={18} />
        </Orb>
        <h3 className="font-display text-lg font-bold">Вправа: підготуйте документ</h3>
      </div>
      <p className="mb-5 text-[15px] text-ink-soft">{block.intro}</p>

      <div className="rounded-[26px] bg-paper-2 p-6 leading-[2]">
        <p className="mb-3.5 text-center text-xs font-bold tracking-wide text-ink-mute uppercase">
          {block.letterhead}
        </p>
        <p className="text-[15px]">
          {block.segments.map((seg, i) =>
            'redactable' in seg && seg.redactable ? (
              <RedactWord
                key={i}
                redacted={!!redacted[i]}
                onToggle={() => setRedacted((r) => ({ ...r, [i]: !r[i] }))}
              >
                {seg.text}
              </RedactWord>
            ) : (
              <span key={i}>{seg.text}</span>
            ),
          )}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3.5">
        <Button variant="blue" size="sm" onClick={check}>
          Перевірити
        </Button>
        {feedback && (
          <p
            className={`text-sm font-semibold ${
              feedback.tone === 'green' ? 'text-green-deep' : feedback.tone === 'red' ? 'text-red-deep' : 'text-amber-deep'
            }`}
          >
            {feedback.text}
          </p>
        )}
      </div>
    </ClayCard>
  );
}

function CheckBlock({ block }: { block: LessonBlock & { type: 'check' } }) {
  const [picked, setPicked] = useState<number | null>(null);

  function stateFor(i: number): QuizOptionState {
    if (picked === null) return 'idle';
    if (i === block.correctIndex) return 'correct';
    if (i === picked) return 'wrong';
    return 'idle';
  }

  return (
    <ClayCard variant="tint">
      <div className="mb-4 flex items-center gap-3">
        <p className="text-xs font-bold tracking-wide text-ink-mute uppercase">Перевірте себе · не оцінюється</p>
      </div>
      <p className="mb-4 text-base font-semibold">{block.question}</p>
      <div className="flex flex-col gap-2.5">
        {block.options.map((opt, i) => (
          <QuizOption
            key={opt}
            index={i}
            text={opt}
            state={stateFor(i)}
            disabled={picked !== null}
            onSelect={() => setPicked(i)}
          />
        ))}
      </div>
      {picked !== null && (
        <p className={`mt-3.5 text-sm font-medium ${picked === block.correctIndex ? 'text-green-deep' : 'text-amber-deep'}`}>
          {picked === block.correctIndex ? block.explainCorrect : block.explainWrong}
        </p>
      )}
    </ClayCard>
  );
}
