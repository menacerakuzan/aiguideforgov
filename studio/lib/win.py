"""
Керування Windows для зйомки: миша, клавіатура, вікна, нативні діалоги.

Один довгоживучий процес, протокол — JSON по рядку:

    ->  {"cmd": "glide", "x": 900, "y": 400, "ms": 700}
    <-  {"ok": true}

Чому JSON, а не пробіли, як було в PowerShell-бекенді: шлях
"C:\\Users\\sasha\\OneDrive\\Рабочий стол\\..." містить пробіли, і в
рядковому протоколі його доводилось паковати в base64. Тут він просто
значення поля — нічого екранувати не треба.

Чому Python, а не PowerShell, як було: цей шар — це UI Automation, і
pywinauto робить в один рядок те, на що в PowerShell ішло по сто
(див. lib/explorer.ps1 — воно лишилось як приклад того, від чого пішли).
Плюс зникає цілий клас чужих проблем: BOM у файлі скрипта, `-Command -`
проти `-File`, `$pid` тільки для читання, забитий буфер stderr.

ГОЛОВНЕ ПРО ЗЙОМКУ. У pywinauto два режими дії, і нам потрібні обидва:

  * `*_input()` — справжній курсор і справжні клавіші. Видно в кадрі.
    Саме цим знімаємо кожен крок, який має побачити глядач.
  * прямі повідомлення вікну (`set_text`, `click`) — миттєво й непомітно.
    Тільки для підготовки поза кадром.

Текст у полях вводимо `set_text`, а не клавішами, скрізь, де його не
знімаємо: SendKeys одразу після зміни фокуса губить перші символи
(перевірено — "C:\\Users\\..." приходило як ":\\Users\\...").

    python lib/win.py serve      — цикл команд (так його запускає Node)
    python lib/win.py windows    — разово: список вікон, для перевірки сцени
"""
import ctypes
import json
import random
import sys
import time

user32 = ctypes.windll.user32
user32.SetProcessDPIAware()
user32.FindWindowW.argtypes = [ctypes.c_wchar_p, ctypes.c_wchar_p]
user32.FindWindowW.restype = ctypes.c_void_p

# Коли stdout — канал, а не консоль, Python бере системне кодування (тут
# cp1251), і кирилиця в заголовках вікон та в текстах помилок приїжджає в
# Node побитою. Просимо UTF-8 явно з обох боків.
sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")
sys.stdin.reconfigure(encoding="utf-8")

MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004

# pywinauto тягне за собою comtypes і будує кеш — це секунда-дві на імпорт.
# Платимо її лише тоді, коли справді дійшло до роботи з вікнами, щоб дублі,
# де потрібна сама миша, стартували миттєво.
_uia = None


def _desktop():
    global _uia
    if _uia is None:
        from pywinauto import Desktop
        _uia = Desktop(backend="uia")
    return _uia


# ── миша ──────────────────────────────────────────────────────────────────

_at = {"x": 0, "y": 0}


def _move(x, y):
    user32.SetCursorPos(int(x), int(y))
    _at["x"], _at["y"] = x, y


def cmd_jump(x, y):
    _move(x, y)


def cmd_glide(x, y, ms=700):
    """
    Довести курсор до точки за час `ms`, зі сповільненням наприкінці.

    Інтерполяція тут, а не в Node: інакше на кожен крок у 16 мс іде окремий
    обмін через канал — сорок із гаком за один рух. Курсор від цього смикався.
    """
    fx, fy = _at["x"], _at["y"]
    steps = max(8, round(ms / 16))
    for i in range(1, steps + 1):
        t = i / steps
        e = 1 - (1 - t) ** 3
        _move(round(fx + (x - fx) * e), round(fy + (y - fy) * e))
        time.sleep(0.016)
    _move(x, y)


def cmd_down():
    user32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)


def cmd_up():
    user32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)


def cmd_click():
    cmd_down()
    time.sleep(0.08)
    cmd_up()


def cmd_doubleclick():
    cmd_click()
    time.sleep(0.09)  # менше за системний поріг подвійного кліку
    cmd_click()


def cmd_drag(x, y, ms=1400):
    cmd_down()
    time.sleep(0.22)
    cmd_glide(x, y, ms)
    time.sleep(0.32)
    cmd_up()


# ── клавіатура ────────────────────────────────────────────────────────────


# pywinauto успадкував синтаксис класичного VBA SendKeys: ці символи
# самі по собі — керівні (групування, модифікатори), а не літери для друку.
# Без екранування текст на кшталт "ОРИГІНАЛ (нейтрально)" ламається з
# KeySequenceError: send_keys бачить "(" і чекає закривний керівний код,
# а не звичайну дужку. Щоб надрукувати символ буквально, його самого
# загортають у фігурні дужки — так само, як екранували в SendKeys.
_SPECIAL = set('+^%~(){}[]')


def cmd_type(text, cps=14):
    """Друк у кадрі — по символу, людським темпом."""
    from pywinauto.keyboard import send_keys
    delay = 1.0 / cps
    for ch in text:
        literal = '{' + ch + '}' if ch in _SPECIAL else ch
        send_keys(literal, with_spaces=True, with_newlines=True, pause=0)
        time.sleep(delay + random.random() * delay * 0.4)


def cmd_key(name):
    from pywinauto.keyboard import send_keys
    send_keys(name, pause=0)


# ── сполучення з Ctrl/Alt/Shift ───────────────────────────────────────────

KEYEVENTF_KEYUP = 0x0002

_VK = {
    "ctrl": 0x11, "alt": 0x12, "shift": 0x10,
    "enter": 0x0D, "esc": 0x1B, "tab": 0x09, "space": 0x20,
    "home": 0x24, "end": 0x23, "pgup": 0x21, "pgdn": 0x22,
    "left": 0x25, "up": 0x26, "right": 0x27, "down": 0x28,
    "f3": 0x72,
}
# Латинські літери й цифри мають сталі віртуальні коди: 'A' = 0x41, '0' = 0x30.
_VK.update({c: 0x41 + i for i, c in enumerate("abcdefghijklmnopqrstuvwxyz")})
_VK.update({c: 0x30 + i for i, c in enumerate("0123456789")})


def cmd_hotkey(keys):
    """Сполучення клавіш ПО ВІРТУАЛЬНОМУ КОДУ, а не по символу.

    Навіщо окрема команда, коли є `key`. `send_keys('^f')` питає в поточної
    розкладки, якою клавішею набирається літера «f». Якщо активна українська
    чи російська розкладка, латинської «f» у ній немає — і натискання не
    йде взагалі. Мовчки: помилки немає, просто нічого не відбувається.

    Саме на цьому впала проба пошуку в PDF (2026-09-04): у трей була
    ввімкнена РУС, `Ctrl+F` не дійшов до переглядача, і замість підсвіченої
    цифри в кадрі лишилась перша сторінка. Так само тихо могли не спрацювати
    `Ctrl+A` і `Ctrl+End` у сценаріях, які їх використовують.

    Тут розкладка ні до чого: 0x46 — це фізична клавіша «F» незалежно від
    того, яку літеру вона зараз друкує.

        {"cmd": "hotkey", "keys": "ctrl+f"}
    """
    parts = [k.strip().lower() for k in keys.split("+") if k.strip()]
    codes = []
    for part in parts:
        if part not in _VK:
            raise ValueError(f"невідома клавіша: {part}")
        codes.append(_VK[part])

    for code in codes:
        user32.keybd_event(code, 0, 0, 0)
        time.sleep(0.02)
    for code in reversed(codes):
        user32.keybd_event(code, 0, KEYEVENTF_KEYUP, 0)
        time.sleep(0.02)


# ── вікна ─────────────────────────────────────────────────────────────────


def cmd_windows():
    """Що зараз відкрито — щоб перед дублем звірити сцену."""
    out = []
    for w in _desktop().windows():
        try:
            if w.window_text():
                out.append({
                    "title": w.window_text(),
                    "class": w.class_name(),
                    "handle": w.handle,
                })
        except Exception:
            pass
    return {"windows": out}


def cmd_clear():
    """Згорнути все — той самий Win+D, що робить людина."""
    import win32com.client
    win32com.client.Dispatch("Shell.Application").MinimizeAll()
    time.sleep(0.6)


def _find_window(match=None, class_name=None, title=None, timeout=6.0):
    """
    Знайти вікно за підрядком заголовка або за класом.

    Нативний діалог «Відкрити» шукаємо інакше, ніж решту вікон: pywinauto
    `Desktop().windows()` його просто не перелічує (перевірено дослідом —
    порожньо, хоча діалог видно на екрані), тоді як сирий Win32 `FindWindow`
    знаходить надійно. Причина — дочірнє вікно chrome.exe без власного
    запису в списку процесів, і UIA-перелік топрівневих вікон його,
    вочевидь, відфільтровує інакше, ніж робить це для звичайних застосунків.
    """
    if class_name:
        deadline = time.time() + timeout
        while time.time() < deadline:
            hwnd = user32.FindWindowW(class_name, title)
            if hwnd:
                return _desktop().window(handle=hwnd)
            time.sleep(0.15)
        raise RuntimeError(
            f"Вікно не знайдено за {timeout} с (class={class_name!r}, title={title!r})."
        )

    deadline = time.time() + timeout
    while time.time() < deadline:
        for w in _desktop().windows():
            try:
                text = w.window_text()
                if title is not None and title.lower() not in text.lower():
                    continue
                if match is not None and match.lower() not in text.lower():
                    continue
                if title is not None or match is not None:
                    return w
            except Exception:
                continue
        time.sleep(0.15)
    raise RuntimeError(
        f"Вікно не знайдено за {timeout} с (match={match!r}, title={title!r})."
    )


def cmd_front(match=None, class_name=None, title=None, timeout=6.0):
    """
    Вивести вікно наперед.

    Windows не дає процесу без фокуса забирати передній план — замість
    перемикання система лише блимає кнопкою на панелі задач. У pywinauto
    цей обхід (синтетичний Alt + AttachThreadInput + перевірка) уже
    всередині `set_focus()`; раніше ми писали його руками.
    """
    w = _find_window(match, class_name, title, timeout)
    w.set_focus()
    time.sleep(0.4)
    return {"title": w.window_text(), "handle": w.handle}


# ── нативний діалог «Відкрити» ────────────────────────────────────────────


def cmd_dialog_find(name, timeout=6.0):
    """
    Координати центру елемента діалогу «Відкрити» (пошук за підрядком імені).

    Точний збіг тут не годиться: ім'я файлу буває з розширенням і без —
    залежно від налаштувань провідника, — а пункт «Швидкого доступу» треба
    впізнати серед сотень елементів дерева.
    """
    dlg = _find_window(class_name="#32770", title="Open", timeout=timeout)
    deadline = time.time() + timeout
    needle = name.lower()
    while time.time() < deadline:
        for el in dlg.descendants():
            try:
                if needle in (el.window_text() or "").lower():
                    try:
                        el.scroll_into_view()
                        time.sleep(0.2)
                    except Exception:
                        pass  # не в списку — прокручувати нічого
                    r = el.rectangle()
                    return {
                        "x": (r.left + r.right) // 2,
                        "y": (r.top + r.bottom) // 2,
                        "name": el.window_text(),
                    }
            except Exception:
                continue
        time.sleep(0.2)
    raise RuntimeError(f"Елемент {name!r} не знайдено в діалозі «Відкрити».")


def cmd_dialog_close(timeout=2.0):
    """Прибрати діалог, якщо лишився відкритим.

    Забутий модальний діалог з'їдає ВСІ наступні кліки: вони йдуть йому, а
    не сторінці, і виглядає це так, ніби перестали працювати кнопки на
    сайті. Один раз це коштувало довгих пошуків неіснуючого бага.
    """
    try:
        dlg = _find_window(class_name="#32770", title="Open", timeout=timeout)
    except RuntimeError:
        return {"closed": False}
    dlg.close()
    return {"closed": True}


# ── цикл ──────────────────────────────────────────────────────────────────

HANDLERS = {
    "jump": cmd_jump, "glide": cmd_glide, "down": cmd_down, "up": cmd_up,
    "click": cmd_click, "doubleclick": cmd_doubleclick, "drag": cmd_drag,
    "type": cmd_type, "key": cmd_key, "hotkey": cmd_hotkey,
    "windows": cmd_windows, "clear": cmd_clear, "front": cmd_front,
    "dialog_find": cmd_dialog_find, "dialog_close": cmd_dialog_close,
}


def serve():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            msg = json.loads(line)
        except ValueError as e:
            print(json.dumps({"ok": False, "error": f"поганий JSON: {e}"}), flush=True)
            continue

        cmd = msg.pop("cmd", None)
        if cmd == "bye":
            return
        handler = HANDLERS.get(cmd)
        if handler is None:
            print(json.dumps({"ok": False, "error": f"невідома команда: {cmd}"}), flush=True)
            continue
        try:
            # Помилка однієї команди не має роняти процес: дубль триває
            # хвилини, і втратити його через дрібницю — найдорожче, що тут
            # може статись.
            result = handler(**msg) or {}
            print(json.dumps({"ok": True, **result}), flush=True)
        except Exception as e:
            print(json.dumps({"ok": False, "error": f"{type(e).__name__}: {e}"}), flush=True)


if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else "serve"
    if action == "serve":
        serve()
    else:
        handler = HANDLERS.get(action)
        if handler is None:
            print(f"невідома команда: {action}", file=sys.stderr)
            sys.exit(1)
        print(json.dumps(handler() or {}, ensure_ascii=False, indent=2))
