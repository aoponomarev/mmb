# Scripts Layout

Скрипты разделены по слоям:

- `scripts/infrastructure/` — проверки и генерация, связанные с путями, окружением, SSOT, симлинками.
- `scripts/architecture/` — проверки и генерация, связанные с графом скилов и архитектурной структурой знаний.
- `scripts/infrastructure/preflight-solo.ps1` — git-safety/preflight скрипт (операционный инфраструктурный контур).

Правило корня `scripts/`:

- В корне держим только `scripts/README.md` и ручные user-entry скрипты.
- Любые внутренние валидаторы/генераторы — только в подкаталогах по контуру.

Текущие npm-команды:

- `npm run env:check` -> `scripts/infrastructure/validate-env-example.js`
- `npm run ssot:check` -> `scripts/infrastructure/validate-ssot.js`
- `npm run symlinks:check` -> `scripts/infrastructure/validate-symlinks.js`
- `npm run docs:paths` -> `scripts/infrastructure/generate-paths-docs.js`
- `npm run skills:graph:check` -> `scripts/architecture/validate-skill-graph.js`
- `npm run skills:health:check` -> `scripts/architecture/validate-skills-health.js`
- `npm run docs:index` -> `scripts/architecture/generate-skills-index.js`
