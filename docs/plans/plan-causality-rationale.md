# План_Causality_Rationale.md

> Категория: Архитектурный подплан — семантическая сеть причинности
> Статус: Active (базовый контур внедрён)
> Приоритет: P1
> Источники: `План_MBB_to_MMB.md`, `skills/meta/causality-registry-governance.md`, `skills/meta/code-anchor-protocol.md`

---

## 1. Цель и мотивация

Causality Registry — машиночитаемая семантическая сеть, формализующая **причины** за каждым архитектурным решением в коде.

Превращает:
- текстовые комментарии → логические формулы
- ADR-документы → граф факторов с проверяемыми ID
- ручной code review → автоматический impact analysis при изменении целей/ограничений

Особая ценность:
- Для AI-агентов: агент видит `Causality: GC.x1y2.ssot-paths-contract` и **точно знает** что нельзя менять в этом блоке кода
- Для миграции Legacy App→Target App: код переносится только с якорями — противоречия разруливаются немедленно
- Для матмоделей: математические ограничения (IEEE-754, budget constraint) формализованы заранее

---

## 2. Доменное разделение

| Домен | Префиксы | Область |
|---|---|---|
| App | `G.*`, `C.*`, `GC.*` | Продуктовые цели, инфра-ограничения, composites |
| Math | `GM.*`, `CM.*`, `GMC.*` | Математические цели, физ./численные ограничения |

Cross-domain composites (смешанные формулы) разрешены в `composites/`.

---

## 3. Структура реестра

```
skills/causality/
├── registry/
│   ├── goals/app/          G.xxxx.*  — продуктовые/системные цели
│   ├── goals/math/         GM.xxxx.* — цели математических моделей
│   ├── constraints/app/    C.xxxx.*  — технические/инфра-ограничения
│   └── constraints/math/   CM.xxxx.* — математические/физические ограничения
└── composites/
    ├── app/                GC.xxxx.* — составные формулы (app)
    └── math/               GMC.xxxx.* — составные формулы (math)
```

ID-формат: `<type>.<4-char-hash>.<semantic-suffix>`
- Хэш: первые 4 символа MD5 от `type + ": " + statement` — **неизменяем навсегда**
- Суффикс: читаемый ярлык для человека — может быть обновлён

---

## 4. Синтаксис формул

```
(G.a1b2.single-source && C.k1l2.no-env-outside-ssot) || !C.m3n4.docker-win-path-boundary
```

- `&&` — оба фактора должны соблюдаться
- `||` — хотя бы один
- `!` — фактор явно нарушается (инициированный обход с обоснованием)

---

## 5. Код-якоря (Anchors)

### В JS/TS файлах (заголовок файла)
```javascript
/**
 * Skill: architecture/arch-ssot-governance
 * Causality: GC.x1y2.ssot-paths-contract
 * Formula: (G.a1b2.single-source && C.k1l2.no-env-outside-ssot) && C.m3n4.docker-win-path-boundary
 */
```

### Инлайн (risk branch)
```javascript
// Causality: C.m3n4.docker-win-path-boundary
const isDocker = process.platform !== "win32" && fsSync.existsSync("/.dockerenv");
```

### В ADR-скилах (опционально, секция)
```markdown
## Governing Factors
- Rationale: `GC.x1y2.ssot-paths-contract`
- Formula: `(G.a1b2.single-source && G.c3d4.auto-sync-docs) && C.k1l2.no-env-outside-ssot`
```

---

## 6. Инструменты

| Команда | Действие |
|---|---|
| `npm run causality:check` | Валидация реестра + проверка всех anchor-ссылок в коде |
| `npm run causality:impact -- --factor G.a1b2.single-source` | Impact analysis: composites + code + ADR skills |

---

## 7. Обязательность при миграции Legacy App→Target App

**КРИТИЧНОЕ ПРАВИЛО:** Любой код, мигрируемый из Legacy App, обязан пройти полный checklist до первого коммита:

- [ ] Файл имеет `* Skill:` + `* Causality:` в JSDoc-заголовке
- [ ] Все risk branches промаркированы `// Causality: <id>`
- [ ] Код проверен против активных Causality-constraints
- [ ] Нарушения (require, process.env, хардкод путей) — исправлены, не скопированы
- [ ] `npm run causality:check` проходит без ошибок

Governance: `meta/code-anchor-protocol`, composite `GC.e7f8.migration-safety`

---

## 8. Масштабирование на математические модели

Math-домен (`GM.*`, `CM.*`, `GMC.*`) запущен в режиме `draft`. Активируется при появлении первого кода с матмоделями.

Уже заложены:
- `GM.a1b2.numerical-stability` — стабильность и воспроизводимость численных вычислений
- `GM.c3d4.model-interpretability` — объяснимость результатов модели
- `CM.a1b2.ieee-754` — ограничения IEEE 754 double precision
- `CM.c3d4.weights-sum-one` — бюджетное ограничение портфельных весов

При создании первой математической модели:
1. Активировать `draft` → `active` для применимых GM/CM факторов
2. Создать `GMC.*` composite для домена модели
3. Добавить якоря в файл модели
4. Связать с `arch-math-models.md` (pending, из MIGRATION.md)

---

## 9. Чеклист внедрения

### P0 (сделано — базовый контур)
- [ ] Структура `skills/causality/` создана
- [ ] 5 атомарных Goals (app): `G.a1b2`, `G.c3d4`, `G.e5f6`, `G.g7h8`, `G.i9j0`
- [ ] 5 атомарных Constraints (app): `C.k1l2`, `C.m3n4`, `C.o5p6`, `C.q7r8`, `C.s9t0`
- [ ] 4 composites (app): `GC.x1y2`, `GC.a3b4`, `GC.c5d6`, `GC.e7f8`
- [ ] 4 math факторов (draft): `GM.a1b2`, `GM.c3d4`, `CM.a1b2`, `CM.c3d4`
- [ ] Governance skills: `causality-registry-governance`, `code-anchor-protocol`
- [ ] Validator: `scripts/architecture/validate-causality.js` (`causality:check` + `causality:impact`)
- [ ] Якоря добавлены в core-файлы: `paths.js`, `mcp/skills-mcp/server.js`, `validate-ssot.js`, `validate-env-example.js`
- [ ] `skills:health:check` и `skills:graph:check` исключают `causality/` (своя система валидации)
- [ ] Требование маркировки добавлено в `skills/MIGRATION.md`

### P1 (следующий этап)
- [ ] Добавить якоря во все оставшиеся скрипты (`validate-symlinks.js`, `validate-skill-graph.js`, `validate-skills-health.js`, `generate-*.js`)
- [ ] Добавить `## Governing Factors` в существующие `arch-*` ADR-скилы
- [ ] Добавить `causality:check` в preflight (до коммита)
- [ ] Расширить `generate-skills-index.js` для включения causality-факторов в `skills/index.md`

### P2 (math layer)
- [ ] Активировать math-факторы при появлении первой модели
- [ ] Создать `arch-math-models.md` ADR skill
- [ ] Создать `GMC.*` composites для финансовых моделей

### P3 (full autonomy)
- [ ] Добавить causality impact в CI/CD pipeline
- [ ] Автогенерация impact report при PR с изменением causality-файлов

---

*Документ создан 2026-02-22. Синхронизировать с `План_MBB_to_MMB.md` и `План_Migration_Sync.md`.*
