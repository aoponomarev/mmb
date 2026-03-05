---
id: doc-d5083c
status: active
last_updated: "2026-03-04"

---
<!-- Важно: оставлять пустую строку перед "---" ! -->

# Создание KV Namespace для API Proxy Cache

## Команда для создания KV namespace:

```bash
cd is/cloudflare/edge-api
wrangler kv:namespace create "API_CACHE"
```

## После выполнения команды:

1. Wrangler выведет ID созданного namespace (например: `abc123def456...`)
2. Скопируйте этот ID
3. Откройте `wrangler.toml`
4. Раскомментируйте секцию `[[kv_namespaces]]` для API_CACHE
5. Вставьте полученный ID в поле `id`
6. Сохраните файл

## Пример вывода команды:

```
🌀 Creating namespace with title "app-api-API_CACHE"
✨ Success!
Add the following to your configuration file in your kv_namespaces array:
{ binding = "API_CACHE", id = "abc123def456..." }
```

## Проверка созданных namespaces:

```bash
wrangler kv:namespace list
```

## Удаление namespace (если нужно):

```bash
wrangler kv:namespace delete --namespace-id=<ID>
```
