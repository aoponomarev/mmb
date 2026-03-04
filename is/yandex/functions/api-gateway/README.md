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
- Хранить фактические значения в `do-overs/Secrets/yandex-postgres.env`.
- В репозитории хранится только шаблон: `cloud/yandex/functions/app-api/env.stub`.

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
- API Gateway: `cloud/yandex/api-gateway/app-api-gw/openapi.yaml`
- Документация интеграций: `docs/ais/ais-integration-strategy-yandex.md`
