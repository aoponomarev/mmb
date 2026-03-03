# Бэклог: Чистка хвостов антиустаревателя (fix-anti-staleness)

> Статус: Отложено
> План: `docs/done/plan-skill-anti-staleness.md` (завершён)
> Приоритет: Низкий

## Описание

При внедрении Фазы 3 (Batch Review) скрипт `validate-dead-links.js` обнаружил **394 потенциальных dead links** в skills и docs. Часть может быть ложными срабатываниями (API-ссылки, placeholder-пути). Требуется ручная вычистка.

## Найденные проблемы

### Dead links (validate-dead-links)

- **Общее число:** 394
- **Источник:** `npm run skills:batch-review` → `validate-dead-links.js`
- **Диапазоны:** is/skills, core/skills, app/skills, docs

**Примеры (первые 10):**
- `is/skills/arch-backend-core.md:79` — core/api/market-contracts.js
- `is/skills/arch-cloudflare-infrastructure.md` — src/auth.js, /api/proxy, docs/A_CLOUDFLARE.md
- `is/skills/arch-foundation.md` — shared/component, shared/utility
- и др.

## Задачи для будущей чистки

### Dead links
- [ ] **Уточнить фильтры validate-dead-links** — исключить API-пути (/api/..., /health), placeholder (src/..., cloud/...), если не указывают на реальные файлы
- [ ] **Пройти по списку dead_links** — для каждого: исправить путь, обновить ссылку или пометить как исключение
- [ ] **Обновить Implementation Status** в скиллах — где пути устарели

### Фаза 4 (опционально, из плана)
- [ ] **4.1** Skill → Code индекс — Implementation Status paths → при изменении файла помечать скилл
- [ ] **4.2** Path existence в Core Rules — расширить проверку на Core Rules (эвристика)
- [ ] **4.3** CI integration — GitHub Actions: комментировать PR списком affected skills
- [ ] **4.4** MCP tool — `audit_skill_staleness` для агентов
- [ ] **4.5** #deprecated- in use — validate-causality: warning при использовании #deprecated-X в коде

## Команды

```bash
npm run skills:batch-review          # Общий отчёт
node is/scripts/architecture/validate-dead-links.js --json   # Только dead links
```
