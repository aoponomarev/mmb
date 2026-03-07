---
id: ais-3732ce
status: active
last_updated: "2026-03-02"
related_skills:
  - sk-224210
  - sk-bb7c8e
  - sk-22dc19
  - sk-3c832d
related_ais:
  - ais-e41384

---

# AIS: Data Pipeline & Backend Core (Потоки Данных и Модели)

<!-- Спецификации (AIS) пишутся на русском языке и служат макро-документацией. Микро-правила вынесены в английские скиллы. Скрыто в preview. -->

## Концепция (High-Level Concept)
Ядро приложения отвечает за сбор, кэширование и математическую обработку рыночных данных (криптовалют). Так как приложение может запускаться локально (file://) без собственного бэкенда, вся оркестрация данных происходит прямо в браузере или через легкие Cloudflare-прокси.

## Инфраструктура и Потоки данных (Infrastructure & Data Flow)
- **Дуальный канал (Dual-Channel Fetch):** В связи с жесткими лимитами публичных API (например, CoinGecko: 3 запроса в минуту), реализована отказоустойчивая схема:
  1. **Phase 1 (PostgreSQL):** `YandexCacheProvider` → `GET /api/coins/market-cache?ids=...` — быстрая bulk-выдача без rate limit.
  2. **Phase 2 (CoinGecko):** Если `missingIds.length > 0` — `getCoinData(missingIds)` через `CoinGeckoProvider` (chunk 50, задержка 21s между chunk'ами).
  3. **Merge:** `resolvedFromPg + resolvedFromCG` → итоговый набор монет.
- **A.I.R. Model (Alignment, Impulse, Risk):** Сердцевина финансовой логики. Сырые данные о цене/объемах пропускаются через математическую модель A.I.R. для расчета инвестиционного рейтинга каждой монеты. Эти алгоритмы изолированы в #JS-CeYzbCbM (models-config.js) и не должны смешиваться с UI-кодом.
- **Менеджер Провайдеров:** `DataProviderManager` абстрагирует конкретные источники (Binance, CoinGecko) под единый интерфейс. UI-слой ничего не знает о том, откуда именно пришли цены.

### Dual-Channel: Fallback-поведение

| Сценарий | Поведение |
|----------|-----------|
| PG доступен, все монеты найдены | CoinGecko phase = 0, мгновенная загрузка |
| PG доступен, часть отсутствует | PG отдаёт bulk, CG добирает остальное |
| PG недоступен | Полный fallback на CoinGecko |
| CG rate-limited (429) | Retry countdown, requestRegistry |
| Оба недоступны | Fallback на локальный кэш, stale warning |

Все события деградации — через `fallbackMonitor.notify()`.

### SSOT Timing (#JS-iH2gWJeT core/ssot/policies.js)

| Contract | Value | Использование |
|----------|-------|---------------|
| `topCoins.ttlMs` | 2h | Cache TTL для топ-монет |
| `topCoins.uiStaleThresholdMs` | 2h | `isCoinsCacheStale()` |
| `topCoins.requestRegistryMinIntervalMs` | 2h | Rate limit check для getTopCoins |
| `marketMetrics.minIntervalMs` | 4h | BTC dom, OI, FR, LSR registry checks |

## Локальные Политики (Module Policies)
- **Отсутствие единой точки отказа (Partial Failure Tolerance):** Если один из провайдеров падает или отдает 429 Too Many Requests, система не должна "умирать". Метод `getAllBestEffort` вернет те метрики, которые успели загрузиться, а для упавших отобразит предупреждение (Warning).
- **Раздельный TTL:** Разные метрики живут в кэше разное время. Цена обновляется часто (5 мин), индекс VIX — редко (24 часа).
- **Математический контракт:** Формула A.I.R. является строгим контрактом предметной области. ИИ-агентам запрещено модифицировать весовые коэффициенты без явного указания пользователя-архитектора.

## Компоненты и Контракты (Components & Contracts)
- #JS-2436XKxE (data-provider-manager.js) — точка входа, `getCoinDataDualChannel()` — dual-channel оркестрация.
- core/api/data-providers/* — #JS-DvQtSDsD coingecko-provider, #JS-qz3WnWnA yandex-cache-provider (PostgreSQL через API Gateway).
- #JS-CeYzbCbM — SSOT конфигурация математических доменных моделей.
- #JS-Xa3QAdTk (market-metrics-service.js) — оркестратор TTL и кэширования метрик.

**API и схема PostgreSQL:** см. id:ais-e41384 (docs/ais/ais-yandex-cloud.md).
