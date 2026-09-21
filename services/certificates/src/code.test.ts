import { describe, expect, it } from 'vitest';
import { generateCertificateCode, normalizeCertificateCode } from './code';

describe('generateCertificateCode', () => {
  it('має формат PROAI-РІК-XXXXXX', () => {
    expect(generateCertificateCode(2026)).toMatch(/^PROAI-2026-[0-9A-HJKMNP-TV-Z]{6}$/);
  });

  it('не містить символів, які плутають на папері: I, L, O, U', () => {
    // Код читають із роздрукованого сертифіката й набирають руками, тому
    // «0 чи O» і «1 чи I» — реальні помилки набору, а не гіпотетичні.
    // Перевіряємо саме випадковий сегмент: у сталому префіксі PROAI «I» і «O»
    // є, але його не набирають наосліп — він однаковий у кожному коді.
    const segments = Array.from({ length: 300 }, () => generateCertificateCode(2026).split('-')[2]!).join('');
    for (const forbidden of ['I', 'L', 'O', 'U']) {
      expect(segments).not.toContain(forbidden);
    }
  });

  it('не повторюється — коди мають бути різними', () => {
    const codes = new Set(Array.from({ length: 500 }, () => generateCertificateCode(2026)));
    expect(codes.size).toBe(500);
  });

  it('несе рік видачі', () => {
    expect(generateCertificateCode(2030).startsWith('PROAI-2030-')).toBe(true);
  });
});

describe('normalizeCertificateCode', () => {
  it('піднімає регістр і прибирає пробіли', () => {
    expect(normalizeCertificateCode('  proai-2026-4f19c7 ')).toBe('PROAI-2026-4F19C7');
    expect(normalizeCertificateCode('PROAI 2026 4F19C7')).toBe('PROAI20264F19C7');
  });

  it('довге тире з автозаміни текстового редактора стає звичайним дефісом', () => {
    expect(normalizeCertificateCode('PROAI–2026—4F19C7')).toBe('PROAI-2026-4F19C7');
  });

  it('уже канонічний код не змінює', () => {
    expect(normalizeCertificateCode('PROAI-2026-4F19C7')).toBe('PROAI-2026-4F19C7');
  });
});
