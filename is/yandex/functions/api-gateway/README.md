---
id: readme-9e335c
status: active
last_updated: "2026-03-04"
---

# app API (Yandex Cloud Functions)

Назначение:
- `/health` — проверка доступности БД.
- Подготовка для CRUD эндпоинтов (портфели/снимки).

Секреты:
- Фактические значения — в secrets dir вне репозитория (Yandex Console → Function env vars или локальный .env).
- Шаблон контракта: `.env.example` (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD).

Параметры функции (рекомендуемые):
- Runtime: Node.js 22
- Timeout: 10s
- Memory: 128 MB

Переменные окружения:
- `DB_HOST`
- `DB_PORT` (default 6432)
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`

Связанные файлы:
- API Gateway: `is/yandex/functions/api-gateway/` (OpenAPI spec в Yandex Cloud Console)
- Документация интеграций: id:ais-f6b9e2
