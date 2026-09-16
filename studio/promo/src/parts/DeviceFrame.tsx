import { interpolate, Easing } from 'remotion';

import { C, R } from '../theme';

/**
 * Ноутбук, у якому живе сторінка, і наліт камери «з кімнати в екран».
 *
 * Навіщо взагалі корпус. Промо має за перші секунди сказати «це працюючий
 * вебпродукт», а не «це набір картинок». Пристрій у кадрі робить це без жодного
 * слова: сторінка всередині екрана читається як щось, чим уже користуються.
 *
 * Чому не фотореалістичний макбук. Дизайн-мова платформи — приглушений
 * claymorphism: кремовий папір, чорнильна облямівка, великі радіуси. Фотографія
 * алюмінієвого корпусу поруч із цим виглядала б вставкою з чужого сайту. Тому
 * корпус стилізований: холодний метал, зведений до чорнильного відтінку
 * палітри, м'яка контактна тінь замість відблисків.
 *
 * ── Головний прийом: наліт закінчується РІВНО на межі кадру ───────────────
 * `progress` веде одну величину від 0 (ноутбук далеко, під кутом) до 1 (екран
 * точно 1920×1080, повороту немає). На одиниці корпус уже повністю прозорий,
 * тож перехід на повнокадровий запис відбувається без стику: глядач не бачить
 * ні підміни, ні розчинення.
 *
 * Масштаб ніколи не перевищує одиницю — сторінка тільки зменшується. Це
 * свідомо: збільшення через `transform: scale` змусило б Chromium спершу
 * растеризувати шар у layout-розмірі, а потім розтягнути його, і дрібний текст
 * інтерфейсу розсипався б (та сама пастка, через яку в `PageCam` збільшення
 * зроблене властивістю `zoom`, а не трансформом).
 */

/** Розмір екрана, який DeviceFrame показує в одиниці — це й є кадр. */
export const SCREEN_W = 1920;
export const SCREEN_H = 1080;

/** Товщина рамки навколо екрана в «одиницях екрана». */
const BEZEL = 26;
const BODY = 16;

export type DeviceShot = {
  /** 0 — ноутбук у кадрі цілком; 1 — екран точно по межах кадру. */
  progress: number;
  /** Нахил навколо вертикалі на нулі, градуси. Додатний — дивимось зліва. */
  rotY?: number;
  /** Нахил навколо горизонталі на нулі, градуси. */
  rotX?: number;
  /** Масштаб екрана на нулі. 0.5 — ноутбук займає приблизно половину кадру. */
  zoom0?: number;
  /** Зсув по вертикалі на нулі, пікселі кадру. */
  shiftY?: number;
};

export const DeviceFrame: React.FC<DeviceShot & { children: React.ReactNode }> = ({
  progress,
  rotY = 15,
  rotX = 6,
  zoom0 = 0.66,
  shiftY = 8,
  children,
}) => {
  // Одна крива на всі параметри — інакше поворот і масштаб розходяться, і
  // наліт читається як дві різні дії замість одного руху.
  const t = interpolate(progress, [0, 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.3, 0, 0.1, 1),
  });

  const scale = interpolate(t, [0, 1], [zoom0, 1]);
  const ry = interpolate(t, [0, 1], [rotY, 0]);
  const rx = interpolate(t, [0, 1], [rotX, 0]);
  const dy = interpolate(t, [0, 1], [shiftY, 0]);

  // Корпус гасне раніше, ніж екран дійде до країв: інакше останні кадри
  // показували б обрізану рамку, яка вже не читається як ноутбук, зате помітна.
  const chrome = interpolate(t, [0.52, 0.88], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        perspective: 2600,
        perspectiveOrigin: '50% 46%',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: SCREEN_W,
          height: SCREEN_H,
          transformStyle: 'preserve-3d',
          transform: `translateY(${dy}px) scale(${scale}) rotateY(${ry}deg) rotateX(${rx}deg)`,
        }}
      >
        {/* Контактна тінь. Окремим шаром під корпусом і ширша за нього: вона
            й ставить ноутбук на поверхню. Без неї він висить у порожнечі, і
            кадр читається як колаж, а не як знімок столу. */}
        <div
          style={{
            position: 'absolute',
            left: '4%',
            right: '4%',
            top: SCREEN_H + BEZEL + BODY - 10,
            height: 150,
            borderRadius: '50%',
            background: 'radial-gradient(50% 50% at 50% 30%, rgba(38,34,74,.34) 0%, rgba(38,34,74,0) 72%)',
            filter: 'blur(14px)',
            opacity: chrome,
          }}
        />

        {/* Корпус кришки. Лежить ПІД екраном і виступає за його межі, тому
            масштабується разом із ним — окремо анімувати нічого не треба.
            Відтінок теплий, зведений до кремового паперу палітри: холодний
            алюміній поруч із ним читався як вставка з чужого сайту. */}
        <div
          style={{
            position: 'absolute',
            inset: -(BEZEL + BODY),
            borderRadius: R.xl + BEZEL,
            background: 'linear-gradient(158deg, #F2EEE6 0%, #DFD9CE 42%, #C4BEB6 100%)',
            boxShadow: '0 60px 90px -50px rgba(26,23,48,.42), inset 0 2px 0 rgba(255,255,255,.85)',
            opacity: chrome,
          }}
        />
        {/* Темна облямівка екрана — те, що робить корпус ноутбуком, а не
            просто світлою плиткою. */}
        <div
          style={{
            position: 'absolute',
            inset: -BEZEL,
            borderRadius: R.lg + 6,
            background: '#17142B',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)',
            opacity: chrome,
          }}
        />

        {/* Сам екран. Радіус гасне разом із корпусом: у кінці нальоту кадр
            мусить бути прямокутним, без заокруглених кутів по краях відео. */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: R.md * chrome,
            overflow: 'hidden',
            background: C.paper,
          }}
        >
          {children}
        </div>

        {/* Один відблиск по склу — навскіс через верхній лівий кут.
            Свідомо ОДИН і тільки на головному предметі: розсипані по кадру
            відсвіти читаються як дешевий шаблон. Обрізаний тим самим радіусом,
            що й екран, — світло, яке виходить за округлений кут, видно одразу. */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: R.md * chrome,
            overflow: 'hidden',
            pointerEvents: 'none',
            opacity: chrome * 0.5,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: '-30%',
              top: '-120%',
              width: '70%',
              height: '340%',
              transform: 'rotate(22deg)',
              background:
                'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.55) 45%, rgba(255,255,255,0) 100%)',
            }}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Тло під ноутбуком — кремовий папір платформи з її ж крапковою сіткою.
 *
 * Береться з сайта, а не вигадується: та сама сітка лежить фоном сторінок, і
 * коли корпус гасне, кадр не змінює ґрунту — глядач не помічає підміни сцени.
 */
export const PaperGround: React.FC<{ opacity?: number }> = ({ opacity = 1 }) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      opacity,
      background: `radial-gradient(120% 90% at 50% 8%, ${C.paper} 0%, ${C.paper2} 62%, #F0E6D5 100%)`,
    }}
  >
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `radial-gradient(${C.inkMute} 1.4px, transparent 1.4px)`,
        backgroundSize: '34px 34px',
        opacity: 0.12,
      }}
    />
  </div>
);
