---
id: readme-9e335c
status: active
last_updated: "2026-03-07"

---
<!-- Важно: оставлять пустую строку перед "---" ! -->

# coins-db-gateway (Yandex Cloud Function)

Назначение:
- `/health` — проверка доступности БД.
- `GET /api/coins/market-cache` — чтение серверного кэша монет из PostgreSQL.
- `GET /api/coins/cycles` — чтение истории ingest-циклов.
- `POST /api/coins/market-cache/trigger` — on-demand запуск ingest (order: `market_cap`/`volume`) через cloud path.
- Подготовка для CRUD эндпоинтов (портфели/снимки).

Секреты:
- Фактические значения — в secrets dir вне репозитория (Yandex Console → Function env vars или локальный .env).
- Шаблон контракта: `.env.example` (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD).

Параметры функции (рекомендуемые):
- Runtime: nodejs18
- Timeout: 30s
- Memory: 256 MB

Переменные окружения:
- `DB_HOST`
- `DB_PORT` (default 6432)
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`

Operational policy:
- Для redeploy сохранять env-контракт активной production-версии функции.
- Прямой `yc serverless function invoke` не является полным эквивалентом HTTP-трафика через API Gateway; чтение/403-поведение проверять через реальный base URL.
- `POST /api/coins/market-cache` запрещён для браузера и должен возвращать `403`, чтобы fallback не записывал данные в центральный SSOT.
- Deploy выполнять через `node is/yandex/functions/api-gateway/deploy.js`; скрипт делает redeploy + update gateway spec + обязательный post-deploy snapshot в `is/deployments/yandex-api-gateway/YYYY-MM-DD/`.

Связанные файлы:
- API Gateway: `is/yandex/functions/api-gateway/` (OpenAPI spec в Yandex Cloud Console)
- Документация интеграций: id:ais-f6b9e2
