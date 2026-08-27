import { randomInt } from 'node:crypto';

/**
 * Алфавіт коду — 32 символи без візуально сплутуваних пар: немає I, L, O, U.
 * Код читають з паперового сертифіката й вводять руками у форму перевірки,
 * тож «0 чи O» і «1 чи I» — це реальні помилки набору, а не гіпотетичні.
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const SEGMENT_LENGTH = 6;
const PREFIX = 'PROAI';

/**
 * Криптографічно стійкий випадковий сегмент. Math.random() тут був би дірою:
 * її стан відновлюється з кількох виданих кодів, після чого решту можна
 * передбачити — а код сертифіката це єдине, що доводить його справжність.
 * randomInt дає рівномірний розподіл без modulo bias.
 */
function randomSegment(length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

/** Формат коду сертифіката: PROAI-РРРР-XXXXXX (рік + 6 випадкових символів). */
export function generateCertificateCode(year = new Date().getFullYear()): string {
  return `${PREFIX}-${year}-${randomSegment(SEGMENT_LENGTH)}`;
}

/**
 * Приводить код із форми перевірки до канонічного вигляду: код друкують на
 * сертифікаті великими літерами, але вводять як завгодно — з пробілами,
 * малими літерами, з довгим тире замість дефіса.
 */
export function normalizeCertificateCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, '').replace(/[\u2010-\u2015]/g, '-');
}
