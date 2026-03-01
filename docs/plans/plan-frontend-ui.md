> Категория: План миграции контура Frontend & UI
> Статус: Черновик
> Источники Legacy App: `A_FRONTEND_CORE.md`, `components-*`, `ux-*`

---

## 1. Контекст из Legacy App

Старый фронтенд Legacy App был построен по архитектуре **"No-Build"**:
- **Стек:** Нативные ES Modules (импорты прямо в браузере), Vue 3 Reactivity (через `core/state/ui-state.js`).
- **Сборка:** Отсутствовала (без Webpack/Vite). Проект запускался простым открытием `index.html` через протокол `file://`.
- **Загрузка:** Собственный загрузчик модулей (`core/module-loader.js`) с топологической сортировкой графа зависимостей (DAG).
- **Компоненты:** Нарезаны на `cmp-*` (общие UI), `app-*` (специфичные), `cell-*` (для таблиц). Шаблоны грузились через `x-template`.
- **UX и SSOT:** Тексты, иконки и тултипы строго централизовались (напр. `tooltips-config.js`).

## 2. Архитектурные парадигмы в Target App

При переносе фронтенда в Target App мы **сохраняем** философию легковесности (возможность работы из `file://`), но **ужесточаем** контракты SSOT с помощью backend-практик.

### Киллер-фичи (Очередь на внедрение)

1. **AST-Линтер против хардкода текстов (Hardcode Ban)**
   - Внедрить ESLint-правило (аналогичное запрету `process.env`), которое запретит агентам и разработчикам писать русские и английские тексты напрямую в компонентах (например, `button.innerText = 'Save'`).
   - Весь текст должен идти через вызов словаря: `uiDictionary.buttons.save`.

2. **Zod-валидация UI-конфигов (Type Safe Design System)**
   - Тултипы, списки иконок и модалки в Legacy App были простыми JS-объектами. В Target App они будут проверяться Zod-схемой при инициализации.
   - *Fail Fast:* Если в конфигурации иконок прописан `btc.png`, а на диске его нет — UI сразу выбросит понятную ошибку в консоль, а не покажет сломанную картинку.

3. **Inverted SSOT (Docs from Code) для Дизайн-Системы**
   - Скрипт `generate-ui-docs.js` будет парсить JS-словари (цвета, тексты, иконки) и генерировать Markdown-документ `docs/design-tokens-reference.md`.

4. **Reactive Reliability Gate (RRG) — фундаментальная реактивность "из коробки"**
   - Разделение контуров состояния: UI-state / Domain-state / Server-state.
   - Запрет legacy-паттернов "латания реактивности" (неявные deep-watch цепочки, дублирующие state-копии, ad-hoc синхронизации между компонентами).
   - Миграционный принцип: при переносе каждого UI-блока старая реактивность заменяется на RRG-схему сразу, без отложенного техдолга.
   - Временные компромиссы допускаются только как `temporary-deviation` с обязательным закрытием в рамках того же этапа.
   - Enforcement mode: **hard-rule** (legacy reactivity patterns are blocking, not warning).

## 3. План работ (Чек-лист)

 - [ ] **Шаг 1: Фундамент загрузчика**
  - Перенести `module-loader.js` и настроить базовый `index.html`.
  - Заменить устаревшие пути на использование нового `paths.js` (если применимо в браузере) или настроить Cloudflare/локальный прокси для отдачи файлов.
 - [ ] **Шаг 2: Глобальный State (Vue 3 Reactivity)**
  - Перенести `ui-state.js` и очистить его от Legacy App-специфичного мусора (вроде специфичных стейтов старого кэша).
  - Применить RRG-контракт для нового state-контура (без прямого переноса legacy реактивности).
- [x] **Шаг 3: Дизайн-система и SSOT словари**
  - Внедрить Zod-схемы для `tooltips-config.js` и `modals-config.js`.
  - Добавлен AST-линтер на хардкод текстов (дополняет regex `frontend:hardcode:scan`).
  - Усилить контракты модальных и tooltip состояний.
 - [ ] **Шаг 4: Базовые UI-компоненты (`cmp-*`)**
   - Перенесены базовые элементы типобезопасного рендера: карточки (`cmp-card`), таблицы (`cmp-table`) и чекбоксы (`cmp-checkbox`).
   - `cmp-card` теперь принимает только DOM-тело (без `innerHTML`-вставки), что повышает безопасность визуального слоя.
   - Для таблиц введена единая контрактная схема колонок + рендер ячеек с валидацией.
 - [ ] **Шаг 5: Специфичные компоненты приложения (`app-*`)**
  - По мере готовности Backend-слоя (см. План Backend & Data), переносить бизнес-компоненты.
  - Для каждого перенесённого блока фиксировать отсутствие legacy-reactivity debt и соответствие RRG.
- [ ] **Шаг 5.1: Детальная карточка рынка**
  - Добавлена контрактная `app-market-details` карточка выбранной монеты с drill-down и привязкой к общим метрикам snapshot.
  - Выбор монеты теперь управляется типобезопасным `cmp-checkbox` через `ui-state.selectedCoinId`.
- [ ] **Шаг 5.2: Расширение управления рыночным списком**
  - Добавлен контроль направления сортировки (asc/desc) для `app-market-section` с централизованными лейблами в `ui-dictionary`.
- [ ] **Шаг 5.3: Табличная глубина и управление деталями**
  - Добавлен расширенный контракт `cmp-table`: `cellClassName`/`rowClassName` и единый форматтерный слой (`frontend/modules/rrg/table-formatters.js`).
  - Детализация карточки рынка получена через статусный блок и actions (`Pin` / `Clear`) с управлением режима `showDetails` через `appStore.ui` без использования row-click.
  - Дополнительно зафиксировано: выбор строки без отдельного дополнительного action-столбца, чтобы сохранить пространство под будущие ячеечные/контекстные операции.
- [x] **Шаг 6: RRG Gate Contract**
  - Зафиксировать контрольный набор blocking-критериев для RRG (state boundaries, mutation discipline, async contract, reactivity regression checks).
  - Критерии и скрипты:
    - `npm run frontend:reactivity:check`
    - `npm run frontend:smoke`
  - Начало: добавлен `docs/runbooks/frontend-rrg-contract.md` с обязательными MVP-критериями.
  - Реализован автоматический блокер `frontend:rrg:contract`, включённый в `preflight` для всех фронтовых изменений.
- [ ] Полный e2e-пакет для Stage 4 выполнен: `backend:*:e2e` + `frontend:hardcode:scan`/`frontend:hardcode:ast` + `frontend:ui-config:check` + `frontend:reactivity:check` + `frontend:rrg:contract` + `frontend:smoke` без регрессий.
- [ ] **Шаг 7: Full UI Parity Program (Legacy App visual + functional identity)**
  - Добавлены runbooks baseline/matrix:
    - `docs/runbooks/frontend-ui-parity-baseline.md`
    - `docs/runbooks/frontend-ui-parity-matrix.md`
  - Добавлен SCSS foundation pipeline:
    - `npm run frontend:styles:build` -> `frontend/styles/scss/main.scss` -> `frontend/styles/ui.css`
  - Расширен dense market-table slice в `app-market-section` (AGR/MAX PV/min PV/DCS/TSI/MPS/CPT/DIN) для пошагового возврата Legacy App table geometry.
- [ ] **Шаг 7.1: Wrapper-first Vue migration foundation (No-Build)**
  - Добавлен runtime-контур Vue без отказа от `file://`: `frontend/index.html` + `frontend/modules/app/bootstrap.js`.
  - Добавлен Vue app-shell host: `frontend/modules/app/vue-app.js` с переносом shell/markets/metrics в Vue composition-host слой.
  - Введены thin-wrapper компоненты над Bootstrap API:
    - `frontend/modules/components/cmp-button.js` (Vue wrapper + существующий DOM factory),
    - `frontend/modules/components/cmp-dropdown.js`,
    - `frontend/modules/components/cmp-button-group.js`,
    - `frontend/modules/components/cmp-modal.js` (Vue wrapper + существующий DOM modal factory),
    - `frontend/modules/components/cmp-system-messages.js`.
  - Контракт wrapper-архитектуры зафиксирован в `docs/runbooks/frontend-vue-wrapper-contract.md`.
  - [ ] **Шаг 7.1.1: Переход toolbar и block markets на Vue-hosted application-компоненты**
    - Добавлены `frontend/modules/app/app-toolbar-vue.js` и `frontend/modules/app/app-market-section-vue.js`.
    - `frontend/modules/app/vue-app.js` переключен на `AppToolbar`/`AppMarketSection`.
    - Микрогеометрия блоков (`toolbar-top`, `market-filters`, `ui-table__cell`) выровнена под parity baseline в `frontend/styles/ui.css` и SCSS-слое.
  - [ ] **Шаг 7.1.2: Миграция status/summary/tabs/metrics/footer в Vue-hosted блоки**
    - Добавлены `frontend/modules/app/app-summary-vue.js`, `app-status-vue.js`, `app-tabs-vue.js`, `app-metrics-vue.js`, `app-footer-vue.js`.
    - `frontend/modules/app/vue-app.js` переведен на `AppSummary`/`AppStatus`/`AppTabs`/`AppMetrics`/`AppFooter`.
    - Добавлена адаптивная логика для табов в `frontend/styles/scss/_components.scss` и `frontend/styles/ui.css` (до `max-width: 1120px` и `768px`).
    - Уплотнена геометрия shell-слоя: status/summary/tabs + фиксированный footer-тикер по нижней кромке в стиле Legacy App.

## 4. Reboot-план: Полный возврат Legacy App UI через bulk intake + rebind

- **Базовые принципы (сохраняются как hard-rules):**
  - Контракты SCSS и цветовой модели остаются обязательными (`frontend/styles/scss/*`, без literal-цветов вне `_color-vars.scss`).
  - Контур `No-Build` + `file://` сохраняется.
  - Wrapper-контракт для Vue/Bootstrap сохраняется (`docs/runbooks/frontend-vue-wrapper-contract.md`).
  - RRG-контракт обязателен для каждого переносимого блока.

- [ ] **Шаг R0: Migration Freeze и rollback baseline**
  - Базовая точка: `71563a6546900d0fabc8ff425503e93a71a2256b` (`MIGRATION - OK`).
  - Все последующие parity-эксперименты считаются временными до прохождения reboot-плана.

- [ ] **Шаг R1: Плотная инвентаризация UI в Legacy App (источник заимствования)**
  - Источник: `D:/Clouds/AO/OneDrive/Portfolio-CV/Refactoring/ToDo/Statistics/Legacy App`.
  - Полный реестр:
    - `app/components/*` (`cmp-*`, `app-*`, `cell-*`),
    - `app/templates/*` (`x-template`),
    - `styles/**/*`,
    - `core/module-loader.js` + `core/modules-config.js`,
    - словари/конфиги UI (tooltips/modals/icons/texts).
  - Результат этапа: матрица соответствия `Legacy App asset -> Target App module`.
  - Артефакты этапа:
    - `docs/runbooks/frontend-ui-reboot-execution.md`
    - `docs/runbooks/frontend-ui-intake-manifest-r1.md`
  - Выполнено в текущем пакете:
    - Добавлена матрица `Legacy App -> Target App` по пакетам и типам адаптеров.
    - Добавлены cutover-gates на обязательное удаление `frontend/legacy-mbb-ui/*` и adapter-слоя.

- [ ] **Шаг R2: Bulk Intake Layer (временный импорт UI as-is)**
  - Создается временный слой `frontend/legacy-mbb-ui/*` для массового переноса Legacy App UI без точечной переделки.
  - Цель: поднять Legacy App UI в Target App максимально близко к оригиналу до начала рефакторинга реактивности.
  - Ограничение: в этом слое не принимаются новые архитектурные решения — только транспорт и wiring.
  - Выполнено в текущем пакете:
    - Массовый intake из Legacy App в `frontend/legacy-mbb-ui` (components/templates/styles/core).
    - Добавлен пакетный реестр `frontend/legacy-mbb-ui/intake-registry.json`.

- [ ] **Шаг R3: Adapter Layer (временный слой совместимости)**
  - `state-adapter`: legacy state contract -> RRG store API.
  - `actions-adapter`: legacy handlers/events -> текущие use-case модули Target App.
  - `dictionary-adapter`: legacy ключи -> SSOT словари Target App.
  - Правило: адаптеры не содержат бизнес-логику, только трансляцию контрактов.
  - Выполнено в текущем пакете:
    - Создан каркас `frontend/modules/migration-adapters/*` с временными адаптерами трансляции контрактов.

- [ ] **Шаг R4: Reactivity Rebind (legacy -> фундаментальная RRG)**
  - По пакетам: shell -> tabs/status/summary -> markets -> metrics -> modal stack.
  - После каждого пакета: закрытие `temporary-deviation`, запуск `frontend:reactivity:check` + `frontend:rrg:contract`.

- [ ] **Шаг R5: Styles/Colors Rebind на утвержденные концепты**
  - Массовая замена style/color зависимостей через token-map `Legacy App -> Target App concept aliases`.
  - Визуальная цель: паритет Legacy App при полном соблюдении контрактов SCSS/цветов в Target App.

- [ ] **Шаг R6: Functional Rebind**
  - Реестр привязок: `control -> expected behavior -> Target App action`.
  - Запрет "немых" элементов: любой отображаемый control обязан иметь рабочую привязку.

- [ ] **Шаг R7: Cutover и очистка временных слоев**
  - `frontend/legacy-mbb-ui/*` подлежит удалению после завершения rebind и прохождения гейтов.
  - Адаптеры (`*-adapter`) подлежат удалению или схлопыванию в ноль (если контракт 1:1) до финального merge.
  - Финальный критерий чистоты: в production-контуре остаются только целевые Target App-модули без migration-ballast.
