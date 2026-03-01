# Полный гайд по контуру данных монет (CoinGecko)

## Назначение документа

Этот документ описывает полный контур получения, нормализации, кэширования, ротации, fallback-поведения и отображения данных о монетах в текущем проекте `app`.

Цель: восстановить целостную картину "как все работает" от запуска UI до рендера таблицы, включая нюансы устойчивости и ограничения.

---

## 1. Верхнеуровневая архитектура (по сохраненной схеме)

В проектной схеме присутствуют два контура:

1. Серверный ingest-контур:
   - Планировщик в Яндекс.Облаке
   - Функция запроса к CoinGecko
   - Обработка ответа
   - Запись в БД Яндекс.Облака

2. Пользовательский read-контур:
   - Пользователь запрашивает данные
   - Cloudflare (защита/кэширование)
   - API/веб-интерфейс
   - Чтение из БД

Важно: в этом репозитории полностью реализована фронтенд-часть и клиентские механизмы кэширования/фолбэков. Серверный ingest-контур отражен архитектурно и через интеграционные точки (например, `yandex-cache-provider`), но не целиком в виде cloud-функций внутри этого дерева.

---

## 2. Точка входа и порядок инициализации

### 2.1 Старт страницы

`index.html`:

- Подключает стили и bootstrap.
- Подключает `core/modules-config.js`.
- Подключает `core/module-loader.js`.
- После `DOMContentLoaded` вызывает `window.moduleLoader.load()`.

### 2.2 Модульный загрузчик

`core/module-loader.js`:

- Собирает все модули из `window.modulesConfig`.
- Строит граф зависимостей.
- Выполняет топологическую сортировку.
- Загружает скрипты последовательно через `<script src=...>` (поддерживает `file://` и `http(s)`).

### 2.3 Конфиг модулей

`core/modules-config.js`:

- Регистрирует ключевые модули контура:
  - `ssot-policies`
  - `cache-config`
  - `storage-layers`
  - `cache-manager`
  - `request-registry`
  - `coingecko-provider`
  - `yandex-cache-provider`
  - `data-provider-manager`
  - `app-ui-root`

---

## 3. SSOT и контракты таймингов

`core/ssot/policies.js` задает контрактные значения:

- `topCoins.ttlMs`
- `topCoins.uiStaleThresholdMs`
- `topCoins.requestRegistryMinIntervalMs`
- `marketMetrics.minIntervalMs`
- `requestRegistry.rateLimitBackoffMultiplierOnError`
- `appFooter.*` тайминги

Файл экспортирует `window.ssot` и на старте выполняет `validateContracts()`.

Это целевая "точка правды" для таймингов и интервалов.

---

## 4. Ключевые компоненты data-контура

### 4.1 `app/app-ui-root.js` (оркестратор UI)

Отвечает за:

- выбор источника данных (top-лист или active set),
- чтение/обновление кэша топ-монет,
- запуск фоновой предзагрузки,
- реактивное обновление таблицы,
- запуск перерасчета метрик.

Ключевые методы:

- `loadCoinsForActiveSet()`
- `loadCoinsByIds()`
- `loadTopCoins()`
- `preloadMaxCoinsData()`
- `refreshCoinsCache()`
- `updateCoinsCacheMeta()`

### 4.2 `core/api/data-provider-manager.js` (шлюз провайдеров)

- Выбирает текущий провайдер (`coingecko` по умолчанию).
- Перед `getTopCoins` проверяет `requestRegistry`.
- При блокировке запроса пытается вернуть данные из кэша.
- Логирует успех/ошибку вызова обратно в `requestRegistry`.

### 4.3 `core/api/data-providers/coingecko-provider.js` (сетевой слой)

- Формирует URL с учетом протокола:
  - `file://` -> Cloudflare proxy,
  - `http(s)` -> прямой CoinGecko.
- Запрашивает данные топа и конкретных ID.
- Поддерживает chunk-режим, retry, обработку 429/Retry-After.
- Нормализует монеты к единому формату (`normalizeCoinData`).

### 4.4 `core/cache/cache-manager.js` + `core/cache/storage-layers.js`

- `cacheManager` хранит записи как обертку:
  - `{ data, version, timestamp, expiresAt }`.
- `storage-layers` делит ключи на `hot/warm/cold`.

Нюанс текущей реализации:

- Для `warm/cold` сейчас используется fallback-поведение через `localStorage` с префиксами `idb_<layer>_...`, а не полноценный IndexedDB backend.

### 4.5 `core/api/request-registry.js`

- Хранит историю вызовов (`lastSuccess`, `lastError`, `lastErrorStatus`).
- Решает, разрешать ли новый запрос (`isAllowed`).
- Дает время до следующего разрешенного вызова (`getTimeUntilNext`).

---

## 5. Реальный путь данных для главной таблицы

### 5.1 Выбор режима загрузки

`loadCoinsForActiveSet()`:

- Если `activeCoinSetIds` пуст:
  - сохраняет пустой активный набор
  - вызывает `loadTopCoins()`.
- Если IDs есть:
  - вызывает `loadCoinsByIds(ids)`,
  - рендерит набор,
  - при невозможности загрузки выполняет fallback на top-list.

### 5.2 Основной путь `loadTopCoins()`

Порядок:

1. `coinsLoading = true`, `coinsError = null`.
2. Пытается прочитать `top-coins-by-market-cap` через `cacheManager.get`.
3. Если пусто:
   - пытается legacy-ключ `idb_warm_top-coins-by-market-cap` из `localStorage`.
4. Если кэш найден:
   - берет первые 50 монет в `this.coins`,
   - заполняет `coinsDataCache` (Map),
   - запускает `recalculateAllMetrics()`,
   - проверяет возраст meta (`top-coins-by-market-cap-meta`),
   - если устарело — запускает фоновой refresh через `setTimeout`.
5. Если кэш пуст:
   - делает сетевой вызов `dataProviderManager.getTopCoins(250, 'market_cap')`,
   - сохраняет результат в кэш,
   - рендерит первые 50.
6. В `catch` пытается дополнительный fallback из `localStorage`.
7. В `finally` снимает флаг загрузки.

---

## 6. Нормализация данных CoinGecko

`normalizeCoinData()` в `coingecko-provider` приводит вход к единому контракту:

- Базовые поля:
  - `id`, `symbol`, `name`, `image`,
  - `current_price`, `market_cap`, `market_cap_rank`, `total_volume`.
- Изменения цены:
  - `price_change_percentage_1h/24h/7d/14d/30d/200d`.
- Для матмодели:
  - `pvs` + `PV1h`, `PV24h`, `PV7d`, `PV14d`, `PV30d`, `PV200d`.
- Служебное:
  - `_cachedAt`.

Так UI и модельный слой работают с унифицированным форматом вне зависимости от источника.

---

## 7. Ротация и обновление кэша

### 7.1 Фоновая предзагрузка (`preloadMaxCoinsData`)

Задача: подогреть оба топ-набора (`market_cap` и `volume`) по 250.

Алгоритм:

- Проверка наличия свежих данных.
- Проверка `requestRegistry` перед запросом.
- При блокировке/429 прекращает цепочку, чтобы не усилить rate limit.
- Между тяжелыми запросами делает паузу.

### 7.2 Ручной refresh (`refreshCoinsCache`)

Кнопка Refresh:

- очищает ключи:
  - `top-coins-by-market-cap` и `-meta`,
  - `top-coins-by-volume` и `-meta`,
  - `stablecoins-list`,
  - часть рыночных метрик (`vix-index`, `fear-greed-index`),
- грузит свежие наборы через provider manager,
- сохраняет в кэш,
- перезапускает загрузку таблицы.

### 7.3 Мета свежести (`updateCoinsCacheMeta`)

- Читает `top-coins-by-market-cap-meta`,
- прокидывает `timestamp/expiresAt` в `uiState.cache.coinsCacheMeta`,
- используется UI-индикатором и логикой stale/fresh.

---

## 8. Rate limiting и устойчивость к 429

### 8.1 Два уровня защиты

1. `request-registry`:
   - межзапросные интервалы,
   - блокировка частых повторов,
   - учет ошибок и 429.

2. `rate-limiter`:
   - адаптивная задержка,
   - увеличение timeout на 429,
   - постепенное снижение при успехах.

### 8.2 Retry в CoinGecko provider

- На retriable статусы (`408`, `429`, `5xx`) делает повтор.
- Для `429` приоритетно использует `Retry-After`.
- Для chunk-загрузки эмитит progress-события.

---

## 9. Fallback-архитектура и наблюдаемость

Политика: fallback не должен быть "немым".

`core/observability/fallback-monitor.js`:

- `notify({ source, phase, details })`,
- событие в `eventBus` (`fallback:used`),
- предупреждение в `messagesStore`,
- счетчик fallback в футере (`Fallbacks:<count>`),
- tooltip с последним fallback-событием.

Это дает прозрачность "из какого источника реально пришли данные".

---

## 10. Отображение в таблице и вычисления

После наполнения `this.coins`:

1. Строится `sortedCoins` (учет типа сортировки, selected/favorite и т.д.).
2. `index.html` рендерит `v-for="coin in sortedCoins"`.
3. Ячейки читают:
   - сырые поля рынка (`current_price`, `%change`, volume),
   - производные `metrics.*` после `recalculateAllMetrics()`.

---

## 11. Дополнительный контур: `yandex-cache-provider`

`core/api/data-providers/yandex-cache-provider.js`:

- источник `GET /api/coins/market-cache` через Yandex API Gateway,
- читает уже подготовленные данные из PostgreSQL-кэша,
- поддерживает `getTopCoins`, `getCoinData`, `searchCoins`,
- нормализует формат под общий контракт.

Это альтернативный источник к прямому CoinGecko.

---

## 12. Важные нюансы и риски текущего состояния

1. Тайминговый дрейф 2ч vs 4ч:
   - SSOT `topCoins` задает 2 часа,
   - в `app-ui-root.js` местами остались hardcoded `4 * 60 * 60 * 1000`.

2. Подавление UI-ошибки в `loadTopCoins`:
   - в catch `coinsError` фактически скрыт (закомментирован).

3. Слои `warm/cold`:
   - заявлены как IndexedDB, но сейчас фактически fallback на localStorage.

4. Серверный ingest:
   - в этом репо нет полной реализации cron/fetcher-контура, только точки интеграции.

---

## 13. Краткая трасса вызовов (для дебага)

1. `index.html` -> `moduleLoader.load()`
2. `app-ui-root.mounted()`
3. `loadCoinsForActiveSet()`
4. `loadTopCoins()` или `loadCoinsByIds()`
5. `dataProviderManager.getTopCoins(...)`
6. `requestRegistry.isAllowed(...)`
7. `coingecko-provider.getTopCoins(...)`
8. `cacheManager.set('top-coins-by-market-cap', data)`
9. `this.coins = ...`
10. `recalculateAllMetrics()`
11. `sortedCoins` -> рендер таблицы.

---

## 14. Проверочный чек-лист "контур жив"

1. Модули загружены без циклов/ошибок.
2. `window.ssot.validateContracts()` проходит.
3. `loadTopCoins()`:
   - либо берет кэш,
   - либо успешно тянет top-250.
4. `requestRegistry` не в перманентной блокировке.
5. На 429 нет шторма повторов.
6. В футере fallback-счетчик отражает fallback-ветки.
7. Таблица показывает строки и пересчитанные `metrics.*`.

---

## 15. Что считать "эталонным" потоком

Эталонный runtime-поток для пользователя:

- Быстрый старт из кэша -> мгновенный рендер таблицы.
- Фоновое обновление только по истечении окна свежести.
- Сетевые запросы проходят через request-registry + rate-limiter.
- Любой fallback прозрачно сигнализируется через monitor/messages/footer.
- UI не теряет работоспособность даже при проблемах внешнего API.

