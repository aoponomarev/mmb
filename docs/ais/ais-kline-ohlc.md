---
id: ais-kline-ohlc
status: complete
last_updated: "2026-03-11"
related_skills:
  - sk-224210
related_ais:
  - ais-3732ce
  - ais-d4e5f6

---

# AIS: Свечи и OHLC данные (Klines & OHLC Data)

## Концепция (High-Level Concept)
Подсистема получения и отображения исторических данных в формате свечей (Open, High, Low, Close). Решает задачу быстрого визуального анализа волатильности на малых таймфреймах (1m, 3m, 5m, 15m, 30m), которые не хранятся в основном кэше рыночных данных (там хранятся только агрегаты 1h, 24h и т.д.).

## Инфраструктура и Потоки данных (Infrastructure & Data Flow)
Данные запрашиваются напрямую из Bybit API (публичный эндпоинт) через `KlineService`. В отличие от основного `DataProviderManager`, этот поток не использует PostgreSQL как первичный источник, так как минутные свечи являются эфемерными данными для быстрого просмотра.

```mermaid
flowchart TD
    UI[Coin Block / Menu] -->|Click "Свечи"| Modal[Candles Modal]
    Modal -->|Request intervals| KS[KlineService]
    KS -->|Check Cache| CM[CacheManager]
    KS -->|Fetch if missing| BKP[BybitKlineProvider]
    BKP -->|HTTP GET| Bybit[Bybit V5 API /v5/market/kline]
    Bybit -->|JSON| BKP
    BKP -->|Normalize| KS
    KS -->|Return OHLC Array| Modal
```

## Локальные Политики (Module Policies)
- **No-Auth Requirement:** Использовать только публичные эндпоинты Bybit. API-ключи не требуются.
- **Rate Limit Guard:** `KlineService` должен ограничивать частоту запросов (не более 5 параллельных запросов на одну монету при открытии модалки).
- **Short-Term Caching:** TTL для свечей в `CacheManager` составляет 1 минуту. Свечи не персистируются в облако.
- **Read-Only:** Данные свечей используются только для отображения и не влияют на расчеты модели A.I.R. или балансировку портфеля.
- **Init Guard:** сервис свечей обязан иметь lazy-init guard (`ensureProvider`) и не зависеть только от порядка bootstrap.
- **Modal Open Chain:** открытие модалки обязано проходить 4 звена: trigger -> app subscriber -> modal ref -> props bridge.
- **Transport Strategy:** direct-first запрос к Bybit; proxy используется только как fallback при network/CORS сбое прямого канала.

## Компоненты и Контракты (Components & Contracts)
- `core/api/data-providers/bybit-kline-provider.js` — Адаптер к Bybit API (#JS-BybitKlineProvider).
- `core/api/kline-service.js` — Оркестратор запросов и кэширования (#JS-KlineService).
- `app/components/candles-modal-body.js` — UI компонент для отображения данных (#JS-CandlesModalBody).
- `shared/components/coin-block.js` — Точка входа (пункт меню).

## Контракты и гейты
- #JS-Hx2xaHE8 (validate-docs-ids.js) — проверка id и связей.
- #JS-QxwSQxtt (validate-skill-anchors.js) — проверка привязок к скиллам.

## Лог перепривязки путей (Path Rewrite Log)

| Legacy path | Риск | New path / rationale |
|-------------|------|----------------------|
| `core/api/data-providers/bybit-kline-provider.js` | `NEW` | #JS-BybitKlineProvider |
| `core/api/kline-service.js` | `NEW` | #JS-KlineService |
| `app/components/candles-modal-body.js` | `NEW` | #JS-CandlesModalBody |

## Завершение / completeness
- @causality #for-ephemeral-klines: Свечи считаются временными данными, не требующими долгосрочного хранения в БД.
- @causality #for-direct-first-transport: для публичного Bybit endpoint direct канал является primary, proxy используется как fallback.
- Status: `complete` — провайдер, сервис и UI реализованы.

