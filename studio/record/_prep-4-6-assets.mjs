/**
 * Одноразова підготовка трьох файлів-зразків для уроку 4.6 «Робота з
 * файлами» — виконується ДО запису, самі документи в кадр не потрапляють
 * (глядач бачить лише прикріплення готового файлу, не його написання,
 * так само як зразок листа в уроці 4.4).
 *
 *   node record/_prep-4-6-assets.mjs
 */
import { join } from 'node:path';
import { ASSETS_DIR, ensureDir } from '../lib/paths.mjs';
import { openMouse } from '../lib/mouse.mjs';
import { bringToFront } from '../lib/stage.mjs';
import { closeWord, newWordDoc, saveWordAs } from '../lib/word.mjs';
import { sleep } from '../lib/human.mjs';

ensureDir(ASSETS_DIR);
const mouse = openMouse();

const ZAPYSKA_P1 = `Службова записка
Про стан виконання ремонтних робіт за III квартал 2026 року

1. Ремонт покрівлі будівлі адміністрації — виконано, вартість 84 300 грн, акт від 12.07.2026.
2. Заміна вікон у залі засідань — виконано, вартість 46 700 грн, акт від 25.07.2026.
3. Ремонт системи опалення котельні — у процесі, орієнтовна вартість 112 000 грн, завершення заплановано на листопад.`;

const ZAPYSKA_P2 = `4. Благоустрій прилеглої території — виконано, вартість 58 900 грн, акт від 03.08.2026.
5. Встановлення пандуса для маломобільних груп — заплановано на IV квартал, орієнтовна вартість 27 400 грн.

Загальна сума виконаних робіт: 189 900 грн.
Загальна сума запланованих робіт: 139 400 грн.`;

const POLOZHENNYA_STARE = `ПОЛОЖЕННЯ про порядок розгляду звернень громадян (витяг)

3.2. Звернення реєструється протягом одного робочого дня з дня надходження.
3.5. Строк розгляду звернення становить 5 робочих днів, за потреби продовжується керівником до 10 робочих днів.
4.1. Відповідь надається в письмовій формі за підписом керівника структурного підрозділу.`;

const POLOZHENNYA_NOVE = `ПОЛОЖЕННЯ про порядок розгляду звернень громадян (витяг)

3.2. Звернення реєструється в день надходження.
3.5. Строк розгляду звернення становить 3 робочих дні, за потреби продовжується керівником до 7 робочих днів.
4.1. Відповідь надається в письмовій формі за підписом керівника структурного підрозділу.
4.3. Копія відповіді долучається до електронної справи звернення протягом одного робочого дня.`;

async function makeDoc(name, write) {
  console.log(`Пишу ${name}…`);
  await newWordDoc();
  await bringToFront('Document');
  await sleep(600);
  await write();
  await sleep(300);
  await saveWordAs(join(ASSETS_DIR, name));
  await sleep(400);
  await closeWord();
  await sleep(400);
}

await makeDoc('sluzhbova-zapyska.docx', async () => {
  await mouse.type(ZAPYSKA_P1, { cps: 40 });
  await mouse.key('^{ENTER}'); // розрив сторінки
  await mouse.type(ZAPYSKA_P2, { cps: 40 });
});

await makeDoc('polozhennya-stare.docx', async () => {
  await mouse.type(POLOZHENNYA_STARE, { cps: 40 });
});

await makeDoc('polozhennya-nove.docx', async () => {
  await mouse.type(POLOZHENNYA_NOVE, { cps: 40 });
});

console.log('Готово: sluzhbova-zapyska.docx, polozhennya-stare.docx, polozhennya-nove.docx');
