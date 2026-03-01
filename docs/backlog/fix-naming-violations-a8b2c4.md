# Технический долг: Нарушения правил именования (Naming Violations)

> Статус: Отложено (В бэклоге)
> Приоритет: Низкий
> Контекст: `is/contracts/naming/naming-rules.js` (Правило kebab-case)

## Описание
В рамках аудита архитектуры и внедрения Модуля нейминга было обнаружено **14 файлов**, чьи имена не соответствуют строгому правилу `kebab-case`. При этом ни один из файлов ядра (бизнес-логики или UI) не затронут. Нарушения касаются только документации и старых вспомогательных python/js скриптов.

## Список файлов для будущего переименования:

### Документация (docs)
- `docs/deepseek_mermaid_*.mermaid` / `*.png` -> переименовать с дефисами.
- `docs/done/ARCHITECTURE_REVIEW.md` -> `architecture-review.md`
- `docs/done/OBSOLETE_CODE_REPORT.md` -> `obsolete-code-report.md`
- `docs/СИМЛИНКИ.txt` -> `symlinks.txt`

### Скрипты (scripts)
*(перевести со `snake_case` на `kebab-case`)*
- `scripts/check_fallback_observability.py` -> `check-fallback-observability.py`
- `scripts/check_ssot_guardrails.py` -> `check-ssot-guardrails.py`
- `scripts/enforce_utf8.py` -> `enforce-utf8.py`
- `scripts/fix_mojibake.py` -> `fix-mojibake.py`
- `scripts/fix_mojibake_full.mjs` -> `fix-mojibake-full.mjs`
- `scripts/fix_syntax_errors.mjs` -> `fix-syntax-errors.mjs`
- `scripts/recover_mojibake_from_archive.py` -> `recover-mojibake-from-archive.py`

## Стратегия решения
Мы **не** исправляем это массово, чтобы не сломать возможные зависимости (особенно в сторонних Python-инструментах). Эти файлы будут переименованы по мере их интеграции в новый Control Plane или по мере надобности их редактирования.

*Примечание: папка `.github` была добавлена в исключения (разрешены имена, начинающиеся с точки).*