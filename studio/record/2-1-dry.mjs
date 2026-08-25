/**
 * Суха репетиція уроку 2.1: ті самі запити, але без запису екрана й без пауз.
 *
 * Навіщо окремий прогін. Стандарт уроків вимагає звіряти приклади з тим, що
 * сервіс справді відповідає (§7 п. 2). Дешевше дізнатись про розбіжність тут,
 * ніж посеред дубля — і тим паче краще, ніж лишити в уроці чернетку, якої
 * помічник насправді не видає.
 *
 * Результат лягає у studio/out/2-1/dry-run.md — з ним і звіряємо текст уроку.
 *
 *   node record/2-1-dry.mjs
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { OUT_DIR, ensureDir } from '../lib/paths.mjs';
import { ask, connect, newChat } from '../lib/gemini.mjs';
import { PROMPT, REFINEMENTS } from './2-1.steps.mjs';

const { browser, page } = await connect();
const log = [`# Урок 2.1 — суха репетиція\n`, `Знято: ${page.url()}\n`];

try {
  await newChat(page);

  console.log('→ основний запит…');
  const draft = await ask(page, PROMPT, { paste: true });
  log.push(`## Запит 1 (основний)\n\n\`\`\`\n${PROMPT}\n\`\`\`\n\n### Відповідь\n\n${draft}\n`);
  console.log(`   ${draft.length} символів\n`);

  for (const [i, refinement] of REFINEMENTS.entries()) {
    console.log(`→ уточнення ${i + 1}: ${refinement.slice(0, 50)}…`);
    const answer = await ask(page, refinement, { cps: 40 });
    log.push(`## Уточнення ${i + 1}\n\n> ${refinement}\n\n### Відповідь\n\n${answer}\n`);
    console.log(`   ${answer.length} символів\n`);
  }
} finally {
  const out = join(ensureDir(join(OUT_DIR, '2-1')), 'dry-run.md');
  writeFileSync(out, log.join('\n'), 'utf8');
  console.log(`Стенограма: ${out}`);
  await browser.close();
}
