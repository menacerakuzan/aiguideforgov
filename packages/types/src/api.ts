import { z } from 'zod';
import {
  CertificateSchema,
  CourseSchema,
  LessonBlockSchema,
  LessonCommentSchema,
  LibraryItemSchema,
  LibraryKindSchema,
  OrganizationSchema,
  PromptCategorySchema,
  PromptSchema,
  PublicCertificateSchema,
  ResourceKindSchema,
  ResourceSchema,
  SectionColorSchema,
} from './domain';
import { RoleSchema } from './role';

/* ============================================================================
   DTO API-маршрутів: вхід (Input) і вихід (Response) кожного ендпоінта.
   ========================================================================= */

export const ApiErrorSchema = z.object({
  error: z.string(),
  details: z.unknown().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

/* --- Реєстрація/вхід (Better Auth приймає ці поля напряму) ------------------ */

/**
 * Пошта як ідентифікатор акаунта мусить бути в одному регістрі: Better Auth
 * шукає користувача точним збігом, тож «Ivan@gov.ua» на реєстрації і
 * «ivan@gov.ua» на вході — це два різні рядки й «невірний пароль».
 */
export const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Перевірте адресу')
  .max(254, 'Задовга адреса');

/**
 * Порожній рядок із <select> («Оберіть зі списку») — це «не обрано», а не
 * ідентифікатор організації. Без цього перетворення він доходив до бази й
 * ламав реєстрацію порушенням зовнішнього ключа.
 */
const OptionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || undefined)
    .optional();

export const RegisterInputSchema = z
  .object({
    name: z.string().trim().min(2, 'Вкажіть імʼя').max(120, 'Задовге імʼя'),
    email: EmailSchema,
    // Верхня межа — щоб довгий пароль не перетворювався на навантаження на хешування.
    password: z.string().min(8, 'Мінімум 8 символів').max(128, 'Задовгий пароль'),
    // Пароль вводиться прихованим, тож друкарську помилку не видно. Без другого
    // поля людина дізнається про неї аж на вході — коли вже не памʼятає, що саме
    // набрала, і відновити доступ може лише через підтримку.
    confirmPassword: z.string().min(1, 'Повторіть пароль'),
    organizationId: OptionalTrimmed(64),
    position: OptionalTrimmed(160),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Паролі не збігаються',
    // Помилку показуємо під другим полем — саме його виправляють.
    path: ['confirmPassword'],
  });
export type RegisterInput = z.infer<typeof RegisterInputSchema>;

export const LoginInputSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Вкажіть пароль'),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

/* --- /api/users (лише ADMIN) ------------------------------------------------ */
export const UsersListResponseSchema = z.object({
  users: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      role: RoleSchema,
      organizationName: z.string().nullable(),
      streak: z.number().int(),
      progressPct: z.number().int(),
      certified: z.boolean(),
      lastActiveAt: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
  total: z.number().int(),
});
export type UsersListResponse = z.infer<typeof UsersListResponseSchema>;

export const UpdateUserRoleInputSchema = z.object({
  userId: z.string(),
  role: RoleSchema,
});
export type UpdateUserRoleInput = z.infer<typeof UpdateUserRoleInputSchema>;

/* --- /api/profile ------------------------------------------------------------ */
/**
 * null — свідоме «прибрати значення»; undefined — «не чіпати це поле».
 * Порожній рядок із форми означає перше, а не збереження порожнього рядка.
 */
const ClearableTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .nullable()
    .optional();

export const UpdateProfileInputSchema = z.object({
  position: ClearableTrimmed(160),
  organizationId: ClearableTrimmed(64),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileInputSchema>;

/* --- /api/courses, /api/sections, /api/modules ------------------------------- */
export const CoursesResponseSchema = z.object({ courses: z.array(CourseSchema) });
export type CoursesResponse = z.infer<typeof CoursesResponseSchema>;

export const CreateCourseInputSchema = z.object({
  slug: z.string().min(2),
  title: z.string().min(2),
  description: z.string().min(1),
});
export type CreateCourseInput = z.infer<typeof CreateCourseInputSchema>;

export const CreateSectionInputSchema = z.object({
  courseId: z.string(),
  slug: z.string().min(2),
  title: z.string().min(2),
  description: z.string().min(1),
  order: z.number().int(),
  color: SectionColorSchema,
});
export type CreateSectionInput = z.infer<typeof CreateSectionInputSchema>;
export const UpdateSectionInputSchema = CreateSectionInputSchema.partial().extend({ id: z.string() });
export type UpdateSectionInput = z.infer<typeof UpdateSectionInputSchema>;

export const CreateModuleInputSchema = z.object({
  sectionId: z.string(),
  slug: z.string().min(2),
  title: z.string().min(2),
  description: z.string().min(1),
  order: z.number().int(),
  minutes: z.number().int().positive(),
  isKey: z.boolean().default(false),
  passScore: z.number().int().min(0).max(100).default(75),
});
export type CreateModuleInput = z.infer<typeof CreateModuleInputSchema>;
export const UpdateModuleInputSchema = CreateModuleInputSchema.partial().extend({ id: z.string() });
export type UpdateModuleInput = z.infer<typeof UpdateModuleInputSchema>;

export const CreateLessonInputSchema = z.object({
  moduleId: z.string(),
  slug: z.string().min(2),
  title: z.string().min(2),
  minutes: z.number().int().positive(),
  order: z.number().int(),
  kind: z.enum(['LESSON', 'EXERCISE']).default('LESSON'),
  blocks: z.array(LessonBlockSchema),
  /// Дата, станом на яку контент перевірено й актуальний (ISO-рядок)
  validAsOf: z.string().nullable().optional(),
});
export type CreateLessonInput = z.infer<typeof CreateLessonInputSchema>;
export const UpdateLessonInputSchema = CreateLessonInputSchema.partial().extend({ id: z.string() });
export type UpdateLessonInput = z.infer<typeof UpdateLessonInputSchema>;

export const LessonRevisionSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  editedByName: z.string(),
});
export type LessonRevisionSummary = z.infer<typeof LessonRevisionSchema>;

export const LessonRevisionsResponseSchema = z.object({ revisions: z.array(LessonRevisionSchema) });
export type LessonRevisionsResponse = z.infer<typeof LessonRevisionsResponseSchema>;

export const QuestionInputSchema = z.object({
  text: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(6),
  correctIndex: z.number().int().nonnegative(),
  explainCorrect: z.string().min(1),
  explainWrong: z.string().min(1),
});
export type QuestionInput = z.infer<typeof QuestionInputSchema>;

export const UpsertQuizInputSchema = z.object({
  moduleId: z.string(),
  passScore: z.number().int().min(0).max(100).default(75),
  questions: z.array(QuestionInputSchema).min(1),
});
export type UpsertQuizInput = z.infer<typeof UpsertQuizInputSchema>;

export const FinalExamQuestionInputSchema = QuestionInputSchema.extend({
  isSecurity: z.boolean().default(false),
});
export type FinalExamQuestionInput = z.infer<typeof FinalExamQuestionInputSchema>;

export const UpsertFinalExamInputSchema = z.object({
  courseId: z.string(),
  passScore: z.number().int().min(0).max(100).default(80),
  securityPassScore: z.number().int().min(0).max(100).default(90),
  questions: z.array(FinalExamQuestionInputSchema).min(1),
});
export type UpsertFinalExamInput = z.infer<typeof UpsertFinalExamInputSchema>;

/* --- Відновлення пароля через адміністратора --------------------------------------- */

export const PasswordResetStatusSchema = z.enum(['PENDING', 'DONE', 'DISMISSED']);
export type PasswordResetStatus = z.infer<typeof PasswordResetStatusSchema>;

export const PASSWORD_RESET_STATUS_LABELS: Record<PasswordResetStatus, string> = {
  PENDING: 'У черзі',
  DONE: 'Пароль скинуто',
  DISMISSED: 'Закрито',
};

/** Заявка від людини, яка не памʼятає пароль. Публічна форма — лише пошта. */
export const RequestPasswordResetInputSchema = z.object({ email: EmailSchema });
export type RequestPasswordResetInput = z.infer<typeof RequestPasswordResetInputSchema>;

/** Рядок черги в адмінці. Пароля тут немає й бути не може — лише хеш у базі. */
export const PasswordResetRequestRowSchema = z.object({
  id: z.string(),
  email: z.string(),
  status: PasswordResetStatusSchema,
  createdAt: z.string(),
  /** Імʼя знайденого акаунта; null — такого користувача немає. */
  accountName: z.string().nullable(),
  accountExists: z.boolean(),
  handledAt: z.string().nullable(),
  handledByName: z.string().nullable(),
});
export type PasswordResetRequestRow = z.infer<typeof PasswordResetRequestRowSchema>;

export const HandlePasswordResetInputSchema = z.object({
  requestId: z.string(),
  action: z.enum(['RESET', 'DISMISS']),
});
export type HandlePasswordResetInput = z.infer<typeof HandlePasswordResetInputSchema>;

export const HandlePasswordResetResponseSchema = z.object({
  /** Новий пароль — віддається РІВНО ОДИН РАЗ, у базі лишається тільки хеш. */
  password: z.string().nullable(),
});
export type HandlePasswordResetResponse = z.infer<typeof HandlePasswordResetResponseSchema>;

/* --- /api/progress/stats — повна картина прогресу слухача ------------------------- */

/** Один день з активністю в календарі навчання. */
export const ActivityDaySchema = z.object({
  /** 'РРРР-ММ-ДД' за київським часом. */
  date: z.string(),
  lessons: z.number().int().nonnegative(),
  quizzes: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});
export type ActivityDayDto = z.infer<typeof ActivityDaySchema>;

/**
 * Серія днів навчання. `current` рахується з історії при кожному читанні —
 * пропущений день гасить серію (див. services/learning/src/streak.ts).
 */
export const StreakStateSchema = z.object({
  current: z.number().int().nonnegative(),
  longest: z.number().int().nonnegative(),
  activeDays: z.number().int().nonnegative(),
  lastActiveDate: z.string().nullable(),
  activeToday: z.boolean(),
  /** Останній день активності — вчора: сьогодні без уроку серія згорить. */
  atRisk: z.boolean(),
});
export type StreakState = z.infer<typeof StreakStateSchema>;

export const ModuleProgressStatusSchema = z.enum(['DONE', 'IN_PROGRESS', 'NOT_STARTED']);
export type ModuleProgressStatus = z.infer<typeof ModuleProgressStatusSchema>;

export const ModuleProgressRowSchema = z.object({
  slug: z.string(),
  title: z.string(),
  order: z.number().int(),
  isKey: z.boolean(),
  sectionTitle: z.string(),
  sectionSlug: z.string(),
  lessonCount: z.number().int(),
  completedLessons: z.number().int(),
  minutes: z.number().int(),
  hasQuiz: z.boolean(),
  /** null — у модуля немає тесту. */
  quizPassed: z.boolean().nullable(),
  passScore: z.number().int(),
  /** Найкращий бал за всі спроби; null — тест ще не проходили. */
  bestScore: z.number().int().nullable(),
  attempts: z.number().int(),
  status: ModuleProgressStatusSchema,
});
export type ModuleProgressRow = z.infer<typeof ModuleProgressRowSchema>;

export const PointsEntrySchema = z.object({
  label: z.string(),
  count: z.number().int(),
  /** Людською мовою: скільки дає одна така дія. */
  each: z.string(),
  points: z.number().int(),
});
export type PointsEntry = z.infer<typeof PointsEntrySchema>;

export const SectionProgressRowSchema = z.object({
  slug: z.string(),
  title: z.string(),
  color: SectionColorSchema,
  order: z.number().int(),
  moduleCount: z.number().int(),
  completedModules: z.number().int(),
  lessonCount: z.number().int(),
  completedLessons: z.number().int(),
});
export type SectionProgressRow = z.infer<typeof SectionProgressRowSchema>;

export const LearnerStatsSchema = z.object({
  course: z.object({ slug: z.string(), title: z.string() }).nullable(),
  lessons: z.object({ completed: z.number().int(), total: z.number().int() }),
  modules: z.object({ completed: z.number().int(), total: z.number().int() }),
  sections: z.array(SectionProgressRowSchema),
  moduleRows: z.array(ModuleProgressRowSchema),
  /** Хвилини пройдених уроків — сума minutes саме завершених уроків. */
  minutes: z.number().int(),
  streak: StreakStateSchema,
  activity: z.array(ActivityDaySchema),
  points: z.array(PointsEntrySchema),
  totalPoints: z.number().int(),
  quizzes: z.object({
    taken: z.number().int(),
    passed: z.number().int(),
    total: z.number().int(),
    averageBest: z.number().int().nullable(),
  }),
  exam: z.object({
    attempts: z.number().int(),
    bestScore: z.number().int().nullable(),
    passed: z.boolean(),
  }),
  certificates: z.number().int(),
  startedAt: z.string().nullable(),
  lastActivityAt: z.string().nullable(),
});
export type LearnerStats = z.infer<typeof LearnerStatsSchema>;

/* --- /api/progress ----------------------------------------------------------- */
export const CompleteLessonInputSchema = z.object({ lessonId: z.string() });
export type CompleteLessonInput = z.infer<typeof CompleteLessonInputSchema>;

export const CompleteLessonResponseSchema = z.object({
  moduleCompleted: z.boolean(),
  completedLessons: z.number().int(),
  lessonCount: z.number().int(),
  streak: z.number().int(),
});
export type CompleteLessonResponse = z.infer<typeof CompleteLessonResponseSchema>;

export const SubmitQuizInputSchema = z.object({
  quizId: z.string(),
  answers: z.array(z.number().int().nonnegative()),
});
export type SubmitQuizInput = z.infer<typeof SubmitQuizInputSchema>;

export const QuizReviewItemSchema = z.object({
  questionText: z.string(),
  pickedIndex: z.number().int(),
  correctIndex: z.number().int(),
  correctText: z.string(),
  ok: z.boolean(),
  explain: z.string(),
});
export type QuizReviewItem = z.infer<typeof QuizReviewItemSchema>;

export const SubmitQuizResponseSchema = z.object({
  score: z.number().int(),
  passed: z.boolean(),
  passScore: z.number().int(),
  review: z.array(QuizReviewItemSchema),
});
export type SubmitQuizResponse = z.infer<typeof SubmitQuizResponseSchema>;

export const SubmitFinalExamInputSchema = z.object({
  examId: z.string(),
  answers: z.array(z.number().int().nonnegative()),
});
export type SubmitFinalExamInput = z.infer<typeof SubmitFinalExamInputSchema>;

export const SubmitFinalExamResponseSchema = z.object({
  score: z.number().int(),
  securityScore: z.number().int(),
  passed: z.boolean(),
  passScore: z.number().int(),
  securityPassScore: z.number().int(),
  review: z.array(QuizReviewItemSchema),
  certificate: CertificateSchema.nullable(),
});
export type SubmitFinalExamResponse = z.infer<typeof SubmitFinalExamResponseSchema>;

export const MyProgressResponseSchema = z.object({
  course: CourseSchema,
  /** Повний стан серії: поточна, рекорд, чи була активність сьогодні. */
  streak: StreakStateSchema,
  totalMinutes: z.number().int(),
  completedModules: z.number().int(),
  moduleCount: z.number().int(),
  examEligible: z.boolean(),
  hasCertificate: z.boolean(),
});
export type MyProgressResponse = z.infer<typeof MyProgressResponseSchema>;

/* --- /api/prompts -------------------------------------------------------------- */
export const PromptsQuerySchema = z.object({
  q: z.string().optional(),
  category: PromptCategorySchema.optional(),
  favorites: z.coerce.boolean().optional(),
});
export type PromptsQuery = z.infer<typeof PromptsQuerySchema>;

export const PromptsResponseSchema = z.object({ prompts: z.array(PromptSchema) });
export type PromptsResponse = z.infer<typeof PromptsResponseSchema>;

export const PromptIdInputSchema = z.object({ promptId: z.string() });
export type PromptIdInput = z.infer<typeof PromptIdInputSchema>;

/* --- /api/certificates ---------------------------------------------------------- */
export const VerifyCertificateResponseSchema = z.object({
  status: z.enum(['VALID', 'EXPIRED', 'REVOKED', 'NOT_FOUND']),
  certificate: PublicCertificateSchema.nullable(),
});
export type VerifyCertificateResponse = z.infer<typeof VerifyCertificateResponseSchema>;

export const RevokeCertificateInputSchema = z.object({
  certificateId: z.string(),
  reason: z.string().min(3, 'Вкажіть причину'),
});
export type RevokeCertificateInput = z.infer<typeof RevokeCertificateInputSchema>;

export const AdminCertificatesResponseSchema = z.object({
  certificates: z.array(
    CertificateSchema.extend({
      holderEmail: z.string(),
    }),
  ),
});
export type AdminCertificatesResponse = z.infer<typeof AdminCertificatesResponseSchema>;

/* --- /api/analytics/platform (ADMIN) -------------------------------------------- */
export const PlatformStatsResponseSchema = z.object({
  totalUsers: z.number().int(),
  activeLast7Days: z.number().int(),
  certificatesIssued: z.number().int(),
  averageQuizScore: z.number().int(),
  started: z.number().int(),
  completedAllModules: z.number().int(),
});
export type PlatformStatsResponse = z.infer<typeof PlatformStatsResponseSchema>;

/* --- Публічна лендинг-статистика (без авторизації) ------------------------------- */
export const PublicStatsResponseSchema = z.object({
  learnerCount: z.number().int(),
  moduleCount: z.number().int(),
  totalMinutes: z.number().int(),
  sectionCount: z.number().int(),
});
export type PublicStatsResponse = z.infer<typeof PublicStatsResponseSchema>;

/* --- /api/analytics/dropoff (ADMIN) --------------------------------------------- */
export const LessonDropoffRowSchema = z.object({
  lessonId: z.string(),
  lessonTitle: z.string(),
  moduleTitle: z.string(),
  reached: z.number().int(),
  completed: z.number().int(),
  dropoffPct: z.number().int(),
});
export type LessonDropoffRow = z.infer<typeof LessonDropoffRowSchema>;

export const DropoffResponseSchema = z.object({ rows: z.array(LessonDropoffRowSchema) });
export type DropoffResponse = z.infer<typeof DropoffResponseSchema>;

/* --- /api/library («трофеї» з пройдених уроків) ---------------------------- */
export const LibraryQuerySchema = z.object({
  q: z.string().optional(),
});
export type LibraryQuery = z.infer<typeof LibraryQuerySchema>;

/**
 * Бібліотека — це не каталог усього наявного, а те, що слухач уже заробив:
 * матеріал зʼявляється тут лише після проходження уроку, який його дає.
 * Тому поруч із самими матеріалами віддаємо й лічильники закритого — без них
 * порожня бібліотека виглядала б як помилка, а не як «ще нічого не пройдено».
 */
export const LibraryResponseSchema = z.object({
  items: z.array(LibraryItemSchema),
  /** Скільки матеріалів ще закрито — по всіх уроках курсу, не лише знайдених пошуком. */
  lockedCount: z.number().int().nonnegative(),
  /** Уроків із трофеями вже пройдено. */
  unlockedLessons: z.number().int().nonnegative(),
  /** Усього уроків, які щось дають у бібліотеку. */
  totalTrophyLessons: z.number().int().nonnegative(),
  /** Скільки відкрито по кожному типу — для лічильників на фільтрах. */
  countsByKind: z.record(LibraryKindSchema, z.number().int().nonnegative()),
});
export type LibraryResponse = z.infer<typeof LibraryResponseSchema>;

export const CreateResourceInputSchema = z.object({
  title: z.string().min(2),
  summary: z.string().min(1),
  body: z.string().default(''),
  kind: ResourceKindSchema,
  version: z.string().min(1),
});
export type CreateResourceInput = z.infer<typeof CreateResourceInputSchema>;
export const UpdateResourceInputSchema = CreateResourceInputSchema.partial().extend({ id: z.string() });
export type UpdateResourceInput = z.infer<typeof UpdateResourceInputSchema>;

export const CreatePromptInputSchema = z.object({
  title: z.string().min(2),
  useCase: z.string().min(1),
  body: z.string().min(1),
  category: PromptCategorySchema,
});
export type CreatePromptInput = z.infer<typeof CreatePromptInputSchema>;
export const UpdatePromptInputSchema = CreatePromptInputSchema.partial().extend({ id: z.string() });
export type UpdatePromptInput = z.infer<typeof UpdatePromptInputSchema>;

/* --- /api/search ----------------------------------------------------------------- */
export const SearchResultItemSchema = z.object({
  kind: z.enum(['lesson', 'prompt', 'resource']),
  id: z.string(),
  title: z.string(),
  snippet: z.string(),
  href: z.string(),
});
export type SearchResultItem = z.infer<typeof SearchResultItemSchema>;

export const SearchResponseSchema = z.object({ results: z.array(SearchResultItemSchema) });
export type SearchResponse = z.infer<typeof SearchResponseSchema>;

/* --- /api/lessons/[id]/comments ---------------------------------------------------- */
export const CommentsResponseSchema = z.object({ comments: z.array(LessonCommentSchema) });
export type CommentsResponse = z.infer<typeof CommentsResponseSchema>;

export const CreateCommentInputSchema = z.object({
  lessonId: z.string(),
  body: z.string().min(1).max(2000),
});
export type CreateCommentInput = z.infer<typeof CreateCommentInputSchema>;

export const ReactToCommentInputSchema = z.object({
  commentId: z.string(),
  value: z.union([z.literal(1), z.literal(-1)]),
});
export type ReactToCommentInput = z.infer<typeof ReactToCommentInputSchema>;

/* --- /api/admin/organizations (ADMIN) --------------------------------------------- */
export const OrganizationsResponseSchema = z.object({
  organizations: z.array(OrganizationSchema.extend({ userCount: z.number().int() })),
});
export type OrganizationsResponse = z.infer<typeof OrganizationsResponseSchema>;

export const CreateOrganizationInputSchema = z.object({
  name: z.string().min(2),
  kind: z.string().min(1),
});
export type CreateOrganizationInput = z.infer<typeof CreateOrganizationInputSchema>;
export const UpdateOrganizationInputSchema = CreateOrganizationInputSchema.partial().extend({ id: z.string() });
export type UpdateOrganizationInput = z.infer<typeof UpdateOrganizationInputSchema>;

export const AssignUserOrgInputSchema = z.object({
  userId: z.string(),
  organizationId: z.string().nullable(),
});
export type AssignUserOrgInput = z.infer<typeof AssignUserOrgInputSchema>;

/* --- /api/admin/users/import (CSV, ADMIN) ------------------------------------------ */
export const ImportUsersInputSchema = z.object({
  organizationId: z
    .string()
    .trim()
    .max(64)
    .transform((v) => v || null)
    .nullable(),
  // Верхня межа файлу: імпорт іде синхронно, рядок за рядком.
  csv: z.string().min(1).max(1_000_000),
});
export type ImportUsersInput = z.infer<typeof ImportUsersInputSchema>;

export const ImportUsersResultRowSchema = z.object({
  email: z.string(),
  status: z.enum(['created', 'skipped_exists', 'error']),
  message: z.string().optional(),
});
export type ImportUsersResultRow = z.infer<typeof ImportUsersResultRowSchema>;

export const ImportUsersResponseSchema = z.object({
  created: z.number().int(),
  skipped: z.number().int(),
  rows: z.array(ImportUsersResultRowSchema),
});
export type ImportUsersResponse = z.infer<typeof ImportUsersResponseSchema>;
