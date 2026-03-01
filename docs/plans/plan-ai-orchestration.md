# План_AI_Orchestration.md

> Категория: План AI-оркестрации
> Статус: Черновик
> Источники: `A_AI_ORCHESTRATION.md`, LLM/MCP/Continue интеграции Legacy App

---

## 1. Контекст и границы

Контур включает выбор и оркестрацию LLM-провайдеров, MCP-взаимодействие и fallback-политику.
Не включает UI-слой и доменную бизнес-логику.

## 2. Цели / Non-goals

**Цели:**
- собрать единый контракт использования моделей и провайдеров;
- стандартизовать timeout/fallback/retry;
- отделить vendor-specific настройки от общего orchestration слоя.

**Non-goals:**
- тюнинг качества моделей под все задачи на старте;
- перенос всех исторических провайдеров Legacy App без re-evaluation.

## 3. Почему этот подход

- multi-provider orchestration без единого контракта быстро деградирует;
- failover стратегия снижает риск остановки разработки при проблемах у одного API;
- явные policy проще автоматизировать тестами.

## 4. Альтернативы

- один провайдер без fallback — отклонено (single point of failure).
- полный vendor abstraction слой сразу — отложено до стабилизации v1.

## 5. Зависимости

- Upstream: `План_Integrations_n8n.md`, `План_Control_Plane.md`, `План_Skills_MCP.md`
- Downstream: `План_Monitoring.md`, `План_Testing_Strategy.md`

## 6. Риски и снижение

- rate limits / outages -> provider failover и graceful degradation.
- несогласованность model configs -> единый config contract + validation.
- drift в промпт-протоколах -> versioned prompt registry.

## 7. Definition of Done

- описан и принят orchestration contract v1;
- настроены fallback/timeout правила для критичных сценариев;
- есть smoke/chaos сценарии на отказ провайдера.

## 8. Чек-лист

- [ ] Аудит текущих AI-интеграций Legacy App (через `docs/План_Integrations_n8n.md`, runbook внешних контрактов, текущие MCP-исполнители и backend-конфигурации).
- [ ] Определение минимального provider-set для Target App:
  - `provider:coingecko`, `provider:binance-metrics`, `provider:mcp-skills` как критичный ядро-профиль.
- [ ] Формализация fallback/timeout/retry контракта:
  - Драфт контракта создан в `docs/runbooks/ai-orchestration-contract.md` (v1),
  - для критичных цепочек приоритеты fallback, backoff и дедлоков не закрыты окончательно (`temporary-deviation` до следующего пакета).
- [ ] Зафиксирован единый trust layer для моделей:
  - добавлен `docs/ai-model-registry.json` как SSOT модели/критичности/доступности;
  - добавлен `npm run orchestration:model-registry:check` с валидацией staleness/benchmarks/fallback consistency;
  - временно считаем приемлемым v1 с строгим `fail-fast` для critical flows и контролируемым graceful degradation только по explicit registry rules.
- [ ] Включение проверок в test/monitoring контуры:
  - `npm run orchestration:model-registry:check`,
  - `npm run orchestration:provider:smoke`,
  - `npm run integrations:transfer:readiness`,
  - smoke-переходы в `docs/runbooks/orchestration-provider-smoke.md` + `docs/runbooks/integrations-transfer-readiness.md`.

### 8.1 Что перенесено в следующий пакет (операционный статус)
- Стартовая точка Stage 5: зафиксирована архитектурная рамка и минимальный provider-set без внесения runtime-кода оркестратора.
- Для следующего пакета подготовлены критерии:
  - единый `model-router config schema`,
  - registry promt templates,
  - единый `model-id`/`registry` policy для проверки рассинхрона доступности;
  - контрактные smoke-проверки ошибок провайдера (`HTTP`/`rate-limit`/`auth`/`timeout`).

### 8.2 Завершён пакет Stage 5: model-router runtime-контур (v1)
- [ ] Введен единый `docs/ai-model-router.json` как routable SSOT-перекресток для оркестрации.
- [ ] Добавлен runtime-ридер `core/ai-orchestration/model-registry-reader.js`:
  - чтение `docs/ai-model-registry.json`,
  - резолвинг route→candidate,
  - проверка reachability по `availability + staleness`.
- [ ] Добавлены проверки:
  - `npm run orchestration:model-router:check` (`scripts/infrastructure/validate-ai-model-router.js`),
  - `npm run orchestration:router:smoke` (`scripts/infrastructure/check-orchestration-router-scenarios.js`),
  - расширен preflight для проверки связки model-registry + router.
- [ ] Обновлён `docs/runbooks/ai-orchestration-contract.md` и `scripts/README.md` под новый runtime-слой.

### 8.3 Реализован runtime-orchestrator loop для маршрутизации
- [ ] Добавлен runtime-слой выполнения `core/ai-orchestration/model-orchestrator.js`:
  - маршрутизация по `docs/ai-model-router.json`,
  - retry-policy из `docs/ai-model-registry.json`,
  - fail-fast для auth/контрактных ошибок,
  - fallback на `next-provider`/`graceful-degraded` по policy.
- [ ] Добавлен `npm run orchestration:runtime:smoke`:
  - `scripts/infrastructure/check-orchestration-runtime-smoke.js` (проверяет fail-fast/retry/fallback/critical-path на уровне runtime loop).

### 8.4 Интегрирован real-adapter путь для HTTP-провайдера
- [ ] Добавлен `core/ai-orchestration/orchestration-provider-factories.js`:
  - централизованный конструктор invoke-функций для `provider:coingecko`,
  - stub-провайдер `provider:mcp-skills` (временно safe-fallback до подключения MCP runtime в Target App).
- [ ] Улучшен `core/ai-orchestration/model-orchestrator.js`:
  - deterministic `requestId` для трассировки каждого вызова,
  - `metrics`-блок в результате (`retryCount`, `providers`) для smoke-валидаций.
- [ ] Добавлен `npm run orchestration:runtime:smoke:real`:
  - `scripts/infrastructure/check-orchestration-runtime-realistic-smoke.js` (real adapter smoke: timeout/retry/fallback/auth на mock-fetch path с requestId/metrics assertions).

### 8.5 Завершён финальный инфраструктурный sweep Stage 5
- [ ] Добавлен `npm run infrastructure:cross-sweep:e2e` (`scripts/infrastructure/check-infrastructure-cross-sweep.js`) как сквозной чек для:
  - orchestration-контуров (`model-registry`, `model-router`, runtime/real smoke),
  - readiness (`external parity`, `single-writer`),
  - backend рантайма (`backend:*e2e`, `transport`/`runtime-smoke`),
  - frontend smoke-цепочки и фронтового hardening.
