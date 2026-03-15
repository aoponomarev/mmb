---
id: ais-e41384
status: active
last_updated: "2026-03-15"
related_skills:
  - sk-224210
  - sk-bb7c8e
  - sk-918276
  - sk-7b4ee5
related_ais:
  - ais-3732ce
  - ais-82c9d0

---

# AIS: Yandex Cloud — Ingest и Read контуры данных монет

<!-- Спецификации (AIS) пишутся на русском языке и служат макро-документацией. Микро-правила вынесены в английские скиллы. Скрыто в preview. -->

## Концепция (High-Level Concept)

Yandex Cloud обеспечивает ingest/read поток данных монет с server-side SSOT:

1. **Ingest Pipeline (запись):** timer-trigger'ы запускают `coingecko-fetcher` в режимах `market_cap`, `registry_wlc`, `volume`, `registry_fiat`; функция обновляет `coin_market_cache`, `coin_market_cache_history` и `coin_registry`.
2. **Read Pipeline (чтение):** пользователь запрашивает данные через API Gateway; `coins-db-gateway` читает из PostgreSQL (`coin_market_cache`, `coin_registry`) и отдает normalized JSON.
3. **Fallback-политика:** браузерный fallback допускается только для локального чтения/отрисовки. Он не имеет права записывать данные обратно в серверный SSOT.

Это устраняет давление rate-limit на CoinGecko для типичного случая (~350 кэшированных монет) и обеспечивает быструю отдачу для пользователей из РФ/СНГ.

## Инфраструктура и Потоки данных (Infrastructure & Data Flow)

### Верхнеуровневая схема

```mermaid
flowchart TD
    A1[Timer Trigger :00 cap] --> B
    A2[Timer Trigger :15 registry_wlc] --> B
    A3[Timer Trigger :30 vol] --> B
    A4[Timer Trigger :45 registry_fiat] --> B
    subgraph B[Yandex Cloud]
        direction LR
        B1[coingecko-fetcher #JS-3w3f6pz7] --> B2[(PostgreSQL mbb_db)]
        B3[coins-db-gateway #JS-HS3kQFDc]
    end

    B1 -- HTTPS --> D[CoinGecko API]
    E[Browser / UI] --> F[API Gateway URL]
    F --> B3
    B3 --> B2
    E -. local-only fallback .-> D
```

### Ingest-контур (market-fetcher)

| Этап | Компонент | Описание |
|------|-----------|----------|
| 1 | Yandex Cloud Triggers | `coingecko-fetcher-cron-cap` (`0 * * * ? *`), `coingecko-fetcher-cron-registry-wlc` (`15 * * * ? *`), `coingecko-fetcher-cron-vol` (`30 * * * ? *`), `coingecko-fetcher-cron-registry-fiat` (`45 * * * ? *`) |
| 2 | #JS-3w3f6pz7 (is/yandex/functions/market-fetcher/index.js) | Один запуск = один режим: `market_cap` / `registry_wlc` / `volume` / `registry_fiat` |
| 3 | PostgreSQL (`mbb_db`) | Обновление `coin_market_cache`, запись в `coin_market_cache_history` и обновление `coin_registry` |

### Read-контур (api-gateway)

| Этап | Компонент | Описание |
|------|-----------|----------|
| 1 | Пользователь / браузер | Запрос через `YandexCacheProvider` |
| 2 | Cloudflare (опционально) | Защита / кэширование |
| 3 | #JS-HS3kQFDc (is/yandex/functions/api-gateway/index.js) | Функция `coins-db-gateway`: чтение из PostgreSQL через `GET /api/coins/market-cache` |
| 4 | PostgreSQL (`mbb_db`) | Выборка из `coin_market_cache` |

## Локальные Политики (Module Policies)

### Дневное окно (Time Window Gate)

Фетчер работает **только с 06:00 до 24:00 по Москве** (Europe/Moscow, UTC+3).  
Вне окна функция возвращает `200 OK` с `status: SKIPPED`.  
Код в `market-fetcher` — это gate на уровне приложения; cron в Yandex Cloud остаётся без изменений.

### Ротация циклов

- Каждый запуск создаёт уникальный `cycle_id = YYYYMMDDHHMMSS`.
- В истории хранятся **8 последних** cycle_id (`MAX_CYCLES_KEPT = 8`), а endpoint `/api/coins/cycles` дополнительно показывает aggregated snapshots для `registry_wlc` и `registry_fiat`.

### Секреты

- Секреты не хранятся в репозитории.
- Фактические значения — вне репозитория (локальное хранилище или переменные окружения Yandex Cloud).

### Граница production-базы данных

- Для данного контура operational SSOT на стороне Yandex Cloud — PostgreSQL база `mbb_db`, доступ к которой функции получают через env-переменные активной версии cloud function.
- Локальные legacy-значения вида `app_db` / `app_admin` в старых примерах, README или default-константах не являются authoritative для production и не должны использоваться для redeploy без явной миграции.
- Перед redeploy любой Yandex Cloud function нужно читать env текущей активной версии и сохранять её контракт, если migration не заявлена отдельно.

## Компоненты и Контракты (Components & Contracts)

### market-fetcher (CoinGecko → PostgreSQL)

| Параметр | Значение |
|----------|----------|
| Runtime | nodejs18 |
| Memory | 256 MB |
| Timeout | 600s (10 мин) |
| Trigger model | 4 независимых timer-trigger'а: `:00` market_cap, `:15` registry_wlc, `:30` volume, `:45` registry_fiat |
| Chunk | 250 монет × 1 страница = 250 |
| Задержка внутри запуска | отсутствует |

**Переменные окружения:**
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `COINGECKO_API_KEY` (опционально)

**Operational notes:**
- Пустой optional env не должен передаваться в `yc serverless function version create`; если ключ не заполнен, его нужно omit, а не передавать как пустую строку.
- Верификация функции после deploy делается через target-specific gate (`verify-deployment-target.js`): для HTTP-gateway targets проверка идёт по реальному transport, а для time-windowed ingest-функций используется явный manual verification override, не зависящий от текущего MSK окна.
- Если entrypoint функции импортирует sibling-модули из `is/yandex/functions/shared/`, packaging обязан идти от общего root `is/yandex/functions/`, а `entrypoint` должен включать имя поддиректории функции (`market-fetcher/index.handler`, `api-gateway/index.handler`). Упаковка только leaf-папки не соответствует runtime graph и даёт post-deploy import errors.

### api-gateway (PostgreSQL → HTTP)

| Параметр | Значение |
|----------|----------|
| Runtime | nodejs18 |
| Timeout | 30s |
| Memory | 256 MB |

**Эндпоинты:**
- `GET /health` — проверка доступности БД
- `GET /api/coins/market-cache` — кэш монет (params: `ids`, `sort`, `limit`, `include_prev`)
- `GET /api/coins/registry` — runtime registry (`stable.fiat`, `stable.commodity`, `wrapped`, `lst`)
- `GET /api/coins/cycles` — метаданные циклов + registry snapshots (`registry_wlc`/`registry_fiat`)
- `POST /api/coins/market-cache/trigger` — manual trigger только для `order = market_cap|volume`
- `POST /api/coins/market-cache` — запрещён для браузера (`403`), потому что browser fallback не должен записывать в центральный SSOT

### Схема таблиц

| Таблица | Назначение |
|---------|------------|
| `coin_market_cache` | Текущий снимок (latest view) |
| `coin_market_cache_history` | История циклов (с `cycle_id`, `sort_type`, `sort_rank`) |
| `coin_registry` | Реестр типов/peg (`wrapped`, `lst`, `commodity`, `stable`) для UI-классификации |

Ключевые поля `coin_market_cache_history`: `cycle_id`, `coin_id`, `symbol`, `name`, `image`, `current_price`, `market_cap`, `market_cap_rank`, `total_volume`, `pv_1h`..`pv_200d`, `sort_type`, `sort_rank`, `fetched_at`.

## API Contract (Base URL)

`https://d5dl2ia43kck6aqb1el5.k1mxzkh0.apigw.yandexcloud.net`

### GET /api/coins/market-cache

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `ids` | string | — | Comma-separated coin IDs |
| `sort` | string | `market_cap` | `market_cap` или `volume` |
| `limit` | number | 250 | Max 1000 |
| `include_prev` | string | `false` | Если `true`, включает данные предыдущего цикла |

### Семантика счётчиков для UI

- `count_only=true` возвращает raw-число уникальных `coin_id` в БД и подходит для диагностики наполнения кэша.
- Для пользовательского счётчика "сколько монет будет подставлено в таблицу" нужно использовать effective-count: тот же read-запрос (`sort`, `limit`) и те же клиентские фильтры, что у операции подстановки.
- Практическое правило: кнопка подстановки, toast и верхний правый индикатор должны показывать одно и то же effective-значение.

### GET /api/coins/cycles

Возвращает метаданные сохранённых циклов (`cycle_id`, `row_count`, `coin_count`, `sort_type`, `started_at`, `finished_at`), где `sort_type` включает `market_cap`, `volume`, `registry_wlc`, `registry_fiat`.

## Deployment & Verification Policy

1. Redeploy `coins-db-gateway` и `coingecko-fetcher` должен сохранять env-контракт активной production-версии, если migration базы не задокументирована отдельно.
2. Для HTTP-gateway функций прямой `yc serverless function invoke` не является полным эквивалентом API Gateway traffic; проверка чтения/запрета записи должна выполняться через реальный base URL.
3. После deploy ingest-контура нужно проверить:
   - manual invoke `coingecko-fetcher` (через deploy verification path с `deploy_verification` / `bypass_window`) возвращает валидный payload для `market_cap`/`volume` и count > 0 для `registry_wlc`/`registry_fiat`;
   - `GET /api/coins/market-cache?count_only=true` показывает свежий `fetched_at`;
   - `GET /api/coins/registry` возвращает валидную схему (`stable`, `wrapped`, `lst`, `updatedAt`);
   - `GET /api/coins/cycles` содержит entries с `sort_type=registry_wlc|registry_fiat`;
   - `POST /api/coins/market-cache` возвращает `403`.
4. **Public Invocation:** Функция, обслуживающая Yandex API Gateway через интеграцию `cloud_functions`, обязана быть публичной (`yc serverless function allow-unauthenticated-invoke`). Иначе API Gateway будет возвращать 502 Bad Gateway без явных ошибок в логах функции.

## Интеграция с клиентом

- #JS-qz3WnWnA (yandex-cache-provider.js) — провайдер для DataProviderManager.
- `getCoinDataDualChannel()` — сначала PG, затем CoinGecko для недостающих монет.

## Acceptance Snapshot (2026-03-15)

Дистиллированный результат verification-checklist для cloud-registry rollout:

- [x] `coin_registry` создается/поддерживается server-side (`ensureCoinRegistryTable` в ingest/read функциях).
- [x] `GET /api/coins/registry` возвращает runtime-валидный JSON.
- [x] Режимы `registry_wlc` и `registry_fiat` в `coingecko-fetcher` реализованы и активны.
- [x] Triggers `:15` и `:45` добавлены в deploy-контракт ingest функции.
- [x] `coins-metadata-loader` работает в primary/fallback режиме (Yandex -> GitHub).
- [x] Modal Load использует registry∩cloud для Stable/Wrapped/LST.
- [x] Dropdown selection разделен на USD / другие фиаты / металлы и сырье / wrapped / lst.
- [x] Row badges работают по runtime-классификации; commodity-backed stablecoins отображаются отдельно от fiat stablecoins.
- [x] Fallback на GitHub при недоступности Yandex сохранен.
- [x] AIS синхронизирован с реализацией; удаление plan-артефакта отражается через `docs/deletion-log.md`.

---

*См. также: id:ais-3732ce (docs/ais/ais-data-pipeline.md), id:runbook-ce96aa (docs/runbooks/data-pipeline-troubleshooting.md).*
