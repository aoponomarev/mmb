---
id: readme-c1e1b4
status: active
last_updated: "2026-03-04"

---
<!-- Важно: оставлять пустую строку перед "---" ! -->

# Shared Layer (`shared/`)

## Scope
Reusable components, utilities, and helpers shared across the application. No domain-specific logic.

## Subdirectories
- `components/`: Generic UI components used by `app/`.
- `templates/`: HTML templates loaded via `x-template` (shared across components).
- `utils/`: Framework-agnostic utilities (hash-generator, pluralize, class-manager, layout-sync, auto-markup, column-visibility-mixin).

## Constraints
- Must not depend on `core/` domain logic or `app/` business rules.
- Loaded via `core/modules-config.js` and `core/module-loader.js`.
