---
id: ais-b7a9ba
status: active
last_updated: "2026-03-02"
related_skills:
  - sk-d7a2cc
  - sk-3225b2
  - sk-802f3b
  - sk-6eeb9a
  - sk-d6777d

---

# AIS: Control Plane & LLMOps (Управление, Казуальность и ИИ-Агенты)

<!-- Спецификации (AIS) пишутся на русском языке и служат макро-документацией. Микро-правила вынесены в английские скиллы. Скрыто в preview. -->

## Концепция (High-Level Concept)
Проект использует беспрецедентный уровень интеграции с ИИ-агентами (Cursor, Continue). Чтобы агенты не ломали сложную архитектуру, внедрен контур "LLMOps": система казуальности (Causality), MCP-сервер (Model Context Protocol) и жесткие инвариантные гейты (`preflight`). Control Plane (плоскость управления) включает в себя инструменты мониторинга, отката (Rollback) и автоматизированного тестирования.

## Инфраструктура и Потоки данных (Infrastructure & Data Flow)
- **MCP Ecosystem:** Локальный Node.js сервер (`is/mcp/index.js`), который проксирует инструменты (Tools) для ИИ-агентов. Все действия агентов логируются в локальную базу `data/telemetry.sqlite`.
- **Граф Казуальности:** Хэши (`#for-X`) связывают код с архитектурными правилами (скиллами). Скрипт `validate-causality-invariant.js` следит за тем, чтобы агент случайно не удалил хэш в одном месте, оставив в другом (защита от галлюцинаций).
- **CI/CD и Тесты:** Мы не используем тяжелые фреймворки типа Jest/Vitest. Вся тестовая база построена на встроенном в Node.js модуле `node:test`. CI настроен через GitHub Actions для минимальных проверок (Preflight) перед мержами.

## Локальные Политики (Module Policies)
- **Принудительное переписывание комментариев (Mandatory Rewrite):** Агенты обязаны переводить русские легаси-комментарии в коде на английский язык, оставляя только "Why" (Причину) и удаляя "What" (Что делает код).
- **Запрет на самостоятельные коммиты:** (Strict Git Policy) Агентам запрещено выполнять `git commit` без прямой команды пользователя, чтобы не засорять историю.
- **Skill Watcher (Сборщик урожая):** Любое неочевидное решение (костыль, магическое число) должно помечаться в коде сырым маркером `// @causality [объяснение]`. MCP-инструмент `harvest_causalities` собирает их в базу для последующего оформления в скиллы.
- **Rollback Protocol:** Разработка ведется транзакционно. Если ветка миграции заходит в тупик, применяется жесткий откат (`git reset --hard`) вместо попыток "починить сломанное".

## Лог перепривязки путей (Path Rewrite Log)

| Legacy path | Атомарный шаг | Риск | Статус | Новый путь / rationale |
|------------|--------------|------|--------|---------------------------|
| `control-plane/` | `LIR-006.A1` | Концептуальный reference для архитектурного описания | `DEFERRED` | `id:ais-b7a9ba` |
| `logs/control-plane.log` | `LIR-006.A2` | Концептуальный event-log в текущем контуре отсутствует | `DEFERRED` | `id:ais-b7a9ba` |
| `control-plane/scripts/self-test.js` | `LIR-006.A3` | Скрипты control-plane пока не восстановлены | `REQUIRES_ARCH_CHANGE` | Требуется отдельный батч инфраструктурной миграции |
| `shared/component` | `LIR-006.A4` | Устаревшее имя папки-компонентов | `MAPPED` | `shared/components` + `id:ais-b7a9ba` |
| `shared/utility` | `LIR-006.A5` | Устаревшее имя вспомогательного слоя | `MAPPED` | `shared/utils` + `id:ais-b7a9ba` |
| `control-plane/*` | `LIR-006.A6` | legacy-паттерн в CI триггере проверок | `NEEDS_REWRITE` | Заменить на `is/scripts/infrastructure/control-plane-*` после появления пакета control-plane |
| `control-plane/scripts/self-test.js` | `LIR-006.A7` | Резервный control-plane self-test hook в reliability gates | `MAPPED` | `id:ais-b7a9ba` |
| `scripts/sqlite-health-snapshot.js` | `LIR-015.A1` | Legacy sqlite diagnostics script path in backend monitoring flow | `MAPPED` | `is/scripts/infrastructure/health-check.js` |

## Компоненты и Контракты (Components & Contracts)
- `is/mcp/` — исходный код локального MCP-сервера.
- `is/skills/causality-registry.md` — единый SSOT реестр всех казуальных хэшей.
- `.cursorrules` — системный промпт для принудительного поведения агентов.
- `is/scripts/preflight.js` — главный архитектурный шлюз (Gate), запускаемый перед коммитами.
