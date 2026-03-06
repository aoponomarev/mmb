---
id: sk-502074
title: "Reactive Localization"
reasoning_confidence: 1.0
reasoning_audited_at: 2026-03-05
reasoning_checksum: 12b691ff
last_change: ""

---

# Reactive Localization

> **Context**: Centralized system for reactive texts (Russian/English) ensuring instant switching without page reload.
> **Scope**: All Vue UI components (`app/components/*`, `shared/components/*`) and templates.

## Reasoning

- **#for-reactive-translations** Using a reactive translation function (like `t()` or accessing a reactive state object) ensures that changing the language state instantly updates all UI text across the entire application without requiring a page reload.
- **#for-tooltip-reactivity** Tooltips that are initialized via Bootstrap JS copy the `title` attribute. If the language changes, the tooltip content will remain stale unless the tooltip is explicitly re-initialized or reactively bound to the translation state.

## Core Rules

1.  **No Hardcoded Texts in Templates:**
    All user-facing texts must be bound to a reactive translation source. Never hardcode strings like `<span>Настройки</span>`.
2.  **Reactive Binding:**
    Use Vue's reactivity (e.g., `{{ t('settings.title') }}` or a reactive dictionary) in templates.
3.  **Dynamic Tooltips:**
    When using tooltips (`data-bs-toggle="tooltip"`), the `title` attribute must be reactively bound (`:title="t('some.key')"`). If the component uses a custom wrapper for tooltips, it must watch for language changes and update the Bootstrap Tooltip instance accordingly.
4.  **Instant Switching:**
    The language state must reside in a central reactive store (e.g., `appStore`). Components must react to changes in this store automatically.

## Contracts

- **Translation Keys**: Keys used in templates must correspond to the central dictionary defined in #JS-2Z2J49xj (core/config/messages-config.js) or the translation module.
- **Fallback**: If a translation key is missing, the system must gracefully fallback to the default language (English) or display the key itself, but never crash the render cycle.
