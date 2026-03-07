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
- При появлении новых `legacy`-путей: добавить в #JS-cMCNbcJ1 (is/contracts/path-contracts.js) SKIP_LINK_PATTERNS или обновить ссылку.

## Компоненты и Контракты (Components & Contracts)

- #JS-rrLtero9 (core/domain/portfolio-engine.js) — доменная логика портфеля.
- #JS-hG34MvdS (core/domain/portfolio-validation.js) — контрактная валидация черновиков портфеля.
- #JS-aNzHSaKo (core/config/portfolio-config.js) — конфигурация и параметры портфеля.
- styles/wrappers/button.css, button-group.css, dropdown.css, dropdown-menu-item.css — UI-правила отображения.

## Контракты и гейты

- #JS-69pjw66d (is/scripts/architecture/validate-causality.js) — все решения `@causality #for-*` должны проходить проверку.
- #JS-Hx2xaHE8 (is/scripts/architecture/validate-docs-ids.js) — id AIS должен оставаться стабильным.

## Завершение

- Legacy paths: #JS-cMCNbcJ1 (is/contracts/path-contracts.js) SKIP_LINK_PATTERNS.

