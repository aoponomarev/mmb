# Технический долг: Нарушения правил именования (Naming Violations)

> Статус: Отложено (В бэклоге)
> Приоритет: Низкий
> Контекст: `is/contracts/naming/naming-rules.js` (Правило kebab-case)

## Описание
В рамках аудита архитектуры и внедрения Модуля нейминга было обнаружено **14 файлов**, чьи имена не соответствуют строгому правилу `kebab-case`. При этом ни один из файлов ядра (бизнес-логики или UI) не затронут. Нарушения касаются только документации и старых вспомогательных python/js скриптов.

## Список файлов для будущего переименования:

### Документация (docs)
- `docs/deepseek_mermaid_*.mermaid` / `*.png` -> переименовать с дефисами.
- ARCHITECTURE_REVIEW (в docs/done/) -> architecture-review.md
- OBSOLETE_CODE_REPORT (в docs/done/) -> obsolete-code-report.md
- `docs/СИМЛИНКИ.txt` -> `symlinks.txt`

### Скрипты (scripts)
*(перевести со `snake_case` на `kebab-case`)*
- check_fallback_observability.py (в scripts/) -> check-fallback-observability.py
- check_ssot_guardrails.py -> check-ssot-guardrails.py
- enforce_utf8.py -> enforce-utf8.py
- fix_mojibake.py -> fix-mojibake.py
- fix_mojibake_full.mjs -> fix-mojibake-full.mjs
- fix_syntax_errors.mjs -> fix-syntax-errors.mjs
- recover_mojibake_from_archive.py -> recover-mojibake-from-archive.py

## Стратегия решения
Мы **не** исправляем это массово, чтобы не сломать возможные зависимости (особенно в сторонних Python-инструментах). Эти файлы будут переименованы по мере их интеграции в новый Control Plane или по мере надобности их редактирования.

*Примечание: папка `.github` была добавлена в исключения (разрешены имена, начинающиеся с точки).*