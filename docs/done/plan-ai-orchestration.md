# План_AI_Orchestration.md

> Категория: План AI-оркестрации
> Статус: **Бэклог** (перенесено решением от 2026-03)

---

## Решение

Перенос полного AI-оркестрационного контура (model router, provider factories, runtime orchestrator loop) отложен в отдалённый бэклог. Текущий Target App не использует runtime AI-оркестрацию — AI-агенты работают через Cursor/MCP без собственного orchestration layer.

## Что зафиксировано из плана

- Архитектурная рамка: контракт на provider-set, fallback/timeout policy.
- MCP-сервер скилов работает и отдаёт контекст агентам.

## Что отложено

- `ai-model-registry.json` как SSOT-перекрёсток.
- `ai-model-router.json` для маршрутизации.
- `model-registry-reader.js` runtime.
- `model-orchestrator.js` (retry/fallback/fail-fast loop).
- Provider factories (`orchestration-provider-factories.js`).
- Smoke/e2e: `orchestration:runtime:smoke`, `orchestration:runtime:smoke:real`.
- Infrastructure cross-sweep e2e.

## Условие активации

При появлении runtime AI-провайдеров, требующих программной маршрутизации (не через Cursor IDE).

---

*Перенесено в бэклог. Не учитывается в % готовности миграции.*
