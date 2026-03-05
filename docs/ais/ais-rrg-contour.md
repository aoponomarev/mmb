---
id: ais-c4e9b2
status: incomplete
last_updated: "2026-03-05"
related_skills:
  - sk-318305
  - sk-a17d41
related_ais:
  - ais-c6c35b
  - ais-f7e2a1

---
<!-- Важно: оставлять пустую строку перед "---" ! -->

# AIS: Контур Reactive Reliability Gate (RRG)

<!-- Спецификации (AIS) пишутся на русском языке. Микро-правила — в скилле id:sk-318305 (app/skills/ui-architecture.md). -->

## Идентификация и жизненный цикл

- id:ais-c4e9b2 — устойчивый идентификатор для ссылок из скиллов, планов и гейтов.
- status: incomplete (фазы 0–5 плана выполнены: гейт, скрипт, preflight, cursor-правило, causality #for-rrg-contour, index-ais).
- Связанные артефакты: скилл id:sk-318305 (app/skills/ui-architecture.md), id:sk-a17d41 (core/skills/state-events.md), id:ais-c6c35b (docs/ais/ais-frontend-ui.md). План модернизации RRG выполнен и дистиллирован в настоящий AIS; лог удаления: docs/deletion-log.md.

## Концепция (High-Level Concept)

**Reactive Reliability Gate (RRG)** — контракт надёжности реактивного слоя фронтенда: единый источник состояния, дисциплина мутаций через store, запрет прямой мутации `window` и небезопасной работы с DOM в компонентах. Цель — предсказуемый порядок рендера и отсутствие «тихих» нарушений реактивности при изменениях кода или при правках ИИ-агентами.

Ключевые принципы контура:

1. **Single State Source** — состояние в Vue-реактивности (`appStore`, core/state, messages store); не дублировать в нескольких местах.
2. **Mutation Discipline** — мутации только через явные сеттеры стора; не синхронизировать вручную две переменные вместо `computed`.
3. **No direct window mutation in components** — в коде компонентов запрещена прямая запись в `window.*` (кроме явно разрешённых паттернов регистрации).
4. **No unsafe DOM mutation in components** — присвоение `innerHTML` в компонентах запрещено (XSS и обход реактивности).
5. **Async contracts** — у fetch/debounce явные переходы loading/error.

Архитектура no-build и загрузка через `core/module-loader.js` предполагают **разовую регистрацию** компонентов и утилит на `window` при загрузке скрипта — это не считается нарушением RRG, если оформлено как `window.X = { ... }` или `window.X = function ...`.

## Инфраструктура и потоки данных (Infrastructure & Data Flow)

```mermaid
flowchart TB
    subgraph Scope
        A[app/components]
        B[shared/components]
    end
    subgraph Gate
        T[check-frontend-rrg.test.js]
    end
    subgraph Triggers
        P[preflight]
        N[npm run test]
        C[npm run frontend:reactivity:check]
    end
    A --> T
    B -.-> T
    T --> N
    C -.-> T
    N --> P
```

- **Область проверки (актуально):** app/components и shared/components (файлы *.js, *.mjs). Не сканируются app/templates и shared/templates (innerHTML в postgres-settings-template.js — регистрация Vue-шаблона).
- **Триггеры:** `npm run frontend:reactivity:check` (отдельная команда); `npm run test` (premerge/CI); preflight — шаг 6, вызов `npm run frontend:reactivity:check` (при падении exit(1)).
- **Скрипт:** В package.json зарегистрирован `frontend:reactivity:check` → `node --test is/scripts/tests/check-frontend-rrg.test.js`.

## Правила гейта (текущая реализация)

Гейт: #JS-Yn27TZUx (is/scripts/tests/check-frontend-rrg.test.js). Константа RRG_SCAN_DIRS: app/components, shared/components; app/templates и shared/templates не входят (innerHTML в postgres-settings-template.js — регистрация Vue-шаблона).

| Правило | Проверка | Исключения |
|--------|----------|------------|
| **RRG-1** | Нет прямой мутации `window.*` в компонентах | Регистрация: `window.X = { ... }`, `window.X = function ...`, `window.X = X` (одинаковый идентификатор слева и справа); строка содержит `window.consoleInterceptor` или `window.location`. |
| **RRG-2** | Нет присвоения `innerHTML` в компонентах | Нет (любое `.innerHTML =` — нарушение). |

Проверка построчная, без AST. Вложенные мутации и косвенные присвоения не детектируются. Исключение `window.X = X` (одинаковый идентификатор слева и справа) покрывает регистрацию в shared/components/system-message.js и system-messages.js.

## Локальные политики (Module Policies)

- Все новые и затрагиваемые при рефакторинге файлы в `app/components` и (после расширения) в `shared/components` не должны вводить нарушений RRG-1 и RRG-2.
- Единственное допустимое присвоение `window` в компонентном коде — разовая регистрация в конце файла в виде `window.ComponentName = { ... }` или `window.utilName = function ...`. Остальные мутации `window` (примитивы, переменные) — нарушение.
- Файлы вне области проверки (например `app/app-ui-root.js`, `app/templates/*.js`, `core/`, `is/`) формально не проходят RRG-тест. При расширении скана на app/templates или shared/templates потребуются точечные исключения: file-header-template.js — `window.FILE_HEADER_TEMPLATE_REF`; postgres-settings-template.js — innerHTML для вставки Vue-шаблона (либо рефакторинг регистрации без innerHTML).

## Инвентарь мест с «кастомной» реактивностью

### 1. Регистрация компонентов и утилит на `window` (разрешённый паттерн)

Присвоение в конце файла вида `window.X = { ... }` или `window.X = function ...` — явное исключение в тесте.

**app/components/** (регистрация Vue-компонентов приложения):

| Файл | Идентификатор на window |
|------|-------------------------|
| app-header.js | window.appHeader |
| app-footer.js | window.appFooter |
| auth-button.js | window.authButton |
| ai-api-settings.js | window.aiApiSettings |
| postgres-settings.js | window.postgresSettings |
| portfolios-manager.js | window.portfoliosManager |
| modal-example-body.js | window.modalExampleBody |
| timezone-modal-body.js | window.timezoneModalBody |
| portfolio-modal-body.js | window.portfolioModalBody |
| portfolio-form-modal-body.js | window.portfolioFormModalBody |
| portfolio-view-modal-body.js | window.portfolioViewModalBody |
| storage-reset-modal-body.js | window.storageResetModalBody |
| icon-manager-modal-body.js | window.cmpIconManagerModalBody |
| coin-set-load-modal-body.js | window.coinSetLoadModalBody |
| coin-set-save-modal-body.js | window.coinSetSaveModalBody |
| portfolios-import-modal-body.js | window.portfoliosImportModalBody |
| session-log-modal-body.js | window.sessionLogModalBody |
| auth-modal-body.js | window.authModalBody |
| coingecko-cron-history-modal-body.js | window.coingeckoCronHistoryModalBody |
| missing-coins-modal-body.js | window.missingCoinsModalBody |

**shared/components/** (общие Vue-компоненты):

| Файл | Идентификатор на window |
|------|-------------------------|
| button.js | window.cmpButton |
| dropdown.js | window.cmpDropdown |
| dropdown-menu-item.js | window.cmpDropdownMenuItem |
| button-group.js | window.cmpButtonGroup |
| combobox.js | window.cmpCombobox |
| modal.js | window.cmpModal |
| modal-buttons.js | window.cmpModalButtons |
| timezone-selector.js | window.cmpTimezoneSelector |
| system-message.js | window.cmpSystemMessage |
| system-messages.js | window.cmpSystemMessages |
| cell-num.js | window.cmpCellNum |
| sortable-header.js | window.cmpSortableHeader |
| coin-block.js | window.cmpCoinBlock |

**shared/utils/** (утилиты, загружаемые до Vue):

| Файл | Идентификатор на window |
|------|-------------------------|
| hash-generator.js | window.hashGenerator |
| auto-markup.js | window.autoMarkup |
| pluralize.js | window.pluralize |
| class-manager.js | window.classManager |
| column-visibility-mixin.js | window.columnVisibilityMixin |
| layout-sync.js | window.layoutSync |
| messages-store.js | window.AppMessages, window.messagesStore |

**core / app (вне текущей области теста):**

| Файл | Идентификатор на window | Примечание |
|------|-------------------------|------------|
| core/modules-config.js | window.modulesConfig | Конфиг загрузчика |
| app/app-ui-root.js | window.appRoot, window.appInit | Инициализация приложения (не сканируется тестом) |
| shared/templates/file-header-template.js | window.FILE_HEADER_TEMPLATE_REF = true | Примитив — при расширении теста потребуется исключение |

### 2. Чтение с `window` (не мутация, RRG не запрещает)

Компоненты и утилиты обращаются к: `window.Vue`, `window.bootstrap`, `window.classManager`, `window.hashGenerator`, `window.tooltipsConfig`, `window.modalsConfig`, `window.layoutSync`, `window.AppMessages`, `window.messagesTranslator`, `window.messagesConfig`, `window.appConfig`, `window.matchMedia`, прочим зарегистрированным объектам. Это допустимо.

### 3. Реактивное состояние (store / state)

| Расположение | Назначение |
|--------------|------------|
| core/state/ui-state.js | Флаги загрузки, язык тултипов, метаданные кэша |
| core/state/auth-state.js | OAuth-сессия, токен, статус входа |
| core/state/loading-state.js | Индикаторы загрузки по операциям |
| shared/utils/messages-store.js | Реактивный store сообщений (Vue.reactive или fallback), API: push, dismiss, clear |
| app/app-ui-root.js | Корневой компонент, глобальные флаги темы/языка |

Мутации только через сеттеры соответствующих модулей; компоненты не мутируют состояние напрямую.

### 4. Использование innerHTML

| Файл | Контекст | В зоне RRG-теста? |
|------|----------|--------------------|
| app/templates/postgres-settings-template.js | Вставка `<script type="text/x-template">` для Vue | Нет (область теста: app/components и shared/components; app/templates не входит) |
| is/cloudflare/edge-api/src/auth.js | Страницы колбэка OAuth (не Vue) | Нет |
| is/V2_logic.js | Legacy UI, не компоненты Vue | Нет |

При расширении области проверки на `app/templates/` для postgres-settings-template.js потребуется исключение (шаблонная регистрация) или замена способа регистрации шаблона.

### 5. Исключения в коде теста

- Строки с `window.consoleInterceptor` и `window.location` не считаются нарушением RRG-1 (специальные случаи окружения/навигации).

## Компоненты и контракты (Components & Contracts)

| Компонент | Путь | Назначение |
|-----------|------|------------|
| RRG-тест | #JS-Yn27TZUx (is/scripts/tests/check-frontend-rrg.test.js) | RRG-1 и RRG-2; RRG_SCAN_DIRS: app/components, shared/components |
| Скилл UI Architecture | id:sk-318305 (app/skills/ui-architecture.md) | Правила RRG, scope, enforcement commands |
| Скилл State & Events | id:sk-a17d41 (core/skills/state-events.md) | Дисциплина мутаций, связь с RRG |
| Preflight | #JS-NrBeANnz (is/scripts/preflight.js) | Шаг 6: вызов frontend:reactivity:check |
| Cursor rule | .cursor/rules/global-rules/rrg-frontend.mdc | RRG при правках app/, shared/components/; globs: app/**/*.js, shared/components/**/*.js |
| Causality registry | id:sk-3b1519 (is/skills/causality-registry.md) | Хеш #for-rrg-contour для @causality/@skill-anchor при ссылке на контур RRG |
| Index AIS | docs/index-ais.md | Генерируется в preflight (generate-index-ais.js) из docs/ais/; id:ais-c4e9b2 входит в индекс |
| Module loader | core/module-loader.js | Порядок загрузки, window.modulesConfig |
| Modules config | core/modules-config.js | Зависимости и порядок скриптов |

## Ссылки

- Скилл: id:sk-318305 (app/skills/ui-architecture.md)
- Скилл State: id:sk-a17d41 (core/skills/state-events.md)
- Causality registry: id:sk-3b1519 (is/skills/causality-registry.md) — хеш #for-rrg-contour
- Индекс AIS: docs/index-ais.md (содержит id:ais-c4e9b2)
- Тест: #JS-Yn27TZUx (is/scripts/tests/check-frontend-rrg.test.js)
- План модернизации RRG выполнен и дистиллирован в настоящий AIS; лог удаления: docs/deletion-log.md

