# План_Migration_Sync.md

> Категория: Координационный план миграции
> Статус: Активный
> Назначение: Единая матрица покрытия и синхронизации всех контуров Legacy App→Target App

---

## 1. Цель и роль документа

Этот документ задает контроль полноты миграции:
- что уже покрыто планами;
- какие источники Legacy App еще не имеют целевого плана;
- где принято решение `skip/defer` с обоснованием.

Документ является SSOT по связке:
`Источник Legacy App -> Целевой план Target App -> Статус миграции`.

---

## 2. Матрица покрытия: архитектурные документы Legacy App (`A_*.md`)

| Источник Legacy App | Target в Target App | Статус | Решение |
|---|---|---|---|
| `A_MASTER.md` | `skills/architecture/arch-master.md` + `План_MBB_to_MMB.md` | done | migrated |
| `A_SECURITY.md` | `skills/architecture/arch-security.md` + `План_Skills_MCP.md` | done | migrated |
| `A_INFRASTRUCTURE.md` | `skills/architecture/arch-infrastructure.md` + `План_Infrastructure_Docker.md` | partial | continue |
| `A_AI_ORCHESTRATION.md` | `План_AI_Orchestration.md` | partial | continue (contract framework v1 drafted, runtime implementation pending) |
| `A_CLOUDFLARE.md` | `План_Cloudflare.md` (внутри Integrations) | partial | continue (contract parity runbook active, deploy readiness baseline introduced) |
| `A_CORE_DATA_LOGIC.md` | `План_Backend_Core.md` | partial | continue (provider manager + provider contracts + cache/metrics/snapshot runtime + transport/http hardening + API client e2e contract) |
| `A_FRONTEND_CORE.md` | `План_Frontend_UI.md` | partial | continue (RRG-first migration: legacy reactivity replaced during transfer, no deferred reactivity debt) |
| `A_MONITORING.md` | `План_Monitoring.md` | done | migrated |
| `A_LIBS.md` | `План_Libs.md` | pending | migrate |
| `A_GITHUB_WORKSPACE.md` | `План_GitHub_Workspace.md` | done | migrated |
| `A_GITHUB_HYBRID_BEACON.md` | `План_GitHub_Workspace.md` | done | merged |
| `A_SKILLS.md` | `План_Skills_MCP.md` | partial | continue |
| `A_OBSIDIAN_SMART_INDEXER.md` | `План_Skills_MCP.md` + `План_GitHub_Workspace.md` | pending | split |
| `A_AIS_SETTINGS.md` | `План_Frontend_UI.md` | pending | merge-into |
| `A_MATH_MODELS.md` | `План_Domain_Models.md` (future) | defer | wait-code |
| `A_FIN_EVOLUTION.md` | `План_Domain_Models.md` (future) | defer | wait-code |
| `A_PORTFOLIO_SYSTEM.md` | `План_Domain_Models.md` (future) | defer | wait-code |
| `A_YANDEX_CLOUD.md` | `План_Yandex_Cloud.md` | partial | continue (contract parity runbook active, deploy readiness baseline introduced) |

---

## 3. Матрица покрытия: process/integrations блоки Legacy App

| Блок Legacy App | Target в Target App | Статус | Решение |
|---|---|---|---|
| Skills/MCP/Meta | `План_Skills_MCP.md` | active | continue (graph+health+causality gates enabled) |
| Causality Registry | `План_Causality_Rationale.md` | active | new (P1, base contour live) |
| Docker/Runtime | `План_Infrastructure_Docker.md` | active | continue (split compose baseline + persistent Target App runtime + coexistence with Legacy App confirmed + soft-gate P0) |
| External infra parity (Legacy App↔Target App) | `План_External_Infrastructure_Parity.md` | active | continue (Docker coexistence confirmed; Cloudflare/Yandex runbook parity checks added; gate upgraded to P1 hybrid) |
| Control Plane | `План_Control_Plane.md` | active | continue (v1 complete: bootstrap script + health-check + adapter-map Legacy App→Target App + operational command set verified) |
| Backend services | `План_Backend_Core.md` | active | continue (market snapshot runtime now has full transport/http/server hardening coverage including request-id sanitize, query guards, CORS, HEAD, service-state, response headers, fallback parity, runtime cache-aware smoke readiness/partial-degradation e2e, and API client e2e contract) |
| n8n/workflows | `План_Integrations_n8n.md` | partial | continue (первый пакет: аудит + whitelist/blacklist выполнен, миграция workflow отложена до этапа AI-Orchestration) |
| AI providers/orchestration | `План_AI_Orchestration.md` | partial | continue (v1 contract + ai-model-registry SSOT + provider smoke + readiness gate added; runtime orchestration checks still pending) |
| Monitoring/diagnostics | `План_Monitoring.md` + `План_Testing_Strategy.md` | done | migrated |
| Dependency governance | `План_Libs.md` | pending | migrate |
| GitHub/automation | `План_GitHub_Workspace.md` | done | migrated |
| Rollback/disaster recovery | `План_Rollback.md` | done | migrated |

---

## 4. Правила статусов

- `done`: контур покрыт документом + есть реализованные артефакты.
- `partial`: план есть, но отсутствует существенная часть реализации.
- `pending`: целевой план есть, перенос не начат.
- `defer`: перенос отложен до появления кода или новых требований.
- `skip`: перенос отменен как неактуальный для Target App (обязательно с причиной).

---

## 5. Контрольные ворота (gates)

Перед закрытием каждого этапа в `План_MBB_to_MMB.md` обязательно:
1. Обновить матрицы разделов 2-3 в этом документе.
2. Для всех `defer/skip` указать короткую причину.
3. Проверить отсутствие «осиротевших» источников Legacy App без target.
4. Синхронизировать статус в:
   - `docs/План_MBB_to_MMB.md`
   - `docs/План_Skills_MCP.md`
   - `skills/MIGRATION.md`

---

## 6. Стартовые приоритеты контуров (execution queue)

| Контурный план | Приоритет | Текущее решение |
|---|---|---|
| `План_Migration_Sync.md` | P0 | старт |
| `План_Infrastructure_Docker.md` | P0 | старт |
| `План_Control_Plane.md` | P0 | старт |
| `План_Backend_Core.md` | P1 | старт |
| `План_AI_Orchestration.md` | P1 | старт |
| `План_Integrations_n8n.md` | P1 | старт |
| `План_External_Infrastructure_Parity.md` | P1 | старт |
| `План_Frontend_UI.md` | P2 | defer |
| `План_Monitoring.md` | P2 | defer |
| `План_Libs.md` | P2 | defer |
| `План_GitHub_Workspace.md` | P2 | done |
| `План_Testing_Strategy.md` | P2 | done |
| `План_Rollback.md` | P2 | done |
| `План_Cloudflare.md` | P3 | defer |
| `План_Causality_Rationale.md` | P1 | старт |
| `План_Domain_Models.md` | P3 | defer |
| `План_Yandex_Cloud.md` | P3 | defer |

---

## 7. Протокол plan-sync: completed / changed / replaced

Синхронизация ведется по мета-скилу `plans-sync-governance`.

Для каждого изменения статуса:
1. Обновить исходный `План_*.md` (локальный чекбокс/статус).
2. Отразить изменение в `План_MBB_to_MMB.md`.
3. Отразить mapping-статус в этом документе.
4. При `replaced` указать заменяющий план и причину.

Никакое изменение в миграции не считается завершенным, пока статусы не синхронизированы во всех трех уровнях.

---

## 8. Cross-plan sync: контур "здоровья скилов"

Для контура Skills/MCP принято обязательное соответствие:

- Источник контроля: `План_Skills_MCP.md`, раздел "Контур здоровья скилов v2".
- Реализация: `scripts/architecture/validate-skill-graph.js` + `scripts/architecture/validate-skills-health.js`.
- Операционный контракт:
  1. При изменениях в `skills/**` запускать `skills:graph:check` и `skills:health:check`.
  2. Ошибки health-gate считаются блокирующими для завершения этапа.
  3. Warnings фиксируются как backlog на доработку freshness/sвязности.
