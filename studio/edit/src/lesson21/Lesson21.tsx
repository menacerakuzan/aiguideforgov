import { LessonVideo } from '../lesson/LessonVideo';
import { FADE_SEC, OUTRO_SEC, PLAN, TITLE_SEC, TOTAL } from './plan';

export const Lesson21: React.FC = () => (
  <LessonVideo
    src="2-1/take.mp4"
    voicePrefix="2-1/voice"
    plan={PLAN}
    total={TOTAL}
    fadeSec={FADE_SEC}
    titleSec={TITLE_SEC}
    outroSec={OUTRO_SEC}
    title={{ kicker: 'Модуль 2 · Реальні задачі', number: '2.1', title: 'Лист-відповідь на звернення' }}
    outro={{
      kicker: 'Коротко',
      title: 'П’ять хвилин замість сорока',
      note: 'Помічник склав чернетку, а рішення, реквізити й підпис лишились за вами. Саме тому останній крок — перевірка, а не відправлення.',
    }}
    focusMoments={[
      { segmentId: 'zvernennia', fromSec: 11, durationSec: 9, box: { x: 1150, y: 255, w: 310, h: 330 }, note: 'Це в чат не йде' },
    ]}
  />
);

export { TOTAL };
