'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from '@yasno/icons';

type Theme = 'light' | 'dark';

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('yasno-theme', theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const current = (document.documentElement.getAttribute('data-theme') as Theme | null) ?? 'light';
    setTheme(current);
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
  }

  // Уникаємо гідраційного мерехтіння: до монтування рендеримо нейтральну іконку.
  if (!mounted) {
    return (
      <button type="button" aria-label="Перемкнути тему" className="grid h-11 w-11 place-items-center rounded-full text-ink-soft">
        <Sun size={19} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Увімкнути світлу тему' : 'Увімкнути темну тему'}
      className="grid h-11 w-11 place-items-center rounded-full text-ink-soft transition-colors hover:bg-paper-2"
    >
      {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}
