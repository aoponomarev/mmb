---
id: plan-a9b2c4
status: draft
last_updated: "2026-03-11"
related_skills:
  - sk-224210
  - sk-71a8b9
  - sk-bb7c8e
  - sk-3c832d
  - sk-8f9e0d
related_ais:
  - ais-71a8b9
  - ais-3732ce
  - ais-e41384

---

# План: Единая система адаптеров (Unified Adapter System)

> Агрегация практик из веб-исследования и аудита приложения. Связь с существующими скиллами и казуальностями. **Статус: draft** — требует обсуждения перед реализацией.

## Цель

Превратить разрозненные интеграции с внешними API/БД в единую систему адаптеров с:
- Registry-driven маршрутизацией
- Connection-слоем для тестирования
- Failover-политиками
- Плотной привязкой к id:sk-224210, id:ais-71a8b9 и causality-registry

## Связь с аудитом

| Категория | Найдено | Действие |
|-----------|---------|----------|
| Прямые API без провайдера | 9+ мест | Ввести адаптеры |
| Прямой доступ к БД | 2 Yandex functions | PostgresAdapter |
| Inline-адаптация | 3+ места | Вынести в провайдеры |
| Единая система | — | Registry + Failover + Connection |

## Агрегированные практики (адаптированные под архитектуру)

### 1. Registry-Driven (из vrraj-llm-adapter, Martin Fowler Gateway)

- **Реестр** — центральная точка разрешения провайдера по ключу (домен:метрика или домен:источник).
- **Политики в реестре** — rate limit, timeout, retry, allowlist (какие провайдеры разрешены в prod).
- **Связь:** `#for-data-provider-interface`, `#for-dual-channel-fallback` — DataProviderManager уже частично реализует; расширить на market-metrics.

### 2. Connection-слой (Martin Fowler)

- **Gateway = Adapter + Connection.** Connection — чистый вызов внешнего API; Adapter — нормализация.
- **Test Double:** в тестах подменять Connection, не Adapter целиком.
- **Связь:** id:sk-224210 — провайдеры уже нормализуют; добавить инъекцию Connection в конструктор.

### 3. Failover Policy (ai-fallback, Polly)

- **Circuit breaker per provider** — сбой одного не влияет на статус других.
- **Автоматическое переключение** при деградации primary; опциональный reset к primary через N секунд.
- **Связь:** `#for-dual-channel-fallback`, `#for-partial-failure-tolerance` — уже есть в data-providers; применить к market-metrics.

### 4. Стабильный внутренний контракт

- **Один интерфейс** — приложение не знает о provider-specific форматах.
- **Semantic drift** — одинаковые имена параметров у разных провайдеров ведут себя по-разному; политики в реестре компенсируют.
- **Связь:** `#for-validation-at-edge`, id:sk-224210 § Normalization.

### 5. Service Locator / DI

- **Единая точка конфигурации** — провайдеры регистрируются при старте; UI/сервисы получают через фасад.
- **Связь:** `#for-composition-root` — app-ui-root уже оркестрирует; DataProviderManager — фасад.

---

## Этапы плана (чекбоксы)

### Этап 1: Market Metrics — адаптеры вместо inline fetch

- [ ] Создать `AlternativeMeProvider` (FGI)
- [ ] Создать `VixProvider` (Yahoo, Stooq, Alpha Vantage — fallback chain)
- [ ] Создать/переиспользовать `BinanceMetricsProvider` для frontend (OI, FR, LSR)
- [ ] Создать `CoinGeckoBtcDomProvider` или интегрировать в существующий CoinGecko
- [ ] Рефакторинг `market-metrics.js` — делегирование провайдерам, убрать inline `fetch` и парсинг
- [ ] Добавить `@skill-anchor` и `@causality` в новые провайдеры

### Этап 2: Yandex API Gateway — единый адаптер

- [ ] Создать `YandexApiGatewayProvider` (cycles, trigger)
- [ ] Рефакторинг `coingecko-cron-history-modal-body.js` — использовать провайдер вместо raw fetch
- [ ] Вынести `normalizeRows` в провайдер или shared-модуль

### Этап 3: N8N, Cloudflare, GitHub — низкоприоритетные

- [ ] `N8nProvider` / `n8nApiClient` для `is/V2_logic.js`
- [ ] `CloudflareWorkspaceClient` — уже есть; проверить соответствие паттерну Gateway
- [ ] `GitHubApiProvider` для copilot-backlog-cron (опционально)

### Этап 4: PostgreSQL — адаптер в Yandex Functions

- [ ] Создать `PostgresAdapter` (или `PgConnection`) — обёртка над `pg.Client`
- [ ] Рефакторинг `api-gateway/index.js`, `market-fetcher/index.js` — использовать адаптер
- [ ] Connection-инъекция для тестов (если применимо в serverless)

### Этап 5: Registry и единая система

- [ ] Расширить `DataProviderManager` или создать `AdapterRegistry` — домен market-metrics
- [ ] Конфиг политик (rate limit, timeout, allowlist) в `data-providers-config.js` или отдельном реестре
- [ ] Health tracking per provider (уже частично в id:sk-224210)
- [ ] Документировать в AIS id:ais-d8e7f6

---

## Уточняющие вопросы (требуют решения перед реализацией)

### Q1. Граница Registry

**DataProviderManager** уже фасад для coin data. **Market Metrics** — отдельный домен (FGI, VIX, OI, FR, LSR). Как объединять?

- **Вариант A:** Один `AdapterRegistry` с доменами `coins`, `market-metrics`, `ai`, `n8n` — единая точка.
- **Вариант B:** Отдельные фасады (`DataProviderManager`, `MarketMetricsProviderManager`) — каждый со своим реестром провайдеров.
- **Вариант C:** Расширить `DataProviderManager` на market-metrics — один фасад на все рыночные данные.

**Рекомендация из контекста:** Вариант B или C. DataProviderManager по id:sk-224210 — coins + dual-channel. Market metrics — иная семантика (много разнородных источников, разный TTL). Отдельный `MarketMetricsProviderManager` с реестром FGI/VIX/BTC-dom/OI/FR/LSR логичен.

### Q2. Connection-инъекция в No-Build

В No-Build Vue нет DI-контейнера. Провайдеры создаются в `DataProviderManager.init()`. Как инжектировать Connection для тестов?

- **Вариант A:** Опциональный параметр конструктора `new AlternativeMeProvider(fetchFn)` — по умолчанию `fetch`.
- **Вариант B:** Глобальный `window.__testConnections` — только в test env.
- **Вариант C:** Пропустить Connection-слой для frontend-провайдеров; тестировать через mock fetch (как сейчас).

**Рекомендация:** Вариант A — минимален, не требует инфраструктуры.

### Q3. PostgresAdapter в Yandex Functions

Serverless functions — короткие инвайки. `pg.Client` создаётся на каждый вызов. Нужен ли отдельный адаптер или достаточно вынести запросы в отдельный модуль?

- **Вариант A:** Полноценный `PostgresAdapter` с интерфейсом `query(sql, params)` — единообразие, тестируемость.
- **Вариант B:** Модуль `pg-queries.js` с чистыми функциями — без класса, только изоляция SQL.

**Рекомендация:** Вариант A — соответствует глоссарию (Adapter инкапсулирует доступ к внешнему миру).

### Q4. Приоритет этапов

Аудит выявил 9+ мест без адаптеров. Какой порядок внедрения?

- **Предложение:** Этап 1 (market-metrics) — наибольший объём inline-логики; Этап 2 (Yandex cycles) — быстрый выигрыш; Этап 4 (PostgreSQL) — инфраструктурный; Этапы 3 и 5 — по остаточному принципу.

### Q5. Новые causality hashes

Нужны ли новые хеши в causality-registry?

- `#for-adapter-registry` — центральный реестр провайдеров по домену.
- `#for-connection-injection` — Connection-слой для тестируемости.
- `#for-circuit-breaker-per-provider` — изоляция сбоев.
- `#for-adapter-mandatory` — каждая новая внешняя интеграция MUST иметь адаптер.

**Принято:** Добавлен `#for-adapter-mandatory` в causality-registry; политика зафиксирована в AIS, data-providers-architecture, external-integrations.

---

## Связь с документами

| Документ | Связь |
|----------|-------|
| id:ais-d8e7f6 (ais-unified-adapter-system.md) | Черновик AIS — макро-спецификация |
| id:sk-224210 | Data providers architecture — расширяется |
| id:ais-71a8b9 | Executable units — провайдер/адаптер |
| id:ais-3732ce | Data pipeline — dual-channel, fallback |
| is/skills/causality-registry.md | #for-data-provider-interface, #for-dual-channel-fallback, #for-fail-fast |

---

## Дистилляция (после выполнения)

По id:sk-0e193a (#for-distillation):
- Макро-знания → id:ais-d8e7f6
- Микро-правила → core/skills/data-providers-architecture.md, новый skill arch-market-metrics-adapters.md (если нужен)
- План → docs/done/plan-unified-adapter-system.md (архив)
