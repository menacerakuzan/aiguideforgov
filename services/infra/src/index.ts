export * from './storage';
export * from './cache';
export * from './mailer';

import { LocalDiskStorage } from './storage';
import { InMemoryCache } from './cache';
import { ConsoleMailer } from './mailer';

/**
 * Локальні реалізації інфраструктурних інтерфейсів для MVP.
 * Заміна на S3/Redis/Resend — це заміна значень у цьому обʼєкті,
 * без змін у services/learning, services/prompts тощо.
 */
export const infra = {
  storage: new LocalDiskStorage(),
  cache: new InMemoryCache(),
  mailer: new ConsoleMailer(),
};
