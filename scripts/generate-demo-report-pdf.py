#!/usr/bin/env python3
"""
Верстає навчальний звіт Уроку 2.2 (`zvit-3-kvartal.md`) у PDF — так, як виглядає
справжній документ органу влади: А4, Times New Roman 14, поля за ДСТУ 4163:2020
(ліве 30 мм, праве 10 мм, верхнє й нижнє 20 мм), абзацний відступ 1,25 см,
вирівнювання за шириною, номер сторінки посередині верхнього поля з другої сторінки.

**Одна сторінка .md = один аркуш PDF.** Урок посилається на конкретні сторінки
(с. 4 — 87 %, с. 11 — 12,4 млн грн, с. 26 — 1 240 звернень, с. 33 — тендери), а
в змісті звіту стоять номери сторінок. Тому розриви не віддаються на розсуд
браузера: кожна сторінка — окремий аркуш фіксованої висоти, і скрипт падає,
якщо вміст хоч однієї на аркуш не влазить.

Друк робить Chrome у headless-режимі з тимчасовим профілем — вікно не
відкривається й до браузера користувача він не підключається.

Запуск:  python scripts/generate-demo-report-pdf.py
Вхід:    apps/web/public/lessons/2-2/zvit-3-kvartal.md  (див. generate-demo-report.py)
Вихід:   apps/web/public/lessons/2-2/zvit-3-kvartal.pdf
"""
from __future__ import annotations

import html
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "apps/web/public/lessons/2-2/zvit-3-kvartal.md"
OUT = SRC.with_suffix(".pdf")

CHROME_CANDIDATES = [
    os.environ.get("CHROME_PATH", ""),
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
]

# Цифри, на які посилається урок: сторінка → фрагмент, що мусить на ній бути.
ANCHORS = {4: "87 %", 11: "12,4 млн", 26: "1 240", 33: "тендерних процедур"}


# ---------------------------------------------------------------- Markdown → HTML
UNITS = r"%|грн|млн|млрд|тис\.|кв\.\s?м|км|м|од\.|одиниц\w*|шт\.|осіб|год\.|днів|посад\w*"

# Що не можна розривати в кінці рядка: «87 %», «12,4 млн грн», «1 240», «№ 87-од»,
# «П. С. Демченко». Склеюємо не нерозривним пробілом, а обгорткою nowrap: у PDF
# лишається звичайний пробіл, і пошук Ctrl+F за «87 %» чи «1 240» — а на ньому
# тримається перевірка в уроці — знаходить збіг у будь-якому переглядачі.
KEEP_TOGETHER = re.compile(
    rf"\d+(?:[ ,]\d+)*(?: (?:{UNITS})(?!\w))+"   # число з одиницями
    r"|\d{1,3}(?: \d{3})+"                        # розряди
    r"|№ \S+"                                     # номер документа
    r"|\b[IVX]+ квартал\w*"                       # «IV квартал»
    r"|(?:[А-ЯІЇЄҐ]\. ){1,2}[А-ЯІЇЄҐ][а-яіїєґʼ'-]+"  # ініціали з прізвищем
)


def typography(text: str) -> str:
    """Правила набору ділового документа, яких Markdown не знає."""
    # Апостроф — «ʼ», а не друкарська машинка «'».
    text = re.sub(r"(?<=\w)'(?=\w)", "ʼ", text)
    return KEEP_TOGETHER.sub(lambda m: f'<span class="nw">{m.group(0)}</span>', text)


def inline(text: str) -> str:
    """Той мінімум розмітки, що є у звіті: **жирний**, _курсив_, &nbsp;."""
    text = html.escape(text, quote=False).replace("&amp;nbsp;", " ")
    text = typography(text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<![\w])_(.+?)_(?![\w])", r"<em>\1</em>", text, flags=re.S)
    return text


def table_html(lines: list[str]) -> str:
    rows = [[c.strip() for c in ln.strip().strip("|").split("|")] for ln in lines]
    head, body = rows[0], rows[2:]
    out = ["<table><thead><tr>"]
    out += [f"<th>{inline(c)}</th>" for c in head]
    out.append("</tr></thead><tbody>")
    for r in body:
        total = r[0].startswith("**")
        out.append(f'<tr class="total">' if total else "<tr>")
        for i, c in enumerate(r):
            # Перша колонка — назва, решта — числа: їх центруємо, як у звітних таблицях.
            cls = "" if i == 0 else ' class="num"'
            out.append(f"<td{cls}>{inline(c)}</td>")
        out.append("</tr>")
    out.append("</tbody></table>")
    return "".join(out)


TOC_RE = re.compile(r"^(\d+)\.\s+(.+?)\s+…\s+(\d+)$")


def block_html(block: str) -> str:
    lines = block.split("\n")
    first = lines[0]

    if first.startswith("## "):
        # Кілька рядків «## …» поспіль — це підзаголовок титулу, а не розділ.
        return "".join(f"<h2>{inline(ln[3:])}</h2>" for ln in lines)
    if first.startswith("# "):
        return f"<h1>{inline(first[2:])}</h1>"
    if first.startswith("|"):
        return table_html(lines)
    if all(TOC_RE.match(ln) for ln in lines):
        items = []
        for ln in lines:
            num, title, pg = TOC_RE.match(ln).groups()  # type: ignore[union-attr]
            items.append(
                f'<li><span class="toc-num">{num}.</span><span class="toc-title">{inline(title)}</span>'
                f'<span class="toc-dots"></span><span class="toc-page">{pg}</span></li>'
            )
        return f'<ol class="toc">{"".join(items)}</ol>'
    if all(ln.startswith("- ") for ln in lines):
        return "<ul>" + "".join(f"<li>{inline(ln[2:])}</li>" for ln in lines) + "</ul>"
    return f"<p>{inline(' '.join(ln.strip() for ln in lines))}</p>"


def split_pages(md: str) -> list[str]:
    parts = re.split(r"<!-- сторінка (\d+) -->", md)
    pages: list[str] = []
    for i in range(1, len(parts), 2):
        num, body = int(parts[i]), parts[i + 1]
        assert num == len(pages) + 1, f"сторінки йдуть не по порядку: {num}"
        body = re.sub(r'<div align="center">— \d+ —</div>', "", body)
        body = re.sub(r"\n---\s*$", "", body.strip())
        pages.append(body.strip())
    return pages


# ---------------------------------------------------------------- Особливі сторінки
def title_page(body: str) -> str:
    blocks = [b.strip() for b in body.split("\n\n") if b.strip()]
    heading = next(b for b in blocks if b.startswith("# "))
    title_lines = heading.split("\n")
    subtitle = " ".join(ln[3:] for ln in title_lines[1:])

    # Гриф «Схвалено …» і рядок протоколу в .md розділені порожнім рядком — це два блоки.
    i = next(k for k, b in enumerate(blocks) if b.startswith("**Схвалено**"))
    grif_lines = [blocks[i].replace("**Схвалено**", "").strip()]
    if i + 1 < len(blocks) and blocks[i + 1].startswith("протокол"):
        grif_lines.append(blocks[i + 1])
    executor = [b for b in blocks if b.startswith("**Виконавець:**") or b.startswith("**Відповідальний:**")]
    disclaimer = next((b for b in blocks if b.startswith("_Документ навчальний")), "")

    grif = "".join(f"<div>{inline(ln)}</div>" for ln in grif_lines)
    exec_html = "".join(f"<p>{inline(ln)}</p>" for b in executor for ln in b.split("\n") if ln.strip())
    return f"""
<div class="title-grif">
  <div class="grif-head">СХВАЛЕНО</div>
  {grif}
</div>
<div class="title-main">
  <div class="title-word">{inline(title_lines[0][2:])}</div>
  <div class="title-sub">{inline(subtitle)}</div>
</div>
<div class="title-exec">{exec_html}</div>
<div class="title-foot">
  <div class="title-city">Н-ськ — 2026</div>
  <p class="disclaimer">{inline(" ".join(disclaimer.split()))}</p>
</div>"""


def signature_page(body: str) -> str:
    """Останній аркуш: підпис оформлюємо реквізитом, а не рядком тексту."""
    main, _, sign = body.partition("\n\n---\n\n")
    html_main = "".join(block_html(b.strip()) for b in main.split("\n\n") if b.strip())
    m = re.search(r"_(.+?)_.*?\*\*(.+?)\*\*", sign, re.S)
    position, name = (m.group(1), m.group(2)) if m else ("", "")
    date = re.search(r"_(\d{2}\.\d{2}\.\d{4})_", sign)
    # «[підпис]» зі звіту не переносимо: квадратні дужки в курсі означають «сюди ви
    # підставляєте своє» і в демонстраційних документах не живуть (lessons/README.md, 1.4).
    return f"""{html_main}
<div class="signature">
  <span class="sig-pos">{inline(position)}</span>
  <span class="sig-line"></span>
  <span class="sig-name">{inline(name)}</span>
</div>
<p class="sig-date">{date.group(1) if date else ""}</p>"""


def page_html(n: int, body: str, total: int) -> str:
    if n == 1:
        inner = title_page(body)
    elif n == total and "\n\n---\n\n" in body:
        inner = signature_page(body)
    else:
        inner = "".join(block_html(b.strip()) for b in body.split("\n\n") if b.strip())
    number = f'<div class="pno">{n}</div>' if n > 1 else ""
    cls = "sheet title" if n == 1 else "sheet"
    return f'<section class="{cls}" data-page="{n}">{number}<div class="content">{inner}</div></section>'


CSS = """
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: 'Times New Roman', Times, serif;
  font-size: 14pt;
  line-height: 1.5;
  color: #000;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.sheet {
  position: relative;
  width: 210mm;
  height: 297mm;
  /* ДСТУ 4163:2020: ліве поле 30 мм, праве 10 мм, верхнє й нижнє 20 мм. */
  padding: 20mm 10mm 20mm 30mm;
  overflow: hidden;
  break-after: page;
  page-break-after: always;
}
.sheet:last-child { break-after: auto; page-break-after: auto; }
.content { height: 100%; overflow: hidden; }
/* Номер сторінки — посередині верхнього поля, з другої сторінки. */
.pno {
  position: absolute; top: 9mm; left: 30mm; right: 10mm;
  text-align: center; font-size: 12pt; line-height: 1;
}

.nw { white-space: nowrap; display: inline-block; text-indent: 0; }
p { margin: 0; text-align: justify; text-indent: 1.25cm; hyphens: auto; }
p + p, p + ul, ul + p, table + p, p + table { margin-top: 0; }
h2 {
  font-size: 14pt; font-weight: bold; text-align: center;
  margin: 0 0 6pt; line-height: 1.3;
}
h2 + p, h2 + table { margin-top: 0; }
p + h2, table + h2 { margin-top: 12pt; }
ul { margin: 0; padding: 0; list-style: none; }
ul li { text-align: justify; text-indent: 1.25cm; hyphens: auto; }
ul li::before { content: "–\\00a0"; }

table {
  width: 100%; border-collapse: collapse; margin: 6pt 0 8pt;
  font-size: 12pt; line-height: 1.2; break-inside: avoid;
}
th, td { border: 0.75pt solid #000; padding: 3pt 5pt; vertical-align: middle; }
th { font-weight: bold; text-align: center; }
td.num { text-align: center; white-space: nowrap; }
tr.total td { font-weight: bold; }

/* Зміст: назва, крапки-заповнювачі, номер сторінки праворуч. */
.toc { list-style: none; margin: 6pt 0 0; padding: 0; }
.toc li { display: flex; align-items: baseline; }
.toc-num { flex: none; width: 1.1cm; }
.toc-title { flex: none; max-width: 80%; }
.toc-dots { flex: 1; border-bottom: 1.2pt dotted #000; margin: 0 4pt; transform: translateY(-4pt); }
.toc-page { flex: none; min-width: 0.8cm; text-align: right; }

/* Титульний аркуш. */
.sheet.title .content { display: flex; flex-direction: column; }
.title-grif { align-self: flex-end; width: 72mm; line-height: 1.3; }
.grif-head { font-weight: bold; margin-bottom: 2pt; }
.title-main { margin-top: 62mm; text-align: center; }
.title-word { font-size: 20pt; font-weight: bold; letter-spacing: 3pt; }
.title-sub { margin: 8pt auto 0; max-width: 135mm; font-weight: bold; line-height: 1.35; }
.title-exec { margin-top: 36mm; margin-left: auto; width: 100mm; line-height: 1.35; }
.title-exec p { text-indent: 0; text-align: left; margin-bottom: 4pt; }
.title-foot { margin-top: auto; text-align: center; }
.title-city { margin-bottom: 8mm; }
.disclaimer { text-indent: 0; text-align: center; font-size: 11pt; line-height: 1.25; font-style: italic; }
.disclaimer em { font-style: italic; }

/* Реквізит «Підпис». */
.signature { display: flex; align-items: flex-end; margin-top: 30pt; }
.sig-pos { flex: none; width: 70mm; }
.sig-line { flex: none; width: 40mm; border-bottom: 0.75pt solid #000; margin: 0 8mm 5pt 0; }
.sig-name { flex: 1; text-align: right; }
.sig-pos em, .sig-name strong { font-style: normal; font-weight: normal; }
.sig-date { text-indent: 0; margin-top: 12pt; }
"""

# Після завантаження шрифтів позначаємо кожен аркуш, чий вміст не влазить.
CHECK_JS = """
document.fonts.ready.then(() => {
  const bad = [];
  document.querySelectorAll('.sheet').forEach((s) => {
    const c = s.querySelector('.content');
    if (c.scrollHeight > c.clientHeight + 1) bad.push(s.dataset.page + ':' + (c.scrollHeight - c.clientHeight));
    const last = c.lastElementChild;
    if (last) s.dataset.fill = Math.round((last.getBoundingClientRect().bottom - c.getBoundingClientRect().top) / c.clientHeight * 100);
  });
  document.body.dataset.overflow = bad.join(',') || 'none';
  document.body.dataset.fill = [...document.querySelectorAll('.sheet')].map((s) => s.dataset.fill).join(',');
});
"""


def build_html(pages: list[str], with_check: bool) -> str:
    sheets = "\n".join(page_html(i, body, len(pages)) for i, body in enumerate(pages, start=1))
    script = f"<script>{CHECK_JS}</script>" if with_check else ""
    return f"""<!doctype html>
<html lang="uk"><head><meta charset="utf-8">
<title>Звіт про роботу управління ЖКГ за III квартал 2026 року</title>
<style>{CSS}</style></head>
<body>{sheets}{script}</body></html>"""


def find_chrome() -> str:
    for c in CHROME_CANDIDATES:
        if c and Path(c).exists():
            return c
    sys.exit("Не знайдено Chrome/Edge. Вкажіть шлях у змінній CHROME_PATH.")


def chrome(args: list[str], profile: str) -> subprocess.CompletedProcess[str]:
    # Окремий профіль обовʼязковий: без нього Chrome на Windows «відкривається в
    # наявній сесії» — у вікні користувача, а не headless.
    base = [find_chrome(), "--headless=new", "--disable-gpu", "--no-first-run",
            "--no-default-browser-check", f"--user-data-dir={profile}"]
    return subprocess.run(base + args, capture_output=True, text=True, encoding="utf-8", timeout=180)


def main() -> None:
    # Консоль Windows за замовчуванням у cp1252 — українські повідомлення в ній падають.
    sys.stdout.reconfigure(encoding="utf-8")
    pages = split_pages(SRC.read_text(encoding="utf-8"))
    for n, frag in ANCHORS.items():
        assert frag in pages[n - 1], f"с. {n}: не знайдено «{frag}» — урок посилається саме на неї"

    tmp = Path(tempfile.mkdtemp(prefix="zvit-pdf-"))
    profile = str(tmp / "profile")
    try:
        check = tmp / "check.html"
        check.write_text(build_html(pages, with_check=True), encoding="utf-8")
        dom = chrome(["--virtual-time-budget=5000", "--dump-dom", check.as_uri()], profile).stdout
        m = re.search(r'data-overflow="([^"]*)"', dom)
        if not m:
            sys.exit("Не вдалося перевірити верстку: Chrome не повернув DOM.")
        fill = re.search(r'data-fill="([^"]*)"', dom)
        if fill:
            print("Заповнення аркушів, %:", fill.group(1))
        if m.group(1) != "none":
            sys.exit(f"Вміст не влазить в аркуш (сторінка:зайві px): {m.group(1)}")

        final = tmp / "zvit.html"
        final.write_text(build_html(pages, with_check=False), encoding="utf-8")
        pdf = tmp / "zvit.pdf"
        chrome(["--no-pdf-header-footer", "--virtual-time-budget=5000",
                f"--print-to-pdf={pdf}", final.as_uri()], profile)
        if not pdf.exists():
            sys.exit("Chrome не створив PDF.")

        count = len(re.findall(rb"/Type\s*/Page(?!s)", pdf.read_bytes()))
        if count != len(pages):
            sys.exit(f"У PDF {count} аркушів замість {len(pages)} — пагінація зʼїхала.")
        shutil.copyfile(pdf, OUT)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    print(f"Готово: {OUT.relative_to(ROOT)}")
    print(f"Аркушів: {len(pages)} · розмір: {OUT.stat().st_size / 1024:.0f} КБ")


if __name__ == "__main__":
    main()
