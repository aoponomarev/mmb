---
id: env-pc-readme
description: "Index of per-PC environment descriptions and migration checklist reference."
last_updated: "2026-03-06"

---
<!-- Важно: оставлять пустую строку перед "---" ! -->

# Environment per PC

Описание окружения разработки по каждому ПК, на котором открывается проект. Нужно для синхронизации и миграций между машинами (например, дом ↔ офис).

## Условные обозначения

| Label      | Машина    | Описание |
|-----------|-----------|----------|
| **pc-office** | Офисный ПК | Текущий; Node 18.12 из `C:\Program Files\nodejs`, Python 3.12, VS Build Tools. Окружение настроено после устранения рассинхрона. |
| **pc-home**   | Домашний ПК | Эталон до проблем с Node/env; рабочий вариант окружения. |

Файлы в этой папке: по одному документу на ПК (`pc-<name>.md`). Список ПК и ссылки — в `manifest.json`.

## Первый запуск на новом ПК

1. Установить **Node 18 LTS** (например, в `C:\Program Files\nodejs` или через nvm).
2. Установить **Python 3.11/3.12**; для 3.12 — `pip install setuptools` (для node-gyp/distutils).
3. Установить **Visual Studio Build Tools 2022** с workload «Desktop development with C++».
4. В корне проекта: `npm install`, затем `npm rebuild better-sqlite3`, затем `npm run preflight`.
5. Добавить в эту папку новый файл `pc-<name>.md` и записать его в таблицу выше и в `manifest.json`.

**Скрипт первого запуска («настрой под этот ПК»):** из корня репо выполнить `npm run env:setup` или `.\scripts\setup-dev-env.ps1`. Скрипт ставит Node в PATH, запускает `npm install`, `npm rebuild better-sqlite3`, `npm run preflight`; идемпотентен.

Подробный чеклист и пути: id:readme-node18 (scripts/README-node18.md). Терминал в workspace: `.vscode/settings.json` задаёт PATH с Node.
