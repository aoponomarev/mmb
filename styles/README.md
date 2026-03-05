---
id: readme-e12ef8
status: active
last_updated: "2026-03-04"

---
<!-- Важно: оставлять пустую строку перед "---" ! -->

# Styles (`styles/`)

## Scope
CSS files for the application. Load order is defined in `index.html`.

## Subdirectories
- `wrappers/`: Bootstrap overrides and wrappers (button, dropdown, button-group).
- `layout/`: Layout components (header, footer, scrollbars, table-columns, messages-splash).
- `custom/`: Custom component styles (combobox, modal-header-tabs, modal-themed).

## Load Order (see `index.html`)
1. Base wrappers (independent)
2. Composite wrappers (depend on base)
3. Layout components
4. Custom component styles
