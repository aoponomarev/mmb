---
id: plan-f7e2a1
status: active
last_updated: "2026-03-04"
related_skills:
  - sk-8991cd
  - sk-f449b3
  - sk-883639
related_ais:
  - ais-f7e2a1
---

# План внедрения: стандарт шапки кодовых файлов (File Header Rollout)

**Цель:** Ввести единый структурированный шаблон шапки комментариев во всех целевых кодовых файлах, реестр file id и гейты для поддержания актуальности. Спецификация: id:ais-f7e2a1. Шаблон: shared/templates/file-header-template.js.

---

## Фаза 0: Подготовка артефактов (готово)

- [x] Шаблон шапки в `shared/templates/file-header-template.js`.
- [x] AIS id:ais-f7e2a1.
- [x] План внедрения id:plan-f7e2a1.

## Фаза 1: Контракт и скилл

- [x] Создать контракт `is/contracts/file-header-contract.js`:
  - [x] Константы: `FILE_ID_PATTERN`, `REQUIRED_HEADER_FIELDS`, `ALLOWED_HEADER_TAGS`.
  - [x] Функции: extractHeaderComment, validateHeader (file id → требует @description).
  - [x] Экспорт для validate-file-headers.js.
- [x] Создать скилл `is/skills/process-file-header-standard.md` (id: sk-f7e2a1):
  - [x] Правила заполнения слотов, порядок полей, ссылка на AIS и контракт.
- [x] Зарегистрировать скилл в id-registry (generate-id-registry выполняется в preflight).

## Фаза 2: Генерация file id и реестр

- [x] Реализовать `is/scripts/architecture/assign-file-ids.js`:
  - [x] Обход core, app, shared, mm, is; djb2 + Base58; формат #JS-/#TS- + hash.
  - [x] Режим: по умолчанию пишет реестр; --dry-run только вывод.
- [x] Реестр `is/contracts/docs/code-file-registry.json`: структура id → path; assign-file-ids пишет при каждом запуске.
- [ ] (Опционально) Режим --write для подстановки file id в шапки файлов — при необходимости в следующих итерациях.

## Фаза 3: Гейт валидации

- [x] Реализовать `is/scripts/architecture/validate-file-headers.js`: при наличии file id в шапке проверка @description; exit 1 при нарушении.
- [x] Вызов в preflight после validate-code-comments-english.
- [x] npm: `file-headers:check`, `file-headers:assign`.

## Фаза 4: Causality и индекс

- [x] Добавить в causality-registry запись `#for-file-header-standard`.
- [x] generate-id-registry подхватывает новый AIS (id:ais-f7e2a1); index-ais генерируется в preflight.

## Фаза 5: Постепенное покрытие файлов

- [x] Единый вид шапок (AIS): без баннеров `====`, без дублирования Skill при наличии @skill; списки PRINCIPLES/USAGE/REFERENCES сохранять.
- [ ] Определить порядок обхода по дереву (например: is/scripts → is/contracts → core → shared → app → mm).
- [ ] Запускать assign-file-ids по реестру; вставка file id + @description вручную/пакетами с опорой на code-file-registry.json.
- [ ] Для файлов без шапки: вставка шаблона из file-header-template.js с подставленным file id и минимальным @description.
- [ ] После каждого подмножества: npm run file-headers:check и npm run preflight.
- [ ] Обновлять code-file-registry при каждом добавлении/переименовании файла (assign-file-ids при изменении дерева).

**Прогресс:** Шаблон: расширяемый список секций в file-header-template.js. Восстановлена аутентичность в menus-config, cache-config, storage-layers, modules-config, cache-migrations, data-providers-config. **core** — полностью (баннеров нет). **shared** — полностью: utils (messages-store), components (button, button-group, modal, coin-block, system-messages, system-message, modal-buttons, timezone-selector, sortable-header, cell-num), templates (modal-template, dropdown-template); баннеров нет. **app** — полностью: components (app-header, app-footer, auth-button, portfolios-manager, session-log-modal-body, auth-modal-body, portfolio-modal-body, timezone-modal-body, storage-reset-modal-body, portfolio-view, portfolio-form, portfolios-import, modal-example, coingecko-cron-history, ai-api-settings, icon-manager-modal-body, postgres-settings, coin-set-load, coin-set-save), templates (app-header, app-footer, auth-button, auth-modal-body, postgres-settings, portfolios-manager, ai-api-settings, icon-manager-modal-body); баннеров нет. **mm** — полностью: model-manager, base-model-calculator, median-air-260101-calculator, median-air-260115-calculator; баннеров нет. Дальше: is (скрипты/контракты уже частично; остальные по плану).

## Критерии завершения

- Контракт и скилл созданы и проходят валидацию (skills:check, preflight).
- Гейт validate-file-headers включён в preflight и не падает на целевом наборе файлов.
- Реестр code-file-registry.json актуален для всех файлов с шапками.
- В causality-registry присутствует #for-file-header-standard.
- План помечен как выполненный (или статус переведён в docs/done после дистилляции в AIS).

## Ссылки

- AIS: id:ais-f7e2a1
- Шаблон: shared/templates/file-header-template.js
- Контракт (создать): is/contracts/file-header-contract.js
- Гейт (создать): is/scripts/architecture/validate-file-headers.js
- Назначение id (создать): is/scripts/architecture/assign-file-ids.js
- Реестр (создать): is/contracts/docs/code-file-registry.json
