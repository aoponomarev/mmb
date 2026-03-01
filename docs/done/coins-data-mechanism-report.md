# Отчёт: механизм получения и отображения данных о монетах в `index.html`

Ниже описан полный путь, как в приложении формируется таблица монет на главной странице (`index.html`), какие есть кэши, как они инвалидируются и где происходит fallback.

## 1) Откуда вообще начинает работать таблица

1. `index.html` подключает стили, затем базовые скрипты и модульную систему.
2. После `DOMContentLoaded` вызывается `module-loader`, который грузит модули в правильном порядке из `core/modules-config.js`.
3. Из модуля `app-ui-root` создаётся приложение Vue и монтируется в `#app`.
4. В `app-ui-root` есть данные:
   - `coins` — массив, который рендерится в таблицу.
   - `coinsLoading`, `coinsError` — состояния загрузки/ошибок для баннера/табличного состояния.
   - `coinsCacheCheckTimer` — таймер контроля срока метаданных кэша.

Важно: именно `coins` из `app-ui-root` связывается с разметкой `<tbody>` в `index.html`, а не с отдельным API-сервисом на стороне шаблона.

## 2) Как приложение стартует и принимает решение, что грузить

В `mounted()` `app-ui-root` выполняются шаги инициализации:

1. Загружаются workspace/настройки (`workspaceConfig`), язык, таймзона и т.п.
2. Загружаются активные сеты монет (`activeCoinSetIds`) из workspace.
3. Вызывается `loadCoinsForActiveSet()`.
4. Инициализируются фоновые процессы:
   - `updateCoinsCacheMeta()` + периодический `setInterval` по 60 секунд
   - `preloadMaxCoinsData()` (ленивая предзагрузка 250-ти)
   - `loadTableSettings()`, `recalculateAllMetrics()`

`loadCoinsForActiveSet()` работает так:
- Если `activeCoinSetIds` пуст — грузит таблицу через `loadTopCoins()`.
- Если есть set IDs — грузит монеты именно по этим ID через `loadCoinsByIds()`.
- Если часть set не найдена или не загрузилась — fallback на top-лист.

## 3) Базовый путь рендера таблицы: `loadTopCoins()`

`loadTopCoins()` — главный метод для index-таблицы (топ-коины):

1. Ставит `coinsLoading = true`, `coinsError = null`.
2. Ключ кэша: `top-coins-by-market-cap`.
3. Пытается взять массив из `cacheManager.get(cacheKey)`.
4. Если кэша нет:
   - пробует инфраструктурный локальный fallback `http://127.0.0.1:3002/api/market/top-coins?sortBy=market_cap` (с защитой от повторных попыток),
   - при удаче пишет его обратно в `cacheManager`.
5. Если кэш уже есть:
   - сразу формирует `this.coins = first 50 из кэша`.
   - пишет иконки/объекты в `coinsDataCache` (Map по id).
   - запускает `recalculateAllMetrics()`.
   - проверяет возраст мета (`${cacheKey}-meta.timestamp`):
     - если **свежее** (< 2 часов) — background update пропускается;
     - если устарело — ставит `setTimeout` на 15 секунд и обновляет в фоне `dataProviderManager.getTopCoins(250, 'market_cap')` + записывает в кэш и мета.
6. Если cache пуст и API не дал ответа — fallback цепочка:
   - ещё раз infra-кэш;
   - если ничего нет — `localStorage` с ключом `top-coins-by-market-cap`.
7. В `finally` снимает `coinsLoading = false`.

То есть для таблицы `index.html` основной рабочий путь — **cache-first + stale-in-bg + редкий фоновый API-обновление**.

## 4) Когда обновляется список по кнопке пользователя

Кнопка обновления в заголовке вызывает `refreshCoinsCache()`:

- принудительно очищает связанные ключи кэша:
  - `top-coins-by-market-cap`, `top-coins-by-market-cap-meta`
  - `top-coins-by-volume`, `top-coins-by-volume-meta`
  - `stablecoins-list`
  - плюс кэш метрик (`vix-index`, `fear-greed-index`) при полной операции
- получает fresh данные через `dataProviderManager.getTopCoins(250, ...)` (market cap + volume),
- сохраняет в кэш + мета,
- обновляет стейблкоины и метрики,
- после успешного обновления вызывает `loadTopCoins()` и `updateCoinsCacheMeta()`.

Отдельно есть `softRefreshCoinsTable()` для мягкого обновления из кэша без сети.

## 5) Предзагрузка фоновых топов

`preloadMaxCoinsData()` делает фоновую подготовку двух больших списков:
- `top-coins-by-market-cap`
- `top-coins-by-volume`

Алгоритм:
1. Проверяет, есть ли уже свежий кэш (по `< 2 часов`).
2. При отсутствии свежести проверяет `requestRegistry` (`coingecko/getTopCoins`) на разрешение запроса.
3. Загружает `getTopCoins(250, ...)` по порядку (market_cap, затем volume).
4. Между тяжёлыми запросами делает паузу.
5. На 429/limit не цепляет повторный volume после сработавшего market_cap (защита от усугубления блокировки).

## 6) Слой доступа к API: DataProviderManager

`app-ui-root` никогда напрямую не дергает CoinGecko — через:
- `window.dataProviderManager.getTopCoins(count, sortBy, options)`
- опционально `getCoinData`, `searchCoins`.

`data-provider-manager.js` делает:
1. Получение текущего провайдера (`coingecko` по умолчанию).
2. Проверку `requestRegistry` для `getTopCoins`:
   - минимальный интервал 2 часа между попытками в обычном случае;
   - при 429 интервал фактически удваивается до `3 * base` внутри `requestRegistry`.
3. Если registry запрещает запрос, пытается вернуть кэшированные данные (`top-coins-by-market-cap` или `top-coins-by-volume`).
4. Передача ключа API (для провайдеров где нужно), вызов метода провайдера.
5. Фильтрация банов и возвращение массива.

Только после успешного ответа `window.cacheManager` в `loadTopCoins()` получает эти данные и применяет их к UI.

## 7) Провайдер CoinGecko: как формируются конкретные данные монет

`CoinGeckoProvider` отвечает за фактический сетевой слой.

Ключевые моменты:
- `buildUrl(...)`:
  - если приложение открыто как `file://`, все запросы идут через `cloudflare proxy`;
  - иначе — прямой `api.coingecko.com`.
- `getTopCoins(count, sortBy, options)`:
  - валидирует `count`,
  - выбирает режим `shouldUseChunkedTopCoins` (особенно на `file://` и больших объёмах),
  - делает запросы с retry и обработкой `429`/сетевых ошибок через `retry`/`retryAfter`,
  - нормализует ответ в единый внутренний формат (`normalizeCoinData`).
- `normalizeCoinData` даёт поля, которые нужны таблице:
  - `id`, `symbol`, `name`, `image`, `current_price`, `market_cap`, `total_volume`,
  - `price_change_percentage_1h,24h,7d,14d,30d,200d`,
  - производные поля `pvs`, `PV1h`, `PV24h`, ... для расчётного блока метрик.
- `getCoinData` используется для подгрузки отдельных монет (по ID), например при работе с избранным/наборами.

## 8) Как работает `cacheManager` для этой цепочки

`cache-manager.js` — единая абстракция поверх слоёв хранения:
- `cacheConfig` задаёт TTL/версии/стратегии;
- `storageLayers` определяет слой хранения по ключу:
  - для `top-coins-by-market-cap` явного правила нет, поэтому fallback в `hot` (по умолчанию),
  - значит для этого ключа используется `localStorage`.

### Ключевые свойства:
- `get(key)`:
  - берёт versionedKey (если ключ должен версионироваться),
  - получает запись из storage,
  - проверяет TTL (`expiresAt`) и удаляет просрочку,
  - применяет миграции, возвращает `.data`.
- `set(key, value)`:
  - пишет `{data, version, timestamp, expiresAt}`.
- `delete(key)` и `has(key)` — для reset/purge и проверок.

TTL в конфигурации:
- `top-coins-by-market-cap` и `top-coins-by-volume` — `2 * 60 * 60 * 1000`.
- также есть `top-coins` и `coins-list` с отдельными TTL.

Важно: для «свежести» UI используется meta-таймер 2 часа (`coinsCacheMeta.timestamp`) в `ui-state`, и это теперь согласовано с TTL:
- `cacheManager` может считать запись «живой» до 2 часов по TTL,
- UI запускает фоновое обновление после 2 часов и синхронизировано с кэшем по одному порогу.

## 9) `coinsDataCache` и кэширование изображений/данных объектов

В дополнение к `cacheManager` внутри компонента есть `coinsDataCache = new Map()`:
- используется для хранения полного объекта монеты (в т.ч. `image`) для UI-частей, где нужен быстрый доступ к метаданным избранного,
- предотвращает потерю иконок при удалении/добавлении/переносе монеты,
- обновляется при загрузке топа, добавлении/поиске по id и пересчётах.

## 10) Как данные доходят до строки таблицы

После заполнения `this.coins`:
1. Рендер использует `sortedCoins`:
   - если активен пользовательский набор — сортировка/фильтрация сначала по нему;
   - затем применяется выбранный тип сортировки (`market_cap`, `total_volume`, `alphabet`, `favorite`, `selected`) и `stable sort`-логика.
2. `v-for="coin in sortedCoins"` строит строки таблицы.
3. Для каждой колонки используются:
   - прямые поля (`coin.current_price`, `coin.price_change_percentage_1h`, ...)
   - поля из `metrics` (`metrics.agr`, `metrics.cdh`, `metrics.cgr`, ...), которые появляются после `recalculateAllMetrics()`.

## 11) Перерасчёт и метрики

`recalculateAllMetrics()` запускается после успешной загрузки монет.
Он передаёт массив `this.coins` в `modelManager`, получает обогащённые объекты с `metrics`, и обновляет header-панель (CDH/AGR/MDN/Market Breadth и т.д.).

Иначе говоря:
- API дает сырые рыночные поля (цены/изменения/market_cap/volume),
- модельный слой добавляет производные показатели,
- шаблон рендерит и рыночные, и производные показатели из одного `coins` массива.

## 12) Fallback-цепочки и устойчивость

Что происходит при сетевых проблемах:
1. `loadTopCoins()`:
   - сначала browser-cache,
   - потом infra,
   - потом API,
   - потом локальный fallback `localStorage`,
   - в крайнем случае UI остаётся пустым/необновлённым с предупреждением.
2. Провайдер CoinGecko:
   - retry/retryDelay,
   - retry-after support,
   - `getTopCoins`/`fetchTopCoins` с `tryLocalTopCoinsFallback`.
3. `requestRegistry + rateLimiter`:
   - не допускает избыточные обращения,
   - снижает риск 429 и лавинообразного фейла.

## 13) Что важно помнить по факту поведения

- На старте обычно показывается кэш (если есть), и только по необходимости сеть.
- Даже без ручного обновления таблица сама может обновляться в фоне при:
  - прохождении 2-часового порога `coinsCacheMeta`,
  - успешном чтении кэша из storage.
- Manual Refresh — не просто перезагрузка таблицы, а полный сброс/обновление монет и части рыночных метрик.
- `activeCoinSetIds` может радикально изменить источник: таблица покажет выбранные монеты не из top-250, а из заданного набора (с дозагрузкой по ID).

## 14) Что могло сломаться/подорвать смысл после рефакторинга

Ниже — список мест, где логика сейчас может быть формально рабочей, но по факту приводит к деградации:

### 14.1 Критичные точки (сейчас требуют отдельной проверки)

1. **`cache-manager.js`: очистка просроченного кэша по неверному ключу**
   - В `get()` на ветке TTL-проверки используется `storage.delete(key)`, хотя запись была считана через `versionedKey`.
   - Результат: просроченная запись с префиксом версии не удаляется, и каждый вызов снова читает и проверяет устаревшие данные.
   - Симптомы: рост мусора в кэше, лишние JSON parse на каждом `get`, неочевидное поведение после смены версий.
   - Файлы: `core/cache/cache-manager.js` (`get`), `core/cache/storage-layers.js`.

2. **`requestRegistry.isAllowed()` не учитывает неуспешный последний запрос без `lastSuccess`**
   - Блокировка после 429 строится через `lastSuccess`, поэтому после серии фейлов без успешного ответа защита может не сработать в момент следующей попытки.
   - Ветка `data-provider-manager.getTopCoins()` при блокировке возвращает fallback или ошибку, но при этом поведенчески может часто повторять сетевой поток в коротких окнах.
   - Файлы: `core/api/request-registry.js`, `core/api/data-provider-manager.js`.

3. **`loadTopCoins()` проглатывает часть ошибок в `catch`**
   - В ошибке сети/сервиса `coinsError` не выставляется, `coinsLoading` в `finally` всё равно сбрасывается.
   - Для пользователя это выглядит как «тихий ноль»: кэш не загрузился, но явного статуса ошибки в UI может не быть.
   - Файлы: `app/app-ui-root.js` (`loadTopCoins()`).

### 14.2 Средний риск (работает, но с побочными эффектами)

4. **`coinsDataCache` + fallback к `localStorage` для `top-coins-by-market-cap`**
   - Есть код fallback из `localStorage` через `JSON.parse(saved)` и проверку `Array.isArray(fallback)`.
   - Сейчас кэш записи через `cacheManager.set` хранит объект `{ data, version, timestamp, expiresAt }`, а не «чистый массив».
   - Риск: данный fallback редко/почти никогда не отрабатывает в новых версиях схемы и даёт ложное ощущение «дополнительной защиты».
   - Файл: `app/app-ui-root.js` (`loadTopCoins()`).

5. **Два разных критерия «свежести»**
- Для записи кэша `top-coins-by-market-cap` TTL в `cache-config` — 2 часа.
- Для UI-индикатора `coinsCacheMeta` применён тот же порог 2 часа.
- Риск: рассогласования между TTL и мета-индикатором устранено.
   - Файлы: `core/cache/cache-config.js`, `core/state/ui-state.js`, `app/app-ui-root.js`.

### 14.25 Модель SSOT-контрактов для обновления top-coins

Сформирована контрактная точка в `core/cache/cache-config.js`:

- `cacheConfig.getTopCoinsRefreshWindowMs()` — TTL + stale-окно для top-coins данных.
- `cacheConfig.getTopCoinsUiStaleThresholdMs()` — порог устаревания для UI-индикатора (`coinsCacheMeta`).
- `cacheConfig.getTopCoinsRequestIntervalMs()` — порог блокировки для `requestRegistry` в `getTopCoins`.
- `cacheConfig.DATA_FLOW_CONTRACTS.topCoins` — структурный контракт с теми же значениями (единый источник правды).

Эта модель уже использует "gate-подход":

1. **Storage gate** — запись/чтение из `cacheManager` валидируется по TTL из контракта.
2. **UI gate** — `app-ui-root` решает `stale`/`refresh` по `getTopCoinsUiStaleThresholdMs()`.
3. **Registry gate** — `data-provider-manager` и `app-ui-root` берут `getTopCoinsRequestIntervalMs()` перед API-вызовом.

Варианты эволюции:

- `v1` (сейчас): hardcoded 2 часа.
- `v2`: параметризовать интервал по режиму (например, `manual`, `daily`, `auto`) через тот же контрактный объект.
- `v3`: вынести в `json`/remote-конфиг и добавить валидацию схемы на старте (версионный контракт, fallback defaults).

### 14.3 Признаки, которые стоит проверить в логе при следующем прогоне

- Есть ли сообщения `cache-manager.get(top-coins-by-market-cap)` с `expired` и при этом кэш корректно удаляется по versioned key?
- Есть ли повторы `getTopCoins` в периоде после `lastSuccess/lastError` — теперь проверка идёт по последней попытке и учитывает серию ошибок.
- Есть ли срабатывания ветки fallback `localStorage` в `loadTopCoins()` и какой формат там реально прилетает (`raw array` vs `{ data: ... }`)?

### 14.4 Рекомендуемый порядок доработки

1. ✅ Исправить удаление просрочки в `cache-manager` на `storage.delete(versionedKey)` и проверить migration-кейсы.
2. ✅ Пересмотреть `requestRegistry`: блокировку учитывать не только `lastSuccess`, но и частые 429/ошибки подряд.
3. ✅ В `loadTopCoins` фиксировать `coinsError` при нефатальных сценариях и сбрасывать его при успешном fallback.
4. ✅ Привести fallback на локальный storage к одному формату кэша (поддержка wrapper + raw array).
5. ✅ Ввести базовый Meta-SSOT в `core/ssot/policies.js` и перейти основных потребителей (`cache-config`, `app-ui-root`, `data-provider-manager`, `market-metrics`, `request-registry`) на него.

### 14.5 Поэтапный план Meta-SSOT (практический)

- **Фаза 0 (завершена):** ввести `core/ssot/policies.js` и сделать его единым каталогом политик.
- **Фаза 1 (завершена):** подключить `cache-config` как consumer политик и зафиксировать контракт (`topCoins`, `marketMetrics`, `requestRegistry`).
- **Фаза 2 (в процессе):** убрать «магические» временные константы из модулей в `getPolicy`/конкретные гейты:
  - `app-ui-root` (UI stale gate),
  - `data-provider-manager` (Registry gate),
  - `request-registry` (backoff policy),
  - остальные API-воротки.
- **Фаза 3 (рекомендуется):** добавить автоматические проверки на «обход» SSOT:
  - линтер/скрипт проверки на прямые `4 * 60 * 60 * 1000` в критических зонах,
  - простая проверка целостности `window.ssot` и `cacheConfig`,
  - документация «контракты → гейты → владельцы».

## 15) Короткая трасса вызовов (минимум для дебага)

1. `mounted()` → `loadCoinsForActiveSet()`  
2. `loadCoinsForActiveSet()` → `loadTopCoins()` или `loadCoinsByIds()`  
3. `loadTopCoins()` → `cacheManager.get(top-coins-by-market-cap)` → optional network/infrastructure fallback  
4. при необходимости → `dataProviderManager.getTopCoins(250, 'market_cap')`  
5. `dataProviderManager` → `requestRegistry` check → `coingecko-provider.getTopCoins`  
6. результат → `cacheManager.set(top-coins-by-market-cap)`  
7. `this.coins = ...` → `recalculateAllMetrics()` → `sortedCoins` → шаблон `index.html`.

---

Файл сформирован для быстрого понимания архитектуры получения и кэширования данных таблицы монет с акцентом на поведение и устойчивость.

## 16) Статус реализации (актуально)

### Выполнено

1. ✅ Внедрен fallback monitoring:
   - добавлен `core/observability/fallback-monitor.js`,
   - fallback-события публикуются в `eventBus` и `messagesStore`,
   - индикатор fallback выведен в футер (`Fallbacks:<count>` + tooltip по последнему событию).
2. ✅ Восстановлена читаемость UI-строк после инцидента кодировки (приоритетные видимые элементы header/tabs/refresh).
3. ✅ Добавлены глобальные guardrails кодировки:
   - `.editorconfig` (`charset=utf-8`, `eol=lf`),
   - `.gitattributes` (UTF-8 working-tree encoding),
   - workspace-настройки `files.encoding=utf8` и `files.autoGuessEncoding=false`.
4. ✅ Продвинут Phase 2 SSOT:
   - timing в `app-footer` (delay/fallback/news max age) переведен на `window.ssot` гейты с обратным fallback.
5. ✅ SSOT выделен в отдельный архитектурный документ:
   - `ssot-architecture.md` в корне проекта (глобальная модель контрактов/гейтов/наблюдаемости).

### Что осталось добить

- Дочистка остаточных mojibake-комментариев (не влияет на runtime/UI, но снижает читаемость кода).
- Интеграция `scripts/check_ssot_guardrails.py` в CI pipeline (локально проверка уже внедрена).
- Дальнейшее сужение роли `cache-config` до адаптера (чтобы новые политики рождались только в `core/ssot/policies.js`).

## 17) Гарантия UTF-8 для текстовых файлов проекта

Выполнено принудительное приведение всех текстовых файлов репозитория к UTF-8:

- Скрипт: `scripts/enforce_utf8.py`
- Отчёт выполнения: `scripts/utf8-enforcement-report.json`
- Результат последнего прогона:
  - `converted_count = 22`
  - `unchanged_count = 139`
  - `failed_count = 0`

Итог: для всех текстовых файлов, физически находящихся в проекте и попадающих в охват (код/конфиги/доки), подтверждено соответствие UTF-8 и нормализован EOL.

Поддерживающие guardrails:

- `.editorconfig` — `charset = utf-8`
- `.gitattributes` — `working-tree-encoding=UTF-8` для основных текстовых расширений
- workspace settings — `files.encoding = utf8`, `files.autoGuessEncoding = false`

Рекомендуемый контроль на будущее:

- запуск `python scripts/enforce_utf8.py` перед релизом/мерджем;
- проверка `failed_count == 0` в CI.

## 18) Ревизия и добивка (текущий шаг)

В рамках ревизии по `coins-data-mechanism-report.md` и `ssot-architecture.md` дополнительно закрыто:

1. ✅ Phase 2 для top-coins доведен:
   - убраны runtime fallback-зависимости на `cacheConfig` в gate-точках `app-ui-root` и `data-provider-manager`;
   - первичный источник для gate-таймингов — `window.ssot`.
2. ✅ Добавлена self-validation SSOT контрактов:
   - `window.ssot.validateContracts()` проверяет обязательные numeric-path поля и валит инициализацию при нарушении.
3. ✅ Введен guardrail-скрипт против «магических» таймингов:
   - `scripts/check_ssot_guardrails.py`,
   - последний прогон: `SSOT guardrail check PASSED`.

Оставшийся незакрытый хвост по документам:
- интеграция guardrail-скрипта в CI и финальная косметическая дочистка mojibake-комментариев.

## 19) Глобальная политика fallback (внедрено)

Внедрена enforceable-политика:

1. ✅ Любой подключаемый fallback должен иметь канал в системные сообщения/футер через `fallbackMonitor.notify(...)`.
2. ✅ Добавлен guardrail-скрипт:
   - `scripts/check_fallback_observability.py`
3. ✅ Подключены fallback-эмиссии в модулях с fallback-логикой:
   - `core/config/workspace-config.js`
   - `core/api/ai-provider-manager.js`
   - `core/api/ai-providers/yandex-provider.js`
   - `app/components/coin-set-load-modal-body.js`
   - (ранее) `app/app-ui-root.js`, `core/api/data-providers/coingecko-provider.js`, `app/components/app-footer.js`
4. ✅ Подключен CI workflow:
   - `.github/workflows/guardrails.yml`
   - включает `enforce_utf8.py`, `check_ssot_guardrails.py`, `check_fallback_observability.py`
5. ✅ Добавлен архитектурный документ по fallback:
   - `fallback-architecture-policy.md` (корень проекта)
   - включает принцип «воздержания» от fallback (fallback abstinence) и условия допустимости.
