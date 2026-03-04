---
id: plan-legacy-integrations-strategy
status: active
last_updated: "2026-03-04"
---

# План: Микропереход legacy-ссылок `integrations-strategy.md`

<!-- @causality #for-causality-harvesting #for-plan-iterative-improvement #for-integration-legacy-remediation #for-atomic-remediation -->

## Цель

Привести legacy-источник `integrations-strategy` в целевую точку через
`docs/ais/ais-integration-strategy-yandex.md` (`LIR-001`), сохранив полезную часть из donor-источника без потери контекста.

## Проблема

Сейчас в `is/yandex/functions/api-gateway/README.md` остаётся ссылка на legacy-источник (`LIR-001`), а сам целевой источник в `mmb` — `docs/ais/ais-integration-strategy-yandex.md`.

- есть несколько донорских копий `integrations-strategy.md` в разных источниках;
- в самом donor-файле присутствуют «чужеродные» ссылки (`core/config/...`, `core/api/...`) на старую/неактуальную архитектуру;
- для zero-noise нужно сначала выровнять источники и только потом массово убирать legacy-ссылки.

## Подход (пошагово)

### Этап 0. Критичные правила

- Контракты и гейты, которые уже существуют, применяются к этому этапу сразу:
  - `@skill` в коде и заголовках документации — трассировка источников (`validate-skill-anchors`).
  - `Implementation Status` в скиллах и AIS — проверка путей и существования (`validate-skills`, `validate-dead-links`).
  - Казуальные ссылки и rationale — через `#for-*` с обновлением `is/skills/causality-registry.md` (`validate-causality`, `validate-causality-invariant`).
- Для каждого переноса документации:
  1) Добавить причинный marker в местах принятия архитектурного решения в коде/доке.
  2) Добавить/актуализировать соответствующий hash в `causality-registry.md`.
  3) Зафиксировать в плане и реестре статус (`MAPPED`, `MISSING`, `DEFERRED`, `DONE`).

- Не делать глобальную замену по регулярке.
- Сначала зафиксировать, какой donor является каноническим для каждого случая.
- Для каждого path в donor-файле:
  - либо подтверждаем существующий эквивалент в `mmb`;
  - либо временно помечаем как `NEEDS_REWRITE`;
  - либо переносим в отдельный backlog-примечание.

#### 0.1. Режим исполнения: атомарный

- Один шаг = один legacy-путь.
- После каждого шага делается короткий чек-лист контроля и коррекция стратегии (без отката уже закрытых шагов).
- `NEEDS_REWRITE` и `REQUIRES_ARCH_CHANGE` остаются в `Path Rewrite Log` до отдельной валидации.

### Этап 1. Канонический источник

1. Собрать существующие donor-копии для `integrations-strategy.md` (по списку ссылок, найденных в системе).
2. Зафиксировать победителя по критериям:
   - актуальность структуры и содержимого под текущий Target App,
   - полнота разделов,
   - минимальное число legacy-оговорок (миграционных следов).
3. Для пилота текущей фазы считать каноническим источником:
   - `docs/ais/ais-integration-strategy-yandex.md` как целевую сборку после нормализации.
4. Оформить запись в `docs/plans/legacy-link-remediation-registry.md` со статусом `CANONICAL`.

### Этап 2. Нормализация целевого документа

1. Создать/обновить AIS:
   - `docs/ais/ais-integration-strategy-yandex.md`
2. Переписать описания и секции под текущую архитектуру `mmb`:
   - актуальные пути,
   - актуальные компоненты,
   - фактические API-контракты.
3. В тексте AIS явно отметить секцию:
   - `Path Rewrite Log`:
   - список старых ссылок на пересбор,
   - новый путь или обоснование `DEFERRED`.

### Этап 3. Замена ссылок только в пилоте

1. Изменить `is/yandex/functions/api-gateway/README.md`:
   - заменить ссылку на legacy-донор `integrations-strategy` на
     `docs/ais/ais-integration-strategy-yandex.md`.
2. Пробежать `npm run skills:batch-review` (или хотя бы `validate-dead-links.js --json`) после изменения.
3. Проверить, что новые ссылки валидны.

### Этап 4. Контур zero-noise

1. Для каждого следующего legacy-источника открыть отдельный пункт в этом же реестре.
2. Каждый пункт закрывать в статусе:
   - `DONE`: ссылка перенацелена на active paths,
   - `DEFERRED`: перенос отложен по инфраструктурной зависимости,
   - `REJECTED`: ссылка не нужна (источник артефакт).
3. Только после закрытия пилота расширять на другие интеграционные donor-ссылки.

### Этап 5. Казуальности как обязательный элемент миграции

#### 5.1 Правило

Все решения, принятые в ходе миграции, не остаются только в комментариях в плане:
- оформляется короткий `@causality`/`#for-*` rationale в коде или техническом описании,
- вносится/обновляется формулировка в `is/skills/causality-registry.md`,
- запись проходит проверку `validate-causality`.

#### 5.2 Минимум для текущего пилота

- Добавить/подтвердить hash rationale для:
  - перехода donor-ссылки (`a/...`) на AIS,
  - сохранения истории пути с `NEEDS_REWRITE`,
  - решения об отложенной миграции инфраструктурных участков.
- Зафиксировать эти же rationale в:
  - `docs/plans/legacy-link-remediation-registry.md`,
  - `docs/ais/ais-integration-strategy-yandex.md` (раздел `Path Rewrite Log`),
  - и в цепочке изменений по `LIR-001`.

### Этап 6. Ветвление уроков на лету

После каждого атомарного шага обновлять план следующими правилами:

- Если путь перепривязан корректно:
  - в `Path Rewrite Log` меняется статус на `MAPPED`;
  - фиксация rationale в `LIR-001`.
- Если путь отсутствует в текущей архитектуре:
  - статус `REQUIRES_ARCH_CHANGE`;
  - отдельно фиксируется причинистая запись для следующего этапа архитектуры.
- Если путь признан историческим и неактуальным:
  - статус `DEFERRED`;
  - подтверждение не как единственного источника.

Критерий выхода из пилота:

- все строки в `Path Rewrite Log` имеют итоговый статус (`MAPPED`/`DEFERRED`/`REQUIRES_ARCH_CHANGE`);
- для каждого статуса записан `rationale` hash;
- запись `LIR-001` переведена в `DONE`.

### Этап 7. Атомарный чек-лист в реестре

Ниже фиксируем прогон по шагам:

- `LIR-001.A1` — валидация `core/config/app-config.js` как действующего SSOT в mmb.
- `LIR-001.A1.2` — подтверждение отсутствия `core/config/integration-config.js` и фиксация `REQUIRES_ARCH_CHANGE`.
- `LIR-001.A2` — валидация `core/api/integration-manager.js` как legacy/неактуальный путь.
- `LIR-001.A3` — факт входящей миграции legacy-donor `integrations-strategy` уже закрыт (`DONE`) и зафиксирован как `MAPPED` в AIS.
- `LIR-002.A1` — `is/cloudflare/edge-api/README.md`: `integrations-cloudflare-core` заменен на `docs/ais/ais-infrastructure-integrations.md` (`DONE`).
- `LIR-002.A2` — `LIR-002` атом `integrations-cloudflare-plan`: подтверждено `MAPPED` в AIS.
- `LIR-002.A3` — `LIR-002` атом `integrations-cloudflare-testing`: подтверждено `MAPPED` в AIS.
- `LIR-002.A4` — `is/cloudflare/edge-api/DEPLOY_INSTRUCTIONS.md`: legacy-документация переведена в AIS, сохранена только как история.
- `LIR-003.A1` — `is/cloudflare/edge-api/README.md`: локальные `cloud/cloudflare/workers` пути переведены в `is/cloudflare/edge-api`.
- `LIR-003.A2` — `is/cloudflare/edge-api/DEPLOY_INSTRUCTIONS.md`: пути к `wrangler.toml` и `src/api-proxy.js` приведены к активной структуре.
- `LIR-003.A3` — `is/cloudflare/edge-api/CREATE_KV_NAMESPACE.md`: путь выполнения команды `cd` переведен в активную структуру.
- `LIR-004.A1` — `is/cloudflare/edge-api/README.md`: legacy-ссылки на donor-доки теперь указывают на `ais-infrastructure-integrations` с явным привязочным `LIR-*`.
- `LIR-004.A2` — `is/cloudflare/edge-api/DEPLOY_INSTRUCTIONS.md`: legacy-ссылка на donor переведена в трассируемую AIS-метку (`LIR-002.A1`).
- `LIR-005.A1` — `core/config/portfolio-config.js`: hardening reference теперь на `ais-portfolio-controls` (`LIR-005.A1`).
- `LIR-005.A2` — `core/domain/portfolio-engine.js`: legacy hardening reference теперь на `ais-portfolio-controls` (`LIR-005.A2`).
- `LIR-005.A3` — `core/domain/portfolio-engine.js`: второй hardening reference теперь на `ais-portfolio-controls` (`LIR-005.A3`).
- `LIR-005.A4` — `core/domain/portfolio-validation.js`: hardening reference теперь на `ais-portfolio-controls` (`LIR-005.A4`).
- `LIR-005.A5` — `styles/wrappers/button-group.css`: styling-principles reference теперь на `ais-portfolio-controls` (`LIR-005.A5`).
- `LIR-005.A6` — `styles/wrappers/button.css`: styling-principles reference теперь на `ais-portfolio-controls` (`LIR-005.A6`).
- `LIR-005.A7` — `styles/wrappers/dropdown-menu-item.css`: styling-principles reference теперь на `ais-portfolio-controls` (`LIR-005.A7`).
- `LIR-005.A8` — `styles/wrappers/dropdown.css`: styling-principles reference теперь на `ais-portfolio-controls` (`LIR-005.A7`).
- `LIR-005.A9` — `styles/wrappers/button.css`: layout-alignment reference теперь на `ais-portfolio-controls` (`LIR-005.A8`).

`LIR-003` отмечен как завершенный после закрытия атомов A1..A3.

- `LIR-006.A1` — `is/skills/arch-control-plane.md`: `control-plane/` заменен на AIS-индикатор (`LIR-006.A1`).
- `LIR-006.A2` — `is/skills/arch-control-plane.md`: `logs/control-plane.log` заменен на AIS-индикатор (`LIR-006.A2`).
- `LIR-006.A3` — `is/skills/arch-dependency-governance.md`: `control-plane/scripts/self-test.js` заменен на AIS-индикатор (`LIR-006.A3`).
- `LIR-006.A4` — `is/skills/arch-foundation.md`: `shared/component` заменен на AIS-индикатор (`LIR-006.A4`).
- `LIR-006.A5` — `is/skills/arch-foundation.md`: `shared/utility` заменен на AIS-индикатор (`LIR-006.A5`).
- `LIR-006.A6` — `is/skills/arch-testing-ci.md`: legacy `control-plane/*` в триггерах проверок помечен как `NEEDS_REWRITE` (`LIR-006.A6`).
- `LIR-006.A7` — `is/skills/arch-foundation.md`: `control-plane/scripts/self-test.js` заменен на AIS-индикатор (`LIR-006.A7`).
- `LIR-007.A1` — `is/skills/arch-mcp-ecosystem.md`: `.github/copilot-instructions.md` remap на AIS лог (`LIR-007.A1`).
- `LIR-007.A2` — `is/skills/arch-mcp-ecosystem.md`: `/api/logs` marked as HTTP route contract (`LIR-007.A2`).
- `LIR-007.A3` — `is/skills/arch-cloudflare-infrastructure.md`: legacy `health` notation remapped через AIS (`LIR-007.A3`).
- `LIR-007.A4` — `is/skills/arch-cloudflare-infrastructure.md`: `docs/A_CLOUDFLARE.md` historical reference (`LIR-007.A4`).
- `LIR-007.A5` — `is/skills/arch-cloudflare-infrastructure.md`: `cloud/cloudflare/workers/migrations/` → `is/cloudflare/edge-api/migrations` (`LIR-007.A5`).
- `LIR-007.A6` — `is/skills/arch-cloudflare-infrastructure.md`: `wrangler.toml` → `is/cloudflare/edge-api/wrangler.toml` (`LIR-007.A6`).
- `LIR-007.A7` — `is/skills/arch-cloudflare-infrastructure.md`: `src/auth.js` и связанные локальные `src/*` пути remapped (`LIR-007.A7`).
- `LIR-007.A8` — `is/skills/arch-skills-mcp.md`: `SKILL_CANDIDATES.json` legacy lifecycle mapping (`LIR-007.A8`).
- `LIR-007.A9` — `is/skills/arch-skills-mcp.md`: `drafts/tasks/` legacy lifecycle mapping (`LIR-007.A9`).
- `LIR-007.A10` — `is/skills/arch-skills-mcp.md`: `skills/MIGRATION.md` legacy marker mapped to anti-staleness log (`LIR-007.A10`).
- `LIR-007.A11` — `is/skills/process-ai-collaboration.md`: `AI/PRO/mmb` legacy reference tracking added (`LIR-007.A11`).
- `LIR-008.A1` — `is/skills/arch-layout-governance.md`: `is/scripts/architecture/` mapped via `docs/ais/ais-architecture-foundation.md#LIR-008.A1`.
- `LIR-008.A2` — `is/skills/arch-layout-governance.md`: `is/scripts/infrastructure/` mapped via `docs/ais/ais-architecture-foundation.md#LIR-008.A2`.
- `LIR-008.A3` — `is/skills/arch-layout-governance.md`: `is/scripts/secrets/` mapped via `docs/ais/ais-architecture-foundation.md#LIR-008.A3`.
- `LIR-008.A4` — `is/skills/arch-layout-governance.md`: `is/scripts/tests/` mapped via `docs/ais/ais-architecture-foundation.md#LIR-008.A4`.
- `LIR-009.A1` — `is/skills/process-ai-collaboration.md`: `docs/drafts/` normalized via `docs/ais/ais-docs-governance.md#LIR-009.A1`.
- `LIR-009.A2` — `is/skills/process-ai-collaboration.md`: `drafts/` normalized via `docs/ais/ais-docs-governance.md#LIR-009.A2`.
- `LIR-009.A3` — `is/skills/process-ai-collaboration.md`: `fixes-tracking.md` mapped to `docs/backlog/fixes-tracking.md` (`LIR-009.A3`).
- `LIR-009.A4` — `is/skills/process-ai-collaboration.md`: `handoff-note.md` и `session-report.md` routed to backlog via `docs/ais/ais-docs-governance.md#LIR-009.A4`.
- `LIR-010.A1` — `docs/ais/ais-integration-strategy-yandex.md`: `core/contracts/...` remapped к `core/contracts/market-contracts.js` (`LIR-010.A1`).
- `LIR-010.A2` — `docs/ais/ais-integration-strategy-yandex.md`: `core/api/...` remapped к `core/api/market-snapshot-service.js` + runtime modules (`LIR-010.A2`).
- `LIR-011.A1` — `is/skills/process-skill-governance.md`: `core/is/skills/` path corrected to `core/skills/`.
- `LIR-011.A2` — `is/skills/process-skill-governance.md`: `app/is/skills/` path corrected to `app/skills/`.
- `LIR-011.A3` — `is/skills/process-skill-governance.md`: `core/skills/everything.md` deprecated reference replaced with `plan-skills-migration-registry`.
- `LIR-012.A1` — `docs/ais/ais-docs-governance.md`: `docs/drafts` (без `/`) added to dead-link skip contract.
- `LIR-012.A2` — `docs/ais/ais-docs-governance.md`: `core/is/skills/` + `app/is/skills/` legacy tokens normalized via skip contract.
- `LIR-012.A3` — `docs/ais/ais-docs-governance.md`: `core/skills/everything.md` historical marker routed through skip contract.
- `LIR-012.A4` — `docs/ais/ais-integration-strategy-yandex.md`: `core/config/integration-config.js` and `core/api/integration-manager.js` excluded as known REQUIRES_ARCH_CHANGE.
- `LIR-012.A5` — `docs/ais/TEMPLATE.md`: placeholders (`related_skills/related_ais`, `legacy/path`, `docs/...`) excluded from dead-link gate.
- `LIR-013.A1` — `is/skills/process-lib-governance.md`: `core/lib-loader.js`, `lib-loader.js`, `zod/v4` normalized to active module-loader contract (`core/module-loader.js`, `core/modules-config.js`).
- `LIR-014.A1` — `is/skills/arch-layout-governance.md`: `lib-loader.js` normalized to `core/module-loader.js` + `core/modules-config.js`.
- `LIR-014.A2` — `is/skills/arch-layout-governance.md`: `libs/assets/coins/` marked as deferred `REQUIRES_ARCH_CHANGE` in architecture AIS log.
- `LIR-015.A1` — `is/skills/arch-backend-core.md`: `scripts/sqlite-health-snapshot.js` remapped to active infrastructure diagnostics command `node is/scripts/infrastructure/health-check.js`.
- `LIR-016.A1` — `is/skills/arch-skills-mcp.md`: lifecycle buckets `skills/` + `archive/` replaced with explicit active/deferred target paths.
- `LIR-017.A1` — `is/skills/process-ai-collaboration.md`: donor token `AI/PRO/mmb` replaced with neutral legacy-plan wording linked to AIS status.
- `LIR-018.A1` — `is/skills/arch-control-plane.md`: inline legacy token `logs/control-plane.log` replaced with AIS-linked generic event-log marker.
- `LIR-019.A1` — `is/skills/arch-mcp-ecosystem.md`: generic `node scripts/xyz.js` example replaced with explicit SSOT infra command.
- `LIR-020.A1` — `is/skills/process-ai-collaboration.md`: mixed-language donor note rewritten to English neutral donor-repository wording.
- `LIR-021.A1` — `docs/ais/ais-docs-governance.md`: encoding risk (`mojibake` tokens) formalized with UTF-8 guard and remediation marker.
- `LIR-021.A2` — final checkpoint: `validate-dead-links`, `validate-docs-ids`, `validate-skill-anchors` passed after remediation batches.
- `LIR-022.A1` — `docs/ais/ais-docs-governance.md`: recurrent decode regression fixed by explicit UTF-8 BOM rewrite.
- `LIR-022.A2` — added automated encoding gate (`validate-docs-encoding.js`) and integrated it into `preflight` + npm script `docs:encoding:validate`.

На практике второй батч завершен:
- `LIR-002` переведен в `DONE` после закрытия всех атомов `A1..A3`.
- `LIR-007` переведен в `DONE` после завершения атомов `A1..A9`.
- `LIR-008` переведен в `DONE` после завершения атомов `A1..A4`.
- `LIR-009` переведен в `DONE` после завершения атомов `A1..A4`.
- `LIR-010` переведен в `DONE` после завершения атомов `A1..A2`.
- `LIR-011` переведен в `DONE` после завершения атомов `A1..A3`.
- `LIR-012` переведен в `DONE` после завершения атомов `A1..A5`.
- `LIR-013` переведен в `DONE` после завершения атома `A1`.
- `LIR-014` переведен в `DONE` после завершения атомов `A1..A2`.
- `LIR-015` переведен в `DONE` после завершения атома `A1`.
- `LIR-016` переведен в `DONE` после завершения атома `A1`.
- `LIR-017` переведен в `DONE` после завершения атома `A1`.
- `LIR-018` переведен в `DONE` после завершения атома `A1`.
- `LIR-019` переведен в `DONE` после завершения атома `A1`.
- `LIR-020` переведен в `DONE` после завершения атома `A1`.
- `LIR-021` переведен в `DONE` после завершения атомов `A1..A2`.
- `LIR-022` переведен в `DONE` после завершения атомов `A1..A2`.

По мере завершения каждого атома обновлять статус в `docs/plans/legacy-link-remediation-registry.md`.

## Ответ на вопрос «переписывать все внутренние core/config и core/api ссылки»

Не сейчас во всех сразу.

Для этого кейса:

- Сначала переписать только точки входа (внешние ссылки из active docs на donor-контент).
- Затем в AIS оформить инвентарь внутренних ссылок:
  - `KEEP_PENDING` для исторического контекста,
  - `MAPPED` после подтверждения нового пути,
  - `REQUIRES_ARCH_CHANGE` если путь отсутствует в текущей архитектуре.
- Только после этого выполнять адресную нормализацию внутри AIS/content.

## Реестр этапа

- Главный реестр: `docs/plans/legacy-link-remediation-registry.md`.
- Ответственный: текущий чат/инициатор миграции.
- Целевая метрика: пилот закрыл 1 источник без появления новых шумных dead links.
