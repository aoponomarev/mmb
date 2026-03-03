# Реестр: Миграция скиллов из репозитория a в Target App (mmb)

> **Категория**: Мастер-план (Индексатор)
> **Дата**: 2026-03-02
> **Источники**: `a/skills/mbb/skills/`, `a/skills/all/skills/`, `a/mbb/skills/`
> **Целевая архитектура**: `is/skills/`, `core/skills/`, `app/skills/` (см. `process-skill-governance.md`)

**ИИ-агент:** При обнаружении недостатка в протоколах (разделы 4–9) — дополнить документ (см. раздел 10). Согласование не требуется.

**При критически важных сомнениях** — задавать наводящие вопросы пользователю в чате, чтобы не прерывать процесс миграции кластера. Не останавливаться «в тупике»; уточнить и продолжить.

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

### Специальные файлы и папки

| Файл / папка | Назначение |
|--------------|------------|
| `causality-registry.md` | Реестр хешей (системный) |
| `README.md` | Описание папки skills |
| `references/*.md` | Справочники (не скиллы) |
| `docs/backlog/skills/` | **Отложенные скиллы** — полезны, но не подходят под текущую инфраструктуру (Docker, n8n, Yandex Cloud и т.д.). Не привязаны к is/core/app. См. раздел 9. |

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
| `DEFERRED` | Полезен, но не подходит под текущую инфраструктуру — в `docs/backlog/skills/` до появления целевого контура |
| `MERGE` | Объединить с существующим скиллом |
| `DECOMPOSE` | Разбить на несколько скиллов по слоям |
| `ADAPT` | Требуется адаптация под новую архитектуру |
| `OPTIMIZE` | Требуется оптимизация (структура, токены, ссылки) |

---

## Сводка

| Источник | Всего | MIGRATED | PARTIAL | NOT_MIGRATED | DEPRECATED | Действия |
|----------|-------|----------|---------|--------------|------------|----------|
| skills/mbb/skills/ | 153 | 140 | 0 | 0 | 13 | см. таблицы ниже |
| skills/all/skills/ | 38 | 36 | 0 | 0 | 2 | см. таблицы ниже |
| mbb/skills/ | 5 | 5 | 0 | 0 | 0 | см. таблицы ниже |
| **Итого** | **196** | **181** | **0** | **0** | **15** | — |

---

## 1. skills/mbb/skills/ — MBB-специфичные скиллы

### 1.1 Architecture

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `architecture/architecture-core-stack.md` | MIGRATED | `arch-foundation` | — |
| `architecture/architecture-client-vs-cloud.md` | MIGRATED | `arch-backend-core` | — |
| `architecture/architecture-dom-markup.md` | MIGRATED | `app/skills/ui-architecture.md` | — |
| `architecture/architecture-loading.md` | MIGRATED | `arch-backend-core` | — |
| `architecture/architecture-mcp-ui-interaction.md` | MIGRATED | `arch-mcp-ecosystem` | — |
| `architecture/architecture-provider-metadata.md` | MIGRATED | `core/skills/data-providers-architecture.md` | — |
| `architecture/architecture-relative-paths.md` | MIGRATED | `arch-foundation` (PATHS) | — |
| `architecture/architecture-ssot.md` | MIGRATED | `arch-foundation` | — |
| `architecture/architecture-versioning.md` | MIGRATED | `core/skills/cache-layer.md` | — |
| `architecture/llm-fallback-mechanism.md` | MIGRATED | `core/skills/ai-providers-architecture.md` | — |
| `architecture/skills-architecture-ssot.md` | MIGRATED | `arch-skills-mcp` | — |

### 1.2 Archive (не переносить)

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `archive/integrations-status.md` | DEPRECATED | — | Не переносить |
| `archive/integrations-strategy.md` | DEPRECATED | — | Не переносить |

### 1.3 Cache

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `cache/cache-strategy.md` | MIGRATED | `core/skills/cache-layer.md` | — |
| `cache/cache-keys.md` | MIGRATED | `core/skills/cache-layer.md` | — |
| `cache/cache-versioning.md` | MIGRATED | `core/skills/cache-layer.md` | — |

### 1.4 Cloud

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `cloud/yandex-cloud-function-code.md` | MIGRATED | `is/skills/arch-cloudflare-infrastructure.md` | — |
| `cloud/yandex-cloud-function-steps-guide.md` | MIGRATED | `is/skills/arch-cloudflare-infrastructure.md` | — |
| `cloud/yandex-get-api-key.md` | MIGRATED | `is/skills/arch-cloudflare-infrastructure.md` | — |
| `cloud/yandex-mbb-api-deploy.md` | MIGRATED | `is/skills/arch-cloudflare-infrastructure.md` | — |

### 1.5 Components

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `components/components-bootstrap.md` | MIGRATED | `app/skills/bootstrap-vue-integration.md` | — |
| `components/components-boundaries.md` | MIGRATED | `app/skills/ui-architecture.md` | — |
| `components/components-class-manager.md` | MIGRATED | `app/skills/component-classes-management.md` | — |
| `components/components-column-visibility.md` | MIGRATED | `app/skills/ui-architecture.md` | — |
| `components/components-icon-manager.md` | MIGRATED | `app/skills/icon-manager.md` | — |
| `components/components-layout-alignment.md` | MIGRATED | `app/skills/ui-architecture.md` | — |
| `components/components-localization.md` | MIGRATED | `app/skills/reactive-localization.md` | — |
| `components/components-modal-buttons.md` | MIGRATED | `app/skills/ui-architecture.md` | — |
| `components/components-responsive-visibility.md` | MIGRATED | `app/skills/ui-architecture.md` | — |
| `components/components-ssot.md` | MIGRATED | `arch-foundation` | — |
| `components/components-styling-principles.md` | MIGRATED | `app/skills/ux-principles.md` | — |
| `components/components-template-split.md` | MIGRATED | `app/skills/vue-implementation-patterns.md` | — |
| `components/components-tooltips.md` | MIGRATED | `app/skills/ui-architecture.md` | — |
| `components/ui-components-unified.md` | MIGRATED | `app/skills/ui-architecture.md` | — |

### 1.6 Core Systems

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `core-systems/auto-coin-sets.md` | MIGRATED | `core/skills/domain-portfolio.md` | — |
| `core-systems/messages-keys-and-config.md` | MIGRATED | `core/skills/messages-architecture.md` | — |
| `core-systems/messages-translator.md` | MIGRATED | `core/skills/messages-architecture.md` | — |
| `core-systems/messages-ui-and-lifecycle.md` | MIGRATED | `core/skills/messages-architecture.md` | — |
| `core-systems/workspace-config.md` | MIGRATED | `core/skills/config-contracts.md` | — |

### 1.7 Integrations

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `integrations/continue-cli-mcp-integration-nuances.md` | MIGRATED | `is/skills/arch-mcp-ecosystem.md` | — |
| `integrations/integration-artificial-analysis-iq.md` | MIGRATED | `core/skills/ai-providers-architecture.md` | — |
| `integrations/integration-mcp-sdk-security-rollout.md` | MIGRATED | `is/skills/arch-mcp-ecosystem.md` | — |
| `integrations/integrations-ai-core.md` | MIGRATED | `core/skills/ai-providers-architecture.md` | — |
| `integrations/integrations-api-proxy.md` | MIGRATED | `core/skills/external-integrations.md` | — |
| `integrations/integrations-auth-worker-restore.md` | MIGRATED | `is/skills/arch-cloudflare-infrastructure.md` | — |
| `integrations/integrations-cloudflare-core.md` | MIGRATED | `is/skills/arch-cloudflare-infrastructure.md` | — |
| `integrations/integrations-cloudflare-plan.md` | MIGRATED | `is/skills/arch-cloudflare-infrastructure.md` | — |
| `integrations/integrations-cloudflare-testing.md` | MIGRATED | `is/skills/arch-testing-ci.md` | — |
| `integrations/integrations-continue-cli-mistral.md` | MIGRATED | `arch-mcp-ecosystem` | — |
| `integrations/integrations-continue-mcp-setup.md` | MIGRATED | `is/skills/arch-mcp-ecosystem.md` | — |
| `integrations/integrations-data-provider-resilience.md` | MIGRATED | `core/skills/data-providers-architecture.md` | — |
| `integrations/integrations-data-providers.md` | MIGRATED | `core/skills/data-providers-architecture.md` | — |
| `integrations/integrations-llm-providers-config.md` | MIGRATED | `core/skills/ai-providers-architecture.md` | — |
| `integrations/integrations-n8n-api-access.md` | MIGRATED | `arch-mcp-ecosystem` | — |
| `integrations/integrations-n8n-code-node-v2.md` | MIGRATED | `arch-mcp-ecosystem` | — |
| `integrations/integrations-n8n-docker-internals.md` | MIGRATED | `is/skills/arch-mcp-ecosystem.md` | — |
| `integrations/integrations-n8n-local-setup.md` | MIGRATED | `is/skills/arch-mcp-ecosystem.md` | — |
| `integrations/integrations-oauth-file-protocol.md` | MIGRATED | `app/skills/file-protocol-cors-guard.md` | — |
| `integrations/integrations-overview.md` | MIGRATED | `core/skills/external-integrations.md` | — |
| `integrations/integrations-postgres.md` | MIGRATED | `core/skills/data-providers-architecture.md` | — |
| `integrations/integrations-rate-limiting.md` | MIGRATED | `core/skills/data-providers-architecture.md` | — |
| `integrations/mcp-server-yaml-parsing.md` | MIGRATED | `arch-mcp-ecosystem` | — |
| `integrations/perplexity-connect.md` | MIGRATED | `core/skills/ai-providers-architecture.md` | — |

### 1.8 Libs

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `libs/libs-mbb-auto-activation.md` | MIGRATED | `core/skills/config-contracts.md` | — |
| `libs/libs-mbb-config.md` | MIGRATED | `core/skills/config-contracts.md` | — |
| `libs/libs-metadata-generation.md` | MIGRATED | `core/skills/domain-portfolio.md` | — |
| `libs/libs-repo-setup.md` | MIGRATED | `is/skills/arch-layout-governance.md` | — |
| `libs/libs-zod-v3-v4-compat-layer.md` | MIGRATED | `is/skills/process-lib-governance.md` | — |

### 1.9 Metrics

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `metrics/metrics-models.md` | MIGRATED | `core/skills/metrics-air-model.md` | — |
| `metrics/metrics-portfolio-structure.md` | MIGRATED | `core/skills/domain-portfolio.md` | — |
| `metrics/metrics-validation.md` | MIGRATED | `core/skills/data-providers-architecture.md` | — |

### 1.10 Process (skills/mbb/skills/process/)

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `process-agentic-self-correction.md` | MIGRATED | `is/skills/process-ai-collaboration.md` | — |
| `autonomous-skill-synthesis.md` | MIGRATED | `arch-skills-mcp` | — |
| `process-autonomous-quality-gate.md` | MIGRATED | `arch-testing-ci` | — |
| `process-batch-skills-review.md` | MIGRATED | `arch-skills-mcp` | — |
| `process-better-sqlite3-node-abi-gate.md` | MIGRATED | `arch-backend-core` | — |
| `process-bug-resolution-protocol.md` | MIGRATED | `is/skills/process-ai-collaboration.md` | — |
| `process-commit-analysis-heuristics.md` | MIGRATED | `arch-skills-mcp` | — |
| `process-commit-skill-extraction.md` | MIGRATED | `arch-skills-mcp` | — |
| `process-continue-config-ssot.md` | MIGRATED | `arch-foundation` | — |
| `process-continue-mcp-synergy.md` | MIGRATED | `arch-mcp-ecosystem` | — |
| `process-cursor-settings-management.md` | MIGRATED | `arch-mcp-ecosystem` | — |
| `process-disaster-recovery.md` | MIGRATED | `arch-rollback` | — |
| `process-docker-compose-release-validation.md` | MIGRATED | `arch-testing-ci` | — |
| `process-docker-disaster-recovery.md` | MIGRATED | `arch-rollback` | — |
| `process-docker-resource-governance.md` | MIGRATED | `arch-backend-core` | — |
| `process-dynamic-context-management.md` | MIGRATED | `process-token-discipline` | — |
| `process-env-sync-governance.md` | MIGRATED | `is/skills/process-env-sync.md` | — |
| `process-external-integration-closure.md` | MIGRATED | `arch-external-parity` | — |
| `process-future-skill-impact-analysis.md` | MIGRATED | `arch-skills-mcp` | — |
| `process-git-foundation-reliability.md` | MIGRATED | `arch-foundation` | — |
| `process-git-local-ci-mirror.md` | MIGRATED | `arch-testing-ci` | — |
| `process-git-submodule-drift-control.md` | MIGRATED | `arch-foundation` | — |
| `process-git-submodule-resilience.md` | MIGRATED | `arch-foundation` | — |
| `process-github-workflow.md` | MIGRATED | `arch-mcp-ecosystem` | — |
| `process-infrastructure-maintenance.md` | MIGRATED | `arch-foundation` | — |
| `process-km-v2-maintenance.md` | DEPRECATED | — | Не переносить (KM v2 устарел) |
| `process-logging-strategy.md` | MIGRATED | `arch-monitoring` | — |
| `process-model-registry-maintenance.md` | MIGRATED | `core/skills/ai-providers-architecture.md` | — |
| `process-n8n-docker-code-nodes.md` | MIGRATED | `arch-mcp-ecosystem` | — |
| `process-n8n-workflow-hygiene.md` | MIGRATED | `arch-mcp-ecosystem` | — |
| `process-news-intelligence.md` | MIGRATED | `core/skills/external-integrations.md` | — |
| `process-node-dependency-lifecycle.md` | MIGRATED | `arch-dependency-governance` | — |
| `process-node-foundation-reliability.md` | MIGRATED | `arch-foundation` | — |
| `process-node-preflight-checks.md` | MIGRATED | preflight.js | — |
| `process-ollama-node-integration-checks.md` | MIGRATED | `core/skills/ai-providers-architecture.md` | — |
| `process-ollama-runtime-governance.md` | MIGRATED | `core/skills/ai-providers-architecture.md` | — |
| `process-orchestrator-evolution.md` | MIGRATED | `arch-control-plane` | — |
| `process-preflight-diagnostics-quality-gate.md` | MIGRATED | preflight.js | — |
| `process-project-evolution-aggregation.md` | MIGRATED | `process-evolution-logging` | — |
| `process-project-secretary-agent.md` | MIGRATED | `is/skills/process-ai-collaboration.md` | — |
| `process-settings-sync.md` | MIGRATED | `core/skills/config-contracts.md` | — |
| `process-skill-code-loop-anchors.md` | MIGRATED | `process-code-anchors` | — |
| `process-skill-frontmatter-rules.md` | MIGRATED | `arch-skills-mcp` (validate-skills) | — |
| `process-skill-pipeline.md` | MIGRATED | `arch-skills-mcp` | — |
| `process-skill-quality-validation.md` | MIGRATED | validate-skills.js | — |
| `process-skill-watcher.md` | DEPRECATED | — | Не переносить |
| `process-skills-bridge.md` | DEPRECATED | — | Не переносить |
| `process-skills-curation-intelligence.md` | MIGRATED | `arch-skills-mcp` | — |
| `process-sqlite-health-snapshot.md` | MIGRATED | `arch-monitoring` | — |
| `process-sqlite-runtime-compatibility.md` | MIGRATED | `arch-backend-core` | — |
| `process-token-safety.md` | MIGRATED | `process-token-discipline` | — |
| `process-unified-mcp-orchestration.md` | MIGRATED | `arch-mcp-ecosystem` | — |
| `process-wf-ui-v2-bootstrap.md` | DEPRECATED | — | Не переносить (WF UI v2) |
| `process-wf-ui-v2-standards.md` | DEPRECATED | — | Не переносить |
| `process-workflow-ui.md` | DEPRECATED | — | Не переносить |
| `process-windows-powershell-patterns.md` | MIGRATED | `process-windows-shell` | — |
| `process-wsl-optimization.md` | MIGRATED | `arch-backend-core` | — |
| `process-zod-schema-governance.md` | MIGRATED | `process-lib-governance` | — |
| `protocol-agent-core.md` | MIGRATED | `process-ai-collaboration` + `is/skills/references/commands.md` | — |
| `protocol-docker-image-hardening.md` | MIGRATED | `arch-backend-core` | — |
| `protocol-git-commit-template-consistency.md` | MIGRATED | `arch-foundation` | — |
| `protocol-git-secrets-and-env-boundary.md` | MIGRATED | `process-secrets-hygiene` | — |
| `protocol-n8n-mcp-interaction.md` | MIGRATED | `arch-mcp-ecosystem` | — |
| `protocol-node-async-safety.md` | MIGRATED | `core/skills/async-contracts.md` | — |
| `protocol-node-mcp-development.md` | MIGRATED | `arch-mcp-ecosystem` | — |
| `protocol-node-timeout-abort-contract.md` | MIGRATED | `core/skills/async-contracts.md` | — |
| `protocol-ollama-timeout-fallback-contract.md` | MIGRATED | `core/skills/ai-providers-architecture.md` | — |
| `protocol-sqlite-readonly-diagnostics.md` | MIGRATED | `arch-monitoring` | — |
| `skill-based-playbooks.md` | MIGRATED | `arch-skills-mcp` | — |

### 1.11 Infrastructure (root)

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `infra-global-management.md` | MIGRATED | `arch-foundation` | — |
| `infra-reconstruction-pattern.md` | MIGRATED | `is/skills/arch-foundation.md` | — |

### 1.12 Troubleshooting

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `troubleshooting/cloudflare-kv-key-limit.md` | MIGRATED | `is/skills/arch-cloudflare-infrastructure.md` | — |
| `troubleshooting/docker-container-networking-debug.md` | MIGRATED | `is/skills/arch-backend-core.md` | — |
| `troubleshooting/file-protocol-cors-guard.md` | MIGRATED | `app/skills/file-protocol-cors-guard.md` | — |
| `troubleshooting/process-n8n-browser-cache.md` | MIGRATED | `is/skills/arch-mcp-ecosystem.md` | — |
| `troubleshooting/troubleshoot-continue-cli-api-keys.md` | MIGRATED | `is/skills/arch-mcp-ecosystem.md` | — |
| `troubleshooting/troubleshoot-continue-cli-response-mismatch.md` | MIGRATED | `is/skills/arch-mcp-ecosystem.md` | — |
| `troubleshooting/yandex-access-binding-issue.md` | MIGRATED | `is/skills/arch-cloudflare-infrastructure.md` | — |
| `troubleshooting/yandex-cors-troubleshooting.md` | MIGRATED | `is/skills/arch-cloudflare-infrastructure.md` | — |

### 1.13 UX

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `ux/ux-interface-terms.md` | MIGRATED | `app/skills/ux-principles.md` | — |
| `ux/ux-principles.md` | MIGRATED | `app/skills/ux-principles.md` | — |

### 1.14 Index

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `index/index-mbb.md` | DEPRECATED | `docs/index-skills.md` | Не переносить |

---

## 2. skills/all/skills/ — Общие скиллы

### 2.1 Process

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `process/process-agent-commands.md` | MIGRATED | `is/skills/references/commands.md` | — |
| `process/process-code-header-skill-links.md` | MIGRATED | `process-code-anchors` | — |
| `process/process-coin-set-merge-consistency.md` | MIGRATED | `core/skills/domain-portfolio.md` | — |
| `process/process-coingecko-file-protocol-topn.md` | MIGRATED | `core/skills/data-providers-architecture.md` | — |
| `process/process-continue-ai-subagents.md` | MIGRATED | `arch-mcp-ecosystem` | — |
| `process/process-doc-levels.md` | MIGRATED | `process-docs-lifecycle` | — |
| `process/process-doc-style.md` | MIGRATED | `process-code-documentation` | — |
| `process/process-doc-updates.md` | MIGRATED | `process-docs-lifecycle` | — |
| `process/process-multi-agent-collaboration.md` | MIGRATED | `process-ai-collaboration` | — |
| `process/process-n8n-mcp-integration.md` | MIGRATED | `arch-mcp-ecosystem` | — |
| `process/process-n8n-security-oauth-protocols.md` | MIGRATED | `arch-mcp-ecosystem` | — |
| `process/process-n8n-workflow-hygiene.md` | MIGRATED | `arch-mcp-ecosystem` | — |
| `process/process-nodejs-v25-api-preview.md` | MIGRATED | `arch-dependency-governance` | — |
| `process/process-ollama-v015-improvements.md` | MIGRATED | `core/skills/ai-providers-architecture.md` | — |
| `process/process-paths-management.md` | MIGRATED | `arch-foundation` (PATHS) | — |
| `process/process-release-categorization.md` | MIGRATED | `process-migration-prioritization` | — |
| `process/process-session-handoff.md` | MIGRATED | `process-ai-collaboration` | — |
| `process/process-skill-code-loop-anchors.md` | MIGRATED | `process-code-anchors` | — |
| `process/process-skill-template.md` | MIGRATED | `arch-skills-mcp` (create-skill.js) | — |
| `process/process-skills-granularity.md` | MIGRATED | `process-skill-governance` | — |
| `process/process-skills-language-policy.md` | MIGRATED | `process-language-policy` | — |
| `process/process-skills-lifecycle.md` | MIGRATED | `arch-skills-mcp` | — |
| `process/process-skills-scope-routing.md` | MIGRATED | `process-skill-governance` | — |
| `process/process-ssot-crosslinks.md` | MIGRATED | `arch-foundation` | — |
| `process/process-windows-docker-paths.md` | MIGRATED | `arch-foundation` | — |
| `process/protocol-command-omk.md` | MIGRATED | `is/skills/references/commands.md` | — |
| `process/protocol-command-vzp.md` | MIGRATED | `is/skills/references/commands.md` | — |
| `process/protocol-slash-commands-usage.md` | MIGRATED | `is/skills/references/commands.md` | — |

### 2.2 Libs

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `libs/libs-policy.md` | MIGRATED | `process-lib-governance` | — |
| `libs/libs-repo-workflow.md` | MIGRATED | `arch-layout-governance` | — |
| `libs/libs-zod-v4-migration-plan.md` | MIGRATED | `process-lib-governance` | — |

### 2.3 Protocols

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `protocols/protocol-commit.md` | MIGRATED | `arch-foundation` | — |

### 2.4 Security

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `security/skill-secrets-hygiene.md` | MIGRATED | `process-secrets-hygiene` | — |

### 2.5 Troubleshooting

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `troubleshooting/docker-code-not-updating.md` | MIGRATED | `is/skills/arch-backend-core.md` | — |
| `troubleshooting/docker-port-shadow-diagnosis.md` | MIGRATED | `is/skills/arch-backend-core.md` | — |
| `troubleshooting/docker-v29-overlay-regression.md` | MIGRATED | `is/skills/arch-backend-core.md` | — |

### 2.6 Index

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `index/index-architecture.md` | DEPRECATED | `docs/index-skills.md` | Не переносить |
| `index/index-operations.md` | DEPRECATED | `docs/index-skills.md` | Не переносить |

---

## 3. mbb/skills/ — Дубликаты/альтернативы

| Файл | Статус | Целевой скилл | Действия |
|------|--------|---------------|----------|
| `architecture/architecture-hybrid-bridge.md` | MIGRATED | `arch-control-plane` | — |
| `process/process-env-key-governance.md` | MIGRATED | `process-env-sync` | — |
| `process/process-external-integration-closure.md` | MIGRATED | `arch-external-parity` | — |
| `process/process-github-workflow.md` | MIGRATED | `arch-mcp-ecosystem` | — |
| `process/process-project-evolution-logging.md` | MIGRATED | `process-evolution-logging` | — |

---

## 4. Рекомендуемый порядок миграции

### Фаза 1: Высокий приоритет (критичные для работы)

1. **Cache**: `cache-keys`, `cache-versioning` → MERGE в `core/skills/cache-layer.md`
2. **Integrations**: `integrations-postgres`, `integrations-rate-limiting` → MERGE в `core/skills/data-providers-architecture.md`
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

### Фаза 4: DEFERRED — в backlog до появления инфраструктуры

12. **Docker, n8n, Yandex Cloud** и т.п. — полезны, но инфраструктуры нет → `docs/backlog/skills/` (раздел 9)

### Фаза 5: DEPRECATED / не переносить

13. Архивные, KM v2, WF UI v2, index-* — не переносить

---

## 4.5 Протокол кластерного отбора (Cluster-Based Selection)

**Проблема:** Миграция скилла в изоляции приводит к дублированию causality, конфликтам при MERGE и пропущенным `related_skills`. Семантически связанные donor-скиллы нужно обрабатывать вместе.

**Решение:** Работать **кластерами** — группами donor-скиллов в одном семантическом поле.

### Критерии кластера

| Критерий | Пример |
|----------|--------|
| Один целевой скилл | `cache-keys`, `cache-versioning`, `cache-strategy` → все в `core/skills/cache-layer.md` |
| Одна категория/слой | Несколько `integrations-*` → `core/skills/data-providers-architecture.md` |
| Общие causality-хеши | Donor-скиллы ссылаются на одни и те же `#for-*` |
| Связанные по смыслу | `process-token-safety` + `process-dynamic-context` → `process-token-discipline` |

**Отбор по семантической близости:** Включать в кластер только donor-скиллы с **явной связью** — общий target, общие хеши, одна и та же подсистема. Не объединять «соседние по папке» без смысловой связи.

### Порядок работы с кластером

| Шаг | Действие |
|-----|----------|
| 1 | **Извлечь кластер** — по таблицам миграции выбрать 3–5 donor-скиллов с общим target или категорией; ужесточать отбор по семантической близости и связанности |
| 2 | **Прочитать все donor** — понять перекрытия, конфликты, общие хеши |
| 3 | **Сверить с target** — если target уже существует, прочитать его; определить стратегию MERGE/ADAPT |
| 4 | **Мигрировать последовательно** — в рамках кластера: сначала консолидировать контент, затем causality, затем прошивка. Не мигрировать по одному donor в отрыве от остальных |
| 5 | **Обновить таблицу** — пометить все donor в кластере как MIGRATED |

### Ограничения

- **Размер кластера:** 3–5 скиллов. Ужесточать отбор по семантической близости и связанности. Больше — разбить на подкластеры по подтеме.
- **Параллельность:** Внутри кластера — только последовательно (один target). Между независимыми кластерами (например, cache vs components) — можно параллельно, если разные target.

### Антипаттерны кластерного отбора

| Антипаттерн | Почему плохо | Правильно |
|-------------|--------------|-----------|
| **Разнесённая миграция** — мигрировать `cache-keys` сегодня, `cache-versioning` через неделю | Дублирование causality, рассинхрон target-скилла, пропущенные `related_skills`. Контекст теряется между сессиями. | Извлечь кластер «cache-layer», мигрировать вместе |
| **Раздутый кластер** — включить 8+ donor «потому что все про integrations» | Когнитивная перегрузка, риск конфликтов при MERGE, потеря фокуса. | Разбить на подкластеры по подтеме (например, postgres vs rate-limiting) |
| **Смешение по соседству** — объединить donor только потому что в одной папке | Семантически несвязанные скиллы попадают в один target — размытый контент, невнятные Core Rules. | Включать только при явной связи: общий target, общие хеши, одна подсистема. Не объединять «соседние по папке» без смысловой связи |

### Связь с фазами (раздел 4)

Фазы задают приоритет *каких* кластеров брать первыми. Внутри фазы — отбор по кластерам. Например, Фаза 1 п.1 «Cache» — это один кластер: `cache-keys` + `cache-versioning` + `cache-strategy` → обрабатывать вместе.

---

## 4.6 Протокол покластерного учёта

**Цель:** Строгий учёт выполнения миграции по кластерам. Избежать «забытых» donor и рассинхрона между статусами и реальностью.

#### Механизм учёта

| Уровень | Где | Что отслеживается |
|---------|-----|-------------------|
| **Donor** | Таблицы 1.1–1.14, 2.x, 3 | Статус строки: `MIGRATED` / `NOT_MIGRATED` / `PARTIAL` |
| **Кластер** | Реестр кластеров (ниже) | Чекбокс `[ ]` → `[x]` когда все donor кластера MIGRATED |

**Правило:** Кластер считается выполненным **только** когда все donor имеют статус `MIGRATED` и протокол верификации (7.3) пройден. Чекбокс кластера ставится **после** верификации.

#### Реестр кластеров (чекбоксы)

Приоритетные кластеры (Фаза 1–2). Добавлять новые по мере выявления.

| [ ] | Кластер | Target | Donors (кратко) | Фаза |
|-----|---------|--------|-----------------|------|
| [x] | cache-layer | `core/skills/cache-layer.md` | cache-keys, cache-versioning, cache-strategy | 1 |
| [x] | data-providers | `core/skills/data-providers-architecture.md` | integrations-postgres, rate-limiting, data-provider-resilience, coingecko-file-protocol, metrics-validation | 1 |
| [x] | token-discipline | `process-token-discipline` | process-token-safety, process-dynamic-context | 1 |
| [x] | components-ui | `app/skills/ui-architecture.md` | components-tooltips, modal-buttons, boundaries, column-visibility | 1 |
| [x] | arch-rollback | `arch-rollback` | process-disaster-recovery, process-docker-disaster-recovery | 2 |
| [x] | arch-mcp-ecosystem | `arch-mcp-ecosystem` | process-continue-mcp-synergy, unified-mcp-orchestration, n8n-workflow-hygiene, process-cursor-settings-management, process-github-workflow, protocol-n8n-mcp-interaction, protocol-node-mcp-development | 2 |
| [x] | arch-skills-mcp | `arch-skills-mcp` | batch-skills-review, commit-skill-extraction, skill-pipeline, skill-based-playbooks, autonomous-skill-synthesis, process-commit-analysis-heuristics, process-future-skill-impact-analysis | 2 |
| [x] | process-lib-governance | `process-lib-governance` | libs-zod-v3-v4-compat-layer, process-zod-schema-governance | 2 |
| [x] | arch-foundation | `arch-foundation` | process-continue-config-ssot, git-submodule-drift/resilience, protocol-git-commit, ssot-crosslinks, architecture-relative-paths, process-git-foundation-reliability, process-infrastructure-maintenance, process-node-foundation-reliability, components-ssot | 2 |
| [x] | messages-architecture | `core/skills/messages-architecture.md` | messages-keys-and-config, messages-translator | 2 |
| [x] | config-contracts | `core/skills/config-contracts.md` | workspace-config, libs-mbb-auto-activation, libs-mbb-config | 2 |
| [x] | ui-architecture | `app/skills/ui-architecture.md` | layout-alignment, responsive-visibility, ui-components-unified, dom-markup | 2 |
| [x] | ai-providers-architecture | `core/skills/ai-providers-architecture.md` | llm-providers-config, perplexity-connect, llm-fallback-mechanism, ollama-timeout-fallback | 2 |
| [x] | cache-versioning | `core/skills/cache-layer.md` | architecture-versioning | 2 |
| [x] | data-providers-metadata | `core/skills/data-providers-architecture.md` | architecture-provider-metadata | 2 |
| [x] | ux-principles | `app/skills/ux-principles.md` | components-styling-principles, ux-interface-terms | 2 |
| [x] | domain-portfolio | `core/skills/domain-portfolio.md` | auto-coin-sets, metrics-portfolio-structure | 2 |
| [x] | process-skill-governance | `is/skills/process-skill-governance.md` | process-skills-granularity, process-skills-scope-routing | 2 |
| [x] | file-protocol-cors-guard | `app/skills/file-protocol-cors-guard.md` | integrations-oauth-file-protocol | 2 |
| [x] | vue-implementation-patterns | `app/skills/vue-implementation-patterns.md` | components-template-split | 2 |
| [x] | protocol-commit | `arch-foundation` | protocol-commit | 2 |
| [x] | commands-slash | `is/skills/references/commands.md` | protocol-slash-commands-usage | 2 |
| [x] | libs-policy | `process-lib-governance` | libs-policy | 2 |
| [x] | process-docs-lifecycle | `process-docs-lifecycle` | process-doc-levels, process-doc-updates | 2 |
| [x] | process-migration-prioritization | `process-migration-prioritization` | process-release-categorization | 2 |
| [x] | arch-monitoring | `arch-monitoring` | process-logging-strategy, process-sqlite-health-snapshot, protocol-sqlite-readonly-diagnostics | 2 |
| [x] | process-ai-collaboration | `process-ai-collaboration` | agentic-self-correction, process-bug-resolution-protocol, process-project-secretary-agent | 2 |
| [x] | arch-backend-core | `arch-backend-core` | process-docker-resource-governance, process-sqlite-runtime-compatibility, process-wsl-optimization, architecture-client-vs-cloud, architecture-loading | 2 |
| [x] | arch-testing-ci | `arch-testing-ci` | process-autonomous-quality-gate, process-docker-compose-release-validation, process-git-local-ci-mirror, integrations-cloudflare-testing | 2 |
| [x] | process-evolution-logging | `process-evolution-logging` | process-project-evolution-aggregation | 2 |
| [x] | external-integrations | `core/skills/external-integrations.md` | integrations-api-proxy, integrations-overview | 2 |
| [x] | arch-dependency-governance | `arch-dependency-governance` | process-node-dependency-lifecycle, process-nodejs-v25-api-preview | 2 |
| [x] | arch-mcp-ecosystem-batch2 | `arch-mcp-ecosystem` | continue-cli-mcp-nuances, mcp-sdk-security-rollout, mcp-server-yaml-parsing, process-n8n-docker-code-nodes, process-n8n-mcp-integration | 2 |
| [x] | arch-mcp-ecosystem-batch3 | `arch-mcp-ecosystem` | integrations-n8n-api-access, integrations-n8n-code-node-v2, process-continue-ai-subagents, process-n8n-security-oauth-protocols | 2 |
| [x] | arch-foundation-batch2 | `arch-foundation` | architecture-core-stack, infra-global-management, process-windows-docker-paths | 2 |
| [x] | ai-providers-architecture | `core/skills/ai-providers-architecture.md` | integration-artificial-analysis-iq, process-model-registry-maintenance, process-ollama-node-integration-checks, process-ollama-runtime-governance | 2 |
| [x] | arch-skills-mcp-batch2 | `arch-skills-mcp` | process-skills-curation-intelligence, process-skills-lifecycle | 2 |
| [x] | arch-layout-governance | `arch-layout-governance` | libs-repo-setup, libs-repo-workflow | 2 |
| [x] | arch-control-plane | `arch-control-plane` | process-orchestrator-evolution, architecture-hybrid-bridge | 2 |
| [x] | arch-backend-core-batch2 | `arch-backend-core` | protocol-docker-image-hardening | 2 |
| [x] | domain-portfolio | `core/skills/domain-portfolio.md` | process-coin-set-merge-consistency | 2 |
| [x] | arch-external-parity | `arch-external-parity` | process-external-integration-closure | 2 |
| [x] | process-env-sync | `process-env-sync` | process-env-key-governance | 2 |
| [x] | process-code-documentation | `process-code-documentation` | process-doc-style | 2 |
| [x] | process-ai-collaboration-batch2 | `process-ai-collaboration` | process-session-handoff | 2 |
| [x] | config-contracts | `core/skills/config-contracts.md` | process-settings-sync | 2 |
| [x] | arch-mcp-ecosystem-batch4 | `arch-mcp-ecosystem` | architecture-mcp-ui-interaction, integrations-continue-cli-mistral, process-github-workflow | 2 |
| [x] | arch-cloudflare-infrastructure | `arch-cloudflare-infrastructure` | integrations-cloudflare-core, yandex-cloud-function-code | 2 |
| [x] | ai-providers-ollama | `core/skills/ai-providers-architecture.md` | process-ollama-v015-improvements | 2 |
| [x] | arch-backend-core-batch3 | `arch-backend-core` | process-better-sqlite3-node-abi-gate | 2 |
| [x] | process-lib-governance-batch2 | `process-lib-governance` | libs-zod-v4-migration-plan | 2 |
| [x] | domain-portfolio-batch2 | `core/skills/domain-portfolio.md` | libs-metadata-generation | 2 |
| [x] | external-integrations-batch2 | `core/skills/external-integrations.md` | process-news-intelligence | 2 |
| [x] | icon-manager | `app/skills/icon-manager.md` | components-icon-manager | 2 |
| [x] | ai-providers-partial | `core/skills/ai-providers-architecture.md` | integrations-ai-core (Key Recovery, CORS) | 2 |
| [x] | arch-layout-libs | `is/skills/arch-layout-governance.md` | libs-mbb-config (Libs structure) | 2 |
| [x] | process-token-partial | `is/skills/process-token-discipline.md` | process-token-safety, process-dynamic-context (Skill Anchors, shadow_index) | 2 |
| [x] | data-providers-postgres | `core/skills/data-providers-architecture.md` | integrations-postgres (Schema Migration, Guard Layers) | 2 |
| [x] | domain-portfolio-partial | `core/skills/domain-portfolio.md` | auto-coin-sets (Structured Process) | 2 |
| [x] | arch-backend-partial | `is/skills/arch-backend-core.md` | architecture-client-vs-cloud, architecture-loading (Version-Bound, Component boundaries) | 2 |
| [x] | data-providers-completion | `core/skills/data-providers-architecture.md` | integrations-data-providers, integrations-data-provider-resilience, architecture-provider-metadata, integrations-rate-limiting | 2 |
| [x] | messages-architecture-completion | `core/skills/messages-architecture.md` | messages-ui-and-lifecycle | 2 |
| [x] | metrics-air-completion | `core/skills/metrics-air-model.md` | metrics-models | 2 |
| [x] | bootstrap-vue-completion | `app/skills/bootstrap-vue-integration.md` | components-bootstrap | 2 |
| [x] | process-code-anchors-completion | `is/skills/process-code-anchors.md` | process-skill-code-loop-anchors (Anchor Placement) | 2 |
| [x] | async-contracts-completion | `core/skills/async-contracts.md` | protocol-node-timeout-abort-contract (Verification) | 2 |
| [x] | arch-testing-preflight | `is/skills/arch-testing-ci.md` | process-node-preflight-checks, process-preflight-diagnostics-quality-gate | 2 |
| [x] | arch-skills-quality-validation | `is/skills/arch-skills-mcp.md` | process-skill-quality-validation | 2 |

#### Протокол обновления

| Шаг | Действие |
|-----|----------|
| 1 | **Перед миграцией** — найти кластер в реестре или определить новый (3–5 donor, общий target). Зафиксировать список donor. |
| 2 | **В процессе** — мигрировать все donor кластера по чеклисту (раздел 5). Не переходить к другому кластеру, пока текущий не завершён. При критических сомнениях — задать наводящий вопрос пользователю в чате, не прерывая процесс. |
| 3 | **После миграции** — обновить статус каждой donor-строки в таблицах 1.x / 2.x / 3 на `MIGRATED`. |
| 4 | **Верификация** — выполнить протокол верификации (7.3): skills:check, skills:causality:check, preflight, audit_skill_coverage. |
| 5 | **Завершение кластера** — когда верификация пройдена, поставить `[x]` в реестре кластеров. |
| 6 | **Новый кластер** — при выявлении кластера, отсутствующего в реестре, добавить строку с `[ ]`. |

#### Связь с таблицами 1.10 и др.

Таблицы в разделах 1.1–1.14, 2.x, 3 — **источник правды по donor**. Колонка «Целевой скилл» задаёт принадлежность к кластеру: donor с одинаковым target = один кластер. Реестр кластеров — агрегат для быстрого обзора «что сделано». Чекбоксы в реестре **не заменяют** обновление статусов в таблицах — оба обновляются.

---

## 5. Чеклист для каждого мигрируемого скилла

- [ ] **Кластер** (см. 4.5, 4.6): Проверить, есть ли другие donor → тот же target. Если да — извлечь кластер (3–5 скиллов, ужесточать по семантической близости) и мигрировать вместе. По завершении — обновить реестр кластеров (чекбокс `[x]`).
- [ ] **Префикс**: Проверить по реестру префиксов. Для `is/skills/` — только из `SKILL_ALLOWED`.
- [ ] Добавить frontmatter: `title`, `reasoning_confidence`, `reasoning_audited_at`, `reasoning_checksum`, `id`
- [ ] Добавить блок `> **Context**:` после H1
- [ ] Использовать только разрешённые H2
- [ ] Убрать ссылки на MBB/MMB, заменить на Target App
- [ ] Обновить пути в File Map (PATHS)
- [ ] **Развернуть казуальность** (см. раздел 6)
- [ ] **Прошить скилл в систему** (см. раздел 7)
- [ ] **Гейты и контракты** (см. 7.6): Если скилл задаёт проверяемые инварианты — создать/обновить gate и контракт
- [ ] **Обновить внутренние ссылки** — заменить пути на donor-скиллы (`a/...`, `../`) на целевые mmb
- [ ] **reasoning_checksum** — после правок Reasoning запустить `node is/scripts/architecture/update-reasoning-checksums.js`
- [ ] **Обновить таблицу миграции** — пометить каждую donor-строку как `MIGRATED`; при завершении кластера — поставить `[x]` в реестре кластеров (4.6)
- [ ] **Верификация после кластера** — выполнить протокол 7.3 (skills:check, skills:causality:check, preflight, audit_skill_coverage)
- [ ] **Перепроверить старое имя** по таблице Donor → Target (если источник — репозиторий a).
- [ ] Запустить `npm run skills:check` / `npm run preflight`

---

## 6. Протокол развёртывания казуальности (Causality Deployment)

**Не полагаться на «голый» перенос.** Каждый добавляемый скилл должен быть полноценно интегрирован в систему казуальности.

### 6.1 Регистрация хешей в causality-registry

| Шаг | Действие |
|-----|----------|
| 1 | Извлечь все `#for-*` и `#not-*` из секции Reasoning мигрируемого скилла |
| 2 | Проверить `causality-registry.md` — **если семантически эквивалентный хеш уже есть** — переиспользовать его, не создавать дубликат |
| 3 | Для новых хешей — добавить строку в таблицу: `\| \`#for-xxx\` \| Formulation \|` |
| 4 | Formulation — одна фраза, объясняющая *почему* (для #for) или *почему отвергнуто* (для #not) |
| 5 | Запустить `npm run skills:causality:check` — все хеши в коде и скиллах должны быть в реестре |

### 6.2 Проверка на дубликаты

Перед добавлением нового хеша — прочитать весь `causality-registry.md`. Если есть семантически близкий хеш (например, `#for-fail-fast` vs `#for-timeout-fail-fast`) — **расширить формулировку существующего** или переиспользовать, не плодить синонимы.

### 6.3 Связь с кодом

Если скилл описывает решение, уже реализованное в коде — добавить `@skill-anchor` или `@causality` в соответствующие файлы (см. `process-code-anchors.md`). Без прошивки в код скилл остаётся «мёртвым» — агенты не узнают о нём при редактировании файла.

---

## 7. Протокол прошивки скилла в систему (Full Wiring)

**Полная прошивка** — не только копирование файла, а интеграция во все точки потребления.

### 7.1 Обязательные точки прошивки

| Точка | Действие | Проверка |
|-------|----------|----------|
| **causality-registry.md** | Зарегистрировать все #for-* / #not-* из Reasoning | `skills:causality:check` |
| **id-registry** | id в frontmatter; preflight перегенерирует | `generate-id-registry.js` |
| **docs/index-skills.md** | Автогенерация при preflight | `generate-skills-index.js` |
| **Код** | Добавить `@skill` в file header и/или `@skill-anchor` / `@causality` в ключевые места | `audit_skill_coverage` (MCP) |

### 7.2 Опциональные точки прошивки

| Точка | Когда | Действие |
|-------|------|----------|
| **related_skills** / **related_ais** | Скилл связан с другими скиллами или AIS | Добавить в frontmatter целевых документов |
| **docs/ais/** | Скилл реализует политику из AIS | Добавить `related_skills` в AIS |
| **Гейты и контракты** | Скилл задаёт проверяемые инварианты | См. 7.6 |
| **.cursor/rules/** | Скилл должен влиять на поведение агента глобально | Создать/обновить rule с reference на скилл |
| **.cursorrules** | Критичное правило для всех сессий | Добавить fallback или триггер |

### 7.6 Гейты и контракты (Gates and Contracts)

**Проблема:** Некоторые donor-скиллы описывают инварианты, которые должны проверяться автоматически. Без гейта скилл становится «рекомендацией» — агенты могут нарушить правило, и никто не заметит.

**Когда нужен гейт/контракт:**

| Признак в скилле | Действие | Пример |
|------------------|----------|--------|
| Схема, перечисление, формат (ключи кеша, имена env, структура commit) | Создать контракт в `is/contracts/` и `validate-*.js` | cache-keys → `validate-cache-keys.js`, env → `env-rules.js` |
| Инвариант «X не должно происходить без Y» | Добавить проверку в существующий или новый gate | causality-invariant, docs-ids |
| Путь, путь к файлу, жёстко заданная структура | Зафиксировать в `paths.js` или контракте | PATHS, causality-exceptions.jsonl |

**Протокол при миграции:**

| Шаг | Действие |
|-----|----------|
| 1 | **Прочитать секции Contracts / Core Rules** — есть ли перечисление, схема, «MUST», «FORBIDDEN»? |
| 2 | **Проверить машиночитаемость** — можно ли формализовать правило в скрипт? (регулярки, Zod, проверка путей) |
| 3 | **Если да** — создать `is/scripts/architecture/validate-<topic>.js` или `is/contracts/<topic>.js`; добавить вызов в `preflight.js` при необходимости |
| 4 | **Документировать в скилле** — в секции Implementation Status указать: «Gate: `validate-<topic>.js`» |
| 5 | **Если нет** — скилл остаётся описательным; гейт не требуется |

**Примеры существующих связей skill → gate:**

| Скилл | Gate / контракт |
|-------|-----------------|
| `process-docs-lifecycle` | `validate-docs-ids.js`, `generate-id-registry.js` |
| `causality-registry` | `validate-causality.js`, `validate-causality-invariant.js` |
| `process-skill-governance` | `validate-skills.js`, `is/contracts/prefixes.js` |
| `arch-foundation` (env) | `env-rules.js`, `validateEnv` |
| `core/skills/cache-layer.md` | `validate-cache-integrity-delta.js` |

**Антипаттерн:** Мигрировать скилл про cache-keys, не создав проверку формата ключей — при первом же нарушении контракт «рассыплется». Лучше сразу предусмотреть gate или явно зафиксировать в скилле: «Gate: deferred until cache refactor».

### 7.3 Протокол верификации после кластера

**Цель:** После миграции каждого кластера — явно проверить прошитость скиллов и казуальности во всех контурах и реестрах. Не полагаться на «preflight прошёл» без понимания, что именно проверено.

| Контур / реестр | Что проверяется | Команда / инструмент |
|-----------------|-----------------|----------------------|
| **causality-registry** | Все `#for-*` / `#not-*` из кода и скиллов зарегистрированы; нет ghost-хешей | `npm run skills:causality:check` |
| **causality-invariant** | Хеш не удалён из одного файла при сохранении в других без exception | `validate-causality-invariant.js` (в preflight) |
| **id-registry** | Все id в frontmatter; `related_skills` / `related_ais` резолвятся | `generate-id-registry.js` + `validate-docs-ids.js` (в preflight) |
| **index-skills** | Скилл попал в `docs/index-skills.md` | `generate-skills-index.js` (в preflight) |
| **prefixes** | Префикс скилла в `SKILL_ALLOWED` | `npm run skills:check` |
| **reasoning** | `reasoning_checksum` совпадает с хешем секции Reasoning | `validate-reasoning.js` (в preflight) |
| **related_skills / related_ais** | Ссылки в frontmatter ведут на существующие id | `validate-docs-ids.js` (в preflight) |
| **.cursor/rules** | Ссылки на скиллы в rules резолвятся | `validate-rules-references.js` (в preflight) |
| **Код (якоря)** | Файлы под скиллом имеют `@skill` в header; нет лишних blind spots | `audit_skill_coverage` (MCP) — **ручная проверка** |
| **cache** (если кластер про кеш) | Целостность кеша, ключи, версии | `validate-cache-integrity-delta.js` (в preflight) |

**Порядок верификации после кластера:**

| Шаг | Действие |
|-----|----------|
| 1 | Запустить `npm run skills:check` — префиксы, структура |
| 2 | Запустить `npm run skills:causality:check` — хеши в реестре |
| 3 | Запустить `npm run preflight` — reasoning, causality-invariant, docs-ids, rules, index, id-registry, cache |
| 4 | **Ручная проверка:** `audit_skill_coverage` (MCP) — убедиться, что `uncovered_files` не содержит файлов, которые должны быть под мигрированным скиллом |
| 5 | При ошибке — исправить, повторить с шага 1 |

**Примечание:** Preflight покрывает большинство проверок. Шаги 1–2 можно выполнять до preflight для быстрой обратной связи. Шаг 4 — единственная проверка вне preflight (MCP).

### 7.4 Критерий «прошит»

Скилл считается **полностью прошитым**, когда:

1. Все его causality-хеши зарегистрированы в `causality-registry.md`
2. Код, который скилл описывает, содержит `@skill` или `@skill-anchor` с ссылкой на этот скилл
3. `npm run preflight` проходит без ошибок
4. При необходимости — добавлены `related_skills` / `related_ais` в связанные документы
5. **Если скилл задаёт проверяемые инварианты** — создан gate и/или контракт, добавлен в preflight (или явно отложен в скилле)

### 7.5 Протокол якорения (поиск точек в коде)

**Цель:** систематически найти все важные точки для `@skill` / `@skill-anchor` / `@causality`, включая шапки файлов.

| Шаг | Действие | Инструмент |
|-----|----------|------------|
| 1 | **Шапки файлов** — получить список JS/TS в `core/`, `app/`, `is/scripts/` без `@skill` в JSDoc | `audit_skill_coverage` (MCP) → `uncovered_files` |
| 2 | **Маппинг домена** — сопоставить скилл с паттернами кода (см. `process-code-anchors.md` → Where Anchors Are Required) | Ручной анализ |
| 3 | **Поиск по ключевым словам** — grep по импортам, вызовам: `PATHS`, `process.env`, провайдеры, `fetch`, `AbortSignal`, и т.д. | `rg` / семантический поиск |
| 4 | **Существующие якоря** — проверить, где скилл уже прошит | `search_anchors` (MCP) с `skillId` |
| 5 | **Шапка (первые 15–25 строк)** — для каждого кандидата проверить наличие JSDoc; если есть — добавить `@skill`, если нет — создать блок | Ручная правка |
| 6 | **Инлайн-якоря** — для неочевидных решений (timeout, retry, TTL, paths) добавить `// @skill-anchor` или `// @causality` | Ручная правка |

**Приоритет шапок:** для архитектурно значимых файлов `@skill` в file header **обязателен** (см. `process-code-anchors.md`). Файлы без шапки — blind spots для агентов.

### 7.7 Антипаттерны прошивки

| Антипаттерн | Почему плохо | Правильно |
|-------------|--------------|-----------|
| **«Голый» перенос** — скопировать .md в целевую папку и считать миграцию завершённой | Скилл не участвует в гейтах (`skills:causality:check` падает на неизвестных хешах). Агенты не видят его при работе с кодом — нет `@skill` в file header. `related_skills` не проставлены. Скилл «мёртвый» — формально есть, но не связан с системой. | Развернуть казуальность (раздел 6), прошить в код (7.5), обновить related_skills |
| **Якоря без регистрации хешей** — добавить `@skill-anchor #for-xxx` в код, не зарегистрировав `#for-xxx` в causality-registry | Preflight падает. `validate-causality.js` и `validate-causality-invariant.js` не пропустят неизвестные хеши. | Сначала добавить хеш в causality-registry, затем использовать в коде |
| **Только шапка, без инлайнов** — поставить `@skill` в file header, но не отметить неочевидные решения внутри файла | Агент видит, что файл под скиллом, но не понимает *почему* конкретный фрагмент сделан так. При рефакторинге легко нарушить неявный контракт. | Для неочевидных решений (timeout, retry, TTL) добавить `@skill-anchor` или `@causality` |
| **Скилл с инвариантом без гейта** — скилл требует «ключи кеша в формате X», но нет `validate-*.js` | Контракт декларативен, нарушения не обнаруживаются. Preflight проходит, но правило уже нарушено. | Создать gate/контракт (7.6) или явно указать в скилле: «Gate: deferred until …» |

---

## 8. Потенциальные пробелы (на заметку)

### 8.1 Протокол MERGE (слияние нескольких donor в один target)

При действии MERGE из таблиц миграции:

| Шаг | Действие |
|-----|----------|
| 1 | Выбрать target-скилл (уже существующий в mmb) или создать новый |
| 2 | Извлечь все `#for-*` / `#not-*` из каждого donor; объединить, устранив дубликаты |
| 3 | Секция Reasoning: объединить формулировки; при конфликте — оставить более общую или явно указать scope |
| 4 | Core Rules: объединить; при противоречии — разрешить в пользу target-архитектуры, убрать MBB-специфику |
| 5 | Зарегистрировать новые хеши в causality-registry; переиспользовать существующие |
| 6 | Прошить в код по протоколу 7.5 |
| 7 | Обновить все строки donor-скиллов в таблицах миграции на MIGRATED → target |

### 8.2 Прочие пробелы

| Пробел | Описание | Статус |
|--------|----------|--------|
| **Верификация «работает»** | Как убедиться, что MCP возвращает скилл, агент видит его при открытии файла? | Smoke test не формализован |
| **Deprecation в donor** | Если есть доступ к репо a — добавить в donor-скилл notice «Migrated to mmb: is/skills/xxx»? | Опционально |
| **Rollback миграции** | Как откатить неудачную миграцию (удалить скилл, убрать якоря)? | Не описано |
| **Язык** | Skills — English (process-docs-lifecycle). Donor может быть на русском. Явно указать «перевести»? | Частично: «заменить на Target App» |
| **Vue / .vue файлы** | `audit_skill_coverage` сканирует только `.js`. Если появятся `.vue` — протокол якорения должен это учитывать | Пока в mmb нет .vue; при появлении — расширить |

---

## 9. Отложенные скиллы (Deferred Skills)

**Проблема:** В процессе миграции попадаются donor-скиллы, полезные по содержанию, но не подходящие под текущее состояние инфраструктуры — Docker, n8n, Yandex Cloud и т.д. Выбрасывать не хочется, в active skills класть рано (нет кода для прошивки).

**Решение:** `docs/backlog/skills/` — общая папка бэклога на будущее, **не привязанная к is/core/app**.

### Назначение

| Аспект | Описание |
|--------|----------|
| **Что класть** | Скиллы, описывающие инфраструктуру, которой ещё нет в mmb: Docker, n8n, Yandex Cloud Functions, Cloudflare Workers и т.д. |
| **Почему не is/core/app** | Нет кода для якорения (`@skill`). Прошивка невозможна. `validate-skills` и preflight не должны их обрабатывать. |
| **Когда переносить** | Когда инфраструктура появится — переместить в `is/skills/`, `core/skills/` или `docs/ais/` и прошить в код. |

### Протокол

| Шаг | Действие |
|-----|----------|
| 1 | **При миграции** — donor-скилл про Docker/n8n/YC и т.п., но в mmb пока нет этого контура? Пометить статус `DEFERRED`. |
| 2 | **Скопировать** — адаптировать контент (убрать MBB, добавить frontmatter), положить в `docs/backlog/skills/<topic>.md` (например, `docker-compose-split.md`, `n8n-workflow-hygiene.md`). |
| 3 | **Не прошивать** — якоря, causality-registry, id-registry не требуются. Файл не входит в `generate-skills-index`, `validate-skills` его не сканирует. |
| 4 | **Обновить таблицу** — пометить donor как `DEFERRED`, целевой путь: `docs/backlog/skills/...`. |
| 5 | **При появлении инфраструктуры** — перенести из backlog в active skills, выполнить полную прошивку по разделам 5–7. |

### Связь с docs/backlog

`docs/backlog/` уже существует для отложенных планов (process-docs-lifecycle). `docs/backlog/skills/` — подпапка для отложенных скиллов. Единый бэклог, разнесённый по типу: планы в корне, скиллы в `skills/`.

---

## 10. Итеративное улучшение протокола

**Обязательство для ИИ-агентов:** В процессе миграции кластера, если агент замечает недостаток в алгоритмах или протоколах (разделы 4–9), влияющий на качество выполненной работы, он **должен дополнить этот документ** — добавить шаг, уточнение, антипаттерн или пример. Цель: будущие кластеры мигрируют качественнее.

| Когда | Действие |
|-------|----------|
| Обнаружен пропущенный шаг | Добавить в соответствующий протокол (чеклист, таблицу) |
| Найден новый антипаттерн | Добавить в таблицу антипаттернов (4.5, 7.7) с пояснением «почему плохо» и «правильно» |
| Протокол верификации не покрыл кейс | Расширить таблицу контуров (7.3) или порядок шагов |
| Критерий «прошит» оказался недостаточным | Дополнить раздел 7.4 |
| Другое улучшение | Добавить в уместный раздел; при необходимости — в 8.2 «Прочие пробелы» |

**Не требуется:** Согласование с человеком перед правкой. Документ живёт и эволюционирует вместе с миграцией.

---

*Документ будет обновляться по мере выполнения миграции.*
