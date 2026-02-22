# План_Migration_Sync.md

> Категория: Координационный план миграции
> Статус: Активный
> Назначение: Единая матрица покрытия и синхронизации всех контуров MBB→MMB

---

## 1. Цель и роль документа

Этот документ задает контроль полноты миграции:
- что уже покрыто планами;
- какие источники MBB еще не имеют целевого плана;
- где принято решение `skip/defer` с обоснованием.

Документ является SSOT по связке:
`Источник MBB -> Целевой план MMB -> Статус миграции`.

---

## 2. Матрица покрытия: архитектурные документы MBB (`A_*.md`)

| Источник MBB | Target в MMB | Статус | Решение |
|---|---|---|---|
| `A_MASTER.md` | `skills/architecture/arch-master.md` + `План_MBB_to_MMB.md` | done | migrated |
| `A_SECURITY.md` | `skills/architecture/arch-security.md` + `План_Skills_MCP.md` | done | migrated |
| `A_INFRASTRUCTURE.md` | `skills/architecture/arch-infrastructure.md` + `План_Infrastructure_Docker.md` | partial | continue |
| `A_AI_ORCHESTRATION.md` | `План_AI_Orchestration.md` | pending | migrate |
| `A_CLOUDFLARE.md` | `План_Cloudflare.md` (внутри Integrations) | pending | migrate |
| `A_CORE_DATA_LOGIC.md` | `План_Backend_Core.md` | pending | migrate |
| `A_FRONTEND_CORE.md` | `План_Frontend_UI.md` | partial | continue |
| `A_MONITORING.md` | `План_Monitoring.md` | pending | migrate |
| `A_LIBS.md` | `План_Libs.md` | pending | migrate |
| `A_GITHUB_WORKSPACE.md` | `План_GitHub_Workspace.md` | pending | migrate |
| `A_GITHUB_HYBRID_BEACON.md` | `План_GitHub_Workspace.md` | pending | merge-into |
| `A_SKILLS.md` | `План_Skills_MCP.md` | partial | continue |
| `A_OBSIDIAN_SMART_INDEXER.md` | `План_Skills_MCP.md` + `План_GitHub_Workspace.md` | pending | split |
| `A_AIS_SETTINGS.md` | `План_Frontend_UI.md` | pending | merge-into |
| `A_MATH_MODELS.md` | `План_Domain_Models.md` (future) | defer | wait-code |
| `A_FIN_EVOLUTION.md` | `План_Domain_Models.md` (future) | defer | wait-code |
| `A_PORTFOLIO_SYSTEM.md` | `План_Domain_Models.md` (future) | defer | wait-code |
| `A_YANDEX_CLOUD.md` | `План_Yandex_Cloud.md` | defer | optional-legacy |

---

## 3. Матрица покрытия: process/integrations блоки MBB

| Блок MBB | Target в MMB | Статус | Решение |
|---|---|---|---|
| Skills/MCP/Meta | `План_Skills_MCP.md` | active | continue (graph+health gates enabled) |
| Docker/Runtime | `План_Infrastructure_Docker.md` | pending | migrate |
| External infra parity (MBB↔MMB) | `План_External_Infrastructure_Parity.md` | active | continue |
| Control Plane | `План_Control_Plane.md` | pending | migrate |
| Backend services | `План_Backend_Core.md` | pending | migrate |
| n8n/workflows | `План_Integrations_n8n.md` | pending | migrate |
| AI providers/orchestration | `План_AI_Orchestration.md` | pending | migrate |
| Monitoring/diagnostics | `План_Monitoring.md` + `План_Testing_Strategy.md` | pending | migrate |
| Dependency governance | `План_Libs.md` | pending | migrate |
| GitHub/automation | `План_GitHub_Workspace.md` | pending | migrate |
| Rollback/disaster recovery | `План_Rollback.md` | pending | migrate |

---

## 4. Правила статусов

- `done`: контур покрыт документом + есть реализованные артефакты.
- `partial`: план есть, но отсутствует существенная часть реализации.
- `pending`: целевой план есть, перенос не начат.
- `defer`: перенос отложен до появления кода или новых требований.
- `skip`: перенос отменен как неактуальный для MMB (обязательно с причиной).

---

## 5. Контрольные ворота (gates)

Перед закрытием каждого этапа в `План_MBB_to_MMB.md` обязательно:
1. Обновить матрицы разделов 2-3 в этом документе.
2. Для всех `defer/skip` указать короткую причину.
3. Проверить отсутствие «осиротевших» источников MBB без target.
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
| `План_GitHub_Workspace.md` | P2 | defer |
| `План_Testing_Strategy.md` | P2 | defer |
| `План_Rollback.md` | P2 | defer |
| `План_Cloudflare.md` | P3 | defer |
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
