---
id: ais-c6c35b
status: active
last_updated: "2026-03-12"
related_skills:
  - sk-318305
  - sk-cb75ec
  - sk-add9a6
  - sk-eeb23d
  - sk-130fa2
related_ais:
  - ais-a1b2c3
  - ais-c2d3e4
  - ais-71a8b9
  - ais-6f2b1d

---

# AIS: Frontend UI & Взаимодействие (No-Build Vue)

<!-- Спецификации (AIS) пишутся на русском языке и служат макро-документацией. Микро-правила вынесены в английские скиллы. Скрыто в preview. -->

## Концепция (High-Level Concept)
Фронтенд-архитектура построена на парадигме **No-Build**. Мы не используем сборщики (Webpack, Vite, Rollup). Код должен быть способен запускаться напрямую в браузере по протоколу `file://` и раздаваться как статика через GitHub Pages. Для реактивности используется Vue 3 (Global build), для стилизации — нативный Bootstrap 5.

## 2. Инфраструктура и Потоки данных (Infrastructure & Data Flow)

### Разграничение Transport Domains в UI
Взаимодействие с бэкендами на уровне приложения строго сегментировано по доменам, чтобы предотвратить пересечение контрактов:
- **Auth & Workspace Domain (Cloudflare `app-api`):** Вся авторизация (OAuth), загрузка/сохранение пользовательских настроек (workspace) и локальное кэширование внешних API. Приложение общается с этим доменом через `auth-client.js` и `cloud-workspace-client.js`.
- **Market Data Domain (Yandex Cloud `coins-db-gateway`):** Исключительно серверный SSOT рыночных данных (PostgreSQL). Браузер обращается к этому домену только для **чтения** кэша монет (`yandex-cache-provider.js`). Любые попытки записи в этот домен (fallback writes) со стороны фронтенда блокируются на архитектурном уровне.

### Механика загрузки
- **Загрузка модулей:** Осуществляется через кастомный #JS-xj43kftu (module-loader.js). Модули загружаются асинхронно в строгом порядке, описанном в #JS-os34Gxk3 (modules-config.js).
- **Сторонние библиотеки:** Загружаются через CDN (по цепочке fallback: GitHub Pages -> jsdelivr -> cdnjs). Используются только UMD/Global сборки библиотек.
- **Шаблоны и Логика:** Физически разделены. Логика лежит в `component.js`, а HTML-разметка в `component-template.js`. Они объединяются во время выполнения (runtime).
- **Реактивная локализация:** Все текстовые ключи хранятся в памяти, интерфейс реактивно перерисовывается при смене языка без перезагрузки страницы (включая всплывающие подсказки Tooltips).

## Локальные Политики (Module Policies)
- **Управление CSS-классами:** Запрещено хардкодить стили, которые могут потребовать переопределения извне. Используется универсальный механизм пропсов `classesAdd` и `classesRemove` для точечной модификации классов из родительских компонентов.
- **Интеграция Bootstrap:** Прямое использование jQuery-подобных вызовов внутри Vue запрещено. Все Bootstrap-компоненты (Модалки, Тултипы, Дропдауны) инициализируются в хуке `mounted` (или `$nextTick`) и **обязательно** уничтожаются (`.dispose()`) в хуке `beforeUnmount` во избежание утечек памяти.
- **События:** Нативные события Bootstrap (например, `show.bs.modal`) должны проксироваться в стандартные события Vue (`@show`).
- **Slot-контракты компонентов:** если wrapper-компонент задаёт проектный контракт слота, содержимое должно собираться из project-компонентов, а не из ad-hoc raw Bootstrap узлов. Пример: внутри `cmp-dropdown` меню нужно строить через `dropdown-menu-item`, чтобы не терять единый hover-стиль, auto-close и touch-tooltip поведение.
- **Outside-click для dropdown:** `cmp-dropdown` по умолчанию закрывается по клику вне меню; для редких сценариев (многошаговые потоки) можно отключить через `closeOnOutsideClick=false`.
- Portfolio-specific modal flow (`portfolio-form-modal-body`, `portfolio-view-modal-body`, header dropdown semantics) вынесен в отдельный SSOT: id:ais-6f2b1d. Этот AIS оставляет только generic UI/wrapper contracts.
- Если одна и та же visual shell используется в нескольких modal flows, она должна быть вынесена в отдельный project component. Пример: portfolio segment tables now share `#JS-Ah6d2Adu (portfolio-segment-table.js)` instead of duplicating shell markup in form/view modal bodies.
- Detached portfolio conflict copies не должны теряться среди обычных non-synced строк: shared selector обязан давать им явный warning-marker + native tooltip, а modal view повторяет этот marker возле title.

## UI Pattern Contracts (Generalized)

### 1) Модальные окна
- Единая оболочка: `cmp-modal` + унифицированный header (title, `*-header-extra`, `btn-close`) + body component.
- Если один и тот же body component обслуживает несколько сценариев, modal shell обязан различать их через config-driven `title` / `description` / `helpText`, а не через дублирование body component.
- Действия в footer управляются через `modalApi` (register/update/remove); ручные ad-hoc footer-кнопки считаются исключением.
- Автогенерируемые модалки из `registeredModals` обязаны сохранять ту же структуру shell, что и вручную объявленные.

### 2) Радиокнопки и селекторы в header
- Все ключевые переключатели (MDN, AGR, display tabs) реализуются через `cmp-button-group` в radio-режиме.
- Responsive-collapse логика (`collapse-breakpoint`, dropdown dynamic label) является частью контракта и не должна дублироваться вручную.
- Визуальная семантика active/inactive задается descriptor-объектами button-group, а не разрозненными DOM-условиями.

### 3) Системные сообщения
- Локальная и глобальная плоскости сообщений рендерятся только через `cmp-system-messages` со `scope`.
- Global splash использует горизонтальную ленту (`horizontalScroll=true`), feature/test-потоки — отдельные scope.
- Lifecycle сообщения (dismiss/action/translation/update) остается в контуре `AppMessages` + `messagesConfig`.

### 4) Наследие test.html
- `test.html` — источник исторических паттернов и сценариев проверки, но не runtime-SSOT.
- Переиспользование фрагментов из `test.html` требует адаптации к актуальным wrapper-контрактам `cmp-*` и текущим AIS/skills.

### 5) Legacy Exceptions (bare Bootstrap radio/checkbox)
- Исключения из контракта `cmp-button-group` radio: см. id:sk-318305 § Legacy Exceptions.
- Каждое исключение: inline `// EXCEPTION:` + запись в таблице skill. Миграция отложена (#for-legacy-exceptions-contract).

## Компоненты и Контракты (Components & Contracts)
- #JS-xj43kftu — загрузчик внешних и внутренних зависимостей.
- #JS-yx22mAv8 (app-ui-root.js) — корневой компонент приложения, хранитель глобального состояния (язык, тема).
- shared/components/ — изолированные переиспользуемые UI-компоненты (кнопки, модалки, селекты). Не имеют права делать API-вызовы.
- app/components/ — умные компоненты, привязанные к бизнес-логике (управление портфелями, настройки AI).
