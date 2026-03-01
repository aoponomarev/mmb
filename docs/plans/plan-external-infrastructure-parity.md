# План_External_Infrastructure_Parity.md

> Категория: Подплан migration-compatibility для внешних контуров
> Статус: Active (период миграции)
> Источники: `План_MBB_to_MMB.md`, `План_Infrastructure_Docker.md`, `План_Cloudflare.md`, `План_Yandex_Cloud.md`

---

## 1. Контекст и цель

На период миграции требуется попеременная эксплуатация Legacy App и Target App без потери работоспособности внешней инфраструктуры.
Фокус плана: паритет контрактов между двумя версиями для Docker/Cloudflare/Yandex Cloud и иных внешних провайдеров.

## 2. Границы и принцип паритета

- Паритет требуется на уровне контрактов (env keys, endpoints/routes, timeout/retry/fallback, health checks, deployment runbook).
- Допускается различие внутренних реализаций при сохранении эквивалентного внешнего поведения.
- Секреты и ключи ведутся только через `.env`-контур, без хранения реальных значений в репозитории.
- В контур защиты входят не только ключи, но и чувствительная инфраструктурная мета-конфигурация (root paths, base URLs, active writer selector, critical contract flags).
- Принята стратегия `functional parity`: переносим суть поведения, не копируем legacy-проблемы Legacy App.
- Инвариант shared datasets: **гонок нет** — Legacy App/Target App работают с общими Cloudflare/Yandex данными только в time-separated режиме.
- До завершения миграции действует fail-fast policy: при падении Cloudflare/external critical contract шаг считается неуспешным, fallback-цепочки не используются.

## 3. Двунаправленный протокол синхронизации

1. Изменение в Legacy App внешнего контура -> обязательная проверка и отражение в Target App.
2. Изменение в Target App внешнего контура -> обязательная сверка с действующим Legacy App-контуром только по внешним контрактам (env/api/retry/timeout/fallback/health), без требования внутреннего 1:1 соответствия реализации.
3. Любое изменение статуса фиксируется в `План_Migration_Sync.md`.
4. Отклонения допустимы только через явное решение `changed/replaced` с обоснованием.
5. Одновременно активный writer только один: `DATA_PLANE_ACTIVE_APP=Legacy App|Target App`.
6. Временные отступления от целевой архитектуры Target App допускаются только как `temporary-deviation` с дедлайном и обязательным возвратом к целостности `skills/causality`.

## 4. Риски

- Drift конфигов и контрактов между Legacy App/Target App.
- Разъезд env-ключей и runtime переменных.
- Различия в retry/timeout/fallback, создающие непредсказуемые инциденты.
- Двойная операционная нагрузка и риск несинхронных релизов.

## 5. Снижение рисков

- Единый контроль через process-скил `process-external-parity-sync-governance`.
- Регулярная сверка активных внешних ключей и контрактов по чек-листу.
- Обязательная синхронизация статусов между `План_MBB_to_MMB.md` и `План_Migration_Sync.md`.
- Перед выходом из compatibility mode: подтверждение паритета и зафиксированный `replaced` для legacy-контура.
- Runtime parity проверяется техническим контуром `parity:smoke`/`parity:e2e`; на этапе P0 действует soft-gate (warn-only).
- Отдельный cache integrity gate проверяет recovery-цепочку секретов и целостность чувствительных инфраструктурных ключей.

## 6. Definition of Done

- Контурные ключи и контракты внешней инфраструктуры синхронизированы в обе стороны.
- Нет критичных несовпадений для активных провайдеров.
- Для каждого провайдера определен статус: `continue`, `changed`, `replaced`, `defer`.
- План синхронизирован с мастер-планом и `План_Migration_Sync.md`.

## 7. Чек-лист

- [ ] Зафиксировать список активных внешних контуров для периода миграции.
- [ ] Сверить API-ключи и env-контракты Legacy App↔Target App (без раскрытия секретов); перенос активных ключей в Target App выполнен.
- [ ] Проверить работоспособность Cloudflare key-pair (`token + account`) через API verify/accounts endpoint.
- [ ] Зафиксировать пост-переносный режим отслеживания по датам изменения `.env`/`.env.example` в обеих ветках.
- [ ] Сверить deployment baseline для Docker: split compose (`base + mmb + mbb`) и проверка `parity:smoke`.
- [ ] Подтвердить одновременный runtime (`mmb-runtime` + `n8n-mbb`) через консольный `docker ps` и `parity:e2e`.
- [ ] Сверить Cloudflare/Yandex Cloud runbook контракты (parity runbook phase).
- [ ] Ввести отдельный cache integrity gate для секретов и чувствительной infra-мета-конфигурации (`cache:integrity:check`).
- [ ] Внести статусы `continue/changed/replaced/defer` в `План_Migration_Sync.md`.
- [ ] Обновить мастер-план после существенной синхронизации.

## 8. Gate mode progression

- P0: soft-gate (warn-only) — завершён.
- P1: hybrid-gate — активен:
  - критичные ошибки external parity блокируют preflight;
  - для Cloudflare требуется минимум один target identifier: `CLOUDFLARE_ZONE_ID` или `CLOUDFLARE_D1_DATABASE_ID`.
