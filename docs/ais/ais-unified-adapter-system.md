---
id: ais-d8e7f6
status: draft
last_updated: "2026-03-11"
related_skills:
  - sk-224210
  - sk-bb7c8e
  - sk-3c832d
related_ais:
  - ais-71a8b9
  - ais-3732ce
  - ais-e41384
  - ais-775420

---

# AIS: Единая система адаптеров (Unified Adapter System)

<!-- Черновик. Требует обсуждения. Спецификации (AIS) пишутся на русском языке. -->

## Идентификация и жизненный цикл

```yml
id: ais-d8e7f6
status: draft
last_updated: "2026-03-11"
related_skills:
  - sk-224210
  - sk-bb7c8e
  - sk-3c832d
related_ais:
  - ais-71a8b9
  - ais-3732ce
  - ais-e41384
```

**Статус:** `draft` — план id:plan-a9b2c4 в обсуждении. Спецификация будет доработана после утверждения этапов и ответов на уточняющие вопросы.

## Концепция (High-Level Concept)

Единая система адаптеров объединяет все интеграции с внешним миром (API, БД) под общими принципами:

1. **Adapter (Provider)** — инкапсулирует transport + нормализацию форматов к внутренним контрактам (docs/glossary.md).
2. **Registry** — центральная точка разрешения провайдера по домену/ключу.
3. **Connection-слой** — опциональная инъекция для тестирования (Test Double).
4. **Failover Policy** — переключение при деградации primary; circuit breaker per provider.

Существующие фасады (`DataProviderManager`, `AIProviderManager`) уже реализуют часть паттерна. Спецификация формализует расширение на домены market-metrics, Yandex API Gateway, N8N, PostgreSQL.

## Инфраструктура и Потоки данных (Infrastructure & Data Flow)

```mermaid
flowchart TD
    subgraph UI ["app/"]
        comp[UI Components]
    end

    subgraph Facades ["Фасады"]
        DPM[DataProviderManager]
        MMPM[MarketMetricsProviderManager]
        AIPM[AIProviderManager]
    end

    subgraph Registry ["Registry / Реестр"]
        reg[Adapter Registry]
    end

    subgraph Adapters ["Адаптеры (Providers)"]
        CG[CoinGeckoProvider]
        YC[YandexCacheProvider]
        AM[AlternativeMeProvider]
        VIX[VixProvider]
        BN[BinanceMetricsProvider]
        YAG[YandexApiGatewayProvider]
    end

    subgraph External ["Внешний мир"]
        api1[CoinGecko API]
        api2[Yandex API Gateway]
        api3[Alternative.me]
        api4[Binance Futures]
        pg[(PostgreSQL)]
    end

    comp --> DPM
    comp --> MMPM
    comp --> AIPM

    DPM --> reg
    MMPM --> reg
    AIPM --> reg

    reg --> CG
    reg --> YC
    reg --> AM
    reg --> VIX
    reg --> BN
    reg --> YAG

    CG --> api1
    YC --> api2
    AM --> api3
    BN --> api4
    YAG --> api2
    YC --> pg
```

### Домены адаптеров

| Домен | Фасад | Провайдеры | Статус |
|-------|-------|------------|--------|
| Coin data | DataProviderManager | CoinGecko, YandexCache | Реализовано |
| Market metrics | — | AlternativeMe, Vix, Binance, CoinGecko (BTC dom) | **Требует адаптеров** |
| Yandex API Gateway | — | cycles, trigger | **Требует YandexApiGatewayProvider** |
| AI | AIProviderManager | Yandex, OpenRouter, Groq, … | Реализовано |
| N8N | — | webhooks | **Требует N8nProvider** |
| PostgreSQL | — | Yandex Functions | **Требует PostgresAdapter** |

## Локальные Политики (Module Policies)

1. **No direct fetch in components** — UI не вызывает `fetch` напрямую для рыночных данных. Все запросы через фасад (id:sk-224210).
2. **Normalization in adapter** — все провайдеры нормализуют ответы к внутренним схемам; inline-парсинг в сервисах запрещён.
3. **Connection injection** — провайдеры принимают опциональный `connection` (fetch-подобная функция) в конструкторе для тестов.
4. **Circuit breaker per provider** — сбой одного провайдера не влияет на health-статус других.
5. **Registry policies** — rate limit, timeout, allowlist хранятся в конфиге реестра, не в коде провайдера.
6. **Adapter mandatory for new integrations** — каждая новая интеграция с внешней системой (API, БД) MUST иметь выделенный адаптер. Прямой `fetch`/`client.query` в сервисах или компонентах запрещён. `@causality #for-adapter-mandatory`

## Компоненты и Контракты (Components & Contracts)

| Компонент | Путь | Ответственность |
|-----------|------|-----------------|
| DataProviderManager | core/api/data-provider-manager.js | Фасад coin data |
| BaseDataProvider | core/api/data-providers/base-provider.js | Базовый контракт |
| CoinGeckoProvider | core/api/data-providers/coingecko-provider.js | CoinGecko API |
| YandexCacheProvider | core/api/data-providers/yandex-cache-provider.js | Yandex market cache |
| market-metrics.js | core/api/market-metrics.js | **Рефакторинг:** делегирование провайдерам |
| data-providers-config.js | core/api/data-providers-config.js | Лимиты, URL |
| causality-registry | is/skills/causality-registry.md | #for-data-provider-interface, #for-dual-channel-fallback |

## Казуальности (Causality Links)

| Hash | Применение |
|------|------------|
| `#for-data-provider-interface` | Единый интерфейс провайдеров |
| `#for-dual-channel-fallback` | Primary + fallback |
| `#for-readonly-fallbacks` | Fallback не пишет в SSOT |
| `#for-fail-fast` | Валидация на границе |
| `#for-rate-limiting` | Throttling в провайдерах |
| `#for-validation-at-edge` | Схема перед расчётами |
| `#for-partial-failure-tolerance` | Частичный успех при сбоях |
| `#for-composition-root` | Сборка в app-ui-root |
| `#for-adapter-mandatory` | Каждая новая внешняя интеграция — свой адаптер |

## Контракты и гейты

- #JS-Hx2xaHE8 (validate-docs-ids.js) — валидация id и связей
- #JS-QxwSQxtt (validate-skill-anchors.js) — при добавлении @skill-anchor в новые провайдеры

## Уточняющие вопросы (из плана)

См. id:plan-a9b2c4 § Уточняющие вопросы. Q1–Q5 приняты; политика #for-adapter-mandatory зафиксирована.

## Завершение / completeness

- После утверждения плана: обновить status на `incomplete`, добавить детали по MarketMetricsProviderManager.
- После реализации: status `complete`, дистилляция в skills.
