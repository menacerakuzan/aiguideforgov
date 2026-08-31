/**
 * Адреса підтримки — єдине джерело правди для всіх місць, де ми просимо
 * людину написати нам (зараз це відновлення пароля).
 *
 * Читається через `process.env.NEXT_PUBLIC_...` статичним зверненням: Next
 * підставляє значення на збірці, тому змінна працює і в серверних, і в
 * клієнтських компонентах. Динамічний доступ (`env[name]`) тут не спрацював би.
 */
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@pro-ai.gov.ua';

/**
 * Готовий лист до підтримки: тема й текст уже заповнені, людині лишається
 * натиснути «Надіслати». Адресу акаунта підставляємо в тіло листа, щоб
 * підтримка одразу бачила, який саме акаунт відновлюють.
 */
export function buildPasswordResetMailto(accountEmail: string): string {
  const subject = 'Відновлення пароля';
  const body = [
    'Доброго дня!',
    '',
    'Прошу допомогти відновити доступ до акаунта на платформі ПРО.ШІ.',
    '',
    `Пошта акаунта: ${accountEmail}`,
    '',
    'Дякую.',
  ].join('\n');

  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
