import { AbsoluteFill, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Audio } from '@remotion/media';

import { C, FPS, R, SPRING, SPRING_SOFT, clay } from '../theme';
import { HEAD, TEXT } from '../lesson/ui';
import { CAPTION_BAND } from '../lesson/layout';
import { BrandMark } from './BrandMark';

const f = (sec: number) => Math.round(sec * FPS);

export type Task = {
  /** Назва задачі — та сама, що потім стоїть підписом над записом екрана. */
  label: string;
  /** Скільки це забирає зазвичай, у хвилинах. */
  was: number;
  /** Скільки з помічником, у хвилинах. */
  now: number;
  /** Підпис часу «як зазвичай»: «≈40 хв», «≈2 год». */
  wasText: string;
  nowText: string;
};

export const TASKS: Task[] = [
  { label: 'Лист-відповідь на звернення', was: 40, now: 10, wasText: '≈40 хв', nowText: '≈10 хв' },
  { label: 'Зведення звіту на 48 сторінок', was: 120, now: 15, wasText: '≈2 год', nowText: '≈15 хв' },
  { label: 'Протокол наради із запису', was: 90, now: 15, wasText: '≈1,5 год', nowText: '≈15 хв' },
];

/**
 * Шкала часу — спільна для всіх трьох рядків.
 *
 * Сіра доріжка завшди однакова й дорівнює найдовшій задачі (дві години), а
 * синя заливка — частка від неї. Перша версія малювала всі три смуги на всю
 * ширину — і дошка брехала: сорок хвилин і дві години виглядали однаково,
 * хоча сама дошка саме про те, що це різні величини.
 */
const TRACK = 540;
const MAX_MIN = Math.max(...TASKS.map((t) => t.was));

/**
 * Рядок задачі.
 *
 * Один візуальний словник на обидві дошки — на початку («скільки це коштує
 * зараз») і в кінці («скільки коштуватиме»). Якби дошки виглядали по-різному,
 * глядач не впізнав би в кінці ті самі три задачі й не зчитав би порівняння.
 */
const Row: React.FC<{
  task: Task;
  /** Кадр, з якого рядок з'їжджає в кадр. */
  at: number;
  /** Кадр, на якому смуга стискається до «стало». Немає — дошка вступна. */
  shrinkAt?: number;
}> = ({ task, at, shrinkAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame: frame - at, fps, config: SPRING_SOFT, durationInFrames: 26 });

  // Стискання смуги — окрема, помітно повільніша дуга: це головна подія дошки,
  // і вона має читатись як рух, а не як підміна кадру.
  const shrink = shrinkAt === undefined
    ? 0
    : spring({ frame: frame - shrinkAt, fps, config: { damping: 200, mass: 1.1, stiffness: 70 }, durationInFrames: 40 });

  const fill = interpolate(
    shrink,
    [0, 1],
    [(task.was / MAX_MIN) * TRACK, (task.now / MAX_MIN) * TRACK],
  );

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 28,
        opacity: enter,
        transform: `translateX(${interpolate(enter, [0, 1], [-70, 0])}px)`,
      }}
    >
      <div
        style={{
          width: 520,
          fontFamily: TEXT,
          fontSize: 31,
          fontWeight: 500,
          color: C.ink,
          // Назва має стояти в один рядок: перенесена надвоє розвалює
          // вертикальний ритм таблиці — рядки перестають бути однаковими.
          whiteSpace: 'nowrap',
        }}
      >
        {task.label}
      </div>

      <div
        style={{
          width: TRACK,
          height: 34,
          borderRadius: R.pill,
          background: C.paper2,
          boxShadow: `inset 0 2px 0 rgba(38,34,74,.07)`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: fill,
            height: '100%',
            borderRadius: R.pill,
            background: shrink > 0.5 ? C.green : C.blue,
            // Колір міняється на середині стискання, а не на початку: спершу
            // глядач бачить рух, і лише коли рух прочитано — що це «добре».
            transition: 'none',
          }}
        />
      </div>

      {/* Час: у вступній дошці одне число, у підсумковій — старе закреслене
          й нове поруч. Обидва варіанти займають те саме місце, тому рядок не
          «стрибає» між дошками. */}
      {/* Ширина з запасом і nowrap: «≈40 хв», перенесене на два рядки,
          рве лінію закреслення навпіл — і читається як зламана верстка. */}
      <div style={{ width: 400, display: 'flex', alignItems: 'baseline', gap: 18, whiteSpace: 'nowrap' }}>
        <span
          style={{
            fontFamily: HEAD,
            fontSize: 42,
            fontWeight: 700,
            color: shrink > 0.35 ? C.inkMute : C.ink,
            textDecoration: shrink > 0.35 ? 'line-through' : 'none',
          }}
        >
          {task.wasText}
        </span>
        {shrinkAt !== undefined ? (
          <span
            style={{
              fontFamily: HEAD,
              fontSize: 46,
              fontWeight: 700,
              color: C.green,
              opacity: interpolate(shrink, [0.45, 0.8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            }}
          >
            {task.nowText}
          </span>
        ) : null}
      </div>
    </div>
  );
};

const Board: React.FC<{
  kicker: string;
  title: string;
  children: React.ReactNode;
  tint: string;
}> = ({ kicker, title, children, tint }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const card = spring({ frame, fps, config: SPRING_SOFT, durationInFrames: 26 });

  /*
   * Затухання наприкінці смуги НЕМАЄ — навмисно.
   *
   * Спершу кожна смуга гасила себе за пів секунди до кінця. Але під нею в
   * цей момент немає наступної сцени: запис екрана починається рівно там,
   * де смуга закінчується. Тому крізь напівпрозору картку прозирала темна
   * сцена, і на стику виходив провал у чорне — на готовому рендері це
   * видно як три помітні кліпи (5, 8 і 26 секунда, яскравість падала до
   * 23 із 255).
   *
   * Стик встик виглядає як зміна кадру, а не як збій, і саме його вимагає
   * стандарт (STANDARD.md §3, «Провал у чорне на стику кроків»).
   */

  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <AbsoluteFill style={{ background: `radial-gradient(64% 58% at 50% 42%, ${tint} 0%, ${C.paper} 76%)` }} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingBottom: CAPTION_BAND }}>
        <div
          style={{
            width: 1740,
            padding: '60px 72px',
            borderRadius: R.xl,
            background: C.white,
            boxShadow: clay(1.3),
            opacity: card,
            transform: `translateY(${interpolate(card, [0, 1], [30, 0])}px)`,
          }}
        >
          <div
            style={{
              display: 'inline-block',
              padding: '10px 26px',
              borderRadius: R.pill,
              background: C.blueTint,
              color: C.blueDeep,
              fontFamily: TEXT,
              fontSize: 28,
              fontWeight: 600,
            }}
          >
            {kicker}
          </div>
          <div style={{ marginTop: 22, fontFamily: HEAD, fontSize: 60, fontWeight: 700, color: C.ink }}>
            {title}
          </div>
          <div style={{ marginTop: 46, display: 'flex', flexDirection: 'column', gap: 30 }}>{children}</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/**
 * Вступна дошка: три задачі й скільки вони коштують зараз.
 *
 * Стоїть перед демонстрацією, бо інакше нема з чим порівнювати. Урок
 * починається з проблеми, а не з інструмента — окрема вимога до всіх роликів
 * курсу.
 *
 * Рядки заходять із прискоренням (кожен наступний швидше), а підсумок падає
 * після паузи: пауза й робить його вагомим (aesthetic-rules R2).
 */
export const ProblemBoard: React.FC<{ durationSec: number }> = ({ durationSec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 22, 40, 54 — інтервали 18 і 14 кадрів: рядки приходять дедалі швидше.
  const AT = [22, 40, 54];
  const SUM_AT = 76;

  const sum = spring({ frame: frame - SUM_AT, fps, config: SPRING, durationInFrames: 30 });

  return (
    <>
      <Board kicker="Один звичайний тиждень" title="Три задачі, які роблять усі" tint={C.sunTint}>
        {TASKS.map((t, i) => (
          <Row key={t.label} task={t} at={AT[i]} />
        ))}

        <div style={{ height: 2, background: C.paper2, margin: '14px 0 4px' }} />

        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 20,
            opacity: sum,
            transform: `translateY(${interpolate(sum, [0, 1], [16, 0])}px)`,
          }}
        >
          <span style={{ fontFamily: TEXT, fontSize: 38, fontWeight: 500, color: C.inkSoft }}>Разом:</span>
          <span style={{ fontFamily: HEAD, fontSize: 76, fontWeight: 700, color: C.ink }}>≈4 години</span>
          <span style={{ fontFamily: TEXT, fontSize: 34, color: C.inkMute }}>щотижня</span>
        </div>
      </Board>

      {AT.map((a, i) => (
        <Sequence key={i} from={a} durationInFrames={f(0.9)} name={`рядок ${i + 1}`}>
          <Audio src={staticFile('audio/sfx/paper-slide.mp3')} volume={0.2} />
        </Sequence>
      ))}
      <Sequence from={SUM_AT} durationInFrames={f(1.4)} name="підсумок">
        <Audio src={staticFile('audio/sfx/hit-weak.mp3')} volume={0.24} />
      </Sequence>
    </>
  );
};

/**
 * Підсумкова дошка: ті самі три рядки, у яких смуги стискаються.
 *
 * Ті самі задачі в тому самому порядку й на тих самих місцях — тому стискання
 * читається як відповідь на питання, поставлене на початку ролика, а не як
 * новий кадр із новими числами.
 */
export const ResultBoard: React.FC<{ durationSec: number }> = ({ durationSec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const SHRINK = [16, 34, 52];
  const SUM_AT = 86;

  const sum = spring({ frame: frame - SUM_AT, fps, config: SPRING, durationInFrames: 32 });

  return (
    <>
      <Board kicker="Ті самі три задачі" title="Скільки це коштує тепер" tint={C.greenTint}>
        {TASKS.map((t, i) => (
          <Row key={t.label} task={t} at={i * 4} shrinkAt={SHRINK[i]} />
        ))}

        <div style={{ height: 2, background: C.paper2, margin: '14px 0 4px' }} />

        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 20,
            opacity: sum,
            transform: `translateY(${interpolate(sum, [0, 1], [16, 0])}px)`,
          }}
        >
          <span style={{ fontFamily: TEXT, fontSize: 38, fontWeight: 500, color: C.inkSoft }}>Разом:</span>
          <span
            style={{
              fontFamily: HEAD,
              fontSize: 60,
              fontWeight: 700,
              color: C.inkMute,
              textDecoration: 'line-through',
            }}
          >
            ≈4 години
          </span>
          <span style={{ fontFamily: HEAD, fontSize: 42, color: C.inkMute }}>→</span>
          <span style={{ fontFamily: HEAD, fontSize: 84, fontWeight: 700, color: C.green }}>≈40 хвилин</span>
        </div>
      </Board>

      {SHRINK.map((a, i) => (
        <Sequence key={i} from={a} durationInFrames={f(1.2)} name={`стискання ${i + 1}`}>
          <Audio src={staticFile('audio/sfx/clock-knob-spin.mp3')} volume={0.5} />
        </Sequence>
      ))}
      <Sequence from={SUM_AT} durationInFrames={f(2)} name="підсумок">
        <Audio src={staticFile('audio/sfx/chime-crystal.mp3')} volume={0.24} />
      </Sequence>
    </>
  );
};

/**
 * Фінальний титр: думка, заради якої знято весь ролик, і знак курсу.
 *
 * Формулювання те саме, що в тексті уроку й у бібліотеці принципів — глядач
 * має зустріти його ще двічі й упізнати.
 */
export const BrandOutro: React.FC<{ durationSec: number; next: string }> = ({ durationSec, next }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const quote = spring({ frame, fps, config: SPRING_SOFT, durationInFrames: 30 });
  const rule = spring({ frame: frame - 26, fps, config: SPRING, durationInFrames: 26 });
  const tail = spring({ frame: frame - 54, fps, config: SPRING, durationInFrames: 26 });

  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <AbsoluteFill style={{ background: `radial-gradient(58% 52% at 50% 44%, ${C.sunTint} 0%, ${C.paper} 74%)` }} />

      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingBottom: CAPTION_BAND }}>
        <div
          style={{
            width: 1320,
            textAlign: 'center',
            opacity: quote,
            transform: `translateY(${interpolate(quote, [0, 1], [26, 0])}px)`,
          }}
        >
          <div style={{ fontFamily: HEAD, fontSize: 72, fontWeight: 700, color: C.ink, lineHeight: 1.24 }}>
            ШІ готує чернетку —<br />підписуєте ви
          </div>
          <div
            style={{
              height: 5,
              width: interpolate(rule, [0, 1], [0, 220]),
              background: C.sun,
              borderRadius: R.pill,
              margin: '34px auto 0',
            }}
          />
        </div>

        <div
          style={{
            marginTop: 74,
            display: 'flex',
            alignItems: 'center',
            gap: 22,
            opacity: tail,
            transform: `translateY(${interpolate(tail, [0, 1], [18, 0])}px)`,
          }}
        >
          <BrandMark size={62} delay={56} />
          <span style={{ fontFamily: HEAD, fontSize: 44, fontWeight: 700, color: C.ink }}>ПРО.ШІ</span>
          <span style={{ fontFamily: TEXT, fontSize: 32, color: C.inkMute }}>·</span>
          <span style={{ fontFamily: TEXT, fontSize: 32, color: C.inkSoft }}>Далі: {next}</span>
        </div>
      </AbsoluteFill>

      <Sequence from={0} durationInFrames={f(2.4)} name="цитата">
        <Audio src={staticFile('audio/sfx/light-aura.mp3')} volume={0.18} />
      </Sequence>
    </AbsoluteFill>
  );
};
