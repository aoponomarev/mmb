# План_Migration_Sync.md

> Категория: Координационный план миграции
> Статус: **Завершён** (все контуры финализированы)

---

## 1. Цель и роль документа

Единая матрица покрытия и синхронизации всех контуров Legacy App→Target App. Финальная ревизия.

---

## 2. Матрица покрытия: архитектурные документы Legacy App (`A_*.md`)

| Источник Legacy App | Target в Target App | Статус | Решение |
|---|---|---|---|
| `A_MASTER.md` | `is/skills/arch-foundation.md` + мастер-план | done | migrated |
| `A_SECURITY.md` | `is/skills/arch-foundation.md` (secret resilience) | done | migrated |
| `A_INFRASTRUCTURE.md` | `is/skills/arch-external-parity.md` | done (parity) / backlog (Docker) | split |
| `A_AI_ORCHESTRATION.md` | `docs/done/plan-ai-orchestration.md` | backlog | deferred |
| `A_CLOUDFLARE.md` | `docs/done/plan-cloudflare.md` | backlog | deferred |
| `A_CORE_DATA_LOGIC.md` | `is/skills/arch-backend-core.md` | done | migrated |
| `A_FRONTEND_CORE.md` | `docs/done/plan-frontend-ui.md` | excluded | UI works as-is |
| `A_MONITORING.md` | `is/skills/arch-monitoring.md` | done | migrated |
| `A_LIBS.md` | `is/skills/arch-dependency-governance.md` | done | migrated |
| `A_GITHUB_WORKSPACE.md` | `is/skills/arch-testing-ci.md` | done | migrated |
| `A_GITHUB_HYBRID_BEACON.md` | `is/skills/arch-testing-ci.md` | done | merged |
| `A_SKILLS.md` | `is/skills/arch-skills-mcp.md` | done | migrated (simplified) |
| `A_OBSIDIAN_SMART_INDEXER.md` | Not needed | skip | Single-project, no Obsidian vault |
| `A_AIS_SETTINGS.md` | Not needed | skip | Covered by UI as-is |
| `A_MATH_MODELS.md` | `docs/done/plan-domain-models.md` | defer | wait-code |
| `A_FIN_EVOLUTION.md` | `docs/done/plan-domain-models.md` | defer | wait-code |
| `A_PORTFOLIO_SYSTEM.md` | `docs/done/plan-domain-models.md` | defer | wait-code |
| `A_YANDEX_CLOUD.md` | `docs/done/plan-yandex-cloud.md` | backlog | deferred |

---

## 3. Матрица покрытия: process/integrations блоки Legacy App

| Блок Legacy App | Target в Target App | Статус | Решение |
|---|---|---|---|
| Skills/MCP/Meta | `is/skills/arch-skills-mcp.md` | done | simplified v1 |
| Causality Registry | `is/skills/arch-causality.md` | done | simplified (textual) |
| Docker/Runtime | `docs/done/plan-infrastructure-docker.md` | backlog | deferred |
| External infra parity | `is/skills/arch-external-parity.md` | done | core contracts implemented |
| Control Plane | `is/skills/arch-control-plane.md` | done | v1 complete |
| Backend services | `is/skills/arch-backend-core.md` | done | full Stage 3 |
| n8n/workflows | `docs/done/plan-integrations-n8n.md` | backlog | deferred |
| AI orchestration | `docs/done/plan-ai-orchestration.md` | backlog | deferred |
| Monitoring | `is/skills/arch-monitoring.md` | done | full baseline v1 |
| Dependency governance | `is/skills/arch-dependency-governance.md` | done | policy established |
| GitHub/automation | `is/skills/arch-testing-ci.md` | done | CI baseline |
| Rollback/DR | `is/skills/arch-rollback.md` | done | protocol established |
| Testing | `is/skills/arch-testing-ci.md` | done | 40 tests, node:test |
| Naming/Paths | `is/skills/arch-foundation.md` | done | Zod contracts |

---

## 4. Финальная статистика

| Статус | Количество контуров |
|---|---|
| **done** | 12 |
| **backlog** | 5 (Docker, Cloudflare, Yandex, AI Orchestration, n8n) |
| **excluded** | 1 (Frontend UI) |
| **defer** | 1 (Domain Models — wait-code) |
| **skip** | 2 (Obsidian, AIS Settings) |

---

## 5. Архитектурные скилы (полный реестр)

| Скил | Домен |
|---|---|
| `is/skills/arch-foundation.md` | Naming, paths, SSOT contracts |
| `is/skills/arch-control-plane.md` | Control plane bootstrap |
| `is/skills/arch-testing-ci.md` | Testing strategy & CI |
| `is/skills/arch-monitoring.md` | Monitoring & observability |
| `is/skills/arch-backend-core.md` | Backend data pipeline |
| `is/skills/arch-dependency-governance.md` | Dependency management |
| `is/skills/arch-rollback.md` | Rollback & recovery |
| `is/skills/arch-skills-mcp.md` | Skills & MCP system |
| `is/skills/arch-causality.md` | Causality tracking |
| `is/skills/arch-external-parity.md` | External infra parity |

---

*Документ завершён. Все контуры имеют финальный статус.*
