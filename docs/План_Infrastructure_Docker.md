# План_Infrastructure_Docker.md

> Категория: План инфраструктуры и контейнеризации
> Статус: Черновик
> Источники: `A_INFRASTRUCTURE.md`, docker/process/troubleshooting навыки MBB

---

## 1. Контекст и границы

Контур описывает runtime-инфраструктуру MMB: локальный запуск, Docker, compose, volume-модель, path-contracts и окружение.

## 2. Цели / Non-goals

**Цели:**
- определить целевой `docker-compose` профиль для MMB;
- закрепить путь-контракты между host и container;
- снизить риск «works-on-my-machine» расхождений.

**Non-goals:**
- production orchestration (k8s/cluster) на данном этапе;
- миграция всех legacy образов MBB без переоценки необходимости.

## 3. Почему этот подход

- **Compose-first:** быстрее проверять зависимости контуров на одной машине.
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

- Рабочий compose baseline и документация профилей.
- Валидированы ключевые mount-пути и env-injection.
- Есть runbook на диагностику проблем контейнеров.

## 8. Чек-лист

- [ ] Зафиксировать целевую схему сервисов и профилей compose.
- [ ] Описать путь-контракты host/container.
- [ ] Подготовить preflight для docker-layer.
- [ ] Добавить диагностический runbook и критерии rollback.
