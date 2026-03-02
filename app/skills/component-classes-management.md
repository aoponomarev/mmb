---
title: "Component Classes Management"
reasoning_confidence: 1.0
reasoning_audited_at: "2026-03-02"
reasoning_checksum: "801bc71f"
---

# Component Classes Management

> **Context**: Universal mechanism for managing CSS classes across generic Vue UI components.
> **Scope**: All Vue UI components (`shared/components/*` and `app/components/*`), their templates, and computed class properties.

## Reasoning

- **#for-classes-add-remove** The `classesAdd` and `classesRemove` props provide a uniform interface for customizing styling on different internal DOM elements of a generic component (e.g., `root`, `icon`, `label`) without polluting the component with too many specific props.
- **#not-hardcoded-classes** Placing hardcoded classes (other than required base Bootstrap classes like `btn`) directly in HTML templates prevents parent components from removing them via `classesRemove`.
- **#for-classes-merge-order** Applying classes in a specific order (base → adaptive → instanceHash → conditional → remove → add) ensures predictable overrides and guarantees `classesAdd` is the final word.
- **#for-fixed-class-objects** Returning conditionally structured objects from computed properties (like returning `{}` sometimes and `{ icon: 'class' }` other times) breaks Vue's reactivity tracking for those properties.

## Core Rules

1.  **Use `classesAdd` and `classesRemove` Props:**
    All generic components must accept `classesAdd` and `classesRemove` as objects, where keys match logical elements inside the component (e.g., `root`, `button`, `menu`, `icon`).
2.  **No Hardcoded Classes in Templates:**
    All class assignments in templates should use `:class="computedProperty"`. Do not hardcode utility classes (like `p-0`, `float-start`) directly in `class="..."` attribute, as they will override or conflict with the universal mechanism.
3.  **Use `window.classManager.processClassesToString`:**
    To combine classes, always use the `window.classManager.processClassesToString(baseClasses, classesAdd, classesRemove)` utility inside your computed properties.
4.  **Strict Merge Order:**
    When assembling the `baseClasses` array before passing it to `classManager`, order them carefully: `[Base Bootstrap classes, Adaptive classes, instanceHash, Conditional classes]`.
5.  **Fixed Object Structure for Classes:**
    If a computed property returns an object of classes to pass down to a child component, the object must always have the same keys (even if the values are `undefined`).

## Contracts

- **`classManager` dependency**: Any component utilizing this feature must gracefully fallback if `window.classManager` is temporarily unavailable (e.g. during early mount).
- **Subcomponent Prop Mapping**: When a parent wraps another component (like `dropdown` wrapping `button`), it must correctly map its own `classesAdd.button` to the child's `:classes-add="{ root: classesAdd.button }"`.
