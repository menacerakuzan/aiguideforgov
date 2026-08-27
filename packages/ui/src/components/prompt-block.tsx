'use client';

import { useRef } from 'react';
import { Check, Copy } from '@proai/icons';
import { cn } from '../lib/utils';
import { useCopyToClipboard } from '../hooks/use-copy-to-clipboard';
import { IconButton } from './icon-button';

/** Плейсхолдер-чіп у промпті: [ЗАЯВНИК], [АДРЕСА] тощо. */
export function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <span className="whitespace-nowrap rounded-full bg-blue-tint px-2.5 py-px font-medium text-blue-deep">
      {children}
    </span>
  );
}

export interface PromptBlockProps {
  children: React.ReactNode;
  className?: string;
  onCopy?: () => void;
}

/**
 * Моно-блок промпта з кнопкою копіювання. Порт .mono/.copy-btn:
 * текст копіюється з живого DOM (innerText), плейсхолдери лишаються
 * у квадратних дужках — користувач замінює їх поза чатом.
 */
export function PromptBlock({ children, className, onCopy }: PromptBlockProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { copied, copy } = useCopyToClipboard();

  const handleCopy = () => {
    const text = ref.current?.innerText.replace(/\s*$/, '') ?? '';
    void copy(text);
    onCopy?.();
  };

  return (
    <div
      className={cn(
        'relative whitespace-pre-wrap rounded-[26px] bg-paper-2 px-5 py-[18px] font-mono text-[13.5px] leading-[1.75] shadow-[inset_0_3px_8px_rgba(93,88,128,0.12)]',
        className,
      )}
    >
      <div ref={ref}>{children}</div>
      <IconButton
        active={copied}
        size="sm"
        className="absolute top-3 right-3"
        onClick={handleCopy}
        aria-label="Скопіювати промпт"
      >
        {copied ? <Check size={15} /> : <Copy size={15} />}
      </IconButton>
    </div>
  );
}
