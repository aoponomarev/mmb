# План_Causality_Rationale.md

> Категория: Архитектурный подплан — семантическая сеть причинности
> Статус: **Завершён** (упрощённый подход принят)
> Казуальность: `is/skills/arch-causality.md`

---

## 1. Цель и мотивация

Causality Registry — механизм формализации причин за архитектурными решениями.

## 2. Решение по реализации

Принят **упрощённый подход**: вместо полного machine-readable реестра (с MD5-хешированными ID, булевыми формулами, impact analysis) используется текстовая казуальность в скилах `is/skills/arch-*.md`.

### Что реализовано

- Секция "Architectural Reasoning (Why this way)" в каждом `arch-*.md` скиле.
- Секция "Alternatives Considered" для отклонённых вариантов.
- Паттерн "Active Causality Recording" — при финализации каждого плана его решения извлекаются в скил.

### Что отложено

- Полная структура `skills/causality/registry/` с goals/constraints/composites.
- Машиночитаемые ID формата `G.a1b2.semantic-suffix`.
- Булевые формулы связей (`(G.a1b2 && C.k1l2) || !C.m3n4`).
- Код-якоря `// Causality: GC.x1y2.ssot-paths-contract`.
- `npm run causality:check` валидатор.
- `npm run causality:impact` анализатор.
- Math-домен (`GM.*`, `CM.*`, `GMC.*`).

### Критерий активации полного реестра

Полный реестр оправдан при 30+ скилах или 100+ source-файлах. Текущее состояние (15 скилов, ~20 source files) не достигает этого порога.

---

*Полная казуальность зафиксирована в `is/skills/arch-causality.md`.*
