/**
 * Дубль уроку 1.1 — «Демонстрація: як це виглядає в реальній роботі».
 *
 * Це не покроковий урок, а трейлер курсу. Три задачі підряд, одним записом,
 * без пояснень у кадрі: дивитись треба на результат, а не на кнопки.
 *
 *   Задача 1. Лист-відповідь: звернення у Word → чат → чернетка → у Word →
 *             службовець підставляє реквізити руками.
 *   Задача 2. Звіт на 48 сторінок: файл у чат → зведення → відкриваємо
 *             джерело й знаходимо в ньому названу цифру пошуком.
 *   Задача 3. Нарада: аудіозапис у чат → протокол із дорученнями → у Word →
 *             службовець виправляє неправильно почуте прізвище й дописує
 *             реквізити документа.
 *
 * Кожна задача — у своєму чаті: нова задача, новий чат (принцип курсу).
 *
 * Темп у кадрі чесний і навіть повільніший за звичний: усе прискорення —
 * на монтажі, зі значком «×N прискорено». Ролик має бути динамічним, але
 * динаміку робить монтаж, а не поспіх під час зйомки: те, що знято поспіхом,
 * уповільнити вже не можна, а зняте спокійно — можна прискорити.
 *
 * Що тут принципово інакше, ніж у решті уроків. ТРИ дії залежать від того, що
 * саме відповість помічник, і вгадати їх наперед не можна: яку позначку він
 * поставить у листі, на яку сторінку звіту пошлеться і яке прізвище
 * недочує в записі наради. Зашити відповіді в сценарій означало б зняти
 * перевірку помилки, якої цього разу могло й не статися, — тобто підробити
 * саме те, заради чого урок знімається. Тому сценарій читає власну відповідь
 * помічника й дістає з неї потрібне на льоту: `pickPlaceholder`, `pickVerifiedPage`
 * і `findMisheard` у `1-1.steps.mjs`.
 *
 * Якщо котрась із трьох дій цього разу не знайде, за чим правити, — крок
 * просто не знімається, і про це пишеться в консоль. Показувати виправлення
 * там, де виправляти нічого, не можна.
 *
 * Перед запуском:
 *   node lib/chrome.mjs   — і увійти в демо-акаунт
 *   npm run check
 *   python assets/build-1-1.py            — звіт .docx + .pdf
 *   node assets/build-narada-audio.mjs    — аудіозапис наради
 */
import { join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { ASSETS_DIR, OUT_DIR, ensureDir } from '../lib/paths.mjs';
import { recordLesson } from '../lib/session.mjs';
import { bringToFront, clearStage } from '../lib/stage.mjs';
import {
  changeWordFontVisibly, cleanupPastedWord, closeWord, newWordDoc, openInWord,
  pasteInWord, pointInWord, scrollToTop, scrollWord, selectInWord, setUkrainian,
} from '../lib/word.mjs';
import { hold, pause, sleep } from '../lib/human.mjs';
import {
  copyAnswer, frontGemini, newChat, readAnswer, send, typeMultiline, uploadFile, waitForAnswer,
} from '../lib/gemini.mjs';
import {
  PROMPT_LYST, PROMPT_PROTOKOL, PROMPT_ZVEDENNIA, REKVIZYTY,
  aktRequisites, findMisheard, pickVerifiedNumber,
} from './1-1.steps.mjs';

const ZVERNENNIA = join(ASSETS_DIR, 'zvernennia-1247.docx');
const ZVIT_PDF = join(ASSETS_DIR, 'zvit-prohrama-9-misyatsiv.pdf');
const NARADA = join(ASSETS_DIR, 'narada-04-10.m4a');

/**
 * Джерело звіту — той самий markdown, з якого зібрано PDF, із явними
 * позначками сторінок. Потрібен, щоб перевірити посилання помічника ще під
 * час дубля, а не вже на монтажі, коли пересъемка коштує ще один вечір.
 */
const ZVIT_SRC = join(
  ASSETS_DIR, '..', '..', 'apps', 'web', 'public', 'lessons', '1-1', 'zvit-prohrama-9-misyatsiv.md',
);

const DRY = process.argv.includes('--dry');

/** Набір у кадрі — швидкий: людина, яка вже знає, що хоче написати. */
const CPS = 26;

/**
 * Знайти в чернетці листа позначку, яку службовець має замінити реквізитом.
 *
 * Промпт просить лишити одну позначку — про номер акта. Але покладатись на це
 * наосліп не можна: помічник може назвати її інакше або лишити ще одну. Тому
 * не вгадуємо, а читаємо відповідь і беремо ту позначку, що згадує акт; якщо
 * такої немає — будь-яку першу.
 *
 * Повертає рядок разом із дужками або null, якщо позначок немає взагалі.
 */
function pickPlaceholder(reply) {
  const all = reply.match(/\[[^\]]{2,60}\]/g) ?? [];
  if (!all.length) return null;
  return all.find((s) => /акт/i.test(s)) ?? all[0];
}

await recordLesson('1-1', {
  dry: DRY,
  lessonTitle: 'Урок 1.1 — Демонстрація: як це виглядає в реальній роботі',

  async setup({ page }) {
    // Сторонні вкладки геть. Цей сценарій сам відкриває вкладку з PDF і
    // закриває її, але невдалий попередній прогін міг лишити її відкритою — а
    // тоді дубль покаже не чат, а чужий документ (NUANCES.md, §«Стороння
    // вкладка в тому самому Chrome»).
    for (const p of page.context().pages()) {
      if (p !== page) await p.close().catch(() => {});
    }

    // Word начисто: у ньому міг лишитись документ із попереднього дубля.
    await closeWord().catch(() => {});

    // Звернення відкриваємо заздалегідь і ставимо на початок — перший кадр
    // ролика має починатися з паперу на столі, а не з відкривання файлу.
    await openInWord(ZVERNENNIA);
    await scrollToTop();

    await newChat(page);
    await clearStage();
    await bringToFront('Word');
    await sleep(1500);
  },

  async script({ page, mouse, mark, shot, transcript }) {
    /**
     * Те, що дубль дізнався про себе сам, — для монтажу.
     *
     * Оверлеї ролика показують конкретику: яке число ми пішли звіряти й на
     * якій сторінці, яке прізвище виправили. Переносити це руками з логів у
     * `plan.ts` означало б рано чи пізно показати в кадрі одне число, а
     * підписати інше. Тому дубль записує факти у файл, а монтаж їх читає.
     */
    const facts = {};
    // ══ Задача 1. Лист-відповідь на звернення ═════════════════════════════
    console.log('\nЗадача 1: лист-відповідь');

    // Спершу — сама проблема. Глядач має встигнути прочитати, на що
    // скаржиться людина: без цього наступні кадри показують розв'язання
    // задачі, якої він не бачив.
    mark('t1-zvernennia');
    await mouse.jump(1500, 320);
    await hold();
    await shot('t1-zvernennia-verh');
    await scrollWord(9, { steps: 7, ms: 400 });
    await hold();
    await hold();
    await shot('t1-zvernennia-tekst');

    mark('t1-do-chatu');
    await frontGemini();
    await sleep(800);

    mark('t1-zapyt');
    await typeMultiline(page, PROMPT_LYST, { cps: CPS });
    mark('t1-zapyt-hotovyi');
    await pause(500);
    await shot('t1-zapyt');

    const before1 = await send(page);
    mark('t1-nadislano');
    const lyst = await waitForAnswer(page, { before: before1 });
    transcript.push(['Задача 1. Чернетка листа-відповіді', lyst]);
    mark('t1-vidpovid');
    await hold();
    await readAnswer(page);
    mark('t1-prochytano');
    await shot('t1-chernetka');
    await hold();

    // Відповідь не лишається в чаті: службовець забирає її в документ. Саме
    // тут закінчується робота помічника й починається робота людини.
    mark('t1-kopiiuvannia');
    await copyAnswer(page);
    await pause(400);

    mark('t1-u-word');
    await newWordDoc();
    await bringToFront('Document');
    await sleep(700);
    await pasteInWord();
    await pause(500);
    await cleanupPastedWord();          // геть жирне й подвійні абзаци з чату
    await hold();
    await changeWordFontVisibly(mouse, { name: 'Times New Roman', size: 14 });
    await hold();
    await hold();
    await shot('t1-lyst-u-word');

    // Правка руками. Позначку дістаємо з самої відповіді — вгадати її наперед
    // не можна (див. pickPlaceholder).
    const marker = pickPlaceholder(lyst);
    mark('t1-pravka');
    if (marker) {
      // Що друкувати — залежить від того, що помічник написав ПЕРЕД позначкою:
      // «акт №», «акт від» і «акт» вимагають різних форм (див. aktRequisites).
      const value = aktRequisites(lyst.slice(0, lyst.indexOf(marker)));
      console.log(`   позначка для заміни: ${marker} → ${value}`);
      facts.marker = { marker, value };
      const head = marker.slice(0, Math.min(12, marker.length));
      const tail = marker.slice(-Math.min(12, marker.length));
      await selectInWord(mouse, head, tail, { ms: 1200 });
      await pause(500);
      await mouse.type(value, { cps: 11 });
      await hold();
      await hold();
      await shot('t1-pravka');
    } else {
      // Позначок немає — не вигадуємо дію, якої не сталося. Просто показуємо
      // готовий лист повністю; правку в цій задачі підхопить текст уроку.
      console.log('   ! позначок у квадратних дужках немає — правку пропущено');
      await scrollWord(10, { steps: 8, ms: 300 });
      await hold();
    }
    mark('t1-hotovo');
    await hold();

    // ══ Задача 2. Зведення звіту на 48 сторінок ═══════════════════════════
    console.log('\nЗадача 2: зведення звіту');
    mark('t2-pochatok');
    await frontGemini();
    await sleep(800);
    await newChat(page);               // нова задача — новий чат
    await pause(500);

    mark('t2-fail');
    await uploadFile(page, mouse, ZVIT_PDF);
    mark('t2-fail-dodano');
    await hold();
    await shot('t2-fail');

    await typeMultiline(page, PROMPT_ZVEDENNIA, { cps: CPS });
    mark('t2-zapyt-hotovyi');
    await pause(500);

    const before2 = await send(page);
    mark('t2-nadislano');
    const zvedennia = await waitForAnswer(page, {
      before: before2, timeout: 300000, quiet: 4000, minLength: 400,
    });
    transcript.push(['Задача 2. Зведення звіту', zvedennia]);
    mark('t2-vidpovid');
    await hold();
    await readAnswer(page);
    mark('t2-prochytano');
    await shot('t2-zvedennia');
    await hold();

    // Перевірка. Не перечитуємо 48 сторінок — відкриваємо рівно ту, на яку
    // послався помічник, і дивимось на одне число. Саме це урок і продає:
    // перевірка коштує хвилину, а не пів дня.
    // Перевірка. Не перечитуємо 48 сторінок і не гортаємо їх — шукаємо в
    // документі одне конкретне число, як зробила б людина: Ctrl+F, цифра,
    // Enter. Переглядач сам стрибає на потрібну сторінку й показує, скільки
    // збігів знайшов.
    //
    // Спочатку тут було відкриття «процитованої» сторінки (`#page=N`), але
    // дві проби показали, що помічник називає сторінки PDF навмання —
    // підтвердилось одне посилання з одинадцяти. Пошук за самим числом
    // працює завжди й нічого не приховує (докладно — в 1-1.steps.mjs).
    const cited = pickVerifiedNumber(zvedennia, readFileSync(ZVIT_SRC, 'utf8'));
    mark('t2-perevirka');
    if (cited) {
      console.log(`   шукаємо «${cited.value}» — у документі це с. ${cited.page}, збігів ${cited.hits}`);
      facts.cited = cited;

      const pdf = await page.context().newPage();
      await pdf.goto(pathToFileURL(ZVIT_PDF).href);
      await pdf.waitForTimeout(3500);       // переглядач малює першу сторінку
      await frontGemini();                  // фокус ОС на вікні Chrome, інакше Ctrl+F піде не туди
      await sleep(700);
      await hold();
      await shot('t2-dzherelo');

      // Ctrl+F перехоплює сам переглядач PDF — це його пошук, не браузерний.
      await mouse.hotkey('ctrl+f');
      await pause(900);
      await mouse.type(cited.value, { cps: 6 });
      await pause(800);
      await mouse.enter();
      await hold();
      await hold();
      await shot('t2-znaideno');
      await hold();

      await mouse.escape();
      await pause(500);
      await pdf.close();
      await pause(600);
      await frontGemini();
      await sleep(700);
    } else {
      // Жодне число зі зведення не знайшлось у джерелі. Знімати «перевірку»,
      // яка насправді провалилась, у трейлері не можна — крок пропускаємо, а
      // сам факт лишається в консолі й у стенограмі дубля.
      console.log('   ! жодна цифра зі зведення не підтвердилась джерелом — перевірку пропущено');
      transcript.push(['Перевірка цифри', 'жодна цифра не підтвердилась джерелом']);
    }

    mark('t2-hotovo');
    await hold();

    // ══ Задача 3. Протокол наради з аудіозапису ═══════════════════════════
    console.log('\nЗадача 3: протокол наради');
    mark('t3-pochatok');
    await newChat(page);
    await pause(500);

    mark('t3-audio');
    await uploadFile(page, mouse, NARADA);
    mark('t3-audio-dodano');
    await hold();
    await shot('t3-audio');

    await typeMultiline(page, PROMPT_PROTOKOL, { cps: CPS });
    mark('t3-zapyt-hotovyi');
    await pause(500);

    const before3 = await send(page);
    mark('t3-nadislano');
    // Аудіо обробляється помітно довше за текст: п'ять хвилин запису треба
    // спершу розпізнати. Типових трьох хвилин очікування тут замало.
    const protokol = await waitForAnswer(page, {
      before: before3, timeout: 420000, quiet: 4000, minLength: 400,
    });
    transcript.push(['Задача 3. Протокол наради', protokol]);
    mark('t3-vidpovid');
    await hold();
    await readAnswer(page);
    mark('t3-prochytano');
    await shot('t3-protokol');
    await hold();

    mark('t3-kopiiuvannia');
    await copyAnswer(page);
    await pause(400);

    mark('t3-u-word');
    await newWordDoc();
    await bringToFront('Document');
    await sleep(700);
    await pasteInWord();
    await pause(500);
    await cleanupPastedWord();
    await hold();
    await changeWordFontVisibly(mouse, { name: 'Times New Roman', size: 14 });
    await hold();
    await hold();
    await shot('t3-protokol-u-word');

    // Найголовніша перевірка ролика: прізвища.
    //
    // Розпізнавання мовлення плутає саме їх — на пробі помічник почув
    // «Гнатюк» як «Игнатюк», ще й російською «И», якої в українському
    // алфавіті немає. Але зашивати цю пару в сценарій не можна: наступного
    // разу помилка може бути іншою або її не буде взагалі, і тоді ми зняли б
    // виправлення неіснуючої помилки. Тому спотворення шукаємо в самій
    // відповіді (findMisheard) і виправляємо те, що справді знайшли.
    //
    // Подвійний клац по слову, а не діалог «Знайти й замінити»: людина за
    // столом робить саме так, і в кадрі одразу видно, ЯКЕ слово змінилось.
    const misheard = findMisheard(protokol);
    mark('t3-prizvyshche');
    if (misheard) {
      console.log(`   помічник почув «${misheard.wrong}» замість «${misheard.right}» — виправляємо`);
      facts.misheard = misheard;
      transcript.push(['Помилка розпізнавання', `«${misheard.wrong}» замість «${misheard.right}»`]);
      const box = await pointInWord(misheard.wrong);
      await mouse.glide(box.x + 24, box.y + 8, { ms: 800 });
      await pause(400);
      await mouse.doubleClick();          // Word виділяє слово цілком
      await hold();
      await mouse.type(misheard.right, { cps: 9 });
      await hold();
      await hold();
      await shot('t3-prizvyshche');
    } else {
      console.log('   спотворених прізвищ не знайдено — цього разу помічник почув усе правильно');
    }

    // Прокрутка до кінця робить дві справи одразу: дає прочитати доручення й
    // приводить кадр туди, де службовець дописує реквізити.
    //
    // Рядків беремо із запасом. Word зупиняє прокрутку на кінці документа, тож
    // «зайві» кроки нічого не псують, зате гарантують, що наступний `Ctrl+End`
    // лише переставить курсор і НЕ смикне кадр: якби внизу лишалось
    // непрокручене, той самий Ctrl+End дав би миттєвий стрибок замість руху.
    mark('t3-chytannia');
    await scrollWord(44, { steps: 15, ms: 300 });
    await hold();
    await hold();
    await shot('t3-doruchennia');

    mark('t3-pravka');
    await mouse.hotkey('ctrl+end');
    await pause(400);
    await mouse.enter();
    await pause(300);
    await mouse.type(REKVIZYTY, { cps: 12 });
    // Дописаний руками рядок Word позначає мовою розкладки, і в рядку стану
    // під українським протоколом з'являється «English (United States)».
    await setUkrainian();
    await hold();
    await hold();
    await shot('t3-rekvizyty');

    mark('t3-hotovo');
    await pause(500);
    mark('final');
    await hold();

    const factsFile = join(ensureDir(join(OUT_DIR, '1-1')), 'facts.json');
    writeFileSync(factsFile, JSON.stringify(facts, null, 2) + '\n', 'utf8');
    console.log(`\nФакти для монтажу: ${factsFile}`);
  },
});
