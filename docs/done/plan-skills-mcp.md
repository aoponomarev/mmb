# План_Skills_MCP.md

> Категория: План системы скилов и MCP
> Статус: **Завершён** (упрощённая реализация v1)
> Казуальность: `is/skills/arch-skills-mcp.md`

---

## Что реализовано

Система скилов Target App реализована в упрощённом виде по сравнению с Legacy App (195 скилов, 10+ категорий, Obsidian vault, submodule). Сознательное решение — масштабировать инфраструктуру только по мере роста количества скилов.

### Ключевые компоненты

1. **Хранилище скилов**: `is/skills/`, `core/skills/`, `app/skills/` — 8 скилов по доменам.
2. **Валидатор**: `is/scripts/architecture/validate-skills.js` (`--json` для автоматизации).
3. **Генератор индекса**: `is/scripts/architecture/generate-skills-index.js`.
4. **Trend-трекер**: `is/scripts/architecture/skills-health-trend.js` + `skills-health-trend-report.js`.
5. **MCP-сервер**: `is/mcp/skills/server.js` (адаптирован из Legacy App).
6. **Memory MCP**: `@modelcontextprotocol/server-memory` с файлом `is/memory/memory.jsonl`.
7. **Cursor конфигурация**: `.cursor/mcp.json` для обоих серверов.

### Что не переносится из Legacy App

- Obsidian vault (.obsidian/ конфигурация) — не нужен для одного проекта.
- Git submodule для skills — избыточная синхронизация.
- Полный YAML frontmatter (id/scope/tags/priority/relations) — введём при 30+ скилах.
- `MIGRATION.md` реестр — миграция отслеживается через `docs/plans/`.
- Детальные валидаторы: `validate-skill-graph.js`, `validate-skills-health.js`, `validate-ssot.js`, `validate-symlinks.js` — консолидированы в один `validate-skills.js`.
- Мета-скилы (30 штук) — переносятся по требованию.
- `propose_skill` MCP tool — отложено.
- n8n интеграция для обнаружения кандидатов в скилы — отложено.

### Протокол связи с кодом (skill anchors)

Механизм `/** @skill path/to/skill */` и `// @skill-anchor` переносится из Legacy App без изменений. Используется для `find_skills_for_file` и `audit_skill_coverage` MCP-инструментов.

---

*Полная казуальность зафиксирована в `is/skills/arch-skills-mcp.md`.*
