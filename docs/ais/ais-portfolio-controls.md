---
id: ais-3f4e5c
status: incomplete
last_updated: "2026-03-04"
related_skills:
  - sk-0e193a
related_ais:
  - ais-e41384

---
<!-- Важно: оставлять пустую строку перед "---" ! -->

# AIS: Портфель и компонентные правила отображения

<!-- @causality #for-integration-legacy-remediation #for-atomic-remediation #for-docs-ids-gate -->

## Концепция (High-Level Concept)

Документ аккумулирует legacy-ориентированные аннотации, которые уже существуют в кодовой базе для портфельного домена и компонентных стилей. Цель — зафиксировать исторический контекст и привязки к новым рабочим артефактам без использования прямых `legacy`-путей в теле комментариев.

## Локальные Политики (Module Policies)

- Для legacy-упоминаний в комментариях используется трассируемый формат `LIR-*`.
- При появлении новых `legacy`-путей: добавить в path-contracts.js SKIP_LINK_PATTERNS или обновить ссылку.

## Компоненты и Контракты (Components & Contracts)

- `core/domain/portfolio-engine.js` — доменная логика портфеля.
- `core/domain/portfolio-validation.js` — контрактная валидация черновиков портфеля.
- `core/config/portfolio-config.js` — конфигурация и параметры портфеля.
- `styles/wrappers/button.css` / `button-group.css` / `dropdown.css` / `dropdown-menu-item.css` — UI-правила отображения.

## Контракты и гейты

- `validate-causality` — все решения `@causality #for-*` должны проходить проверку.
- `validate-docs-ids` — `id` AIS должен оставаться стабильным.

## Завершение

- Legacy paths: path-contracts.js SKIP_LINK_PATTERNS.

