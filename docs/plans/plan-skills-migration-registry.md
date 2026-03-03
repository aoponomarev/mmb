# Реестр: Миграция скиллов из репозитория a в Target App (mmb)

> **Категория**: Мастер-план (Индексатор)
> **Дата**: 2026-03-02
> **Источники**: `a/skills/mbb/skills/`, `a/skills/all/skills/`, `a/mbb/skills/`
> **Целевая архитектура**: `is/skills/`, `core/skills/`, `app/skills/` (см. `process-skill-governance.md`)

---

## Реестр префиксов именования (Skill Naming Prefix Contract)

**SSOT:** `is/contracts/prefixes.js` — единый глобальный реестр префиксов (skills + modules).

### Целевые префиксы (Target App) — см. `is/contracts/prefixes.js`

| Категория | Префиксы |
|-----------|----------|
| Layer | `a-`, `ai-`, `ais-`, `is-` |
| Concept | `ssot-`, `protocol-`, `contract-` |
| Vendor | `yc-`, `cf-`, `gh-` |
| Lifecycle | `migrate-`, `rollback-`, `deploy-` |
| Domain | `sec-`, `test-`, `ci-` |
| Tech | `db-`, `mcp-`, `n8n-`, `docker-` |
| Doc | `runbook-`, `plan-` |
| Legacy | `arch-`, `process-` |
| core/skills | `CORE_RECOMMENDED` (рекомендуется) |
| app/skills | `APP_RECOMMENDED` (рекомендуется) |

**Обязательство для ИИ-агентов:** При создании скилла с новым префиксом — проверить реестр; если подходящего нет — зарегистрировать префикс в `is/contracts/prefixes.js`.

**Гейт:** `validate-skills.js` проверяет префиксы для `is/skills/` — preflight падает при нарушении.

### Устаревшие префиксы (Donor) → Target mapping

| Старый префикс (a) | Целевой префикс | Примечание |
|--------------------|-----------------|------------|
| `architecture-` | `a-` или `arch-` | a- канонический |
| `arch-` | `a-` | Миграция на канонический |
| `process-` | `ai-`, `is-` или `process-` | По контексту: AI→ai-, infra→is- |
| `protocol-` | `a-`, `ai-` или `is-` | По контексту |
| `infra-` | `is-` или `a-` | infra→is- |
| `integrations-` | core/skills | `api-`, `external-` или без префикса | По поддомену |
| `components-` | app/skills | `component-` или без префикса | Единственное число |
| `cache-` | core/skills | `cache-` | Без изменений |
| `libs-` | is/skills или core | `process-lib-` или `config-` | По контексту |
| `metrics-` | core/skills | `metrics-` или `domain-` | По контексту |
| `core-systems-` | core/skills | без префикса, по поддомену | messages, config, workspace |
| `cloud-` | is/skills или docs/ais | `arch-` или runbook | Yandex/Cloudflare → arch- |
| `troubleshooting-`, `troubleshoot-` | docs/runbooks | — | Не скилл, runbook |
| `ux-` | app/skills | `ux-` | Без изменений |
| `skill-`, `index-` | — | DEPRECATED | Не переносить |

### Специальные файлы (без префикса)

| Файл | Назначение |
|------|------------|
| `causality-registry.md` | Реестр хешей (системный) |
| `README.md` | Описание папки skills |
| `references/*.md` | Справочники (не скиллы) |

---

## Регламент перепроверки старых имён при трансформациях

**При каждой агрегации, декомпозиции или переименовании скиллов** агент/разработчик обязан:

1. **Проверить реестр префиксов** — новое имя должно соответствовать таблице целевых префиксов.
2. **Сверить с маппингом Donor → Target** — если источник из репозитория a, применить правило трансляции.
3. **Обновить этот документ** — при слиянии/разделении обновить строку в таблицах миграции (статус, целевой скилл).
4. **Запустить гейт** — `npm run skills:check` проверяет префиксы для `is/skills/` (см. `validate-skills.js`).
5. **Обновить id-registry** — при переименовании перегенерировать `generate-id-registry.js` (preflight делает это).

---

## Легенда статусов

| Статус | Описание |
|--------|----------|
| `MIGRATED` | Скилл уже перенесён в Target App (mmb), эквивалент существует |
| `PARTIAL` | Частично покрыт — часть контента в mmb, но есть доп. материал в a |
| `NOT_MIGRATED` | Не перенесён, требуется миграция |
| `DEPRECATED` | Устарел, не переносить (или заменить другим) |
| `MERGE` | Объединить с существующим скиллом |
| `DECOMPOSE` | Разбить на несколько скиллов по слоям |
| `ADAPT` | Требуется адаптация под новую архитектуру |
| `OPTIMIZE` | Требуется оптимизация (структура, токены, ссылки) |

---

## Сводка

| Источник | Всего | MIGRATED | PARTIAL | NOT_MIGRATED | DEPRECATED | Действия |
|----------|-------|----------|---------|--------------|------------|----------|
| skills/mbb/skills/ | 153 | ~25 | ~15 | ~95 | ~18 | см. таблицы ниже |
| skills/all/skills/ | 38 | ~8 | ~5 | ~22 | ~3 | см. таблицы ниже |
| mbb/skills/ | 5 | 3 | 1 | 1 | 0 | см. таблицы ниже |
| **Итого** | **196** | **~36** | **~21** | **~118** | **~21** | — |

---

## 1. skills/mbb/skills/ — MBB-специфичные скиллы

### 1.1 Architecture

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `architecture/architecture-core-stack.md` | PARTIAL | `arch-foundation` | Адаптировать: убрать MBB, добавить ссылки на PATHS |
| `architecture/architecture-client-vs-cloud.md` | NOT_MIGRATED | `arch-backend-core` или `core/skills/external-integrations` | MERGE |
| `architecture/architecture-dom-markup.md` | NOT_MIGRATED | `app/skills/ui-architecture` | ADAPT |
| `architecture/architecture-loading.md` | NOT_MIGRATED | `arch-backend-core` или `core/skills/` | ADAPT |
| `architecture/architecture-mcp-ui-interaction.md` | PARTIAL | `arch-mcp-ecosystem` | MERGE |
| `architecture/architecture-provider-metadata.md` | NOT_MIGRATED | `core/skills/data-providers-architecture` | MERGE |
| `architecture/architecture-relative-paths.md` | PARTIAL | `arch-foundation` (PATHS) | MERGE |
| `architecture/architecture-ssot.md` | MIGRATED | `arch-foundation` | — |
| `architecture/architecture-versioning.md` | NOT_MIGRATED | `core/skills/cache-layer` | MERGE |
| `architecture/llm-fallback-mechanism.md` | PARTIAL | `core/skills/ai-providers-architecture` | MERGE |
| `architecture/skills-architecture-ssot.md` | MIGRATED | `arch-skills-mcp` | — |

### 1.2 Archive (не переносить)

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `archive/integrations-status.md` | DEPRECATED | — | Не переносить |
| `archive/integrations-strategy.md` | DEPRECATED | — | Не переносить |

### 1.3 Cache

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `cache/cache-strategy.md` | PARTIAL | `core/skills/cache-layer` | MERGE |
| `cache/cache-keys.md` | NOT_MIGRATED | `core/skills/cache-layer` | MERGE |
| `cache/cache-versioning.md` | NOT_MIGRATED | `core/skills/cache-layer` | MERGE |

### 1.4 Cloud

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `cloud/yandex-cloud-function-code.md` | NOT_MIGRATED | `is/skills/arch-cloudflare-infrastructure` или `docs/ais/` | ADAPT |
| `cloud/yandex-cloud-function-steps-guide.md` | NOT_MIGRATED | `docs/ais/` или runbook | ADAPT |
| `cloud/yandex-get-api-key.md` | NOT_MIGRATED | `docs/runbooks/` | ADAPT |
| `cloud/yandex-mbb-api-deploy.md` | NOT_MIGRATED | `docs/ais/` | ADAPT |

### 1.5 Components

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `components/components-bootstrap.md` | MIGRATED | `app/skills/bootstrap-vue-integration` | — |
| `components/components-boundaries.md` | NOT_MIGRATED | `app/skills/ui-architecture` | MERGE |
| `components/components-class-manager.md` | MIGRATED | `app/skills/component-classes-management` | — |
| `components/components-column-visibility.md` | NOT_MIGRATED | `app/skills/ui-architecture` | MERGE |
| `components/components-icon-manager.md` | MIGRATED | `app/skills/` (icon-manager) | Проверить |
| `components/components-layout-alignment.md` | NOT_MIGRATED | `app/skills/ui-architecture` | MERGE |
| `components/components-localization.md` | MIGRATED | `app/skills/reactive-localization` | — |
| `components/components-modal-buttons.md` | NOT_MIGRATED | `app/skills/ui-architecture` | MERGE |
| `components/components-responsive-visibility.md` | NOT_MIGRATED | `app/skills/ui-architecture` | MERGE |
| `components/components-ssot.md` | PARTIAL | `arch-foundation` | MERGE |
| `components/components-styling-principles.md` | NOT_MIGRATED | `app/skills/ux-principles` | MERGE |
| `components/components-template-split.md` | NOT_MIGRATED | `app/skills/vue-implementation-patterns` | MERGE |
| `components/components-tooltips.md` | NOT_MIGRATED | `app/skills/` | ADAPT |
| `components/ui-components-unified.md` | NOT_MIGRATED | `app/skills/ui-architecture` | MERGE |

### 1.6 Core Systems

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `core-systems/auto-coin-sets.md` | NOT_MIGRATED | `core/skills/domain-portfolio` | MERGE |
| `core-systems/messages-keys-and-config.md` | PARTIAL | `core/skills/messages-architecture` | MERGE |
| `core-systems/messages-translator.md` | PARTIAL | `core/skills/messages-architecture` | MERGE |
| `core-systems/messages-ui-and-lifecycle.md` | MIGRATED | `core/skills/messages-architecture` | — |
| `core-systems/workspace-config.md` | NOT_MIGRATED | `core/skills/config-contracts` | MERGE |

### 1.7 Integrations

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `integrations/continue-cli-mcp-integration-nuances.md` | NOT_MIGRATED | `is/skills/arch-mcp-ecosystem` | ADAPT |
| `integrations/integration-artificial-analysis-iq.md` | NOT_MIGRATED | `core/skills/ai-providers-architecture` | ADAPT |
| `integrations/integration-mcp-sdk-security-rollout.md` | NOT_MIGRATED | `is/skills/arch-mcp-ecosystem` | ADAPT |
| `integrations/integrations-ai-core.md` | MIGRATED | `core/skills/ai-providers-architecture` | — |
| `integrations/integrations-api-proxy.md` | NOT_MIGRATED | `core/skills/external-integrations` | ADAPT |
| `integrations/integrations-auth-worker-restore.md` | NOT_MIGRATED | `docs/runbooks/` | ADAPT |
| `integrations/integrations-cloudflare-core.md` | PARTIAL | `is/skills/arch-cloudflare-infrastructure` | MERGE |
| `integrations/integrations-cloudflare-plan.md` | NOT_MIGRATED | `docs/plans/` | ADAPT |
| `integrations/integrations-cloudflare-testing.md` | NOT_MIGRATED | `is/skills/arch-testing-ci` | MERGE |
| `integrations/integrations-continue-cli-mistral.md` | NOT_MIGRATED | `arch-mcp-ecosystem` | ADAPT |
| `integrations/integrations-continue-mcp-setup.md` | NOT_MIGRATED | `docs/runbooks/` | ADAPT |
| `integrations/integrations-data-provider-resilience.md` | NOT_MIGRATED | `core/skills/data-providers-architecture` | MERGE |
| `integrations/integrations-data-providers.md` | MIGRATED | `core/skills/data-providers-architecture` | — |
| `integrations/integrations-llm-providers-config.md` | NOT_MIGRATED | `core/skills/ai-providers-architecture` | MERGE |
| `integrations/integrations-n8n-api-access.md` | NOT_MIGRATED | `arch-mcp-ecosystem` | ADAPT |
| `integrations/integrations-n8n-code-node-v2.md` | NOT_MIGRATED | `arch-mcp-ecosystem` | ADAPT |
| `integrations/integrations-n8n-docker-internals.md` | NOT_MIGRATED | `docs/runbooks/` | ADAPT |
| `integrations/integrations-n8n-local-setup.md` | NOT_MIGRATED | `docs/runbooks/` | ADAPT |
| `integrations/integrations-oauth-file-protocol.md` | NOT_MIGRATED | `app/skills/file-protocol-cors-guard` | MERGE |
| `integrations/integrations-overview.md` | PARTIAL | `core/skills/external-integrations` | MERGE |
| `integrations/integrations-postgres.md` | NOT_MIGRATED | `core/skills/data-providers-architecture` | MERGE |
| `integrations/integrations-rate-limiting.md` | NOT_MIGRATED | `core/skills/data-providers-architecture` | MERGE |
| `integrations/mcp-server-yaml-parsing.md` | NOT_MIGRATED | `arch-mcp-ecosystem` | ADAPT |
| `integrations/perplexity-connect.md` | NOT_MIGRATED | `core/skills/ai-providers-architecture` | MERGE |

### 1.8 Libs

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `libs/libs-mbb-auto-activation.md` | NOT_MIGRATED | `core/skills/config-contracts` | ADAPT |
| `libs/libs-mbb-config.md` | NOT_MIGRATED | `core/skills/config-contracts` | ADAPT |
| `libs/libs-metadata-generation.md` | NOT_MIGRATED | `core/skills/` | ADAPT |
| `libs/libs-repo-setup.md` | NOT_MIGRATED | `is/skills/arch-layout-governance` | ADAPT |
| `libs/libs-zod-v3-v4-compat-layer.md` | NOT_MIGRATED | `is/skills/process-lib-governance` | MERGE |

### 1.9 Metrics

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `metrics/metrics-models.md` | MIGRATED | `core/skills/metrics-air-model` | — |
| `metrics/metrics-portfolio-structure.md` | PARTIAL | `core/skills/domain-portfolio` | MERGE |
| `metrics/metrics-validation.md` | NOT_MIGRATED | `core/skills/data-providers-architecture` | MERGE |

### 1.10 Process (skills/mbb/skills/process/)

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `process-agentic-self-correction.md` | NOT_MIGRATED | `is/skills/process-ai-collaboration` | MERGE |
| `autonomous-skill-synthesis.md` | NOT_MIGRATED | `arch-skills-mcp` | ADAPT |
| `process-autonomous-quality-gate.md` | NOT_MIGRATED | `arch-testing-ci` | ADAPT |
| `process-batch-skills-review.md` | NOT_MIGRATED | `arch-skills-mcp` | ADAPT |
| `process-better-sqlite3-node-abi-gate.md` | NOT_MIGRATED | `is/skills/` | ADAPT |
| `process-bug-resolution-protocol.md` | NOT_MIGRATED | `app/skills/` или `process-ai-collaboration` | ADAPT |
| `process-commit-analysis-heuristics.md` | NOT_MIGRATED | `arch-skills-mcp` | ADAPT |
| `process-commit-skill-extraction.md` | NOT_MIGRATED | `arch-skills-mcp` | ADAPT |
| `process-continue-config-ssot.md` | NOT_MIGRATED | `arch-foundation` | ADAPT |
| `process-continue-mcp-synergy.md` | NOT_MIGRATED | `arch-mcp-ecosystem` | MERGE |
| `process-cursor-settings-management.md` | NOT_MIGRATED | `arch-mcp-ecosystem` | ADAPT |
| `process-disaster-recovery.md` | NOT_MIGRATED | `arch-rollback` | MERGE |
| `process-docker-compose-release-validation.md` | NOT_MIGRATED | `arch-testing-ci` | ADAPT |
| `process-docker-disaster-recovery.md` | NOT_MIGRATED | `arch-rollback` | MERGE |
| `process-docker-resource-governance.md` | NOT_MIGRATED | `arch-backend-core` | ADAPT |
| `process-dynamic-context-management.md` | NOT_MIGRATED | `process-token-discipline` | MERGE |
| `process-env-sync-governance.md` | MIGRATED | `is/skills/process-env-sync` | — |
| `process-external-integration-closure.md` | PARTIAL | `arch-external-parity` | MERGE |
| `process-future-skill-impact-analysis.md` | NOT_MIGRATED | `arch-skills-mcp` | ADAPT |
| `process-git-foundation-reliability.md` | NOT_MIGRATED | `arch-foundation` | ADAPT |
| `process-git-local-ci-mirror.md` | NOT_MIGRATED | `arch-testing-ci` | ADAPT |
| `process-git-submodule-drift-control.md` | NOT_MIGRATED | `arch-foundation` | ADAPT |
| `process-git-submodule-resilience.md` | NOT_MIGRATED | `arch-foundation` | ADAPT |
| `process-github-workflow.md` | NOT_MIGRATED | `arch-mcp-ecosystem` | ADAPT |
| `process-infrastructure-maintenance.md` | NOT_MIGRATED | `arch-foundation` | ADAPT |
| `process-km-v2-maintenance.md` | DEPRECATED | — | Не переносить (KM v2 устарел) |
| `process-logging-strategy.md` | NOT_MIGRATED | `arch-monitoring` | MERGE |
| `process-model-registry-maintenance.md` | NOT_MIGRATED | `core/skills/ai-providers-architecture` | ADAPT |
| `process-n8n-docker-code-nodes.md` | NOT_MIGRATED | `arch-mcp-ecosystem` | ADAPT |
| `process-n8n-workflow-hygiene.md` | NOT_MIGRATED | `arch-mcp-ecosystem` | ADAPT |
| `process-news-intelligence.md` | NOT_MIGRATED | `core/skills/` | ADAPT |
| `process-node-dependency-lifecycle.md` | NOT_MIGRATED | `arch-dependency-governance` | MERGE |
| `process-node-foundation-reliability.md` | NOT_MIGRATED | `arch-foundation` | ADAPT |
| `process-node-preflight-checks.md` | MIGRATED | preflight.js | — |
| `process-ollama-node-integration-checks.md` | NOT_MIGRATED | `core/skills/ai-providers-architecture` | ADAPT |
| `process-ollama-runtime-governance.md` | NOT_MIGRATED | `core/skills/ai-providers-architecture` | ADAPT |
| `process-orchestrator-evolution.md` | NOT_MIGRATED | `arch-control-plane` | ADAPT |
| `process-preflight-diagnostics-quality-gate.md` | MIGRATED | preflight.js | — |
| `process-project-evolution-aggregation.md` | NOT_MIGRATED | `process-evolution-logging` | MERGE |
| `process-project-secretary-agent.md` | NOT_MIGRATED | `process-ai-collaboration` | ADAPT |
| `process-settings-sync.md` | NOT_MIGRATED | `core/skills/config-contracts` | ADAPT |
| `process-skill-code-loop-anchors.md` | MIGRATED | `process-code-anchors` | — |
| `process-skill-frontmatter-rules.md` | MIGRATED | `arch-skills-mcp` (validate-skills) | — |
| `process-skill-pipeline.md` | NOT_MIGRATED | `arch-skills-mcp` | ADAPT |
| `process-skill-quality-validation.md` | MIGRATED | validate-skills.js | — |
| `process-skill-watcher.md` | DEPRECATED | — | Не переносить |
| `process-skills-bridge.md` | DEPRECATED | — | Не переносить |
| `process-skills-curation-intelligence.md` | NOT_MIGRATED | `arch-skills-mcp` | ADAPT |
| `process-sqlite-health-snapshot.md` | NOT_MIGRATED | `arch-monitoring` | ADAPT |
| `process-sqlite-runtime-compatibility.md` | NOT_MIGRATED | `arch-backend-core` | ADAPT |
| `process-token-safety.md` | PARTIAL | `process-token-discipline` | MERGE |
| `process-unified-mcp-orchestration.md` | NOT_MIGRATED | `arch-mcp-ecosystem` | MERGE |
| `process-wf-ui-v2-bootstrap.md` | DEPRECATED | — | Не переносить (WF UI v2) |
| `process-wf-ui-v2-standards.md` | DEPRECATED | — | Не переносить |
| `process-workflow-ui.md` | DEPRECATED | — | Не переносить |
| `process-windows-powershell-patterns.md` | MIGRATED | `process-windows-shell` | — |
| `process-wsl-optimization.md` | NOT_MIGRATED | `arch-backend-core` | ADAPT |
| `process-zod-schema-governance.md` | NOT_MIGRATED | `process-lib-governance` | MERGE |
| `protocol-agent-core.md` | MIGRATED | `process-ai-collaboration` + `references/commands.md` | — |
| `protocol-docker-image-hardening.md` | NOT_MIGRATED | `arch-backend-core` | ADAPT |
| `protocol-git-commit-template-consistency.md` | NOT_MIGRATED | `arch-foundation` | ADAPT |
| `protocol-git-secrets-and-env-boundary.md` | MIGRATED | `process-secrets-hygiene` | — |
| `protocol-n8n-mcp-interaction.md` | NOT_MIGRATED | `arch-mcp-ecosystem` | ADAPT |
| `protocol-node-async-safety.md` | MIGRATED | `core/skills/async-contracts` | — |
| `protocol-node-mcp-development.md` | NOT_MIGRATED | `arch-mcp-ecosystem` | ADAPT |
| `protocol-node-timeout-abort-contract.md` | MIGRATED | `core/skills/async-contracts` | — |
| `protocol-ollama-timeout-fallback-contract.md` | NOT_MIGRATED | `core/skills/ai-providers-architecture` | MERGE |
| `protocol-sqlite-readonly-diagnostics.md` | NOT_MIGRATED | `arch-monitoring` | ADAPT |
| `skill-based-playbooks.md` | NOT_MIGRATED | `arch-skills-mcp` | MERGE |

### 1.11 Infrastructure (root)

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `infra-global-management.md` | NOT_MIGRATED | `arch-foundation` | ADAPT |
| `infra-reconstruction-pattern.md` | NOT_MIGRATED | `docs/plans/` | ADAPT |

### 1.12 Troubleshooting

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `troubleshooting/cloudflare-kv-key-limit.md` | NOT_MIGRATED | `docs/runbooks/` | ADAPT |
| `troubleshooting/docker-container-networking-debug.md` | NOT_MIGRATED | `docs/runbooks/` | ADAPT |
| `troubleshooting/file-protocol-cors-guard.md` | MIGRATED | `app/skills/file-protocol-cors-guard` | — |
| `troubleshooting/process-n8n-browser-cache.md` | NOT_MIGRATED | `docs/runbooks/` | ADAPT |
| `troubleshooting/troubleshoot-continue-cli-api-keys.md` | NOT_MIGRATED | `docs/runbooks/` | ADAPT |
| `troubleshooting/troubleshoot-continue-cli-response-mismatch.md` | NOT_MIGRATED | `docs/runbooks/` | ADAPT |
| `troubleshooting/yandex-access-binding-issue.md` | NOT_MIGRATED | `docs/runbooks/` | ADAPT |
| `troubleshooting/yandex-cors-troubleshooting.md` | NOT_MIGRATED | `docs/runbooks/` | ADAPT |

### 1.13 UX

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `ux/ux-interface-terms.md` | NOT_MIGRATED | `app/skills/ux-principles` | MERGE |
| `ux/ux-principles.md` | MIGRATED | `app/skills/ux-principles` | — |

### 1.14 Index

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `index/index-mbb.md` | DEPRECATED | `docs/index-skills.md` | Не переносить |

---

## 2. skills/all/skills/ — Общие скиллы

### 2.1 Process

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `process/process-agent-commands.md` | MIGRATED | `references/commands.md` | — |
| `process/process-code-header-skill-links.md` | MIGRATED | `process-code-anchors` | — |
| `process/process-coin-set-merge-consistency.md` | NOT_MIGRATED | `core/skills/domain-portfolio` | MERGE |
| `process/process-coingecko-file-protocol-topn.md` | NOT_MIGRATED | `core/skills/data-providers-architecture` | MERGE |
| `process/process-continue-ai-subagents.md` | NOT_MIGRATED | `arch-mcp-ecosystem` | ADAPT |
| `process/process-doc-levels.md` | NOT_MIGRATED | `process-docs-lifecycle` | MERGE |
| `process/process-doc-style.md` | PARTIAL | `process-code-documentation` | MERGE |
| `process/process-doc-updates.md` | NOT_MIGRATED | `process-docs-lifecycle` | MERGE |
| `process/process-multi-agent-collaboration.md` | MIGRATED | `process-ai-collaboration` | — |
| `process/process-n8n-mcp-integration.md` | NOT_MIGRATED | `arch-mcp-ecosystem` | ADAPT |
| `process/process-n8n-security-oauth-protocols.md` | NOT_MIGRATED | `arch-mcp-ecosystem` | ADAPT |
| `process/process-n8n-workflow-hygiene.md` | NOT_MIGRATED | `arch-mcp-ecosystem` | ADAPT |
| `process/process-nodejs-v25-api-preview.md` | NOT_MIGRATED | `arch-dependency-governance` | ADAPT |
| `process/process-ollama-v015-improvements.md` | NOT_MIGRATED | `core/skills/ai-providers-architecture` | ADAPT |
| `process/process-paths-management.md` | MIGRATED | `arch-foundation` (PATHS) | — |
| `process/process-release-categorization.md` | NOT_MIGRATED | `process-migration-prioritization` | MERGE |
| `process/process-session-handoff.md` | NOT_MIGRATED | `process-ai-collaboration` | ADAPT |
| `process/process-skill-code-loop-anchors.md` | MIGRATED | `process-code-anchors` | — |
| `process/process-skill-template.md` | MIGRATED | `arch-skills-mcp` (create-skill.js) | — |
| `process/process-skills-granularity.md` | NOT_MIGRATED | `process-skill-governance` | MERGE |
| `process/process-skills-language-policy.md` | MIGRATED | `process-language-policy` | — |
| `process/process-skills-lifecycle.md` | NOT_MIGRATED | `arch-skills-mcp` | ADAPT |
| `process/process-skills-scope-routing.md` | NOT_MIGRATED | `process-skill-governance` | MERGE |
| `process/process-ssot-crosslinks.md` | NOT_MIGRATED | `arch-foundation` | MERGE |
| `process/process-windows-docker-paths.md` | NOT_MIGRATED | `arch-foundation` | ADAPT |
| `process/protocol-command-omk.md` | MIGRATED | `references/commands.md` | — |
| `process/protocol-command-vzp.md` | MIGRATED | `references/commands.md` | — |
| `process/protocol-slash-commands-usage.md` | NOT_MIGRATED | `references/commands.md` | MERGE |

### 2.2 Libs

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `libs/libs-policy.md` | NOT_MIGRATED | `process-lib-governance` | MERGE |
| `libs/libs-repo-workflow.md` | NOT_MIGRATED | `arch-layout-governance` | ADAPT |
| `libs/libs-zod-v4-migration-plan.md` | NOT_MIGRATED | `docs/plans/` | ADAPT |

### 2.3 Protocols

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `protocols/protocol-commit.md` | NOT_MIGRATED | `arch-foundation` | ADAPT |

### 2.4 Security

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `security/skill-secrets-hygiene.md` | MIGRATED | `process-secrets-hygiene` | — |

### 2.5 Troubleshooting

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `troubleshooting/docker-code-not-updating.md` | NOT_MIGRATED | `docs/runbooks/` | ADAPT |
| `troubleshooting/docker-port-shadow-diagnosis.md` | NOT_MIGRATED | `docs/runbooks/` | ADAPT |
| `troubleshooting/docker-v29-overlay-regression.md` | NOT_MIGRATED | `docs/runbooks/` | ADAPT |

### 2.6 Index

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `index/index-architecture.md` | DEPRECATED | `docs/index-skills.md` | Не переносить |
| `index/index-operations.md` | DEPRECATED | `docs/index-skills.md` | Не переносить |

---

## 3. mbb/skills/ — Дубликаты/альтернативы

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `architecture/architecture-hybrid-bridge.md` | NOT_MIGRATED | `arch-control-plane` | MERGE |
| `process/process-env-key-governance.md` | PARTIAL | `process-env-sync` | MERGE |
| `process/process-external-integration-closure.md` | PARTIAL | `arch-external-parity` | MERGE |
| `process/process-github-workflow.md` | NOT_MIGRATED | `arch-mcp-ecosystem` | ADAPT |
| `process/process-project-evolution-logging.md` | MIGRATED | `process-evolution-logging` | — |

---

## 4. Рекомендуемый порядок миграции

### Фаза 1: Высокий приоритет (критичные для работы)

1. **Cache**: `cache-keys`, `cache-versioning` → MERGE в `core/skills/cache-layer`
2. **Integrations**: `integrations-postgres`, `integrations-rate-limiting` → MERGE в `core/skills/data-providers-architecture`
3. **Components**: `components-tooltips`, `components-modal-buttons` → ADAPT в `app/skills/`
4. **Process**: `process-token-safety` → MERGE в `process-token-discipline`

### Фаза 2: Средний приоритет (расширение покрытия)

5. **Architecture**: `architecture-loading`, `architecture-provider-metadata` → MERGE
6. **Core Systems**: `core-systems/workspace-config`, `messages-keys-and-config` → MERGE
7. **Libs**: `libs-zod-v3-v4-compat-layer`, `process-zod-schema-governance` → MERGE
8. **Protocols**: `protocol-commit`, `protocol-docker-image-hardening` → ADAPT

### Фаза 3: Низкий приоритет (runbooks, troubleshooting)

9. **Troubleshooting** → `docs/runbooks/`, `docs/cheatsheets/`
10. **Cloud** → `docs/ais/`, `docs/runbooks/`
11. **N8n/Continue** → `arch-mcp-ecosystem` или runbooks

### Фаза 4: DEPRECATED / не переносить

12. Архивные, KM v2, WF UI v2, index-* — не переносить

---

## 5. Чеклист для каждого мигрируемого скилла

- [ ] **Префикс**: Проверить по реестру префиксов (раздел выше). Для `is/skills/` — только `arch-` или `process-`.
- [ ] Добавить frontmatter: `title`, `reasoning_confidence`, `reasoning_audited_at`, `reasoning_checksum`, `id`
- [ ] Добавить блок `> **Context**:` после H1
- [ ] Использовать только разрешённые H2: `## Reasoning`, `## Core Rules`, `## Contracts`, `## Implementation Status`, `## Migration Strategy`, `## Examples`, `## Risk Mitigation`
- [ ] Убрать ссылки на MBB/MMB, заменить на Target App
- [ ] Обновить пути в File Map (PATHS)
- [ ] Зарегистрировать causality hashes в `causality-registry.md`
- [ ] Добавить в `related_skills` / `related_ais` где нужно
- [ ] **Перепроверить старое имя** по таблице Donor → Target (если источник — репозиторий a).
- [ ] Запустить `npm run skills:check` / `npm run preflight`

---

*Документ будет обновляться по мере выполнения миграции.*
