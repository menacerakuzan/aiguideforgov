import { Sequence, interpolate, staticFile } from 'remotion';
import { Audio } from '@remotion/media';

import { FPS } from '../theme';

/**
 * Музична підкладка трейлера.
 *
 * Три рішення, кожне — про розбірливість, а не про красу.
 *
 * 1. Музика голосна лише на брендових кадрах (заставка, дошки, фінал) і майже
 *    зникає там, де на екрані йде робота. Під час демонстрації глядач слухає
 *    диктора й дивиться на дрібний текст у Word — рівний бітовий фон там
 *    заважає обом справам. Але й вимикати її начисто не можна: тиша посеред
 *    ролика читається як обрив звуку.
 *
 * 2. Рівні задані як частка від голосу, а не «на смак»: 0,30 на брендових
 *    кадрах (там мовлення небагато) і 0,13 під демонстрацією — розрив
 *    приблизно у 16 дБ, тобто чути, що музика є, і неможливо сплутати її
 *    з мовленням.
 *
 * 3. Доріжка коротша за ролик (111 с проти ~4 хв), тому вона грає двічі. Шов
 *    між заходами навмисно припадає на найтихішу ділянку: на цьому рівні стик
 *    двох заходів не чути, тоді як на брендовому кадрі він був би помітний.
 *    Саме тому шов не «десь посередині», а прив'язаний до тихої зони.
 */

/** Довжина доріжки `public/audio/music.mp3`, у секундах. */
const TRACK_SEC = 111.4;

const LOUD = 0.3;
/**
 * Рівень під демонстрацією.
 *
 * Було 0,055 — і в сегментах без озвучки (наприклад, поки помічник читає
 * сорок вісім сторінок) виходило −39 дБ, тобто фактично тиша посеред
 * промо-ролика. Голос іде на −16 дБ, тож 0,13 дає розрив приблизно у 16 дБ:
 * музику чути як тло, але вона нізащо не змагається з мовленням.
 */
const UNDER = 0.13;

/** Скільки триває перехід між рівнями. Коротше — чути «ручку гучності». */
const RAMP = Math.round(1.6 * FPS);

/**
 * Крива гучності по абсолютному кадру ролика.
 *
 * `loudUntil` — кадр, на якому закінчуються вступні брендові кадри;
 * `loudFrom` — кадр, з якого починається підсумкова дошка. Між ними музика
 * лежить під демонстрацією. Якщо межі збігаються (композиція самих дощок),
 * тихої ділянки просто немає, і крива вироджується в рівну гучність.
 */
const curve = (frame: number, total: number, loudUntil: number, loudFrom: number) => {
  const tail = interpolate(frame, [total - Math.round(1.2 * FPS), total], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  if (loudFrom <= loudUntil + RAMP * 2) return LOUD * tail;

  const level = interpolate(
    frame,
    [loudUntil, loudUntil + RAMP, loudFrom - RAMP, loudFrom],
    [LOUD, UNDER, UNDER, LOUD],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  return level * tail;
};

export const Music: React.FC<{
  total: number;
  loudUntil: number;
  loudFrom: number;
}> = ({ total, loudUntil, loudFrom }) => {
  const track = Math.round(TRACK_SEC * FPS);
  const passes: { from: number; duration: number }[] = [];

  for (let from = 0; from < total; from += track) {
    passes.push({ from, duration: Math.min(track, total - from) });
  }

  return (
    <>
      {passes.map((p, i) => (
        <Sequence key={i} from={p.from} durationInFrames={p.duration} name={`музика ${i + 1}`}>
          <Audio
            src={staticFile('audio/music.mp3')}
            // Кадр усередині секвенції — свій; крива рахується від абсолютного,
            // інакше другий захід почав би гучну частину заново.
            volume={(f) => curve(f + p.from, total, loudUntil, loudFrom)}
          />
        </Sequence>
      ))}
    </>
  );
};
