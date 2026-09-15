import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

import { C, R, SPRING, SPRING_SOFT, clay } from '../theme';
import { HEAD, TEXT } from '../lesson/ui';
import { SCREEN } from '../lesson/layout';

/**
 * Накладки поверх запису екрана — тільки для трейлера 1.1.
 *
 * Чому не ті самі, що в решті уроків. Там підпис кроку відповідає на питання
 * «де я в інструкції». Тут інструкції немає: глядач дивиться три історії
 * підряд, і йому треба знати не крок, а ЯКА ЗАДАЧА і СКІЛЬКИ ВОНА КОШТУЄ.
 * Тому замість «Крок 3. Що ми отримали» — «Задача 2» і цінник у куті.
 *
 * Правило на всі накладки цього ролика: жодна не тримається довше, ніж
 * потрібно, щоб її прочитати один раз. Постійна плашка з часом висіла б
 * рекламним банером; вона з'являється на початку задачі, показує ціну й іде.
 */

const rise = (frame: number, fps: number, delay = 0, config = SPRING) =>
  spring({ frame: frame - delay, fps, config, durationInFrames: 24 });

/** Плавне зникнення за N кадрів до кінця власної секвенції. */
const fadeTail = (frame: number, total: number, tail = 12) =>
  interpolate(frame, [total - tail, total], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

/**
 * Заголовок задачі — угорі ліворуч, весь час, поки триває задача.
 *
 * Номер окремою круглою плашкою, а не «Задача 2.» текстом: у трьох історіях
 * поспіль глядач має схопити номер периферійним зором, не читаючи рядок.
 */
export const TaskChip: React.FC<{ index: number; label: string }> = ({ index, label }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = rise(frame, fps, 4, SPRING_SOFT);

  return (
    <div
      style={{
        position: 'absolute',
        top: SCREEN.y + 26,
        left: SCREEN.x + 26,
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        padding: '14px 30px 14px 14px',
        borderRadius: R.pill,
        background: C.white,
        boxShadow: clay(0.8),
        opacity: enter * fadeTail(frame, durationInFrames),
        transform: `translateX(${interpolate(enter, [0, 1], [-46, 0])}px)`,
      }}
    >
      <span
        style={{
          width: 46,
          height: 46,
          borderRadius: R.pill,
          background: C.blue,
          color: C.white,
          fontFamily: HEAD,
          fontSize: 28,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {index}
      </span>
      <span style={{ fontFamily: HEAD, fontSize: 32, fontWeight: 700, color: C.ink }}>{label}</span>
    </div>
  );
};

/**
 * Цінник задачі — угорі праворуч.
 *
 * Показує, скільки задача коштує «як зазвичай», і наприкінці задачі
 * перекреслюється новим числом. Це той самий жест, що на підсумковій дошці,
 * тільки всередині історії: глядач бачить обіцянку виконаною одразу, а не
 * через три хвилини.
 *
 * `flipAt` — кадр усередині секвенції, на якому міняється число. Немає —
 * цінник просто висить зі старим часом.
 */
export const PriceChip: React.FC<{ was: string; now?: string; flipAt?: number }> = ({ was, now, flipAt }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = rise(frame, fps, 8, SPRING_SOFT);

  const flip = flipAt === undefined
    ? 0
    : spring({ frame: frame - flipAt, fps, config: SPRING, durationInFrames: 26 });

  return (
    <div
      style={{
        position: 'absolute',
        top: SCREEN.y + 26,
        right: SCREEN.x + 26,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 28px',
        borderRadius: R.pill,
        background: flip > 0.5 ? C.greenTint : C.white,
        boxShadow: clay(0.8),
        opacity: enter * fadeTail(frame, durationInFrames),
        transform: `translateX(${interpolate(enter, [0, 1], [46, 0])}px) scale(${interpolate(flip, [0, 0.5, 1], [1, 1.06, 1])})`,
      }}
    >
      <span
        style={{
          fontFamily: HEAD,
          fontSize: 32,
          fontWeight: 700,
          color: flip > 0.35 ? C.inkMute : C.ink,
          textDecoration: flip > 0.35 ? 'line-through' : 'none',
        }}
      >
        {was}
      </span>
      {now ? (
        <span
          style={{
            fontFamily: HEAD,
            fontSize: 36,
            fontWeight: 700,
            color: C.green,
            opacity: interpolate(flip, [0.4, 0.8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            marginLeft: interpolate(flip, [0.4, 0.8], [-40, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}
        >
          {now}
        </span>
      ) : null}
    </div>
  );
};

/**
 * Картка-шпаргалка внизу кадру.
 *
 * Потрібна рівно в одному місці ролика — коли на екрані вже не зведення, а
 * відкрите джерело, і треба порівняти число з тим, яке помічник назвав
 * пів хвилини тому. Тримати його в голові глядач не зобов'язаний: якщо для
 * розуміння кадру треба щось пам'ятати, це треба показати.
 *
 * Стоїть унизу ліворуч — там, де на сторінці звіту поле, а не текст.
 */
export const PinnedFact: React.FC<{ kicker: string; value: string; note?: string }> = ({ kicker, value, note }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = rise(frame, fps, 0, SPRING_SOFT);

  return (
    <div
      style={{
        position: 'absolute',
        left: SCREEN.x + 34,
        top: SCREEN.y + SCREEN.height - 210,
        padding: '22px 34px',
        borderRadius: R.lg,
        background: C.white,
        border: `3px solid ${C.sun}`,
        boxShadow: clay(1),
        opacity: enter * fadeTail(frame, durationInFrames, 14),
        transform: `translateY(${interpolate(enter, [0, 1], [24, 0])}px)`,
      }}
    >
      <div style={{ fontFamily: TEXT, fontSize: 24, fontWeight: 600, color: C.sunDeep, letterSpacing: 0.3 }}>
        {kicker}
      </div>
      <div style={{ marginTop: 8, fontFamily: HEAD, fontSize: 44, fontWeight: 700, color: C.ink }}>{value}</div>
      {note ? (
        <div style={{ marginTop: 6, fontFamily: TEXT, fontSize: 24, color: C.inkMute }}>{note}</div>
      ) : null}
    </div>
  );
};

/**
 * Значок прискорення — той самий сенс, що в решті уроків, інше місце.
 *
 * У цьому ролику правий верхній кут зайнятий цінником, тому значок стоїть під
 * ним. Прибрати його не можна: мовчазне прискорення читається як «у мене
 * вийшло миттєво», і людина потім дивується, чому в неї не так.
 */
export const PromoSpeedBadge: React.FC<{ speed: number }> = ({ speed }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  if (speed <= 1) return null;

  const enter = rise(frame, fps, 12);

  return (
    <div
      style={{
        position: 'absolute',
        top: SCREEN.y + 118,
        right: SCREEN.x + 26,
        padding: '10px 24px',
        borderRadius: R.pill,
        background: C.sunTint,
        border: `2px solid ${C.sun}`,
        color: C.sunDeep,
        fontFamily: HEAD,
        fontSize: 26,
        fontWeight: 700,
        opacity: enter * fadeTail(frame, durationInFrames),
        transform: `scale(${interpolate(enter, [0, 1], [0.82, 1])})`,
      }}
    >
      ×{String(speed).replace('.', ',')} прискорено
    </div>
  );
};

/**
 * Субтитр на світлій дошці.
 *
 * Той самий слот унизу кадру, що й у субтитрів над записом екрана, — інакше
 * текст стрибав би по екрану щоразу, коли ролик переходить із дошки на запис
 * і назад. Різниця лише в кольорах: на кремовому папері світлий текст із
 * темної сцени не видно взагалі.
 *
 * Плашка під текстом напівпрозора, а не суцільна: суцільна читалась би як ще
 * один елемент дошки, а субтитр елементом композиції не є.
 */
export const PaperSubtitle: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const enter = rise(frame, fps, 0, SPRING_SOFT);
  const alpha = enter * fadeTail(frame, durationInFrames, 8);

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 26,
        display: 'flex',
        justifyContent: 'center',
        padding: '0 140px',
        opacity: alpha,
        transform: `translateY(${interpolate(enter, [0, 1], [10, 0])}px)`,
      }}
    >
      <div
        style={{
          padding: '14px 34px',
          borderRadius: R.pill,
          background: 'rgba(255,255,255,.82)',
          fontFamily: TEXT,
          fontSize: 32,
          lineHeight: 1.34,
          fontWeight: 500,
          color: C.ink,
          textAlign: 'center',
        }}
      >
        {text}
      </div>
    </div>
  );
};
