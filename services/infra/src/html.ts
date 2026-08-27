import sanitizeHtml from 'sanitize-html';
import type { LessonBlock } from '@proai/types';

/**
 * Санітизація авторського HTML уроків і матеріалів бібліотеки.
 *
 * Контент пишуть адміністратори, тож це не захист від анонімів — це межа,
 * після якої скомпрометований або необережний адмінський акаунт не
 * перетворюється на постійний XSS для кожного слухача, який відкриє урок.
 * Вміст рендериться через dangerouslySetInnerHTML, іншого фільтра немає.
 *
 * Санітизуємо на запису, а не на читанні: у базу контент потрапляє лише
 * двома шляхами — адмінське API та seed/sync-content — і обидва проходять
 * через цю функцію. Так у сховищі завжди лежить уже чистий HTML, і сторінка
 * не платить за очищення на кожному запиті.
 */

/** SVG-схеми уроків малюються інлайном, тож теги фігур мусять пройти. */
const SVG_TAGS = [
  'svg', 'g', 'defs', 'title', 'desc',
  'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
  'text', 'tspan', 'linearGradient', 'radialGradient', 'stop',
];

/**
 * Свідомо НЕ дозволені: script, style, iframe, object, embed, form, input,
 * а також svg-теги foreignObject та use — обидва є відомими шляхами
 * протягнути HTML/зовнішній документ усередину «нешкідливої» картинки.
 */
const SVG_ATTRS = [
  'viewBox', 'xmlns', 'width', 'height', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
  'cx', 'cy', 'r', 'rx', 'ry', 'd', 'points', 'transform',
  'fill', 'fill-rule', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-linecap',
  'stroke-linejoin', 'stroke-dasharray', 'opacity',
  'font-size', 'font-weight', 'font-family', 'text-anchor', 'dominant-baseline',
];

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'hr',
    'strong', 'b', 'em', 'i', 'u', 's', 'mark', 'sub', 'sup',
    'h2', 'h3', 'h4', 'h5',
    'ul', 'ol', 'li',
    'blockquote', 'code', 'pre', 'kbd',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
    'div', 'span', 'figure', 'figcaption', 'a', 'img',
    ...SVG_TAGS,
  ],
  allowedAttributes: {
    '*': ['class', 'role', 'aria-label', 'aria-hidden', 'style'],
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height', 'loading'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan', 'scope'],
    ...Object.fromEntries(SVG_TAGS.map((tag) => [tag, [...SVG_ATTRS, 'class', 'aria-hidden', 'role']])),
  },
  // javascript: і data: у href — класичний обхід; лишаємо лише безпечні схеми.
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  allowProtocolRelative: false,
  // Інлайновий style дозволений вузько: лише кольори й вирівнювання,
  // жодних url(), position чи інших властивостей, якими можна перекрити сторінку.
  allowedStyles: {
    '*': {
      color: [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i, /^var\(--[\w-]+\)$/],
      'background-color': [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i, /^var\(--[\w-]+\)$/],
      'text-align': [/^(left|right|center|justify)$/],
      'font-weight': [/^(normal|bold|[1-9]00)$/],
      width: [/^\d+(\.\d+)?(px|%|rem|em)$/],
    },
  },
  transformTags: {
    // Зовнішнє посилання без noopener лишає відкриту сторінку доступною
    // через window.opener — примусово закриваємо це на кожному <a>.
    a: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, rel: 'noopener noreferrer', ...(attribs.target ? { target: '_blank' } : {}) },
    }),
  },
  disallowedTagsMode: 'discard',
};

/** Очищає HTML-фрагмент за allow-list. Порожній/невалідний вхід дає порожній рядок. */
export function sanitizeRichHtml(html: string): string {
  if (!html) return '';
  return sanitizeHtml(html, OPTIONS);
}

/**
 * Санітизує блоки уроку. HTML у контенті уроку є рівно в одному місці —
 * блоці `text`; решта полів React рендерить як текст і екранує сам.
 */
export function sanitizeLessonBlocks(blocks: LessonBlock[]): LessonBlock[] {
  return blocks.map((block) =>
    block.type === 'text' ? { ...block, html: sanitizeRichHtml(block.html) } : block,
  );
}
