# Google-вход, PIN и серверное сохранение KiraQuest

Интеграция использует Better Auth и PostgreSQL. Вход создаёт серверный аккаунт по паре `providerId=google` + `accountId` (Google `sub`). Совпадение email не объединяет аккаунты. Google проверяет личность, а отдельный PIN разблокирует KiraQuest на конкретном устройстве при действующей серверной сессии.

**Рабочий вход нельзя считать подтверждённым до прохождения настоящего Google OAuth.** Для сайта выбран домен `kiraquest.kz`, но он ещё не зарегистрирован. Текущий `http://18.192.104.63` не подходит для production Google OAuth: необходимы домен и HTTPS. На текущем EC2 подготовлен PostgreSQL; новых платных ресурсов при этом не создавалось.

## 1. База данных

Подходит обычный PostgreSQL 16/17 с UTF-8. Можно использовать уже имеющуюся базу или PostgreSQL на существующем EC2. Последний вариант не требует покупки управляемой базы, но владелец отвечает за резервные копии и восстановление. Отдельная управляемая PostgreSQL — альтернатива, когда требуется независимый жизненный цикл базы; её стоимость нужно согласовать до создания.

Для локальной разработки при установленном Docker:

```sh
docker run --name kiraquest-postgres \
  --env-file .env.postgres.local \
  -p 127.0.0.1:5432:5432 \
  -v kiraquest-postgres-data:/var/lib/postgresql/data \
  -d postgres:17
```

Создайте `.env.postgres.local` локально (он уже исключён из Git шаблоном `.env*`):

```dotenv
POSTGRES_USER=kiraquest
POSTGRES_DB=kiraquest
POSTGRES_PASSWORD=replace-with-a-long-random-database-password
```

Не публикуйте порт 5432 в интернет. На EC2 привяжите его к loopback, а каталог данных или Docker volume храните вне каталога checkout/релиза. Для внешней базы используйте TLS с проверкой сертификата, например `sslmode=verify-full` и доверенный CA, согласно документации провайдера. Не используйте `rejectUnauthorized: false`.

Скопируйте `.env.example` в `.env.local`, заполните значения на своём компьютере. Для URL-пароля экранируйте специальные символы как URL encoding. Секреты не присылайте в чат.

Используйте поддерживаемый Node.js 22 LTS. Установите зависимости командой `npm ci`; миграционный загрузчик `tsx` находится в devDependencies, поэтому перед миграцией не используйте `npm ci --omit=dev`. После заполнения переменных:

```sh
npm run db:migrate
```

Миграция создаёт таблицы Better Auth и применяет SQL из `src/server/migrations`. Повторный запуск не обнуляет аккаунты. Приложение само не мигрирует базу при первом HTTP-запросе. Перед production-миграцией делайте резервную копию PostgreSQL и проверяйте восстановление.

Для резервной копии используйте `pg_dump -Fc -f /secure/backups/kiraquest.dump kiraquest` от системного пользователя с доступом к базе. Файл содержит личные данные: ограничьте доступ, храните зашифрованную копию вне EC2 и регулярно проверяйте восстановление командой `pg_restore` в отдельную тестовую базу. Способ подключения и права зависят от настройки PostgreSQL; не вставляйте пароль в команду или историю оболочки. Настройку расписания, срок хранения и доступ к копиям владелец должен определить отдельно — автоматическое резервирование здесь не настроено.

## Текущие ограничения

Публичная таблица лидеров, подтверждённые сервером события XP, роли и панель владельца ещё не реализованы. Прогресс синхронизируется из браузера и не является защищённым от произвольной подмены результатом соревнования. Не используйте эти данные для рейтинга или привилегий. Назначение владельца пока не предусмотрено. До публичного запуска также нужны проверенные владельцем политика конфиденциальности, контакт поддержки и процедура удаления аккаунта.

## 2. Адрес и HTTPS

Зарегистрируйте `kiraquest.kz` и в панели DNS регистратора направьте A-запись корня (`@`) на текущий публичный IP `18.192.104.63`. Домен и DNS могут оплачиваться отдельно. У сервера нет Elastic IP: после остановки и нового запуска EC2 адрес может измениться, и A-запись придётся обновить. Elastic IP автоматически не создаётся.

Установите действующий TLS-сертификат для выбранного имени (например, через ACME). Настройте nginx на 443 и перенаправление 80 → HTTPS. Приложение по-прежнему слушает только `127.0.0.1:3000`. Пример **после** получения сертификата:

```nginx
server {
    listen 80;
    server_name kiraquest.kz;
    return 301 https://kiraquest.kz$request_uri;
}

server {
    listen 443 ssl;
    server_name kiraquest.kz;
    ssl_certificate /etc/letsencrypt/live/kiraquest.kz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kiraquest.kz/privkey.pem;

    # OAuth callback содержит одноразовый authorization code в query string.
    # Не записывайте его в access/error/analytics logs.
    location ^~ /api/auth/ {
        access_log off;
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Удалите конфликтующий старый default server из конфигурации. Проверьте `nginx -t` перед reload. Nginx должен **перезаписывать** `X-Real-IP`, чтобы rate limit не доверял IP из клиентского заголовка. Не добавляйте logging request body: PIN передаётся в JSON тела HTTPS-запроса. Рекомендуется отключить сбор URL и тела запросов auth/PIN в APM и аналитике.

## 3. Google Cloud Console

1. Откройте [Google Cloud Console](https://console.cloud.google.com/), выберите или создайте проект. Добавлять Gmail API, Contacts API и Google Drive API не требуется.
2. Откройте **Google Auth Platform** → **Branding**. Укажите имя KiraQuest, контакт поддержки, контакты разработчика, основной домен. Для публикации добавьте доступные страницы приложения и политики конфиденциальности, если их запрашивает Console.
3. В **Audience** выберите External, если пользоваться приложением будут обычные Google-аккаунты. На стадии Testing добавьте email тестирующих пользователей. Это список доступа в Google, а не список логинов в KiraQuest.
4. В **Data Access** оставьте только `openid`, `email`, `profile`. Не добавляйте Gmail, Drive, Contacts и offline доступ.
5. В **Clients** выберите **Create client** → **Web application**. В старом интерфейсе тот же путь: APIs & Services → Credentials → Create Credentials → OAuth client ID.
6. **Authorized JavaScript origins:** `https://kiraquest.kz`.
7. **Authorized redirect URIs:** `https://kiraquest.kz/api/auth/callback/google`.
8. Для отдельного локального клиента добавьте origin `https://localhost:3000` и redirect URI `https://localhost:3000/api/auth/callback/google`. Не смешивайте локальные секреты и production-клиент без необходимости.
9. Сохраните Client ID и Client Secret сразу после создания в серверные переменные окружения. Не сохраняйте JSON credentials в репозиторий и не отправляйте секрет в чат.

Переменные для production:

```dotenv
DATABASE_URL=postgresql://kiraquest:YOUR_URL_ENCODED_PASSWORD@127.0.0.1:5432/kiraquest
BETTER_AUTH_URL=https://kiraquest.kz
BETTER_AUTH_SECRET=YOUR_RANDOM_SECRET_AT_LEAST_32_CHARACTERS
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET
```

Сгенерировать секрет локально можно `openssl rand -base64 48`. Это серверные значения, без префикса `NEXT_PUBLIC_`. `.env.example` содержит только примеры. Секрет Better Auth также защищает OAuth cookies и шифрует сохранённые токены провайдера; не меняйте его произвольно на каждом деплое.

## 4. Production systemd и CI/CD

Сохраните env вне checkout, например `/etc/kiraquest/kiraquest.env`, с правами `600`. Файл должен читать только администратор/пользователь, которому systemd разрешает запуск службы. Не печатайте его командой `cat` в CI. В override службы `kiraquest` добавьте:

```ini
[Service]
EnvironmentFile=/etc/kiraquest/kiraquest.env
```

На текущем EC2 systemd читает закрытый файл окружения и запускает миграцию до старта приложения. Миграция использует тот же файл и прекращает запуск при ошибке; для построения схемы реальные данные Google не нужны. До настройки HTTPS и настоящих OAuth-данных вход остаётся выключен. Существующий GitHub → SSM workflow не содержит секретов.

После регистрации домена и включения HTTPS владелец может открыть защищённую сессию AWS Systems Manager Session Manager на EC2 и выполнить `sudoedit /etc/kiraquest/kiraquest.env`. Добавьте строки `GOOGLE_CLIENT_ID=...` и `GOOGLE_CLIENT_SECRET=...` из Google Cloud Console непосредственно в редакторе; не вставляйте секрет в команды, GitHub или чат. Сохраните уже созданные `DATABASE_URL`, `BETTER_AUTH_SECRET` и `KIRAQUEST_PIN_PEPPER` без изменений. Не отправляйте содержимое файла. Затем выполните `sudo systemctl restart kiraquest` и проверьте `sudo systemctl is-active kiraquest`. Не включайте OAuth до работающего HTTPS.

Не помещайте реальные OAuth/DB секреты в YAML workflow, GitHub Actions output или SSM command text. GitHub OIDC/роль деплоя не заменяет Google OAuth-клиент.

## 5. Локальный HTTPS и проверка

Для локального браузера нужен доверенный сертификат (например, созданный локальным `mkcert`). Затем:

```sh
npm run dev -- --experimental-https
```

Для постоянного локального сертификата Next также поддерживает `--experimental-https-key` и `--experimental-https-cert`. Приложение принудительно использует Secure cookies. Работа сессии по обычному HTTP не является поддерживаемым обходным режимом.

Проверяйте настоящими тестовыми Google-аккаунтами после настройки:

- первый вход и повторный вход; имя, email и аватар;
- отмена Google и повторная попытка после ошибки;
- PIN: создание с повтором, неверные попытки/блокировка, unlock, смена и отключение;
- «Забыл PIN»: повторный Google OAuth того же аккаунта; другой Google-аккаунт не должен сбрасывать исходный PIN;
- блокировка должна возвращать 423 из приватных API, а истёкшая/удалённая сессия — 401;
- гостевой импорт, повторный импорт без новых наград и без удаления имеющихся уроков;
- два разных аккаунта в одном браузере, logout, второе устройство;
- все стили, обе темы, клавиатура, узкий экран и увеличение текста.

Программные проверки с синтетическими сессиями и тестовой базой не подтверждают реальную конфигурацию Google Console, TLS/DNS или успешный вход человека. Фактически выполненные проверки перечисляются в отчёте, оставшиеся — отдельно.

Официальные источники: [Better Auth / Google](https://better-auth.com/docs/authentication/google), [Better Auth / database migrations](https://better-auth.com/docs/concepts/database), [Better Auth / cookies](https://better-auth.com/docs/concepts/cookies), [правила Google для redirect URI](https://developers.google.com/identity/protocols/oauth2/web-server#uri-validation).
