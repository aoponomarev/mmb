# ОБЗОР АРХИТЕКТУРЫ ПРОЕКТА app
**Дата:** 2026-02-26  
**Версия проекта:** 1.0.0  
**Файлов в проекте:** ~140 (после очистки от cloud/)

---

## 1. ОБЩАЯ ОЦЕНКА

Проект обладает **продуманной базовой архитектурой**: чёткое разделение на `core/` / `shared/` / `app/`, модульная система загрузки без bundler'ов, паттерн «template + component» для Vue. Основные проблемы носят **характер накопленного технического долга**, а не структурных просчётов.

**Общий балл: 7/10**

---

## 2. СТРУКТУРА ВЕРХНЕГО УРОВНЯ

```
app/
├── index.html          # Главная страница (Vue-приложение)
├── test.html           # Страница тестирования компонентов
├── is/                 # Независимая страница (V2 стек, не Vue)
│   ├── IS.html
│   ├── V2_logic.js
│   └── V2_standard.css
├── favicon.svg
├── app/                # Корневой компонент + app-специфичные компоненты
├── core/               # Базовая инфраструктура (не зависит от Vue)
├── shared/             # Переиспользуемые Vue-компоненты
├── styles/             # CSS-файлы
└── mm/                 # Математические модели (включая базовый класс и менеджер)
```

**Хорошо:**
- Принцип `core` / `shared` / `app` соблюдается.
- `core/` не зависит от Vue — это правильно.
- `index.html` остался компактным, вся логика вынесена в `app-ui-root.js`.

**Проблема #1 — Два несвязанных стека в одном проекте: ✅ РЕШЕНО**  
`IS.html` + `V2_logic.js` + `V2_standard.css` вынесены в подпапку `is/`. Изоляция стеков теперь физическая.

---

## 3. ПАПКА `core/`

```
core/
├── module-loader.js       # Инфраструктура загрузки
├── modules-config.js      # Конфигурация модулей
├── api/
│   ├── ai-provider-manager.js
│   ├── ai-providers/      # base, yandex
│   ├── cloudflare/        # auth-client, coin-sets-client, datasets-client, portfolios-client
│   ├── data-providers/    # base, coingecko
│   ├── coingecko-stablecoins-loader.js
│   ├── coins-metadata-generator.js
│   ├── coins-metadata-loader.js
│   ├── data-provider-manager.js
│   ├── icon-manager.js
│   ├── market-metrics.js
│   ├── messages-translator.js
│   ├── postgres-client.js
│   ├── rate-limiter.js
│   ├── request-registry.js
│   └── tooltip-interpreter.js
├── cache/
│   ├── cache-cleanup.js
│   ├── cache-config.js
│   ├── cache-indexes.js
│   ├── cache-manager.js
│   ├── cache-migrations.js
│   └── storage-layers.js
├── config/               # 13 файлов конфигурации (включая messages-migrations.js)
├── domain/               # portfolio-engine, portfolio-validation, portfolio-adapters
├── errors/               # error-handler, error-types
├── events/               # event-bus
├── logging/              # logger
├── state/                # auth-state, loading-state, ui-state
├── utils/                # 6 утилит
└── validation/           # math-validation, normalizer, schemas, validator
```

**Хорошо:**
- Логическая группировка по подпапкам последовательна.
- `errors/`, `events/`, `logging/` — чистые синглтоны без внешних зависимостей.
- `domain/` правильно отделяет доменную логику от API.

**Проблема #2 — Файл `messages-migrations.js` в `cache/`: ✅ РЕШЕНО**  
Файл перенесён в `core/config/messages-migrations.js` — рядом с `messages-config.js`.

**Проблема #3 — Perplexity-интеграция: ✅ РЕШЕНО (удалено)**  
Все 4 файла Perplexity (`perplexity.js`, `perplexity-provider.js`, `perplexity-settings.js`, `perplexity-settings-template.js`) удалены. Все ссылки на Perplexity удалены из ~15 файлов.

**Проблема #4 — `postgres-client.js` — вводящее в заблуждение имя: ⏳ ОТЛОЖЕНО**  
`postgres-client.js` / `postgres-config.js` относятся к Yandex API Gateway, но названы через `postgres-*`. Переименование затронет слишком много перекрёстных ссылок для текущей сессии. Требуется отдельная сессия рефакторинга.

**Проблема #5 — `core/metrics/` оторван от `mm/`: ✅ РЕШЕНО**  
`base-model-calculator.js` и `model-manager.js` перенесены из `core/metrics/` в `mm/`. Папка `core/metrics/` удалена.

---

## 4. ПАПКА `shared/`

```
shared/
├── components/    # 13 Vue-компонентов (переиспользуемые)
├── templates/     # 11 x-template файлов для компонентов из shared/components/
└── utils/         # 7 утилит (до Vue)
```

**Хорошо:**
- Паттерн «один компонент — один template» в `shared/` реализован **полностью**: каждый компонент из `shared/components/` имеет соответствующий `*-template.js` в `shared/templates/`.
- `shared/utils/` содержит утилиты без Vue-зависимостей — это правильно.

**Проблема #6 — `messages-store.js` в `shared/utils/`: ⏳ ОТЛОЖЕНО**  
Перенос в `shared/components/` или `shared/stores/` затронет слишком много перекрёстных ссылок. Требуется отдельная сессия.

---

## 5. ПАПКА `app/`

```
app/
├── app-ui-root.js         # Главный Vue-компонент (~5000 строк)
├── components/            # 21 app-специфичный компонент
└── templates/             # 10 x-template файлов
```

**Хорошо:**
- Разделение на `app/` и `shared/` принципиально верное: `shared/` — переиспользуемые примитивы, `app/` — специфичные для этого приложения.

**Проблема #7 — Паттерн template/component в `app/`: ✅ РЕШЕНО (задокументировано)**  
Двухуровневая система задокументирована в `modules-config.js`:
- Компоненты с большим HTML используют отдельные `*-template.js` файлы.
- Компоненты с компактным HTML хранят шаблон inline в `template: \`...\``.
Это намеренный паттерн, а не непоследовательность.

**Проблема #8 — Именование template файла для `icon-manager-modal-body`: ✅ РЕШЕНО**  
Файл переименован в `icon-manager-modal-body-template.js`. Все ссылки обновлены.

**Проблема #9 — `app-ui-root.js` (~5000 строк) — God Object: ⏳ ОТЛОЖЕНО**  
Разбиение файла на 5000 строк требует значительных архитектурных решений и выделенной сессии рефакторинга. Не в scope текущей итерации.

---

## 6. ПАПКА `styles/`

```
styles/
├── wrappers/
│   ├── button.css
│   ├── button-group.css
│   ├── dropdown.css
│   └── dropdown-menu-item.css
├── layout/
│   ├── footer.css
│   ├── header.css
│   ├── messages-splash.css
│   ├── scrollbars.css
│   └── table-columns.css
└── custom/
    ├── combobox.css
    ├── modal-header-tabs.css
    └── modal-themed.css
```

**Хорошо:**
- Три семантических уровня: `wrappers/` (Bootstrap-надстройки) → `layout/` (макет) → `custom/` (специфика компонентов) — логично и хорошо задокументировано в `index.html`.

**Проблема #10 — `table-columns.css` в корне `styles/`: ✅ РЕШЕНО**  
Перенесён в `styles/layout/table-columns.css`. Ссылка в `index.html` обновлена.

---

## 7. ПАПКА `mm/` — Математические модели

```
mm/
├── base-model-calculator.js   # Базовый класс для моделей
├── model-manager.js           # Менеджер моделей
└── median/
    └── air/
        ├── 260101/
        │   ├── median-air-260101-calculator.js
        │   └── meta.json
        └── 260115/
            ├── median-air-260115-calculator.js
            └── meta.json
```

**Хорошо:**
- Каждая версия модели — изолированная директория с кодом и метаданными.
- `meta.json` — отличная идея для self-describing моделей (id, formula, params).
- Структура `{Family}/{Type}/{VersionDate}` создаёт понятное пространство имён.

**Проблема #11 — Смешение регистров в `mm/Median/AIR/`: ✅ РЕШЕНО**  
Переименовано в `mm/median/air/`. Все пути в `modules-config.js` обновлены.

**Проблема #12 — `core/metrics/` оторван от `mm/`: ✅ РЕШЕНО**  
`base-model-calculator.js` и `model-manager.js` перенесены в `mm/`. Папка `core/metrics/` удалена. Все модели и их инфраструктура теперь в одном месте.

---

## 8. ИМЕНОВАНИЕ ФАЙЛОВ

**Соблюдается:**
- Все JS-файлы: `kebab-case` ✅
- Все CSS-файлы: `kebab-case` ✅
- Template-файлы: `{name}-template.js` ✅ (за исключением #8)

**Нарушения (оставшиеся):**
- `postgres-client.js` / `postgres-config.js` — вводящее в заблуждение имя (#4, отложено)

---

## 9. КОНФИГУРАЦИЯ И FEATURE FLAGS

`app-config.js` содержит feature flags:
```js
features: {
    postgresSync: false  // Выключен до появления реализации
}
```

✅ Feature flag `postgresSync` установлен в `false`.

---

## 10. ПРИОРИТИЗИРОВАННЫЙ СПИСОК УЛУЧШЕНИЙ

| # | Проблема | Статус |
|---|---|---|
| 1 | **#1** `IS.html` в корне | ✅ Вынесено в `is/` |
| 2 | **#2** `messages-migrations.js` в `cache/` | ✅ Перенесено в `core/config/` |
| 3 | **#3** Perplexity-интеграция | ✅ Полностью удалена (4 файла + ~72 ссылки) |
| 4 | **#4** `postgres-*.js` — вводящее в заблуждение имя | ⏳ Отложено (слишком много перекрёстных ссылок) |
| 5 | **#5** `core/metrics/` оторван от `mm/` | ✅ Перенесено в `mm/` |
| 6 | **#6** `messages-store.js` расположение | ⏳ Отложено (слишком много перекрёстных ссылок) |
| 7 | **#7** Паттерн template/component | ✅ Задокументировано в `modules-config.js` |
| 8 | **#8** `icon-manager-template.js` именование | ✅ Переименовано в `icon-manager-modal-body-template.js` |
| 9 | **#9** God Object `app-ui-root.js` | ⏳ Отложено (требует выделенной сессии) |
| 10 | **#10** `table-columns.css` в корне `styles/` | ✅ Перенесено в `styles/layout/` |
| 11 | **#11** PascalCase в `mm/Median/AIR/` | ✅ Переименовано в `mm/median/air/` |
| 12 | **#12** `core/metrics/` оторван от `mm/` | ✅ Перенесено в `mm/` |
| 13 | Feature flag `postgresSync` | ✅ Установлено `false` |

---

## 11. ИТОГ

Проект построен по осмысленному архитектурному плану. Из 12 выявленных проблем **9 решены**, **3 отложены** (God Object `app-ui-root.js`, postgres-naming, messages-store location). Perplexity-интеграция полностью удалена. Оставшиеся проблемы требуют выделенных сессий рефакторинга с расширенным scope.
