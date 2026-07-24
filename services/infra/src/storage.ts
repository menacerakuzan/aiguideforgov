import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Storage — інтерфейс файлового сховища. Локальна реалізація пише на диск;
 * production-реалізація (S3) підставляється пізніше без зміни викликів
 * (сервіси залежать від інтерфейсу, а не від конкретного драйвера).
 */
export interface Storage {
  put(key: string, data: Buffer, contentType?: string): Promise<{ url: string }>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
}

export class LocalDiskStorage implements Storage {
  constructor(private readonly rootDir = '.data/uploads') {}

  private pathFor(key: string) {
    return join(this.rootDir, key);
  }

  async put(key: string, data: Buffer): Promise<{ url: string }> {
    await mkdir(this.rootDir, { recursive: true });
    await writeFile(this.pathFor(key), data);
    return { url: `/uploads/${key}` };
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      return await readFile(this.pathFor(key));
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.pathFor(key));
    } catch {
      // файл уже відсутній — нічого робити
    }
  }
}
