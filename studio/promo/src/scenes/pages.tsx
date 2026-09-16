import { AbsoluteFill, useCurrentFrame } from 'remotion';

import { Cursor } from '../parts/Cursor';
import { PageShot } from '../parts/PageShot';
import { Spotlight } from '../parts/Spotlight';
import { s } from '../theme';
import layout from '../live-layout.json';

/**
 * Сцени, у яких на екрані сторінка платформи.
 *
 * Механізм у всіх однаковий, і саме тому вони живуть разом: знімок сторінки +
 * траєкторія камери (`keys`) + за потреби підсвітка й курсор. Різняться лише
 * координати — і всі вони беруться з `live-layout.json`, тобто зі СПРАВЖНЬОЇ
 * верстки, а не підбираються на око. Коли сторінка зміниться, досить перезняти
 * її — числа приїдуть самі.
 *
 * Правила, спільні для всіх сцен тут:
 *
 * • **Масштаб не більший за 2.** Текстури зняті у подвійній роздільності, тож
 *   до двійки камера ще зменшує зображення, а не розтягує. Далі починається
 *   каша з дрібного тексту інтерфейсу, помітна саме на наїзді.
 *
 * • **Рух починається одразу після склейки.** Перша версія тримала по дві з
 *   половиною секунди нерухомості НА ПОЧАТКУ кожної сцени — разом двадцять три
 *   секунди стоп-кадру на дев'яносто секунд ролика. Пауза потрібна після того,
 *   як щось стало на місце, а не до того, як воно почало відбуватися.
 *
 * • **Зупинка — у кінці.** Останні ключові точки майже збігаються: кадр, у
 *   якому треба щось прочитати, мусить постояти.
 *
 * • **Підсвітка й курсор — у координатах сторінки.** Вони діти `PageCam`, тому
 *   їдуть разом зі своїм елементом. У координатах кадру курсор з'їжджав би з
 *   цілі саме тоді, коли камера рухається.
 */

/** Смуга сторінки має власний нуль: переводимо координати сторінки в її. */
const inBand = (page: keyof typeof layout, y: number) => {
  const entry = layout[page] as { band?: { from: number } };
  return y - (entry.band?.from ?? 0);
};

// ── 4. Кабінет ──────────────────────────────────────────────────────────────
// Що показуємо: людина заходить і одразу бачить, де вона. Останній кадр —
// «Шлях до сертифіката»: три модулі зараховано, четвертий у роботі, п'ятий під
// замком, попереду медаль. Це вся логіка курсу в одному рядку кружечків.

const DASH = layout.dashboard;
const PATH_CARD = DASH.boxes.cards[2] ?? { x: 404, y: 558, w: 1112, h: 220 };

export const DASHBOARD_SEC = 7.2;

export const SceneDashboard: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <PageShot
        src="textures/dashboard-full.png"
        pageH={DASH.pageH}
        keys={[
          { frame: 0, cx: 960, cy: 320, zoom: 1.06 },
          { frame: s(0.9), cx: 960, cy: 340, zoom: 1.08 },
          { frame: s(5.2), cx: 960, cy: PATH_CARD.y + PATH_CARD.h / 2, zoom: 1.3 },
          { frame: s(DASHBOARD_SEC), cx: 960, cy: PATH_CARD.y + PATH_CARD.h / 2, zoom: 1.34 },
        ]}
        frame={frame}
      >
        <Spotlight {...PATH_CARD} pad={18} delay={s(5.0)} dim={0.24} />
      </PageShot>
    </AbsoluteFill>
  );
};

// ── 7. Модулі курсу ─────────────────────────────────────────────────────────
//
// Кадр про те, ЧОГО навчають, а не про правила проходження. Перша версія
// підсвічувала замок на п'ятому модулі й доводила, що перестрибнути не можна —
// але людині, яка ще не вирішила, чи їй це треба, обмеження нецікаві. Їй цікаво,
// що всередині.
//
// Тому камера тримає всі п'ять карток разом і повільно веде вздовж них:
// «знайомство з інструментами», «одразу до справи», «безпека», «промптинг»,
// «перевірка результату» — назви читаються одна за одною, поки диктор їх
// перелічує.

const COURSE = layout.course;
const MOD_FIRST = COURSE.boxes.modules[1] ?? { x: 404, y: 447, w: 357, h: 308 };

export const COURSE_MAP_SEC = 9.2;

export const SceneCourseMap: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <PageShot
        src="textures/course-full.png"
        pageH={COURSE.pageH}
        keys={[
          // Кадрування зміщене вниз і щільніше, ніж у першій версії: там
          // заголовки верхнього ряду карток різало межею кадру, а знизу
          // лишалася чверть порожнього тла.
          { frame: 0, cx: 960, cy: 620, zoom: 1.04 },
          // Плавний прохід уздовж верхнього ряду — трьома першими модулями.
          { frame: s(5.0), cx: 900, cy: MOD_FIRST.y + MOD_FIRST.h / 2 + 40, zoom: 1.2 },
          // І відʼїзд, щоб під кінець репліки в кадрі знову було все п'ять.
          { frame: s(COURSE_MAP_SEC), cx: 960, cy: 640, zoom: 1.02 },
        ]}
        frame={frame}
      />
    </AbsoluteFill>
  );
};

// ── 8–9. Урок: задача і готовий промпт ──────────────────────────────────────
//
// Два кадри зі склейкою між ними, а не одна подорож сторінкою. Причина не
// естетична: між задачею і промптом лежать порожній відеоплеєр (чорний
// прямокутник на чверть кадру) і знімок Gemini, на якому видно панель завдань
// Windows із індикатором розкладки. Проїхати повз них камерою неможливо —
// лишається перестрибнути.
//
// Склейка виявилась і кращою за подорож: перший кадр показує ЗАДАЧУ (справжнє
// звернення громадянки й правило «що можна нести в чат»), другий — ГОТОВИЙ
// ІНСТРУМЕНТ. Між ними нічого пояснювати не треба.

const LESSON = layout.lesson;
const PROMPT = LESSON.boxes.blocks[2] ?? { x: 600, y: 4070, w: 720, h: 590 };
const LESSON_PAGE_H = LESSON.band?.pageH ?? 4600;

export const LESSON_TASK_SEC = 7;
export const LESSON_PROMPT_SEC = 7.5;

export const SceneLessonTask: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <PageShot
        src="textures/lesson-band.png"
        pageH={LESSON_PAGE_H}
        keys={[
          { frame: 0, cx: 960, cy: inBand('lesson', 700), zoom: 1.04 },
          { frame: s(LESSON_TASK_SEC), cx: 960, cy: inBand('lesson', 1560), zoom: 1.24 },
        ]}
        frame={frame}
      />
    </AbsoluteFill>
  );
};

export const SceneLessonPrompt: React.FC = () => {
  const frame = useCurrentFrame();
  const promptY = inBand('lesson', PROMPT.y + PROMPT.h / 2);

  return (
    <AbsoluteFill>
      <PageShot
        src="textures/lesson-band.png"
        pageH={LESSON_PAGE_H}
        keys={[
          // Наїзд до 1,9 — межа, за якою знімок 2x починає розтягуватись.
          // Потрібен саме він: на менших масштабах назва промпту («Відповідь на
          // звернення громадянина») лишалась у тій самій непевній зоні —
          // завелика, щоб бути фактурою, замала, щоб її прочитали.
          { frame: 0, cx: 960, cy: promptY - 210, zoom: 1.34 },
          { frame: s(4.6), cx: 960, cy: promptY - 40, zoom: 1.86 },
          { frame: s(LESSON_PROMPT_SEC), cx: 960, cy: promptY - 30, zoom: 1.9 },
        ]}
        frame={frame}
      />
    </AbsoluteFill>
  );
};

// ── 11. Модуль безпеки ──────────────────────────────────────────────────────
//
// Перша версія показувала тут стартову картку тесту з написом «12 питань,
// прохідний бал 90 %». Вона читалась як «зараз буде іспит» — а розмова в цю
// мить не про іспит, а про те, ЧОГО тут навчають.
//
// Тому в кадрі сам урок: таблиця пʼяти категорій інформації з прикладами з
// реальної роботи, а нижче — тренажер, де дев'ять фрагментів треба розкласти
// по зонах. Видно не правило, а те, як його вчать застосовувати.

const SECURITY = layout.security;
const SECURITY_PAGE_H = SECURITY.band?.pageH ?? 3000;
/** Тренажер «9 фрагментів» — найнижчий блок, до якого доходить камера. */
const TRAINER = SECURITY.boxes.cards[3] ?? { x: 600, y: 2257, w: 720, h: 1246 };

export const SECURITY_SEC = 9;

export const SceneSecurity: React.FC = () => {
  const frame = useCurrentFrame();
  const trainerY = inBand('security', TRAINER.y);

  return (
    <AbsoluteFill>
      <PageShot
        src="textures/security-band.png"
        pageH={SECURITY_PAGE_H}
        keys={[
          // Таблиця категорій: що відкрите, що службове, що персональні дані.
          { frame: 0, cx: 960, cy: 960, zoom: 1.12 },
          { frame: s(2.6), cx: 960, cy: 1010, zoom: 1.22 },
          // Вниз, до тренажера — туди, де людина розкладає фрагменти сама.
          // Масштаб не нижчий за одиницю: на менших сторінка стає вужчою за кадр,
          // і з боків з'являються порожні кремові поля під рамкою браузера.
          { frame: s(6.8), cx: 960, cy: trainerY + 460, zoom: 1.02 },
          { frame: s(SECURITY_SEC), cx: 960, cy: trainerY + 520, zoom: 1.0 },
        ]}
        frame={frame}
      />
    </AbsoluteFill>
  );
};

// ── 12. Питання тесту ───────────────────────────────────────────────────────
//
// Питання беремо з ТОГО САМОГО модуля, що й картка порога. У першій версії
// картка казала «12 питань», а наступний кадр — «ПИТАННЯ 1 З 10»: числа взяті
// з двох різних модулів, обидва правильні, а разом читаються як помилка.
//
// Побічна вигода від заміни: питання «Безпеки» — про класифікацію даних, тобто
// прямо про світлофор, показаний на початку ролика. Кадр перестав бути просто
// «ось так виглядає тест» і замкнув думку.

const QUIZ = layout.quizdone;

export const QUIZ_SEC = 5;

export const SceneQuiz: React.FC = () => {
  const frame = useCurrentFrame();
  const card = QUIZ.boxes.cards[0] ?? { x: 620, y: 132, w: 680, h: 371 };
  /** Другий варіант відповіді — правильний. Координата знята з того ж кадру. */
  const optionY = 452;

  return (
    <AbsoluteFill>
      <PageShot
        src="textures/quizdone-chosen.png"
        pageH={QUIZ.pageH}
        keys={[
          { frame: 0, cx: 960, cy: 470, zoom: 1.12 },
          { frame: s(2.6), cx: 960, cy: 455, zoom: 1.3 },
          { frame: s(QUIZ_SEC), cx: 960, cy: 455, zoom: 1.34 },
        ]}
        frame={frame}
      >
        <Cursor
          path={[
            { from: 0, to: s(0.9), x: card.x + card.w - 90, y: card.y + card.h + 240 },
            { from: s(1.3), to: s(2.4), x: 790, y: optionY },
          ]}
          clicks={[s(2.4)]}
        />
      </PageShot>
    </AbsoluteFill>
  );
};

// ── 13. Бібліотека ──────────────────────────────────────────────────────────
// Кадр про обсяг: вісімдесят три матеріали, і всі вони лишаються в людини після
// курсу. Камера йде вниз стіною карток — саме рух показує, що вони не
// закінчуються.

const LIB = layout.library;
const LIB_HEAD = LIB.boxes.cards[0] ?? { x: 404, y: 224, w: 1112, h: 172 };

export const LIBRARY_SEC = 7.8;

export const SceneLibrary: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <PageShot
        src="textures/library-band.png"
        pageH={LIB.band?.pageH ?? 2100}
        keys={[
          { frame: 0, cx: 960, cy: LIB_HEAD.y + LIB_HEAD.h / 2 + 50, zoom: 1.2 },
          { frame: s(0.8), cx: 960, cy: LIB_HEAD.y + LIB_HEAD.h / 2 + 60, zoom: 1.2 },
          { frame: s(LIBRARY_SEC), cx: 960, cy: 1420, zoom: 0.98 },
        ]}
        frame={frame}
      >
        {/* Підсвітка живе рівно стільки, скільки в кадрі її предмет. У першій
            версії затемнення тривало довше за лічильник матеріалів, і останні
            дві секунди сцени показували приглушену стіну нечитабельних карток —
            світло лишили ввімкненим, коли світити вже не було що. */}
        <Spotlight {...LIB_HEAD} pad={16} delay={s(0.5)} life={s(2.6)} dim={0.22} />
      </PageShot>
    </AbsoluteFill>
  );
};

// ── 14. Прогрес і сертифікат ────────────────────────────────────────────────
// Остання сцена з інтерфейсом. Показує, що платформа не вірить на слово:
// сімдесят два відсотки, календар активності, середній бал — усе пораховано, а
// атестація відкриється лише тоді, коли курс справді пройдено.

const PROG = layout.progress;
const DONUT = PROG.boxes.cards[4] ?? { x: 404, y: 394, w: 320, h: 316 };
const EXAM = PROG.boxes.cards[9] ?? { x: 970, y: 1390, w: 546, h: 333 };

export const PROGRESS_SEC = 7.8;

export const SceneProgress: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <PageShot
        src="textures/progress-full.png"
        pageH={PROG.pageH}
        keys={[
          // Центр кадру — по центру сторінки (960), а не зміщений ліворуч: у
          // першій версії правий край зрізав четверту картку «610 балів» і
          // хвости підписів, тоді як зліва лишалося порожнє поле.
          { frame: 0, cx: 960, cy: 300, zoom: 1.1 },
          { frame: s(2.8), cx: 900, cy: DONUT.y + DONUT.h / 2, zoom: 1.2 },
          { frame: s(5.6), cx: 960, cy: EXAM.y + EXAM.h / 2, zoom: 1.12 },
          { frame: s(PROGRESS_SEC), cx: EXAM.x + EXAM.w / 2, cy: EXAM.y + EXAM.h / 2, zoom: 1.4 },
        ]}
        frame={frame}
      >
        <Spotlight {...EXAM} pad={16} delay={s(5.8)} dim={0.28} />
      </PageShot>
    </AbsoluteFill>
  );
};
