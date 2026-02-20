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
