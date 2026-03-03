# План: Антиустареватель скиллов (Skill Anti-Staleness)

> **Категория**: План внедрения
> **Дата**: 2026-03-01
> **Связанные скиллы**: `arch-skills-mcp`, `process-skill-governance`, `process-code-anchors`, `arch-testing-ci`, `arch-causality`, `process-causality-harvesting`
> **Цель**: Систематическое обнаружение и предотвращение устаревания скиллов относительно кода и архитектуры.
> **AIS-спецификация**: `docs/ais/ais-anti-staleness.md` — образец полноты покрытия; после каждой фазы дополнять разделами «как работает» + казуальность + схема.
> **Аналогия**: По образцу `plan-skills-migration-registry` — регламенты, чеклисты, верификация, антипаттерны, итеративное улучшение.

**ИИ-агент:** При обнаружении недостатка в протоколах — дополнить документ. Согласование не требуется.

**При критически важных сомнениях** — задавать наводящие вопросы пользователю в чате, чтобы не прерывать процесс внедрения. Не останавливаться «в тупике»; уточнить и продолжить.

---

## 1. Резюме

### Проблема

Когда код или архитектура меняется, а скилл остаётся старым, действия агента по устаревшим правилам приносят ущерб вместо пользы. Текущие механизмы (stale 90 дней, orphan <50 chars) не ловят **семантическое устаревание** — скилл формально валиден, но описывает несуществующий код или устаревшие пути.

**Параллельная проблема (казуальности):** Хеши в `causality-registry.md` и их формулировки могут устареть относительно кода: решение отменено, но хеш остаётся; exception в `causality-exceptions.jsonl` указывает на hash, уже полностью удалённый; formulation описывает устаревшую логику.

### Решение

Трёхуровневая система «антиустаревателя»:

| Уровень | Название | Триггер | Действие |
|---------|----------|---------|----------|
| **1** | Static validation | Preflight | Path existence, @skill resolution, Implementation Status vs FS |
| **2** | Change-triggered review | Pre-commit / CI | Git diff → затронутые скиллы → список для ревью |
| **3** | Periodic batch review | Ежемесячно / по триггеру | Dead links, redundancy, интеграция с Batch Skills Review |

**Казуальности (параллельный контур):** Те же три уровня, но с иными механизмами — один реестр вместо многих скиллов, хеши вместо путей, formulation вместо Implementation Status. См. раздел 5A.

### Критерии успеха

- Preflight падает при битых путях в Implementation Status.
- Preflight падает при @skill в коде, указывающем на несуществующий скилл.
- Перед коммитом выводится список скиллов, требующих ревью (если изменён связанный код).
- Batch review автоматизирован на 80% (dead links, staleness, orphans).
- **Казуальности:** Preflight уже падает на ghost/unknown (validate-causality). Добавить: change-triggered список affected hashes; batch-отчёт о stale exceptions; опционально — warning при использовании #deprecated- в коде.

---

## 2. Архитектура

### 2.1 Интеграция с существующей инфраструктурой

```
preflight.js
    └── validate-skills.js          [расширить: path existence, impl-status]
    └── validate-skill-anchors.js   [новый: @skill resolution]
    └── ... (остальные гейты)

scripts/git/preflight-solo.ps1      [создать или расширить]
    └── validate-affected-skills.js [новый: change-triggered]

npm run skills:batch-review         [новый: periodic]
    └── validate-dead-links.js      [новый]
    └── validate-causality-exceptions-stale.js [новый]
    └── validate-skills.js          [существующий]
```

### 2.2 Зависимости

- **PATHS** (`is/contracts/paths/paths.js`) — корень проекта, пути к skills. SSOT: arch-foundation (все пути через PATHS).
- **validate-skills.js** — текущая логика (format, prefix, stale, orphan).
- **process-code-anchors** — формат `@skill`, `@skill-anchor`, `@causality`.
- **arch-skills-mcp** — Batch Skills Review, Skill Impact Analysis.
- **validate-causality.js**, **validate-causality-invariant.js** — уже в preflight; ghost hashes, unknown hashes, removal consistency.
- **arch-causality**, **process-causality-harvesting** — SSOT для казуальностей, форматы хешей.

### 2.3 Ограничения

- **#for-validate-skills-single** — один validate-skills; новые проверки либо внутри него, либо вызываются из preflight как отдельные скрипты (допустимо по arch-testing-ci).
- **#for-node-test** — без внешних фреймворков; `node:test`.
- **Без Docker/n8n** — всё работает локально, в CI.

### 2.4 Связь с реестром префиксов и специальными файлами

**SSOT:** `is/contracts/prefixes.js` — новые скрипты не должны нарушать проверку префиксов. Path existence и dead links **не проверяют** префиксы — это остаётся за `validate-skills.js`.

**Специальные файлы (исключения):**

| Файл / папка | Обработка в антиустаревателе |
|--------------|------------------------------|
| `README.md` | Path existence: не требовать наличия путей из README. Dead links: проверять ссылки внутри README. |
| `causality-registry.md` | Path existence: не парсить Implementation Status (его нет). @skill: не сканировать как код. **Causality:** SSOT для хешей; антиустареватель казуальностей проверяет ghost, stale exceptions, affected hashes. |
| `causality-exceptions.jsonl` | Путь жёстко задан (#for-audits-path-contract): `docs/audits/causality-exceptions.jsonl`. Строки вида `{"hash":"#for-X","removed_from":"path","reason":"..."}`. Stale exception — hash полностью удалён, exception можно удалить. |
| `.causality-lock.json` | Генерируется validate-causality-invariant. Не редактировать вручную. |
| `references/*.md` | Dead links: проверять. Path existence: если referenced в skill — проверять. |
| `docs/backlog/skills/*.md` | **Не сканировать** validate-skills, validate-skill-anchors — backlog вне active skills. Dead links: при ссылке из active skill на backlog — путь может не существовать в ROOT (backlog — отдельная зона). |

---

## 3. Уровень 1: Static Validation (Preflight)

### 3.1 Path Existence (Implementation Status)

**Цель:** Все пути к файлам/модулям, перечисленные в секции `## Implementation Status in Target App` (или `## Implementation Status`), должны существовать в проекте.

**Формат парсинга:**

- Секция начинается с `## Implementation Status in Target App` или `## Implementation Status`.
- Строки вида `- \`path/to/file.js\`` или `- path/to/file.js` — извлекать путь.
- Строки вида `| path | desc |` в таблицах — извлекать первый столбец.
- Игнорировать: `Implemented`, `Simplified`, `Deferred`, общие фразы без путей.
- Путь считается относительным к корню проекта (`ROOT`).

**Регулярные выражения (примеры):**

```regex
# Bullet list: - `core/api/foo.js` or - core/api/foo.js
- `?([a-zA-Z0-9_/.-]+\.(js|ts|json|md|yaml|yml))`?

# Table: | path | desc |
^\|\s*`?([a-zA-Z0-9_/.-]+)`?\s*\|
```

**Исключения:**

- Пути к внешним пакетам (`node_modules/`, `wrangler`, `npm`).
- Пути с плейсхолдерами (`*`, `...`).
- Ссылки на `docs/`, `is/skills/` как на документы (не на исполняемый код) — опционально проверять.

**Результат:** Ошибка (preflight fail) если путь не существует. Предупреждение — если путь ведёт в `docs/` или `is/skills/` и файл отсутствует (может быть опечатка).

### 3.2 Path Existence (Core Rules, Context)

**Цель:** Критичные пути в Core Rules и Context, упомянутые явно (например, `core/api/providers/`, `is/scripts/`), должны существовать.

**Подход:** Эвристика. Ищем паттерны `path/to/dir/`, `path/to/file.js` в секциях `## Core Rules` и `> **Context**`. Проверяем только пути, начинающиеся с `core/`, `app/`, `is/`, `shared/`, `scripts/`.

**Сложность:** Высокая (много false positives). **Рекомендация:** Фаза 2. В Фазе 1 — только Implementation Status.

### 3.3 @skill Resolution (Code → Skill)

**Цель:** Каждый `@skill` в коде должен указывать на существующий файл скилла.

**Формат @skill:**

```javascript
/** @skill is/skills/arch-foundation */
/** @skill core/skills/api-layer */
```

**Парсинг:** Сканировать все `.js`, `.ts`, `.mdc` в `core/`, `app/`, `is/`, `shared/`. Извлекать `@skill <path>`. Path может быть:
- `is/skills/arch-foundation` (без .md)
- `is/skills/arch-foundation.md`
- `core/skills/api-layer`

**Проверка:** Файл `ROOT/<path>` или `ROOT/<path>.md` существует.

**Результат:** Ошибка (preflight fail) если скилл не найден.

**Скрипт:** `is/scripts/architecture/validate-skill-anchors.js` — отдельный, вызывается из preflight после validate-skills.

### 3.4 Реализация (Уровень 1)

| Компонент | Файл | Действие |
|-----------|------|-----------|
| Path existence (Impl Status) | `validate-skills.js` | Добавить функцию `validateImplementationStatusPaths(file, text, rel, errors)` |
| @skill resolution | `validate-skill-anchors.js` | Новый скрипт |
| Preflight | `preflight.js` | Добавить вызов `validate-skill-anchors.js` после validate-skills |
| package.json | `package.json` | `"skills:anchors:check": "node is/scripts/architecture/validate-skill-anchors.js"` |

---

## 4. Уровень 2: Change-Triggered Review

### 4.1 Концепция

При изменении кода (git add / staged) определить:
1. Какие файлы изменены.
2. Какие скиллы управляют этими файлами (через @skill в коде).
3. Вывести список: «Эти скиллы могут быть затронуты, проверьте актуальность».

### 4.2 Алгоритм

```
1. git diff --cached --name-only
   → список изменённых файлов (staged)

2. Для каждого файла:
   - Прочитать содержимое (или diff)
   - Найти @skill в JSDoc (первые 30 строк) или в @skill-anchor
   - Собрать множество skill_paths

3. Уникальные skill_paths → список скиллов для ревью

4. Вывод:
   [affected-skills] The following skills may need review (code changed):
   - is/skills/arch-backend-core.md (core/api/market-snapshot-service.js)
   - core/skills/api-layer.md (core/api/providers/coingecko-provider.js)
```

### 4.3 Обратная связь: Skill → Code

**Проблема:** Файл может не иметь @skill, но скилл его описывает (через Implementation Status). Тогда при изменении файла мы не попадём в скилл через @skill.

**Решение (Фаза 2):** Построить индекс «skill → [paths from Implementation Status]». При изменении файла проверять: входит ли путь в какой-либо скилл. Если да — добавить скилл в список.

### 4.4 Интеграция

| Вариант | Триггер | Где |
|---------|---------|-----|
| A | Pre-commit hook | `.git/hooks/pre-commit` → вызывает скрипт |
| B | Preflight-solo | `scripts/git/preflight-solo.ps1` — перед коммитом вручную |
| C | CI | GitHub Actions — на PR выводить affected skills в комментарий |

**Рекомендация:** B (preflight-solo). Файл `scripts/git/preflight-solo.ps1` упоминается в arch-foundation и arch-testing-ci, но может отсутствовать. План включает его создание.

### 4.5 Реализация (Уровень 2)

| Компонент | Файл | Действие |
|-----------|------|----------|
| Affected skills | `validate-affected-skills.js` | Новый скрипт. Читает git diff --cached, парсит @skill, выводит список. |
| Preflight-solo | `scripts/git/preflight-solo.ps1` | Создать. Вызов: secret scan, skills:check, validate-affected-skills (если staged). |
| package.json | `package.json` | `"skills:affected": "node is/scripts/architecture/validate-affected-skills.js"` |

**Поведение:** `validate-affected-skills.js` — **не блокирует** preflight. Только выводит предупреждение. Блокировка — за человеком (решить, коммитить или обновить скилл).

---

## 5. Уровень 3: Periodic Batch Review

### 5.1 Компоненты

| Компонент | Описание | Источник |
|-----------|----------|----------|
| Dead links | Ссылки в .md на несуществующие файлы/папки | arch-skills-mcp § Batch Skills Review |
| Staleness | Уже в validate-skills (90 дней) | — |
| Orphans | Уже в validate-skills (<50 chars) | — |
| Redundancy | Скиллы с >60% overlap | Эвристика, ручной аудит |
| Index linkage | Каждый скилл в docs/index-skills.md | generate-skills-index уже проверяет |

### 5.2 Dead Links

**Цель:** Найти в skills (и docs) ссылки вида `[text](path)`, `path/to/file`, `` `path` ``, которые ведут на несуществующие файлы.

**Паттерны:**

- `](path)` — markdown link
- `](../path)` — relative
- `` `core/api/foo.js` `` — backtick path
- `is/scripts/architecture/validate-skills.js` — plain path

**Проверка:** `fs.existsSync(path.join(ROOT, normalizedPath))`. Нормализация: разрешить `../` от расположения текущего файла. При исправлении битых ссылок — см. чеклист раздела 7 и антипаттерн «Dead link» в разделе 14.

**Исключения:** Внешние URL (http, https), якоря (#section), id-registry ссылки (sk-xxx), ссылки на `docs/backlog/` (могут указывать на несуществующие в ROOT).

### 5.3 Реализация (Уровень 3)

| Компонент | Файл | Действие |
|-----------|------|----------|
| Dead links | `validate-dead-links.js` | Новый скрипт. Сканирует is/skills, core/skills, app/skills, docs. |
| Batch review | `skills-batch-review.js` | Оркестратор: validate-skills, validate-dead-links, skills-health-trend, отчёт. |
| package.json | `package.json` | `"skills:batch-review": "node is/scripts/architecture/skills-batch-review.js"` |

---

## 5A. Устаревание казуальностей (Causality Anti-Staleness)

**Отличие от скиллов:** Один реестр (`causality-registry.md`) вместо многих файлов; хеши вместо путей; formulation вместо Implementation Status; lifecycle — добавление в реестр → использование в коде/скиллах → удаление/exception/deprecation.

### 5A.1 Сравнение контуров

| Аспект | Скиллы | Казуальности |
|--------|--------|--------------|
| **Хранилище** | is/skills, core/skills, app/skills (много файлов) | causality-registry.md (один файл) |
| **Связь с кодом** | @skill в file header, Implementation Status | @causality, @skill-anchor с хешами |
| **Устаревание** | Path missing, dead links, affected skills | Ghost hash, stale exception, formulation outdated |
| **Существующие гейты** | validate-skills, validate-skill-anchors | validate-causality, validate-causality-invariant |

### 5A.2 Уровень 1: Static Validation (уже в preflight)

**Уже реализовано:**
- `validate-causality.js` — unknown hashes (в коде, не в реестре) → fail; ghost hashes (в реестре, не используются) → fail. Исключение: `#deprecated-*` не считаются ghost.
- `validate-causality-invariant.js` — hash удалён из одного файла при сохранении в других без exception → fail.

**Дополнительно (опционально, Фаза 4):**
- `#deprecated-X` в коде — warning (миграция на новый хеш не выполнена).

### 5A.3 Уровень 2: Change-Triggered Review

**Цель:** При изменении файла с `@causality` или `@skill-anchor` вывести список хешей для ревью — formulation может устареть.

**Механизм:** Расширить `validate-affected-skills.js` или создать `validate-affected-annotations.js`:
1. `git diff --cached --name-only`. Для каждого файла: парсить `@causality` и `@skill-anchor` (первые 30–50 строк).
2. Собрать множество `{ hash, file }`.
3. Вывод: `[affected-causalities] The following hashes may need review (file changed): #for-rate-limiting (core/api/foo.js)`.

**Связь с validate-affected-skills:** Один скрипт может выводить и affected skills, и affected hashes — оба используют `git diff` и парсинг изменённых файлов. SSOT: `validate-affected-annotations.js` или расширение validate-affected-skills.

**Результат:** Не блокирует. Только предупреждение. Блокировка — за человеком.

### 5A.4 Уровень 3: Periodic Batch Review

| Компонент | Описание | Источник |
|-----------|----------|----------|
| Ghost hashes | Уже в validate-causality (preflight) | — |
| Stale exceptions | Exception в causality-exceptions.jsonl для hash, который полностью удалён из кода | Новый: validate-causality-exceptions-stale.js |
| Formulation staleness | Formulation не соответствует коду | Ручной аудит; автоматизация не предусмотрена |
| #deprecated- in use | Хеш помечен deprecated, но всё ещё в коде | Опционально: validate-causality (расширить) |

**validate-causality-exceptions-stale.js:**
- Вход: causality-exceptions.jsonl, текущее состояние хешей в коде (из validate-causality логики).
- Логика: Для каждой строки exception: hash + removed_from. Если hash больше нигде не используется (полностью удалён) — exception устарел, можно удалить строку.
- Выход: Список stale exceptions. Не блокирует preflight; только отчёт в batch review.

### 5A.5 Специфика lifecycle казуальностей

- **Добавление хеша:** Сначала в causality-registry, затем в код. validate-causality проверяет unknown.
- **Удаление хеша:** (a) Удалить из всех файлов + удалить из реестра; (b) Частичное удаление — добавить exception в causality-exceptions.jsonl.
- **Deprecation:** Переименовать в `#deprecated-X` в реестре; заменить в коде на новый хеш; после миграции удалить #deprecated-X из реестра.
- **Scope сканирования:** validate-causality сканирует is/, core/, app/ (включая is/skills/*.md). Не сканирует docs/, shared/, .cursor/rules/. Хеши только в docs/ — будут ghost. См. раздел 16.

### 5A.6 Реализация (казуальности)

| Компонент | Файл | Действие |
|-----------|------|----------|
| Affected hashes | validate-affected-skills.js или validate-affected-annotations.js | Расширить: парсить @causality, @skill-anchor; выводить affected hashes |
| Stale exceptions | validate-causality-exceptions-stale.js | Новый. Вызывать из skills-batch-review. |
| Batch review | skills-batch-review.js | Добавить вызов validate-causality-exceptions-stale; включить в отчёт |

---

## 6. Легенда статусов и регламент

### 6.1 Статусы скилла (для отчётов)

| Статус | Описание | Источник |
|--------|----------|----------|
| `OK` | Скилл валиден, пути существуют, @skill резолвятся | validate-skills, validate-skill-anchors |
| `NEEDS_REVIEW` | Код изменён, скилл может быть затронут | validate-affected-skills |
| `STALE` | >90 дней без изменений | validate-skills (warning) |
| `ORPHAN` | <50 chars, возможно пустой | validate-skills (warning) |
| `DEAD_LINKS` | Содержит битые ссылки | validate-dead-links |
| `PATH_MISSING` | Implementation Status ссылается на несуществующий путь | validate-skills (path existence) |

**Статусы казуальностей (для отчётов):**

| Статус | Описание | Источник |
|--------|----------|----------|
| `OK` | Хеш в реестре, используется, formulation актуальна | validate-causality |
| `GHOST_HASH` | В реестре, не используется нигде (исключая #deprecated-) | validate-causality |
| `STALE_EXCEPTION` | Exception для hash, полностью удалённого из кода | validate-causality-exceptions-stale |
| `AFFECTED_HASH` | Файл с хешем изменён, formulation может устареть | validate-affected-annotations |
| `FORMULATION_STALE` | Ручная оценка: formulation не соответствует коду | Аудит |

### 6.2 Регламент перепроверки при добавлении новых скриптов

**При каждом добавлении или изменении скрипта антиустаревателя** агент/разработчик обязан:

1. **Проверить порядок в preflight** — новый скрипт должен вызываться после validate-skills, до или после causality по смыслу.
2. **Обновить package.json** — добавить npm script для ручного запуска.
3. **Документировать в скилле** — в arch-skills-mcp (Key Contracts) или process-skill-governance указать: «Gate: `validate-<topic>.js`».
4. **Запустить гейт** — `npm run skills:check`, `npm run preflight` должны проходить.
5. **Обновить этот план** — при изменении протокола добавить шаг в соответствующий раздел.

---

## 7. Чеклисты при обновлении (skills и causality)

**Чеклист при обновлении казуальности (когда флаг AFFECTED_HASH / STALE_EXCEPTION):**

- [ ] **Прочитать formulation** — понять, что изменилось в коде и как это влияет на rationale.
- [ ] **Обновить formulation** — если решение изменилось, скорректировать текст в causality-registry.md.
- [ ] **Удалить хеш из кода** — если решение отменено, убрать @causality/@skill-anchor из всех файлов; удалить хеш из реестра.
- [ ] **Частичное удаление** — если хеш удалён из одного файла, но остаётся в других: добавить exception в causality-exceptions.jsonl (см. validate-causality-invariant).
- [ ] **Stale exception** — если hash полностью удалён, удалить соответствующую строку из causality-exceptions.jsonl.
- [ ] **Deprecation** — при замене хеша: переименовать старый в #deprecated-X; заменить в коде; после миграции удалить #deprecated-X.
- [ ] **Запустить верификацию** — `npm run skills:causality:check`, `npm run preflight`.

---

**Чеклист при обновлении скилла (когда флаг NEEDS_REVIEW / PATH_MISSING):**

Когда `validate-affected-skills` или path existence пометили скилл как требующий ревью:

- [ ] **Прочитать скилл** — понять, что изменилось в коде и как это влияет на Core Rules / Implementation Status.
- [ ] **Обновить Implementation Status** — удалить пути к удалённым модулям; добавить новые; проверить описания.
- [ ] **Обновить Core Rules** — если инварианты изменились (например, новый SSOT путь).
- [ ] **Развернуть казуальность** — если изменилась секция Reasoning, добавить/удалить хеши в causality-registry; запустить `update-reasoning-checksums.js`.
- [ ] **Прошить в код** — если файл потерял @skill или приобрёл новый скилл, обновить file header (см. process-code-anchors).
- [ ] **Обновить related_skills** — если скилл связан с другими; проверить validate-docs-ids.
- [ ] **Запустить верификацию** — `npm run skills:check`, `npm run skills:causality:check`, `npm run preflight`.
- [ ] **Проверить id-registry** — при переименовании скилла preflight перегенерирует; при смене id — обновить related_skills в других документах.

---

## 8. Фазы внедрения (с чекбоксами)

**Рекурсивная проверка при документировании в AIS:** При добавлении раздела фазы N в `docs/ais/ais-anti-staleness.md` — проверить, не привели ли новые фазы к корректировкам функциональности или алгоритмов предыдущих фаз (1..N−1). Если да — обновить соответствующие разделы «как работает», казуальность и схемы. Вероятность низка, но обязательна к проверке.

### Фаза 1: Static Validation (2–3 дня)

| # | Задача | Файл | Критерий приёмки |
|---|--------|------|-------------------|
| 1.0 | Создать ais-anti-staleness.md | docs/ais/ais-anti-staleness.md | Болванка AIS с разделами под каждую фазу; образец полноты покрытия спецификации контура |
| 1.1 | Path existence в Implementation Status | validate-skills.js | Preflight падает, если путь из Impl Status не существует |
| 1.2 | validate-skill-anchors.js | validate-skill-anchors.js | Preflight падает, если @skill ведёт на несуществующий скилл |
| 1.3 | Интеграция в preflight | preflight.js | Вызов validate-skill-anchors после validate-skills |
| 1.4 | Тесты | validate-skills.test.js, validate-skill-anchors.test.js | node:test, позитивные и негативные кейсы |
| 1.5 | Обновить arch-skills-mcp | arch-skills-mcp.md | Добавить в Key Contracts: path existence, @skill resolution |

**Чекбокс фазы 1:** [x] Все задачи 1.0–1.5 выполнены; preflight падает на битых путях и битых @skill; тесты проходят.

**Пожелание по схемам Mermaid:** При составлении схем придерживаться вертикальной ориентации (`flowchart TD`), узлы сверху вниз — из-за дефицита места по ширине экрана. Читабельность важнее компактности.

**Документирование в AIS (после фазы 1):** Добавить в `docs/ais/ais-anti-staleness.md` раздел **«Фаза 1: Static Validation — как работает»**:
- **Точное описание:** Пошагово: preflight вызывает validate-skills (path existence), validate-skill-anchors; что проверяется, в каком порядке, при каком условии fail.
- **Казуальность:** Почему path existence в preflight — #for-fail-fast, #for-gate-enforcement; почему @skill resolution отдельным скриптом — #for-validate-skills-single.
- **Схема (при необходимости):** Mermaid: preflight → validate-skills → validate-skill-anchors → pass/fail.

### Фаза 2: Change-Triggered Review (2 дня)

| # | Задача | Файл | Критерий приёмки |
|---|--------|------|-------------------|
| 2.1 | validate-affected-skills.js | validate-affected-skills.js | Вывод списка скиллов по git diff --cached |
| 2.2 | Расширить: affected hashes | validate-affected-skills.js | Парсить @causality, @skill-anchor; выводить affected hashes (или создать validate-affected-annotations.js) |
| 2.3 | preflight-solo.ps1 | scripts/git/preflight-solo.ps1 | Создать, вызвать skills:check, skills:affected |
| 2.4 | npm scripts | package.json | skills:affected |
| 2.5 | Документация | arch-testing-ci.md | Уточнить preflight-solo: когда вызывать affected-skills |

**Чекбокс фазы 2:** [x] preflight-solo создан; skills:affected выводит affected skills и affected hashes; документация обновлена.

**Документирование в AIS (после фазы 2):** Добавить в `docs/ais/ais-anti-staleness.md` раздел **«Фаза 2: Change-Triggered Review — как работает»**:
- **Точное описание:** git diff --cached → список файлов → парсинг @skill, @causality, @skill-anchor → вывод affected skills и affected hashes; preflight-solo вызывает skills:affected; не блокирует.
- **Казуальность:** Почему не блокирует — #for-confidence-by-agent (только человек решает, коммитить или обновить); почему preflight-solo, а не hook — arch-testing-ci, контроль над flow.
- **Схема (при необходимости):** Mermaid: git add → preflight-solo → skills:affected → stdout список → решение человека.

### Фаза 3: Batch Review (2 дня)

| # | Задача | Файл | Критерий приёмки |
|---|--------|------|-------------------|
| 3.1 | validate-dead-links.js | validate-dead-links.js | Отчёт: битые ссылки в skills и docs |
| 3.2 | validate-causality-exceptions-stale.js | validate-causality-exceptions-stale.js | Отчёт: stale exceptions в causality-exceptions.jsonl |
| 3.3 | skills-batch-review.js | skills-batch-review.js | Оркестратор: validate-skills, validate-dead-links, validate-causality-exceptions-stale; JSON/текстовый отчёт |
| 3.4 | npm scripts | package.json | skills:batch-review |
| 3.5 | Обновить arch-skills-mcp | arch-skills-mcp.md | Batch Skills Review: добавить команду npm run skills:batch-review |

**Чекбокс фазы 3:** [ ] skills:batch-review запускается; dead links и stale causality exceptions в отчёте; arch-skills-mcp обновлён.

**Документирование в AIS (после фазы 3):** Добавить в `docs/ais/ais-anti-staleness.md` раздел **«Фаза 3: Batch Review — как работает»**:
- **Точное описание:** skills-batch-review оркестрирует validate-skills, validate-dead-links, validate-causality-exceptions-stale; формат отчёта (JSON/текст); что такое stale exception, как определяется.
- **Казуальность:** Почему batch, а не preflight — #for-token-efficiency (периодический объёмный отчёт не в каждом preflight); почему stale exceptions не блокируют — исключения уже применены, удаление строки — housekeeping.
- **Схема (при необходимости):** Mermaid: npm run skills:batch-review → validate-skills | validate-dead-links | validate-causality-exceptions-stale → агрегация → отчёт.

### Фаза 4: Улучшения (опционально)

| # | Задача | Описание |
|---|--------|----------|
| 4.1 | Skill → Code индекс | Обратная связь: Implementation Status paths → при изменении файла помечать скилл |
| 4.2 | Path existence в Core Rules | Расширить проверку на Core Rules (эвристика) |
| 4.3 | CI integration | GitHub Actions: комментировать PR списком affected skills |
| 4.4 | MCP tool | `audit_skill_staleness` — для агентов |
| 4.5 | #deprecated- in use | validate-causality: warning при использовании #deprecated-X в коде |

---

## 9. Гейты и контракты (связь skill → gate)

**По образцу plan-skills-migration-registry § 7.6.** Новые скрипты антиустаревателя становятся гейтами. Документировать в скиллах.

| Скилл | Gate / контракт (новый или расширенный) |
|-------|----------------------------------------|
| `arch-skills-mcp` | `validate-skills.js` (path existence), `validate-skill-anchors.js`, `validate-affected-skills.js`, `validate-dead-links.js`, `skills-batch-review.js` |
| `process-skill-governance` | `validate-skills.js` (path existence в Implementation Status) |
| `process-code-anchors` | `validate-skill-anchors.js` (@skill resolution), validate-affected-annotations (affected hashes) |
| `arch-testing-ci` | preflight-solo.ps1 (skills:affected в pre-commit flow) |
| `arch-causality` | validate-causality.js, validate-causality-invariant.js (уже в preflight); validate-causality-exceptions-stale.js (batch) |

**Протокол при добавлении gate:** (1) Создать/расширить скрипт; (2) Добавить вызов в preflight или preflight-solo; (3) В скилле (Implementation Status) указать: «Gate: `validate-<topic>.js`».

---

## 10. Протокол верификации после внедрения

**По образцу plan-skills-migration-registry § 7.3.** После завершения каждой фазы — явно проверить прошитость.

| Контур | Что проверяется | Команда |
|--------|-----------------|---------|
| **Path existence** | Пути из Implementation Status существуют | `npm run skills:check` (расширенный) |
| **@skill resolution** | Все @skill в коде ведут на существующие скиллы | `npm run skills:anchors:check` |
| **Affected skills** | При staged changes выводится список | `npm run skills:affected` (после git add) |
| **Dead links** | Нет битых ссылок в skills | `npm run skills:batch-review` или validate-dead-links |
| **Preflight** | Все гейты проходят | `npm run preflight` |
| **Causality** | Ghost/unknown, invariant, при обновлении — formulation актуальна | `npm run skills:causality:check` |
| **Causality exceptions** | Нет stale exceptions | validate-causality-exceptions-stale (в batch) |

**Порядок верификации после фазы:**

| Шаг | Действие |
|-----|----------|
| 1 | Запустить `npm run skills:check` |
| 2 | Запустить `npm run skills:anchors:check` (если Фаза 1 выполнена) |
| 3 | Запустить `npm run preflight` |
| 4 | При ошибке — исправить, повторить с шага 1 |
| 5 | Поставить чекбокс фазы |

**Критерий «антиустареватель прошит»:** Все чекбоксы фаз 1–3 поставлены; протокол верификации (раздел 10) пройден; гейты зафиксированы в arch-skills-mcp (раздел 9).

---

## 11. Спецификация скриптов

### 11.1 validate-skill-anchors.js

**Вход:** ROOT (текущая директория).

**Выход:** exit 0 — всё ок; exit 1 — есть битые @skill.

**Логика:**
1. Сканировать `core/**/*.js`, `app/**/*.js`, `is/**/*.js`, `shared/**/*.js`, `.cursor/rules/**/*.mdc`.
2. В каждом файле: regex `@skill\s+([^\s\n]+)`.
3. Нормализовать путь: добавить .md если нет расширения; проверить is/skills/, core/skills/, app/skills/.
4. `fs.existsSync(path.join(ROOT, skillPath))` или `path.join(ROOT, skillPath + '.md')`.
5. Ошибки → stderr, exit 1.

**Флаги:** `--json` — JSON output для CI.

### 11.2 validate-affected-skills.js

**Вход:** `git diff --cached --name-only`.

**Выход:** stdout — список скиллов, по одному на строку; или JSON.

**Логика:**
1. `execSync('git diff --cached --name-only', { encoding: 'utf8' })`.
2. Для каждого файла: прочитать (или git show :file), найти @skill в первых 50 строках.
3. Собрать Set(skill_path).
4. Вывести. Не блокировать (exit 0 всегда, если только не ошибка выполнения).

**Флаги:** `--json`, `--no-git` (для тестов — передать список файлов через stdin).

### 11.3 validate-dead-links.js

**Вход:** Директории is/skills, core/skills, app/skills, docs (опционально).

**Выход:** Список { file, line, link, resolved_path, exists: false }.

**Логика:**
1. Рекурсивно читать .md файлы.
2. Regex для markdown links `[.*?]((.+?))`, inline paths `` `([a-zA-Z0-9_/.-]+)` ``, plain paths (сложнее).
3. Нормализовать путь относительно текущего файла.
4. Проверить exists. Исключить http(s), #, mailto.

### 11.4 skills-batch-review.js

**Вход:** Нет (или --since для ограничения).

**Выход:** Консольный отчёт + опционально JSON.

**Логика:**
1. Запустить validate-skills (--json).
2. Запустить validate-dead-links.
3. Запустить validate-causality-exceptions-stale.
4. Запустить skills-health-trend-report (если есть данные).
5. Агрегировать, вывести сводку.

### 11.5 validate-causality-exceptions-stale.js

**Вход:** causality-exceptions.jsonl, текущее состояние хешей в коде (переиспользовать логику validate-causality).

**Выход:** Список stale exceptions: { hash, removed_from, reason } — hash полностью удалён из кода.

**Логика:**
1. Загрузить causality-exceptions.jsonl (если нет — пустой отчёт).
2. Построить множество usedHashes (хеши в коде и skills) — переиспользовать walk из validate-causality.
3. Для каждой строки exception: если hash не в usedHashes (полностью удалён) — stale.
4. Вывести отчёт. exit 0 всегда (не блокирует preflight).

**Флаги:** `--json` — JSON output.

---

## 12. Формат отчётов

### 12.1 validate-skill-anchors --json

```json
{
  "ok": false,
  "errors": [
    { "file": "core/api/foo.js", "line": 3, "skill": "is/skills/arch-missing", "reason": "File not found" }
  ]
}
```

### 12.2 validate-affected-skills --json

```json
{
  "changed_files": ["core/api/market-snapshot-service.js"],
  "affected_skills": [
    { "skill": "is/skills/arch-backend-core.md", "via_file": "core/api/market-snapshot-service.js" }
  ]
}
```

### 12.3 validate-dead-links --json

```json
{
  "dead_links": [
    { "source_file": "is/skills/arch-backend-core.md", "line": 72, "link": "core/api/old-provider.js", "resolved": "core/api/old-provider.js" }
  ]
}
```

### 12.4 validate-causality-exceptions-stale --json

```json
{
  "stale_exceptions": [
    { "hash": "#for-rate-limiting", "removed_from": "core/api/old-provider.js", "reason": "Refactored" }
  ]
}
```

---

## 13. Тестирование

### 13.1 Unit-тесты

| Скрипт | Тест-файл | Кейсы |
|--------|-----------|-------|
| validate-skills (path existence) | validate-skills.test.js | Skill с битым путём → error; с валидным → ok |
| validate-skill-anchors | validate-skill-anchors.test.js | @skill на несуществующий → error; на существующий → ok |
| validate-affected-skills | validate-affected-skills.test.js | Mock git diff, проверка вывода |
| validate-dead-links | validate-dead-links.test.js | Файл с битой ссылкой → в отчёте |
| validate-causality-exceptions-stale | validate-causality-exceptions-stale.test.js | Exception для полностью удалённого hash → в отчёте |

### 13.2 Интеграционные тесты

- Preflight с искусственным битым скиллом → fail.
- Preflight с валидным состоянием → pass.

---

## 14. Антипаттерны (по образцу plan-skills-migration-registry § 7.7)

| Антипаттерн | Почему плохо | Правильно |
|-------------|--------------|-----------|
| **Игнорировать affected-skills** — коммитить, не проверив список скиллов для ревью | Скилл остаётся устаревшим; агент действует по неверным правилам; тихий ущерб. | Перед коммитом: прочитать вывод skills:affected; при необходимости обновить скилл или осознанно отложить. |
| **Исправить путь в коде без обновления скилла** — переименовать файл, не тронув Implementation Status | Path existence упадёт; preflight fail; скилл описывает несуществующий путь. | Обновить Implementation Status в скилле; при необходимости Core Rules. |
| **Добавить @skill в код без проверки существования скилла** | validate-skill-anchors упадёт; preflight fail; скилл может быть опечаткой или не создан. | Убедиться, что файл скилла существует; использовать правильный путь (is/skills/, core/skills/, app/skills/). |
| **Обновить скилл без обновления reasoning_checksum** | validate-reasoning упадёт; preflight fail. | После правок Reasoning: `node is/scripts/architecture/update-reasoning-checksums.js`. |
| **Обновить скилл без проверки causality** | Новые #for-* / #not-* не зарегистрированы; skills:causality:check падает. | Добавить хеши в causality-registry; переиспользовать существующие при слиянии. |
| **Dead link — исправить только путь, не проверить related_skills** | Другой документ может ссылаться на старый путь; validate-docs-ids может выявить битый id. | Проверить related_skills во всех связанных документах; обновить id-registry при переименовании. |
| **Изменить код с @causality без ревью formulation** — поменять логику, не проверив, актуальна ли formulation в реестре | Formulation описывает устаревшее решение; агенты и разработчики получают неверный контекст. | Перед коммитом: прочитать вывод affected hashes; при необходимости обновить formulation или удалить хеш. |
| **Оставить stale exception** — hash полностью удалён из кода, exception в causality-exceptions.jsonl не удалён | Мёртвые строки в exceptions; при следующем partial removal — путаница. | Запустить validate-causality-exceptions-stale; удалить stale строки. |
| **Использовать #deprecated-X без миграции** | Deprecated хеш в коде — решение устарело, но миграция не выполнена. | Заменить на новый хеш; обновить formulation; удалить #deprecated-X из реестра. |

---

## 15. Риски и митигации

| Риск | Митигация |
|------|-----------|
| Path existence даёт много false positives | Начать только с Implementation Status; строгий regex; исключения |
| validate-affected-skills медленный на больших diff | Ограничить парсинг первыми 50 строками; кэш @skill по файлу |
| preflight-solo не существует | Создать в Фазе 2; arch-foundation уже ссылается |
| Dead links в docs/ — много шума | Опционально: --scope=skills только для skills |
| Causality scope: docs/, shared/ не сканируются | validate-causality сканирует только is/, core/, app/. Хеши только в docs/ — false ghost. | Добавить docs/ в scan при необходимости; или исключить docs-only hashes из ghost check (опционально) |

---

## 16. Прочие пробелы (на заметку)

| Пробел | Описание | Статус |
|--------|----------|--------|
| **Vue / .vue файлы** | validate-skill-anchors сканирует только .js, .ts, .mdc. Если появятся .vue — расширить парсинг @skill. | Пока в mmb нет .vue; при появлении — добавить в 11.1 |
| **Sharded / монорепо** | При нескольких пакетах (packages/*) пути могут быть относительны к подпакету. Path existence должен учитывать. | Не применимо к текущей структуре; при появлении — уточнить ROOT |
| **Smoke test MCP** | Как убедиться, что MCP возвращает актуальный скилл после обновления? | Smoke test не формализован; опционально |
| **Rollback антиустаревателя** | Как откатить неудачное внедрение (удалить скрипт, убрать из preflight)? | Не описано; при необходимости — добавить runbook |
| **Backlog skills** | Path existence в Implementation Status backlog-скилла — не проверять (пути могут относиться к будущей инфраструктуре). | Учтено в 2.4 |
| **Causality: docs/ и shared/** | validate-causality не сканирует docs/, shared/, .cursor/rules/. Хеши только в docs/plans/ или AIS — будут ghost. | При появлении хешей в docs/ — расширить CODE_DIRS или добавить исключение для ghost; см. раздел 15. |
| **causality-exceptions.jsonl** | Файл может не существовать (docs/audits/). validate-causality-invariant создаёт при отсутствии. | При первом partial removal — создать папку и файл; #for-audits-path-contract. |

---

## 17. Чеклист перед запуском

- [ ] PATHS.root корректен в is/contracts/paths/paths.js
- [ ] validate-skills.js поддерживает --json
- [ ] preflight.js вызывает скрипты в правильном порядке
- [ ] Все новые скрипты в is/scripts/architecture/
- [ ] package.json обновлён
- [ ] arch-skills-mcp, process-skill-governance обновлены
- [x] docs/migration-roadmap.md содержит ссылку на этот план

---

## 18. Итеративное улучшение протокола

**По образцу plan-skills-migration-registry § 10.** Обязательство для ИИ-агентов: при обнаружении недостатка в протоколах — дополнить этот документ.

| Когда | Действие |
|-------|----------|
| Обнаружен пропущенный шаг | Добавить в соответствующий протокол (чеклист, таблицу) |
| Найден новый антипаттерн | Добавить в таблицу антипаттернов (раздел 14) с пояснением «почему плохо» и «правильно» |
| Протокол верификации не покрыл кейс | Расширить таблицу контуров (раздел 10) или порядок шагов |
| Критерий «прошит» оказался недостаточным | Дополнить раздел 10 (протокол верификации) |
| Новый источник проблем (например, .vue файлы) | Добавить в раздел 16 «Прочие пробелы» |

**Не требуется:** Согласование с человеком перед правкой. Документ живёт и эволюционирует вместе с внедрением.

---

## 19. Ссылки

- `arch-skills-mcp` — Batch Skills Review, Skill Impact Analysis
- `process-code-anchors` — формат @skill, @skill-anchor
- `process-skill-governance` — структура скиллов, Implementation Status
- `arch-testing-ci` — preflight-solo, Git Local CI Mirror
- `plan-skills-migration-registry` — реестр миграции, гейты, протоколы верификации и прошивки
- `docs/ais/ais-anti-staleness.md` — макро-спецификация антиустаревателя (образец полноты покрытия)
