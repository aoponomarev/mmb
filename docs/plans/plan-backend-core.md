# План_Backend_Core.md

> Категория: План миграции Backend/Core Data
> Статус: Active (Stage 3 P1 - Secret Resilience MVP + data-provider-manager first migration slice in progress)
> Источники: `A_CORE_DATA_LOGIC.md`, backend/process/integrations навыки Legacy App

---

## 1. Контекст и границы

Контур охватывает перенос серверной логики, сервисов и data-пайплайнов из Legacy App в Target App.
Не включает UI (см. `План_Frontend_UI.md`) и docker-рантайм (см. `План_Infrastructure_Docker.md`).

## 2. Цели / Non-goals

**Цели:**
- восстановить минимально необходимое backend-ядро;
- убрать Legacy App-специфику и хардкод путей;
- обеспечить совместимость с `paths.js`, `.env`, MCP-правилами.
- в первую очередь внедрить устойчивый контур секретов и чувствительной инфраструктурной конфигурации (пути, endpoint-контракты, active-writer policy).

**Non-goals:**
- перенос всего legacy-кода «как есть»;
- оптимизация производительности до появления стабильного feature-scope.

## 3. Почему этот подход

- **Почему инкрементально:** снижает риск крупных регрессий и держит миграцию проверяемой.
- **Почему сначала data-contracts:** UI и интеграции зависят от стабильных API/данных.
- **Почему «SSOT-first»:** backend должен сразу жить в новых границах `paths.js` и secret-policy.

## 4. Альтернативы

- Полный big-bang перенос backend за один этап — отклонено (слишком высокий риск расхождений).
- Полный rewrite с нуля — отклонено (дорого по времени без подтвержденной необходимости).

## 5. Зависимости

- Upstream: `План_Infrastructure_Docker.md`, `План_Control_Plane.md`, `План_Skills_MCP.md`
- Downstream: `План_Frontend_UI.md`, `План_Integrations_n8n.md`, `План_Monitoring.md`

## 6. Риски и снижение

- Риск скрытых зависимостей на legacy-пути -> статический аудит импортов перед переносом.
- Риск data-drift -> контрактные smoke-тесты на ключевые endpoints.
- Риск путаницы терминов -> применять anti-calque правило и `SSOT/ЕИП`-контракты.
- Риск потери работоспособности после cache reset/переезда на новую машину -> encrypted local secret archive + Cloudflare mirror + restore-chain.
- Риск гонок при совместной работе Legacy App/Target App с общими датасетами -> блокирующий single-writer contract (`DATA_PLANE_ACTIVE_APP`).

## 6.1 Stage 3 P1 Focus (Secret Resilience MVP)

До переноса функционального backend-кода фиксируется минимальный обязательный security/data-safety baseline:

1. **SecretStore contract**
   - секреты и чувствительная инфраструктурная конфигурация выделены в отдельный контур;
   - общий cache reset не удаляет секреты.
2. **Encrypted local archive**
   - локальный архив секретов хранится только в шифрованном виде;
   - используется как первичный источник восстановления при потере локального кэша.
3. **Restore chain**
   - порядок восстановления: encrypted local archive -> Cloudflare mirror -> manual fallback.
4. **Cache integrity gate**
   - отдельная проверка целостности secret/cache контура в preflight и ручном check.
5. **Single-writer guard**
   - `DATA_PLANE_ACTIVE_APP=Legacy App|Target App` обязателен и валидируется как блокирующий контракт.

## 6.2 Backend Core Audit Result (Stage 3 P1)

Аудит Legacy App backend/core показал, что первым кандидатом должен быть модуль-оркестратор провайдера данных:

- **Выбранный кандидат:** `core/api/data-provider-manager.js` (Legacy App).
- **Почему это фундаментально:**
  - единая точка входа для `getTopCoins/searchCoins/getCoinData`;
  - управляет связкой provider-selection + rate-limit journal + cache usage.
- **Почему максимально связан с уже перенесённым контуром Target App:**
  - напрямую опирается на устойчивость секретов/infra-contracts (`api keys`, `active provider`, error/fail contracts);
  - определяет, как backend-кэш и внешние API будут работать в паре с уже внедрённым `cache integrity gate`.
- **Жёсткое правило на следующий шаг:** если модуль не удовлетворяет критерию “фундаментальный + максимальная связка с уже перенесённым контуром”, он не берётся в первый перенос.
- **Fail mode policy:** на этапе миграции fallback-цепочки для Cloudflare/external critical contracts не применяются; только fail-fast.

## 6.3 Next Slice (pre-approved before code edits)

Следующий инкремент после manager-контракта:

1. `coingecko-provider` (Target App backend ESM, без fallback-цепочек);
2. `request-registry` (rate-limit журнал для backend-контракта);
3. интеграционный smoke/e2e check связки `data-provider-manager -> coingecko-provider -> request-registry`.
4. ввести явный `retry/timeout policy` в provider-контракте (без fallback-цепочек).
5. ввести единый backend error-model (коды + классификация retriable/non-retriable) и покрыть негативные e2e сценарии.
6. внедрить Target App-native cache layer (TTL/freshness) для market data flow без legacy localStorage-специфики.

Критерий приёмки среза:
- fail-fast сохранён;
- manager работает с реальным provider-контрактом;
- есть отдельный проверяемый сценарий e2e для связки.

## 7. Definition of Done

- Есть минимальный backend-контур, запускаемый локально.
- Все path/env зависимости проходят `env:check` и `ssot:check`.
- Для перенесенных модулей добавлены skill anchors.
- Обновлены: `План_MBB_to_MMB.md`, `План_Migration_Sync.md`.
- Реализован Secret Resilience MVP: encrypted local archive, restore-chain, integrity gate, explicit protection of sensitive infra metadata.

## 8. Чек-лист

- [ ] Инвентаризация backend-модулей Legacy App и приоритизация.
- [ ] Инвентаризация backend-модулей Legacy App и приоритизация (результат в `docs/runbooks/backend-core-audit-stage3-p1.md`).
- [x] Определение MVP backend для Target App: Secret Resilience + Sensitive Infra Metadata first.
- [x] Реализовать SecretStore resilience scripts (backup/restore/check) с обязательным шифрованием.
- [x] Ввести отдельный cache integrity gate в preflight и ручные проверки (`cache:integrity:delta` + `cache:integrity:check`).
- [x] Зафиксировать и валидировать single-writer guard (`DATA_PLANE_ACTIVE_APP`) как отдельный blocking gate (`single-writer:check`) в preflight/external parity checks.
- [x] Перенос core services + адаптация импорта путей (добавлены `core/api/data-provider-manager.js`, `core/api/providers/coingecko-provider.js`, `core/api/request-registry.js`, `core/api/market-data-service.js`, `core/cache/data-cache-manager.js`, `core/api/market-metrics-service.js` с FGI/VIX/BTC dominance/OI/FR/LSR).
- [x] Перенос core services + адаптация импорта путей (выделен provider-слой `core/api/providers/binance-metrics-provider.js`; `market-metrics-service` оставлен orchestration-only с cache/error contracts).
- [x] Контрактные тесты API и data-flow smoke checks (добавлены `npm run backend:provider:check`, `npm run backend:provider:e2e`, `npm run backend:cache:e2e`, `npm run backend:metrics:e2e`; покрыты retry/timeout, exhausted-retry, cache TTL, fail-fast валидация metric payload; backend suite подключён в `preflight-solo.ps1` для staged backend/core изменений).
- [x] Контрактные тесты API и data-flow smoke checks (расширен partial-failure сценарий: `getAllBestEffort` возвращает ошибки по упавшим метрикам без потери здоровых метрик; fail-fast сохраняется на уровне отдельных metric methods).
- [x] Запущен следующий backend candidate после metrics: `core/api/market-snapshot-service.js` (orchestration слой `market-data-service + market-metrics-service`) с e2e контрактом `backend:snapshot:e2e`.
- [x] Добавлен composition-root `core/api/backend-market-runtime.js` (единая сборка `DataProviderManager + providers + data/metrics/snapshot services`) с e2e контрактом `backend:runtime:e2e`.
- [x] Добавлен контрактный слой `core/api/market-contracts.js` (валидация `topCount/sortBy` + shape-check snapshot payload) и подключён в `market-snapshot-service`.
- [x] Расширены e2e проверки контрактов backend: `backend:contracts:e2e` + негативный сценарий `market-snapshot` для invalid sort.
- [x] Добавлен transport-адаптер `core/api/market-snapshot-transport.js` (query -> `{status, body}`), включая fail-fast mapping `BackendCoreError.code -> HTTP status` и e2e gate `backend:transport:e2e`.
- [x] Добавлен thin HTTP binding `core/api/market-snapshot-http.js` (framework-agnostic handler) + e2e gate `backend:http:e2e` для route/method/query/status/body контракта.
- [ ] Добавлена генерация документации контракта `docs/runbooks/market-snapshot-contract.md` через `npm run docs:market:contract`.
- [x] Добавлен lightweight Node server adapter `core/api/market-snapshot-node-server.js` + live loopback e2e gate `backend:http:live:e2e` и стартовый скрипт `market:http:start`.
- [x] Добавлен health-contract для HTTP слоя (`GET /api/health`) + отдельный gate `backend:http:health:e2e` и smoke-команда `market:http:smoke` для уже запущенного сервера.
- [x] Добавлен readiness-contract для HTTP слоя (`GET /api/ready`) с probe из runtime-композиции + отдельный gate `backend:http:ready:e2e`.
- [x] Усилен HTTP/server hardening: structured error envelope в handler, request logging contract и configurable graceful shutdown timeout в node-server, плюс отдельные gates `backend:http:ready:degraded:e2e` и `backend:node:hardening:e2e`.
- [x] Усилен traceability-контур: request-id correlation (`x-request-id`) в HTTP headers/payload + server logger fields (`requestId`, `durationMs`) с gates `backend:http:request-id:e2e` и `backend:node:trace:e2e`.
- [x] Усилен protocol-hardening: добавлен `Allow: GET` контракт для `405` ответов + bounded input guard (max `topCount`) с отдельным gate `backend:http:allow:e2e`.
- [x] Усилен response-header hardening: `x-content-type-options: nosniff`, `x-response-time-ms`, и обязательный `x-request-id` контракт с отдельным gate `backend:http:headers:e2e`.
- [x] Добавлен CORS contract для local runtime API (`OPTIONS` + access-control headers) с отдельным gate `backend:http:cors:e2e`.
- [x] Добавлен HEAD parity contract для HTTP routes (`GET`/`HEAD`), включая no-body semantics на live node adapter, с отдельным gate `backend:http:head:e2e`.
- [x] Добавлен service-state header contract (`x-service-state=ok|degraded`) для health/ready/snapshot маршрутов с отдельным gate `backend:http:service-state:e2e`.
- [x] Добавлены query hardening-контракты для snapshot route: max query length (512), strict allowed keys (`topCount`,`sortBy`) и `x-api-version` header; покрытие через `backend:http:query-guard:e2e` и `backend:http:query-keys:e2e`.
- [x] Усилен request-id контракт: sanitize входного `x-request-id` (charset + max length 64, invalid -> generated safe id) с отдельным gate `backend:http:request-id:sanitize:e2e`.
- [x] Усилен node fallback parity для `500 INTERNAL_SERVER_ERROR`: выровнены runtime headers (`x-api-version`, `x-service-state=degraded`, CORS, `x-request-id`) с отдельным gate `backend:node:fallback:e2e`.
- [x] Добавлен API consumer-контур: `core/api/market-snapshot-client.js` + `backend:client:e2e` (request-id propagation, query normalization, ok/error transport shape).
- [x] Добавлен runtime cache-aware smoke: `backend:http:runtime-smoke:e2e` (cache-hit по `topCoins/metrics`, частичная деградация `openInterest`, degraded-готовность при недоступном провайдере).
- [ ] Синхронизация статусов в master/migration документах.
