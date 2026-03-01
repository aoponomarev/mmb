# План_Master_Migration.md

> Категория: План (высокоуровневая архитектура и стратегия миграции)
> Статус: **Завершён** (все контуры финализированы)
> Казуальность: все решения зафиксированы в `is/skills/arch-*.md`

---

## 1. Директивы пользователя (Руководство миграцией)

- **Принцип "По требованию":** Ничего не копируется "про запас". Код, скилы и документация переносятся только тогда, когда они реально нужны в новой архитектуре Target App.
- **Свобода рефакторинга:** Миграция — это не просто copy-paste. Любой переносимый модуль должен быть проанализирован и переписан с учетом новых стандартов.
- **Ключи и секреты:** Secret Resilience - приоритет. Все ключи защищены encrypted archive + restore-chain.
- **Сохранение работоспособности UI:** `index.html` обязан работать из `file:///` и на `GitHub Pages`.
- **Fail-fast during migration:** До завершения миграции — режим fail-fast (явная ошибка и блокировка шага).
- **Active Causality Recording:** Каждый шаг оставляет след в архитектурных скилах.

---

## 2. Глобальная стратегия

Поэтапный подход:
1. Подготовка чистого фундамента (SSOT, контракты).
2. Изоляция функционального блока в доноре.
3. Аудит, рефакторинг и интеграция в Target App.
4. Отбрасывание легаси-мусора.

---

## 3. Финальный статус этапов

### Этап 1: Фундамент и Интеграция базы знаний — **Завершён**
- [x] SSOT-политики: `paths.js`, `paths-reference.md`.
- [x] Базовые архитектурные скилы: `arch-foundation.md`.
- [x] Active Causality Recording в скилах.
- [x] `npm run preflight`.
- [x] MCP-сервер + Memory контур.
- [x] Health-gate базы скилов (`skills:check`).
- [x] Skills trend tracking (`skills:health:trend`).
- **Казуальность:** `is/skills/arch-foundation.md`, `is/skills/arch-skills-mcp.md`, `is/skills/arch-causality.md`

### Этап 2: Базовая инфраструктура и Control Plane — **Завершён** (Docker в бэклоге)
- [x] Secret Resilience MVP (encrypted backup/restore/check).
- [x] Control Plane: `health-check.js`, `single-writer guard`.
- [x] External parity: env contracts, cache integrity gate.
- [ ] Docker split-контуры — **бэклог**.
- **Казуальность:** `is/skills/arch-control-plane.md`, `is/skills/arch-external-parity.md`

### Этап 3: Ядро приложения и Backend — **Завершён**
- [x] Provider manager + CoinGecko + Binance providers.
- [x] Market metrics service (FGI/VIX/BTC dominance/OI/FR/LSR).
- [x] Market snapshot service (orchestration).
- [x] Backend composition root.
- [x] Zod contracts (`market-contracts.js`).
- [x] Transport + HTTP handler + Node server.
- [x] API consumer client (`market-snapshot-client.js`).
- [x] 40 автоматизированных тестов.
- **Казуальность:** `is/skills/arch-backend-core.md`, `is/skills/arch-dependency-governance.md`

### Этап 4: Frontend и UI — **Исключён из roadmap**
- [x] Работоспособность на GitHub Pages и `file:///`.
- [x] RRG Gate Contract.
- [x] AST-линтер (hardcode ban).
- [x] Zod-валидация UI-конфигов.
- Дальнейшая Vue-миграция — **исключена**.

### Этап 5: Интеграции и Оркестрация — **Бэклог**
- AI-Orchestration, n8n, Cloudflare, Yandex Cloud — всё в бэклоге.

### Этап 6: Надежность и операционная зрелость — **Завершён**
- [x] Стратегия тестирования (`node:test`, 40 тестов).
- [x] CI/CD (GitHub Actions `ci.yml`).
- [x] Мониторинг (health-check, monitoring:snapshot, skills:health:trend).
- [x] Rollback protocol.
- **Казуальность:** `is/skills/arch-testing-ci.md`, `is/skills/arch-monitoring.md`, `is/skills/arch-rollback.md`

---

## 4. Итоговая статистика

| Метрика | Значение |
|---|---|
| Этапов завершено | 4 из 6 (+ 1 исключён, 1 в бэклоге) |
| Архитектурных скилов | 15 (10 arch + 3 process + 2 domain) |
| Автоматизированных тестов | 40 |
| npm-команд | 19 |
| Runbooks | 3 |
| Планов финализировано | 16 |

---

## 5. Полный реестр архитектурных скилов

| Скил | Этап | Домен |
|---|---|---|
| `is/skills/arch-foundation.md` | 1 | Naming, paths, SSOT |
| `is/skills/arch-skills-mcp.md` | 1 | Skills & MCP |
| `is/skills/arch-causality.md` | 1 | Causality tracking |
| `is/skills/arch-control-plane.md` | 2 | Control plane |
| `is/skills/arch-external-parity.md` | 2 | External infra |
| `is/skills/arch-backend-core.md` | 3 | Backend pipeline |
| `is/skills/arch-dependency-governance.md` | 3 | Dependencies |
| `is/skills/arch-testing-ci.md` | 6 | Testing & CI |
| `is/skills/arch-monitoring.md` | 6 | Monitoring |
| `is/skills/arch-rollback.md` | 6 | Rollback |

---

## 6. Требования к процессу переноса (справочник)

Каждый переносимый модуль должен пройти через:
1. **Сбор скилов:** Проверка базы — какие правила относятся к модулю.
2. **Адаптация:** Переписывание путей на SSOT, замена импортов, отказ от легаси-аббревиатур.
3. **Skill & Causality:** Обязательное пополнение скилов с обоснованиями.
4. **Тестирование:** Консольное (e2e, contract-first) перед фиксацией.
