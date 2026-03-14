---
id: plan-causality-graph
status: pending
last_updated: "2026-03-14"
related_skills:
  - sk-8f9e0d
  - sk-3225b2
  - sk-3b1519
  - sk-8991cd
  - sk-9e4f2a
related_ais:
  - ais-8d3c2a
  - ais-b6c7d8
  - ais-e9a5c2

---

# План: Модернизация Causality Graph Tools (расширенный вариант)

> **Context**: Полная реализация инструментов обхода графа казуальностей для ИИ-агентов: MCP tools, расширение сканера, контракты, skill, AIS-обновления, Cursor rules. План выполняется строго по id:sk-8f9e0d (process-plan-execution).

## Гибкость плана

**План — живой документ.** При исполнении агенты вправе и обязаны вносить в него правки, если обнаруживают недостающие шаги, более удачный порядок или необходимые safeguards. Условие: backward compatibility — изменения не должны инвалидировать уже полученные результаты. См. #for-plan-iterative-improvement и Rule 7 в id:sk-8f9e0d (process-plan-execution).

## Цель и Scope

**Цель:** Дать агентам быстрый, надёжный доступ к графу казуальностей (#for-X ↔ код/skills) через MCP tools вместо ручного grep/read, снизить ментальную нагрузку и повысить полноту impact-анализа при рефакторинге.

**Scope:**
- Три MCP tools: `get_causality_files`, `get_causality_reverse`, `resolve_causality_context`
- Расширение сканера: skills, AIS, Cursor rules (anchor_type)
- Схема dependency_graph: добавление `line_number`
- Контракт путей сканирования (SSOT)
- Парсер causality-registry с graceful degradation
- Skill «Causality graph tools», обновление AIS MCP, Cursor rules
- Интеграция в pre-report protocol

## Критичный порядок внесения изменений

Изменения в архитектуре должны предшествовать реализации. Порядок обязателен.

```
1. Контракты (causality-scan)     → SSOT путей
2. Схема БД (line_number)         → миграция dependency_graph
3. Расширение сканера             → validate-causality-invariant
4. Парсер registry                → модуль parse-causality-registry
5. MCP tools                      → handlers + index
6. Skill + AIS + Cursor rules     → документация
7. Pre-report integration         → правило
```

---

## Phase 1: Архитектурные контракты

### Step 1.1: Контракт путей сканирования казуальностей

**Файл:** `is/contracts/causality-scan-contracts.js` (новый)

**Содержимое:**
- `CAUSALITY_SCAN_DIRS` — массив `{ dir, ext, anchorType }`:
  - `{ dir: 'is', ext: '.js', anchorType: 'anchor' }`
  - `{ dir: 'core', ext: '.js', anchorType: 'anchor' }`
  - `{ dir: 'app', ext: '.js', anchorType: 'anchor' }`
  - `{ dir: 'shared', ext: '.js', anchorType: 'anchor' }`
  - `{ dir: 'is/skills', ext: '.md', anchorType: 'skill' }`
  - `{ dir: 'core/skills', ext: '.md', anchorType: 'skill' }`
  - `{ dir: 'app/skills', ext: '.md', anchorType: 'skill' }`
  - `{ dir: 'docs/ais', ext: '.md', anchorType: 'ais' }`
  - `{ dir: '.cursor/rules', ext: '.mdc', anchorType: 'rule' }`
- `CAUSALITY_SCAN_EXCLUDE` — Set путей/паттернов (docs/plans, docs/backlog, docs/done, TEMPLATE.md и др.)
- Экспорт ROOT из path-contracts

**Верификация:** `node -e "import('./is/contracts/causality-scan-contracts.js').then(m => console.log(m.CAUSALITY_SCAN_DIRS))"`

**Causality:** `#for-ssot-paths` — единый источник путей сканирования.

---

## Phase 2: Схема БД и миграция

### Step 2.1: Добавить колонку line_number в dependency_graph

**Файл:** `is/mcp/db.js`

**Изменения:**
- В `initSchema()` добавить миграцию:
  ```sql
  ALTER TABLE dependency_graph ADD COLUMN line_number INTEGER NULL;
  ```
- Выполнять только если колонки нет (`PRAGMA table_info(dependency_graph)`)

**Верификация:** Запустить MCP, выполнить `SELECT * FROM dependency_graph LIMIT 1` — колонка присутствует.

**Causality:** `#for-explicit-links` — точная навигация по строкам.

---

## Phase 3: Расширение сканера

### Step 3.1: Рефакторинг validate-causality-invariant.js

**Файл:** `is/scripts/architecture/validate-causality-invariant.js` (#JS-eG4BUXaS)

**Изменения:**
1. Импорт `CAUSALITY_SCAN_DIRS`, `CAUSALITY_SCAN_EXCLUDE` из `causality-scan-contracts.js`
2. Заменить жёстко закодированные `CODE_DIRS`, `walkJsFiles` на универсальный walk по `CAUSALITY_SCAN_DIRS`
3. Для каждого файла: извлекать хеши из строк (с учётом формата .md/.mdc: `#for-X` в таблице, в Reasoning, в комментариях)
4. Сохранять `line_number` при вставке в dependency_graph
5. Использовать `anchor_type` из контракта (anchor/skill/ais/rule)

**Регулярные выражения для .md/.mdc:**
- Skills/AIS: `#(?:for|not)-[\w-]+` в любом контексте (Reasoning, таблица, текст)
- Учитывать frontmatter и таблицы markdown

**Верификация:**
- `npm run preflight` — проходит
- `SELECT anchor_type, COUNT(*) FROM dependency_graph GROUP BY anchor_type` — показывает anchor, skill, ais, rule

---

## Phase 4: Парсер causality-registry

### Step 4.1: Модуль parse-causality-registry.js

**Файл:** `is/contracts/docs/parse-causality-registry.js` (новый)

**API:**
- `parseCausalityRegistry()` → `Map<hash, { formulation, enforcement }>`
- Парсинг таблицы: `| \`#for-X\` | advisory | Formulation |`
- Graceful degradation: при ошибке парсинга возвращать пустой Map, не бросать
- Читать `is/skills/causality-registry.md` через ROOT

**Верификация:** `node -e "import('./is/contracts/docs/parse-causality-registry.js').then(m => console.log(m.parseCausalityRegistry().size))"` — число > 0.

**Causality:** `#for-mcp-data-contour` — SSOT читается с диска, нет кэша в SQLite.

---

## Phase 5: MCP Tools

### Step 5.1: Создать causality-graph-tools.js

**Файл:** `is/mcp/tools/causality-graph-tools.js` (новый)

**Tools:**

| Tool | Input | Output | Описание |
|------|-------|--------|----------|
| `get_causality_files` | `{ hash, limit?, include_formulation? }` | `{ files, formulation?, meta }` | hash → файлы; опционально formulation |
| `get_causality_reverse` | `{ file, limit?, anchor_types? }` | `{ hashes, meta }` | file → хеши |
| `resolve_causality_context` | `{ hash, include_formulation?, include_cooccurring?, limit? }` | `{ formulation, files, cooccurring_hashes?, meta }` | полный контекст |

**Контракт вывода (meta):**
- `hash_in_registry: boolean`
- `anchor_count?: number`
- `last_synced_hint?: string` (optional, если доступно)

**Надёжность:**
- Hash validation: если хеш не в registry — `hash_in_registry: false`, formulation пустой
- Deduplication: cooccurring_hashes — уникальные значения
- limit default 50
- isError при неверном input

**Верификация:** Вызвать каждый tool через MCP; проверить структуру ответа.

---

### Step 5.2: Регистрация tools в index.js

**Файл:** `is/mcp/index.js`

**Изменения:**
- Импорт tool defs и handlers
- Добавить в ListToolsRequestSchema
- Добавить в CallToolRequestSchema

---

## Phase 6: Документация и правила

### Step 6.1: Skill «Causality graph tools»

**Файл:** `is/skills/mcp-causality-graph-tools.md` (новый)

**Prefix:** `mcp-` (из SKILL_ALLOWED)

**Содержание:**
- When to Use: перед рефакторингом кода с казуальностью; при объяснении «почему так»; при оценке impact
- Tools: описание каждого, примеры вызовов
- Триггеры: «рефакторинг», «#for-», «causality», «impact»

**Верификация:** `npm run skills:check` — проходит; prefix зарегистрирован (если требуется).

---

### Step 6.2: Обновить AIS MCP Data Flow

**Файл:** `docs/ais/ais-mcp-data-flow.md` (id:ais-8d3c2a)

**Изменения:**
- Секция «Будущие tools» → «Causality graph tools (реализовано)»
- Таблица tools: get_causality_files, get_causality_reverse, resolve_causality_context
- Контракт формата ответа (files, hashes, formulation, meta)

---

### Step 6.3: Обновить arch-mcp-ecosystem

**Файл:** `is/skills/arch-mcp-ecosystem.md` (id:sk-3225b2)

**Изменения:**
- Добавить подсекцию «Causality graph tools» с ссылкой на mcp-causality-graph-tools

---

### Step 6.4: Cursor rule для агентов

**Файл:** `.cursor/rules/agent-causality-graph.mdc` (новый)

**Содержание:**
- Триггер: задачи с рефакторингом, казуальностью, #for-X, impact analysis
- Действие: использовать get_causality_reverse / get_causality_files / resolve_causality_context вместо grep
- Краткое описание каждого tool

---

### Step 6.5: Интеграция в pre-report-docs-sync

**Файл:** `.cursor/rules/global-rules/pre-report-docs-sync-always.mdc`

**Изменения:**
- В checklist добавить: «Если задача затронула код с @causality — проверить impact через get_causality_reverse перед отчётом»

---

## Phase 7: Ресурс causality_graph:// (опционально)

Существующий ресурс `causality_graph://` можно оставить для обратной совместимости; tools дублируют и расширяют функциональность. Решение: оставить resource, не удалять.

---

## Добавление Causalities

При выполнении плана добавить в `is/skills/causality-registry.md`:

| Hash | Enforcement | Formulation |
|------|-------------|-------------|
| `#for-causality-graph-tools` | advisory | MCP tools (get_causality_files, get_causality_reverse, resolve_causality_context) provide structured traversal of the causality graph. Agents should use them for impact analysis and refactoring instead of manual grep/read. |
| `#for-causality-scan-contract` | advisory | Paths and file types for causality scanning are centralized in causality-scan-contracts.js. validate-causality-invariant reads from this SSOT to avoid drift. |

---

## Регистрация артефактов

- **Code files:** добавить в code-file-registry.json (generate после создания)
- **Skill:** добавить в id-registry.json (generate-id-registry)
- **Plan:** после завершения — docs/done/, distill в AIS + skill

---

## Проверочные команды (чеклист)

| Шаг | Команда |
|-----|---------|
| После 1.1 | `node -e "import('./is/contracts/causality-scan-contracts.js')"` |
| После 2.1 | `npm run preflight` (или sqlite3 data/mcp.sqlite "PRAGMA table_info(dependency_graph)") |
| После 3.1 | `npm run preflight`; `npm run skills:check` |
| После 4.1 | `node -e "import('./is/contracts/docs/parse-causality-registry.js').then(m => console.log(m.parseCausalityRegistry().size))"` |
| После 5.x | Ручной вызов MCP tools через Cursor |
| После 6.x | `npm run skills:check`; `npm run ssot:check` |
| Финально | `npm run preflight`; все checks green |

---

## Зависимости и риски

- **Зависимость:** preflight вызывает validate-causality-invariant; расширение сканера может увеличить время preflight незначительно
- **Риск:** парсер causality-registry сломается при изменении формата таблицы — graceful degradation обязателен
- **Риск:** EXCLUDE_CAUSALITY должен корректно исключать docs/plans, docs/backlog и т.д., иначе планы попадут в граф

---

## Ссылки

- #JS-eG4BUXaS (validate-causality-invariant.js)
- #JS-YD283xUP (db.js)
- #JS-HU3hEyDe (resources.js)
- #JS-3M2cDJyX (mcp/index.js)
- id:sk-8f9e0d (process-plan-execution)
- id:sk-3225b2 (arch-mcp-ecosystem)
- id:ais-8d3c2a (ais-mcp-data-flow)
