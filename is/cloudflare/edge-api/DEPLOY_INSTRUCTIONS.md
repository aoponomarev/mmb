---
id: doc-584eb1
status: active
last_updated: "2026-03-04"

---
<!-- Важно: оставлять пустую строку перед "---" ! -->

# Инструкции по деплою Cloudflare Worker с API Proxy

## Шаг 1: Создание KV Namespace

Перед деплоем необходимо создать KV namespace для кэширования API запросов:

```bash
cd is/cloudflare/edge-api
wrangler kv:namespace create "API_CACHE"
```

**Вывод команды будет примерно таким:**
```
🌀 Creating namespace with title "app-api-API_CACHE"
✨ Success!
Add the following to your configuration file in your kv_namespaces array:
{ binding = "API_CACHE", id = "abc123def456..." }
```

**Скопируйте ID namespace** (например, `abc123def456...`)

## Шаг 2: Обновление wrangler.toml

Откройте `is/cloudflare/edge-api/wrangler.toml` и найдите секцию:

```toml
# KV хранилище для кэширования API запросов (CoinGecko, Yahoo Finance, Stooq и т.д.)
# ВАЖНО: Создайте namespace командой: wrangler kv:namespace create "API_CACHE"
# После создания раскомментируйте строки ниже и вставьте полученный ID
# [[kv_namespaces]]
# binding = "API_CACHE"
# id = "YOUR_KV_NAMESPACE_ID_HERE"
```

**Раскомментируйте** и **вставьте полученный ID**:

```toml
# KV хранилище для кэширования API запросов (CoinGecko, Yahoo Finance, Stooq и т.д.)
[[kv_namespaces]]
binding = "API_CACHE"
id = "abc123def456..."  # Вставьте ваш ID здесь
```

## Шаг 3: Деплой Worker

```bash
cd is/cloudflare/edge-api
wrangler deploy
```

**Вывод команды:**
```
Total Upload: XX.XX KiB / gzip: XX.XX KiB
Uploaded app-api (X.XX sec)
Published app-api (X.XX sec)
  https://app-api.ponomarev-ux.workers.dev
Current Deployment ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

## Шаг 4: Проверка работоспособности

### Health Check

```bash
curl https://app-api.ponomarev-ux.workers.dev/health
```

**Ожидаемый ответ:**
```json
{
  "status": "ok",
  "service": "app Dataset Integration API",
  "version": "1.0.0",
  "timestamp": "2026-01-11T..."
}
```

### Тест CoinGecko Proxy

```bash
curl "https://app-api.ponomarev-ux.workers.dev/api/coingecko/global"
```

**Ожидаемый ответ:** JSON с глобальными метриками CoinGecko (BTC Dominance и т.д.)

**Headers:**
- `X-Cache: MISS` (первый запрос)
- `X-Cache: HIT` (повторный запрос в течение TTL)

### Тест Yahoo Finance Proxy (VIX)

```bash
curl "https://app-api.ponomarev-ux.workers.dev/api/yahoo-finance/v8/finance/chart/%5EVIX?interval=1d&range=1d"
```

**Ожидаемый ответ:** JSON с данными VIX от Yahoo Finance

### Тест Stooq Proxy (VIX)

```bash
curl "https://app-api.ponomarev-ux.workers.dev/api/stooq/q/d/l/?s=%5Evix&i=d"
```

**Ожидаемый ответ:** CSV данные VIX от Stooq

## Шаг 5: Проверка в приложении

1. Откройте приложение через `file://` протокол:
   ```
   [Project Root]/index.html
   ```

2. Откройте DevTools (F12) → Console

3. Нажмите кнопку **"Обновить данные монет"**

4. Проверьте логи в консоли:
   - Должны отсутствовать CORS ошибки
   - Запросы к CoinGecko должны идти через `https://app-api.ponomarev-ux.workers.dev/api/coingecko/*`
   - Запросы к Yahoo Finance/Stooq должны идти через соответствующие proxy endpoints

5. Проверьте таблицу монет:
   - Монеты должны загрузиться корректно
   - VIX и BTC Dominance должны обновиться

## Мониторинг

### Просмотр логов Worker

```bash
wrangler tail
```

### Проверка KV namespace

```bash
# Список всех ключей
wrangler kv:key list --binding=API_CACHE

# Получить значение ключа
wrangler kv:key get "api-cache:coingecko:/global" --binding=API_CACHE
```

### Очистка кэша (если нужно)

```bash
# Удалить конкретный ключ
wrangler kv:key delete "api-cache:coingecko:/global" --binding=API_CACHE

# Удалить все ключи (осторожно!)
wrangler kv:key list --binding=API_CACHE | jq -r '.[].name' | xargs -I {} wrangler kv:key delete "{}" --binding=API_CACHE
```

## Troubleshooting

### Ошибка: "binding API_CACHE not found"

**Причина:** KV namespace не создан или не привязан в `wrangler.toml`

**Решение:**
1. Создайте namespace: `wrangler kv:namespace create "API_CACHE"`
2. Обновите `wrangler.toml` с полученным ID
3. Задеплойте заново: `wrangler deploy`

### Ошибка: "CORS policy" в браузере

**Причина:** Приложение запущено на `file://`, но Worker не отвечает или недоступен

**Решение:**
1. Проверьте, что Worker задеплоен: `curl https://app-api.ponomarev-ux.workers.dev/health`
2. Проверьте, что `cloudflare-config.js` загружен в браузере
3. Проверьте логи Worker: `wrangler tail`

### Ошибка 429 (Too Many Requests) от CoinGecko

**Причина:** Превышен rate limit CoinGecko

**Решение:**
- KV кэш должен снизить количество запросов к CoinGecko
- Проверьте, что кэш работает: `wrangler kv:key list --binding=API_CACHE`
- Увеличьте TTL в `is/cloudflare/edge-api/src/api-proxy.js` (если нужно)

## Дополнительная информация

- **Документация:** `docs/ais/ais-infrastructure-integrations.md` (AIS-сводка).  
  Legacy donor: `docs/ais/ais-infrastructure-integrations.md#LIR-002.A1`
- **Конфигурация:** `core/config/cloudflare-config.js`
- **Исходный код Worker:** `is/cloudflare/edge-api/src/api-proxy.js`
