# План_Rollback.md

> Категория: План отката и восстановления
> Статус: **Завершён**
> Казуальность: `is/skills/arch-rollback.md`

---

## 1. Контекст и границы

Контур определяет, как безопасно откатывать изменения миграции при критичных сбоях.

## 2. Цели / Non-goals

**Цели:**
- установить четкие rollback-триггеры;
- минимизировать downtime и потерю данных;
- синхронизировать rollback с monitoring и testing.

**Non-goals:**
- сложные multi-region DR сценарии;
- автоматический откат всего стека без контроля оператора.

## 3. Почему этот подход

- масштабная миграция без rollback-плана увеличивает риск длительных простоев;
- формальные триггеры снижают эмоциональные решения в инциденте.

## 4. Альтернативы

- rollback «по ситуации» без документа — отклонено.
- полный автоматический rollback любой ошибки — отклонено (слишком много ложных срабатываний).

## 5. Зависимости

- Upstream: `План_Monitoring.md`, `План_Testing_Strategy.md`
- Downstream: `План_MBB_to_MMB.md` (этапы/чекпоинты)

## 6. Риски и снижение

- неполный backup before-change -> mandatory checkpoint policy.
- несогласованный откат между контурами -> rollback order matrix.

## 7. Definition of Done

- есть matrix триггеров rollback;
- есть order-последовательность отката по контурам;
- есть checklist восстановления и post-mortem.

## 8. Чек-лист

- [x] Определить rollback-триггеры (критерии). → `health-check` unhealthy, `cache:integrity:check` fail, `monitoring:baseline` Sev-2+.
- [x] Описать последовательность отката по слоям. → External Integrations → Backend/Transport → Control-plane (by blast radius).
- [x] Ввести checkpoint-before-change правило. → Обязательный `cache:integrity:check` + evidence note перед изменениями secrets/paths/writer.
- [x] Согласовать с мониторингом и master plan. → Триггеры привязаны к командам мониторинга.
- [x] Зафиксировать rollback протокол в runbook:
  - `docs/runbooks/rollback-protocol.md`.
