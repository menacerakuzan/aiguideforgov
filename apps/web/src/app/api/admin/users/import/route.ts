import { NextResponse, type NextRequest } from 'next/server';
import { hashPassword } from 'better-auth/crypto';
import { randomBytes } from 'node:crypto';
import { prisma } from '@yasno/db';
import { requireCurrentUser, requireAdmin } from '@yasno/auth';
import { infra } from '@yasno/infra';
import { ImportUsersInputSchema, type ImportUsersResponse, type ImportUsersResultRow } from '@yasno/types';
import { withApiErrors } from '@/lib/api-guard';

interface CsvRow {
  name: string;
  email: string;
  position?: string;
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
    const [name = '', email = '', position = ''] = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    return { name, email, position: position || undefined };
  });
}

function generateTempPassword(): string {
  return randomBytes(9).toString('base64url');
}

export async function POST(request: NextRequest) {
  return withApiErrors(async () => {
    const me = await requireCurrentUser();
    requireAdmin(me.role);

    const { organizationId, csv } = ImportUsersInputSchema.parse(await request.json());
    const rows = parseCsv(csv);

    const results: ImportUsersResultRow[] = [];
    let created = 0;
    let skipped = 0;

    for (const row of rows) {
      if (!row.email || !row.email.includes('@')) {
        results.push({ email: row.email || '(порожньо)', status: 'error', message: 'Некоректна пошта' });
        continue;
      }

      const existing = await prisma.user.findUnique({ where: { email: row.email } });
      if (existing) {
        results.push({ email: row.email, status: 'skipped_exists' });
        skipped++;
        continue;
      }

      const tempPassword = generateTempPassword();
      const user = await prisma.user.create({
        data: {
          name: row.name || row.email.split('@')[0]!,
          email: row.email,
          emailVerified: false,
          position: row.position ?? null,
          organizationId,
        },
      });
      await prisma.account.create({
        data: {
          userId: user.id,
          accountId: user.id,
          providerId: 'credential',
          password: await hashPassword(tempPassword),
        },
      });

      await infra.mailer.send({
        to: user.email,
        subject: 'Ваш доступ до платформи «Ясно»',
        text: `Вітаємо! Для вас створено обліковий запис.\n\nПошта: ${user.email}\nТимчасовий пароль: ${tempPassword}\n\nУвійдіть і за бажанням змініть пароль у налаштуваннях.`,
      });

      results.push({ email: row.email, status: 'created' });
      created++;
    }

    const response: ImportUsersResponse = { created, skipped, rows: results };
    return NextResponse.json(response);
  });
}
