# ПРО.ШІ — навчальна платформа (Next.js).
#
#   sudo cp /opt/proai/aiguideforgov/deploy/nginx/proai.od.gov.ua /etc/nginx/sites-available/proai
#   sudo ln -s /etc/nginx/sites-available/proai /etc/nginx/sites-enabled/proai
#   sudo nginx -t && sudo systemctl reload nginx
#
# Шляхи до сертифіката відрізняються від прикладу в deploy/README.md: там
# стоять letsencrypt-шляхи, а /etc/letsencrypt на цій машині немає взагалі.

server {
    # Див. пояснення про порт 80 у nginx-конфігу ПРОЯВ: зовнішній реверс
    # тримає TLS і ходить сюди по HTTP, редирект дав би петлю.
    listen 80;
    listen 443 ssl;
    # Персональні порти саме для цього домену. Спільні 80/443 їх не
    # скасовують — обидва шляхи працюють одночасно. Потрібні тому, що
    # зовнішній реверс налаштовують під схему "один домен — один порт",
    # без розбору за іменем хоста.
    listen 8082;             # proai:HTTP, TLS тримає зовнішній реверс
    listen 8444 ssl;         # proai: те саме, але по HTTPS
    http2 on;
    server_name proai.od.gov.ua;

    # УВАГА: сертифікат прострочений (діяв до 2026-02-21).
    ssl_certificate     /etc/ssl/certs/odgovua.crt;
    ssl_certificate_key /etc/ssl/private/odgovua.key;

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

        # Критично саме тут: Better Auth за цим заголовком розуміє, що
        # з'єднання захищене. З $scheme на порті 80 він побачив би "http" і
        # відкидав би запити входу — вхід у платформу просто не працював би.
        proxy_set_header X-Forwarded-Proto $real_scheme;

        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
    }
}
