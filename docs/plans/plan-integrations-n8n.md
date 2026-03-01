# План_Integrations_n8n.md

> Категория: План интеграций и n8n
> Статус: Черновик
> Источники: n8n/integrations навыки Legacy App

---

## 1. Контекст и границы

Контур охватывает внешние интеграции (n8n, API-proxy, OAuth, провайдеры данных),
которые реально нужны Target App после рефакторинга.

## 2. Цели / Non-goals

**Цели:**
- инвентаризировать и отобрать только нужные workflow-интеграции;
- перевести интеграции на SSOT пути/секреты Target App;
- обеспечить проверяемость (timeouts, retry, security boundaries).

**Non-goals:**
- перенос всех workflow Legacy App «вслепую»;
- интеграции без бизнес-ценности для target Target App.

## 3. Почему этот подход

- selective migration убирает технический долг;
- n8n и внешние API — высокий риск по секретам и drift, нужен контрактный контур;
- ранний re-audit снижает стоимость последующей поддержки.

## 4. Альтернативы

- хранить все интеграции в legacy-контуре Legacy App и дергать удаленно — отклонено.
- полная замена n8n на custom scripts — отложено до оценки TCO.

## 5. Зависимости

- Upstream: `План_Infrastructure_Docker.md`, `План_Backend_Core.md`
- Downstream: `План_AI_Orchestration.md`, `План_Monitoring.md`, `План_Testing_Strategy.md`

## 6. Риски и снижение

- утечки секретов -> обязательные preflight/security checks.
- нестабильность внешних API -> retry/fallback контракт на каждый критичный endpoint.
- CORS/OAuth проблемы -> отдельные troubleshooting playbooks.

## 7. Definition of Done

- сформирован whitelist интеграций для Target App;
- для каждого workflow есть owner, вход/выход, timeout policy, secret policy;
- критичные интеграции проходят smoke-тесты.

## 8. Чек-лист

- [ ] Провести аудит workflow и внешних интеграций Legacy App.
- [ ] Составить whitelist/blacklist к переносу.
- [ ] Перенести и адаптировать приоритетные интеграции (с учётом `AI Orchestration` и `external parity`).
- [ ] Включить мониторинг и тестовые сценарии для целевых интеграций (подготовка readiness-контуров и smoke-гейт).

### 8.1 Результат первичного аудита (Stage 5 / пакет 1)

- **Whitelist (переносятся первыми)**:
  - `core/api/market-metrics-service.js` (FGI, BTC dominance, VIX).
  - `core/api/providers/binance-metrics-provider.js` (OI, Funding Rate, Long/Short Ratio).
  - `core/api/providers/coingecko-provider.js` (текущие рынки/топы).
  - `core/api/market-snapshot-*` + `core/api/market-snapshot-client.js` (контрактный слой для API consumers).
- **Whitelist (вне переноса в первую очередь, но учесть):**
  - frontend/API smoke и health контуры (`scripts/infrastructure/market-http-smoke.js`, `parity`-runbook).
- **Blacklist (ожидает отдельного решения Stage 5/AI-Orchestration):**
  - `n8n-mbb` runtime integration layer (`n8n` workflow-контур как standalone).
  - OAuth/file-protocol интеграции и custom provider nodes Legacy App-контекста без переоценки архитектуры.
  - Любые non-essential custom-logic bridges к внешним облакам без явного business-value.

### 8.2 Риск-реестр на следующем пакете

- Перед переносом первого workflow-пакета требуется решение:
  - ownership (owner/owner SLA),
  - timeout/retry policy,
  - secret-handling boundaries,
  - rollback trigger и `single-writer`-последовательность.

### 8.3 Что внедрено в этом пакете

- Добавлен единый readiness-гейт для переносов:
  - `npm run integrations:transfer:readiness`,
  - `scripts/infrastructure/check-integrations-transfer-readiness.js`.
- Подготовлен runbook `docs/runbooks/integrations-transfer-readiness.md` с обязательным набором для передачи workflow-пакета.
- Синхронизирован cloud baseline gate: `npm run cloud:deploy:readiness`.
