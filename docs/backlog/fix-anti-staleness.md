# Бэклог: Чистка хвостов антиустаревателя (fix-anti-staleness)

> Статус: Отложено
> План: `docs/done/plan-skill-anti-staleness.md` (завершён)
> Приоритет: Низкий

## Описание

При внедрении Фазы 3 (Batch Review) скрипт `validate-dead-links.js` обнаруживал сотни dead links. После доработки фильтров и исключения источников — ~53 ссылки (источники: skills, docs без plans/backlog/done).

## Текущее состояние (после доработки фильтров)

### Dead links (validate-dead-links)

- **Общее число:** ~49 (filtered) / ~262 (--all; было 400, исправлено 138 с 100% уверенностью)
- **Источник:** `npm run skills:batch-review` → `validate-dead-links.js`
- **SSOT конфигурации:** `is/contracts/path-contracts.js` — EXCLUDE_SOURCE_REL, SKIP_LINK_PATTERNS, resolvePath (общий с validate-skills).

**Подтверждение:** только агент через консольные проверки (`validate-dead-links`, `validate-dead-links --json`). Нет ручного шага «подтверждено».

## Реестр dead-links (проект)

- **Файл:** реестр в docs/audits/ (dead-links-registry.jsonl при создании)
- **Формат:** `id`, `source_file`, `line`, `link`, `resolved`, `suggest?`, `status`, `first_detected`, `fixed_at`
- **Индекс по source_file:** для быстрого поиска «есть ли у этого скилла pending-ссылки»
- **Синхронизация:** при занесении в реестр — предпроверка «по битому пути»: не добавлять дубликат, если уже есть запись с тем же `(source_file, line, link)`.

## Задачи для будущей чистки

### Dead links
- [x] **Уточнить фильтры validate-dead-links** — сделано: API, donor, placeholder, exclude sources
- [x] **path-contracts.js** — SSOT для exclusions, skip patterns, resolvePath; validate-skills и validate-dead-links импортируют из контракта
- [ ] **Пройти по списку dead_links** — для каждого: исправить путь, обновить ссылку или пометить как исключение
- [x] **Исправлено (100% уверенность):** core/api/market-contracts.js→core/contracts/market-contracts.js (arch-backend-core, api-layer); skill-пути +.md в plan-skills-migration-registry и plan-skill-anti-staleness (135 замен)
- [ ] **Реестр dead-links-registry** — создать JSONL, индекс по source_file, предпроверка при синхронизации
- [ ] **Обновить Implementation Status** в скиллах — где пути устарели

### Фаза 4 (опционально, из плана)
- [ ] **4.1** Skill → Code индекс — Implementation Status paths → при изменении файла помечать скилл
- [ ] **4.2** Path existence в Core Rules — расширить проверку на Core Rules (эвристика)
- [ ] **4.3** CI integration — GitHub Actions: комментировать PR списком affected skills
- [ ] **4.4** MCP tool — `audit_skill_staleness` для агентов
- [ ] **4.5** #deprecated- in use — validate-causality: warning при использовании #deprecated-X в коде

## Команды

```bash
npm run skills:batch-review          # Общий отчёт (filtered)
node is/scripts/architecture/validate-dead-links.js --json   # Только dead links
node is/scripts/architecture/validate-dead-links.js --all --json   # Полный скан без фильтров
```
