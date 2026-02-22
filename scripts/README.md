# Scripts Layout

Scripts are organized by layer:

- `scripts/infrastructure/` — checks and generators related to paths, environment, SSOT, symlinks.
- `scripts/architecture/` — checks and generators related to skills graph and architectural knowledge.
- `scripts/infrastructure/preflight-solo.ps1` — git-safety/preflight script (operational infrastructure layer).

Root `scripts/` rule:

- Only `scripts/README.md` and manual user-entry scripts are kept at root level.
- All internal validators/generators belong in subfolders by contour.

Current npm commands:

- `npm run env:check` -> `scripts/infrastructure/validate-env-example.js`
- `npm run ssot:check` -> `scripts/infrastructure/validate-ssot.js`
- `npm run symlinks:check` -> `scripts/infrastructure/validate-symlinks.js`
- `npm run docs:paths` -> `scripts/infrastructure/generate-paths-docs.js`
- `npm run skills:graph:check` -> `scripts/architecture/validate-skill-graph.js`
- `npm run skills:health:check` -> `scripts/architecture/validate-skills-health.js`
- `npm run docs:index` -> `scripts/architecture/generate-skills-index.js`
- `npm run evolution:update` -> `scripts/architecture/project-evolution-update.js`
- `npm run evolution:rebuild` -> `scripts/architecture/project-evolution-update.js --rebuild`
