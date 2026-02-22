# План_Integrations_n8n.md

> Категория: План интеграций и n8n
> Статус: Черновик
> Источники: n8n/integrations навыки MBB

---

## 1. Контекст и границы

Контур охватывает внешние интеграции (n8n, API-proxy, OAuth, провайдеры данных),
которые реально нужны MMB после рефакторинга.

## 2. Цели / Non-goals

**Цели:**
- инвентаризировать и отобрать только нужные workflow-интеграции;
- перевести интеграции на SSOT пути/секреты MMB;
- обеспечить проверяемость (timeouts, retry, security boundaries).

**Non-goals:**
- перенос всех workflow MBB «вслепую»;
- интеграции без бизнес-ценности для target MMB.

## 3. Почему этот подход

- selective migration убирает технический долг;
- n8n и внешние API — высокий риск по секретам и drift, нужен контрактный контур;
- ранний re-audit снижает стоимость последующей поддержки.

## 4. Альтернативы

- хранить все интеграции в legacy-контуре MBB и дергать удаленно — отклонено.
- полная замена n8n на custom scripts — отложено до оценки TCO.

## 5. Зависимости

- Upstream: `План_Infrastructure_Docker.md`, `План_Backend_Core.md`
- Downstream: `План_AI_Orchestration.md`, `План_Monitoring.md`, `План_Testing_Strategy.md`

## 6. Риски и снижение

- утечки секретов -> обязательные preflight/security checks.
- нестабильность внешних API -> retry/fallback контракт на каждый критичный endpoint.
- CORS/OAuth проблемы -> отдельные troubleshooting playbooks.

## 7. Definition of Done

- сформирован whitelist интеграций для MMB;
- для каждого workflow есть owner, вход/выход, timeout policy, secret policy;
- критичные интеграции проходят smoke-тесты.

## 8. Чек-лист

- [ ] Провести аудит workflow и внешних интеграций MBB.
- [ ] Составить whitelist/blacklist к переносу.
- [ ] Перенести и адаптировать приоритетные интеграции.
- [ ] Включить мониторинг и тестовые сценарии.
