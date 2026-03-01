# План_Infrastructure_Docker.md

> Категория: План инфраструктуры и контейнеризации
> Статус: Active (P0 Runtime Parity baseline implemented)
> Источники: `A_INFRASTRUCTURE.md`, docker/process/troubleshooting навыки Legacy App

---

## 1. Контекст и границы

Контур описывает runtime-инфраструктуру Target App: локальный запуск, Docker, compose, volume-модель, path-contracts и окружение.

## 2. Цели / Non-goals

**Цели:**
- определить целевые split-профили `docker-compose` для migration compatibility (`base + mmb + mbb`);
- закрепить путь-контракты между host и container;
- снизить риск «works-on-my-machine» расхождений.

**Non-goals:**
- production orchestration (k8s/cluster) на данном этапе;
- миграция всех legacy образов Legacy App без переоценки необходимости.

## 3. Почему этот подход

- **Split compose strategy:** изоляция Legacy App/Target App контуров снижает риск взаимных поломок и упрощает независимое развитие Target App.
- **SSOT путей через `paths.js` + `.env`:** единые host-корни и прозрачные docker-монты.
- **Ограниченный baseline:** сначала минимальный стабильный набор сервисов.

## 4. Альтернативы

- Полный ручной запуск без контейнеров — отклонено (низкая воспроизводимость).
- Полный re-platform в облако сразу — отклонено (ранняя оптимизация).

## 5. Зависимости

- Upstream: `План_Migration_Sync.md`, `План_Skills_MCP.md`
- Downstream: `План_Control_Plane.md`, `План_Backend_Core.md`, `План_Integrations_n8n.md`

## 6. Риски и снижение

- drift между host paths и container mounts -> обязательные preflight проверки.
- конфликты портов и volumes -> отдельный diagnostics checklist.
- docker-regression -> фиксируем baseline версии и rollback процедуру.

## 7. Definition of Done

- Рабочий split compose baseline (`docker-compose.base.yml`, `docker-compose.mmb.yml`, `docker-compose.mbb.yml`) и документация профилей.
- Одновременный runtime для периода миграции: `Legacy App` и `Target App` контейнеры поднимаются параллельно без конфликтов портов.
- Валидированы ключевые mount-пути и env-injection.
- Есть runbook на диагностику проблем контейнеров.
- Есть smoke/e2e parity-проверка и soft-gate P0 в preflight.

## 8. Чек-лист

- [ ] Зафиксировать целевую split-схему сервисов и профилей compose.
- [ ] Описать путь-контракты host/container.
- [ ] Подготовить preflight для docker-layer (soft-gate P0).
- [ ] Добавить диагностический runbook и критерии rollback.
- [ ] Добавить parity smoke/e2e команды (`parity:smoke`, `parity:e2e`).
- [ ] Поднять постоянный `mmb` runtime сервис и подтвердить co-existence с `mbb` контейнером.
