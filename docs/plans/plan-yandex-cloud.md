# План_Yandex_Cloud.md

> Категория: Условный legacy-план (Yandex Cloud)
> Статус: Active (contract parity runbook phase), functional migration remains defer-by-demand
> Источник: `A_YANDEX_CLOUD.md`, yandex-* навыки Legacy App

---

## 1. Контекст и позиция

В Legacy App контур Yandex Cloud использовался для части интеграций.
В текущей архитектуре Target App этот контур не является обязательным по умолчанию.

## 2. Решение на текущий этап

- Статус функционального переноса: `defer` (нет подтвержденного целевого сценария в roadmap Target App).
- Статус контрактного паритета: `active` (runbook parity + env contract checks в migration compatibility mode).
- Условие функциональной активации: появление конкретного use-case, который нельзя закрыть текущими интеграциями.

## 3. Что подготовить при активации

- security review (ключи, IAM, boundaries);
- integration contract (timeout/retry/fallback);
- deployment и monitoring контуры;
- update матрицы в `План_Migration_Sync.md`.

## 4. Чек-лист

- [ ] Подтвердить бизнес-необходимость контура.
- [ ] Сформировать ADR по выбору cloud-стека.
- [ ] Определить scope пилота.
- [ ] Зафиксировать runbook parity-контракт (security/runtime/env) на период coexistence.
- [ ] Добавить smoke/e2e контракт проверки для migration compatibility.
- [ ] Подготовить deploy-readiness baseline gate (`cloud:deploy:readiness`) для режимов переключения и публикаций.
