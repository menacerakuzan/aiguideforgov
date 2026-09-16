import { AbsoluteFill, Audio, Sequence, interpolate, staticFile } from 'remotion';

import { FPS } from './theme';
import { TitleCard } from './parts/TitleCard';
import { SceneBrand, BRAND_SEC } from './scenes/SceneBrand';
import { SceneHero, SceneSvitlofor, HERO_SEC, SVITLOFOR_SEC } from './scenes/SceneHero';
import { SceneCourses, COURSES_SEC } from './scenes/SceneCourses';
import { SceneOutro, OUTRO_SEC } from './scenes/SceneOutro';
import {
  SceneCourseMap, SceneDashboard, SceneLessonPrompt, SceneLessonTask,
  SceneLibrary, SceneProgress, SceneQuiz, SceneSecurity,
  COURSE_MAP_SEC, DASHBOARD_SEC, LESSON_PROMPT_SEC, LESSON_TASK_SEC,
  LIBRARY_SEC, PROGRESS_SEC, SECURITY_SEC, QUIZ_SEC,
} from './scenes/pages';
import voice from './voice.json';
import plan from './voice-plan.json';

/**
 * Промо-ролик ПРО.ШІ — складання.
 *
 * Три таблиці, і в цьому весь монтаж: сцени, репліки диктора, звукові ефекти.
 * Кожна — оголошення, а не код: щоб змістити кадр, міняють число в таблиці, а
 * не шукають виклик у трьох файлах.
 *
 * ── Чому саме такий порядок сцен ─────────────────────────────────────────
 * Крива енергії: тихий бренд → один головний герой (світлофор даних) → підйом
 * по можливостях продукту з двома паузами-титрами → пік у фіналі. Ця будова не
 * вигадана: вона зібрана з розборів десятків продуктових роликів і працює саме
 * тому, що глядач не витримує рівної інтенсивності півтори хвилини поспіль.
 *
 * ── Стики ────────────────────────────────────────────────────────────────
 * Між сценами НЕМАЄ розчинень. Сусідні кадри стикуються встик: розчинення на
 * стику двох світлих сцен дає провал у сірість, а на стику з титром — подвійне
 * зображення. Титри самі гаснуть у своїх останніх кадрах, і цього досить.
 *
 * ── Звук ─────────────────────────────────────────────────────────────────
 * Голос, тиха музика на весь хронометраж і два натискання. Більше нічого —
 * докладніше про це рішення нижче, біля самої таблиці.
 */

const f = (sec: number) => Math.round(sec * FPS);

type Scene = { id: string; sec: number; node: React.ReactNode };

const TITLE_SEC = 1.6;

/** Сцени в порядку показу. Початок кожної рахується сумою попередніх. */
const SCENES: Scene[] = [
  { id: 'brand', sec: BRAND_SEC, node: <SceneBrand /> },
  { id: 'hero', sec: HERO_SEC, node: <SceneHero /> },
  { id: 'svitlofor', sec: SVITLOFOR_SEC, node: <SceneSvitlofor /> },
  { id: 'dashboard', sec: DASHBOARD_SEC, node: <SceneDashboard /> },
  // Титри — це коми між думками. Обидва короткі, обидва без голосу: пауза й
  // мусить бути паузою, а не ще однією фразою.
  { id: 'title-a', sec: TITLE_SEC, node: <TitleCard line="Що вас чекає всередині" accent="чекає" /> },
  { id: 'courses', sec: COURSES_SEC, node: <SceneCourses /> },
  { id: 'course-map', sec: COURSE_MAP_SEC, node: <SceneCourseMap /> },
  // Урок розділено на два кадри зі склейкою: задача і готовий інструмент.
  // Причина технічна — між ними в сторінці лежить порожній відеоплеєр і знімок
  // із панеллю завдань Windows, повз які камерою не проїхати.
  { id: 'lesson-task', sec: LESSON_TASK_SEC, node: <SceneLessonTask /> },
  { id: 'lesson-prompt', sec: LESSON_PROMPT_SEC, node: <SceneLessonPrompt /> },
  { id: 'title-b', sec: TITLE_SEC, node: <TitleCard line="Безпека даних" accent="Безпека" /> },
  { id: 'security', sec: SECURITY_SEC, node: <SceneSecurity /> },
  { id: 'quiz', sec: QUIZ_SEC, node: <SceneQuiz /> },
  { id: 'library', sec: LIBRARY_SEC, node: <SceneLibrary /> },
  { id: 'progress', sec: PROGRESS_SEC, node: <SceneProgress /> },
  { id: 'outro', sec: OUTRO_SEC, node: <SceneOutro /> },
];

/** Початок кожної сцени в секундах — рахується, а не прописується руками. */
export const AT: Record<string, number> = {};
let cursor = 0;
for (const scene of SCENES) {
  AT[scene.id] = cursor;
  cursor += scene.sec;
}
export const TOTAL_SEC = cursor;
export const TOTAL = f(TOTAL_SEC);

/**
 * Репліки диктора: абсолютна секунда початку.
 *
 * Тривалості не задаються — вони виміряні `ffprobe` під час синтезу й лежать у
 * `voice.json`. Тому зміна голосу чи правка тексту не вимагає жодної правки
 * монтажу: репліка просто стає довшою або коротшою, а її початок лишається там,
 * де його поставили під картинку.
 */
const VOICE = (Object.entries(plan) as Array<[string, number | string]>)
  .filter((entry): entry is [keyof typeof voice, number] => typeof entry[1] === 'number')
  .map(([key, at]) => ({ key, at }));


/**
 * Звук промо — це голос і тиха музика. Ефектів майже немає, і це рішення, а не
 * економія.
 *
 * Перша версія мала близько сорока звукових подій: підйом під заставку, удар на
 * приземленні знака, «вжух» на кожній склейці, повітря на кожній підсвітці,
 * шурхіт на кожній картці. Кожен був доречний окремо — а разом вони перетягували
 * увагу на себе рівно тоді, коли треба слухати, що каже диктор.
 *
 * Лишилися тільки натискання: курсор у кадрі справді щось натискає, і це та сама
 * пряма озвучка дії, яку не замінить нічого. Усе інше тримає музика.
 */
const CLICKS: Array<{ at: number; why: string }> = [
  { at: 38.05, why: 'курсор відкриває базовий курс' },
  { at: 83.95, why: 'обрано відповідь у тесті' },
];

/**
 * Музика. Один трек рівно на весь хронометраж — не зациклений: стик циклу чути
 * завжди, а тут його просто немає. Загасання наприкінці — власне, треку.
 *
 * Рівень підібраний так, щоб музику помічали лише в паузах між репліками. Голос
 * зведений до −16 LUFS, музика сидить приблизно на двадцять децибел нижче.
 */
const MUSIC_VOL = 0.11;
const MUSIC_FADE_IN = 1.2;
/**
 * Трек замовляється ДОВШИМ за ролик, а гасне вже тут.
 *
 * Якщо замовити рівно в хронометраж, власне загасання треку закінчується
 * раніше за останній кадр — і півтори секунди фіналу йдуть у цифрову тишу,
 * яка чується як обрив файлу. Із запасом трек на цьому місці ще звучить, а
 * згасання ставимо своє, рівно під кінець.
 */
const MUSIC_FADE_OUT = 2.2;

export const Promo: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: '#FFF9F0' }}>
    {SCENES.map((scene) => (
      <Sequence
        key={scene.id}
        from={f(AT[scene.id] ?? 0)}
        durationInFrames={f(scene.sec)}
        name={scene.id}
      >
        {scene.node}
      </Sequence>
    ))}

    {VOICE.map((line) => (
      <Sequence
        key={line.key}
        from={f(line.at)}
        durationInFrames={f(voice[line.key].seconds) + 2}
        name={`голос ${String(line.key)}`}
      >
        <Audio src={staticFile(`audio/voice/${String(line.key)}.mp3`)} />
      </Sequence>
    ))}

    {CLICKS.map((click) => (
      <Sequence key={click.at} from={f(click.at)} durationInFrames={f(0.7)} name={`клац: ${click.why}`}>
        <Audio src={staticFile('audio/sfx/switch-tap.mp3')} volume={0.16} />
      </Sequence>
    ))}

    <Sequence durationInFrames={TOTAL} name="музика">
      <Audio
        src={staticFile('audio/music.mp3')}
        // Наростання на вході й згасання на виході — обидва свої.
        volume={(frame) =>
          interpolate(
            frame,
            [0, f(MUSIC_FADE_IN), TOTAL - f(MUSIC_FADE_OUT), TOTAL],
            [0, MUSIC_VOL, MUSIC_VOL, 0],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
          )
        }
      />
    </Sequence>
  </AbsoluteFill>
);
