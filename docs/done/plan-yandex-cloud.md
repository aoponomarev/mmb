# План_Yandex_Cloud.md

> Категория: Условный legacy-план (Yandex Cloud)
> Статус: **Бэклог / Отложен** (нет подтверждённого use-case)

---

## Решение

Функциональный перенос контура Yandex Cloud отложен. В текущей архитектуре Target App Yandex Cloud не является обязательным. Yandex-кэш-провайдер (`core/api/data-providers/yandex-cache-provider.js`) добавлен как secondary data source, но полная интеграция (IAM, deployment, monitoring) не реализована.

## Что реализовано

- `.env.example` содержит Yandex Cloud env-ключи.
- Контрактный паритет env-ключей проверяется preflight.
- `yandex-cache-provider.js` — stub для кэшированных данных.

## Что отложено

- Security review (IAM, boundaries).
- Integration contract (timeout/retry/fallback).
- Deployment и monitoring контуры.
- ADR по выбору cloud-стека.
- `cloud:deploy:readiness` gate.

## Условие активации

Появление конкретного use-case, который нельзя закрыть текущими интеграциями (CoinGecko API + local SQLite cache).

---

*Перенесено в бэклог. Не учитывается в % готовности миграции.*
