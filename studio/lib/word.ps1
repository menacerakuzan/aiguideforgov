# Word у кадрі: відкрити документ і сказати, де саме на екрані лежить потрібний
# фрагмент тексту.
#
# Навіщо координати. У кадрі людина виділяє три абзаци звернення мишею й тисне
# Ctrl+C. Щоб курсор поїхав рівно від початку першого абзацу до кінця третього,
# треба знати їхні екранні координати — вгадувати їх по скріншоту означає
# переспівувати дубль після кожної зміни документа чи масштабу.
#
# Word уміє відповісти сам: Window.GetPoint повертає прямокутник діапазону в
# пікселях екрана. Ним і користуємось.
#
#   powershell -File lib/word.ps1 -Action open  -Path <документ.docx>
#   powershell -File lib/word.ps1 -Action point -Find "Прошу вжити" -At start
#   powershell -File lib/word.ps1 -Action close

param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('open', 'point', 'span', 'select', 'paste', 'copy', 'close', 'show', 'scroll', 'top', 'highlight', 'highlightAll', 'zoom')]
  [string]$Action,
  [string]$Path,
  [string]$Find,
  [string]$To,
  [string]$Name,
  [int]$Lines = 3,
  [int]$Percent = 130,
  [ValidateSet('start', 'end')][string]$At = 'start'
)

$ErrorActionPreference = 'Stop'

function Get-Word {
  try { return [Runtime.InteropServices.Marshal]::GetActiveObject('Word.Application') }
  catch { return $null }
}

switch ($Action) {
  'open' {
    $word = Get-Word
    if (-not $word) { $word = New-Object -ComObject Word.Application }
    $word.Visible = $true
    $doc = $word.Documents.Open((Resolve-Path $Path).Path)
    # Фіксуємо вигляд: розгорнуте вікно, масштаб 100 %, режим розмітки.
    # Інакше координати з GetPoint поїдуть від дубля до дубля.
    #
    # Розгортати треба саме вікно ДОКУМЕНТА, а не застосунку: другий відкритий
    # документ отримує власне вікно, і воно з'являється невеликим — у кадрі
    # виходив Word, що висить поверх браузера.
    $word.WindowState = 1
    $word.ActiveWindow.WindowState = 1
    $word.ActiveWindow.View.Type = 3
    $word.ActiveWindow.View.Zoom.Percentage = 100

    # Мова документа — українська (1058). Без цього Word вважає текст
    # англійським і підкреслює червоним кожне слово: у кадрі документ виглядає
    # так, ніби в ньому суцільні помилки.
    $doc.Content.LanguageID = 1058
    $doc.ShowSpellingErrors = $false
    $doc.ShowGrammaticalErrors = $false

    $word.Activate()
    "opened $($doc.Name)"
  }

  'point' {
    $word = Get-Word
    if (-not $word) { throw 'Word не запущено.' }
    $range = $word.ActiveDocument.Content
    # Текст передаємо аргументом, а не властивістю Find.Text: через пізнє
    # зв'язування COM властивості цього об'єкта не видно, а виклик працює.
    if (-not $range.Find.Execute($Find)) { throw "Не знайдено: $Find" }
    if ($At -eq 'start') { $range.Collapse(1) } else { $range.Collapse(0) }

    $word.ActiveWindow.ScrollIntoView($range)
    $l = 0; $t = 0; $w = 0; $h = 0
    $word.ActiveWindow.GetPoint([ref]$l, [ref]$t, [ref]$w, [ref]$h, $range)
    # Пікселі екрана — ті самі, що бачить gdigrab.
    "$l $t $w $h"
  }

  'span' {
    # Координати ОБОХ кінців фрагмента за один раз.
    #
    # Окремими викликами не виходить: кожен із них робить ScrollIntoView, і
    # другий зсуває документ так, що перша точка вже не там, де була. Через це
    # перший дубль виділив підпис замість трьох абзаців. Тут прокручуємо один
    # раз — до всього фрагмента цілком — і лише потім міряємо.
    $word = Get-Word
    if (-not $word) { throw 'Word не запущено.' }
    $doc = $word.ActiveDocument

    $a = $doc.Content
    if (-not $a.Find.Execute($Find)) { throw "Не знайдено: $Find" }
    $b = $doc.Content
    if (-not $b.Find.Execute($To)) { throw "Не знайдено: $To" }

    $word.ActiveWindow.ScrollIntoView($doc.Range($a.Start, $b.End))

    # Міряємо ті самі об'єкти, що повернув Find, лише згорнуті в точку:
    # свіжостворений Range через пізнє зв'язування GetPoint не приймає.
    $a.Collapse(1)
    $b.Collapse(0)

    $l1 = 0; $t1 = 0; $w1 = 0; $h1 = 0
    $l2 = 0; $t2 = 0; $w2 = 0; $h2 = 0
    $word.ActiveWindow.GetPoint([ref]$l1, [ref]$t1, [ref]$w1, [ref]$h1, $a)
    $word.ActiveWindow.GetPoint([ref]$l2, [ref]$t2, [ref]$w2, [ref]$h2, $b)
    "$l1 $t1 $w1 $h1 $l2 $t2 $w2 $h2"
  }

  'select' {
    # Та сама ділянка, але виділена командою.
    #
    # Ставимо її одразу після протягування мишею: виділення на екрані те саме,
    # зате зникає плаваюча панелька форматування, яку Word показує після
    # відпускання кнопки й яка затуляє текст у кадрі.
    $word = Get-Word
    if (-not $word) { throw 'Word не запущено.' }
    $doc = $word.ActiveDocument
    $a = $doc.Content
    if (-not $a.Find.Execute($Find)) { throw "Не знайдено: $Find" }
    $b = $doc.Content
    if (-not $b.Find.Execute($To)) { throw "Не знайдено: $To" }
    $doc.Range($a.Start, $b.End).Select()
    'selected'
  }

  'paste' {
    $word = Get-Word
    if (-not $word) { throw 'Word не запущено.' }
    $word.Selection.EndKey(6) | Out-Null   # wdStory: у кінець документа
    $word.Selection.Paste()
    'pasted'
  }

  'show' {
    # Перемкнутись на інший відкритий документ — у кадрі це та сама вкладка Word.
    $word = Get-Word
    if (-not $word) { throw 'Word не запущено.' }
    $doc = $word.Documents | Where-Object { $_.Name -like "*$Name*" } | Select-Object -First 1
    if (-not $doc) { throw "Документ не відкрито: $Name" }
    $doc.Activate()
    $word.WindowState = 1
    $word.ActiveWindow.WindowState = 1
    "shown $($doc.Name)"
  }

  'scroll' {
    # Дрібними кроками: одним стрибком сторінка «телепортується» і глядач
    # губить місце, на яке дивився.
    $word = Get-Word
    if (-not $word) { throw 'Word не запущено.' }
    $word.ActiveWindow.SmallScroll($Lines, 0, 0, 0)
    "scrolled $Lines"
  }

  'top' {
    $word = Get-Word
    if (-not $word) { throw 'Word не запущено.' }
    $word.Selection.HomeKey(6) | Out-Null   # wdStory
    $word.ActiveWindow.ScrollIntoView($word.ActiveDocument.Content.Paragraphs(1).Range)
    'top'
  }

  'zoom' {
    $word = Get-Word
    if (-not $word) { throw 'Word не запущено.' }
    $word.ActiveWindow.View.Zoom.Percentage = $Percent
    "zoom $Percent"
  }

  'highlight' {
    # Маркер по знайденому фрагменту: у кадрі це та сама жовта смуга, якою
    # службовець позначає місця, що треба заповнити руками.
    $word = Get-Word
    if (-not $word) { throw 'Word не запущено.' }
    $range = $word.ActiveDocument.Content
    if (-not $range.Find.Execute($Find)) { throw "Не знайдено: $Find" }
    $range.HighlightColorIndex = 7   # wdYellow
    $word.ActiveWindow.ScrollIntoView($range)
    "highlighted $Find"
  }

  'highlightAll' {
    # Підсвітити ВСІ входження — по одному, з паузою, щоб у кадрі було видно,
    # як позначки спалахують одна за одною.
    #
    # Шукаємо за початком «[ЗАПОВНИТИ», а не за повним текстом позначки:
    # помічник щоразу формулює підказки по-своєму, і зашитий перелік працював
    # би рівно для одного дубля.
    $word = Get-Word
    if (-not $word) { throw 'Word не запущено.' }
    $doc = $word.ActiveDocument
    $count = 0
    foreach ($p in $doc.Paragraphs) {
      $r = $p.Range
      while ($r.Find.Execute($Find)) {
        # Від початку позначки до найближчої закривної дужки.
        $end = $doc.Content.Text.IndexOf(']', $r.Start)
        if ($end -lt 0) { break }
        $mark = $doc.Range($r.Start, $end + 1)
        $mark.HighlightColorIndex = 7   # wdYellow
        if ($count -eq 0) { $word.ActiveWindow.ScrollIntoView($mark) }
        $count++
        $r.SetRange($end + 1, $p.Range.End)
        if ($r.Start -ge $p.Range.End) { break }
      }
    }
    "highlighted $count"
  }

  'copy' {
    # Копіює те, що виділено зараз, — тобто рівно те, що глядач бачив на екрані.
    $word = Get-Word
    if (-not $word) { throw 'Word не запущено.' }
    $word.Selection.Copy()
    'copied'
  }

  'close' {
    $word = Get-Word
    if ($word) { $word.Quit(0) }
    'closed'
  }
}
