import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

import { DeviceFrame, PaperGround } from '../parts/DeviceFrame';
import { PageShot } from '../parts/PageShot';
import { Spotlight } from '../parts/Spotlight';
import { s } from '../theme';
import layout from '../live-layout.json';

/**
 * Сцени 2 і 3 — поява продукту й світлофор даних.
 *
 * Рознесені навмисно. Спершу глядач має зрозуміти, ЩО перед ним: ноутбук,
 * браузер, працюючий сайт із зрозумілим заголовком. І лише потім — головну
 * ідею платформи. Якби наліт на світлофор починався одразу, не прочиталось би
 * ні те, ні те: око не встигає і роздивитись пристрій, і прочитати правило.
 *
 * Корпус ноутбука живе тільки в першій сцені. Далі він не потрібен: свою
 * роботу — сказати «це справжній сайт» — він уже зробив, а в кадрі лишався б
 * рамкою, яка їсть місце в тексту.
 *
 * Камера не стоїть на місці НІ СЕКУНДИ. У першій версії ноутбук три секунди
 * чекав нерухомо, поки почнеться наліт; на вимірі це виходив буквальний
 * стоп-кадр одразу після склейки. Тепер сторінка повільно дрейфує з першого
 * кадру, а наліт лише додає до цього руху свій.
 */

const HOME = layout.home;

/** Три картки світлофора стоять у ряд; у кадрі це одна ділянка. */
const TL = { x: 380, y: 1010, w: 1160, h: 232 };

// ── 2. Поява продукту ───────────────────────────────────────────────────────

export const HERO_SEC = 14.5;

export const SceneHero: React.FC = () => {
  const frame = useCurrentFrame();

  const flight = interpolate(frame, [s(1.6), s(4.8)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill>
      <PaperGround />
      <DeviceFrame progress={flight}>
        <PageShot
          src="textures/home-full.png"
          pageH={HOME.pageH}
          keys={[
            // Заголовок «ШІ в роботі — без ризику» майже нерухомий: це єдине
            // довге речення, яке глядач у цій сцені читає. Але саме «майже» —
            // повільний дрейф не заважає читати й не дає кадру завмерти.
            { frame: 0, cx: 960, cy: 450, zoom: 1 },
            { frame: s(6.0), cx: 960, cy: 500, zoom: 1.03 },
            { frame: s(HERO_SEC), cx: 960, cy: 585, zoom: 1.07 },
          ]}
          frame={frame}
        />
      </DeviceFrame>
    </AbsoluteFill>
  );
};

// ── 3. Світлофор даних ──────────────────────────────────────────────────────
// Сигнатурна ідея платформи й найважливіші сім секунд ролика. Камера доводить
// до трьох карток і ЗУПИНЯЄТЬСЯ: правило треба встигнути прочитати, а не
// побачити краєм ока.

export const SVITLOFOR_SEC = 8;

export const SceneSvitlofor: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill>
      <PageShot
        src="textures/home-full.png"
        pageH={HOME.pageH}
        keys={[
          { frame: 0, cx: 960, cy: 585, zoom: 1.07 },
          { frame: s(3.2), cx: 960, cy: TL.y + TL.h / 2 - 80, zoom: 1.24 },
          { frame: s(SVITLOFOR_SEC), cx: 960, cy: TL.y + TL.h / 2, zoom: 1.42 },
        ]}
        frame={frame}
      >
        {/* Поле навколо ділянки більше за звичайне: картки стоять упритул до
            країв ряду, і рамка без запасу ховалася під крайніми з них. */}
        <Spotlight {...TL} pad={26} delay={s(3.4)} dim={0.32} />
      </PageShot>
    </AbsoluteFill>
  );
};
