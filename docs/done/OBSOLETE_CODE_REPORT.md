# ОТЧЁТ ОБ УСТАРЕВШЕМ КОДЕ
**Дата:** 2026-02-26  
**Область анализа:** Весь проект `app/`  
**Точки отсчёта:** `index.html`, `IS.html`, `test.html` (папка «Новый app»)

---

## Методология

`index.html` и `test.html` используют **модульную систему** (`core/modules-config.js` + `core/module-loader.js`), которая динамически загружает все локальные JS-файлы, перечисленные в конфиге.  
`IS.html` — независимая страница, загружает только `V2_logic.js` и `V2_standard.css`.  
Всё, что **не перечислено** ни в модульном конфиге, ни в `<script>/<link>` самих HTML-файлов — гарантированно мёртвый код.

---

## СЕКЦИЯ 1 — Папки, не нужные целиком

Ни один файл из этих папок не загружается ни одним из трёх шаблонов.

### `cloud/` — серверная инфраструктура (67 файлов)

Весь каталог содержит код, **выполняемый на серверах** (Cloudflare Workers, Yandex Cloud Functions), а не в браузере. Браузерные шаблоны обращаются к уже **задеплоенным** API-эндпоинтам через `core/api/cloudflare/` — в самом репозитории серверный код клиентским страницам не нужен.

| Подпапка | Описание | Файлов |
|---|---|---|
| `cloud/cloudflare/workers/.wrangler/` | Локальный кэш Wrangler (состояние разработки, бинарные sqlite-блобы) | ~20 |
| `cloud/cloudflare/workers/deployments/2026-01-06-*` | Архивный снэпшот деплоя 06.01.2026 | 8 |
| `cloud/cloudflare/workers/deployments/2026-01-07-*` | Архивный снэпшот деплоя 07.01.2026 | 8 |
| `cloud/cloudflare/workers/src/` | Текущий исходник Worker (серверный, не браузерный) | 9 |
| `cloud/cloudflare/workers/migrations/` | SQL-миграции Cloudflare D1 | 2 |
| `cloud/yandex/deployments/` | Архивные снэпшоты Yandex Cloud (4 версии) | ~15 |
| `cloud/yandex/functions/app-api/` | Текущий исходник Yandex Function | 4 |
| `cloud/yandex/api-gateway/app-api-gw/` | OpenAPI-гейтвей Yandex | 2 |
| `cloud/yandex/migrations/` | SQL-миграции Postgres | 1 |
| Отдельные файлы в `cloud/` | `cloud/README.md`, `cloud/cloudflare/README.md`, `cloud/yandex/schema-postgres.sql` и др. | — |

> **Итого `cloud/`:** ~67 файлов. Безопасно удалять **целиком** (серверный код деплоится отдельно; .wrangler — рабочий артефакт toolchain, не нужен в репозитории).

---

## СЕКЦИЯ 2 — Отдельные файлы, не нужные целиком

Файлы, лежащие вне `cloud/`, которые **не подключены** ни одним из трёх шаблонов — ни напрямую, ни транзитивно через `modules-config.js`.

### Корень проекта

| Файл | Строк | Причина |
|---|---|---|
| `V2_logic.js` | 2 127 | Используется **только** `IS.html`. Не нужен для `index.html`/`test.html`. *(IS.html нужен — сам файл не мёртвый, но изолирован от остального проекта.)* |
| `V2_standard.css` | 125 | Используется **только** `IS.html`. То же самое. |

> ⚠️ `V2_logic.js` и `V2_standard.css` — **активный** код для `IS.html`. Удалять их нельзя. Указано здесь только для полноты картины: эти файлы полностью изолированы от `index.html`/`test.html` и никогда не пересекаются с ними.

### `core/` — файлы без подключения в `modules-config.js`

| Файл | Строк | Причина |
|---|---|---|
| `core/lib-loader.js` | 206 | Не упомянут ни в `modules-config.js`, ни в HTML-файлах. Вероятно — предшественник `module-loader.js`, замещён им. |
| `core/domain/portfolio-engine-smoke.js` | 194 | Не упомянут нигде. Smoke-тест движка портфелей — автономный скрипт, не часть модульной системы. |

### `core/api/` — модули с `condition: () => false`

| Файл | Строк | Причина |
|---|---|---|
| `core/api/messages-api.js` | 402 | В `modules-config.js` явно: `condition: () => false // Отключено по умолчанию (deprecated)`. Никогда не загружается. |

### Прочие корневые файлы

| Файл | Строк | Причина |
|---|---|---|
| `app.code-workspace` | — | Файл workspace VS Code. Не влияет на работу приложения в браузере. |
| `package.json` | — | Содержит Node.js-зависимости (`better-sqlite3`, `playwright`) и скрипты (`validate-env-example.js`, `app-index-gen.js`), которых нет в репозитории. Не нужен для браузерных шаблонов. |
| `package-lock.json` | 514 | Lockfile для `package.json` выше. |

---

## СЕКЦИЯ 3 — Файлы с фрагментами устаревшего кода

Файлы **активно используются** шаблонами, но содержат фрагменты, которые никогда не выполняются.

### `core/modules-config.js` (1 016 строк)
*(Загружается всеми тремя шаблонами)*

**Мёртвые записи конфига:**

| ID модуля | Строки | Причина |
|---|---|---|
| `messages-api` | ~5 строк конфига | `condition: () => false` — явно помечен deprecated. Запись бесполезна, файл `messages-api.js` никогда не загружается. |
| `postgres-sync-manager` | ~5 строк конфига | Модуль `postgres-sync-manager` зарегистрирован, но **не включён в deps** `app-ui-root` и ни одного другого используемого компонента. Объект создаётся глобально только если его загрузят — но никто не зависит от него. |

---

### `app/app-ui-root.js` (оценка: ~5 000+ строк)
*(Главный компонент, загружается через модульную систему)*

Ссылается на **глобальные объекты с `window?.`-проверками**, часть которых никогда не появляется в реальном рантайме:

| Фрагмент | Строки | Причина |
|---|---|---|
| `window.postgresSyncManager` | строки ~1082–1083, ~4935–4936 | `postgres-sync-manager` не загружается ни одним из шаблонов (не в deps `app-ui-root`). Все `if (window.postgresSyncManager)` — мёртвые ветки. |

> Остальные `window?.`-проверки (например, `window.messagesTranslator`, `window.tooltipInterpreter`) — **живой** код: соответствующие модули загружаются через `modules-config.js`.

---

### `core/api/postgres-sync-manager.js` (296 строк)
*(Зарегистрирован в `modules-config.js`, но не в deps `app-ui-root`)*

Файл загружается модульной системой (нет `condition`), но никто не вызывает его API — `app-ui-root` проверяет `window.postgresSyncManager` через `?.` и никогда не получает его. Фактически мёртвый модуль при текущей конфигурации.

---

## Сводная таблица

| Категория | Что удалить | Строк кода |
|---|---|---|
| **Папки целиком** | `cloud/` (всё, включая .wrangler) | ~8 400+ строк JS/SQL/TOML |
| **Файлы целиком** | `core/lib-loader.js` | 206 |
| | `core/domain/portfolio-engine-smoke.js` | 194 |
| | `core/api/messages-api.js` | 402 |
| | `package.json`, `package-lock.json` | 514 (lockfile) |
| | `app.code-workspace` | — |
| **Фрагменты** | `core/modules-config.js` — 2 dead entries | ~10 строк |
| | `app/app-ui-root.js` — ветки `postgresSyncManager` | ~4 строки |
| **Изолированный стек IS.html** | `V2_logic.js`, `V2_standard.css` — не связаны с index/test, но нужны IS.html | — |

> **Самое крупное удаление по объёму:** папка `cloud/` (~8 400 строк) — серверный код, не имеющий никакого отношения к браузерным шаблонам.
