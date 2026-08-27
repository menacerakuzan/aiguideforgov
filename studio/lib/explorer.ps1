# Провідник для перетягування файлу в кадр.
#
# Навіщо окремий файл, а не команда в stage.ps1: тут потрібна UI Automation
# (System.Windows.Automation) — важча збірка, яку решті команд тягнути не
# треба.
#
#   powershell -File lib/explorer.ps1 -Action open  -Path "C:\...\zvit.docx"
#   powershell -File lib/explorer.ps1 -Action place -Path "C:\...\zvit.docx" -X 40 -Y 620 -W 480 -H 340
#   powershell -File lib/explorer.ps1 -Action rect  -Path "C:\...\zvit.docx"
#     -> "x y w h" фізичних пікселів — прямокутник іконки файлу
#   powershell -File lib/explorer.ps1 -Action close -Path "C:\...\zvit.docx"

param(
  [Parameter(Mandatory = $true)][ValidateSet('open', 'place', 'rect', 'close')][string]$Action,
  [Parameter(Mandatory = $true)][string]$Path,
  [int]$X, [int]$Y, [int]$W, [int]$H
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class ExplWin {
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr h, int x, int y, int w, int hgt, bool repaint);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, IntPtr pid);
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint a, uint b, bool attach);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, int extra);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h, uint msg, IntPtr wParam, IntPtr lParam);
}
"@
[ExplWin]::SetProcessDPIAware() | Out-Null

$full = (Resolve-Path $Path).Path
$stem = [System.IO.Path]::GetFileNameWithoutExtension($full)

<#
  Знаходимо ВІКНО провідника, у якому справді видно наш файл — не перше
  CabinetWClass, яке трапиться, а те, де в списку є елемент з таким іменем.
  Так само повертаємо і сам елемент: rect повторно шукати не треба.
#>
function Find-ExplorerItem {
  $root = [System.Windows.Automation.AutomationElement]::RootElement
  $condWin = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ClassNameProperty, 'CabinetWClass')
  $windows = $root.FindAll([System.Windows.Automation.TreeScope]::Children, $condWin)

  foreach ($w in $windows) {
    $condList = New-Object System.Windows.Automation.PropertyCondition(
      [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
      [System.Windows.Automation.ControlType]::List)
    $lists = $w.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condList)
    foreach ($list in $lists) {
      $condItem = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
        [System.Windows.Automation.ControlType]::ListItem)
      $items = $list.FindAll([System.Windows.Automation.TreeScope]::Children, $condItem)
      foreach ($it in $items) {
        # Ім'я елемента буває і з розширенням, і без — залежно від
        # налаштувань провідника, тому звіряємо з основою імені файлу.
        if ($it.Current.Name -like "$stem*") {
          return [pscustomobject]@{ Window = $w; Item = $it }
        }
      }
    }
  }
  return $null
}

switch ($Action) {
  'open' {
    # /select, підсвічує файл одразу — не треба гортати теку в кадрі.
    Start-Process explorer.exe "/select,`"$full`""
    'opened'
  }

  'place' {
    Start-Sleep -Milliseconds 900
    $found = Find-ExplorerItem
    if (-not $found) { throw "Вікно провідника з файлом '$stem' не знайдено." }
    $hwnd = [IntPtr]$found.Window.Current.NativeWindowHandle

    # SW_SHOWNORMAL (1): якщо вікно було максимізоване з минулого разу,
    # MoveWindow на максимізованому вікні розмір ігнорує.
    [ExplWin]::ShowWindow($hwnd, 1) | Out-Null
    [ExplWin]::MoveWindow($hwnd, $X, $Y, $W, $H, $true) | Out-Null

    # Той самий обхід «Windows не дає забрати фокус», що і в stage.ps1.
    [ExplWin]::keybd_event(0x12, 0, 0, 0)
    [ExplWin]::keybd_event(0x12, 0, 2, 0)
    $fg = [ExplWin]::GetForegroundWindow()
    $tid = [ExplWin]::GetWindowThreadProcessId($fg, [IntPtr]::Zero)
    $me = [ExplWin]::GetCurrentThreadId()
    [ExplWin]::AttachThreadInput($tid, $me, $true) | Out-Null
    [ExplWin]::SetForegroundWindow($hwnd) | Out-Null
    [ExplWin]::AttachThreadInput($tid, $me, $false) | Out-Null
    Start-Sleep -Milliseconds 300

    # Стрічка з'їдає половину невеликого вікна — згортаємо. Великі значки:
    # у кадрі впізнавана іконка файлу, а не рядок дрібного тексту.
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.SendKeys]::SendWait('^{F1}')
    Start-Sleep -Milliseconds 200
    [System.Windows.Forms.SendKeys]::SendWait('^+2')
    Start-Sleep -Milliseconds 300

    'placed'
  }

  'rect' {
    $found = Find-ExplorerItem
    if (-not $found) { throw "Іконку файлу '$stem' не знайдено у відкритому вікні провідника." }

    # Файл може бути прокручений за межі видимої частини списку — тоді
    # BoundingRectangle повертає нуль-висоту чи координати поза вікном.
    # ScrollItemPattern підводить список до елемента; після прокрутки
    # virtualized ListView перебудовує елементи, тому питаємо ще раз.
    $scrollPattern = $null
    if ($found.Item.TryGetCurrentPattern([System.Windows.Automation.ScrollItemPattern]::Pattern, [ref]$scrollPattern)) {
      $scrollPattern.ScrollIntoView()
      Start-Sleep -Milliseconds 300
      $found = Find-ExplorerItem
      if (-not $found) { throw "Файл '$stem' зник із списку після прокрутки." }
    }

    $r = $found.Item.Current.BoundingRectangle
    "$([int]$r.X) $([int]$r.Y) $([int]$r.Width) $([int]$r.Height)"
  }

  'close' {
    $found = Find-ExplorerItem
    if ($found) {
      # WM_CLOSE — акуратніше за вбивство процесу: провідник сам вирішує, що
      # закривати, а не гасить усі відкриті вікна разом.
      [ExplWin]::PostMessage([IntPtr]$found.Window.Current.NativeWindowHandle, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null
    }
    'closed'
  }
}
