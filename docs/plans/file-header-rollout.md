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
<!-- Важно: оставлять пустую строку перед "---" ! -->

# План внедрения: стандарт шапки кодовых файлов (File Header Rollout)

**Цель:** Ввести единый структурированный шаблон шапки комментариев во всех целевых кодовых файлах, реестр file id и гейты для поддержания актуальности. Спецификация: id:ais-f7e2a1 (docs/ais/ais-file-header-standard.md). Шаблон: #JS-EsMQyEpA (shared/templates/file-header-template.js).

---

## Фаза 0: Подготовка артефактов (готово)

- [x] Шаблон шапки в #JS-EsMQyEpA (shared/templates/file-header-template.js).
- [x] AIS id:ais-f7e2a1 (docs/ais/ais-file-header-standard.md).
- [x] План внедрения id:plan-f7e2a1 (docs/plans/file-header-rollout.md).

## Фаза 1: Контракт и скилл

- [x] Создать контракт #JS-Am2QGp6w (is/contracts/file-header-contract.js):
  - [x] Константы: `FILE_ID_PATTERN`, `REQUIRED_HEADER_FIELDS`, `ALLOWED_HEADER_TAGS`.
  - [x] Функции: extractHeaderComment, validateHeader (file id → требует @description).
  - [x] Экспорт для validate-file-headers.js.
- [x] Создать скилл id:sk-f7e2a1 (is/skills/process-file-header-standard.md):
  - [x] Правила заполнения слотов, порядок полей, ссылка на AIS и контракт.
- [x] Зарегистрировать скилл в id-registry (generate-id-registry выполняется в preflight).

## Фаза 2: Генерация file id и реестр

- [x] Реализовать #JS-1E2YRywQ (is/scripts/architecture/assign-file-ids.js):
  - [x] Обход core, app, shared, mm, is; djb2 + Base58; формат #JS-/#TS- + hash.
  - [x] Режим: по умолчанию пишет реестр; --dry-run только вывод.
- [x] Реестр `is/contracts/docs/code-file-registry.json`: структура id → path; assign-file-ids пишет при каждом запуске.
- [ ] (Опционально) Режим --write для подстановки file id в шапки файлов — при необходимости в следующих итерациях.

## Фаза 3: Гейт валидации и полная проверка

- [x] Реализовать #JS-zh26RZvs (is/scripts/architecture/validate-file-headers.js): при наличии file id в шапке проверка @description; exit 1 при нарушении.
- [x] Полная проверка по контракту: file id в шапке должен совпадать с путём (getExpectedFileId); контракт: validateHeaderFull, getExpectedFileId, getFileIdFromHeader.
- [x] Режим `--fix`: автоматическая правка неверного file id в файле.
- [x] Вызов в preflight после #JS-GcQ9UGZD (is/scripts/architecture/validate-code-comments-english.js).
- [x] npm: `file-headers:check`, `file-headers:assign`, `file-headers:fix`, `file-headers:audit`.

## Фаза 4: Causality и индекс

- [x] Добавить в causality-registry запись `#for-file-header-standard`.
- [x] generate-id-registry подхватывает новый AIS (id:ais-f7e2a1); index-ais генерируется в preflight.

## Фаза 5: Постепенное покрытие файлов

- [x] Единый вид шапок (AIS): без баннеров `====`, без дублирования Skill при наличии @skill; списки PRINCIPLES/USAGE/REFERENCES сохранять.
- [x] Определить порядок обхода по дереву (is → core → shared → app → mm; внутри is: cloudflare, yandex).
- [x] Замена шапок с баннерами на единый формат (file id + @description, без дублирования, списки по необходимости).
- [x] Файлы с баннерами обработаны: core, shared, app, mm, is (edge-api, yandex functions).
- [x] Для файлов без шапки: добавлены file id и @description во все целевые .js (256 файлов в core, app, shared, mm, is).
- [x] После батчей: file-headers:check и preflight.
- [x] Обновлять реестр и шапки при изменении дерева: `npm run file-headers:fix` (assign-file-ids + validate --fix). После изменений в коде — полная перепроверка шапки; ложное в шапке исправлять или удалять (AIS).

**Прогресс:** Все 256 целевых .js/.ts (core, app, shared, mm, is) имеют шапку нового формата: #JS-xxx + @description. Баннеры убраны; файлы без шапки дополнены (generate-skills-index, pluralize, query-telemetry, run-migration, create-skill, layout-sync, deploy, V2_logic, тесты, modal-buttons-template, combobox-template, naming-rules.test, market-snapshot-node-server и др.). Preflight проходит.

## Критерии завершения

- Контракт и скилл созданы и проходят валидацию (skills:check, preflight).
- Гейт validate-file-headers включён в preflight и не падает на целевом наборе файлов.
- Реестр code-file-registry.json актуален для всех файлов с шапками.
- В causality-registry присутствует #for-file-header-standard.
- План помечен как выполненный (или статус переведён в docs/done после дистилляции в AIS).

## Ссылки

- AIS: id:ais-f7e2a1 (docs/ais/ais-file-header-standard.md)
- Шаблон: #JS-EsMQyEpA (shared/templates/file-header-template.js)
- Контракт: #JS-Am2QGp6w (is/contracts/file-header-contract.js)
- Гейт: #JS-zh26RZvs (is/scripts/architecture/validate-file-headers.js)
- Назначение id: #JS-1E2YRywQ (is/scripts/architecture/assign-file-ids.js)
- Реестр: is/contracts/docs/code-file-registry.json
