/**
 * Витягання матеріалів бібліотеки з блоків уроку.
 *
 * Бібліотека наповнюється не окремим списком, який треба вести руками, а самим
 * контентом уроків: якщо в уроці є готовий промпт, порівняльна таблиця чи файл —
 * це і є те, що слухач забирає з собою. Такий підхід не дає бібліотеці розʼїхатися
 * з уроками: змінили промпт в уроці — наступний `sync-library` оновить і трофей.
 *
 * Уроки, у яких забирати нічого (лише текст і мікроперевірка), не дають нічого.
 * Це навмисно: порожній трофей гірший за його відсутність.
 */
import type { LessonBlock, PromptCategory, ResourceKind } from '@proai/types';

/** Матеріал-промпт: іде в таблицю Prompt (у неї свій лічильник копіювань). */
export interface ExtractedPrompt {
  sourceKey: string;
  title: string;
  useCase: string;
  body: string;
  category: PromptCategory;
}

/** Будь-який інший матеріал: іде в таблицю Resource. */
export interface ExtractedResource {
  sourceKey: string;
  title: string;
  summary: string;
  /** Готовий HTML — його показує діалог бібліотеки. */
  body: string;
  kind: ResourceKind;
}

export interface Extracted {
  prompts: ExtractedPrompt[];
  resources: ExtractedResource[];
}

/** Мінімальне екранування: тексти уроків — це звичайний текст, не розмітка. */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Абзаци з простого тексту: порожній рядок — межа абзацу. */
function paragraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${esc(p.trim()).replace(/\n/g, '<br />')}</p>`)
    .join('');
}

function list(items: string[]): string {
  return `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
}

/** Перше речення — для короткого опису картки. */
function firstSentence(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  const cut = clean.match(/^.{20,}?[.!?](\s|$)/)?.[0] ?? clean;
  return cut.length > max ? `${cut.slice(0, max - 1).trimEnd()}…` : cut.trim();
}

/**
 * Категорія промпту за модулем уроку. Промпти з уроків про звернення, листи чи
 * наради осмислено лягають у наявні категорії промпт-банку; для решти є GENERAL,
 * бо вигадувати категорію за автора — гірше, ніж чесно сказати «загальний».
 */
function categoryForLesson(lessonSlug: string): PromptCategory {
  if (/zvernenn|hromadyan/.test(lessonSlug)) return 'CITIZENS';
  if (/lyst|zapyt/.test(lessonSlug)) return 'LETTERS';
  if (/narad|protokol/.test(lessonSlug)) return 'MEETINGS';
  if (/analit|zvit|dovidk/.test(lessonSlug)) return 'ANALYTICS';
  if (/nakaz|vnutrishn|polozhenn/.test(lessonSlug)) return 'INTERNAL';
  return 'GENERAL';
}

/**
 * Головна функція: блоки одного уроку → матеріали для бібліотеки.
 *
 * `sourceKey` містить індекс блоку, тому лишається стабільним при повторному
 * запуску й змінюється лише коли автор переставляє блоки місцями — тоді старий
 * трофей приберуть як застарілий, а новий створять. Це прийнятно: вміст той самий.
 */
export function extractLibraryItems(lessonSlug: string, lessonTitle: string, blocks: LessonBlock[]): Extracted {
  const prompts: ExtractedPrompt[] = [];
  const resources: ExtractedResource[] = [];

  blocks.forEach((block, i) => {
    const key = `${lessonSlug}#${i}`;

    switch (block.type) {
      /* Готовий промпт — найцінніше, що урок може дати з собою. */
      case 'prompt': {
        prompts.push({
          sourceKey: key,
          title: block.title ?? lessonTitle,
          useCase: block.note ?? `З уроку «${lessonTitle}»`,
          body: block.body,
          category: categoryForLesson(lessonSlug),
        });
        break;
      }

      /* Конструктор промпту — забираємо як формулу: з чого складається запит. */
      case 'builder': {
        const body = block.fields.map((f) => `${f.label}: ${f.placeholder}`).join('\n\n');
        prompts.push({
          sourceKey: key,
          title: 'Формула запиту',
          useCase: firstSentence(block.intro),
          body,
          category: 'GENERAL',
        });
        break;
      }

      /* Пара «так / не так» — готова порівняльна таблиця. */
      case 'pair': {
        const dangerTitle = block.dangerTitle ?? 'Ніколи так не робіть';
        const safeTitle = block.safeTitle ?? 'Ось як безпечно';
        // Назва — сама суть порівняння. Урок дописувати не треба: картка
        // бібліотеки й так показує, з якого уроку матеріал.
        resources.push({
          sourceKey: key,
          title: `${dangerTitle} / ${safeTitle}`,
          summary: firstSentence(block.safe.note),
          body:
            `<table><thead><tr><th>${esc(dangerTitle)}</th><th>${esc(safeTitle)}</th></tr></thead><tbody><tr>` +
            `<td><p><strong>${esc(block.danger.note)}</strong></p><pre>${esc(block.danger.example)}</pre></td>` +
            `<td><p><strong>${esc(block.safe.note)}</strong></p><pre>${esc(block.safe.example)}</pre></td>` +
            `</tr></tbody></table>`,
          kind: 'TABLE',
        });
        break;
      }

      /* Світлофор — таблиця «можна / обережно / не можна». */
      case 'trafficLight': {
        resources.push({
          sourceKey: key,
          title: 'Що можна віддавати помічнику',
          summary: block.categories.map((c) => c.label).join(' · '),
          body:
            `<table><thead><tr>${block.categories.map((c) => `<th>${esc(c.label)}</th>`).join('')}</tr></thead>` +
            `<tbody><tr>${block.categories
              .map((c) => `<td><p>${esc(c.description)}</p>${list(c.examples)}</td>`)
              .join('')}</tr></tbody></table>`,
          kind: 'TABLE',
        });
        break;
      }

      /* Файл уроку — шаблон або зразок документа. */
      case 'file': {
        resources.push({
          sourceKey: key,
          title: block.name,
          summary: block.note ?? `Матеріал уроку «${lessonTitle}»`,
          body:
            `<p>${esc(block.note ?? '')}</p>` +
            `<p><a href="${esc(block.url)}" download>Завантажити файл</a>` +
            (block.meta ? ` <span>(${esc(block.meta)})</span>` : '') +
            `</p>`,
          kind: 'TEMPLATE',
        });
        break;
      }

      /*
       * Ілюстрація стає трофеєм лише тоді, коли картинка справді існує.
       * Зараз усі зображення в уроках — заглушки з описом майбутнього кадру
       * (`note` без `src`), і трофей із такої заглушки був би порожньою карткою.
       * Щойно скріншоти зʼявляться, цей блок почне давати матеріали сам.
       */
      case 'image': {
        if (!block.src) break;
        resources.push({
          sourceKey: key,
          title: block.caption ?? block.alt,
          summary: block.alt,
          body: `<figure><img src="${esc(block.src)}" alt="${esc(block.alt)}" />${
            block.caption ? `<figcaption>${esc(block.caption)}</figcaption>` : ''
          }</figure>`,
          kind: 'ILLUSTRATION',
        });
        break;
      }

      /*
       * Решта блоків у бібліотеку не йде свідомо: text — це сам урок, а
       * check / sort / pick / spot / redact — тренажери, які поза уроком
       * не мають сенсу. video без файлу — така сама заглушка, як image.
       */
      default:
        break;
    }
  });

  return { prompts, resources };
}

export { paragraphs as textToHtml };
