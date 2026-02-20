# MIGRATION.md — Реестр миграции скилов MBB → MMB

> Живой документ. Обновляется по мере переноса скилов.
> Когда все нужные скилы перенесены — этот файл удаляется.
>
> **Статусы:**
> - `[ ]` pending — ещё не перенесён
> - `[~]` partial — перенесён частично, требует доработки
> - `[x]` done — перенесён и адаптирован (запись можно удалить)
> - `[-]` skip — не мигрирует (MBB-специфика навсегда)
>
> **Как переносить:**
> 1. Скопировать файл из MBB в нужную категорию `mmb/skills/`
> 2. Добавить в frontmatter: `migrated_from`, `migration_status`, `migration_notes`
> 3. Обновить `relations:` — заменить пути на ID
> 4. Убрать MBB-специфичные ссылки в тексте
> 5. Удалить строку из этого файла (или пометить `[x]`)

---

## Статистика

- Всего в MBB: ~195 скилов (41 all + 154 mbb)
- Из них мета-скилов: 30 (выявлены ревизией 2026-02-20)
- Перенесено: 0
- Частично: 0
- Пропущено (skip): 0
- Ожидают: 195

---

## Мета-скилы → `skills/meta/` (приоритет: первыми)

> Выявлены ревизией 2026-02-20. Мигрируют в `skills/meta/` — не в `process/`.
> Папка `meta/` исключена из `audit_skill_coverage`.

### Из `skills/all/` (16 мета-скилов)

- [ ] `process-skill-template` → `skill-template` — **приоритет №1**: шаблон скила
- [ ] `process-skills-lifecycle` → `skills-lifecycle` — жизненный цикл скилов
- [ ] `process-skills-scope-routing` → `skills-scope-routing` — куда класть скилы (адаптировать: одна папка)
- [ ] `process-skills-granularity` → `skills-granularity` — правила размера скила
- [ ] `process-skills-language-policy` → `skills-language-policy` — языковая политика
- [ ] `process-skill-code-loop-anchors` → `skill-code-anchors` — **приоритет**: anchors в коде
- [ ] `process-code-header-skill-links` → `code-header-links` — header links в JS-файлах
- [ ] `process-ssot-crosslinks` → `ssot-crosslinks` — SSOT и перекрёстные ссылки
- [ ] `process-doc-levels` → `doc-levels` — уровни документации
- [ ] `process-doc-style` → `doc-style` — стиль документации
- [ ] `process-doc-updates` → `doc-updates` — обновление документации
- [ ] `process-release-categorization` → `release-categorization` — Task vs Skill vs Task&Skill
- [ ] `process-agent-commands` → `agent-commands` — словарь команд агента
- [ ] `process-multi-agent-collaboration` → `multi-agent-collaboration` — мульти-агентное взаимодействие
- [ ] `process-continue-ai-subagents` → `continue-subagents` — субагенты Continue AI
- [ ] `process-session-handoff` → `session-handoff` — передача сессии и backup

### Из `skills/mbb/` (14 мета-скилов)

- [ ] `autonomous-skill-synthesis` → `autonomous-skill-synthesis` — автосинтез скилов из сигналов
- [ ] `agentic-self-correction` → `agentic-self-correction` — самокоррекция агентов
- [ ] `process-batch-skills-review` → `batch-skills-review` — пакетный аудит базы скилов
- [ ] `process-skill-pipeline` → `skill-pipeline` — пайплайн: сигнал → кандидат → скил
- [ ] `process-skill-quality-validation` → `skill-quality-validation` — критерии качества скила
- [ ] `process-skill-watcher` → `skill-watcher` — обнаружение знаний из коммитов
- [ ] `process-skills-bridge` → `skills-bridge` — мост агентов и UI управления скилами
- [ ] `process-skills-curation-intelligence` → `skills-curation` — интеллектуальная курация базы
- [ ] `process-future-skill-impact-analysis` → `skill-impact-analysis` — анализ влияния изменений
- [ ] `process-commit-skill-extraction` → `commit-skill-extraction` — извлечение скилов из коммитов
- [ ] `process-commit-analysis-heuristics` → `commit-analysis-heuristics` — эвристики анализа коммитов
- [ ] `process-dynamic-context-management` → `dynamic-context-management` — динамическое управление контекстом
- [ ] `process-orchestrator-evolution` → `orchestrator-evolution` — эволюция оркестратора (адаптировать: без .cursorrules)
- [ ] `protocol-agent-core` → `agent-core-protocol` — фундаментальные правила агента
- [ ] `skill-based-playbooks` → `skill-playbooks` — философия скилов как модульного интеллекта
- [ ] `skills-architecture-ssot` → `skills-architecture-ssot` — SSOT архитектуры системы скилов

---

## Источник 1: `skills/all/` (~41 скил)

Универсальные скилы — кандидаты на перенос в первую очередь.

### process/

- [ ] `process-agent-commands` — команды агентов
- [ ] `process-code-header-skill-links` — заголовки файлов со ссылками на скилы
- [ ] `process-coin-set-merge-consistency` — MBB-специфика, смотреть по ситуации
- [ ] `process-coingecko-file-protocol-topn` — MBB-специфика, смотреть по ситуации
- [ ] `process-continue-ai-subagents` — Continue AI субагенты
- [ ] `process-doc-levels` — уровни документации
- [ ] `process-doc-style` — стиль документации
- [ ] `process-doc-updates` — обновление документации
- [ ] `process-multi-agent-collaboration` — мульти-агентное взаимодействие
- [ ] `process-n8n-mcp-integration` — интеграция n8n и MCP
- [ ] `process-n8n-security-oauth-protocols` — безопасность n8n
- [ ] `process-n8n-workflow-hygiene` — гигиена воркфлоу n8n
- [ ] `process-nodejs-v25-api-preview` — Node.js API preview
- [ ] `process-ollama-v015-improvements` — улучшения Ollama
- [ ] `process-paths-management` — **приоритет**: адаптировать под новый `paths.js`
- [ ] `process-release-categorization` — категоризация релизов
- [ ] `process-session-handoff` — передача сессии
- [ ] `process-skill-code-loop-anchors` — **приоритет**: skill anchors в коде
- [ ] `process-skill-template` — **приоритет**: шаблон скила (нужен сразу)
- [ ] `process-skills-granularity` — гранулярность скилов
- [ ] `process-skills-language-policy` — языковая политика скилов
- [ ] `process-skills-lifecycle` — **приоритет**: жизненный цикл скилов
- [ ] `process-skills-scope-routing` — **приоритет**: адаптировать (одна папка вместо двух)
- [ ] `process-ssot-crosslinks` — SSOT и перекрёстные ссылки
- [ ] `process-windows-docker-paths` — пути Windows/Docker
- [ ] `protocol-command-omk` — протокол краткости ОМК
- [ ] `protocol-command-vzp` — протокол планового выполнения ВЗП

### protocols/

- [ ] `protocol-commit` — **приоритет**: правила коммитов

### libs/

- [ ] `libs-policy` — политика использования библиотек
- [ ] `libs-repo-workflow` — воркфлоу репозитория библиотек
- [ ] `libs-zod-v4-migration-plan` — план миграции Zod v4

### security/

- [ ] `skill-secrets-hygiene` — **приоритет**: работа с секретами

### troubleshooting/

- [ ] `docker-code-not-updating` — код не обновляется в Docker
- [ ] `docker-port-shadow-diagnosis` — диагностика теневых портов Docker
- [ ] `docker-v29-overlay-regression` — регрессия overlay Docker v29

### index/ (не мигрируют — индексы генерируются заново)

- [-] `index-architecture` — будет пересоздан для MMB
- [-] `index-operations` — будет пересоздан для MMB

---

## Источник 2: `skills/mbb/` (~154 скила)

Проектные скилы MBB. Мигрируют по мере появления соответствующего кода в MMB.

### architecture/

- [ ] `architecture-client-vs-cloud` — клиент vs облако
- [ ] `architecture-core-stack` — основной стек
- [-] `architecture-dom-markup` — MBB DOM-разметка (не мигрирует)
- [ ] `architecture-loading` — стратегия загрузки
- [ ] `architecture-mcp-ui-interaction` — взаимодействие MCP и UI
- [ ] `architecture-relative-paths` — относительные пути
- [ ] `architecture-ssot` — SSOT архитектура
- [ ] `architecture-versioning` — версионирование
- [ ] `llm-fallback-mechanism` — механизм fallback для LLM
- [ ] `skills-architecture-ssot` — SSOT архитектуры скилов

### archive/ (не мигрируют — устаревшие)

- [-] `integrations-status` — устаревший статус интеграций
- [-] `integrations-strategy` — устаревшая стратегия интеграций

### cache/ (не мигрируют — MBB-специфика)

- [-] `cache-keys` — MBB-специфичные ключи кэша
- [-] `cache-strategy` — MBB-специфичная стратегия кэша
- [-] `cache-versioning` — MBB-специфичное версионирование кэша

### cloud/ (не мигрируют — Yandex Cloud для MBB)

- [-] `yandex-cloud-function-code` — код Yandex Cloud функции
- [-] `yandex-cloud-function-steps-guide` — гайд по Yandex Cloud
- [-] `yandex-get-api-key` — получение API ключа Yandex

### components/ (не мигрируют — MBB UI-компоненты)

- [-] `components-bootstrap`
- [-] `components-boundaries`
- [-] `components-class-manager`
- [-] `components-column-visibility`
- [-] `components-icon-manager`
- [-] `components-layout-alignment`
- [-] `components-localization`
- [-] `components-modal-buttons`
- [-] `components-responsive-visibility`
- [-] `components-ssot`
- [-] `components-styling-principles`
- [-] `components-template-split`
- [-] `components-tooltips`
- [-] `ui-components-unified`

### core-systems/ (не мигрируют — MBB бизнес-логика)

- [-] `auto-coin-sets`
- [-] `messages-keys-and-config`
- [-] `messages-translator`
- [-] `messages-ui-and-lifecycle`
- [-] `workspace-config`

### integrations/

- [ ] `continue-cli-mcp-integration-nuances` — нюансы интеграции Continue CLI и MCP
- [ ] `integration-artificial-analysis-iq` — интеграция Artificial Analysis IQ
- [ ] `integration-mcp-sdk-security-rollout` — безопасность MCP SDK
- [ ] `integrations-ai-core` — ядро AI интеграций
- [ ] `integrations-api-proxy` — API прокси
- [ ] `integrations-auth-worker-restore` — восстановление auth worker
- [ ] `integrations-cloudflare-core` — Cloudflare ядро
- [ ] `integrations-cloudflare-plan` — план Cloudflare
- [ ] `integrations-cloudflare-testing` — тестирование Cloudflare
- [ ] `integrations-continue-cli-mistral` — Continue CLI + Mistral
- [ ] `integrations-continue-mcp-setup` — настройка Continue + MCP
- [ ] `integrations-data-provider-resilience` — устойчивость провайдеров данных
- [ ] `integrations-data-providers` — провайдеры данных
- [ ] `integrations-llm-providers-config` — конфигурация LLM провайдеров
- [ ] `integrations-n8n-api-access` — доступ к API n8n
- [ ] `integrations-n8n-code-node-v2` — code node v2 в n8n
- [ ] `integrations-n8n-docker-internals` — внутренности n8n в Docker
- [ ] `integrations-n8n-local-setup` — локальная настройка n8n
- [ ] `integrations-oauth-file-protocol` — OAuth через file://
- [ ] `integrations-overview` — обзор интеграций
- [ ] `integrations-postgres` — PostgreSQL интеграция
- [ ] `integrations-rate-limiting` — ограничение запросов
- [ ] `mcp-server-yaml-parsing` — парсинг YAML в MCP сервере
- [ ] `perplexity-connect` — подключение Perplexity

### libs/

- [ ] `libs-mbb-auto-activation` — автоактивация библиотек
- [ ] `libs-mbb-config` — конфигурация библиотек
- [ ] `libs-metadata-generation` — генерация метаданных
- [ ] `libs-repo-setup` — настройка репозитория библиотек
- [ ] `libs-zod-v3-v4-compat-layer` — слой совместимости Zod v3/v4

### metrics/ (не мигрируют — MBB-специфика)

- [-] `metrics-models` — MBB-специфичные метрики моделей
- [-] `metrics-portfolio-structure` — структура MBB-портфолио
- [-] `metrics-validation` — MBB-специфичная валидация метрик

### process/

- [ ] `agentic-self-correction` — самокоррекция агентов
- [ ] `autonomous-skill-synthesis` — автономный синтез скилов
- [ ] `process-autonomous-quality-gate` — автономный quality gate
- [ ] `process-batch-skills-review` — пакетный обзор скилов
- [ ] `process-better-sqlite3-node-abi-gate` — совместимость better-sqlite3
- [ ] `process-bug-resolution-protocol` — протокол решения багов
- [ ] `process-commit-analysis-heuristics` — эвристики анализа коммитов
- [ ] `process-commit-skill-extraction` — извлечение скилов из коммитов
- [ ] `process-continue-config-ssot` — SSOT конфига Continue
- [ ] `process-continue-mcp-synergy` — синергия Continue и MCP
- [ ] `process-cursor-settings-management` — управление настройками Cursor
- [ ] `process-disaster-recovery` — восстановление после сбоев
- [ ] `process-docker-compose-release-validation` — валидация релизов docker-compose
- [ ] `process-docker-disaster-recovery` — восстановление Docker
- [ ] `process-docker-resource-governance` — управление ресурсами Docker
- [ ] `process-dynamic-context-management` — динамическое управление контекстом
- [ ] `process-external-integration-closure` — закрытие внешних интеграций
- [ ] `process-future-skill-impact-analysis` — анализ влияния будущих скилов
- [ ] `process-git-foundation-reliability` — надёжность git
- [ ] `process-git-local-ci-mirror` — локальное зеркало CI
- [ ] `process-git-submodule-resilience` — устойчивость git submodule
- [ ] `process-github-workflow` — воркфлоу GitHub
- [ ] `process-infrastructure-maintenance` — обслуживание инфраструктуры
- [ ] `process-logging-strategy` — стратегия логирования
- [ ] `process-model-registry-maintenance` — обслуживание реестра моделей
- [ ] `process-n8n-docker-code-nodes` — code nodes n8n в Docker
- [ ] `process-n8n-workflow-hygiene` — гигиена воркфлоу n8n (mbb-версия)
- [ ] `process-news-intelligence` — мониторинг новостей
- [ ] `process-node-dependency-lifecycle` — жизненный цикл зависимостей Node
- [ ] `process-node-foundation-reliability` — надёжность Node.js
- [ ] `process-node-preflight-checks` — preflight проверки Node
- [ ] `process-ollama-node-integration-checks` — проверки интеграции Ollama
- [ ] `process-ollama-runtime-governance` — управление рантаймом Ollama
- [ ] `process-orchestrator-evolution` — эволюция оркестратора
- [ ] `process-preflight-diagnostics-quality-gate` — quality gate диагностики
- [ ] `process-project-evolution-aggregation` — агрегация эволюции проекта
- [ ] `process-project-secretary-agent` — агент-секретарь проекта
- [ ] `process-settings-sync` — синхронизация настроек
- [ ] `process-skill-code-loop-anchors` — skill anchors в коде (mbb-версия)
- [ ] `process-skill-pipeline` — пайплайн скилов
- [ ] `process-skill-quality-validation` — валидация качества скилов
- [ ] `process-skill-watcher` — наблюдатель скилов
- [ ] `process-skills-bridge` — мост скилов и UI
- [ ] `process-skills-curation-intelligence` — интеллектуальная курация скилов
- [ ] `process-sqlite-health-snapshot` — снимок состояния SQLite
- [ ] `process-sqlite-runtime-compatibility` — совместимость SQLite
- [ ] `process-unified-mcp-orchestration` — единая оркестрация MCP
- [ ] `process-wf-ui-v2-bootstrap` — bootstrap воркфлоу UI v2
- [ ] `process-wf-ui-v2-standards` — стандарты воркфлоу UI v2
- [ ] `process-windows-powershell-patterns` — паттерны PowerShell Windows
- [ ] `process-workflow-ui` — воркфлоу UI
- [ ] `process-wsl-optimization` — оптимизация WSL
- [ ] `process-zod-schema-governance` — управление схемами Zod
- [ ] `protocol-agent-core` — ядро протокола агентов
- [ ] `protocol-docker-image-hardening` — усиление Docker образов
- [ ] `protocol-git-ai-collaboration` — AI-коллаборация в git
- [ ] `protocol-git-commit-template-consistency` — консистентность шаблонов коммитов
- [ ] `protocol-git-secrets-and-env-boundary` — граница секретов и env в git
- [ ] `protocol-n8n-mcp-interaction` — взаимодействие n8n и MCP
- [ ] `protocol-node-async-safety` — безопасность async в Node
- [ ] `protocol-node-mcp-development` — разработка MCP на Node
- [ ] `protocol-node-timeout-abort-contract` — контракт timeout/abort в Node
- [ ] `protocol-ollama-timeout-fallback-contract` — контракт fallback Ollama
- [ ] `protocol-sqlite-readonly-diagnostics` — диагностика readonly SQLite
- [ ] `skill-based-playbooks` — плейбуки на основе скилов

### troubleshooting/

- [ ] `docker-container-networking-debug` — отладка сети Docker
- [ ] `file-protocol-cors-guard` — защита CORS для file://
- [ ] `process-n8n-browser-cache` — кэш браузера n8n
- [ ] `troubleshoot-continue-cli-api-keys` — API ключи Continue CLI
- [ ] `troubleshoot-continue-cli-response-mismatch` — несоответствие ответов Continue CLI
- [ ] `yandex-access-binding-issue` — проблемы доступа Yandex (смотреть по ситуации)
- [ ] `yandex-cors-troubleshooting` — CORS Yandex (смотреть по ситуации)

### ux/ (не мигрируют — MBB UI)

- [-] `ux-interface-terms` — MBB UI термины
- [-] `ux-principles` — MBB UI принципы

### index/ (не мигрируют — индексы генерируются заново)

- [-] `index-mbb` — будет пересоздан как `index.md` для MMB

---

## Очистка после завершения миграции

Когда все нужные скилы перенесены:

1. Удалить этот файл (`mmb/skills/MIGRATION.md`)
2. Запустить скрипт очистки frontmatter — удаляет из всех `.md` файлов поля:
   `migrated_from`, `migration_status`, `migration_notes`
3. Удалить из `paths.js` и `.env` переменные:
   `MBB_SKILLS_ALL`, `MBB_SKILLS_MBB`
