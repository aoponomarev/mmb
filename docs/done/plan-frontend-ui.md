# План_Frontend_UI.md

> Категория: План миграции контура Frontend & UI
> Статус: **Исключён из roadmap** (решение от 2026-03)

---

## Решение

Дальнейшая миграция UI-компонентов исключена из roadmap миграции. Текущий UI работает и поддерживается "как есть". Фронтенд оставлен в том состоянии, которое было функционально на момент решения.

## Что реализовано

- Zod-валидация UI-конфигов (tooltips, modals).
- AST-линтер на хардкод текстов (`frontend:hardcode:ast`).
- RRG Gate Contract (`frontend:rrg:contract`, `frontend:reactivity:check`, `frontend:smoke`).
- Базовый `index.html` с coin table и cloud interaction.

## Что не переносится

- Полный Vue-wrapper migration (Шаги 7.1+).
- SCSS foundation pipeline.
- Bulk intake/rebind из Legacy App.
- Full UI Parity Program.
- Legacy App visual/functional identity matrix.

## Причина

Фронтенд в текущем состоянии функционален для целей portfolio-проекта. Инвестиции в полную UI-миграцию не оправданы на данном этапе.

---

*Исключён из roadmap. Не учитывается в % готовности миграции.*
