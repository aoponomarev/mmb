# План_External_Infrastructure_Parity.md

> Категория: Подплан migration-compatibility для внешних контуров
> Статус: **Завершён** (для текущего этапа миграции)
> Казуальность: `is/skills/arch-external-parity.md`

---

## 1. Контекст и цель

На период миграции требуется попеременная эксплуатация Legacy App и Target App без потери работоспособности внешней инфраструктуры.

## 2. Что реализовано

- **Single-writer guard**: `DATA_PLANE_ACTIVE_APP` — blocking contract в preflight.
- **Env-contract parity**: `.env.example` как SSOT, валидация Zod-схемами.
- **Cache integrity gate**: `npm run cache:integrity:check` + `npm run cache:integrity:delta`.
- **Secret resilience**: encrypted backup/restore chain.
- **Health-check**: трёхплоскостная проверка (knowledge/contract/runtime).
- **Fail-fast policy**: при падении external contract — немедленная блокировка, без fallback.

## 3. Что отложено в бэклог

- Docker split compose (`base + mmb + mbb`) — `План_Infrastructure_Docker.md`.
- Cloudflare runtime parity checks — `План_Cloudflare.md`.
- Yandex Cloud functional migration — `План_Yandex_Cloud.md`.
- `parity:smoke` / `parity:e2e` команды.
- `cloud:deploy:readiness` baseline gate.

## 4. Принцип паритета (сохраняется)

- Паритет на уровне контрактов (env keys, endpoints, timeout/retry/fallback, health checks).
- Допускается различие внутренних реализаций при сохранении эквивалентного внешнего поведения.
- Одновременно активный writer только один: `DATA_PLANE_ACTIVE_APP=TARGET|LEGACY`.

---

*Полная казуальность зафиксирована в `is/skills/arch-external-parity.md`.*
