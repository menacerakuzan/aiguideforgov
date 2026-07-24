'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * Копіювання з візуальним морфом кнопки в галочку на 1.6с
 * (порт поведінки .copy-btn[data-copied] з app.js прототипу).
 */
export function useCopyToClipboard(announce?: (msg: string) => void) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(
    async (text: string, message = 'Скопійовано. Замініть позначки у квадратних дужках на свої дані.') => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // clipboard API недоступний (напр. небезпечний контекст) — все одно показуємо стан успіху
      }
      setCopied(true);
      announce?.(message);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    },
    [announce],
  );

  return { copied, copy };
}
