---
id: ais-3f4e5c
status: incomplete
last_updated: "2026-03-04"
related_skills:
  - sk-0e193a
  - sk-c3d639
related_ais:
  - ais-e41384
  - ais-d4e5f6
  - ais-71a8b9

---
<!-- Важно: оставлять пустую строку перед "---" ! -->

# AIS: Портфель и компонентные правила отображения

<!-- @causality #for-integration-legacy-remediation #for-atomic-remediation #for-docs-ids-gate -->

## Концепция (High-Level Concept)

Документ аккумулирует legacy-ориентированные аннотации, которые уже существуют в кодовой базе для портфельного домена и компонентных стилей. Цель — зафиксировать исторический контекст и привязки к новым рабочим артефактам без использования прямых `legacy`-путей в теле комментариев.

## Локальные Политики (Module Policies)

- Для legacy-упоминаний в комментариях используется трассируемый формат `LIR-*`.
- При появлении новых `legacy`-путей: добавить в #JS-cMCNbcJ1 (path-contracts.js) SKIP_LINK_PATTERNS или обновить ссылку.

## Компоненты и Контракты (Components & Contracts)

- #JS-rrLtero9 (portfolio-engine.js) — доменная логика портфеля.
- #JS-hG34MvdS (portfolio-validation.js) — контрактная валидация черновиков портфеля.
- #JS-aNzHSaKo (portfolio-config.js) — конфигурация и параметры портфеля.
- styles/wrappers/button.css, button-group.css, dropdown.css, dropdown-menu-item.css — UI-правила отображения.

## Контракты и гейты

- #JS-69pjw66d (validate-causality.js) — все решения `@causality #for-*` должны проходить проверку.
- #JS-Hx2xaHE8 (validate-docs-ids.js) — id AIS должен оставаться стабильным.

## Завершение / completeness

- Legacy paths: #JS-cMCNbcJ1 SKIP_LINK_PATTERNS.
- `@causality #for-integration-legacy-remediation` — legacy-ссылки ремедиируются атомарно.
- Status: `incomplete` — pending полная спецификация portfolio domain contracts (портфель, хранение, валидация). Подробная доменная карта — в id:ais-d4e5f6.

