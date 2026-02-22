# MMB Skills

Репозиторий скилов проекта MMB — единый набор знаний для AI-агентов (Cursor, Continue).

## Структура

```
skills/
├── process/          ← процессы, протоколы, жизненный цикл
├── architecture/     ← архитектурные решения MMB
├── integrations/     ← MCP, Continue, Docker, внешние API
├── troubleshooting/  ← диагностика и решения
├── security/         ← секреты, env, границы доступа
├── libs/             ← работа с зависимостями
├── drafts/           ← черновики (не индексируются)
├── index.md          ← мастер-индекс
└── MIGRATION.md      ← реестр миграции из MBB (временный)
```

## Формат скила

```yaml
---
id: skill-id
title: "Category: Skill Title"
scope: process
tags: [#tag1, #tag2]
version: 1.0.0
priority: high
updated_at: YYYY-MM-DD
---
```

### Расширение для архитектурных ADR-скилов (`skills/architecture/arch-*.md`)

```yaml
status: active                 # active | draft | deprecated
confidence: high               # high | medium | low
review_after: YYYY-MM-DD       # дата ревизии на устаревание
decision_scope: architecture   # architecture | process | integration
decision_id: ADR-ARCH-001      # уникальный ID решения
supersedes: ADR-ARCH-000       # что заменяет (или none)
```

Обязательные разделы в ADR-скиле:
- `## Implementation Status in MMB` (Implemented / Pending / Doubtful)
- `## Architectural Reasoning (Why this way)`
- `## Alternatives Considered`

## Связь с кодом

Каждый JS-файл проекта должен содержать ссылки на скилы:

```javascript
/**
 * Skill: process/process-settings-sync
 * Skill: security/skill-secrets-hygiene
 */
```

MCP-инструмент `find_skills_for_file` находит эти ссылки автоматически.
`audit_skill_coverage` показывает файлы без skill-ссылок.

## Миграция из MBB

Скилы переносятся из MBB по мере необходимости. Статус — в `MIGRATION.md`.
Подробнее: `../docs/План_Skills_MCP.md`.

## Связанность и anti-stale протокол

- Используем явные `relations` по ID, без файловых путей.
- Для каждого архитектурного скила добавляем минимум 2 связи:
  - к governing process-скилу;
  - к security/integration скилу (если есть зависимость).
- Каждый `arch-*` скил обязан иметь `decision_id`.
- Если решение заменяет старое — указывать `supersedes` на предыдущий `decision_id`.
- В каждом ADR-скиле ставим `review_after` и обновляем `updated_at` при каждой ревизии.
- Если решение больше неактуально — `status: deprecated` и ссылка на заменяющий скил в `relations`.
- Контракт связности и правила эволюции: `meta/skills-linking-governance.md`.
- Автоматическая проверка графа связей: `npm run skills:graph:check`.
