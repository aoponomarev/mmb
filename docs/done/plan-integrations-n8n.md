# План_Integrations_n8n.md

> Категория: План интеграций и n8n
> Статус: **Бэклог** (перенесено решением от 2026-03)

---

## Решение

Перенос n8n workflow-контура и внешних интеграций отложен в отдалённый бэклог. Первичный аудит workflow выполнен, whitelist/blacklist составлен.

## Что выполнено

- Аудит workflow Legacy App.
- Whitelist (приоритетные для переноса): `market-metrics-service`, `binance-metrics-provider`, `coingecko-provider`, `market-snapshot-*`, `market-snapshot-client` — все перенесены в `core/api/` как backend-модули (без n8n dependency).
- Blacklist: `n8n-mbb` runtime, OAuth/file-protocol, custom provider nodes.
- Readiness runbook: `docs/runbooks/integrations-transfer-readiness.md` — подготовлен в доноре, не перенесён (не нужен без n8n).

## Что отложено

- n8n runtime integration layer.
- Custom provider nodes.
- OAuth/file-protocol интеграции.
- `npm run integrations:transfer:readiness`.

## Условие активации

При потребности в workflow-автоматизации, выходящей за рамки скриптов и npm-команд.

---

*Перенесено в бэклог. Не учитывается в % готовности миграции.*
