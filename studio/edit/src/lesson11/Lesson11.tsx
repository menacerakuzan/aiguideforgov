import { AbsoluteFill, Sequence, staticFile } from 'remotion';
import { Audio } from '@remotion/media';

import { Clip } from '../lesson/LessonVideo';
import { Focus, Progress, Subtitle } from '../lesson/ui';
import { STAGE, onScreen } from '../lesson/layout';
import { TASKS } from '../parts/TimeBoard';
import facts from '../facts-1-1.json';
import { IntroBand, OutroBand, ProblemBand, ResultBand } from './bands';
import { HEAD_SEC, INTRO_SEC, OUTRO_SEC, PROBLEM_SEC, RESULT_SEC, TITLE_SEC, fr } from './boards';
import { Music } from './music';
import { PinnedFact, PriceChip, PromoSpeedBadge, TaskChip } from './promo';
import { FADE_SEC, PLAN, TOTAL } from './plan';

/**
 * Урок 1.1 — трейлер курсу.
 *
 * Будова: брендові смуги з обох боків, між ними — три історії з запису
 * екрана. Смуги перевірені окремою композицією `Lesson11Boards` ще до
 * зйомки; тут вони стоять тими самими компонентами.
 *
 * Чому не спільний `LessonVideo`, як у решті уроків. Там ролик — це титр,
 * кроки, титр, і підпис у кадрі відповідає на питання «де я в інструкції».
 * Тут інструкції немає: глядач дивиться три історії підряд, і йому треба
 * знати не крок, а яка задача і скільки вона коштує. Різні накладки, різні
 * смуги, інша логіка — тому й окрема композиція, а не прапорець у спільній.
 */

/** До якої задачі належить сегмент — за префіксом його id. */
const taskOf = (id: string) => (id.startsWith('t1') ? 0 : id.startsWith('t2') ? 1 : 2);

/** Сегменти, наприкінці яких цінник перекреслюється новим часом. */
const FLIP_AT_END = new Set(['t1-pravka', 't2-perevirka', 't3-rekvizyty']);

export const Lesson11: React.FC = () => (
  <AbsoluteFill style={{ background: STAGE.bottom }}>
    {/* Темна сцена під записом — та сама, що в решті уроків: запис на ній
        читається як підсвічений екран, а не як картинка на столі. */}
    <AbsoluteFill
      style={{ background: `linear-gradient(180deg, ${STAGE.top} 0%, ${STAGE.bottom} 100%)` }}
    />

    <IntroBand />

    <Sequence
      from={fr(INTRO_SEC + TITLE_SEC)}
      durationInFrames={fr(PROBLEM_SEC)}
      name="Дошка: скільки це коштує"
    >
      <ProblemBand />
    </Sequence>

    {/* ── Три історії з запису екрана ──────────────────────────────────── */}
    {PLAN.map((seg) => {
      const task = TASKS[taskOf(seg.id)];
      const flip = FLIP_AT_END.has(seg.id);

      return (
        <Sequence key={seg.id} from={seg.start} durationInFrames={seg.duration} name={seg.label}>
          <Clip
            src="1-1/take.mp4"
            from={seg.from}
            to={seg.to}
            speed={seg.speed}
            motion={seg.motion}
            duration={seg.duration}
          />

          <TaskChip index={taskOf(seg.id) + 1} label={seg.label} />
          <PriceChip
            was={task.wasText}
            now={flip ? task.nowText : undefined}
            // Перекреслення — за півтори секунди до кінця сегмента, щоб воно
            // збіглося з реплікою «сорок хвилин перетворились на десять», а
            // не випередило її.
            flipAt={flip ? Math.max(0, seg.duration - 45) : undefined}
          />
          <PromoSpeedBadge speed={seg.speed} />

          {seg.lines.map((line) => (
            <Sequence key={line.key} from={line.from} durationInFrames={line.duration} name={line.key}>
              <Audio src={staticFile(`1-1/voice/${line.key}.mp3`)} />
              <Subtitle text={line.text} />
            </Sequence>
          ))}

          {/* Шпаргалка з цифрою — рівно там, де на екрані вже не зведення, а
              відкритий звіт. Тримати число в голові глядач не зобов'язаний. */}
          {seg.id === 't2-perevirka' ? (
            <Sequence from={fr(1.2)} durationInFrames={seg.duration - fr(1.6)} name="цифра зі зведення">
              <PinnedFact
                kicker="Помічник назвав цифру"
                value={`${facts.cited.value} млн грн`}
                note={`У документі вона одна — на сторінці ${facts.cited.page} з 48`}
              />
            </Sequence>
          ) : null}

          {/* Рамка на лічильнику збігів: «1 з 1» і є доказ, що перевірка
              зійшлась, але сам напис у кадрі дрібний. */}
          {seg.id === 't2-perevirka' ? (
            <Sequence from={fr(9)} durationInFrames={fr(4)} name="збіг знайдено">
              <Focus {...onScreen(1370, 108, 450, 52)} note="Знайдено один збіг" />
            </Sequence>
          ) : null}
        </Sequence>
      );
    })}

    {/* ── Підсумок і фінал ─────────────────────────────────────────────── */}
    {/*
      * Підсумкова дошка триває на кілька кадрів довше, ніж рахує її власна
      * тривалість, — і заходить під фінальний титр, який намальовано пізніше
      * й тому лежить зверху.
      *
      * Причина в округленні. Початок титру рахується як TOTAL − fr(OUTRO),
      * а кінець дошки — як TOTAL − fr(RESULT+OUTRO) + fr(RESULT); коли ці
      * округлення розходяться на одиницю, між сценами лишається ОДИН кадр,
      * у якому немає жодної з них — і крізь нього видно темну сцену. На
      * рендері v02 це був рівно один кадр яскравістю 23 із 255 (STANDARD.md
      * §6, «Один чорний кадр посеред ролика»). Перекриття закриває будь-яке
      * таке розходження й нічого не коштує: зверху все одно титр.
      */}
    <Sequence
      from={TOTAL - fr(RESULT_SEC + OUTRO_SEC)}
      durationInFrames={fr(RESULT_SEC) + 6}
      name="Дошка: скільки тепер"
    >
      <ResultBand />
    </Sequence>

    <Sequence from={TOTAL - fr(OUTRO_SEC)} durationInFrames={fr(OUTRO_SEC)} name="Фінал">
      <OutroBand />
    </Sequence>

    <Music total={TOTAL} loudUntil={fr(HEAD_SEC)} loudFrom={TOTAL - fr(RESULT_SEC + OUTRO_SEC)} />

    <Progress total={TOTAL} />
  </AbsoluteFill>
);

export { TOTAL };
