---
id: readme-7c67c3
status: active
last_updated: "2026-03-04"

---
<!-- Важно: оставлять пустую строку перед "---" ! -->

# coingecko-fetcher — Yandex Cloud Function

Крон-функция: загружает топ-250 монет из CoinGecko в PostgreSQL `coin_market_cache`.

## Что делает

- Каждые **15 минут** запрашивает топ-250 монет по капитализации и топ-250 по объёму
- Сохраняет в таблицу `coin_market_cache` (upsert по `coin_id`)
- Итого: ~350 уникальных монет в кэше (пересечение топов)
- Данные доступны через `app-api` эндпоинт `GET /api/coins/market-cache`

## Параметры

| Параметр | Значение |
|----------|----------|
| Runtime | nodejs18 |
| Memory | 256 MB |
| Timeout | 600s (10 мин) |
| Cron | `0/15 * * * ? *` |
| Чанк | 50 монет × 5 страниц = 250 |
| Задержка | 21s между страницами (публичный API) |

## Переменные окружения

```
DB_HOST=rc1b-dgs1vgc130gbme2n.mdb.yandexcloud.net
DB_PORT=6432
DB_NAME=app_db
DB_USER=app_admin
DB_PASSWORD=<секрет>
COINGECKO_API_KEY=<опционально, Demo/Pro ключ>
```

## Деплой

### Первый деплой (нужен OAuth токен)

1. Получить OAuth токен: https://oauth.yandex.ru/authorize?response_type=token&client_id=1a6990aa636648e9b2ef855fa7bec2fb
2. Скопировать токен из URL (начинается с `y0_Ag...`)
3. Запустить:

```powershell
.\deploy-with-token.ps1 -OAuthToken "y0_AgAAAA..."
```

### Обновление кода (без смены конфига)

```powershell
.\deploy-with-token.ps1 -OAuthToken "y0_AgAAAA..."
```

## Локальный тест

```bash
node test-local.js
```

Загружает 1 страницу (50 монет) и сохраняет в БД.

## Структура таблицы coin_market_cache

```sql
coin_id           VARCHAR(100) PRIMARY KEY
symbol            VARCHAR(20)
name              VARCHAR(200)
image             TEXT
current_price     DECIMAL(20,10)
market_cap        DECIMAL(25,2)
market_cap_rank   INTEGER
total_volume      DECIMAL(25,2)
pv_1h..pv_200d    DECIMAL(10,4)
sort_market_cap   INTEGER  -- позиция в топе по капитализации
sort_volume       INTEGER  -- позиция в топе по объёму
fetched_at        TIMESTAMP WITH TIME ZONE
updated_at        TIMESTAMP WITH TIME ZONE
```

## Использование в app

Провайдер `yandex-cache` доступен в `dataProviderManager`:

```javascript
// Переключиться на Yandex Cache провайдер
await window.dataProviderManager.setProvider('yandex-cache');

// Загрузить топ-250 монет мгновенно (без задержек)
const coins = await window.dataProviderManager.getTopCoins(250);
```

Или через API напрямую:
```
GET https://d5dl2ia43kck6aqb1el5.k1mxzkh0.apigw.yandexcloud.net/api/coins/market-cache?limit=250
GET https://d5dl2ia43kck6aqb1el5.k1mxzkh0.apigw.yandexcloud.net/api/coins/market-cache?ids=bitcoin,ethereum
```
