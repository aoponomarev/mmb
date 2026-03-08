---
id: cheat-78b6b8
status: active
last_updated: "2026-03-08"

---
<!-- Важно: оставлять пустую строку перед "---" ! -->

# Шпаргалка: Data Pipeline монет — трасса вызовов и дебаг

> Быстрый справочник для отладки конвейера данных (Data Pipeline). Полная спецификация — id:ais-3732ce (docs/ais/ais-data-pipeline.md), id:ais-e41384 (docs/ais/ais-yandex-cloud.md).

## Трасса вызовов (для дебага)

1. `index.html` → `moduleLoader.load()`
2. `app-ui-root.mounted()`
3. `loadCoinsForActiveSet()`
4. `loadTopCoins()` или `loadCoinsByIds()`
5. `dataProviderManager.getTopCoins(...)` / `getCoinDataDualChannel(...)`
6. `requestRegistry.isAllowed(...)`
7. `coingecko-provider.getTopCoins(...)` или `yandex-cache-provider` (PG phase)
8. `cacheManager.set('top-coins-by-market-cap', data)`
9. `this.coins = ...`
10. `recalculateAllMetrics()`
11. `sortedCoins` → рендер таблицы

## Порядок загрузки модулей (#JS-os34Gxk3 core/modules-config.js)

- `ssot-policies` → `cache-config` → `storage-layers` → `cache-manager` → `request-registry`
- `coingecko-provider` → `yandex-cache-provider` → `data-provider-manager` → `app-ui-root`

## Ключевые методы #JS-yx22mAv8 (app-ui-root.js)

| Метод | Назначение |
|-------|------------|
| `loadCoinsForActiveSet()` | Выбор top-list vs active set |
| `loadCoinsByIds()` | Загрузка по списку ID |
| `loadTopCoins()` | Основной путь для топ-250 |
| `preloadMaxCoinsData()` | Фоновая предзагрузка market_cap + volume |
| `refreshCoinsCache()` | Ручной refresh (кнопка) |
| `updateCoinsCacheMeta()` | Мета свежести для UI |

## Чек-лист "pipeline жив"

1. Модули загружены без циклов/ошибок.
2. `window.ssot.validateContracts()` проходит.
3. `loadTopCoins()` — либо кэш, либо успешный top-250.
4. `requestRegistry` не в перманентной блокировке.
5. На 429 нет шторма повторов.
6. В футере fallback-счётчик отражает fallback-ветки.
7. Таблица показывает строки и пересчитанные `metrics.*`.

## Известные нюансы

- **Тайминговый дрейф:** SSOT задаёт 2h, в #JS-yx22mAv8 местами hardcoded 4h — выровнять.
- **warm/cold слои:** Заявлены как IndexedDB, фактически fallback на localStorage с префиксами `idb_<layer>_...`.
- **Серверный ingest:** Полная реализация cron/fetcher — в `is/yandex/functions/`; текущая модель ingest — два trigger'а (`:00` market_cap, `:30` volume) и один top-250 запрос на запуск.
- **Read-only fallback:** браузерный fallback больше не имеет права писать в `POST /api/coins/market-cache`; эта запись должна возвращать `403`.
- **Gateway verification:** HTTP-поведение `coins-db-gateway` проверять через реальный API Gateway URL, а не только через direct function invoke. Обратите внимание на `allow-unauthenticated-invoke`, иначе Gateway отдаст 502 (id:sk-5cd3c9 is/skills/arch-cloudflare-infrastructure.md `#for-yc-public-invoke`).
