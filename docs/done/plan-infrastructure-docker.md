# План_Infrastructure_Docker.md

> Категория: План инфраструктуры и контейнеризации
> Статус: **Бэклог** (перенесено решением от 2026-03)

---

## Решение

Настройка split-контуров Docker (`docker-compose.base.yml` + `docker-compose.mmb.yml` + `docker-compose.mbb.yml`) перенесена в отдалённый бэклог. Текущий функционал Target App работает без Docker (локальный Node.js runtime, `file://` для фронтенда, GitHub Pages для деплоя).

## Что реализовано из плана

- Path-contracts host/container через `is/contracts/paths/paths.js`.
- Preflight проверки env/paths.
- Single-writer guard (`DATA_PLANE_ACTIVE_APP`).

## Что отложено

- Split compose baseline.
- Одновременный runtime Legacy App + Target App в Docker.
- Parity smoke/e2e команды.
- Docker-specific diagnostics runbook.

## Условие активации

Потребуется при развертывании multi-service среды или CI/CD с Docker.

---

*Перенесено в бэклог. Не учитывается в % готовности миграции.*
