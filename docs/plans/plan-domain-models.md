# План_Domain_Models.md

> Категория: Архитектурный подплан — доменные модели (математика, статистика, финансы)
> Статус: Deferred (defer-until-code)
> Приоритет: P3
> Источники: `План_MBB_to_MMB.md`, `skills/architecture/arch-math-models.md`, `skills/causality/registry/goals/math/`, `skills/causality/registry/constraints/math/`

---

## 1. Цель

Формализовать перенос и развитие доменных моделей (финансовые инструменты, портфельная оптимизация, статистические метрики, risk-scoring) из Legacy App в Target App.

---

## 2. Источники Legacy App

| Документ Legacy App | Содержание | Статус миграции |
|---|---|---|
| `A_MATH_MODELS.md` | Численные методы, стабильность вычислений | defer |
| `A_FIN_EVOLUTION.md` | Эволюция финансовых моделей | defer |
| `A_PORTFOLIO_SYSTEM.md` | Портфельная система (веса, ограничения) | defer |

---

## 3. Causality-факторы (уже заложены)

| Фактор | Домен | Статус |
|---|---|---|
| `GM.a1b2.numerical-stability` | math | draft |
| `GM.c3d4.model-interpretability` | math | draft |
| `CM.a1b2.ieee-754` | math | draft |
| `CM.c3d4.weights-sum-one` | math | draft |

При появлении первого кода — перевести в `active` и создать `GMC.*` composites.

---

## 4. ADR

`skills/architecture/arch-math-models.md` — stub (`status: planned`). Активировать при начале миграции кода.

---

## 5. Чеклист активации

- [ ] Первый файл с математическим кодом перенесён в Target App
- [ ] Causality-факторы `GM.*`/`CM.*` переведены из `draft` → `active`
- [ ] Создан минимум один `GMC.*` composite
- [ ] `arch-math-models.md` → `status: active`
- [ ] `npm run causality:check` проходит
- [ ] Этот документ переведён из `Deferred` → `Active`

---

*Документ создан 2026-02-23. Синхронизировать с `План_MBB_to_MMB.md` и `План_Migration_Sync.md`.*
