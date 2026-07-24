const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function randomSegment(length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

/** Формат коду сертифіката: ЯСНО-РРРР-XXXXXX (рік + 6 випадкових символів). */
export function generateCertificateCode(year = new Date().getFullYear()): string {
  return `ЯСНО-${year}-${randomSegment(6)}`;
}
