/**
 * Better Auth повертає англомовний `message` і машинний `code`. Показувати
 * слухачеві сирий текст із бібліотеки не можна — тут єдине місце, де коди
 * стають людськими українськими фразами.
 */
const MESSAGES: Record<string, string> = {
  USER_ALREADY_EXISTS: 'Ця пошта вже зареєстрована. Спробуйте увійти або відновити пароль.',
  INVALID_EMAIL_OR_PASSWORD: 'Неправильна пошта або пароль',
  INVALID_EMAIL: 'Перевірте адресу пошти',
  PASSWORD_TOO_SHORT: 'Пароль закороткий — мінімум 8 символів',
  PASSWORD_TOO_LONG: 'Пароль задовгий',
  INVALID_TOKEN: 'Посилання недійсне або вже використане',
  TOKEN_EXPIRED: 'Термін дії посилання минув. Запросіть нове.',
  USER_BANNED: 'Доступ до акаунта призупинено. Зверніться до адміністратора.',
};

export interface AuthClientError {
  code?: string;
  message?: string;
  status?: number;
}

/** Людське повідомлення для помилки автентифікації; за замовчуванням — нейтральне. */
export function authErrorMessage(error: AuthClientError | null | undefined, fallback = 'Не вдалося виконати дію. Спробуйте ще раз.'): string {
  if (!error) return fallback;
  // 429 приходить від обмеження частоти й коду не має.
  if (error.status === 429) return 'Забагато спроб поспіль. Зачекайте хвилину й спробуйте знову.';
  return (error.code ? MESSAGES[error.code] : undefined) ?? fallback;
}
