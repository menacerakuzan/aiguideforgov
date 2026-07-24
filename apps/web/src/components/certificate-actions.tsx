'use client';

import { Check, Copy, Doc } from '@yasno/icons';
import { IconButton, useCopyToClipboard } from '@yasno/ui';

export function CertificateActions({ code }: { code: string }) {
  const { copied, copy } = useCopyToClipboard();
  const verifyUrl = typeof window !== 'undefined' ? `${window.location.origin}/verify/${encodeURIComponent(code)}` : '';

  return (
    <div className="relative z-10 mt-6 flex justify-center gap-3">
      <IconButton active={copied} onClick={() => copy(verifyUrl, 'Посилання для перевірки скопійовано')} aria-label="Скопіювати посилання для перевірки">
        {copied ? <Check size={18} /> : <Copy size={18} />}
      </IconButton>
      <a
        href={`/api/certificates/${encodeURIComponent(code)}/pdf`}
        className="inline-flex h-[46px] items-center gap-2 rounded-full border-2 border-ink bg-surface px-5 text-sm font-bold text-ink shadow-[3px_3px_0_0_var(--color-ink)]"
      >
        <Doc size={16} /> Завантажити PDF
      </a>
    </div>
  );
}
