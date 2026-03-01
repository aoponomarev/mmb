# План_Cloudflare.md

> Категория: Подплан edge/cloud интеграций
> Статус: **Бэклог** (перенесено решением от 2026-03)

---

## Решение

Полный функциональный перенос Cloudflare-логики отложен. Текущий Target App использует Cloudflare Worker как CORS-прокси для `file://` совместимости — этот минимальный контур работает и не требует дополнительной миграции.

## Что реализовано

- Cloudflare Worker proxy для CORS (работает с `file://` и GitHub Pages).
- `.env.example` содержит Cloudflare env-ключи для contract parity.

## Что отложено

- Полный аудит use-cases Cloudflare в Target App.
- Минимальный набор workers/routes.
- Security/runtime контракты (runbook parity v1).
- Smoke/e2e контракт проверки.
- `cloud:deploy:readiness` baseline gate.

## Условие активации

При появлении новых Cloudflare-зависимых use-cases (D1 database, KV storage, дополнительные Workers).

---

*Перенесено в бэклог. Не учитывается в % готовности миграции.*
