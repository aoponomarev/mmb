---
id: ssotidx-7f8e9d
status: active
last_updated: "2026-03-08"

---
<!-- SSOT Index: single entry point for finding canonical truth. AIS: id:ais-7f8e9d -->

# SSOT Index

Единый индекс: домен → SSOT-файл. Агенты ищут правду только здесь.

## Contract Plane (is/contracts/, core/config/)

| Домен | SSOT-файл | Описание |
|-------|-----------|----------|
| Пути | is/contracts/paths/paths.js | Абсолютные пути; CWD-independent |
| Path validation | is/contracts/path-contracts.js | EXCLUDE_SOURCE_REL, SKIP_LINK_PATTERNS, SEARCH_DIRS, resolvePath |
| Префиксы | is/contracts/prefixes.js | Naming prefixes (skills, modules) |
| Doc ids | is/contracts/docs/id-registry.json | id → path для markdown (skills, AIS, docs) |
| Code hashes | is/contracts/docs/code-file-registry.json | #JS-xxx → path |
| Resolve | is/contracts/docs/resolve-id.js | SSOT resolver для id: и #hash |
| Размещение папок | docs/ais/ais-folder-placement.md | id:ais-b3c4d5 — полная карта папок, логика размещения |
| Казуальность | is/skills/causality-registry.md | #for-X / #not-Y формулировки |
| Конфигурация UI | core/config/* | app-config, tooltips, modals, messages, workspace и др. |
| Env template | .env.example | Шаблон переменных окружения |

## Runtime SSOT (вне Contract Plane)

| Домен | SSOT-файл | Описание |
|-------|-----------|----------|
| Cache/Request policies | core/config/runtime-policies.js | TTL, intervals для topCoins, marketMetrics |

## Инфраструктура (когда развёрнута)

| Домен | SSOT-файл | Описание |
|-------|-----------|----------|
| Settings sync | INFRASTRUCTURE_CONFIG.yaml | Пути Cursor, Continue, Git; профили *(файл может отсутствовать)* |
| Docker | docker-compose.yml | Стек контейнеров |
| Pre-commit | scripts/git/preflight-solo.ps1 | Локальный flow перед коммитом |
| Preflight | is/scripts/preflight.js | #JS-NrBeANnz — главный архитектурный гейт |
| Cloudflare Edge | core/config/cloudflare-config.js | #JS-4r2GQb12 — Worker URLs, proxy endpoints |
| Observability (Sentry, PostHog, Firecrawl) | is/skills/arch-integration-sentry.md, arch-integration-posthog.md, arch-integration-firecrawl.md | id:sk-7f4e5d, sk-8e5f6a, sk-9f6a7b — skills; .cursor/rules/infra-*.mdc — rules |
| Module load order | core/modules-config.js | #JS-os34Gxk3 — порядок загрузки JS модулей |
| MCP manifests | is/mcp/* | package.json в каждом MCP-сервере |

## Resolve

- `id:xxx` → is/contracts/docs/id-registry.json
- `#JS-xxx` → is/contracts/docs/code-file-registry.json
- MCP tool `resolve_id` — использует resolve-id.js
