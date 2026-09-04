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
| `.env` (один, у корені) | — | створити на сервері з `.env.example` (там же `ADMIN_EMAIL`/`ADMIN_PASSWORD`) |
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

# 1. Оточення — ОДИН файл у корені
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
# вписати: секрет, бойовий домен (https!), абсолютний DATABASE_URL,
# ADMIN_EMAIL і ADMIN_PASSWORD
sudo chown root:dcrilya .env && sudo chmod 640 .env

# 2. Залежності, база, збірка
corepack pnpm install --frozen-lockfile   # заодно генерує Prisma Client
corepack pnpm --filter @proai/db migrate:deploy
corepack pnpm db:seed            # контент + ЄДИНИЙ адмін із ADMIN_* (стирає все)
corepack pnpm build              # мусить пройти ДО першого запуску служби

# 3. Трофеї бібліотеки — seed їх НЕ створює, лише 8 матеріалів «руками»
corepack pnpm db:sync-library

# 4. Медіа уроків (окремо від git) — запускати з ЛОКАЛЬНОЇ машини
rsync -av --progress ./apps/web/public/media/ СЕРВЕР:/opt/proai/aiguideforgov/apps/web/public/media/

# 5. Служба
sudo cp deploy/proai.service /etc/systemd/system/proai.service
sudo systemctl daemon-reload
sudo systemctl enable --now proai     # enable = підніметься сам після ребуту
sudo systemctl status proai
journalctl -u proai -f
```

> `db:seed` **стирає користувачів і прогрес**. На вже робочій базі оновлюють
> контент через `db:sync-content`, а не через seed.

### Скидання платформи, яка вже працює

Якщо на сервері крутиться стара версія з демо-акаунтами (`@oda.gov.ua`,
пароль із README) — її треба саме **скинути**, а не «дочистити». Демо-слухачі
тягнуть за собою прогрес, спроби тестів і сертифікат, і вибіркове видалення
лишає биті звʼязки.

```bash
sudo systemctl stop proai
cd /opt/proai/aiguideforgov

# бекап на випадок, якщо там уже є щось потрібне
cp prisma/dev.db ~/proai-backup-$(date +%F-%H%M).db

# ADMIN_EMAIL / ADMIN_PASSWORD мусять бути в .env ДО цього кроку
rm -f prisma/dev.db prisma/dev.db-journal prisma/dev.db-wal
corepack pnpm --filter @proai/db migrate:deploy   # створить базу з нуля
corepack pnpm db:seed
corepack pnpm db:sync-library

sudo systemctl start proai
```

Видаляти файл бази безпечніше, ніж покладатись на `deleteMany` у seed: так
гарантовано не лишиться ані старих сесій, ані рядків від міграцій, яких уже
немає в схемі.

**Перевірити, що старого не лишилось:**

```bash
corepack pnpm --filter @proai/db exec node -e "
const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();
p.user.findMany({select:{email:true,role:true}}).then(async u=>{
  console.log('користувачів:',u.length); u.forEach(x=>console.log(' ',x.email,x.role));
  console.log('прогрес:',await p.progress.count(),'сертифікатів:',await p.certificate.count());
  await p.\\$disconnect();})"
```

Має бути рівно один рядок — ваш `ADMIN_EMAIL` з роллю `ADMIN`, прогрес 0,
сертифікатів 0.

**Про порядок кроків 3 і 4.** `db:seed` бере контент із тих самих файлів
`prisma/src/content/`, де медіа-шляхи вже прописані, — тож після свіжого seed
посилання на відео й скріншоти в базі **вже є**, і `db:sync-content` тут не
потрібен (на відміну від оновлення вже робочої бази). А от `db:sync-library`
потрібен обовʼязково: seed створює лише 8 матеріалів, написаних руками, і не
генерує трофеї з блоків уроків — без нього бібліотека буде майже порожня.

Медіафайли можна залити і до, і після seed: база зберігає лише шляхи. Поки
файлів немає, сторінка уроку показуватиме битий `<video>`/`<img>`.

### Якщо служба не стартує

| Симптом у `systemctl status` | Причина |
|---|---|
| `Failed to set up mount namespacing … .next/cache` | немає збірки — спочатку `pnpm build` |
| `Could not find a production build` | те саме, але збірка була видалена |
| `Некоректне оточення сервера` | `.env` не читається або лишився шаблонний секрет |
| `does not provide an export named 'PrismaClient'` | Prisma Client не згенеровано — `corepack pnpm --filter @proai/db generate` |
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

# Бекап ПЕРЕД міграцією. `.backup` знімає узгоджену копію на живій службі —
# просте `cp` під час запису дало б пошкоджений файл.
sqlite3 prisma/dev.db ".backup '$HOME/proai-$(date +%F-%H%M).db'"

corepack pnpm --filter @proai/db migrate:deploy
corepack pnpm db:generate      # див. врізку нижче
corepack pnpm build
sudo systemctl restart proai
```

> **Чому `db:generate` окремим кроком.** `prisma migrate deploy` навмисно не
> запускає генератори — на відміну від `migrate dev`, який робить це сам. Якщо
> схема змінилась, а Prisma Client лишився старим, збірка падає на перевірці
> типів: «Property '…' does not exist on type 'PrismaClient'». Раніше клієнт
> перегенеровувався побічно, у `postinstall` під час `pnpm install`, — тобто
> працювало лише тому, що install був у процедурі. Тепер `pnpm build` тягне
> генерацію сам (`@proai/db#generate` у `turbo.json`), і цей рядок лишається
> тут як страховка для випадку, коли збірку запускають в обхід turbo.

> Бекап тут не формальність. У Prisma **немає зворотних міграцій**, а на SQLite
> зміна таблиці — це фізично `DROP TABLE` зі створенням нової й перенесенням
> даних. Якщо міграція виявиться помилковою, єдиний шлях назад — зупинити
> службу й покласти файл бекапа на місце `prisma/dev.db`.

Якщо змінювався лише контент уроків чи тестів — міграція не потрібна, база
структурно та сама:

```bash
corepack pnpm db:sync-content   # тексти уроків
corepack pnpm db:sync-quiz      # тести модулів і атестація
corepack pnpm db:sync-library   # трофеї бібліотеки
```

## Про пароль адміністратора

`ADMIN_EMAIL` / `ADMIN_PASSWORD` лежать у тому самому `.env`, але **до
веб-процесу не потрапляють**: юніт прибирає їх рядком

```ini
UnsetEnvironment=ADMIN_PASSWORD ADMIN_EMAIL ADMIN_NAME
```

Без нього `EnvironmentFile=` віддав би весь файл процесу застосунку, і пароль
адміністратора був би доступний через `process.env` — а отже, будь-якому
сторонньому коду, який виконається всередині процесу. Застосунку ці змінні не
потрібні: їх читають лише `db:seed` і `db:create-admin`.

Якщо не хочете тримати пароль на диску взагалі — лишіть `ADMIN_PASSWORD`
порожнім: обидва скрипти спитають його з клавіатури (двічі, без показу).

## Обмеження цієї конфігурації

- **Один інстанс, не більше.** База — SQLite (один файл, паралельний запис не
  масштабується), а лічильник обмеження частоти Better Auth лежить у памʼяті
  процесу. Другий інстанс отримає власний лічильник, і захист від перебору
  паролів перестане працювати.
- **Резервні копії.** SQLite — це файл: `sqlite3 prisma/dev.db ".backup ..."`
  або зупинити службу й скопіювати. Окремо — `apps/web/public/media/`.
- **Перезапуск обнуляє лічильник перебору паролів** (наслідок того самого
  memory-storage).
