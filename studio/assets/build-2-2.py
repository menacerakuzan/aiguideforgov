"""Звіт для уроку 2.2 — з текстового джерела в справжній Word-документ.

Джерело — apps/web/public/lessons/2-2/zvit-3-kvartal.md: той самий файл, що
службовець завантажує собі з уроку (кнопка «Завантажити» на платформі). У
ньому вже розставлено `<!-- сторінка N -->` — 34 позначки, які збігаються з
номерами сторінок в уроці (§1.20 стандарту: числа в тексті уроку мають
збігатися з файлом). Ми не вигадуємо розбивку — переносимо ту, що вже є,
явними розривами сторінок, щоб Word не додав свою.

Навіщо окремий .docx, якщо є .md: у кадрі має бути справжній Word із
прокруткою й перетягуванням, а не текстовий редактор. Вміст той самий.

Запуск:  python studio/assets/build-2-2.py
"""
import re
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Cm, Pt
from docx.oxml.ns import qn

SRC = Path(__file__).parents[2] / 'apps' / 'web' / 'public' / 'lessons' / '2-2' / 'zvit-3-kvartal.md'
OUT = Path(__file__).parent / 'zvit-3-kvartal.docx'

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

    # Українська, а не «виявлена автоматично» — інакше Word підкреслює
    # червоним половину звіту (стандарт §6: мова документа явно вказується).
    rpr = normal.element.get_or_add_rPr()
    lang = rpr.find(qn('w:lang'))
    if lang is None:
        lang = rpr.makeelement(qn('w:lang'), {})
        rpr.append(lang)
    lang.set(qn('w:val'), 'uk-UA')

    return doc


INLINE = re.compile(r'(\*\*[^*]+\*\*|_[^_]+_)')


def add_runs(p, text):
    """Розбираємо **жирний** і _курсив_ у прогоні. Жодних інших маркерів у файлі немає."""
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


def render_page(doc, lines):
    i = 0
    while i < len(lines):
        line = lines[i].rstrip()

        if not line.strip():
            i += 1
            continue

        if line.startswith('# '):
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            r = p.add_run(line[2:].strip())
            r.bold, r.font.size = True, Pt(16)
            i += 1
            continue

        if line.startswith('## '):
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            r = p.add_run(line[3:].strip())
            r.bold, r.font.size = True, Pt(13)
            i += 1
            continue

        if line.startswith('<div align="center">') and '—' in line:
            # Номер сторінки в підвалі джерела — Word проставить свій, цей рядок пропускаємо.
            i += 1
            continue

        if line == '---':
            i += 1
            continue

        if line.startswith('|'):
            rows = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                row = lines[i].strip()
                cells = [c.strip() for c in row.strip('|').split('|')]
                # Роздільник заголовка — це рядок, де КОЖНА клітинка складається
                # лише з дефісів/двокрапок (`|---|---|`). Попередня перевірка
                # ловила це як єдиний шматок символів між крайніми `|` і не
                # бачила `|` усередині — тому в багатоколонкових таблицях
                # роздільник потрапляв у дані зайвим рядком «---».
                if all(re.fullmatch(r':?-+:?', c) for c in cells):
                    i += 1
                    continue
                rows.append(cells)
                i += 1
            add_table(doc, rows)
            continue

        # Нумерований пункт вигляду «2.1. Текст…» — звичайний абзац, не список.
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        add_runs(p, line)
        i += 1


def build():
    text = SRC.read_text(encoding='utf-8')
    pages = re.split(r'<!--\s*сторінка\s+(\d+)\s*-->', text)
    # re.split з групою дає: [до_першого, '1', контент1, '2', контент2, ...]
    pages = pages[1:]  # відкидаємо шапку-коментар перед першою позначкою

    doc = new_doc()
    for idx in range(0, len(pages), 2):
        num, content = pages[idx], pages[idx + 1]
        if idx > 0:
            doc.add_page_break()
        render_page(doc, content.split('\n'))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc.save(OUT)
    return OUT, len(pages) // 2


if __name__ == '__main__':
    path, n = build()
    print(f'  {path.name}  {n} сторінок (за позначками джерела)  {path.stat().st_size} байт')
