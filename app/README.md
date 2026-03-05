---
id: readme-069aca
status: active
last_updated: "2026-03-04"

---
<!-- Важно: оставлять пустую строку перед "---" ! -->

# Application Frontend Layer (`app/`)

## Scope
This directory contains the user interface and client-side logic of the Target App.
It is built using a "No-Build" architecture, meaning it operates directly from native ES modules in the browser without Webpack/Vite.

## Architecture & Constraints
- **Zero Build**: The app must be fully functional by opening `index.html` via `file://` or a basic static web server (GitHub Pages).
- **RRG (Reactive Reliability Gate)**: All reactivity must adhere to the strict state boundaries. Direct global mutations (`window.*`) and unsafe `innerHTML` assignments are forbidden.
- **SSOT Dictionaries**: All UI texts, icons, and tooltips must be fetched from central configuration files, never hardcoded in component logic.

## Subdirectories
- `components/`: Reusable UI components (prefix `cmp-*` for generic, `app-*` for domain-specific).
- `skills/`: UI-specific architectural knowledge and AI agent rules.
- `templates/`: HTML templates loaded via `x-template`.
