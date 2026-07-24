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
    /** URL — пряме посилання на .mp4/.webm/.ogg АБО embed-посилання (YouTube/Vimeo). */
    type: z.literal('video'),
    url: z.string().url(),
    caption: z.string().optional(),
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
