import { sanitizeLessonBlocks } from '@proai/infra';
import type { LessonBlock } from '@proai/types';
import { prisma } from './client';
import { resolveAdminCredentials, upsertAdmin } from './lib/admin';
import { module1Lessons } from './content/lessons-module-1';
import { module2Lessons } from './content/lessons-module-2';
import { module3Lessons } from './content/lessons-module-3';
import { module4Lessons } from './content/lessons-module-4';
import { module5Lessons } from './content/lessons-module-5';
import type { SeedLesson } from './content/lessons-module-1';
import { finalExamQuestions, moduleQuizzes, type QuizQuestion } from './content/quizzes';

/**
 * Seed-контент платформи «ПРО.ШІ». Джерело — plan.md (архітектура курсу) +
 * lessons.md (повний контент Розділу 1 «Основи ШІ»). Розділи 2–8 наразі
 * позначені в lessons.md як «у роботі» — тут вони заведені як повноцінні
 * записи ієрархії (Section → Module → Lesson-заглушка), щоб адмін-CMS і
 * навігація одразу показували фінальну структуру курсу; наповнення
 * додається пізніше через ту саму CMS.
 */


function blocks(list: LessonBlock[]): string {
  // Санітизуємо навіть власний seed: інакше «чистий HTML у базі» тримався б
  // на обіцянці автора контенту, а не на коді.
  return JSON.stringify(sanitizeLessonBlocks(list));
}

function stub(summary: string, tool?: string): string {
  const toolNote = tool
    ? `<p>🆕 Урок вводить новий інструмент — <strong>${tool}</strong>. За правилом plan.md §1.1 обов'язково міститиме: навіщо він, якщо є Gemini · реєстрація в 3 кроки · <strong>що входить у безкоштовну версію і де закінчується ліміт</strong> · українська мова · доступність в Україні · приватність даних.</p>`
    : '';
  return blocks([
    {
      type: 'text',
      html: `<p>${summary}</p>${toolNote}<p><em>Детальний контент цього уроку в розробці — розділи 2–8 наповнюються після Розділу 1 «Основи ШІ».</em></p>`,
    },
  ]);
}

/** Питання тесту → рядки Prisma. `order` дає стабільний порядок показу. */
function questionCreateData(questions: QuizQuestion[], withSecurity = false) {
  return questions.map((question, i) => ({
    order: i + 1,
    text: question.text,
    options: JSON.stringify(question.options),
    correctIndex: question.correctIndex,
    explainCorrect: question.explainCorrect,
    explainWrong: question.explainWrong,
    ...(withSecurity ? { isSecurity: question.isSecurity ?? false } : {}),
  }));
}

/** Тест модуля за slug — падає одразу, якщо в контенті його немає. */
function quizFor(moduleSlug: string) {
  const quiz = moduleQuizzes.find((item) => item.moduleSlug === moduleSlug);
  if (!quiz) throw new Error(`Немає тесту для модуля ${moduleSlug} у content/quizzes.ts`);
  return { passScore: quiz.passScore, questions: { create: questionCreateData(quiz.questions) } };
}

async function main() {
  /*
   * Облікові дані адміністратора читаємо ПЕРШИМ ділом — до будь-якого запису.
   * Раніше перевірка стояла після очищення бази, і друкарська помилка в .env
   * давала найгірший можливий результат: дані вже стерті, а seed упав на
   * половині й не створив ані контенту, ані адміністратора.
   */
  const creds = await resolveAdminCredentials();

  console.log('Очищення бази…');
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.certificate.deleteMany(),
    prisma.favorite.deleteMany(),
    prisma.examAttempt.deleteMany(),
    prisma.attempt.deleteMany(),
    prisma.progress.deleteMany(),
    prisma.finalExamQuestion.deleteMany(),
    prisma.finalExam.deleteMany(),
    prisma.question.deleteMany(),
    prisma.quiz.deleteMany(),
    prisma.lesson.deleteMany(),
    prisma.module.deleteMany(),
    prisma.section.deleteMany(),
    prisma.course.deleteMany(),
    prisma.prompt.deleteMany(),
    prisma.resource.deleteMany(),
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.user.deleteMany(),
    prisma.organization.deleteMany(),
  ]);

  /* ==========================================================================
     Організація
     ========================================================================= */
  const org = await prisma.organization.create({
    data: { name: 'Одеська обласна державна адміністрація', kind: 'Обласна державна адміністрація' },
  });

  /* ==========================================================================
     Користувачі — двоє ролей: LEARNER та ADMIN
     ========================================================================= */
  /* ==========================================================================
     Адміністратор
     --------------------------------------------------------------------------
     Рівно один акаунт, і той — з ADMIN_EMAIL / ADMIN_PASSWORD. Демо-слухачів
     seed більше не створює: платформа розгортається порожньою, люди
     реєструються самі. Вигадані акаунти з відомим паролем у продакшні — це
     просто чорний хід, а їхній «прогрес» ще й псує статистику в адмінці.
     ========================================================================= */
  console.log('Створення адміністратора…');

  const { created } = await upsertAdmin(prisma, creds);
  console.log(`  ${created ? 'створено' : 'оновлено'} адміністратора: ${creds.email}`);

  return { org };
}

main()
  .then(async () => {
    await seedCourse();
    await seedPrompts();
    await seedResources();
    console.log('Готово.');
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/* ============================================================================
   Курс, розділи, модулі, уроки, тести, фінальна атестація, прогрес
   ========================================================================= */

function lessonCreateData(lessons: SeedLesson[]) {
  return lessons.map((l, idx) => ({
    slug: l.slug,
    title: l.title,
    minutes: l.minutes,
    order: idx + 1,
    kind: l.kind ?? 'LESSON',
    content: blocks(l.blocks),
  }));
}

async function seedCourse() {
  console.log('Створення курсу…');

  const course = await prisma.course.create({
    data: {
      slug: 'shi-v-publichnii-sluzhbi',
      title: 'ШІ в публічній службі',
      description:
        'Базовий курс для працівників органів влади: як безпечно й ефективно використовувати штучний інтелект у щоденній роботі — від першого запиту до готового документа.',
    },
  });

  /* --------------------------------------------------------------------------
     РОЗДІЛ 1. Основи ШІ (головний, повний контент із lessons.md)
     ------------------------------------------------------------------------ */
  const section1 = await prisma.section.create({
    data: {
      slug: 'osnovy-shi',
      title: 'Основи ШІ',
      description: 'Що таке ШІ, з чого почати, безпека даних, промптинг і перевірка результату — фундамент курсу.',
      order: 1,
      color: 'BLUE',
      courseId: course.id,
    },
  });

  const module1 = await prisma.module.create({
    data: {
      slug: 'osnovy-shi-1-shcho-tse-i-z-choho-pochaty',
      title: 'Що це, навіщо вам і з чого почати',
      description: 'Демонстрація реальної користі, ландшафт сервісів і перша реєстрація.',
      order: 1,
      minutes: module1Lessons.reduce((sum, l) => sum + l.minutes, 0),
      sectionId: section1.id,
      lessons: { create: lessonCreateData(module1Lessons) },
      quiz: { create: quizFor('osnovy-shi-1-shcho-tse-i-z-choho-pochaty') },
    },
  });

  const module2 = await prisma.module.create({
    data: {
      slug: 'osnovy-shi-2-odrazu-do-spravy',
      title: 'Одразу до справи: перші реальні результати',
      description: 'Готові промпти на щоденні задачі: лист, скорочення, службова записка, редагування, переклад.',
      order: 2,
      minutes: module2Lessons.reduce((sum, l) => sum + l.minutes, 0),
      sectionId: section1.id,
      lessons: { create: lessonCreateData(module2Lessons) },
      quiz: { create: quizFor('osnovy-shi-2-odrazu-do-spravy') },
    },
  });

  const module3 = await prisma.module.create({
    data: {
      slug: 'osnovy-shi-3-bezpeka-ta-vidpovidalnist',
      title: 'Безпека та відповідальність',
      description: 'Ядро курсу: світлофор даних, п’ять червоних ліній, знеособлення, правове поле, відповідальність.',
      order: 3,
      minutes: module3Lessons.reduce((sum, l) => sum + l.minutes, 0),
      isKey: true,
      passScore: 90,
      sectionId: section1.id,
      lessons: { create: lessonCreateData(module3Lessons) },
      quiz: { create: quizFor('osnovy-shi-3-bezpeka-ta-vidpovidalnist') },
    },
  });

  const module4 = await prisma.module.create({
    data: {
      slug: 'osnovy-shi-4-promptynh',
      title: 'Промптинг: як говорити з ШІ',
      description: 'Формула промпту, ітерації, робота з файлами й контекстом, топ-10 помилок.',
      order: 4,
      minutes: module4Lessons.reduce((sum, l) => sum + l.minutes, 0),
      sectionId: section1.id,
      lessons: { create: lessonCreateData(module4Lessons) },
      quiz: { create: quizFor('osnovy-shi-4-promptynh') },
    },
  });

  const module5 = await prisma.module.create({
    data: {
      slug: 'osnovy-shi-5-perevirka-rezultatu',
      title: 'Перевірка результату (фактчекінг)',
      description: 'Галюцинації, алгоритм перевірки за 5 кроків, перевірка НПА, цифри й статистика, фінальний чек-лист.',
      order: 5,
      minutes: module5Lessons.reduce((sum, l) => sum + l.minutes, 0),
      sectionId: section1.id,
      lessons: { create: lessonCreateData(module5Lessons) },
      quiz: { create: quizFor('osnovy-shi-5-perevirka-rezultatu') },
    },
  });

  /* --------------------------------------------------------------------------
     ДРУГИЙ КУРС «Продвинутий курс» — прикладні розділи, наповнення в розробці.

     Свідоме рішення: базовий курс містить лише «Основи ШІ» — самодостатній шлях від
     реєстрації до сертифіката. Прикладні розділи (документи, таблиці, презентації,
     аудіо, зображення, пошук) винесено в окремий курс, щоб новачок не бачив вісім
     розділів одразу й не змішував базу з поглибленням.

     `comingSoon: true` — курс поки закритий для навчання: у списку його видно з
     позначкою «скоро», але всередину нікого не пускають (див. getModuleBySlug /
     getLesson у services/learning). Структура при цьому в базі є, і адміністратор
     наповнює її через CMS. Знімається однією правкою поля.
     ------------------------------------------------------------------------ */
  console.log('Створення другого курсу «Продвинутий курс»…');

  const appliedCourse = await prisma.course.create({
    data: {
      slug: 'shi-za-napriamamy-roboty',
      title: 'Продвинутий курс',
      description:
        'Продовження базового курсу: інструменти ШІ під конкретні задачі — документи й тексти, таблиці та дані, щоденна робота, презентації, аудіо, зображення, пошук і переклад.',
      comingSoon: true,
    },
  });

  interface StubModule {
    slug: string;
    title: string;
    summary: string;
    /** Модуль, що вводить новий інструмент. За правилом plan.md §1.1 такий урок
     *  обов'язково містить блок про безкоштовні ліміти сервісу. */
    tool?: string;
  }
  interface StubSection {
    slug: string;
    title: string;
    description: string;
    color: 'GREEN' | 'AMBER' | 'MUTED' | 'SUN' | 'RED' | 'GOLD' | 'INK';
    modules: StubModule[];
  }

  const stubSections: StubSection[] = [
    {
      slug: 'dokumenty-i-teksty',
      title: 'Документи і тексти',
      description:
        'Gemini + вбудований помічник у Google Документах: листи, звіти, нормативні документи, редагування, PDF. Наприкінці — знайомство з Claude.',
      color: 'GREEN',
      modules: [
        { slug: 'word-i-google-dokumenty', title: 'Word і Google Документи', summary: 'файл Word → завантажуємо в Gemini; вбудований помічник у Google Документах; що робити тим, хто працює тільки у Word офлайн.' },
        { slug: 'lysty-ta-korespondentsiia', title: 'Листи та кореспонденція', summary: 'звернення громадян, запит на публічну інформацію, депутатський запит, супровідний лист, ввічлива відмова, відповідь на скаргу.' },
        { slug: 'zvity-ta-analityka', title: 'Звіти та аналітика', summary: 'структура звіту, зведення джерел, квартальний і річний звіт, executive summary, робота з великими PDF.' },
        { slug: 'normatyvni-dokumenty', title: 'Нормативні документи', summary: 'межі застосування, проєкт наказу за зразком, пояснювальна записка, чому ШІ не замінює юриста, обов’язкова верифікація посилань на НПА.' },
        { slug: 'redahuvannia', title: 'Редагування', summary: 'скорочення, спрощення, зміна стилю, уніфікація термінології, боротьба з канцеляритом.' },
        { slug: 'pdf', title: 'PDF', summary: 'витягти текст зі скана, знайти потрібне у великому PDF, зведення, фото паперового документа з телефона.' },
        { slug: 'znaiomstvo-z-claude', title: 'Знайомство з Claude', summary: '🆕 новий інструмент: дуже великі документи й тонка робота зі стилем. Реєстрація, безкоштовні ліміти, порівняння з Gemini на одному документі.', tool: 'Claude' },
      ],
    },
    {
      slug: 'tablytsi-ta-dani',
      title: 'Таблиці та дані',
      description: 'Gemini + вбудований помічник у Google Таблицях: формули, очищення даних, аналіз, візуалізація.',
      color: 'AMBER',
      modules: [
        { slug: 'excel-bez-boliu', title: 'Excel без болю', summary: 'формула на словах → готова формула, пояснення чужої формули, ВПР/XLOOKUP, зведені таблиці, умовне форматування.' },
        { slug: 'shi-u-google-tablytsiakh', title: 'ШІ вже у ваших Google Таблицях', summary: 'вбудований помічник: формули, заповнення, аналіз прямо в таблиці — нічого встановлювати не треба.' },
        { slug: 'ochyshchennia-danykh', title: 'Очищення даних', summary: 'прибрати дублікати, привести дати й адреси до одного вигляду, розділити ПІБ по колонках, знайти помилки в масиві.' },
        { slug: 'analiz', title: 'Аналіз', summary: 'завантажити таблицю в Gemini і поставити питання: динаміка, аномалії, короткі висновки для керівництва.' },
        { slug: 'vizualizatsiia', title: 'Візуалізація', summary: 'який графік обрати, побудова діаграм, оформлення для звіту.' },
        { slug: 'oberezhno-z-tsyframy', title: 'Обережно з цифрами', summary: 'де ШІ помиляється в арифметиці, чому підсумки треба перераховувати, таблиці з персональними даними — окреме правило.' },
      ],
    },
    {
      slug: 'shchodenni-zadachi',
      title: 'Щоденні задачі',
      description:
        'Пошта, планування, швидкі дрібниці, власний асистент. Те, що людина застосує вже завтра вранці — тому одразу після документів і таблиць.',
      color: 'INK',
      modules: [
        { slug: 'poshta', title: 'Пошта', summary: 'чернетки відповідей, сортування вхідних, підсумок довгого ланцюжка листування за 30 секунд.' },
        { slug: 'planuvannia', title: 'Планування', summary: 'план тижня, порядок денний наради, чек-листи заходів, доручення й дедлайни.' },
        { slug: 'shvydki-dribnytsi', title: 'Швидкі дрібниці', summary: 'переформулювати, знайти потрібне у своєму документі, порахувати строки, скласти список, зробити вибірку.' },
        { slug: 'svii-pomichnyk', title: 'Свій помічник', summary: 'власний налаштований асистент під ваш напрямок роботи — без коду; збережені інструкції, які не треба щоразу писати заново.' },
        { slug: 'navchannia', title: 'Навчання', summary: 'як швидко розібратися в новій темі, ШІ як репетитор із будь-якого питання.' },
      ],
    },
    {
      slug: 'prezentatsii-ta-vizual',
      title: 'Презентації та візуал',
      description: 'Структура слайдів у Gemini, готовий дизайн у Gamma й Canva, оформлення та підготовка до виступу.',
      color: 'MUTED',
      modules: [
        { slug: 'struktura-za-10-khvylyn', title: 'Структура за 10 хвилин', summary: 'текст → план слайдів у Gemini → перенесення в Презентації Google або PowerPoint.' },
        { slug: 'znaiomstvo-z-gamma', title: 'Знайомство з Gamma', summary: '🆕 новий інструмент: готовий дизайн, а не просто текст. Текст → повна презентація за 3 хвилини, безкоштовні ліміти, експорт у PowerPoint і PDF.', tool: 'Gamma' },
        { slug: 'znaiomstvo-z-canva', title: 'Знайомство з Canva', summary: '🆕 новий інструмент: шаблони під офіційні заходи, брендування органу (логотип, кольори), коли Canva зручніша за Gamma.', tool: 'Canva' },
        { slug: 'oformlennia', title: 'Оформлення', summary: 'єдиний стиль, читабельність, доступність (контраст, розмір шрифту), що недоречно в презентації органу влади.' },
        { slug: 'skhemy-ta-infohrafika', title: 'Схеми та інфографіка', summary: 'процес → блок-схема, організаційна структура, дорожня карта.' },
        { slug: 'vystup', title: 'Виступ', summary: 'спікерські нотатки, тези, тайминг, передбачення запитань із залу.' },
      ],
    },
    {
      slug: 'audio-narady-transkryptsiia-ozvuchka',
      title: 'Аудіо: наради, транскрипція, озвучка',
      description: 'Аудіозапис наради в Gemini → протокол. Озвучення текстів в ElevenLabs, голосовий ввід, субтитри.',
      color: 'SUN',
      modules: [
        { slug: 'narady', title: 'Наради', summary: 'аудіозапис → Gemini → текст → структурований протокол із дорученнями; правові й етичні межі запису людей: попередження учасників, згода.' },
        { slug: 'transkryptsiia', title: 'Транскрипція', summary: 'якість розпізнавання української, довгі записи (як розділити), виправлення помилок розпізнавання.' },
        { slug: 'ozvuchka-elevenlabs', title: 'Озвучка: ElevenLabs', summary: '🆕 новий інструмент: реєстрація, вибір українського голосу, аудіоверсії документів для людей із порушеннями зору, безкоштовні ліміти, межі використання «чужого голосу».', tool: 'ElevenLabs' },
        { slug: 'holosovyi-vvid', title: 'Голосовий ввід', summary: 'диктувати замість друкувати — на телефоні й комп’ютері.' },
        { slug: 'subtytry', title: 'Субтитри', summary: 'субтитри до відео заходів, переклад субтитрів.' },
      ],
    },
    {
      slug: 'zobrazhennia-ta-video',
      title: 'Зображення та відео',
      description: 'Генерація зображень у Gemini, текст на картинці в Ideogram, обробка фото, межі допустимого й розпізнавання дипфейків.',
      color: 'RED',
      modules: [
        { slug: 'pershe-zobrazhennia-v-gemini', title: 'Перше зображення в Gemini', summary: 'як описати картинку словами, стилі (фото, ілюстрація, схема), виправлення результату, скільки зображень дає безкоштовна версія.' },
        { slug: 'prompt-dlia-zobrazhennia', title: 'Промпт для зображення', summary: 'формула: що зображено + стиль + композиція + кольори + формат; типові помилки, чому виходить «не те».' },
        { slug: 'znaiomstvo-z-ideogram', title: 'Знайомство з Ideogram', summary: '🆕 новий інструмент: текст на зображенні — заголовок, назва органу, напис на банері. Слабке місце всіх інших генераторів. Реєстрація, безкоштовні ліміти.', tool: 'Ideogram' },
        { slug: 'obrobka-foto', title: 'Обробка фото', summary: 'прибрати фон, покращити якість, змінити розмір під вимоги сайту й соцмереж; Canva для швидкого оформлення.' },
        { slug: 'shcho-dorechno-orhanu-vlady', title: 'Що доречно органу влади', summary: 'ілюстрація до новини — так, «фото з події», якої не було — ні; обов’язкове маркування згенерованого; заборона генерувати впізнаваних реальних людей.' },
        { slug: 'video', title: 'Відео', summary: 'що сьогодні реально доступно безкоштовно, короткі ролики для соцмереж, чесні обмеження безкоштовних версій.' },
        { slug: 'dipfeiky', title: 'Дипфейки', summary: 'як розпізнати підробку, що робити, якщо підробили звернення керівника органу, алгоритм реагування на фейк.' },
      ],
    },
    {
      slug: 'poshuk-analiz-pereklad',
      title: 'Пошук, аналіз, переклад',
      description:
        'Пошук із джерелами (Gemini, Perplexity), питання по власному архіву документів (NotebookLM), переклад (DeepL). Завершує курс повна картина підписок і лімітів.',
      color: 'GOLD',
      modules: [
        { slug: 'rozumnyi-poshuk-u-gemini', title: 'Розумний пошук у Gemini', summary: 'пошук із доступом в інтернет, як змусити ШІ показати джерело; чому це не заміна офіційним реєстрам.' },
        { slug: 'znaiomstvo-z-perplexity', title: 'Знайомство з Perplexity', summary: '🆕 новий інструмент: кожне твердження з посиланням на джерело — те, чого найбільше бракує в аналітиці. Реєстрація, безкоштовні ліміти, як перевіряти надані джерела.', tool: 'Perplexity' },
        { slug: 'znaiomstvo-z-notebooklm', title: 'Знайомство з NotebookLM', summary: '🆕 новий інструмент: питання по вашому пакету документів — відповідає тільки за завантаженими джерелами, тому майже не вигадує. Безкоштовний з акаунтом Google.', tool: 'NotebookLM' },
        { slug: 'monitorynh', title: 'Моніторинг', summary: 'огляд новин за темою, дайджест для керівництва.' },
        { slug: 'pereklad-u-gemini', title: 'Переклад у Gemini', summary: 'офіційні листи, збереження термінології, глосарій у запиті, зворотний переклад як самоперевірка.' },
        { slug: 'znaiomstvo-z-deepl', title: 'Знайомство з DeepL', summary: '🆕 новий інструмент: найточніший переклад офіційних і юридичних текстів, документи ЄС, переклад файлів цілком зі збереженням форматування; коли достатньо Gemini, а коли краще DeepL.', tool: 'DeepL' },
        { slug: 'pidpysky-i-limity', title: 'Підписки й ліміти: повна картина', summary: 'зведення по всіх інструментах курсу: що безкоштовно й де межа, що дає підписка, як обійтися без витрат, оплата з бюджетних коштів і корпоративні ліцензії.' },
        { slug: 'shcho-dali', title: 'Що далі', summary: 'як стежити за новинками, як не зупинитися після курсу, куди рухатися самостійно.' },
      ],
    },
  ];

  for (const [sIdx, s] of stubSections.entries()) {
    const section = await prisma.section.create({
      data: {
        slug: s.slug,
        title: s.title,
        description: s.description,
        order: sIdx + 1,
        color: s.color,
        courseId: appliedCourse.id,
      },
    });
    for (const [mIdx, m] of s.modules.entries()) {
      await prisma.module.create({
        data: {
          slug: `${s.slug}-${m.slug}`,
          title: m.title,
          description: m.summary,
          order: mIdx + 1,
          minutes: 10,
          sectionId: section.id,
          lessons: {
            create: [
              {
                slug: `${s.slug}-${m.slug}-oglyad`,
                title: `Огляд: ${m.title.toLowerCase()}`,
                minutes: 10,
                order: 1,
                content: stub(m.summary, m.tool),
              },
            ],
          },
        },
      });
    }
  }

  /* --------------------------------------------------------------------------
     Фінальна атестація курсу — питання з content/quizzes.ts
     ------------------------------------------------------------------------ */
  console.log('Створення фінальної атестації…');

  await prisma.finalExam.create({
    data: {
      passScore: 80,
      securityPassScore: 90,
      courseId: course.id,
      questions: { create: questionCreateData(finalExamQuestions, true) },
    },
  });

  console.log(
    'Фінальна атестація: %d питань, %d із позначкою isSecurity.',
    finalExamQuestions.length,
    finalExamQuestions.filter((question) => question.isSecurity).length,
  );

  console.log('Курс, розділи, модулі, уроки, тести й атестація створені.');
}

/* ============================================================================
   Бібліотека промптів
   ========================================================================= */
async function seedPrompts() {
  console.log('Створення промптів…');

  const p1 = await prisma.prompt.create({
    data: {
      title: 'Відповідь на звернення щодо благоустрою',
      useCase: 'Готує проєкт відповіді з посиланням на строки розгляду та відповідальний підрозділ.',
      category: 'CITIZENS',
      verified: true,
      body: `Ти — досвідчений спеціаліст управління звернень громадян обласної державної адміністрації.

Підготуй проєкт відповіді на звернення [ЗАЯВНИК] щодо [ПРЕДМЕТ ЗВЕРНЕННЯ] за адресою [АДРЕСА ОБʼЄКТА].

Вимоги:
- офіційно-діловий стиль, звертання на «Ви»
- послатися на Закон України «Про звернення громадян»
- зазначити строк розгляду та відповідальний підрозділ: [ПІДРОЗДІЛ]
- обсяг: до 250 слів
- не вигадувати номери документів, дат і посадових осіб`,
    },
  });

  const p2 = await prisma.prompt.create({
    data: {
      title: 'Лист-запит до іншого органу влади',
      useCase: 'Офіційний стиль, коректні реквізити, чітке формулювання предмета запиту.',
      category: 'LETTERS',
      verified: true,
      body: `Підготуй лист-запит від [ВАШ ОРГАН] до [ОРГАН-АДРЕСАТ] щодо [ПРЕДМЕТ ЗАПИТУ].

Вимоги: офіційно-діловий стиль, посилання на компетенцію органу, чіткий строк очікуваної відповіді, без вигаданих реквізитів.`,
    },
  });

  const p3 = await prisma.prompt.create({
    data: {
      title: 'Протокол наради з робочого конспекту',
      useCase: 'Структурує рішення, доручення та відповідальних із чернетки нотаток.',
      category: 'MEETINGS',
      verified: true,
      body: `Склади протокол наради з цього конспекту: [КОНСПЕКТ].

Виділи: перелік присутніх, розглянуті питання, ухвалені рішення, доручення з відповідальними та строками виконання.`,
    },
  });

  const p4 = await prisma.prompt.create({
    data: {
      title: 'Аналітична довідка для керівника',
      useCase: 'Структура: висновки, ризики, рекомендації — до однієї сторінки.',
      category: 'ANALYTICS',
      verified: true,
      body: `Підготуй аналітичну довідку на основі: [ДАНІ].

Структура: короткі висновки, виявлені ризики, конкретні рекомендації. Обсяг — до однієї сторінки, без вигаданих цифр.`,
    },
  });

  await prisma.prompt.create({
    data: {
      title: 'Проєкт наказу про внутрішні правила використання ШІ',
      useCase: 'Преамбула, пункти наказу, структура типового розпорядчого документа.',
      category: 'INTERNAL',
      verified: true,
      body: `Підготуй проєкт наказу про [ПРЕДМЕТ НАКАЗУ] для [ОРГАН ВЛАДИ].

Структура: преамбула з підставою видання, пункти наказу, відповідальні за виконання, пункт про контроль.`,
    },
  });

}

/* ============================================================================
   Ресурси
   ========================================================================= */
async function seedResources() {
  console.log('Створення ресурсів…');
  await prisma.resource.createMany({
    data: [
      {
        title: 'Практичні рекомендації з використання ШІ в публічному управлінні',
        summary: 'Базовий нормативний документ платформи. Дванадцять розділів із прикладами.',
        kind: 'GUIDE',
        version: 'v1.3',
      },
      {
        title: 'Алгоритм перевірки результату за 5 кроків',
        summary: 'Факти й цифри, посилання на НПА, логіка, повнота, формальні вимоги.',
        kind: 'CHECKLIST',
        version: 'v2.0',
      },
      {
        title: 'Типове положення про використання ШІ в органі влади',
        summary: 'Проєкт внутрішнього документа для адаптації під конкретну установу.',
        kind: 'TEMPLATE',
        version: 'v1.1',
      },
    ],
  });
}
