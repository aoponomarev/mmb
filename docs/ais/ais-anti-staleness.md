---
id: ais-9f4e2d
status: draft
last_updated: "2026-03-01"
related_skills:
  - sk-7d810a
  - sk-d763e7
  - sk-8991cd
  - sk-d6777d
  - sk-d599bd
  - sk-802f3b
related_ais:
  - ais-b7a9ba
  - ais-bfd150

---

# AIS: Антиустареватель скиллов и казуальностей (Skill & Causality Anti-Staleness)

<!-- Спецификации (AIS) пишутся на русском языке и служат макро-документацией. Микро-правила вынесены в английские скиллы. -->
<!-- Этот AIS — образец полноты покрытия: детальное описание всего контура и каждого аспекта. -->
<!-- Схемы Mermaid: вертикальная ориентация (flowchart TD), узлы сверху вниз — читабельность при дефиците ширины экрана. -->

## Концепция (High-Level Concept)

Антиустареватель — трёхуровневая система обнаружения и предотвращения рассинхрона между кодом, скиллами и казуальностями. Когда код меняется, а скилл или formulation хеша остаётся старым, агент действует по неверным правилам — тихий ущерб. Три уровня: (1) Static validation в preflight — path existence, @skill resolution; (2) Change-triggered — git diff → affected skills/hashes; (3) Periodic batch — dead links, stale exceptions.

**Параллельный контур казуальностей:** Один реестр вместо многих скиллов; хеши вместо путей; ghost/stale exception вместо path missing.

## Инфраструктура и Потоки данных (Infrastructure & Data Flow)

### Общая схема контура

Три блока схем расположены вертикально — каждый на всю ширину.

**Уровень 1: Static Validation**

```mermaid
flowchart TB
    P1[preflight.js]
    P1 --> VS[validate-skills.js]
    VS --> VSA[validate-skill-anchors.js]
    VSA --> VC[validate-causality.js]
    VC --> VCI[validate-causality-invariant.js]
```

**Уровень 2: Change-Triggered**

```mermaid
flowchart TB
    PS[preflight-solo.ps1]
    PS --> VAF[validate-affected-skills.js]
    VAF --> OUT[stdout: affected skills + hashes]
```

**Уровень 3: Batch**

```mermaid
flowchart TB
    SBR[skills-batch-review.js]
    SBR --> VDL[validate-dead-links.js]
    SBR --> VCES[validate-causality-exceptions-stale.js]
    SBR --> VS2[validate-skills.js]
```

### Триггеры и точки входа

| Триггер | Команда / событие | Что выполняется |
|---------|-------------------|-----------------|
| Preflight | `npm run preflight` | validate-skills, validate-skill-anchors, validate-causality, validate-causality-invariant |
| Pre-commit flow | `scripts/git/preflight-solo.ps1` | skills:check, skills:affected |
| Batch review | `npm run skills:batch-review` | validate-skills, validate-dead-links, validate-causality-exceptions-stale |

## Локальные Политики (Module Policies)

- **Обязательное документирование в AIS:** После завершения каждой фазы внедрения — добавить в этот документ раздел «Фаза N — как работает» с точным описанием, казуальностью и схемой.
- **Не блокировать change-triggered:** skills:affected выводит список, но не прерывает preflight; решение о коммите — за человеком.
- **Stale exceptions — housekeeping:** validate-causality-exceptions-stale не блокирует preflight; отчёт в batch для ручной очистки.

## Компоненты и Контракты (Components & Contracts)

| Компонент | Путь | Назначение |
|-----------|------|------------|
| validate-skills.js | is/scripts/architecture/ | Path existence в Implementation Status, format, prefix, stale, orphan |
| validate-skill-anchors.js | is/scripts/architecture/ | @skill resolution — каждый @skill ведёт на существующий скилл |
| validate-affected-skills.js | is/scripts/architecture/ | git diff → affected skills и affected hashes |
| validate-dead-links.js | is/scripts/architecture/ | Битые ссылки в skills и docs |
| validate-causality-exceptions-stale.js | is/scripts/architecture/ | Stale exceptions в causality-exceptions.jsonl |
| skills-batch-review.js | is/scripts/architecture/ | Оркестратор batch-проверок |
| preflight-solo.ps1 | scripts/git/ | Pre-commit flow: secrets, skills:check, skills:affected |
| causality-registry.md | is/skills/ | SSOT хешей; ghost/unknown проверяются validate-causality |
| causality-exceptions.jsonl | docs/audits/ | Исключения при частичном удалении хеша (#for-audits-path-contract) |

---

## Фаза 1: Static Validation — как работает

> **Статус:** Реализовано. Фаза 1 завершена.
> **Рекурсия:** При документировании фаз 2 и 3 — проверить, не изменилась ли функциональность фазы 1; при необходимости обновить этот раздел.

### Точное описание

1. **preflight.js** при запуске вызывает (в порядке): `validate-skills.js`, затем `validate-skill-anchors.js`.
2. **validate-skills.js** — парсит секции `## Implementation Status in Target App` / `## Implementation Status` во всех скиллах (is/skills, core/skills, app/skills). Извлекает пути из bullet-списков, таблиц и inline backticks. Проверяет существование каждого пути (относительно ROOT; для коротких имён — поиск в is/scripts/architecture, core, app и др.). При отсутствии пути — error (preflight fail). Для путей в docs/, is/skills/ — warning.
3. **validate-skill-anchors.js** — сканирует core/, app/, is/, shared/, .cursor/rules/ (первые 50 строк каждого .js, .ts, .mdc). Извлекает `@skill <path>`. Проверяет: файл скилла существует (is/skills/, core/skills/, app/skills/). При битой ссылке — error, exit 1.
4. **Условие fail:** Любая ошибка в validate-skills или validate-skill-anchors прерывает preflight.

### Казуальность

- **#for-fail-fast** — preflight падает при первом нарушении; не деградирует в рантайме.
- **#for-gate-enforcement** — path existence и @skill resolution — блокирующие гейты; без них контракт «скилл описывает существующий код» рассыпается.
- **#for-validate-skills-single** — @skill resolution вынесен в отдельный скрипт (validate-skill-anchors), а не в validate-skills; допустимо по arch-testing-ci.

### Схема

```mermaid
flowchart TD
    P[preflight.js]
    P --> VS[validate-skills.js]
    VS --> VSP{paths exist?}
    VSP -->|no| FAIL1[exit 1]
    VSP -->|yes| VSA[validate-skill-anchors.js]
    VSA --> VSA2{all @skill resolve?}
    VSA2 -->|no| FAIL2[exit 1]
    VSA2 -->|yes| PASS[continue preflight]
```

---

## Фаза 2: Change-Triggered Review — как работает

> **Статус:** Реализовано. Фаза 2 завершена.
> **Рекурсия:** При документировании фазы 3 — проверить, не изменилась ли функциональность фазы 2; при необходимости обновить этот раздел и раздел фазы 1.

### Точное описание

1. **preflight-solo.ps1** вызывается вручную перед коммитом (SSOT: arch-testing-ci). Выполняет: проверка, что `.env` не в staged; `npm run skills:check` (блокирует при ошибке); `npm run skills:affected` (информационно, не блокирует).
2. **validate-affected-skills.js** — читает `git diff --cached --name-only`; для каждого staged-файла парсит первые 50 строк: `@skill`, `@causality`, `@skill-anchor`. Собирает affected_skills (скиллы по @skill) и affected_hashes (#for-X из @causality/@skill-anchor). Выводит в stdout или `--json`. Всегда exit 0 (не блокирует).
3. **Условие блокировки:** Только skills:check блокирует; skills:affected — только информирует. Решение о коммите — за человеком.

### Казуальность

- **#for-confidence-by-agent** — skills:affected не блокирует preflight; только человек решает, коммитить сразу или обновить скилл/formulation и затем коммитить.
- **#for-preflight-solo-not-hook** — preflight-solo.ps1 вызывается вручную, а не как git hook; контроль над flow (arch-testing-ci), возможность пропустить при срочных фиксах.

### Схема

```mermaid
flowchart TB
    A[git add]
    A --> B[preflight-solo.ps1]
    B --> C[skills:check]
    C --> D{pass?}
    D -->|no| E[exit 1]
    D -->|yes| F[skills:affected]
    F --> G[stdout: affected skills + hashes]
    G --> H[Решение человека]
```

---

## Фаза 3: Batch Review — как работает

> **Статус:** Заполняется после завершения фазы 3.
> **Рекурсия:** При последующих изменениях контура (фаза 4 и др.) — проверить, не затронули ли они фазы 1–3; при необходимости обновить предыдущие разделы.

### Точное описание

*(После фазы 3: оркестрация, validate-dead-links, validate-causality-exceptions-stale, формат отчёта.)*

### Казуальность

*(После фазы 3: #for-token-efficiency, почему batch не в preflight, housekeeping для stale exceptions.)*

### Схема

*(После фазы 3: Mermaid — skills:batch-review → подскрипты → агрегация → отчёт.)*

---

## Контур казуальностей (отличия от скиллов)

| Аспект | Скиллы | Казуальности |
|--------|--------|--------------|
| Хранилище | is/skills, core/skills, app/skills | causality-registry.md (один файл) |
| Связь с кодом | @skill, Implementation Status | @causality, @skill-anchor |
| Устаревание | Path missing, dead links | Ghost hash, stale exception, formulation outdated |
| Гейты | validate-skills, validate-skill-anchors | validate-causality, validate-causality-invariant |

---

## Ссылки

- План внедрения: `docs/plans/plan-skill-anti-staleness.md`
- arch-skills-mcp, process-skill-governance, process-code-anchors, arch-causality
