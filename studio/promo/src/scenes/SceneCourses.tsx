import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

import { Cursor } from '../parts/Cursor';
import { PageShot } from '../parts/PageShot';
import { Spotlight } from '../parts/Spotlight';
import { SPRING, s } from '../theme';
import layout from '../live-layout.json';

/**
 * Сцена 5 — три курси платформи.
 *
 * Картки не проявляються разом зі сторінкою, а РОЗДАЮТЬСЯ на неї — як карти на
 * стіл. Тому знято два стани: сторінка з картками й та сама сторінка без них
 * (`courses-empty.png`, зроблений тим самим скриптом). Порожній планшет лежить
 * тлом, а картки прилітають на нього окремими шарами.
 *
 * Прильоти нерівномірні й прискорюються — 12 кадрів між першою і другою, 9 між
 * другою і третьою. Рівні інтервали читаються як анімація зі слайдів;
 * наростання — як жест руки.
 *
 * Кожна картка сідає у СВОЄ справжнє місце з `live-layout.json`. Це не
 * причіпка: елемент, який завис поруч зі своїм місцем, миттєво видає, що
 * сторінка несправжня.
 *
 * Після роздачі кадр стоїть пів секунди, і аж потім вмикається підсвітка
 * нового курсу. Дві події одночасно з'їли б одна одну.
 */

const COURSES = layout.courses;
const CARDS = COURSES.boxes.cards;
const OPEN = CARDS[0] ?? { x: 404, y: 224, w: 357, h: 332 };
const NEW = CARDS[1] ?? { x: 781, y: 224, w: 357, h: 332 };

/** Затримка прильоту кожної картки й звідки вона летить. */
const DEAL = [
  { src: 'textures/courses-course1.png', box: CARDS[0], delay: 4, from: { x: -300, y: 320 }, rot: -9, fly: 34 },
  { src: 'textures/courses-course2.png', box: CARDS[1], delay: 20, from: { x: -60, y: 360 }, rot: 6, fly: 28 },
  { src: 'textures/courses-course3.png', box: CARDS[2], delay: 29, from: { x: 320, y: 340 }, rot: 10, fly: 22 },
];

export const COURSES_SEC = 12;

export const SceneCourses: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      <PageShot
        src="textures/courses-empty.png"
        pageH={COURSES.pageH}
        keys={[
          { frame: 0, cx: 960, cy: 395, zoom: 1.08 },
          { frame: s(2.4), cx: 940, cy: 400, zoom: 1.14 },
          // Наїзд — на ПЕРШИЙ курс, той, що вже наповнений і доступний. Перша
          // версія вела камеру до нового курсу «ШІ для відкритих даних», але він
          // закритий: показувати як головне те, всередину чого людина зайти не
          // може, означає обіцяти те, чого немає.
          { frame: s(6.0), cx: OPEN.x + OPEN.w / 2, cy: OPEN.y + OPEN.h / 2, zoom: 1.66 },
          { frame: s(8.6), cx: OPEN.x + OPEN.w / 2, cy: OPEN.y + OPEN.h / 2, zoom: 1.7 },
          // І лише під кінець — відʼїзд, щоб у кадр повернулися решта курсів:
          // саме про них говорить друга репліка.
          { frame: s(COURSES_SEC), cx: 960, cy: 400, zoom: 1.12 },
        ]}
        frame={frame}
      >
        {DEAL.map((card) => {
          const box = card.box;
          if (!box) return null;
          const t = spring({ frame: frame - card.delay, fps, config: SPRING, durationInFrames: card.fly });
          return (
            <Img
              key={card.src}
              src={staticFile(card.src)}
              style={{
                position: 'absolute',
                left: box.x + interpolate(t, [0, 1], [card.from.x, 0]),
                top: box.y + interpolate(t, [0, 1], [card.from.y, 0]),
                width: box.w,
                transform: `rotate(${interpolate(t, [0, 1], [card.rot, 0])}deg)`,
                opacity: Math.min(1, t * 3),
              }}
            />
          );
        })}

        <Spotlight x={OPEN.x} y={OPEN.y} w={OPEN.w} h={OPEN.h} pad={16} delay={s(3.4)} life={s(5.6)} dim={0.26} />

        <Cursor
          path={[
            { from: 0, to: s(1.4), x: NEW.x + NEW.w / 2, y: NEW.y + NEW.h + 70 },
            // Курсор іде до першого курсу — до значка, а не до середини картки:
            // у центрі він накриває собою опис, тобто рівно той текст, який у
            // цьому кадрі й треба прочитати.
            { from: s(2.4), to: s(3.5), x: OPEN.x + 56, y: OPEN.y + 118 },
          ]}
          clicks={[s(3.5)]}
        />
      </PageShot>
    </AbsoluteFill>
  );
};
