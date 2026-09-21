import { describe, expect, it } from 'vitest';
import { sanitizeRichHtml } from './html';

/** Діаграма в тому вигляді, як її пишуть в уроках (скорочено з уроку 1.1). */
const CHART = `<figure class="chart"><svg viewBox="0 0 520 210" width="100%" role="img" style="max-width:520px;display:block;margin:0 auto" aria-label="Порівняння часу"><text x="0" y="200" font-size="12.5" fill="#3763e8">Разом</text></svg></figure>`;

describe('sanitizeRichHtml — SVG-діаграми', () => {
  it('зберігає viewBox саме в такому регістрі', () => {
    // Без viewBox SVG малюється в рамці 150 px заввишки і діаграма 210 px втрачає низ.
    expect(sanitizeRichHtml(CHART)).toContain('viewBox="0 0 520 210"');
  });

  it('зберігає стилі, якими діаграму центрують і обмежують по ширині', () => {
    const out = sanitizeRichHtml(CHART);
    expect(out).toContain('max-width:520px');
    expect(out).toContain('display:block');
    expect(out).toContain('margin:0 auto');
  });

  it('лишає текст і атрибути фігур', () => {
    const out = sanitizeRichHtml(CHART);
    expect(out).toContain('font-size="12.5"');
    expect(out).toContain('>Разом</text>');
  });

  it('зберігає регістр тегів градієнтів', () => {
    expect(sanitizeRichHtml('<svg><linearGradient></linearGradient></svg>')).toContain('<linearGradient>');
  });
});

describe('sanitizeRichHtml — градієнти логотипів', () => {
  /** Логотип Gemini з tool-logos.ts: кольорова зірка з градієнтною заливкою. */
  const GEMINI = '<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="tl-gemini" x1="2" y1="3" x2="22" y2="21" gradientUnits="userSpaceOnUse"><stop stop-color="#4285F4"/><stop offset="0.5" stop-color="#9B72CB"/></linearGradient></defs><path d="M12 2Z" fill="url(#tl-gemini)"/></svg>';

  it('лишає id градієнта, на який посилається заливка', () => {
    const out = sanitizeRichHtml(GEMINI);
    expect(out).toContain('id="tl-gemini"');
    expect(out).toContain('fill="url(#tl-gemini)"');
  });

  it('лишає кольори й положення точок градієнта', () => {
    const out = sanitizeRichHtml(GEMINI);
    expect(out).toContain('stop-color="#4285F4"');
    expect(out).toContain('offset="0.5"');
    expect(out).toContain('gradientUnits="userSpaceOnUse"');
  });

  it('не дозволяє id на будь-яких інших елементах', () => {
    const out = sanitizeRichHtml('<div id="main"><p id="x">a</p><svg id="s"><path id="p" d="M0"/></svg></div>');
    expect(out).not.toContain('id=');
  });

  it('прибирає id градієнта з небезпечним або дивним значенням', () => {
    for (const bad of ['__proto__', 'a b', '1abc', 'x"onload="alert(1)', 'a'.repeat(80)]) {
      const out = sanitizeRichHtml(`<svg><linearGradient id='${bad}'></linearGradient></svg>`);
      expect(out).not.toContain('id=');
    }
  });
});

describe('sanitizeRichHtml — захист лишається', () => {
  it('прибирає обробники подій у будь-якому регістрі', () => {
    for (const attr of ['onclick', 'onClick', 'ONCLICK', 'onload']) {
      const out = sanitizeRichHtml(`<svg ${attr}="alert(1)"><rect ${attr}="alert(1)"></rect></svg>`);
      expect(out.toLowerCase()).not.toContain('alert');
    }
  });

  it('прибирає script, foreignObject і use', () => {
    const out = sanitizeRichHtml(
      '<script>alert(1)</script><svg><foreignObject><p>x</p></foreignObject><use href="#a"></use></svg>',
    );
    expect(out).not.toMatch(/script|foreignObject|<use/i);
  });

  it('не пропускає javascript: у посиланнях', () => {
    expect(sanitizeRichHtml('<a href="javascript:alert(1)">x</a>')).not.toContain('javascript');
  });

  it('відкидає небезпечні й невідомі властивості style', () => {
    const out = sanitizeRichHtml(
      '<div style="position:fixed;top:0;background-image:url(x);z-index:9;margin:0 auto;max-width:calc(100% - 1px)">x</div>',
    );
    expect(out).not.toMatch(/position|url\(|z-index|calc/);
    expect(out).toContain('margin:0 auto');
  });

  it('не дає display сховати сторінку чимось крім звичайних значень', () => {
    expect(sanitizeRichHtml('<div style="display:contents">x</div>')).not.toContain('display');
  });
});
