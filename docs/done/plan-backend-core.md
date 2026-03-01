# План_Backend_Core.md

> Категория: План миграции Backend/Core Data
> Статус: **Завершён** (Stage 3 complete)
> Казуальность: `is/skills/arch-backend-core.md`

---

## 1. Контекст и границы

Контур охватывает перенос серверной логики, сервисов и data-пайплайнов из Legacy App в Target App.
Не включает UI (см. `План_Frontend_UI.md`) и docker-рантайм (см. `План_Infrastructure_Docker.md`).

## 2. Цели / Non-goals

**Цели:**
- восстановить минимально необходимое backend-ядро;
- убрать Legacy App-специфику и хардкод путей;
- обеспечить совместимость с `paths.js`, `.env`, MCP-правилами;
- внедрить устойчивый контур секретов и чувствительной инфраструктурной конфигурации.

**Non-goals:**
- перенос всего legacy-кода «как есть»;
- оптимизация производительности до появления стабильного feature-scope.

## 3. Почему этот подход

- **Инкрементально:** снижает риск крупных регрессий и держит миграцию проверяемой.
- **Сначала data-contracts:** UI и интеграции зависят от стабильных API/данных.
- **SSOT-first:** backend сразу живёт в новых границах `paths.js` и secret-policy.

## 4. Альтернативы

- Полный big-bang перенос backend — отклонено (слишком высокий риск).
- Полный rewrite с нуля — отклонено (дорого без подтвержденной необходимости).

## 5. Зависимости

- Upstream: `План_Infrastructure_Docker.md`, `План_Control_Plane.md`, `План_Skills_MCP.md`
- Downstream: `План_Frontend_UI.md`, `План_Integrations_n8n.md`, `План_Monitoring.md`

## 6. Риски и снижение

- Риск скрытых зависимостей на legacy-пути -> статический аудит импортов.
- Риск data-drift -> контрактные smoke-тесты.
- Риск потери после cache reset -> encrypted secret archive + restore-chain.
- Риск гонок Legacy App/Target App -> blocking single-writer contract.

## 7. Definition of Done

- Минимальный backend-контур, запускаемый локально.
- Все path/env зависимости проходят `env:check` и `ssot:check`.
- Для перенесенных модулей добавлены skill anchors.
- Реализован Secret Resilience MVP.

## 8. Чек-лист

- [x] Инвентаризация backend-модулей Legacy App и приоритизация.
- [x] Определение MVP backend: Secret Resilience + Sensitive Infra Metadata first.
- [x] Реализовать SecretStore resilience scripts (backup/restore/check).
- [x] Cache integrity gate в preflight (`cache:integrity:delta` + `cache:integrity:check`).
- [x] Single-writer guard (`DATA_PLANE_ACTIVE_APP`) как blocking gate.
- [x] Перенос core services: `data-provider-manager`, `coingecko-provider`, `binance-metrics-provider`, `request-registry`, `market-data-service`, `market-metrics-service`, `market-snapshot-service`.
- [x] Контрактные тесты: provider e2e, metrics e2e, snapshot e2e, partial-failure degradation.
- [x] Composition root: `backend-market-runtime.js`.
- [x] Market contracts: Zod-validated `topCount/sortBy` + shape-check snapshot payload.
- [x] Transport layer: `market-snapshot-transport.js` (domain error -> HTTP status mapping).
- [x] HTTP handler: `market-snapshot-http.js` (framework-agnostic).
- [x] Node server: `market-snapshot-node-server.js` + live loopback e2e.
- [x] Health/ready contracts: `GET /api/health`, `GET /api/ready`.
- [x] HTTP hardening: CORS, HEAD parity, request-id sanitize, query guards, response headers.
- [x] API consumer: `market-snapshot-client.js` + client e2e contract.
- [x] Runtime cache-aware smoke: cache-hit + partial degradation e2e.
- [x] Все 40 тестов проходят (`npm run test`).
