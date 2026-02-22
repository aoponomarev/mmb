# Project Evolution Log — MMB

> Machine-assisted log generated from git history and enriched by agent analysis.
> One date = one block. Tier A (architecture-critical) → Tier B (structural) → Tier C (operational).
> Context tags `[Skill:] [MCP:] [SSOT:] [Rule:]` link entries to the knowledge graph.
>
> To update: `node scripts/architecture/project-evolution-update.js`
> To rebuild: `node scripts/architecture/project-evolution-update.js --rebuild`

---

### 22/02/26
Полная ревизия связности проекта перед переходом к следующему этапу миграции: устранены 10+ stale-ссылок (`architecture-ssot`→`arch-ssot-governance`; `scripts/git/`→`scripts/infrastructure/`), добавлены frontmatter `relations` в foundational-скилы (`process-env-sync-governance`, `protocol-git-secrets-and-env-boundary`, `skill-secrets-hygiene`), исправлен `scope: mmb`→`scope: process` в `process-project-evolution-logging`, добавлен orphan-fix (relations к `arch-master`/`process-agent-commands`), синхронизирована нумерация npm-команд в `scripts/README.md`, восстановлены кириллические имена файлов в `plans-sync-governance`, добавлен `План_Domain_Models.md` (future) в мастер-план. Skills health score: 100/100, все 7 гейтов зелёные.
<!-- [Skill: skills-linking-governance] [SSOT: paths.js] [SSOT: project-evolution.md] -->

Инфраструктурное усиление проекта: внедрение runtime Zod-валидации критических путей в `paths.js` для раннего обнаружения конфигурационных ошибок; добавление `DATASETS_ROOT` в `.env.example` как обязательной переменной среды. Запущен пакет validation-скриптов в `package.json`: `validate-skill-graph`, `validate-ssot`, `validate-symlinks`, `validate-env-example`. Развёрнут полный набор архитектурных скилов (`arch-master`, `arch-infrastructure`, `arch-security`, `arch-ssot-governance`, `arch-template-adr`) с ADR-протоколом для фиксации архитектурных решений. Добавлены правила агента: `migration-arch-agent.mdc`, `migration-docs-always.mdc`, `anti-calque-terminology-always.mdc`.
<!-- [SSOT: paths.js] [SSOT: .env.example] [Rule: migration-arch-agent.mdc] -->

---

### 21/02/26
Усиление безопасности и Git-дисциплины: введён скрипт `scripts/infrastructure/preflight-solo.ps1` для проверки окружения перед коммитом; добавлен `validate-env-example.js` для обнаружения расхождений между `.env` и `.env.example`. Создан скилл `process-env-sync-governance` (протокол синхронизации переменных среды) и `protocol-git-secrets-and-env-boundary` (граница секретов в Git). Добавлены скиллы `security/skill-secrets-hygiene`. Настроено исключение `secrets-backup.txt` из Git. Добавлены пути связанных репозиториев в `paths.js`; зафиксировано полное удаление `.cursorrules` в архитектуре MMB (переход на `.cursor/rules/*.mdc`); добавлен `mcp.json` и `settings.json` в `.cursor/`.
<!-- [Skill: process-env-sync-governance] [SSOT: paths.js] -->

---

### 20/02/26
**Старт проекта MMB.** Инициализация монорепозитория: `paths.js` как SSOT путей с поддержкой ESM, `mcp/skills-mcp/server.js` (416 строк) — первый MCP-сервер с инструментами `list_skills`, `read_skill`, `propose_skill`, `find_skills_for_file`, `audit_skill_coverage`, `search_skills`. Базовая структура Skills-системы: `skills/MIGRATION.md` (289 строк), `skills/index.md`, `skills/README.md`. Введена категория `skills/meta/` для мета-скилов управления системой. Развёрнуты 5 `always`/`agent` правил Cursor: `rule-generating-agent-always.mdc`, `communication-always.mdc`, `memory-protocol-always.mdc`, `skill-anchors-agent.mdc`, `skills-mcp-always.mdc`. Добавлен `git-commit-message` скилл для управления форматом коммитов.
<!-- [MCP: skills-mcp] [Skill: git-commit-message] [Rule: skills-mcp-always.mdc] [Rule: memory-protocol-always.mdc] -->

---
