'use client';

import { Fragment, useId, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Lesson, LessonBlock } from '@proai/types';
import { ArrowLeft, Check, Clock, Copy, Doc, Lock, Play, Spark, TlCaution, TlForbid, TlSafe, Upload } from '@proai/icons';
import {
  Button,
  ClayCard,
  Orb,
  PromptBlock,
  QuizOption,
  type QuizOptionState,
  RedactWord,
} from '@proai/ui';
import { api } from '@/lib/api-client';
import { useFireConfetti } from '@/components/confetti-provider';
import { LessonComments } from '@/components/lesson-comments';
import { LessonSkeleton } from '@/components/lesson-skeleton';

/**
 * Урок лишається клієнтським: тут стан мікроперевірок, тренажери, мутації
 * прогресу й конфеті. Але сам урок приходить готовим з серверного компонента
 * (`initialLesson`) — раніше сторінка вантажила JS і аж потім питала
 * /api/lessons/<id>, через що текст уроку зʼявлявся помітно пізніше за каркас.
 *
 * `demo` — гостьовий показ на `/demo`: той самий урок, але без жодного запиту
 * до API. Немає повторного завантаження, завершення, коментарів і виходу до
 * модуля; повернутися можна лише на головну, а внизу — запрошення зареєструватися.
 */
export function LessonClient({
  id,
  initialLesson,
  demo = false,
}: {
  id: string;
  initialLesson: Lesson;
  demo?: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fireConfetti = useFireConfetti();

  const { data, isLoading } = useQuery({
    queryKey: ['lessons', id],
    queryFn: () => api.get<{ lesson: Lesson }>(`/api/lessons/${id}`),
    initialData: { lesson: initialLesson },
    // Гість не має сесії: /api/lessons відповів би 401, і урок змінився б на помилку.
    enabled: !demo,
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
  /* Завершення уроку блокують не лише питання, а й тренажери: сортувальник, картки,
     конструктор, пошук помилок. Усі вони повідомляють про успіх через `onSolved`, тому
     рахувати треба саме їх, а не самі `check` — інакше пройдений тренажер «зараховувався б»
     замість неотвіченого питання. */
  const gatedCount = lesson.blocks.filter((b) => GATED_TYPES.has(b.type)).length;
  const solvedCount = Object.values(solved).filter(Boolean).length;
  const checksPassed = gatedCount === 0 || solvedCount === gatedCount;

  return (
    <article className="mx-auto max-w-[720px] pt-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href={demo ? '/' : `/module/${lesson.moduleSlug}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-surface px-4 py-2 text-sm font-semibold text-ink-soft shadow-[0_9px_18px_-9px_rgba(38,34,74,0.14)]"
        >
          <ArrowLeft size={14} /> {demo ? 'На головну' : lesson.moduleTitle}
        </Link>
        {demo && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-tint px-3 py-1.5 text-xs font-bold text-blue-deep">
            <Spark size={13} /> Демо-урок
          </span>
        )}
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

      {demo ? (
        <DemoFinale />
      ) : (
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
              {gatedCount > checkCount ? 'Спершу пройдіть завдання уроку' : 'Спершу дайте відповідь на питання'} —{' '}
              <span className="text-blue-deep">
                {solvedCount} з {gatedCount}
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
      )}

      {!demo && <LessonComments lessonId={id} />}
    </article>
  );
}

/**
 * Кінець демо-уроку замість «Завершити урок» і коментарів: прогрес гостя нікуди
 * не пишеться, тож завершувати нічого. Після реєстрації урок проходиться заново,
 * уже з прогресом.
 */
function DemoFinale() {
  return (
    <ClayCard variant="blue" className="relative mt-9 overflow-hidden !p-9 text-center sm:!p-11">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white">
        <Spark size={13} /> Це був перший урок із 47
      </span>
      <h2 className="mt-4 font-display text-[26px] font-bold text-white sm:text-[32px]">Сподобалось? Далі — вже з вами</h2>
      <p className="mx-auto mt-3 max-w-[46ch] text-[16px] text-white/90">
        Зареєструйтесь, щоб відкрити решту курсу: практику на справжніх документах, правила безпеки, тести й
        сертифікат. Прогрес, збережені промпти та коментарі — у вашому кабінеті.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3.5">
        <Button asChild variant="sun" size="lg">
          <Link href="/register">Зареєструватися</Link>
        </Button>
        <Button asChild variant="ghost" size="lg">
          <Link href="/login">Увійти</Link>
        </Button>
      </div>
      <p className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-white/80">
        <Lock size={13} /> У демо прогрес не зберігається — після реєстрації урок почнеться спочатку.
      </p>
    </ClayCard>
  );
}

/** Блоки, які треба пройти, щоб урок можна було завершити. */
const GATED_TYPES = new Set<LessonBlock['type']>(['check', 'sort', 'pick', 'builder', 'spot']);

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
    case 'file':
      return <FileBlock block={block} />;
    case 'sort':
      return <SortBlock block={block} onSolved={onSolved} />;
    case 'pick':
      return <PickBlock block={block} onSolved={onSolved} />;
    case 'builder':
      return <BuilderBlock block={block} onSolved={onSolved} />;
    case 'spot':
      return <SpotBlock block={block} onSolved={onSolved} />;
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
/* ============================================================================
   Тренажери. Обидва зараховуються так само, як мікроперевірка: доки не пройдено,
   кнопка «Завершити урок» неактивна. Помилка нічим не карається — показуємо
   пояснення й даємо спробувати ще раз. Мета навчити, а не відсіяти.
   ========================================================================= */

const TONE: Record<string, string> = {
  green: 'bg-green-tint text-green-deep border-green',
  amber: 'bg-amber-tint text-amber-deep border-amber',
  red: 'bg-red-tint text-red-deep border-red',
  blue: 'bg-blue-tint text-blue-deep border-blue',
};

/** Сортувальник: розкласти фрагменти по категоріях. Кнопки замість перетягування —
    працює з клавіатури й на телефоні. */
function SortBlock({
  block,
  onSolved,
}: {
  block: Extract<LessonBlock, { type: 'sort' }>;
  onSolved?: () => void;
}) {
  const [placed, setPlaced] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);

  const total = block.items.length;
  const allPlaced = Object.keys(placed).length === total;
  const wrong = block.items.filter((it, i) => placed[i] !== it.bucket);
  const solved = checked && wrong.length === 0;

  function check() {
    setChecked(true);
    if (block.items.every((it, i) => placed[i] === it.bucket)) onSolved?.();
  }

  return (
    <ClayCard>
      <div className="mb-4 flex items-center gap-3">
        <Orb size="sm" color={solved ? 'green' : 'blue'}>
          {solved ? <Check size={17} /> : <Spark size={17} />}
        </Orb>
        <span className="text-[11px] font-bold tracking-wide text-ink-mute uppercase">
          Тренажер · {total} фрагментів
        </span>
      </div>
      <p className="mb-5 text-[15px] text-ink-soft">{block.intro}</p>

      <div className="flex flex-col gap-3">
        {block.items.map((item, i) => {
          const isWrong = checked && placed[i] !== item.bucket;
          const isRight = checked && placed[i] === item.bucket;
          return (
            <div
              key={i}
              className={`rounded-[22px] border-[2.5px] p-3.5 transition-colors ${
                isRight ? 'border-green bg-green-tint' : isWrong ? 'border-red bg-red-tint' : 'border-ink/15 bg-paper-2'
              }`}
            >
              <p className="mb-2.5 text-[15px] font-medium">{item.text}</p>
              <div className="flex flex-wrap gap-2">
                {block.buckets.map((b, bi) => (
                  <button
                    key={bi}
                    type="button"
                    disabled={solved}
                    onClick={() => {
                      setPlaced((p) => ({ ...p, [i]: bi }));
                      setChecked(false);
                    }}
                    className={`rounded-full border-[2.5px] px-3.5 py-1.5 text-sm font-bold transition-all ${
                      placed[i] === bi
                        ? TONE[b.tone]
                        : 'border-ink/15 bg-surface text-ink-soft hover:border-ink/40'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
              {isWrong && <p className="mt-2.5 text-sm font-medium text-red-deep">{item.why}</p>}
              {isRight && <p className="mt-2.5 text-sm font-medium text-green-deep">{item.why}</p>}
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3.5">
        {!solved && (
          <Button variant="blue" size="sm" disabled={!allPlaced} onClick={check}>
            Перевірити
          </Button>
        )}
        {!allPlaced && !checked && (
          <span className="text-sm text-ink-mute">
            Розкладено {Object.keys(placed).length} з {total}
          </span>
        )}
        {checked && !solved && (
          <span className="text-sm font-semibold text-amber-deep">
            Правильно {total - wrong.length} з {total}. Виправте позначені й перевірте ще раз.
          </span>
        )}
        {solved && (
          <span className="text-sm font-bold text-green-deep">Усе правильно — рухаємось далі.</span>
        )}
      </div>
    </ClayCard>
  );
}

/** Картки на швидкість: одна за раз, миттєвий фідбек. Помилкові повертаються
    в кінець черги — саме це й робить його тренажером, а не тестом. */
function PickBlock({
  block,
  onSolved,
}: {
  block: Extract<LessonBlock, { type: 'pick' }>;
  onSolved?: () => void;
}) {
  const [queue, setQueue] = useState<number[]>(() => block.cards.map((_, i) => i));
  const [picked, setPicked] = useState<number | null>(null);
  const [done, setDone] = useState(0);
  const [mistakes, setMistakes] = useState(0);

  const total = block.cards.length;
  const head = queue[0];
  const finished = head === undefined;
  const current = head === undefined ? null : (block.cards[head] ?? null);
  const isCorrect = current !== null && picked === current.answer;

  function next() {
    if (head === undefined || current === null) return;
    const rest = queue.slice(1);
    /* Правильно — картка йде геть; помилка — повертається в кінець черги. */
    setQueue(isCorrect ? rest : [...rest, head]);
    if (isCorrect) setDone((d) => d + 1);
    else setMistakes((m) => m + 1);
    if (isCorrect && rest.length === 0) onSolved?.();
    setPicked(null);
  }

  return (
    <ClayCard>
      <div className="mb-4 flex items-center gap-3">
        <Orb size="sm" color={finished ? 'green' : 'blue'}>
          {finished ? <Check size={17} /> : <Spark size={17} />}
        </Orb>
        <span className="text-[11px] font-bold tracking-wide text-ink-mute uppercase">
          Тренажер · {done} з {total}
        </span>
        <span className="ml-auto h-2 w-24 overflow-hidden rounded-full bg-paper-2">
          <span
            className="block h-full rounded-full bg-blue transition-[width] duration-300"
            style={{ width: `${(done / total) * 100}%` }}
          />
        </span>
      </div>

      {!finished && current && (
        <>
          <p className="mb-4 text-[15px] text-ink-soft">{block.intro}</p>
          <div className="mb-4 rounded-[22px] border-[2.5px] border-ink bg-paper-2 p-5">
            <p className="text-[17px] font-semibold">{current.text}</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {block.options.map((opt, i) => (
              <button
                key={i}
                type="button"
                disabled={picked !== null}
                onClick={() => setPicked(i)}
                className={`rounded-full border-[2.5px] px-5 py-2.5 font-bold transition-all ${
                  picked === null
                    ? 'border-ink bg-surface hover:bg-paper-2'
                    : i === current.answer
                      ? 'border-green bg-green-tint text-green-deep'
                      : i === picked
                        ? 'border-red bg-red-tint text-red-deep'
                        : 'border-ink/15 bg-surface text-ink-mute'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          {picked !== null && (
            <div className="mt-4">
              <p className={`text-sm font-medium ${isCorrect ? 'text-green-deep' : 'text-amber-deep'}`}>
                {isCorrect ? '' : 'Не зовсім. '}
                {current.why}
              </p>
              <Button variant="blue" size="sm" className="mt-3.5" onClick={next}>
                {isCorrect ? 'Далі' : 'Далі — повернемось до цієї картки'}
              </Button>
            </div>
          )}
        </>
      )}

      {finished && (
        <p className="text-[15px] font-semibold text-green-deep">
          Пройдено всі {total}
          {mistakes > 0 ? `, з них ${mistakes} — не з першої спроби` : ' з першої спроби'}. Саме такі
          рішення ви ухвалюватимете за секунду в реальній роботі.
        </p>
      )}
    </ClayCard>
  );
}

/** Конструктор промпту: поля за формулою → зібрана заготовка. Знімає страх «чистого
    поля вводу»: людина відповідає на чотири питання, а промпт складається сам. */
function BuilderBlock({
  block,
  onSolved,
}: {
  block: Extract<LessonBlock, { type: 'builder' }>;
  onSolved?: () => void;
}) {
  const [values, setValues] = useState<Record<number, string>>({});
  const [built, setBuilt] = useState(false);

  const required = block.fields
    .map((f, i) => (f.optional ? -1 : i))
    .filter((i) => i !== -1);
  const ready = required.every((i) => (values[i] ?? '').trim().length > 0);

  const assembled = block.fields
    .map((f, i) => {
      const v = (values[i] ?? '').trim();
      if (!v) return '';
      return f.suffix ? `${v} ${f.suffix}` : v;
    })
    .filter(Boolean)
    .join('\n\n');

  function build() {
    setBuilt(true);
    onSolved?.();
  }

  return (
    <ClayCard>
      <div className="mb-4 flex items-center gap-3">
        <Orb size="sm" color={built ? 'green' : 'blue'}>
          {built ? <Check size={17} /> : <Spark size={17} />}
        </Orb>
        <span className="text-[11px] font-bold tracking-wide text-ink-mute uppercase">
          Конструктор · {block.fields.length} поля
        </span>
      </div>
      <p className="mb-5 text-[15px] text-ink-soft">{block.intro}</p>

      <div className="flex flex-col gap-4">
        {block.fields.map((f, i) => (
          <div key={i}>
            <label className="mb-1 block font-display text-[15px] font-bold" htmlFor={`bf-${i}`}>
              {f.label}
              {f.optional && <span className="ml-2 text-xs font-semibold text-ink-mute">за потреби</span>}
            </label>
            <p className="mb-2 text-sm text-ink-soft">{f.hint}</p>
            <textarea
              id={`bf-${i}`}
              rows={2}
              value={values[i] ?? ''}
              placeholder={f.placeholder}
              onChange={(e) => {
                const v = e.target.value;
                setValues((s) => ({ ...s, [i]: v }));
                setBuilt(false);
              }}
              className="w-full resize-y rounded-[18px] border-[2.5px] border-ink/15 bg-paper-2 px-4 py-3 text-[15px] leading-[1.6] placeholder:text-ink-mute focus-visible:border-blue focus-visible:outline-none"
            />
            {f.examples && f.examples.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {f.examples.map((ex, ei) => (
                  <button
                    key={ei}
                    type="button"
                    onClick={() => {
                      setValues((s) => ({ ...s, [i]: ex }));
                      setBuilt(false);
                    }}
                    className="rounded-full border-[2px] border-ink/15 bg-surface px-3 py-1 text-left text-[13px] font-medium text-ink-soft transition-colors hover:border-blue hover:text-blue-deep"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3.5">
        {!built && (
          <Button variant="blue" size="sm" disabled={!ready} onClick={build}>
            Зібрати промпт
          </Button>
        )}
        {!ready && (
          <span className="text-sm text-ink-mute">Заповніть поля, позначені як обовʼязкові.</span>
        )}
      </div>

      {built && (
        <div className="mt-5">
          <p className="mb-2 text-[11px] font-bold tracking-wide text-ink-mute uppercase">
            Ваш промпт
          </p>
          <PromptBlock>{assembled}</PromptBlock>
          {block.outro && <p className="mt-3 text-sm text-ink-soft">{block.outro}</p>}
        </div>
      )}
    </ClayCard>
  );
}

/** Вправа «знайди помилки»: клікаємо підозрілі місця в документі. Серед клікабельних
    фрагментів є приманки — правильні місця, що виглядають підозріло. Без них вправа
    зводилася б до пошуку підсвіченого тексту. */
function SpotBlock({
  block,
  onSolved,
}: {
  block: Extract<LessonBlock, { type: 'spot' }>;
  onSolved?: () => void;
}) {
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [checked, setChecked] = useState(false);

  const flags = block.paragraphs.flatMap((para, pi) =>
    para.map((seg, si) => ('flag' in seg ? { key: `${pi}-${si}`, ...seg } : null)),
  ).filter((f): f is { key: string; text: string; flag: true; wrong: boolean; why: string } => f !== null);

  const errors = flags.filter((f) => f.wrong);
  const found = errors.filter((f) => marked[f.key]).length;
  const falseAlarms = flags.filter((f) => !f.wrong && marked[f.key]).length;
  const solved = checked && found === errors.length && falseAlarms === 0;

  function check() {
    setChecked(true);
    if (errors.every((f) => marked[f.key]) && flags.filter((f) => !f.wrong).every((f) => !marked[f.key])) {
      onSolved?.();
    }
  }

  return (
    <ClayCard>
      <div className="mb-4 flex items-center gap-3">
        <Orb size="sm" color={solved ? 'green' : 'amber'}>
          {solved ? <Check size={17} /> : <TlCaution size={17} />}
        </Orb>
        <span className="text-[11px] font-bold tracking-wide text-ink-mute uppercase">
          Вправа · {errors.length} помилок у документі
        </span>
      </div>
      <p className="mb-5 text-[15px] text-ink-soft">{block.intro}</p>

      <div className="rounded-[26px] bg-paper-2 p-6">
        <p className="mb-4 text-center text-xs font-bold tracking-wide text-ink-mute uppercase">
          {block.docHead}
        </p>
        <div className="flex flex-col gap-3.5 text-[15px] leading-[1.9]">
          {block.paragraphs.map((para, pi) => (
            <p key={pi}>
              {para.map((seg, si) => {
                if (!('flag' in seg)) return <span key={si}>{seg.text}</span>;
                const key = `${pi}-${si}`;
                const on = !!marked[key];
                const verdict = checked
                  ? seg.wrong
                    ? on ? 'hit' : 'missed'
                    : on ? 'false' : 'ok'
                  : null;
                const style =
                  verdict === 'hit'
                    ? 'border-green bg-green-tint text-green-deep'
                    : verdict === 'missed'
                      ? 'border-red bg-red-tint text-red-deep'
                      : verdict === 'false'
                        ? 'border-amber bg-amber-tint text-amber-deep'
                        : on
                          ? 'border-blue bg-blue-tint text-blue-deep'
                          : 'border-transparent bg-ink/[0.06] hover:border-ink/30';
                return (
                  <button
                    key={si}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setMarked((m) => ({ ...m, [key]: !m[key] }));
                      setChecked(false);
                    }}
                    className={`rounded-[10px] border-[2px] px-1 py-0.5 text-left font-medium transition-colors ${style}`}
                  >
                    {seg.text}
                  </button>
                );
              })}
            </p>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3.5">
        {!solved && (
          <Button variant="blue" size="sm" onClick={check}>
            Перевірити
          </Button>
        )}
        {checked && !solved && (
          <span className="text-sm font-semibold text-amber-deep">
            Знайдено {found} з {errors.length}
            {falseAlarms > 0 && `, зайвих позначок — ${falseAlarms}`}. Розбір нижче.
          </span>
        )}
        {solved && (
          <span className="text-sm font-bold text-green-deep">
            Усі {errors.length} знайдено, зайвого не позначено.
          </span>
        )}
      </div>

      {checked && (
        <div className="mt-5 flex flex-col gap-3">
          {flags
            .filter((f) => f.wrong || marked[f.key])
            .map((f) => {
              const hit = f.wrong && marked[f.key];
              const missed = f.wrong && !marked[f.key];
              return (
                <div
                  key={f.key}
                  className={`rounded-[22px] border-[2.5px] p-3.5 ${
                    hit ? 'border-green bg-green-tint' : missed ? 'border-red bg-red-tint' : 'border-amber bg-amber-tint'
                  }`}
                >
                  <p className="mb-1 text-[13px] font-bold uppercase tracking-wide">
                    {hit ? 'Знайдено' : missed ? 'Пропущено' : 'Тут усе гаразд'}
                  </p>
                  <p className="mb-1.5 text-[15px] font-semibold">«{f.text}»</p>
                  <p className="text-sm">{f.why}</p>
                </div>
              );
            })}
        </div>
      )}
    </ClayCard>
  );
}

/** Файл для завантаження: демонстраційний документ, чек-лист, шаблон. */
function FileBlock({ block }: { block: Extract<LessonBlock, { type: 'file' }> }) {
  return (
    <ClayCard padding="sm">
      <div className="flex flex-wrap items-center gap-4">
        <Orb size="default" color="sun">
          <Doc size={22} />
        </Orb>
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold">{block.name}</p>
          {block.note && <p className="mt-0.5 text-sm text-ink-soft">{block.note}</p>}
          {block.meta && <p className="mt-1 text-xs font-semibold text-ink-mute">{block.meta}</p>}
        </div>
        <Button asChild variant="blue" size="sm">
          <a href={block.url} download>
            <Upload size={16} className="rotate-180" /> Завантажити
          </a>
        </Button>
      </div>
    </ClayCard>
  );
}

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
