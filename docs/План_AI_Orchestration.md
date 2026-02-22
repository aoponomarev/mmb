# План_AI_Orchestration.md

> Категория: План AI-оркестрации
> Статус: Черновик
> Источники: `A_AI_ORCHESTRATION.md`, LLM/MCP/Continue интеграции MBB

---

## 1. Контекст и границы

Контур включает выбор и оркестрацию LLM-провайдеров, MCP-взаимодействие и fallback-политику.
Не включает UI-слой и доменную бизнес-логику.

## 2. Цели / Non-goals

**Цели:**
- собрать единый контракт использования моделей и провайдеров;
- стандартизовать timeout/fallback/retry;
- отделить vendor-specific настройки от общего orchestration слоя.

**Non-goals:**
- тюнинг качества моделей под все задачи на старте;
- перенос всех исторических провайдеров MBB без re-evaluation.

## 3. Почему этот подход

- multi-provider orchestration без единого контракта быстро деградирует;
- failover стратегия снижает риск остановки разработки при проблемах у одного API;
- явные policy проще автоматизировать тестами.

## 4. Альтернативы

- один провайдер без fallback — отклонено (single point of failure).
- полный vendor abstraction слой сразу — отложено до стабилизации v1.

## 5. Зависимости

- Upstream: `План_Integrations_n8n.md`, `План_Control_Plane.md`, `План_Skills_MCP.md`
- Downstream: `План_Monitoring.md`, `План_Testing_Strategy.md`

## 6. Риски и снижение

- rate limits / outages -> provider failover и graceful degradation.
- несогласованность model configs -> единый config contract + validation.
- drift в промпт-протоколах -> versioned prompt registry.

## 7. Definition of Done

- описан и принят orchestration contract v1;
- настроены fallback/timeout правила для критичных сценариев;
- есть smoke/chaos сценарии на отказ провайдера.

## 8. Чек-лист

- [ ] Аудит текущих AI-интеграций MBB.
- [ ] Определение минимального provider-set для MMB.
- [ ] Формализация fallback/timeout/retry контракта.
- [ ] Включение проверок в test/monitoring контуры.
