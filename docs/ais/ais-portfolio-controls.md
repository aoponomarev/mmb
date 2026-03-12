---
id: ais-3f4e5c
status: incomplete
last_updated: "2026-03-12"
related_skills:
  - sk-0e193a
  - sk-c3d639
related_ais:
  - ais-e41384
  - ais-d4e5f6
  - ais-71a8b9
  - ais-6f2b1d

---
<!-- Важно: оставлять пустую строку перед "---" ! -->

# AIS: Портфель и компонентные правила отображения

<!-- @causality #for-integration-legacy-remediation #for-atomic-remediation #for-docs-ids-gate -->

## Концепция (High-Level Concept)

Документ аккумулирует legacy-ориентированные аннотации, которые уже существуют в кодовой базе для портфельного домена и компонентных стилей. Primary SSOT для portfolio system теперь находится в id:ais-6f2b1d (`docs/ais/ais-portfolio-system.md`); этот файл сохраняет companion-level notes, historical context и rollout-gap следы.

## Локальные Политики (Module Policies)

- Для legacy-упоминаний в комментариях используется трассируемый формат `LIR-*`.
- При появлении новых `legacy`-путей: добавить в #JS-cMCNbcJ1 (path-contracts.js) SKIP_LINK_PATTERNS или обновить ссылку.
- Portfolio runtime truth больше не должна размазываться между несколькими UI-path'ами: active path описан в id:ais-6f2b1d, а legacy modules фиксируются здесь как companion context.

## Компоненты и Контракты (Components & Contracts)

- #JS-rrLtero9 (portfolio-engine.js) — доменная логика портфеля.
- #JS-hG34MvdS (portfolio-validation.js) — контрактная валидация черновиков портфеля.
- #JS-aNzHSaKo (portfolio-config.js) — конфигурация и параметры портфеля.
- #JS-fJ68ZfEu (portfolio-adapters.js) — transport/adaptation layer для local <-> Cloudflare <-> external payloads.
- #JS-fW2M5Jbg (workspace-config.js) — workspace SSOT для `selectedCoinIds` и `selectedCoinKeyMetrics`.
- #JS-Ri3c3bMt (portfolios-import-modal-body.js) — secondary import flow for local portfolio archives.
- #CSS-UB45FeQM (styles/wrappers/button.css), #CSS-bo3B2GXy (styles/wrappers/button-group.css), #CSS-sA2KcKoL (styles/wrappers/dropdown.css), #CSS-1bKCV1Y8 (styles/wrappers/dropdown-menu-item.css) — UI-правила отображения.

## Актуальные runtime-контракты

- Канонический asset портфеля включает не только `coinId/ticker/portfolioPercent/delegatedBy`, но и `keyMetric?: { field, label }`, `isLocked`, `isDisabledInRebalance`, recoverable `metrics`, `pvs`, `currentPrice`.
- Snapshot-контракт двухуровневый:
  - `snapshots.assets[*].keyMetric` + `keyBuyer`
  - `snapshots.metrics[*].keyMetricField` + `keyBuyer`
- Таблица монет делегирует ключевую метрику через клик по metric-ячейке. Временное UI-состояние хранится в `workspace.mainTable.selectedCoinKeyMetrics` и переносится в `coin.keyMetric` при формировании портфеля.
- Поведение выбора защищено от случайной смены показателя: пока строка отмечена чекбоксом, другой столбец не может переопределить `keyMetric`; для смены сначала нужен explicit uncheck.
- Первая сортировка по заголовку metric-колонки идёт в `desc`, чтобы положительные значения оказывались сверху.
- Цветовые токены кастомного UI вынесены в `styles/custom/colors.css`; остальные custom CSS-слои не должны объявлять собственные raw color literals для runtime surfaces.
- Soft highlight surfaces используют единый app-level token `--app-soft-highlight-bg` (`#for-unified-highlight-token`) со значением `hsla(0, 0%, 0%, 0.07)`. Им должны пользоваться selected row, soft hover в dropdown/menu и другие нейтральные highlight-состояния; локальные RGBA-константы для этих случаев запрещены.
- `key metric` ячейка не получает второй серый background layer. Базовый серый фон остаётся у selected row, а сама key-cell добавляет только отдельный прозрачный blue overlay (`--app-key-metric-overlay-bg`) поверх него.
- Для highlight-состояний transitions запрещены: визуальная диагностика подсветки должна зависеть только от итогового слоя цвета, а не от промежуточной анимации.
- Dropdown меню операций в `portfolio-form-modal-body` не должно жить внутри clipping-chain `table-responsive(overflow:auto) -> segment card(overflow:hidden)` в момент открытия. При `dropdown-menu.show` сегмент временно переводится в `overflow: visible`, чтобы меню не уходило под footer сегмента.
- Legacy CRUD donor path удалён из repo после миграции; primary runtime path теперь полностью сосредоточен в `app-ui-root` + `portfolio-form-modal-body` + `portfolio-view-modal-body`.
- Secondary import/export flow остаётся активным рядом с primary CRUD path: export читает current local scope, import пишет только в current local scope, переводит импортированные записи в `syncState='local-only'` + `cloudSyncMode='explicit'`, уведомляет `app-ui-root` через `portfolios-imported` и не создаёт implicit cloud-sync.
- Optional support/debug plane получает typed observability envelope через `portfolio-observed`, но этот event не является owner-каналом CRUD semantics.
- Если cloud-bound портфель расходится между устройствами, active runtime больше не оставляет скрытый last-writer-wins. Cloud version остаётся основной bound-записью, а локальная divergent-версия fork-ится в detached copy с `syncState='conflict'`.

## Облачное восстановление

- Cloudflare readback больше не ограничивается минимальным `weights-only` payload. Transport должен сохранять канонический asset state и portfolio meta, иначе восстановление на новом устройстве становится деградировавшим.
- При отсутствии отдельных D1-полей для meta допускается JSON envelope в `description`, из которого hydrate восстанавливает `settings`, `modelVersion`, `marketMetrics`, `marketAnalysis`, `modelMix` и market-level snapshot meta.
- `normalizePortfolio(...)` обязан достраивать `snapshots.assets` и `snapshots.metrics`, если Cloudflare transport вернул только `snapshotId` и market meta без полных массивов.
- Если локальный импорт архивного портфеля уже занял canonical `portfolio.id`, но помечен `cloudSyncMode='explicit'`, hydrate не должен silently rebinding этот local object к cloud record до явного save/update.
- Если remote `updated_at` новее локального `cloudUpdatedAt`, hydrate обязан различать `remote refresh` и `true conflict`: чистая local copy обновляется из облака, а divergent local copy сохраняется в отдельный detached fork.

## Контракты и гейты

- #JS-69pjw66d (validate-causality.js) — все решения `@causality #for-*` должны проходить проверку.
- #JS-Hx2xaHE8 (validate-docs-ids.js) — id AIS должен оставаться стабильным.

## Завершение / completeness

- Legacy paths: #JS-cMCNbcJ1 SKIP_LINK_PATTERNS.
- `@causality #for-integration-legacy-remediation` — legacy-ссылки ремедиируются атомарно.
- Status: `incomplete` — primary portfolio spec вынесен в id:ais-6f2b1d; этот companion doc остаётся для legacy notes, UI-oriented exceptions и rollout-gap traces.

