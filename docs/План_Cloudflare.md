# План_Cloudflare.md

> Категория: Подплан edge/cloud интеграций
> Статус: Черновик
> Источники: `A_CLOUDFLARE.md`, cloudflare-* навыки MBB

---

## 1. Контекст и границы

Контур описывает перенос Cloudflare-ориентированных интеграций (workers/api-proxy/rate-limiting),
если они подтверждены для target-архитектуры MMB.

## 2. Цели / Non-goals

**Цели:**
- выделить минимально полезный cloudflare-set;
- зафиксировать security и observability контракты;
- исключить зависимость от MBB-специфичной cloud-логики.

**Non-goals:**
- перенос всего cloudflare-слоя MBB без оценки ценности.

## 3. Зависимости

- Upstream: `План_Integrations_n8n.md`, `План_Infrastructure_Docker.md`
- Downstream: `План_Monitoring.md`, `План_Rollback.md`

## 4. Статус и решение

- Базовый статус: `pending` (перенос по требованию).
- При отсутствии бизнес-кейса допускается `defer` через `План_Migration_Sync.md`.

## 5. Чек-лист

- [ ] Подтвердить use-cases Cloudflare в MMB.
- [ ] Определить минимальный набор workers/routes.
- [ ] Описать security/runtime контракты.
- [ ] Включить в тестовый и мониторинговый контуры.
