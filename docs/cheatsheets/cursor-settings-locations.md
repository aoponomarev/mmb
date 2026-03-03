# Расположение настроек Cursor / Markdown Preview

## Где хранятся настройки

| Уровень | Путь | Приоритет |
|---------|------|-----------|
| **Workspace** | `app.code-workspace` → `settings` | Высший (переопределяет остальное) |
| **Папка проекта** | `.vscode/settings.json` | Средний |
| **Пользователь** | `%APPDATA%\Cursor\User\settings.json` | Базовый |

## Markdown Preview (Cursor)

Cursor использует **встроенный** preview (не расширение VS Code). `markdown.styles` не применяется.

**Правило frontmatter (везде):** Любой markdown с YAML frontmatter должен иметь пустую строку перед закрывающим `---`. Иначе CommonMark парсит вторую `---` как setext underline, и строка `id: ...` рендерится как огромный h2. См. `#for-frontmatter-format` в `process-docs-lifecycle.md`.

```yaml
---
id: ais-template
status: draft

---
```

## Альтернатива: Markdown Preview Enhanced

Расширение с поддержкой `markdown.styles` и `Customize CSS (Workspace)`.
