# План_Monitoring.md

> Категория: План мониторинга и наблюдаемости
> Статус: Черновик
> Источники: `A_MONITORING.md`, diagnostics/troubleshooting навыки Legacy App

---

## 1. Контекст и границы

Контур включает логи, health-checks, preflight diagnostics, инцидентные сигналы и базовые SLO.

## 2. Цели / Non-goals

**Цели:**
- сформировать минимальный observability baseline;
- обеспечить раннее обнаружение сбоев миграции;
- связать мониторинг с rollback и testing контурами.

**Non-goals:**
- полноценный enterprise observability stack на первом шаге;
- глубокая метрика бизнес-показателей до стабилизации runtime.

## 3. Почему этот подход

- без observability миграция большого контура становится непрозрачной;
- preflight и health-checks дешевле, чем постфактум разбор инцидентов.

## 4. Альтернативы

- «мониторинг потом» — отклонено (слишком высокий операционный риск).
- только ручная диагностика — отклонено (невоспроизводимо).

## 5. Зависимости

- Upstream: `План_Infrastructure_Docker.md`, `План_Backend_Core.md`
- Downstream: `План_Testing_Strategy.md`, `План_Rollback.md`

## 6. Риски и снижение

- шумные/неполезные алерты -> минимальный и приоритетный alert set.
- утечки секретов в логах -> redaction policy.
- trend-лог должен содержать только метрики контуров знаний, без PII/секретов.

## 7. Definition of Done

- определен baseline метрик/логов/health-checks;
- есть runbook инцидентов и критерии эскалации;
- связка с rollback-триггерами описана.

## 8. Чек-лист

- [ ] Определить мониторинговый минимум v1.
- [ ] Реализовать минимум диагностических команд:
  - `npm run cp:health` (контроль трех плоскостей),
  - `npm run cp:health:json`,
  - `npm run cp:monitoring:snapshot`,
  - `npm run monitoring:baseline:check`.
- [ ] Настроить redaction-политику логов.
- [ ] Описать runbook инцидентного процесса и linkage с rollback.
  - `docs/runbooks/rollback-mmb-protocol.md`
  - `docs/runbooks/monitoring-baseline.md`
- [ ] Реализовать skill-health trend baseline: `skills:health:trend` + журнал `logs/skills-health-trend.jsonl` с метриками score/stale_rate/orphan_rate.
- [ ] Добавить report-команду для trend: `npm run skills:health:trend:report` (compact summary по последним N записям для еженедельного обзора).
