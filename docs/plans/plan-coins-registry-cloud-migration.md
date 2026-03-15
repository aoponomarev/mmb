---
id: plan-coins-registry-cloud
status: draft
created: "2026-03-15"
related_skills:
  - sk-e0b8f3
  - sk-bb7c8e
  - sk-224210
related_ais:
  - ais-82c9d0

---

# План миграции: Coin Registry из GitHub в Yandex Cloud

## Контекст

Сейчас реестр монет (stablecoins, wrapped, lst, commodity) хранится в `a/data/coins.json` (GitHub CDN). Генератор в браузере обновляет его при нажатии «Update metadata». Облачный крон (market-fetcher) заполняет только `coin_market_cache` (top-250 cap/vol).

**Цель:** Реестр заполняется облачным кроном из CoinGecko по категориям. `coins.json` читается на старте только как fallback при недоступности Yandex API.

## Гибкость плана

План — живой документ. Агент может дополнять протоколы при обнаружении недостатков. Условие: обратная совместимость — изменения не должны инвалидировать уже полученные результаты.

---

## 1. Целевая архитектура

### 1.1 Поток данных

```
CoinGecko API (categories)
    │
    ├─► market-fetcher (cron) ─┬─► coin_market_cache (top-250 cap/vol)
    │                          ├─► coin_registry (wrapped, lst, commodity) — новый запрос
    │                          └─► coin_registry (stable.fiat) — новый запрос
    │
    ▼
PostgreSQL (app_db)
    │
    ├─► coin_market_cache
    └─► coin_registry (новая таблица)
            │
            ▼
    api-gateway GET /api/coins/registry
            │
            ▼
    coins-metadata-loader (браузер)
            │
            ├─► primary: Yandex API (если настроен)
            └─► fallback: GitHub CDN (a/data/coins.json)
```

### 1.2 Расписание крона (зазоры между cap/vol)

| Минута | Режим | Запрос CoinGecko | Назначение |
|--------|-------|------------------|------------|
| :00 | market_cap | top-250 by market_cap | Существующий |
| :15 | registry_wlc | wrapped + lst + commodity | Категории CoinGecko |
| :30 | volume | top-250 by volume | Существующий |
| :45 | registry_fiat | stablecoins (fiat) | Категория stablecoins |

### 1.3 CoinGecko категории

| Наш тип | CoinGecko category | Примечание |
|---------|-------------------|------------|
| wrapped | `asset-backed-tokens` | WBTC, WETH и т.п. |
| lst | `liquid-staking` | stETH, msol и т.п. |
| commodity | `tokenized-gold`, `tokenized-silver`, `tokenized-commodities` | Объединить в commodity.{peg} |
| stable.fiat | `stablecoins` или `usd-stablecoin` | Все фиатные стейблы |

**Важно:** CoinGecko `/coins/markets?category=X` возвращает монеты категории. Категории могут пересекаться. Нужно дедуплицировать по coin_id и задать приоритет при конфликте (например: stable > lst > wrapped > commodity).

---

## 2. Схема БД

### 2.1 Таблица coin_registry

```sql
CREATE TABLE IF NOT EXISTS coin_registry (
  coin_id TEXT NOT NULL,
  type TEXT NOT NULL,           -- 'wrapped' | 'lst' | 'commodity' | 'stable'
  peg TEXT,                      -- для commodity: 'gold','silver','platinum','palladium','oil'
                                 -- для stable: 'usd','eur','jpy',...
  source_category TEXT NOT NULL, -- CoinGecko category id
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (coin_id)
);

CREATE INDEX IF NOT EXISTS idx_coin_registry_type ON coin_registry (type);
CREATE INDEX IF NOT EXISTS idx_coin_registry_updated ON coin_registry (updated_at);
```

**Стратегия записи:** Для каждого режима (registry_wlc, registry_fiat) — TRUNCATE соответствующей части не делаем. Вместо этого: DELETE WHERE type IN (...), затем INSERT. Либо UPSERT по coin_id с обновлением type/peg при смене категории.

**Рекомендация:** Полная перезапись по типу. Для registry_wlc: DELETE WHERE type IN ('wrapped','lst','commodity'); INSERT. Для registry_fiat: DELETE WHERE type = 'stable'; INSERT.

---

## 3. Изменения в market-fetcher

### 3.1 Роутинг по режиму

Событие крона должно передавать режим. Варианты:
- Отдельные триггеры с разными `message` (payload)
- Один триггер с cron-выражением, режим по минуте (как сейчас order по minute)

Для 4 режимов: `minute % 15` даёт 0,15,30,45 — не подходит. Лучше явные триггеры с payload:

```json
// coingecko-fetcher-cron-cap
{ "mode": "market_cap" }

// coingecko-fetcher-cron-vol
{ "mode": "volume" }

// coingecko-fetcher-cron-registry-wlc
{ "mode": "registry_wlc" }

// coingecko-fetcher-cron-registry-fiat
{ "mode": "registry_fiat" }
```

### 3.2 Режим registry_wlc

1. Запросы к CoinGecko:
   - `GET /coins/markets?vs_currency=usd&category=asset-backed-tokens&per_page=250`
   - `GET /coins/markets?vs_currency=usd&category=liquid-staking&per_page=250`
   - `GET /coins/markets?vs_currency=usd&category=tokenized-gold&per_page=100`
   - `GET /coins/markets?vs_currency=usd&category=tokenized-silver&per_page=100`
   - `GET /coins/markets?vs_currency=usd&category=tokenized-commodities&per_page=100`

2. Маппинг в type/peg:
   - asset-backed-tokens → type=wrapped
   - liquid-staking → type=lst
   - tokenized-gold → type=commodity, peg=gold
   - tokenized-silver → type=commodity, peg=silver
   - tokenized-commodities → type=commodity, peg=oil (или оставить как есть, проверить содержимое)

3. Дедупликация: при пересечении (монета в нескольких категориях) — приоритет: stable > lst > wrapped > commodity.

4. Запись в coin_registry: DELETE WHERE type IN ('wrapped','lst','commodity'); INSERT.

5. Дополнительно: записать market data в coin_market_cache (UPSERT) для этих монет, чтобы они были в cloud для UI intersection.

### 3.3 Режим registry_fiat

1. Запрос: `GET /coins/markets?vs_currency=usd&category=stablecoins&per_page=250` (или `usd-stablecoin` для только USD).

2. Проблема: CoinGecko не даёт peg (USD/EUR/JPY) в ответе markets. Варианты:
   - Использовать `stablecoins` — все стейблы, peg по умолчанию usd (упрощение)
   - Дополнительный запрос `/coins/{id}` для каждой монеты — дорого
   - Оставить peg=usd для всех из category=stablecoins — приемлемо для старта

3. Запись: DELETE WHERE type = 'stable'; INSERT с peg='usd'.

4. Запись в coin_market_cache для актуальных цен.

### 3.4 Режимы market_cap и volume

Без изменений. Только запись в coin_market_cache (и history).

---

## 4. API Gateway: endpoint /api/coins/registry

### 4.1 Формат ответа

Совместим с `coins-metadata-loader` и `applyMetadata`:

```json
{
  "stable": {
    "fiat": {
      "usd": ["tether", "usd-coin", "dai", ...]
    },
    "commodity": {
      "gold": ["pax-gold", "tether-gold", ...],
      "silver": ["kinesis-silver", ...],
      "oil": [...]
    }
  },
  "wrapped": ["wrapped-bitcoin", "weth", "wbnb", ...],
  "lst": ["liquid-staked-ethereum", "msol", ...],
  "updatedAt": 1234567890
}
```

### 4.2 Реализация

```sql
-- Собрать wrapped, lst
SELECT coin_id FROM coin_registry WHERE type IN ('wrapped','lst') ORDER BY coin_id;

-- Собрать stable.fiat
SELECT peg, array_agg(coin_id ORDER BY coin_id) FROM coin_registry
WHERE type = 'stable' GROUP BY peg;

-- Собрать stable.commodity
SELECT peg, array_agg(coin_id ORDER BY coin_id) FROM coin_registry
WHERE type = 'commodity' GROUP BY peg;
```

Сформировать JSON в формате выше.

---

## 5. Изменения в coins-metadata-loader

### 5.1 Приоритет источников

1. **Первичный:** Если настроен Yandex (PostgreSQL/API) — `GET /api/coins/registry`.
2. **Fallback:** GitHub CDN `a/data/coins.json`.

Проверка «настроен Yandex»: наличие `dataProviderManager.providers['yandex-cache']` и URL API (из workspace-config или postgres-settings).

### 5.2 Алгоритм загрузки

```
1. Если forceRefresh — очистить cache, перейти к 2.
2. Проверить cache (versioned, TTL). Если валидный — applyMetadata, emit, return.
3. Попытка primary (Yandex API):
   - Если URL есть и настроен — fetch /api/coins/registry
   - При 200 и валидной схеме — applyMetadata, cache, emit, return.
4. Fallback: fetch GitHub CDN coins.json
   - При 200 и валидной схеме — applyMetadata, cache, emit, return.
5. При ошибке primary — fallback. При ошибке fallback — stale cache.
6. Если всё упало — return null (built-in fallback в coinsConfig).
```

### 5.3 Формат URL Yandex API

Базовый URL api-gateway: из конфига (например `postgres-settings` или `workspace-config`). Путь: `/api/coins/registry`.

---

## 6. Сохранение UI-контрактов

### 6.1 Критичные точки

| Компонент | Контракт | Как сохранить |
|-----------|----------|---------------|
| coin-set-load-modal-body | registry ∩ cloud | `loadCloudReferenceCoinMap(ids)` — ids из coinsConfig; cloud — yandex-cache.getCoinData. Реестр теперь из cloud API; market-cache должен содержать те же монеты. **Критично:** registry_wlc и registry_fiat должны писать в coin_market_cache, чтобы монеты были в cloud. |
| app-ui-root dropdown | getVisibleCoinType, getVisibleStablecoinPegLabel | coinsConfig.getCoinType, getStablecoinPegLabel — без изменений. Источник данных — loader, формат тот же. |
| coinsConfig | setStablecoins, setWrappedCoins, setLstCoins | applyMetadata вызывает те же методы. Формат данных идентичен. |
| loadAutoSets | registry ids → cloud intersection | Реестр из API; cloudReferenceCoinMap из yandex-cache по ids. Если registry пишет в market-cache — монеты будут в cloud. |

### 6.2 Обязательное условие

**Режимы registry_wlc и registry_fiat должны писать market data в coin_market_cache (UPSERT).** Иначе `registry ∩ cloud` даст пустые множества — монеты есть в реестре, но нет в market-cache.

CoinGecko `/coins/markets?category=X` возвращает те же поля, что и top-250. Можно использовать тот же `insertHistoryCycle` или прямой UPSERT в coin_market_cache. Для registry не нужна history — достаточно обновить main table.

### 6.3 Дедупликация при конфликте

Если монета в `stablecoins` и в `liquid-staking` (например stETH-подобный): приоритет в кроне — `stable > lst > wrapped > commodity`. При записи в coin_registry — последний записанный тип перезаписывает. Порядок обработки: сначала registry_fiat (stable), потом registry_wlc. Тогда при конфликте stable перезапишет lst. Либо: registry_wlc обрабатывает wrapped, lst, commodity; registry_fiat — stable. При конфликте (например монета в liquid-staking и stablecoins) — обрабатывать registry_fiat после registry_wlc, чтобы stable имел приоритет.

---

## 7. Fallback: coins.json на старте

### 7.1 Загрузка при старте

- Loader при старте (или on-demand) сначала пробует Yandex API.
- При недоступности (нет конфига, 4xx, 5xx, network error) — fallback на GitHub.
- `a/data/coins.json` остаётся в репо как fallback. Можно обновлять вручную или оставить последнюю известную версию.

### 7.2 Кэширование

- Cache key тот же: `coins-metadata`.
- Source в emit: `'network'` (Yandex), `'network'` (GitHub fallback), `'cache'`, `'stale-cache'`.

---

## 8. Порядок внедрения

### Этап 1: Инфраструктура (без breaking changes)

1. Создать таблицу `coin_registry` в PostgreSQL (миграция или в api-gateway при первом запросе).
2. Добавить endpoint `GET /api/coins/registry` в api-gateway.
3. При пустой таблице — возвращать `{ stable: { fiat: {}, commodity: {} }, wrapped: [], lst: [], updatedAt: 0 }` (валидная пустая схема).

### Этап 2: Market-fetcher

4. Добавить режимы `registry_wlc` и `registry_fiat` в market-fetcher.
5. Реализовать запросы к CoinGecko по категориям.
6. Реализовать запись в coin_registry и coin_market_cache.
7. Создать два новых триггера (:15, :45) с соответствующими payload.
8. Добавить COINGECKO_API_KEY в env функции (если ещё нет) для лимитов.

### Этап 3: Loader

9. Добавить в coins-metadata-loader логику: primary = Yandex API (если настроен), fallback = GitHub.
10. Определить источник URL API (workspace-config, postgres-settings).
11. Тестирование: с Yandex, без Yandex, при ошибке API.

### Этап 4: Валидация UI

12. Проверить modal Load: Stablecoins, Wrapped, LST — checkbox, счётчики, Add/Replace.
13. Проверить dropdown на счётчике монет: Stablecoins USD, Other, Wrapped, LST.
14. Проверить row badges (тип монеты).
15. Проверить fallback при отключённом Yandex.

### Этап 5: Документация и cleanup

16. Обновить AIS (ais-cache-architecture), causality (#for-curated-wrapped-lst-preservation → заменить на #for-cloud-registry-ssot или аналогичный).
17. Обновить glossary, cache-layer skill.
18. coins-metadata-generator: оставить для ручного обновления GitHub fallback или deprecate.

---

## 9. Риски и митигации

| Риск | Митигация |
|------|-----------|
| CoinGecko rate limit | Задержки между запросами; COINGECKO_API_KEY; при 429 — retry с backoff. |
| Категории CoinGecko меняются | Логировать source_category; при пустом ответе — не очищать таблицу. |
| Пустой registry при первом запуске | Fallback на GitHub. UI работает с built-in defaults. |
| Конфликт stable/lst | Порядок обработки: registry_fiat после registry_wlc. |
| Монеты registry не в market-cache | Обязательно писать в coin_market_cache при registry fetch. |

---

## 10. Откат

- Отключить триггеры registry (:15, :45).
- Loader: закомментировать primary (Yandex), оставить только GitHub.
- Таблицу coin_registry можно оставить (не мешает).

---

## 11. Чеклист перед merge

- [ ] Таблица coin_registry создана
- [ ] Endpoint /api/coins/registry возвращает валидный JSON
- [ ] Market-fetcher режимы registry_wlc, registry_fiat работают
- [ ] Триггеры созданы и вызывают функцию
- [ ] Loader primary/fallback работает
- [ ] Modal Load: все три набора (Stable, Wrapped, LST) показывают монеты
- [ ] Dropdown selection работает
- [ ] Row badges корректны
- [ ] Fallback на GitHub при недоступности Yandex
- [ ] AIS и causality обновлены
