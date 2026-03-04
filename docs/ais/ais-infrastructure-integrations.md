---
id: ais-775420
status: active
last_updated: "2026-03-02"
related_skills:
  - sk-5cd3c9
  - sk-73dcca
  - sk-d76b68
  - sk-7b4ee5
related_ais:
  - ais-e41384

---

# AIS: Инфраструктура и Внешние Интеграции (Cloudflare, AI, N8N)

<!-- @causality #for-integration-legacy-remediation #for-atomic-remediation #for-docs-ids-gate -->

<!-- Спецификации (AIS) пишутся на русском языке и служат макро-документацией. Микро-правила вынесены в английские скиллы. Скрыто в preview. -->

## Концепция (High-Level Concept)
Так как приложение является статичным (No-Build) и не имеет монолитного бэкенда, вся тяжелая инфраструктурная работа (обход CORS, защита API-ключей, авторизация) вынесена на граничные Serverless-решения (Edge Computing). Мы используем Cloudflare Workers как основной проксирующий слой и D1/KV как серверлесс-базы данных.

## Инфраструктура и Потоки данных (Infrastructure & Data Flow)
- **Cloudflare Workers (CORS Proxy):** Браузеры блокируют кросс-доменные запросы с `file://`. Worker выступает в роли "прокладки", которая добавляет нужные CORS-заголовки и скрывает реальные эндпоинты (CoinGecko, Binance).
- **Yandex Cloud (Geo-оптимизация):** Для пользователей из РФ/СНГ некоторые сервисы (например, YandexGPT или кэши) маршрутизируются через инфраструктуру Яндекса. Ingest/read контуры данных монет (cron fetcher, API Gateway, PostgreSQL) — см. `docs/ais/ais-yandex-cloud.md`.
- **N8N (Рабочие процессы):** Внешние автоматизации (например, сбор новостей или тяжелая агрегация) вынесены в N8N-вебхуки.
- **AI Providers (Абстракция):** В приложении заложен интерфейс `BaseAIProvider` для работы с LLM. Основной провайдер сейчас — YandexGPT (через прокси).

## 3. Локальные Политики (Module Policies)
- **CORS Centralization:** Настройка CORS (в том числе обработка OPTIONS-запросов) должна производиться централизованно на уровне Worker'а, а не размазываться по отдельным HTTP-хэндлерам.
- **Безопасность OAuth на file://:** Так как стандартный OAuth-редирект на `file://` не работает (браузеры запрещают), используется механизм открытия всплывающего окна (`window.open`) с последующей передачей токена обратно через `postMessage`.
- **Запрет на мутацию схемы D1 в рантайме:** Cloudflare D1 (SQLite) схема управляется исключительно через SQL-миграции (`wrangler d1 migrations`). Приложение не имеет права делать `CREATE TABLE` на лету.
- **Отказоустойчивость AI:** `AIProviderManager` должен поддерживать механизм fallback-провайдеров на случай, если основная модель (например, YandexGPT) недоступна или превышен лимит.

## Компоненты и Контракты (Components & Contracts)
- `core/api/cloudflare/*` — клиенты для взаимодействия с Cloudflare Workers.
- `core/api/ai-provider-manager.js` — роутер AI-моделей.
- `is/yandex/` — код серверлесс-функций Яндекса.

## Лог перепривязки путей (Path Rewrite Log)

| Legacy path | Атомарный шаг | Риск | Статус | Новый путь / rationale |
|------------|--------------|------|--------|---------------------------|
| `integrations-cloudflare-core` (legacy donor) | `LIR-002.A1` | Legacy описание вне target структуры | `MAPPED` | `docs/ais/ais-infrastructure-integrations.md` |
| `integrations-cloudflare-plan` (legacy donor) | `LIR-002.A2` | Legacy плановой секции нет в текущей структуре | `MAPPED` | `docs/ais/ais-infrastructure-integrations.md` |
| `integrations-cloudflare-testing` (legacy donor) | `LIR-002.A3` | Legacy тестовый plan неактуален для активного контура | `MAPPED` | `docs/ais/ais-infrastructure-integrations.md` |
