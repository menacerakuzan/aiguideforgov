import { NextResponse, type NextRequest } from 'next/server';
import { hashPassword } from 'better-auth/crypto';
import { randomBytes } from 'node:crypto';
import { prisma } from '@proai/db';
import { requireCurrentUser, requireAdmin } from '@proai/auth';
import { infra } from '@proai/infra';
import { EmailSchema, ImportUsersInputSchema, type ImportUsersResponse, type ImportUsersResultRow } from '@proai/types';
import { withApiErrors } from '@/lib/api-guard';

interface CsvRow {
  name: string;
  email: string;
  position?: string;
}

/** Понад це в один прохід не імпортуємо: обробка синхронна, рядок за рядком. */
const MAX_ROWS = 2000;
const MAX_NAME_LENGTH = 120;
const MAX_POSITION_LENGTH = 160;

/**
 * Розбір одного рядка CSV з підтримкою лапок. Проста `split(',')` ламалася на
 * звичайному для реєстру записі `"Іваненко, Іван Петрович",ivan@gov.ua`:
 * ім'я різалося навпіл, а пошта з'їжджала в колонку посади.
 */
function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"') {
        // Подвоєні лапки всередині поля — це один символ лапки.
        if (line[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',' || ch === ';') {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += ch;
    }
  }
  cells.push(cell.trim());
  return cells;
}

/** Парсер CSV без залежностей: name,email,position — з заголовком або без. */
function parseCsv(text: string): CsvRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const header = lines[0]!.toLowerCase();
  const hasHeader = header.includes('email') || header.includes('пошта') || header.includes('name');
  const rows = hasHeader ? lines.slice(1) : lines;

  return rows.map((line) => {
    const [name = '', email = '', position = ''] = parseCsvLine(line);
    return { name, email, position: position || undefined };
  });
}

/**
 * Тимчасовий пароль: 12 байт із crypto → 16 символів base64url.
 * Це не «згенеруй щось випадкове», а єдине, що захищає новий акаунт до
 * першого входу, тож псевдовипадковість тут неприпустима.
 */
function generateTempPassword(): string {
  return randomBytes(12).toString('base64url');
}

export async function POST(request: NextRequest) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);

    const { organizationId, csv } = ImportUsersInputSchema.parse(await request.json());

    if (organizationId) {
      const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true } });
      if (!org) return NextResponse.json({ error: 'Такого органу влади немає у списку' }, { status: 400 });
    }

    const rows = parseCsv(csv);
    if (rows.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `Забагато рядків: ${rows.length}. За один раз імпортуємо не більше ${MAX_ROWS}.` },
        { status: 400 },
      );
    }

    const results: ImportUsersResultRow[] = [];
    const seen = new Set<string>();
    let created = 0;
    let skipped = 0;

    for (const row of rows) {
      const parsedEmail = EmailSchema.safeParse(row.email);
      if (!parsedEmail.success) {
        results.push({ email: row.email || '(порожньо)', status: 'error', message: 'Некоректна пошта' });
        continue;
      }
      // EmailSchema приводить адресу до нижнього регістру. Без цього
      // «Ivan@gov.ua» з файлу створював акаунт, у який неможливо увійти:
      // Better Auth шукає користувача за точним збігом уже нормалізованої адреси.
      const email = parsedEmail.data;

      // Той самий рядок двічі в одному файлі — не помилка бази, а помилка файлу.
      if (seen.has(email)) {
        results.push({ email, status: 'skipped_exists', message: 'Дубль у файлі' });
        skipped++;
        continue;
      }
      seen.add(email);

      const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (existing) {
        results.push({ email, status: 'skipped_exists' });
        skipped++;
        continue;
      }

      const tempPassword = generateTempPassword();
      const passwordHash = await hashPassword(tempPassword);

      try {
        // Транзакція, бо акаунт без рядка Account — це користувач, який
        // існує, займає пошту й не може увійти жодним паролем.
        await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              name: (row.name || email.split('@')[0]!).slice(0, MAX_NAME_LENGTH),
              email,
              emailVerified: false,
              position: row.position?.slice(0, MAX_POSITION_LENGTH) ?? null,
              organizationId,
            },
          });
          await tx.account.create({
            data: {
              userId: user.id,
              accountId: user.id,
              providerId: 'credential',
              password: passwordHash,
            },
          });
        });
      } catch {
        results.push({ email, status: 'error', message: 'Не вдалося створити акаунт' });
        continue;
      }

      await infra.mailer.send({
        to: email,
        subject: 'Ваш доступ до платформи «ПРО.ШІ»',
        text: `Вітаємо! Для вас створено обліковий запис.\n\nПошта: ${email}\nТимчасовий пароль: ${tempPassword}\n\nУвійдіть і змініть пароль у налаштуваннях.`,
      });

      results.push({ email, status: 'created' });
      created++;
    }

    const response: ImportUsersResponse = { created, skipped, rows: results };
    return NextResponse.json(response);
  });
}
