# План_Cloudflare.md

> Категория: Подплан edge/cloud интеграций
> Статус: Active (contract parity runbook phase)
> Источники: `A_CLOUDFLARE.md`, cloudflare-* навыки Legacy App

---

## 1. Контекст и границы

Контур описывает перенос Cloudflare-ориентированных интеграций (workers/api-proxy/rate-limiting),
если они подтверждены для target-архитектуры Target App.

## 2. Цели / Non-goals

**Цели:**
- выделить минимально полезный cloudflare-set;
- зафиксировать security и observability контракты;
- исключить зависимость от Legacy App-специфичной cloud-логики.

**Non-goals:**
- перенос всего cloudflare-слоя Legacy App без оценки ценности.

## 3. Зависимости

- Upstream: `План_Integrations_n8n.md`, `План_Infrastructure_Docker.md`
- Downstream: `План_Monitoring.md`, `План_Rollback.md`

## 4. Статус и решение

- Базовый статус: `active` (contract parity + runbook coverage).
- Реализация на текущем шаге: фиксируем runbook-контракт, smoke/e2e критерии и env-key parity для migration compatibility mode.
- Полный функциональный перенос cloudflare-логики остаётся `pending` до подтверждения use-cases.

## 5. Чек-лист

- [ ] Подтвердить use-cases Cloudflare в Target App.
- [ ] Определить минимальный набор workers/routes.
- [ ] Описать security/runtime контракты (runbook parity v1).
- [ ] Добавить smoke/e2e контракт проверки для migration compatibility.
- [ ] Подготовлен baseline cloud-readiness precheck (`cloud:deploy:readiness`) и обновлены parity-runbooks под deploy precheck protocol.
