# План_GitHub_Workspace.md

> Категория: План GitHub automation/workspace
> Статус: Черновик
> Источники: `A_GITHUB_WORKSPACE.md`, `A_GITHUB_HYBRID_BEACON.md`, git/process навыки Legacy App

---

## 1. Контекст и границы

Контур описывает автоматизацию через GitHub (workflow, checks, release discipline),
не затрагивая runtime-логику приложения.

## 2. Цели / Non-goals

**Цели:**
- определить минимальный reliable automation набор;
- снизить ручные ошибки в миграции через стандартизированные проверки;
- подготовить путь к безопасной CI эволюции.

**Non-goals:**
- перенос всех исторических GitHub сценариев Legacy App без переоценки;
- усложнение CI на старте до enterprise уровня.

## 3. Почему этот подход

- migration-at-scale требует формальных gates на PR/commit уровне;
- автоматизация должна быть сначала простой и устойчивой, затем расширяемой.

## 4. Альтернативы

- жить только локальными проверками — отклонено (высокий риск человеческих ошибок).
- мгновенно вводить сложный multi-stage CI — отложено до стабилизации baseline.

## 5. Зависимости

- Upstream: `План_Migration_Sync.md`, `План_Testing_Strategy.md`
- Downstream: `План_Rollback.md`, `План_Monitoring.md`

## 6. Риски и снижение

- flaky checks -> минимальный deterministic набор gate-проверок.
- длинный feedback loop -> разделение быстрых и тяжелых проверок.

## 7. Definition of Done

- определен workflow baseline (lint/test/validators);
- есть policy обязательных проверок перед merge;
- release/checklist автоматизация покрывает критичные контуры.

## 8. Чек-лист

- [x] Инвентаризация GitHub automation практик Legacy App.
- [x] Проектирование минимального CI baseline для Target App.
- [x] Связка с SSOT/skills валидаторами (выполняется через `preflight`).
- [x] Описание release-checklist и ownership (упрощено на первом этапе).

### Реализация в инфраструктуре

- `.github/workflows/ci.yml` — минимальный автоматический gate:
  - запуск `preflight` (Health, Contracts, Lints),
  - запуск полного test suite (`npm run test`),
  - используется dummy `.env` для CI-сборки.
