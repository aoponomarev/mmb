---
id: ais-c8f2a1
status: incomplete
last_updated: "2026-03-10"
related_skills:
  - sk-7e4d2b
  - sk-3225b2
  - sk-cecbcc
related_ais:
  - ais-e9a5c2
  - ais-775420

---
<!-- Важно: оставлять пустую строку перед "---" ! -->

# AIS: GitHub Copilot — интеграция и постановщик задач

<!-- Спецификация роли Copilot в проекте: beacon, делегирование, сбор новостей интеграций → docs/backlog/copilot-gh. Детали добавляются по мере работы над постановщиком задач. -->

## Идентификация и жизненный цикл

```yml
id: ais-c8f2a1
status: incomplete
last_updated: "2026-03-10"
related_skills:
  - sk-7e4d2b  # ai-copilot-delegation
  - sk-3225b2  # arch-mcp-ecosystem
  - sk-cecbcc  # process-ai-collaboration
related_ais:
  - ais-e9a5c2  # agent-orchestration-contour
  - ais-775420  # infrastructure-integrations
```

## Концепция (High-Level Concept)

**GitHub Copilot** — облачный асинхронный агент, работающий в GitHub Actions. Используется для задач, где локальный агент (Cursor) неэффективен: широкий анализ репо, сбор внешней информации (релизы, документация интеграций), создание backlog-записей без доступа к governance-контексту (skills, causality).

**Ключевое ограничение:** Copilot не находится в общем пространстве скиллов и казуальностей. Контекст передаётся через Beacon (`.github/copilot-instructions.md`) и тело Issue. Без Beacon качество вывода падает.

## Beacon и контекст

| Артефакт | Путь | Назначение |
|----------|------|------------|
| **Beacon** | `.github/copilot-instructions.md` | Copilot читает при каждом запросе. Ссылки на glossary, id-registry, causality-registry, слои. |
| **Glossary** | docs/glossary.md | Терминология: Layer vs Contour, Service vs Provider. Запрет кальков. |
| **Causality** | is/skills/causality-registry.md | Хеши #for-xxx / #not-xxx для rationale. |

См. id:ais-e9a5c2 §8 — полное описание handoff Cursor ↔ Copilot.

## Постановщик задач (Task Assigner) — docs/backlog/copilot-gh

**Цель:** Загружать Copilot работой по сбору новостей и полезностей из инфраструктурных интеграций проекта (Cloudflare, Yandex Cloud, N8N и др.), с записью в `docs/backlog/copilot-gh/`.

**Источники:** `docs/backlog/copilot-gh/sources.json` — полный список из MBB NEWS_SOURCES. Фильтр исключает: n8n, Docker, Ollama (и связанные ссылки).

**Выход:** Markdown-записи в `docs/backlog/copilot-gh/` — **конкретные предложения** по улучшению архитектуры (не «проверить релиз», а аналитика + рекомендации).

### Cron (02:00 MSK)

- **Workflow:** `.github/workflows/copilot-backlog-cron.yml`
- **Расписание:** `0 23 * * *` (23:00 UTC = 02:00 MSK)
- **Скрипт:** `is/scripts/infrastructure/copilot-backlog-cron.js` — собирает источники, формирует Issue
- **Issue:** создаётся для Copilot с задачей на аналитику

### Роль Copilot (аналитическая работа)

1. Изучить релиз-ноты, changelog, новые фичи
2. Сопоставить с архитектурой (Beacon, glossary, слои)
3. Предложить **конкретные улучшения** — что внедрить, куда, зачем
4. Записать в `docs/backlog/copilot-gh/YYYY-MM-DD-{source-id}.md` на русском

### Место в структуре

```
docs/backlog/
├── copilot-gh/           # Записи от Copilot (аналитика)
│   ├── sources.json     # Полный список + filter.excludeIds
│   ├── .state.json      # Состояние (последние релизы)
│   ├── YYYY-MM-DD-*.md  # Записи с конкретными предложениями
│   └── README.md
├── skills/
└── fix-*.md
```

## Безопасные задачи для Copilot (без governance)

Задачи, не требующие знания skills/causality/контрактов:

- Сбор внешних ссылок (404-fix)
- Форматирование markdown
- Patch-обновления зависимостей
- Unit-тесты для изолированных утилит
- Записи в docs/backlog/copilot-gh по шаблону

## Контракты и гейты

- id:copilot-beacon (.github/copilot-instructions.md) — Beacon, обязателен для качественной работы Copilot.
- id:sk-7e4d2b (ai-copilot-delegation) — когда делегировать, формат Issue.
- scripts/git/unassign-copilot.ps1 — снятие Copilot с issues перед сменой нагрузки.

## Лог изменений (Changelog)

| Дата | Изменение |
|------|-----------|
| 2026-03-10 | Создание AIS. Beacon восстановлен. Постановщик задач — заглушка, детали добавляются по мере работы. |
