# Cloudflare Workers для интеграции app Dataset

## Структура проекта

```
is/cloudflare/edge-api/
├── src/
│   ├── index.js          # Главный роутер для всех endpoints
│   ├── auth.js           # OAuth endpoints (/auth/google, /auth/callback)
│   ├── portfolios.js     # Portfolios API (/api/portfolios/*)
│   ├── datasets.js       # Datasets API (/api/datasets/*)
│   └── utils/
│       ├── cors.js       # CORS утилиты
│       ├── auth.js       # Проверка авторизации (JWT)
│       ├── d1-helpers.js # Хелперы для работы с D1
│       └── r2-helpers.js # Хелперы для работы с R2
├── deployments/          # Стабильные версии деплоев (с датировкой)
│   ├── YYYY-MM-DD-src/   # Архив исходного кода рабочей версии
│   ├── YYYY-MM-DD-wrangler.toml
│   └── YYYY-MM-DD-README.md
├── wrangler.toml         # Конфигурация Workers
└── README.md             # Этот файл
```

## Настройка

### 1. Установка Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Авторизация

**Вариант 1: Wrangler Login (рекомендуется для разработки)**
```bash
wrangler login
```

**Вариант 2: Использование API Token**
```bash
export CLOUDFLARE_API_TOKEN="your-api-token"
```

### 3. Конфигурация

Файл `wrangler.toml` содержит:
- Настройки Worker (name, main, compatibility_date)
- Привязки к D1 базе данных
- Привязки к R2 bucket
- Переменные окружения

### 4. Secrets

Добавление secrets через Wrangler CLI:
```bash
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put JWT_SECRET
```

## Деплой

```bash
cd is/cloudflare/edge-api
wrangler deploy
```

## Endpoints

### OAuth
- `GET /auth/google` — редирект на Google OAuth
- `GET /auth/callback` — обработка callback от Google
- `GET /auth/me` — получение текущего пользователя

### Portfolios API
- `GET /api/portfolios` — список портфелей пользователя
- `GET /api/portfolios/:id` — получение портфеля
- `POST /api/portfolios` — создание портфеля
- `PUT /api/portfolios/:id` — обновление портфеля
- `DELETE /api/portfolios/:id` — удаление портфеля

### Datasets API
- `GET /api/datasets/time-series/:coin/:date` — получение временных рядов
- `POST /api/datasets/time-series` — сохранение временных рядов (batch)
- `GET /api/datasets/metrics/:coin/:date` — получение метрик
- `POST /api/datasets/metrics` — сохранение метрик (batch)

## Разработка

### Локальный запуск
```bash
cd is/cloudflare/edge-api
wrangler dev
```

### Применение SQL схемы
```bash
cd is/cloudflare/edge-api
wrangler d1 execute app-database --file=./schema.sql
```

Или через Cloudflare Dashboard:
1. Перейти в Cloudflare Dashboard → Storage & databases → D1
2. Выбрать базу данных `app-database`
3. Перейти в раздел "Execute SQL"
4. Скопировать содержимое `is/cloudflare/edge-api/schema.sql` и выполнить

### Просмотр логов
```bash
wrangler tail
```

### Деплой Worker
```bash
cd is/cloudflare/edge-api
wrangler deploy
```

## Стабильные версии

Стабильные версии воркеров сохраняются в папке `deployments/` с датировкой в имени файлов **только по явной команде пользователя**.

**Формат:** `YYYY-MM-DD-src/`, `YYYY-MM-DD-wrangler.toml`, `YYYY-MM-DD-README.md`

**Восстановление версии:**
```bash
# Скопировать файлы обратно
cp -r deployments/YYYY-MM-DD-src src
cp deployments/YYYY-MM-DD-wrangler.toml wrangler.toml

# Задеплоить
wrangler deploy
```

**Документация:** Каждая версия содержит README.md с описанием функциональности, Version ID, датой деплоя и инструкциями по восстановлению.

## Структура проекта

```
is/cloudflare/edge-api/
├── src/
│   ├── index.js          # Главный роутер
│   ├── auth.js           # OAuth endpoints
│   ├── portfolios.js     # Portfolios API
│   ├── datasets.js       # Datasets API (заглушки, R2 отложен)
│   └── utils/
│       ├── cors.js       # CORS утилиты
│       ├── auth.js       # JWT проверка и создание токенов
│       └── d1-helpers.js # Хелперы для работы с D1
├── deployments/          # Стабильные версии деплоев (с датировкой)
│   ├── YYYY-MM-DD-src/   # Архив исходного кода рабочей версии
│   ├── YYYY-MM-DD-wrangler.toml
│   └── YYYY-MM-DD-README.md
├── migrations/
│   └── 001_initial_schema.sql  # SQL миграция
├── schema.sql            # SQL схема базы данных
├── wrangler.toml         # Конфигурация Workers
└── README.md             # Этот файл
```

## Структура данных

### D1 Database Schema

Таблицы:
- `users` — пользователи (google_id, email, name, avatar_url, created_at, updated_at)
- `portfolios` — портфели пользователей (user_id, name, description, assets JSON, created_at, updated_at)
- `rebalances` — история ребалансировок портфелей (опционально)
- `user_settings` — пользовательские настройки (опционально)

Подробная схема: `is/cloudflare/edge-api/schema.sql` и `is/cloudflare/edge-api/migrations/001_initial_schema.sql`

### Применение схемы

```bash
cd is/cloudflare/edge-api
wrangler d1 execute app-database --file=./schema.sql
```

Или через Cloudflare Dashboard:
1. Cloudflare Dashboard → Storage & databases → D1
2. Выбрать базу данных `app-database`
3. Перейти в "Execute SQL"
4. Скопировать содержимое `is/cloudflare/edge-api/schema.sql` и выполнить

## Безопасность

### Secrets

Все секретные данные хранятся в Workers secrets:
- `GOOGLE_CLIENT_SECRET` — секрет Google OAuth Client
- `JWT_SECRET` — секрет для подписи JWT токенов

**ВАЖНО:** Никогда не коммитить секреты в git!

### CORS

Все endpoints возвращают CORS заголовки для работы с браузерными клиентами:
- `Access-Control-Allow-Origin: *` (для разработки)
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`

### Авторизация

Защищённые endpoints требуют валидный JWT токен в заголовке:
```
Authorization: Bearer jwt_token
```

Токен проверяется через middleware `authenticate()` в `src/utils/auth.js`.

## Документация

- **Инфраструктура Cloudflare (актуально):** docs/ais/ais-infrastructure-integrations.md
- **Исторические документы:** AIS-миграция заменила
  - integrations-cloudflare-core (legacy donor: `docs/ais/ais-infrastructure-integrations.md` (LIR-002.A1))
  - integrations-cloudflare-plan (legacy donor: `docs/ais/ais-infrastructure-integrations.md` (LIR-002.A2))
  - integrations-cloudflare-testing (legacy donor: `docs/ais/ais-infrastructure-integrations.md` (LIR-002.A3))
