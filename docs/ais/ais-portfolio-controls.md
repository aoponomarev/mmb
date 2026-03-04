---
id: ais-3f4e5c
status: incomplete
last_updated: "2026-03-04"
related_skills:
  - sk-0e193a
related_ais:
  - ais-e41384
---

# AIS: Портфель и компонентные правила отображения

<!-- @causality #for-integration-legacy-remediation #for-atomic-remediation #for-docs-ids-gate -->

## Концепция (High-Level Concept)

Документ аккумулирует legacy-ориентированные аннотации, которые уже существуют в кодовой базе для портфельного домена и компонентных стилей. Цель — зафиксировать исторический контекст и привязки к новым рабочим артефактам без использования прямых `legacy`-путей в теле комментариев.

## Локальные Политики (Module Policies)

- Для legacy-упоминаний в комментариях используется трассируемый формат `LIR-*`.
- Значимые решения по портфельному домену и компонентным правилам отражаются в реестре `docs/plans/legacy-link-remediation-registry.md`.
- При появлении новых `legacy`-путей добавляется отдельный атомарный шаг `LIR-XXX`.

## Компоненты и Контракты (Components & Contracts)

- `core/domain/portfolio-engine.js` — доменная логика портфеля.
- `core/domain/portfolio-validation.js` — контрактная валидация черновиков портфеля.
- `core/config/portfolio-config.js` — конфигурация и параметры портфеля.
- `styles/wrappers/button.css` / `button-group.css` / `dropdown.css` / `dropdown-menu-item.css` — UI-правила отображения.

## Контракты и гейты

- `validate-causality` — все решения `@causality #for-*` должны проходить проверку.
- `validate-docs-ids` — `id` AIS должен оставаться стабильным.

## Лог перепривязки путей (Path Rewrite Log)

| Legacy path | Атомарный шаг | Риск | Статус | Новый путь / rationale |
|------------|--------------|------|--------|---------------------------|
| `recipe-portfolio-engine-mvp-hardening` (legacy donor) | `LIR-005.A1` | Исторический план hardening недоступен в active структуре skills | `MAPPED` | `docs/ais/ais-portfolio-controls.md` |
| `recipe-portfolio-engine-mvp-hardening` (legacy donor) | `LIR-005.A2` | Исторический план hardening недоступен в active структуре skills | `MAPPED` | `docs/ais/ais-portfolio-controls.md` |
| `recipe-portfolio-engine-mvp-hardening` (legacy donor) | `LIR-005.A3` | Исторический план hardening недоступен в active структуре skills | `MAPPED` | `docs/ais/ais-portfolio-controls.md` |
| `components-styling-principles` (legacy donor) | `LIR-005.A4` | Исторический donor для стилизации UI-компонентов | `MAPPED` | `docs/ais/ais-portfolio-controls.md` |
| `components-styling-principles` (legacy donor) | `LIR-005.A5` | Исторический donor для стилизации UI-компонентов | `MAPPED` | `docs/ais/ais-portfolio-controls.md` |
| `components-styling-principles` (legacy donor) | `LIR-005.A6` | Исторический donor для стилизации UI-компонентов | `MAPPED` | `docs/ais/ais-portfolio-controls.md` |
| `components-styling-principles` (legacy donor) | `LIR-005.A7` | Исторический donor для стилизации UI-компонентов | `MAPPED` | `docs/ais/ais-portfolio-controls.md` |
| `components-layout-alignment` (legacy donor) | `LIR-005.A8` | Исторический donor для выравнивания layout в кнопках | `MAPPED` | `docs/ais/ais-portfolio-controls.md` |

## Завершение

- После каждого батча legacy-референсов по `portfolio-controls` обновлять `docs/plans/legacy-link-remediation-registry.md` и `docs/plans/plan-legacy-link-remediation-integrations-strategy.md`.

