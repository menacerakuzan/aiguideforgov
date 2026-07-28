/**
 * Логотипи ШІ-сервісів як inline-SVG (24×24), для «пігулок» у картці інструментів.
 * Використовуються в уроці 1.3 і далі в розділах 2–8.
 *
 * Це полегшені векторні відтворення фірмових знаків у брендових кольорах —
 * самодостатні, без зовнішніх файлів. Для продакшену дизайнер за потреби замінює
 * будь-який запис на офіційний SVG (просто вставити рядок нижче).
 *
 * Кожен svg має aria-hidden — назву сервісу вже озвучує текст поряд у «пігулці».
 */
export const toolLogos: Record<string, string> = {
  gemini: `<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="tl-gemini" x1="2" y1="3" x2="22" y2="21" gradientUnits="userSpaceOnUse"><stop stop-color="#4285F4"/><stop offset="0.5" stop-color="#9B72CB"/><stop offset="1" stop-color="#D96570"/></linearGradient></defs><path d="M12 2c.6 4.7 4.5 8.6 9.2 9.2C16.5 11.8 12.6 15.7 12 20.4c-.6-4.7-4.5-8.6-9.2-9.2C7.5 10.6 11.4 6.7 12 2Z" fill="url(#tl-gemini)"/></svg>`,

  chatgpt: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2l7 4v9.6l-7 4-7-4V7.2z" fill="none" stroke="#0f9d76" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 7.4v9.4M8.2 9.7l7.6 4.5M15.8 9.7l-7.6 4.5" stroke="#0f9d76" stroke-width="1.1" stroke-linecap="round" opacity="0.85"/></svg>`,

  claude: `<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="#CA6242"><rect x="10.7" y="2.5" width="2.6" height="19" rx="1.3"/><rect x="10.7" y="2.5" width="2.6" height="19" rx="1.3" transform="rotate(45 12 12)"/><rect x="10.7" y="2.5" width="2.6" height="19" rx="1.3" transform="rotate(90 12 12)"/><rect x="10.7" y="2.5" width="2.6" height="19" rx="1.3" transform="rotate(135 12 12)"/></g></svg>`,

  copilot: `<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="tl-copilot" x1="4" y1="6" x2="20" y2="18" gradientUnits="userSpaceOnUse"><stop stop-color="#2ECFCA"/><stop offset="1" stop-color="#7A5CFF"/></linearGradient></defs><path d="M5 13c0-2.5 1.8-4.5 4.2-4.5 3.4 0 4 8 8 8 2.2 0 3.8-1.8 3.8-4.2" fill="none" stroke="url(#tl-copilot)" stroke-width="2.6" stroke-linecap="round"/><path d="M19 11c0 2.5-1.8 4.5-4.2 4.5-3.4 0-4-8-8-8C4.6 7.5 3 9.3 3 11.7" fill="none" stroke="url(#tl-copilot)" stroke-width="2.6" stroke-linecap="round" opacity="0.65"/></svg>`,

  gamma: `<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="tl-gamma" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse"><stop stop-color="#7A5CFF"/><stop offset="1" stop-color="#D96570"/></linearGradient></defs><rect x="3" y="3" width="18" height="18" rx="6" fill="url(#tl-gamma)"/><path d="M12 6.5c.35 2.7 2.4 4.75 5 5.1-2.6.35-4.65 2.4-5 5.1-.35-2.7-2.4-4.75-5-5.1 2.6-.35 4.65-2.4 5-5.1Z" fill="#fff"/></svg>`,

  canva: `<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="tl-canva" x1="3" y1="4" x2="21" y2="20" gradientUnits="userSpaceOnUse"><stop stop-color="#00C4CC"/><stop offset="1" stop-color="#7D2AE8"/></linearGradient></defs><circle cx="12" cy="12" r="10" fill="url(#tl-canva)"/><path d="M15.5 9.2a4.6 4.6 0 1 0 .2 6.1" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round"/></svg>`,

  elevenlabs: `<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="#0B0B0B"><rect x="8" y="5.5" width="2.7" height="13" rx="1"/><rect x="13.3" y="5.5" width="2.7" height="13" rx="1"/></g></svg>`,

  ideogram: `<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="tl-ideo" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse"><stop stop-color="#F04E98"/><stop offset="0.5" stop-color="#8A5CF6"/><stop offset="1" stop-color="#22B8CF"/></linearGradient></defs><rect x="3" y="3" width="18" height="18" rx="6" fill="url(#tl-ideo)"/><circle cx="12" cy="12" r="4.4" fill="none" stroke="#fff" stroke-width="2.2"/></svg>`,

  midjourney: `<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="#0B0B0B"><path d="M12 4.2l6 9.2c-3.8-1.9-8.2-1.9-12 0z"/><path d="M4.8 15.4c4.2-2.2 10.2-2.2 14.4 0L17 18.6c-2.9-1.4-7.1-1.4-10 0z"/></g></svg>`,

  perplexity: `<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="#20808D" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="7" width="15" height="10" rx="2.4"/><path d="M12 4.5v15M8 7l4 3 4-3M8 17l4-3 4 3"/></g></svg>`,

  notebooklm: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.4c.5 4 3.7 7.2 7.6 7.7-3.9.5-7.1 3.7-7.6 7.7" fill="none" stroke="#4285F4" stroke-width="2.1" stroke-linecap="round"/><path d="M12 21.6c-.5-4-3.7-7.2-7.6-7.7 3.9-.5 7.1-3.7 7.6-7.7" fill="none" stroke="#F9AB00" stroke-width="2.1" stroke-linecap="round"/></svg>`,

  deepl: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="6" fill="#0F2B46"/><path d="M8 7.5h3.5a4.5 4.5 0 0 1 0 9H8z" fill="none" stroke="#fff" stroke-width="2"/><path d="M8 12h4" stroke="#0F2B46" stroke-width="2"/></svg>`,
};

/** «Пігулка» сервісу з логотипом. hi=true — підсвічений вибір (Gemini). */
export function tool(id: keyof typeof toolLogos, name: string, hi = false): string {
  const cls = hi ? 'tool tool-hi' : 'tool';
  return `<span class="${cls}"><span class="tool-av">${toolLogos[id]}</span>${name}</span>`;
}
