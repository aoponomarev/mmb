# План_Libs.md

> Категория: План библиотек и зависимостей
> Статус: **Завершён** (governance policy established)
> Казуальность: `is/skills/arch-dependency-governance.md`

---

## 1. Контекст и границы

Контур охватывает управление зависимостями (Node/libs), политику версий и контракты обновления.

## 2. Цели / Non-goals

**Цели:**
- определить dependency governance для Target App;
- снизить риск несовместимостей (ABI/version drift);
- зафиксировать policy обновления критичных библиотек.

**Non-goals:**
- миграция всех исторических libs-экспериментов из Legacy App;
- бесконтрольные обновления major версий.

## 3. Почему этот подход

- при глубокой миграции зависимости часто ломают сборку сильнее, чем код;
- библиотечные правила должны быть документированы до масштабного переноса модулей.

## 4. Альтернативы

- обновлять зависимости ad-hoc — отклонено (высокий риск regression chains).
- полностью freeze зависимости — отклонено (технический долг и security lag).

## 5. Зависимости

- Upstream: `План_Backend_Core.md`, `План_Infrastructure_Docker.md`
- Downstream: `План_Testing_Strategy.md`, `План_Rollback.md`

## 6. Риски и снижение

- несовместимость native addons -> ABI checks при обновлении Node.js.
- конфликт peer deps -> lockfile дисциплина + preflight checks.

## 7. Definition of Done

- определена policy версий и апдейтов;
- задокументированы критичные зависимости и их назначение;
- есть процедура безопасного major-upgrade.

## 8. Чек-лист

- [x] Провести аудит критичных зависимостей Legacy App. → Legacy App имел 20+ зависимостей. Target App сокращён до 2 prod + 2 dev.
- [x] Сформировать policy version pinning / upgrade cadence. → Зафиксировано в `is/skills/arch-dependency-governance.md`: caret `^` ranges, lockfile as SSOT, major upgrades require review.
- [x] Добавить ABI/compatibility ворота. → Native addon (`better-sqlite3`) требует ABI check при смене Node.js major. Preflight валидирует env.
- [x] Синхронизировать с test и rollback планами. → `npm run test` (40 tests) + rollback protocol cover dependency regression.
