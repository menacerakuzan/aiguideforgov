"""Звіт для уроку 1.1 — з текстового джерела у справжній Word-документ і PDF.

Джерело — apps/web/public/lessons/1-1/zvit-prohrama-9-misyatsiv.md: той самий
файл, який слухач може завантажити собі з платформи. У ньому розставлено
`<!-- сторінка N -->` — 48 позначок, які стають ЯВНИМИ розривами сторінок, щоб
Word не додав своєї розбивки.

Навіщо це критично саме тут. В уроці помічник цитує сторінки («с. 16»), а
глядач відкриває документ і звіряє. Якщо розбивка «попливе», перевірка в кадрі
покаже не те число — і урок навчить рівно протилежного тому, чого хотів.
Тому номер сторінки в готовому файлі мусить збігатися з номером у позначці, і
скрипт це перевіряє після експорту.

Чому окремий документ, а не звіт із уроку 2.2. Урок 2.2 уже показує зведення
34-сторінкового звіту ЖКГ. Якщо 1.1 візьме той самий файл, трейлер курсу
дослівно повторить одну з його серій. Тут — інший документ: міський програмний
звіт, удвічі більший, з іншою структурою.

Відмінність від build-2-2.py: додано підтримку заголовків третього рівня
(`### 1.7. …`) — у цьому звіті є підрозділи, яких у звіті 2.2 не було.

Запуск:  python studio/assets/build-1-1.py
"""
import re
import subprocess
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Cm, Pt
from docx.oxml.ns import qn

SRC = Path(__file__).parents[2] / 'apps' / 'web' / 'public' / 'lessons' / '1-1' / 'zvit-prohrama-9-misyatsiv.md'
# .docx — ПОЗА assets, і це принципово.
#
# У кадрі файл обирається в нативному діалозі «Відкрити» кліком по ІМЕНІ
# без розширення (`gemini.mjs#uploadFile`). Якщо поруч лежать два файли з
# однаковою назвою й різними розширеннями, діалог візьме перший-ліпший — і на
# репетиції 2026-09-04 це сталось: у чат пішов .docx замість .pdf.
#
# Наслідок був не косметичний: у Word-документа немає фіксованої пагінації,
# тому помічник називав сторінки навмання («412,6 млн грн (с. 8)» при справжній
# сторінці 16) — а весь сенс задачі 2 в тому, що сторінка сходиться.
# Тому в теці зйомки лежить рівно один файл — PDF.
OUT = Path(__file__).parents[1] / 'out' / '1-1' / 'zvit-prohrama-9-misyatsiv.docx'
OUT_PDF = Path(__file__).parent / 'zvit-prohrama-9-misyatsiv.pdf'

FONT = 'Times New Roman'
SIZE = Pt(12)


def new_doc():
    doc = Document()
    s = doc.sections[0]
    s.left_margin, s.right_margin = Cm(3), Cm(1.5)
    s.top_margin, s.bottom_margin = Cm(2), Cm(2)

    normal = doc.styles['Normal']
    normal.font.name = FONT
    normal.font.size = SIZE
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.line_spacing = 1.15

    # Українська явно, а не «визначена автоматично»: інакше Word підкреслює
    # червоним половину звіту, і в кадрі це виглядає як документ із помилками.
    rpr = normal.element.get_or_add_rPr()
    lang = rpr.find(qn('w:lang'))
    if lang is None:
        lang = rpr.makeelement(qn('w:lang'), {})
        rpr.append(lang)
    lang.set(qn('w:val'), 'uk-UA')

    return doc


INLINE = re.compile(r'(\*\*[^*]+\*\*|_[^_]+_)')


def add_runs(p, text):
    """Розбираємо **жирний** і _курсив_. Інших маркерів у джерелі немає."""
    for part in INLINE.split(text):
        if not part:
            continue
        if part.startswith('**') and part.endswith('**'):
            p.add_run(part[2:-2]).bold = True
        elif part.startswith('_') and part.endswith('_'):
            p.add_run(part[1:-1]).italic = True
        else:
            p.add_run(part)


def add_table(doc, rows):
    header, *body = rows
    t = doc.add_table(rows=1, cols=len(header))
    t.style = 'Table Grid'
    for cell, text in zip(t.rows[0].cells, header):
        cell.paragraphs[0].add_run(text).bold = True
        for r in cell.paragraphs[0].runs:
            r.font.name, r.font.size = FONT, Pt(11)
    for row in body:
        cells = t.add_row().cells
        for cell, text in zip(cells, row):
            para = cell.paragraphs[0]
            add_runs(para, text)
            for r in para.runs:
                r.font.name, r.font.size = FONT, Pt(11)
    doc.add_paragraph().paragraph_format.space_after = Pt(4)


def heading(doc, text, size, center=True):
    p = doc.add_paragraph()
    if center:
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run(text)
    r.bold, r.font.size = True, Pt(size)


def render_page(doc, lines):
    i = 0
    while i < len(lines):
        line = lines[i].rstrip()

        if not line.strip():
            i += 1
            continue

        if line.startswith('### '):
            # Підрозділ — ліворуч, а не по центру: по центру він читався б як
            # ще один заголовок документа й ламав ієрархію.
            heading(doc, line[4:].strip(), 12, center=False)
            i += 1
            continue

        if line.startswith('## '):
            heading(doc, line[3:].strip(), 13)
            i += 1
            continue

        if line.startswith('# '):
            heading(doc, line[2:].strip(), 16)
            i += 1
            continue

        if line.startswith('<div align="center">') and '—' in line:
            # Номер сторінки в підвалі джерела — довідковий; Word проставить свій.
            i += 1
            continue

        if line == '---':
            i += 1
            continue

        if line.startswith('|'):
            rows = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                cells = [c.strip() for c in lines[i].strip().strip('|').split('|')]
                if all(re.fullmatch(r':?-+:?', c) for c in cells):
                    i += 1
                    continue
                rows.append(cells)
                i += 1
            add_table(doc, rows)
            continue

        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        add_runs(p, line)
        i += 1


def build_docx():
    text = SRC.read_text(encoding='utf-8')
    parts = re.split(r'<!--\s*сторінка\s+(\d+)\s*-->', text)
    parts = parts[1:]  # відкидаємо шапку-коментар перед першою позначкою

    doc = new_doc()
    for idx in range(0, len(parts), 2):
        if idx > 0:
            doc.add_page_break()
        render_page(doc, parts[idx + 1].split('\n'))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc.save(OUT)
    return len(parts) // 2


def export_pdf():
    """DOCX → PDF засобами самого Word.

    Не сторонній конвертер: у кадрі глядач звіряє сторінку PDF зі сторінкою
    Word, і розбивка мусить бути та сама. Word експортує свою власну верстку,
    тож збіг гарантований за побудовою.
    """
    ps = f'''
$w = New-Object -ComObject Word.Application
$w.Visible = $false
$d = $w.Documents.Open("{OUT}", $false, $true)
$d.ExportAsFixedFormat("{OUT_PDF}", 17)
$pages = $d.ComputeStatistics(2)
$d.Close($false)
$w.Quit()
Write-Output $pages
'''
    r = subprocess.run(
        ['powershell.exe', '-NoProfile', '-NonInteractive', '-Command', ps],
        capture_output=True, text=True,
    )
    if r.returncode != 0:
        raise SystemExit(f'Word не експортував PDF:\n{r.stderr[-1500:]}')
    return int(r.stdout.strip().splitlines()[-1])


if __name__ == '__main__':
    marks = build_docx()
    print(f'  {OUT.name}  {marks} позначок сторінок  {OUT.stat().st_size} байт')

    real = export_pdf()
    print(f'  {OUT_PDF.name}  {real} сторінок за версією Word  {OUT_PDF.stat().st_size} байт')

    # Дія, результат якої не перевірено, вважається такою, що не сталася
    # (STANDARD.md §6). Розходження розбивки ламає перевірку сторінок у кадрі.
    if real != marks:
        raise SystemExit(
            f'\nРОЗБІЖНІСТЬ: у джерелі {marks} сторінок, Word нарахував {real}.\n'
            f'Помічник цитуватиме сторінки, яких глядач не знайде. Виправити джерело.'
        )
    print(f'\n  Розбивка збігається: {real} сторінок.')
