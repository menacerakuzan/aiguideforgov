'use client';

import { Fragment, use, useId, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Lesson, LessonBlock } from '@yasno/types';
import { ArrowLeft, Check, Clock, Copy, Doc, Play, Spark, TlCaution, TlForbid, TlSafe } from '@yasno/icons';
import {
  Button,
  ClayCard,
  Orb,
  PromptBlock,
  QuizOption,
  type QuizOptionState,
  RedactWord,
} from '@yasno/ui';
import { api } from '@/lib/api-client';
import { useFireConfetti } from '@/components/confetti-provider';
import { LessonComments } from '@/components/lesson-comments';
import { LessonSkeleton } from '@/components/lesson-skeleton';

export default function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const fireConfetti = useFireConfetti();

  const { data, isLoading } = useQuery({
    queryKey: ['lessons', id],
    queryFn: () => api.get<{ lesson: Lesson }>(`/api/lessons/${id}`),
  });

  /* Відповіді на мікроперевірки: ключ — індекс блоку, значення — чи відповіли правильно.
     Тримаємо стан тут, а не в самих картках, бо від нього залежить кнопка «Завершити». */
  const [solved, setSolved] = useState<Record<number, boolean>>({});

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

  if (isLoading || !data) return <LessonSkeleton />;
  const lesson = data.lesson;

  /* Мікроперевірки йдуть наприкінці уроку пачкою. Відбиваємо їх заголовком-роздільником,
     щоб урок не читався як одна нескінченна стрічка карток. */
  const firstCheckIndex = lesson.blocks.findIndex((b) => b.type === 'check');
  const checkNumbers = new Map<number, number>();
  lesson.blocks.forEach((b, i) => {
    if (b.type === 'check') checkNumbers.set(i, checkNumbers.size + 1);
  });
  const checkCount = checkNumbers.size;
  const solvedCount = Object.values(solved).filter(Boolean).length;
  /* Урок без питань завершується вільно; з питаннями — коли на всі є правильна відповідь. */
  const checksPassed = checkCount === 0 || solvedCount === checkCount;

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
          <Fragment key={i}>
            {i === firstCheckIndex && <ChecksHeading count={checkCount} />}
            <BlockRenderer
              block={block}
              checkNumber={block.type === 'check' ? checkNumbers.get(i) : undefined}
              checkTotal={checkCount}
              onSolved={() => setSolved((s) => ({ ...s, [i]: true }))}
            />
          </Fragment>
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
          disabled={complete.isPending || !checksPassed}
          onClick={() => complete.mutate()}
        >
          <Check size={18} /> {complete.isPending ? 'Зберігаємо…' : 'Завершити урок'}
        </Button>

        {!checksPassed && (
          <p className="mt-4 text-sm font-semibold text-ink-soft">
            Спершу дайте відповідь на питання —{' '}
            <span className="text-blue-deep">
              {solvedCount} з {checkCount}
            </span>
            .{' '}
            <button
              type="button"
              className="underline underline-offset-2 hover:text-blue"
              onClick={() =>
                document.getElementById('lesson-checks')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            >
              Перейти до питань
            </button>
          </p>
        )}
      </ClayCard>

      <LessonComments lessonId={id} />
    </article>
  );
}

/** Заголовок-роздільник перед пачкою мікроперевірок наприкінці уроку. */
function ChecksHeading({ count }: { count: number }) {
  return (
    <div id="lesson-checks" className="mt-5 flex scroll-mt-6 flex-col items-center gap-2 text-center">
      <div className="flex w-full items-center gap-3">
        <span className="h-[3px] flex-1 rounded-full bg-ink/15" />
        <span className="font-display text-sm font-extrabold tracking-wide text-ink-soft uppercase">
          Перевірте себе
        </span>
        <span className="h-[3px] flex-1 rounded-full bg-ink/15" />
      </div>
      <p className="text-sm text-ink-mute">
        {count === 1 ? 'Одне коротке питання' : `${count} коротких питання`}, щоб закріпити
        головне. Відповіді не оцінюються.
      </p>
    </div>
  );
}

function BlockRenderer({
  block,
  checkNumber,
  checkTotal,
  onSolved,
}: {
  block: LessonBlock;
  checkNumber?: number;
  checkTotal?: number;
  onSolved?: () => void;
}) {
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
      return (
        <PairBlock
          danger={block.danger}
          safe={block.safe}
          dangerTitle={block.dangerTitle}
          safeTitle={block.safeTitle}
        />
      );
    case 'redact':
      return <RedactBlock block={block} />;
    case 'check':
      return <CheckBlock block={block} number={checkNumber} total={checkTotal} onSolved={onSolved} />;
    case 'video':
      return <VideoBlock block={block} />;
    case 'image':
      return <ImageBlock block={block} />;
    case 'prompt':
      return <LessonPrompt block={block} />;
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

function VideoBlock({ block }: { block: Extract<LessonBlock, { type: 'video' }> }) {
  const { url, caption, note, duration } = block;

  /* Ролика ще немає — показуємо заглушку з описом того, що в ньому буде.
     Це штатний стан під час виробництва курсу, а не помилка контенту. */
  if (!url) {
    return (
      <figure>
        <div className="media-ph media-ph-video">
          <span className="media-ph-badge">
            <Play size={15} /> Відео готується
          </span>
          {note && <p className="media-ph-note">{note}</p>}
          {duration && <span className="media-ph-meta">Орієнтовно {duration}</span>}
        </div>
        {caption && <figcaption className="mt-2.5 text-sm text-ink-soft">{caption}</figcaption>}
      </figure>
    );
  }

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

function ImageBlock({ block }: { block: Extract<LessonBlock, { type: 'image' }> }) {
  const { src, alt, caption, note } = block;

  if (!src) {
    return (
      <figure>
        <div className="media-ph media-ph-image">
          <span className="media-ph-badge">
            <Doc size={15} /> Зображення готується
          </span>
          <p className="media-ph-note">{note ?? alt}</p>
        </div>
        {caption && <figcaption className="mt-2.5 text-sm text-ink-soft">{caption}</figcaption>}
      </figure>
    );
  }

  return (
    <figure>
      {/* eslint-disable-next-line @next/next/no-img-element -- скріншоти уроків лежать
          у /public і не потребують оптимізації next/image */}
      <img
        src={src}
        alt={alt}
        className="w-full rounded-[26px] border-[2.5px] border-ink shadow-[4px_5px_0_0_var(--color-ink)]"
      />
      {caption && <figcaption className="mt-2.5 text-sm text-ink-soft">{caption}</figcaption>}
    </figure>
  );
}

/**
 * Готовий промпт. Синя картка — щоб на око не плутався з мікроперевіркою (та кремова
 * з жовтим орбом). Згортається: наприкінці уроку промптів буває три-чотири підряд, і
 * розгорнуті вони перетворюють підсумок уроку на «простирадло».
 */
function LessonPrompt({ block }: { block: Extract<LessonBlock, { type: 'prompt' }> }) {
  const [open, setOpen] = useState(true);
  const bodyId = useId();

  return (
    <ClayCard padding="sm" style={{ background: 'var(--color-blue-tint)' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={bodyId}
        className="flex w-full items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue focus-visible:ring-offset-2 rounded-2xl"
      >
        <Orb size="sm" color="blue">
          <Copy size={17} />
        </Orb>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-bold tracking-wide text-blue-deep uppercase">
            Готовий промпт
          </span>
          {block.title && <span className="block font-display font-bold">{block.title}</span>}
        </span>
        <span
          className={`flex-none text-blue-deep transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          aria-hidden
        >
          <Chevron />
        </span>
      </button>

      <div
        id={bodyId}
        className="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="pt-4">
            <PromptBlock className="bg-surface">{block.body}</PromptBlock>
            {block.note && <p className="mt-3 text-sm text-ink-soft">{block.note}</p>}
          </div>
        </div>
      </div>
    </ClayCard>
  );
}

function Chevron() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
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
  dangerTitle,
  safeTitle,
}: {
  danger: { note: string; example: string };
  safe: { note: string; example: string };
  dangerTitle?: string;
  safeTitle?: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <ClayCard variant="red" padding="sm">
        <p className="mb-2.5 flex items-center gap-2 font-bold">
          <TlForbid size={18} /> {dangerTitle ?? 'Ніколи так не робіть'}
        </p>
        <p className="mb-3 text-sm">{danger.note}</p>
        <pre className="rounded-2xl bg-surface/60 p-3.5 font-mono text-[13px] whitespace-pre-wrap">{danger.example}</pre>
      </ClayCard>
      <ClayCard variant="green" padding="sm">
        <p className="mb-2.5 flex items-center gap-2 font-bold">
          <TlSafe size={18} /> {safeTitle ?? 'Ось як безпечно'}
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

function CheckBlock({
  block,
  number,
  total,
  onSolved,
}: {
  block: LessonBlock & { type: 'check' };
  number?: number;
  total?: number;
  onSolved?: () => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);

  const answered = picked !== null;
  const isCorrect = picked === block.correctIndex;

  /* Помилка не блокує урок: показуємо пояснення й даємо спробувати ще раз. Питання
     не оцінюється — воно має навчити, а не покарати. Зарахування — за правильну відповідь. */
  function select(i: number) {
    setPicked(i);
    if (i === block.correctIndex) onSolved?.();
  }

  function stateFor(i: number): QuizOptionState {
    if (!answered) return 'idle';
    if (isCorrect && i === block.correctIndex) return 'correct';
    if (!isCorrect && i === picked) return 'wrong';
    return 'idle';
  }

  return (
    <ClayCard variant="tint">
      <div className="mb-4 flex items-center gap-3">
        <Orb size="sm" color={isCorrect ? 'green' : 'sun'}>
          {isCorrect ? <Check size={17} /> : <Spark size={17} />}
        </Orb>
        <span className="text-[11px] font-bold tracking-wide text-ink-mute uppercase">
          {number && total ? `Питання ${number} з ${total}` : 'Питання'}
        </span>
      </div>
      <p className="mb-4 text-base font-semibold">{block.question}</p>
      <div className="flex flex-col gap-2.5">
        {block.options.map((opt, i) => (
          <QuizOption
            key={opt}
            index={i}
            text={opt}
            state={stateFor(i)}
            disabled={isCorrect}
            onSelect={() => select(i)}
          />
        ))}
      </div>
      {answered && (
        <div className="mt-3.5">
          <p className={`text-sm font-medium ${isCorrect ? 'text-green-deep' : 'text-amber-deep'}`}>
            {isCorrect ? block.explainCorrect : block.explainWrong}
          </p>
          {!isCorrect && (
            <button
              type="button"
              className="mt-2.5 text-sm font-bold text-blue underline underline-offset-2 hover:text-blue-deep"
              onClick={() => setPicked(null)}
            >
              Спробувати ще раз
            </button>
          )}
        </div>
      )}
    </ClayCard>
  );
}
