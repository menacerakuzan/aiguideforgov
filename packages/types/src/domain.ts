import { z } from 'zod';

/* ============================================================================
   Доменні схеми. Ієрархія контенту: Course → Section → Module → Lesson.
   Дати — ISO-рядки, JSON-поля — розібрані структури.
   ========================================================================= */

export const SectionColorSchema = z.enum(['BLUE', 'GREEN', 'AMBER', 'RED', 'SUN', 'GOLD', 'MUTED', 'INK']);
export type SectionColor = z.infer<typeof SectionColorSchema>;

/* --- Блоки контенту уроку (contentJson) ---------------------------------- */

export const LessonBlockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), html: z.string() }),
  z.object({
    type: z.literal('trafficLight'),
    categories: z.tuple([
      z.object({ label: z.string(), description: z.string(), examples: z.array(z.string()) }),
      z.object({ label: z.string(), description: z.string(), examples: z.array(z.string()) }),
      z.object({ label: z.string(), description: z.string(), examples: z.array(z.string()) }),
    ]),
  }),
  z.object({
    type: z.literal('pair'),
    danger: z.object({ note: z.string(), example: z.string() }),
    safe: z.object({ note: z.string(), example: z.string() }),
    /** Заголовки колонок. За замовчуванням — «Ніколи так не робіть» / «Ось як безпечно».
        Перевизначаємо, коли пара не про безпеку (напр. слабкий і робочий промпт). */
    dangerTitle: z.string().optional(),
    safeTitle: z.string().optional(),
  }),
  z.object({
    type: z.literal('redact'),
    intro: z.string(),
    letterhead: z.string(),
    segments: z.array(
      z.union([
        z.object({ text: z.string() }),
        z.object({ text: z.string(), redactable: z.literal(true), pii: z.boolean() }),
      ]),
    ),
  }),
  z.object({
    type: z.literal('check'),
    question: z.string(),
    options: z.array(z.string()).min(2),
    correctIndex: z.number().int().nonnegative(),
    explainCorrect: z.string(),
    explainWrong: z.string(),
  }),
  z.object({
    /** URL — пряме посилання на .mp4/.webm/.ogg АБО embed-посилання (YouTube/Vimeo).
        Порожній/відсутній URL — це не помилка: показуємо заглушку «тут буде відео»
        з описом із `note`, доки ролик не знято. */
    type: z.literal('video'),
    url: z.string().url().optional(),
    caption: z.string().optional(),
    /** Що саме буде у відео — текст заглушки, доки немає url. */
    note: z.string().optional(),
    /** Орієнтовна тривалість для заглушки, напр. «3 хв». */
    duration: z.string().optional(),
  }),
  z.object({
    /** Зображення уроку: скріншот або ілюстрація. Без `src` — заглушка з описом. */
    type: z.literal('image'),
    src: z.string().optional(),
    alt: z.string(),
    caption: z.string().optional(),
    /** Що має бути на зображенні — текст заглушки, доки немає src. */
    note: z.string().optional(),
    variant: z.enum(['screenshot', 'illustration']).optional(),
  }),
  z.object({
    /** Тренажер-сортувальник: розкласти фрагменти по 2–4 категоріях.
        Перевірка одразу по всіх, з поясненням до кожної помилки. */
    type: z.literal('sort'),
    intro: z.string(),
    buckets: z.array(z.object({
      label: z.string(),
      tone: z.enum(['green', 'amber', 'red', 'blue']),
    })).min(2).max(4),
    items: z.array(z.object({
      text: z.string(),
      /** Індекс правильної категорії у `buckets`. */
      bucket: z.number().int().nonnegative(),
      /** Чому саме сюди — показуємо після перевірки. */
      why: z.string(),
    })).min(3),
  }),
  z.object({
    /** Тренажер-картки: по одному твердженню за раз, миттєвий фідбек.
        Помилкові картки повертаються в кінець черги, доки не будуть пройдені. */
    type: z.literal('pick'),
    intro: z.string(),
    options: z.array(z.string()).min(2).max(3),
    cards: z.array(z.object({
      text: z.string(),
      /** Індекс правильної відповіді в `options`. */
      answer: z.number().int().nonnegative(),
      why: z.string(),
    })).min(3),
  }),
  z.object({
    /** Файл для завантаження: демонстраційний документ, чек-лист, шаблон. */
    type: z.literal('file'),
    url: z.string(),
    name: z.string(),
    /** Навіщо цей файл слухачеві — рядок під назвою. */
    note: z.string().optional(),
    /** Дрібним: формат, обсяг, розмір. Напр. «Markdown · 34 сторінки · 56 КБ». */
    meta: z.string().optional(),
  }),
  z.object({
    /** Конструктор промпту: кілька полів за формулою → зібраний текст із кнопкою
        «Копіювати». Заповнені поля склеюються в одну заготовку через порожній рядок. */
    type: z.literal('builder'),
    intro: z.string(),
    fields: z.array(z.object({
      label: z.string(),
      /** Що писати в це поле — рядок під заголовком. */
      hint: z.string(),
      placeholder: z.string(),
      /** Приклади-підказки: клік підставляє текст у поле. */
      examples: z.array(z.string()).optional(),
      /** Обов'язкове поле: без нього промпт не збирається. За замовчуванням — так. */
      optional: z.boolean().optional(),
      /** Незмінний «хвіст» поля, який дописується після введеного тексту. */
      suffix: z.string().optional(),
    })).min(2).max(6),
    /** Що зробити із зібраним промптом — рядок під результатом. */
    outro: z.string().optional(),
  }),
  z.object({
    /** Вправа «знайди помилки»: документ, у якому частину фрагментів можна клікнути.
        Серед клікабельних є і справжні помилки, і приманки — правильні місця, що
        виглядають підозріло. Це і відрізняє вправу від пошуку підсвіченого. */
    type: z.literal('spot'),
    intro: z.string(),
    docHead: z.string(),
    /** Скільки помилок шукати — показуємо одразу, як у справжній вправі. */
    paragraphs: z.array(z.array(
      z.union([
        z.object({ text: z.string() }),
        z.object({
          text: z.string(),
          flag: z.literal(true),
          /** true — це справжня помилка; false — приманка, тут усе гаразд. */
          wrong: z.boolean(),
          /** Розбір: чому виглядало правдоподібно і як виявляється. */
          why: z.string(),
        }),
      ]),
    )),
  }),
  z.object({
    /** Готовий промпт із кнопкою «Копіювати». Плейсхолдери — у [КВАДРАТНИХ ДУЖКАХ]. */
    type: z.literal('prompt'),
    body: z.string(),
    title: z.string().optional(),
    /** Коротке пояснення під промптом (для чого він і що замінити). */
    note: z.string().optional(),
  }),
]);
export type LessonBlock = z.infer<typeof LessonBlockSchema>;

/* --- Сутності ------------------------------------------------------------- */

export const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.string(),
});
export type Organization = z.infer<typeof OrganizationSchema>;

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['LEARNER', 'ADMIN']),
  position: z.string().nullable(),
  organizationId: z.string().nullable(),
  organization: OrganizationSchema.nullable().optional(),
  streak: z.number().int().nonnegative(),
  createdAt: z.string(),
});
export type User = z.infer<typeof UserSchema>;

export const LessonSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  minutes: z.number().int().positive(),
  order: z.number().int(),
  kind: z.enum(['LESSON', 'EXERCISE']),
  completed: z.boolean().optional(),
});
export type LessonSummary = z.infer<typeof LessonSummarySchema>;

export const LessonSchema = LessonSummarySchema.extend({
  moduleId: z.string(),
  moduleSlug: z.string(),
  moduleTitle: z.string(),
  sectionSlug: z.string(),
  blocks: z.array(LessonBlockSchema),
  validAsOf: z.string().nullable().optional(),
  nextLesson: LessonSummarySchema.pick({ id: true, slug: true, title: true, minutes: true })
    .nullable()
    .optional(),
});
export type Lesson = z.infer<typeof LessonSchema>;

export const ModuleSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  order: z.number().int(),
  minutes: z.number().int().positive(),
  isKey: z.boolean(),
  passScore: z.number().int().min(0).max(100),
  sectionId: z.string().optional(),
  sectionSlug: z.string().optional(),
  sectionTitle: z.string().optional(),
  /** Курс, якому належить модуль — для навігації «модуль → курс». */
  courseSlug: z.string().optional(),
  courseTitle: z.string().optional(),
  lessons: z.array(LessonSummarySchema).optional(),
  lessonCount: z.number().int().optional(),
  completedLessons: z.number().int().optional(),
  hasQuiz: z.boolean().optional(),
  quizPassed: z.boolean().optional(),
});
export type Module = z.infer<typeof ModuleSchema>;

export const SectionSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  order: z.number().int(),
  color: SectionColorSchema,
  courseId: z.string().optional(),
  modules: z.array(ModuleSchema).optional(),
  moduleCount: z.number().int().optional(),
  completedModules: z.number().int().optional(),
});
export type Section = z.infer<typeof SectionSchema>;

export const CourseSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  sections: z.array(SectionSchema).optional(),
  sectionCount: z.number().int().optional(),
  moduleCount: z.number().int().optional(),
  lessonCount: z.number().int().optional(),
  completedModules: z.number().int().optional(),
  learnerCount: z.number().int().optional(),
  /** Чи це курс, який слухач обрав активним (визначає вміст дашборда) */
  isActive: z.boolean().optional(),
});
export type Course = z.infer<typeof CourseSchema>;

export const QuestionSchema = z.object({
  id: z.string(),
  text: z.string(),
  options: z.array(z.string()).min(2),
  order: z.number().int(),
});
export type Question = z.infer<typeof QuestionSchema>;

export const QuizSchema = z.object({
  id: z.string(),
  moduleSlug: z.string(),
  moduleTitle: z.string(),
  passScore: z.number().int(),
  questions: z.array(QuestionSchema),
});
export type Quiz = z.infer<typeof QuizSchema>;

export const FinalExamQuestionSchema = z.object({
  id: z.string(),
  text: z.string(),
  options: z.array(z.string()).min(2),
  order: z.number().int(),
  isSecurity: z.boolean(),
});
export type FinalExamQuestionDto = z.infer<typeof FinalExamQuestionSchema>;

export const FinalExamSchema = z.object({
  id: z.string(),
  courseSlug: z.string(),
  courseTitle: z.string(),
  passScore: z.number().int(),
  securityPassScore: z.number().int(),
  questions: z.array(FinalExamQuestionSchema),
  /** Чи всі обов'язкові модулі курсу вже пройдені — розблокування атестації */
  eligible: z.boolean().optional(),
});
export type FinalExam = z.infer<typeof FinalExamSchema>;

export const PromptCategorySchema = z.enum(['CITIZENS', 'LETTERS', 'MEETINGS', 'ANALYTICS', 'INTERNAL']);
export type PromptCategory = z.infer<typeof PromptCategorySchema>;

export const PROMPT_CATEGORY_LABELS: Record<PromptCategory, string> = {
  CITIZENS: 'Звернення громадян',
  LETTERS: 'Службові листи',
  MEETINGS: 'Протоколи та наради',
  ANALYTICS: 'Аналітичні документи',
  INTERNAL: 'Внутрішні документи',
};

export const PromptSchema = z.object({
  id: z.string(),
  title: z.string(),
  useCase: z.string(),
  body: z.string(),
  category: PromptCategorySchema,
  verified: z.boolean(),
  copyCount: z.number().int().nonnegative(),
  favorite: z.boolean().optional(),
});
export type Prompt = z.infer<typeof PromptSchema>;

export const CertificateSchema = z.object({
  id: z.string(),
  code: z.string(),
  userId: z.string(),
  holderName: z.string(),
  holderPosition: z.string().nullable(),
  organizationName: z.string().nullable(),
  score: z.number().int().min(0).max(100),
  withHonors: z.boolean(),
  issuedAt: z.string(),
  validUntil: z.string(),
  revoked: z.boolean(),
});
export type Certificate = z.infer<typeof CertificateSchema>;

export const AttemptSchema = z.object({
  id: z.string(),
  quizId: z.string(),
  score: z.number().int().min(0).max(100),
  passed: z.boolean(),
  answers: z.array(z.number().int()),
  createdAt: z.string(),
});
export type Attempt = z.infer<typeof AttemptSchema>;

export const ExamAttemptSchema = z.object({
  id: z.string(),
  examId: z.string(),
  score: z.number().int().min(0).max(100),
  securityScore: z.number().int().min(0).max(100),
  passed: z.boolean(),
  answers: z.array(z.number().int()),
  createdAt: z.string(),
});
export type ExamAttempt = z.infer<typeof ExamAttemptSchema>;

export const NotificationSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});
export type Notification = z.infer<typeof NotificationSchema>;

export const ResourceKindSchema = z.enum(['GUIDE', 'CHECKLIST', 'TEMPLATE', 'REGULATION', 'TABLE', 'RULE']);
export type ResourceKind = z.infer<typeof ResourceKindSchema>;

export const RESOURCE_KIND_LABELS: Record<ResourceKind, string> = {
  GUIDE: 'Методичка',
  CHECKLIST: 'Чек-лист',
  TEMPLATE: 'Шаблон',
  REGULATION: 'Регламент',
  TABLE: 'Таблиця',
  RULE: 'Правило',
};

export const ResourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  body: z.string(),
  kind: ResourceKindSchema,
  version: z.string(),
  updatedAt: z.string(),
});
export type Resource = z.infer<typeof ResourceSchema>;

/* --- Коментарі під уроком ------------------------------------------------- */

export const LessonCommentSchema = z.object({
  id: z.string(),
  lessonId: z.string(),
  body: z.string(),
  authorName: z.string(),
  isOwn: z.boolean(),
  likes: z.number().int(),
  dislikes: z.number().int(),
  myReaction: z.union([z.literal(1), z.literal(-1), z.null()]),
  createdAt: z.string(),
});
export type LessonComment = z.infer<typeof LessonCommentSchema>;
