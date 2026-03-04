---
id: plan-cd91e4
status: complete
last_updated: "2026-03-04"
---

# План: Глобальный переход markdown-ссылок на ID-контракты

## Цель

Перевести проект с path-centric ссылок в `.md` на стабильные ID-контракты с централизованным реестром, чтобы снизить риск поломок при перемещении файлов.

## Принципы

- ID является стабильным идентификатором документа, путь - только транспорт.
- Любой `.md` в рабочем репозитории обязан иметь frontmatter с `id`.
- Дубликаты `id` блокируют preflight.
- Legacy path-ссылки допускаются только как временные и постепенно замещаются на `id:`-ссылки.

## Этапы внедрения

1. Инвентаризация и нормализация
   - Проставить `id` во все `.md` без frontmatter.
   - Подключить global validator `md:ids:validate` в preflight.
2. Расширение SSOT-реестра
   - `generate-id-registry.js` должен публиковать не только `skills/ais`, но и общий `markdown` словарь.
3. Массовая миграция ссылок
   - Конвертировать критичные перекрестные ссылки в docs с path на `id:`-контракты.
   - Для каждого батча фиксировать прогресс и риски в реестре миграции.
4. Финализация
   - Убрать legacy path-ссылки из активных документов (кроме явно разрешенных historical notes).
   - Зафиксировать режим maintenance для дальнейшего точечного сопровождения.

## Уже внедрено в текущем запуске

- Добавлены скрипты:
  - `is/scripts/architecture/assign-missing-md-ids.js`
  - `is/scripts/architecture/validate-global-md-ids.js`
- Добавлены npm-команды:
  - `md:ids:assign`
  - `md:ids:validate`
- Включен preflight-gate:
  - `validate-global-md-ids.js`
- Запущена массовая проставка `id` в markdown без `id`.

## Критерий текущей волны

- Все `.md` (кроме технически исключенных директорий) имеют `id`.
- `md:ids:validate` проходит стабильно.
- `id-registry.json` содержит глобальную секцию `markdown`.

## FIN Статус

Все четыре этапа выполнены:

1. [x] 104 markdown-файла получили `id` в frontmatter.
2. [x] `id-registry.json` — единый SSOT с секциями `skills`, `ais`, `markdown`.
3. [x] `validate-docs-ids` переведен на чтение только из глобального реестра.
4. [x] `validate-id-contract-links` — blocking gate для `id:` ссылок.
5. [x] `audit-path-centric-doc-links` — blocking gate: active docs не содержат path-ссылок.
6. [x] `audit-path-centric-skill-links` — blocking gate: active skills не содержат path-ссылок.
7. [x] `normalize-text-encoding` — глобальная нормализация UTF-8 without BOM.
8. [x] `validate-docs-encoding` — расширен на весь `docs/` контур.

Режим: maintenance. Новые регрессии закрываются атомарно через `id:`-ссылки.
