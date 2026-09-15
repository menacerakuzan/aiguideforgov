/**
 * Word із боку Node: відкрити документ, дізнатись екранні координати фрагмента,
 * виділити його справжньою мишею.
 *
 * Уся COM-частина живе в `word.ps1` — PowerShell розмовляє з Word напряму,
 * а тут лише зручна обгортка для сценаріїв зйомки.
 */
import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { STUDIO_DIR } from './paths.mjs';
import { pause, sleep } from './human.mjs';
import { pressEscape } from './stage.mjs';

const run = promisify(execFile);
const PS1 = join(STUDIO_DIR, 'lib', 'word.ps1');

async function ps(args) {
  const { stdout } = await run('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', PS1, ...args,
  ]);
  return stdout.trim();
}

export const openInWord = (path) => ps(['-Action', 'open', '-Path', path]);
export const newWordDoc = () => ps(['-Action', 'new']);
export const pasteInWord = () => ps(['-Action', 'paste']);
export const copyInWord = () => ps(['-Action', 'copy']);
export const copyAllInWord = () => ps(['-Action', 'copyall']);
export const closeWord = () => ps(['-Action', 'close']);
/** Зберегти активний документ як .docx за вказаним абсолютним шляхом. */
export const saveWordAs = (path) => ps(['-Action', 'saveas', '-Path', path]);

/** Увімкнути запис виправлень (Review → Track Changes). */
export const trackChangesOn = () => ps(['-Action', 'trackon']);
/** Примітка на полях біля знайденого фрагмента. */
export const commentInWord = (find, text) => ps(['-Action', 'comment', '-Find', find, '-To', text]);
/** Перемикач вигляду: 'all' — усі виправлення видно, 'none' — без виправлень. */
export const setMarkupView = (mode) => ps(['-Action', 'markup', '-Name', mode]);
/**
 * Привести вставлений текст до шрифту документа: прибрати «шрифт сайту»,
 * зайве жирне й подвійні порожні абзаци — усе це видає вставку з чату.
 */
export const formatWord = (name = 'Times New Roman', size = 14) =>
  ps(['-Action', 'format', '-Name', name, '-Size', String(size)]);
/** Те саме прибирання слідів чату, без зміни шрифту — див. changeWordFontVisibly. */
export const cleanupPastedWord = () => ps(['-Action', 'cleanup']);

/**
 * Координати полів «Шрифт» і «Розмір» на стрічці Word (вкладка Home).
 * Заміряно UI Automation на розгорнутому вікні 1920×1080 — стрічка на цій
 * вкладці завжди в тому самому місці, тому координати не плавають між
 * дублями.
 */
export const FONT_BOX = { x: 286, y: 108 };
export const SIZE_BOX = { x: 386, y: 108 };

/**
 * Видима зміна шрифту: курсор іде до поля «Шрифт» на стрічці, тоді до
 * «Розміру», і лише тоді сама зміна застосовується. Без цього формат
 * документа міняється однією непомітною командою — глядач бачить миттєвий
 * стрибок тексту й не розуміє, що саме відбулось.
 *
 * Клік і власноручний набір у полях стрічки виявився ненадійним: Word не
 * завжди приймає текст, набраний туди синтетичною клавіатурою (перевірено
 * дослідом — шрифт лишався попереднім). Тому клік лишається — він показує,
 * куди дивитись, — а саму зміну застосовує ta сама надійна команда
 * (`format`), яку раніше викликали без жодного видимого жесту.
 */
export async function changeWordFontVisibly(mouse, { name = 'Times New Roman', size = 14 } = {}) {
  // Ctrl+A в документі — фокус там уже є одразу після друку чи вставки.
  //
  // Саме hotkey, а не key('^a'): key набирає літеру через поточну розкладку,
  // і за ввімкненої української чи російської латинської «a» в ній немає —
  // виділення просто не відбувається, мовчки. Знайдено 2026-09-04 на пробі
  // пошуку в PDF; те саме стосується будь-якого Ctrl+ЛІТЕРА.
  await mouse.hotkey('ctrl+a');
  await sleep(300);

  await mouse.glide(FONT_BOX.x, FONT_BOX.y, { ms: 500 });
  await mouse.click();
  await sleep(400);

  await mouse.glide(SIZE_BOX.x, SIZE_BOX.y, { ms: 450 });
  await mouse.click();
  await sleep(300);

  await ps(['-Action', 'format', '-Name', name, '-Size', String(size)]);
  await sleep(300);

  // Клац по полю «Розмір» РОЗГОРТАЄ список значень, і він лишається висіти
  // поверх документа — на дублі 1.1 випадний список із 8, 9, 10, 11… закривав
  // третину сторінки протягом усього наступного кроку. Escape його прибирає,
  // не чіпаючи ані шрифту, ані виділення.
  await mouse.escape();
  await sleep(250);

  // Escape закриває список, але курсор лишається над кнопкою — і Word показує
  // підказку «Font Size (Ctrl+Shift+P)», яка висить поверх документа, поки
  // мишу не відвести (спіймано на другому дублі 1.1: підказка простояла весь
  // наступний крок). Відводимо курсор у поле сторінки, подалі від стрічки.
  await mouse.glide(960, 620, { ms: 450 });
  await sleep(200);
}
/** Прибрати перший абзац — типове зайве вступне речення від ШІ. */
/**
 * Українська мова всьому документу — без побічних дій.
 *
 * Викликати після того, як у кадрі щось ДОПИСАЛИ руками: Word позначає
 * набраний текст мовою поточної розкладки, і в рядку стану під українським
 * документом з'являється «English (United States)».
 */
export const setUkrainian = () => ps(['-Action', 'lang']);

export const trimLeadInWord = () => ps(['-Action', 'trimlead']);
export const showDoc = (name) => ps(['-Action', 'show', '-Name', name]);
export const scrollToTop = () => ps(['-Action', 'top']);
export const scrollToBottom = () => ps(['-Action', 'bottom']);
export const zoomWord = (percent) => ps(['-Action', 'zoom', '-Percent', String(percent)]);
export const highlightInWord = (find) => ps(['-Action', 'highlight', '-Find', find]);
export const highlightAllInWord = (find) => ps(['-Action', 'highlightAll', '-Find', find]);
export const reselectInWord = (from, to) => ps(['-Action', 'select', '-Find', from, '-To', to]);

/**
 * Плавна прокрутка документа: кілька рядків за крок, із паузами.
 * Від'ємне `lines` — прокрутка вгору (наприклад, повернутись на початок
 * після дій унизу документа), додатне — вниз.
 */
export async function scrollWord(lines, { steps = 6, ms = 260 } = {}) {
  const sign = lines < 0 ? -1 : 1;
  const step = sign * Math.max(1, Math.round(Math.abs(lines) / steps));
  for (let i = 0; i < steps; i++) {
    await ps(['-Action', 'scroll', '-Lines', String(step)]);
    await pause(ms);
  }
}

/** Прямокутник фрагмента тексту у пікселях екрана. */
export async function pointInWord(find, at = 'start') {
  const out = await ps(['-Action', 'point', '-Find', find, '-At', at]);
  const [x, y, w, h] = out.split(/\s+/).map(Number);
  return { x, y, w, h };
}

/** Координати обох кінців фрагмента, зміряні за одну прокрутку. */
export async function spanInWord(fromText, toText) {
  const out = await ps(['-Action', 'span', '-Find', fromText, '-To', toText]);
  const n = out.split(/\s+/).map(Number);
  return {
    from: { x: n[0], y: n[1], w: n[2], h: n[3] },
    to: { x: n[4], y: n[5], w: n[6], h: n[7] },
  };
}

/**
 * Виділити текст від одного місця до іншого справжнім протягуванням миші.
 *
 * Саме протягування, а не Ctrl+A: в уроці 2.1 принципово, що людина бере лише
 * текст звернення й не чіпає шапку з персональними даними. Виділення видно
 * в кадрі — це і є доказ.
 */
export async function selectInWord(mouse, fromText, toText, { ms = 1800 } = {}) {
  const { from, to } = await spanInWord(fromText, toText);

  // Ставимо курсор трохи лівіше першого символу й на середину рядка: так
  // виділення захоплює рядок цілком, без обрізаних країв.
  await mouse.glide(from.x - 2, from.y + from.h / 2, { ms: 700 });
  await pause(400);
  await mouse.down();
  await sleep(200);
  await mouse.glide(to.x + 2, to.y + to.h / 2, { ms });
  await sleep(300);
  await mouse.up();
  await pause(400);

  // Виділення підтверджуємо командою (рівно те саме на екрані), а плаваючу
  // панель форматування прибираємо Escape — інакше вона затуляє третій абзац.
  await reselectInWord(fromText, toText);
  await pause(300);
  await pressEscape();
}

/**
 * Діалог «Знайти й замінити» (Ctrl+H) — координати на стрічці Home
 * розгорнутого вікна 1920×1080. Синтетичний Ctrl+H сам ярлик не відкриває
 * (перевірено дослідом), тому відкриваємо кліком по кнопці «Replace».
 * Координати полів усередині діалогу теж фіксовані — саме вікно завжди
 * з'являється в тому самому місці відносно правого нижнього кута екрана.
 */
export const REPLACE_BTN = { x: 1789, y: 128 };
export const FIND_FIELD = { x: 1440, y: 668 };
export const REPLACE_FIELD = { x: 1440, y: 747 };
export const REPLACE_ALL_BTN = { x: 1469, y: 828 };
export const REPLACE_OK_BTN = { x: 966, y: 600 };
export const REPLACE_CANCEL_BTN = { x: 1724, y: 828 };

export async function openReplaceDialog(mouse) {
  await mouse.glide(REPLACE_BTN.x, REPLACE_BTN.y, { ms: 500 });
  await mouse.click();
  await sleep(700);
}

/**
 * Клік у поле діалогу «Знайти й замінити» та надійне очищення попереднього
 * вмісту перед друком нового тексту.
 *
 * `Ctrl+A` у цих полях (це комбобокси з історією пошуку, не звичайні
 * текстові поля) на ділі НЕ виділяє весь текст — перевірено на реальному
 * дублі уроку 4.4: другу й третю заміни `Ctrl+A`+друк не очищали поле,
 * а дописували новий текст ПІСЛЯ старого, і в результаті «Знайти»/«Замінити
 * на» містили злиплі докупи рядки всіх попередніх замін. Тому тут — курсор
 * у кінець і `Backspace` із запасом (поле точно коротше 100 символів), це
 * працює однаково в будь-якому текстовому контролі Windows.
 */
export async function clearAndType(mouse, field, text, cps) {
  await mouse.glide(field.x, field.y, { ms: 400 });
  await mouse.click();
  await sleep(150);
  await mouse.key('{END}');
  await sleep(80);
  await mouse.key('{BACKSPACE 100}');
  await sleep(150);
  await mouse.type(text, { cps });
}

/** Одна заміна «Знайти й замінити все», з підтвердженням результату. */
export async function replaceInWordDialog(mouse, findText, replaceText) {
  await clearAndType(mouse, FIND_FIELD, findText, 28);
  await sleep(250);

  await clearAndType(mouse, REPLACE_FIELD, replaceText, 24);
  await sleep(350);

  await mouse.glide(REPLACE_ALL_BTN.x, REPLACE_ALL_BTN.y, { ms: 400 });
  await mouse.click();
  await sleep(700);

  // «All done. We made N replacements.» — власне підтвердження Word.
  await mouse.glide(REPLACE_OK_BTN.x, REPLACE_OK_BTN.y, { ms: 350 });
  await mouse.click();
  await sleep(400);
}

export async function closeReplaceDialog(mouse) {
  await mouse.glide(REPLACE_CANCEL_BTN.x, REPLACE_CANCEL_BTN.y, { ms: 400 });
  await mouse.click();
  await sleep(300);
}
