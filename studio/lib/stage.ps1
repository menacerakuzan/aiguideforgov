# Підготовка сцени: у кадрі має бути тільки те, що знімаємо.
#
# Знімаємо з тієї самої машини, на якій працюємо, тому перед дублем усе зайве
# треба прибрати з екрана — редактор із текстом сценарію в кадрі означав би
# переспівувати все наново.
#
#   powershell -File lib/stage.ps1 -Action clear                  — згорнути все
#   powershell -File lib/stage.ps1 -Action front -Match "Word"    — вивести вікно наперед
#   powershell -File lib/stage.ps1 -Action list                   — що зараз відкрито

param(
  [Parameter(Mandatory = $true)][ValidateSet('clear', 'front', 'list', 'paste', 'esc')][string]$Action,
  [string]$Match,
  [int]$TargetPid
)

$ErrorActionPreference = 'Stop'

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, IntPtr pid);
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint a, uint b, bool attach);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, int extra);
}
"@

function Bring-Front([IntPtr]$hwnd) {
  # Windows не дає процесу, який не володіє фокусом, забрати передній план:
  # замість перемикання система лише блимає кнопкою на панелі задач. Саме через
  # це в одному з дублів останній крок знімався поверх браузера — Word був
  # відкритий, але його не було видно.
  #
  # Тому робимо три речі одразу й перевіряємо результат:
  #   1. синтетичне натискання Alt — після нього процес вважається таким,
  #      що отримав ввід, і має право на передній план;
  #   2. приєднання до потоку активного вікна (AttachThreadInput);
  #   3. перевірка GetForegroundWindow і повтор, якщо не вийшло.
  for ($try = 1; $try -le 6; $try++) {
    [Win]::keybd_event(0x12, 0, 0, 0)          # Alt down
    [Win]::keybd_event(0x12, 0, 2, 0)          # Alt up

    [Win]::ShowWindow($hwnd, 3) | Out-Null     # SW_MAXIMIZE

    $fg = [Win]::GetForegroundWindow()
    $tid = [Win]::GetWindowThreadProcessId($fg, [IntPtr]::Zero)
    $me = [Win]::GetCurrentThreadId()
    [Win]::AttachThreadInput($tid, $me, $true) | Out-Null
    [Win]::BringWindowToTop($hwnd) | Out-Null
    [Win]::SetForegroundWindow($hwnd) | Out-Null
    [Win]::AttachThreadInput($tid, $me, $false) | Out-Null

    Start-Sleep -Milliseconds 260
    if ([Win]::GetForegroundWindow() -eq $hwnd) {
      # Гасимо підказки клавіш, які запалив наш же Alt.
      #
      # Синтетичний Alt вище потрібен, щоб Windows дозволила забрати передній
      # план. Але застосунки Office розуміють одиночний Alt по-своєму: Word
      # вмикає режим підказок і малює по всій стрічці букви — F, H, N, G, P,
      # S, M, R, W, Y… Вони лишаються висіти, доки користувач щось не
      # натисне, і в кадрі виглядають як збій інтерфейсу (спіймано на дублі
      # 1.1: підказки простояли чотири секунди поверх стрічки Word).
      #
      # Escape вимикає режим підказок і більше нічого не робить: виділення,
      # курсор і вміст документа лишаються недоторканими.
      [Win]::keybd_event(0x1B, 0, 0, 0)        # Esc down
      [Win]::keybd_event(0x1B, 0, 2, 0)        # Esc up
      Start-Sleep -Milliseconds 120
      return $true
    }
  }
  return $false
}


switch ($Action) {
  'clear' {
    # Той самий Win+D, який робить людина.
    (New-Object -ComObject Shell.Application).MinimizeAll()
    Start-Sleep -Milliseconds 600
    'cleared'
  }

  'front' {
    # PID — точний збіг, для власного Chrome-процесу зйомки (уникає плутанини,
    # коли в системі відкрито ще одне вікно з таким самим заголовком — напр.
    # особистий Chrome користувача теж може мати "Gemini" в заголовку).
    # Підрядок заголовка — для решти (Word тощо), де такої двозначності нема.
    if ($TargetPid -gt 0) {
      $p = Get-Process -Id $TargetPid -ErrorAction SilentlyContinue
      if (-not $p -or $p.MainWindowHandle -eq [IntPtr]::Zero) {
        throw "Вікно не знайдено для PID: $TargetPid"
      }
    } else {
      $p = Get-Process | Where-Object { $_.MainWindowTitle -like "*$Match*" } | Select-Object -First 1
      if (-not $p) { throw "Вікно не знайдено: $Match" }
    }
    if (-not (Bring-Front $p.MainWindowHandle)) {
      throw "Не вдалося вивести вікно наперед: $($p.MainWindowTitle)"
    }
    "front: $($p.MainWindowTitle)"
  }

  'esc' {
    # Word показує біля виділення плаваючу панель форматування, і вона затуляє
    # текст. Escape ховає її, а виділення лишає на місці.
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.SendKeys]::SendWait('{ESC}')
    Start-Sleep -Milliseconds 300
    'esc'
  }

  'paste' {
    # УВАГА: у Chrome це НЕ працює. Перевірено дослідом: звичайні клавіші
    # SendKeys браузер приймає, а поєднання з Ctrl ігнорує — вставки не
    # відбувається, і жодної помилки при цьому немає.
    # Для чату використовуйте page.keyboard.press('Control+V'): браузер
    # обробляє його сам і читає той самий системний буфер.
    # Тут лишається для вікон, які не є браузером.
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.SendKeys]::SendWait('^v')
    Start-Sleep -Milliseconds 400
    'pasted'
  }

  'list' {
    Get-Process | Where-Object { $_.MainWindowTitle } |
      Select-Object ProcessName, MainWindowTitle |
      Format-Table -AutoSize | Out-String
  }
}
