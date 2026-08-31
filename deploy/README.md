# Розгортання на сервері

Юніт systemd — [`proai.service`](proai.service). Нижче те, без чого він не
допоможе: три речі з цього списку ламають вхід або контент **мовчки**, без
жодної помилки в логах.

## Що НЕ приїде разом із кодом

`git clone` привезе не все — це навмисно, важке й секретне в git не тримаємо:

| Що | Розмір | Як доставити |
|---|---|---|
| `apps/web/public/media/` — відео й скріншоти уроків | ~153 МБ | `rsync` окремо |
| `prisma/dev.db` — база | — | `migrate:deploy` + `seed`, або скопіювати файл |
| `.env` і `apps/web/.env` | — | створити на сервері з `.env.example` |
| `node_modules/`, `.next/` | — | `pnpm install` + `pnpm build` на сервері |

Якщо забути перший рядок — сайт працюватиме, але **всі відео й скріншоти
зникнуть**, а замість них покажуться заглушки «тут буде відео».

## Три пастки, які ламають тихо

**1. Без HTTPS вхід не працює.** У продакшні `useSecureCookies: true`, тож
сесійна кука отримує прапорець `Secure`, і браузер не надішле її по звичайному
HTTP. Зовні це виглядає так: форма входу приймає пароль, редиректить на кабінет —
і одразу викидає назад на форму. Помилок у логах немає. Тому TLS обовʼязковий,
а застосунок слухає лише `127.0.0.1`.

**2. `NEXT_PUBLIC_*` вшиваються під час збірки, а не читаються в рантаймі.**
`BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPPORT_EMAIL` мусять
мати бойові значення **до** `pnpm build`. Зібрати локально з `localhost:3000`
і скопіювати `.next` на сервер — не спрацює: у бандлі лишиться localhost.

**3. `DATABASE_URL` мусить бути абсолютним.** У розробці там
`file:./dev.db` — шлях відносно `prisma/schema.prisma`. Служба стартує з іншого
робочого каталогу, тож у серверному `.env` пишемо повний шлях:

```
DATABASE_URL="file:/opt/proai/aiguideforgov/prisma/dev.db"
```

## Порядок розгортання

Код лежить у `/opt/proai/aiguideforgov` і належить `dcrilya` — від нього ж
працює служба (так само, як решта застосунків на цій машині). Окремого
системного користувача не заводимо.

```bash
cd /opt/proai/aiguideforgov

# 1. Оточення — ДВА файли, BETTER_AUTH_SECRET в обох мусить збігатися
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
# вписати згенерований секрет, бойовий домен (https!) і абсолютний DATABASE_URL,
# потім продублювати файл — його читає Next під час збірки:
cp .env apps/web/.env
sudo chown root:dcrilya .env apps/web/.env && sudo chmod 640 .env apps/web/.env

# 2. Залежності, база, збірка
corepack pnpm install --frozen-lockfile
corepack pnpm db:generate
corepack pnpm --filter @proai/db migrate:deploy
corepack pnpm db:seed            # ЛИШЕ на порожній базі — стирає все
corepack pnpm build              # мусить пройти ДО першого запуску служби

# 3. Медіа уроків (окремо від git)
rsync -av --progress ./apps/web/public/media/ СЕРВЕР:/opt/proai/aiguideforgov/apps/web/public/media/
corepack pnpm db:sync-content    # підключає відео й скріншоти
corepack pnpm db:sync-library    # перебудовує трофеї бібліотеки

# 4. Служба
sudo cp deploy/proai.service /etc/systemd/system/proai.service
sudo systemctl daemon-reload
sudo systemctl enable --now proai     # enable = підніметься сам після ребуту
sudo systemctl status proai
journalctl -u proai -f
```

> `db:seed` **стирає користувачів і прогрес**. На вже робочій базі оновлюють
> контент через `db:sync-content`, а не через seed.

### Якщо служба не стартує

| Симптом у `systemctl status` | Причина |
|---|---|
| `Failed to set up mount namespacing … .next/cache` | немає збірки — спочатку `pnpm build` |
| `Could not find a production build` | те саме, але збірка була видалена |
| `Некоректне оточення сервера` | `.env` не читається або лишився шаблонний секрет |
| `SQLITE_READONLY` / `unable to open database file` | `DATABASE_URL` відносний або файл поза `ReadWritePaths` |
| `start-limit-hit` | 5 падінь за 5 хв — systemd здався; лікуємо причину, далі `systemctl reset-failed proai` |

## Reverse proxy (nginx)

Служба слухає `127.0.0.1:4573` (не 3000 — на цій машині 3000 може зайняти щось
інше; у `next dev` локально порт лишається 3000). Порт заданий у двох місцях
юніта: прапорцем `--port` і змінною `PORT` — міняти треба обидва.

```nginx
server {
    listen 443 ssl http2;
    server_name proai.od.gov.ua;

    ssl_certificate     /etc/letsencrypt/live/proai.od.gov.ua/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/proai.od.gov.ua/privkey.pem;

    # Відео уроків важать десятки мегабайтів — вимикаємо буферизацію відповіді,
    # інакше nginx збиратиме файл цілком, перш ніж почати віддавати.
    proxy_buffering off;
    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:4573;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        # Обовʼязково: за ним Better Auth розуміє, що зʼєднання захищене,
        # і без нього перевірка origin відкидає запити входу.
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name proai.od.gov.ua;
    return 301 https://$host$request_uri;
}
```

## Оновлення версії

```bash
cd /opt/proai/aiguideforgov
git pull
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @proai/db migrate:deploy
corepack pnpm build
sudo systemctl restart proai
```

## Обмеження цієї конфігурації

- **Один інстанс, не більше.** База — SQLite (один файл, паралельний запис не
  масштабується), а лічильник обмеження частоти Better Auth лежить у памʼяті
  процесу. Другий інстанс отримає власний лічильник, і захист від перебору
  паролів перестане працювати.
- **Резервні копії.** SQLite — це файл: `sqlite3 prisma/dev.db ".backup ..."`
  або зупинити службу й скопіювати. Окремо — `apps/web/public/media/`.
- **Перезапуск обнуляє лічильник перебору паролів** (наслідок того самого
  memory-storage).
