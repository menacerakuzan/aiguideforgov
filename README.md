# Ясно

Production-платформа безпечного використання штучного інтелекту для державної служби.
Дизайн-мова — приглушений claymorphism («Ясно»), світлофор даних як сигнатурна концепція.
Канонічний дизайн-референс (5 статичних HTML-прототипів) лежить у `docs/design-reference/`.

## Стек

| Шар | Технологія |
|---|---|
| Frontend | Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui-примітиви · Motion · TanStack Query · Zod · React Hook Form |
| Backend | Next.js Route Handlers, бізнес-логіка винесена в `services/*` |
| База даних | SQLite |
| ORM | Prisma |
| Auth | Better Auth (email/password) + власна RBAC-матриця на 5 ролей |
| Кеш / файли / пошта | Локальні реалізації (`services/infra`) за інтерфейсами Storage/Cache/Mailer — під заміну на S3/Redis/Resend без зміни викликів |

## Структура монорепо

```
apps/
  web/                 Next.js застосунок: сторінки + API routes

packages/
  ui/                  Дизайн-система (clay-компоненти, порт docs/design-reference)
  icons/                Іконки, включно з фірмовим тріо світлофора (коло/трикутник/восьмикутник)
  config/               tsconfig-пресети, eslint, Tailwind v4 тема (@theme)
  types/                Zod-схеми домену й DTO — спільні для фронту й бекенду

services/
  auth/                 Better Auth інстанс, сесії, requireRole/can() RBAC-матриця
  learning/             Курси, уроки, прогрес, тести, тригер сертифіката
  prompts/              Бібліотека промптів, обране, лічильник копіювань
  certificates/         Видача / публічна перевірка / відкликання сертифікатів
  analytics/            Статистика для HR (організація) та ADMIN (платформа)
  infra/                Storage / Cache / Mailer — інтерфейси + локальні реалізації

prisma/                 @yasno/db: schema.prisma, міграції, seed, Prisma-клієнт
docs/
  design-reference/     Оригінальні 5 HTML-прототипів «Ясно» (еталон дизайну)
```

## RBAC — 5 ролей

`LEARNER` → `HR` → `EDITOR` → `ADMIN` → `SUPERADMIN` (ієрархія за зростанням прав).
Матриця дій `can(role, action)` і гард `requireRole(role, min)` — у `services/auth/src/rbac.ts`.
Зміна ролі користувача можлива лише через `SUPERADMIN` (`PATCH /api/users`).

## Швидкий старт

```bash
pnpm install
cp .env.example .env          # BETTER_AUTH_SECRET згенеровано автоматично при першому запуску
pnpm db:migrate                # створює SQLite-базу + застосовує схему
pnpm db:seed                   # наповнює демо-контентом (якщо не виконалось разом із migrate)
pnpm dev                       # http://localhost:3000
```

Перевірка якості:

```bash
pnpm typecheck   # tsc --noEmit по всіх 11 пакетах
pnpm lint
pnpm build
```

## Демо-акаунти

Пароль для всіх — **`Yasno2026!`**

| Роль | Email | Ім'я | Що подивитись |
|---|---|---|---|
| LEARNER | `o.kovalenko@loda.gov.ua` | Оксана Коваленко | Кабінет із серією 5 днів, курс 2 в процесі |
| LEARNER (атестована) | `n.osadcha@loda.gov.ua` | Наталія Осадча | Готовий сертифікат `ЯСНО-2026-4F19C7` |
| HR | `i.melnyk@loda.gov.ua` | Ірина Мельник | `/admin/org` — статистика організації |
| EDITOR | `s.hrytsenko@loda.gov.ua` | Світлана Гриценко | Роль редактора контенту |
| ADMIN | `d.hrytsenko@loda.gov.ua` | Дмитро Гриценко | `/admin` — користувачі, платформенна статистика |
| SUPERADMIN | `superadmin@yasno.dev` | Супер Адмін | Єдиний, хто може змінювати ролі |

Публічна перевірка сертифіката без входу: `/verify/ЯСНО-2026-4F19C7`.

## Модель курсу

10 модулів (8 обов'язкових + 2 поглиблених). Курс вважається пройденим, коли відмічено
прогрес по кожному уроку **і** (якщо в курсу є тест) останню спробу зараховано.
Сертифікат видається автоматично при проходженні всіх обов'язкових курсів
(`services/learning/src/lib/completion.ts` → `services/certificates`).

Модуль 2 «Безпека даних і конфіденційність» — ключовий (прохідний бал тесту 80%
замість стандартних 70%) і єдиний із повним тестом (5 питань) у seed-даних.

## Відомі нюанси

- `better-call` (внутрішня залежність `better-auth`) хоче `zod@^4`, у проєкті `zod@^3.24` —
  peer-warning при встановленні, на роботу не впливає (typecheck/build/рантайм чисті).
- `@prisma/client` додано прямою залежністю `apps/web` (не лише через `@yasno/db`) — інакше
  pnpm-ізоляція не дає Next.js `serverExternalPackages` знайти вже згенерований рушій під час
  бандлингу.
