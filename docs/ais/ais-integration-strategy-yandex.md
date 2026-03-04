---
id: ais-f6b9e2
status: draft
last_updated: "2026-03-04"
related_skills:
  - sk-bb7c8e
related_ais:
  - ais-e41384
---

# AIS: Стратегия интеграций для Yandex Cloud и API Gateway

<!-- @causality #for-docs-ids-gate #for-causality-harvesting #for-integration-legacy-remediation #for-atomic-remediation -->

## Концепция (High-Level Concept)

Документ описывает, как интеграции на стыке Yandex Cloud Function и API Gateway реализованы в текущей Target App-архитектуре, и какие решения используются для стабильной доставки данных/контура API.

## Текущее состояние (проверено на момент создания)

- `is/yandex/functions/api-gateway/README.md` используется как техническая сводка для функции API Gateway.
- Основной контракт чтения и записи данных по монетам зафиксирован в:
  - id:ais-e41384
  - связанных модулях `core/api/market-snapshot-*` и `core/contracts/market-contracts.js`.

## Комплект обязательных контрактов и гейтов

- `docs/ais`-спецификация имеет статус `draft`, будет продвинута в `incomplete` после полной ревизии donor-paths и связей.
- Legacy paths: skip patterns в path-contracts.js.
- Перед каждым значимым изменением проверить:
  - `node is/scripts/architecture/validate-docs-ids.js`
  - `node is/scripts/architecture/validate-causality.js`
  - `node is/scripts/architecture/validate-skill-anchors.js`
- Обязательные поля в frontmatter заполнены (`id`, `status`, `last_updated`, `related_skills`, `related_ais`).

## Микро-правила интеграции для этой области

- Новые ссылки в документации внутри `mmb` должны быть в пределах целевых путей `is/`, `core/`, `app/`, `docs/`.
- Если исходный путь отсутствует в коде:
  - зафиксировать `NEEDS_REWRITE` или `REQUIRES_ARCH_CHANGE`;
  - не оставлять невалидную ссылку как единственный источник.
- Для каждого подтвержденного rewrite добавить ссылку на фактический файл/модуль.

## Секции, требующие следующего шага

1. Пройти каждый legacy-путь из donor-источников и подтвердить:
   - файл существует,
   - соответствует текущей архитектуре,
   - либо заменить новым эквивалентом, либо исключить.
2. После подтверждения перенести ключевые выводы в:
   - id:sk-d76b68
   - id:sk-3225b2
   (если требуется в рамках следующих этапов миграции).
