---
id: ais-9f4e2d
status: active
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

- **Обновление спецификации:** При изменении контура (новые скрипты, смена триггеров) — обновить соответствующий раздел «Уровень N — как работает».
- **Не блокировать change-triggered:** skills:affected выводит список, но не прерывает preflight; решение о коммите — за человеком.
- **Stale exceptions — housekeeping:** validate-causality-exceptions-stale не блокирует preflight; отчёт в batch для ручной очистки.

## Компоненты и Контракты (Components & Contracts)

| Компонент | Путь | Назначение |
|-----------|------|------------|
| path-contracts.js | is/contracts/ | SSOT: EXCLUDE_SOURCE_REL, SKIP_LINK_PATTERNS, SEARCH_DIRS, resolvePath; используют validate-skills и validate-dead-links |
| validate-skills.js | is/scripts/architecture/ | Path existence в Implementation Status, format, prefix, stale, orphan |
| validate-skill-anchors.js | is/scripts/architecture/ | @skill resolution — каждый @skill ведёт на существующий скилл |
| validate-affected-skills.js | is/scripts/architecture/ | git diff → affected skills и affected hashes |
| validate-dead-links.js | is/scripts/architecture/ | Битые ссылки; --all — полный скан без фильтров |
| validate-causality-exceptions-stale.js | is/scripts/architecture/ | Stale exceptions в causality-exceptions.jsonl |
| skills-batch-review.js | is/scripts/architecture/ | Оркестратор batch-проверок |
| preflight-solo.ps1 | scripts/git/ | Pre-commit flow: secrets, skills:check, skills:affected |
| causality-registry.md | is/skills/ | SSOT хешей; ghost/unknown проверяются validate-causality |
| causality-exceptions.jsonl | docs/audits/ | Исключения при частичном удалении хеша (#for-audits-path-contract) |

### Исключения и особые случаи

| Объект | Правило |
|--------|---------|
| `docs/backlog/skills/*` | Не сканируются validate-skills, validate-skill-anchors (backlog вне active skills). Ссылки на backlog из active skills могут указывать на несуществующие пути. |
| `causality-registry.md` | Path existence не парсит (нет Implementation Status). SSOT для хешей. |
| `README.md` | Path existence не требует путей из README; dead links проверяются. |
| `PREFLIGHT_SKIP_CAUSALITY=1` | validate-causality и validate-causality-invariant не выполняются (preflight). |

## Лог перепривязки legacy-ссылок (Path Rewrite Log)

| Legacy path | Атомарный шаг | Риск | Статус | Новый путь / rationale |
|------------|--------------|------|--------|---------------------------|
| `.github/copilot-instructions.md` | `LIR-007.A1` | Legacy context marker недоступен в репо | `MAPPED` | `id:ais-9f4e2d` |
| `/api/logs` | `LIR-007.A2` | HTTP route не file-path | `MAPPED` | API contract note in `id:ais-9f4e2d` |
| `health` | `LIR-007.A3` | legacy route notation в тексте | `MAPPED` | Runtime-only contract in `id:ais-9f4e2d#LIR-007.A3` |
| `A_CLOUDFLARE legacy doc` | `LIR-007.A4` | Исторический внешний путь документа | `DEFERRED` | Перенос в `id:ais-775420` |
| `cloud/cloudflare/workers/migrations/` | `LIR-007.A5` | Различие legacy-структуры и текущего контекста | `MAPPED` | `is/cloudflare/edge-api/migrations` |
| `wrangler.toml` | `LIR-007.A6` | Legacy путь в тексте без домена | `MAPPED` | `is/cloudflare/edge-api/wrangler.toml` |
| `src/auth.js` | `LIR-007.A7` | Legacy относительный путь | `MAPPED` | `is/cloudflare/edge-api/src/auth.js` |
| `SKILL_CANDIDATES.json` | `LIR-007.A8` | Legacy file in current pipeline | `MAPPED` | `id:plan-8d3f5a` + skill lifecycle in `id:ais-9f4e2d` |
| `drafts/tasks/` | `LIR-007.A9` | Legacy state bucket in old lifecycle | `MAPPED` | `id:ais-9f4e2d#LIR-007.A9` |
| `skills/MIGRATION.md` | `LIR-007.A10` | Legacy migration marker | `MAPPED` | `id:ais-9f4e2d#LIR-007.A10` |
| `AI/PRO/mmb` | `LIR-007.A11` | Исторические плановые артефакты | `MAPPED` | `process-ai-collaboration.md` rationale (`id:ais-9f4e2d#LIR-007.A11`) |
| `docs/drafts` (без `/`) | `LIR-012.A1` | Legacy token в rewrite-логах и markdown таблицах | `MAPPED` | Skip-contract in `is/contracts/path-contracts.js` (`SKIP_LINK_PATTERNS`) |
| `core/is/skills/`, `app/is/skills/` | `LIR-012.A2` | Историческая миграционная нотация путей | `MAPPED` | Skip-contract для legacy tokens в `path-contracts.js` |
| `core/skills/everything.md` | `LIR-012.A3` | Нефункциональный placeholder, нужен для исторического трека | `MAPPED` | Skip-contract + canonical rewrite in docs governance AIS |
| `core/config/integration-config.js`, `core/api/integration-manager.js` | `LIR-012.A4` | Известные `REQUIRES_ARCH_CHANGE` ссылки не должны давать шум в dead-link gate | `MAPPED` | Skip-contract для explicit legacy paths |
| `related_skills/related_ais`, `legacy/path`, `docs/...` (TEMPLATE placeholders) | `LIR-012.A5` | Шаблонные токены ошибочно трактуются как реальные пути | `MAPPED` | Skip-contract placeholder patterns in `path-contracts.js` |
| `core/lib-loader.js`, `lib-loader.js`, `zod/v4` | `LIR-013.A1` | Legacy references in governance skill no longer match active loader contract | `MAPPED` | `is/skills/process-lib-governance.md` now points to `core/module-loader.js` and `core/modules-config.js` |
| `Active (skills/)`, `Deprecated (archive/)` lifecycle markers | `LIR-016.A1` | Generic legacy buckets create ambiguous contracts and noisy link semantics | `MAPPED` | Explicit lifecycle paths in `is/skills/arch-skills-mcp.md` (`is/core/app skills` + `docs/backlog/skills/`) |
| `AI/PRO/mmb` (inline legacy plan token) | `LIR-017.A1` | Legacy donor path token inside process guidance creates avoidable path-noise | `MAPPED` | Replaced by neutral “legacy AI migration plans” wording in `process-ai-collaboration.md` |
| `logs/control-plane.log` (inline legacy token) | `LIR-018.A1` | Legacy log filename token in skill narrative adds stale path coupling | `MAPPED` | Replaced with neutral “legacy control-plane event-log marker” wording in `arch-control-plane.md` |
| `node scripts/xyz.js` (generic legacy CLI example) | `LIR-019.A1` | Ambiguous script root path encourages non-SSOT command examples | `MAPPED` | Replaced with explicit `node is/scripts/infrastructure/health-check.js` in MCP ecosystem skill |
| `(см. внешний репозиторий)` donor note in English skill | `LIR-020.A1` | Mixed-language donor marker in active English skill reduces consistency | `MAPPED` | Replaced with English neutral donor-repository wording in collaboration process skill |

---

## Уровень 1: Static Validation — как работает

### Описание

1. **preflight.js** при запуске вызывает (в порядке): `validate-skills.js`, `validate-skill-anchors.js`; при отсутствии `PREFLIGHT_SKIP_CAUSALITY=1` также `validate-causality.js` и `validate-causality-invariant.js`.
2. **validate-skills.js** — парсит секции `## Implementation Status in Target App` / `## Implementation Status` во всех скиллах (is/skills, core/skills, app/skills). Извлекает пути из bullet-списков, таблиц и inline backticks. Проверяет существование каждого пути (относительно ROOT; для коротких имён — поиск в is/scripts/architecture, core, app и др.). При отсутствии пути — error (preflight fail). Для путей в docs/, is/skills/ — warning.
3. **validate-skill-anchors.js** — сканирует core/, app/, is/, shared/, .cursor/rules/ (первые 50 строк каждого .js, .ts, .mdc). Извлекает `@skill <path>`. Проверяет: файл скилла существует (is/skills/, core/skills/, app/skills/). При битой ссылке — error, exit 1.
4. **Условие fail:** Любая ошибка в validate-skills, validate-skill-anchors, validate-causality или validate-causality-invariant прерывает preflight.

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

## Уровень 2: Change-Triggered Review — как работает

### Описание

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

## Уровень 3: Batch Review — как работает

### Описание

1. **skills-batch-review.js** оркестрирует три проверки: validate-skills (--json), validate-dead-links (--json), validate-causality-exceptions-stale (--json).
2. **validate-dead-links.js** — сканирует is/skills, core/skills, app/skills, docs (исключая docs/plans, docs/backlog, docs/done); ищет markdown-ссылки и inline-пути в backticks; пропускает API-пути, donor-пути, placeholder; проверяет существование; выводит dead_links. Флаг `--all` — полный скан без исключений (для аудита 400+ ссылок). Подтверждение «исправлено» — только через повторный запуск (агент).
3. **validate-causality-exceptions-stale.js** — загружает docs/audits/causality-exceptions.jsonl; строит usedHashes из кода и skills; exception считается stale, если hash полностью удалён из кода.
4. **Формат отчёта:** JSON (--json) или текстовый summary. Ни одна проверка не блокирует preflight; batch — периодический аудит.

### Казуальность

- **#for-token-efficiency** — batch-отчёт не в preflight; объёмный вывод только по запросу (npm run skills:batch-review).
- **#for-housekeeping** — stale exceptions не блокируют; исключение уже применено при partial removal; удаление строки — ручная очистка.

### Схема

```mermaid
flowchart TB
    SBR[npm run skills:batch-review]
    SBR --> VS[validate-skills.js]
    SBR --> VDL[validate-dead-links.js]
    SBR --> VCES[validate-causality-exceptions-stale.js]
    VS --> AGG[агрегация отчёта]
    VDL --> AGG
    VCES --> AGG
    AGG --> OUT[summary + dead_links + stale_exceptions]
```

---

## Контур казуальностей (отличия от скиллов)

| Аспект | Скиллы | Казуальности |
|--------|--------|--------------|
| Хранилище | is/skills, core/skills, app/skills | causality-registry.md (один файл) |
| Связь с кодом | @skill, Implementation Status | @causality, @skill-anchor |
| Устаревание | Path missing, dead links | Ghost hash, stale exception, formulation outdated |
| Гейты | validate-skills, validate-skill-anchors | validate-causality, validate-causality-invariant |

---

## Протокол верификации

| Контур | Команда |
|--------|---------|
| Path existence, @skill resolution | `npm run skills:check`, `npm run skills:anchors:check` |
| Affected skills/hashes | `npm run skills:affected` (после git add) |
| Dead links, stale exceptions | `npm run skills:batch-review` |
| Все гейты | `npm run preflight` |

**Порядок:** skills:check → skills:anchors:check → preflight. При ошибке — исправить и повторить.

---

## Антипаттерны

| Антипаттерн | Правильно |
|-------------|-----------|
| Коммитить без проверки affected-skills | Перед коммитом прочитать вывод skills:affected; обновить скилл или отложить осознанно |
| Переименовать файл без обновления Implementation Status | Обновить пути в скилле |
| Добавить @skill без проверки существования файла | Убедиться, что скилл существует |
| Оставить stale exception в causality-exceptions.jsonl | Запустить validate-causality-exceptions-stale; удалить stale строки |
| Менять код с @causality без ревью formulation | Прочитать affected hashes; обновить formulation или удалить хеш |

*(Полный список — `id:done-ec60da`, раздел 14.)*

---

## Ссылки

- План внедрения: `id:done-ec60da` (завершён)
- Бэклог чистки: `id:backlog-2c4b0b` — dead links, опциональные улучшения
- Скиллы: arch-skills-mcp, process-skill-governance, process-code-anchors, arch-testing-ci, arch-causality
