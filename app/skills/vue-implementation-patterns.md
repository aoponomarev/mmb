---
title: "Vue Implementation Patterns"
reasoning_confidence: 1.0
reasoning_audited_at: "2026-03-02"
reasoning_checksum: "6a357eda"

---

# Vue Implementation Patterns

> **Context**: Common gotchas and strict patterns for implementing Vue 3 components without a build step (No-Build Architecture).
> **Scope**: All Vue UI components (`shared/components/*` and `app/components/*`).

## Reasoning

- **#for-vue-comment-node-fallback** When using `x-template` with Vue 3 fragments, `this.$el` might be a Comment node instead of a real DOM element. Attempting `querySelector` on it will throw exceptions unless fallback strategies (nextSibling/parent) are used.
- **#not-methods-in-computed** Placing methods inside the `computed` section is syntactically invalid and structurally confusing.
- **#not-dom-in-computed** Accessing or manipulating the DOM from within a `computed` property leads to unpredictable errors because computed values are often evaluated before the component is fully mounted.
- **#for-utility-availability-check** Since modules load asynchronously without a bundler, global singletons (like `window.classManager`) might not be instantly available. Defensive checks prevent critical render failures.

## Core Rules

1.  **Safe DOM Selection (`this.$el` Fallback):**
    If you must query DOM elements in `mounted()`, never assume `this.$el` is a valid Element.
    ```javascript
    let rootEl = this.$el;
    if (rootEl.nodeType === Node.COMMENT_NODE) {
        rootEl = rootEl.nextSibling;
        if (!rootEl || !rootEl.querySelector) {
            rootEl = rootEl?.parentElement?.querySelector('.my-selector');
        }
    }
    ```
2.  **No Methods in `computed`:**
    All callable functions must go inside the `methods: {}` object. The `computed: {}` object must only contain reactive getters/setters.
3.  **No DOM Dependencies in `computed`:**
    Methods called from `computed` properties must be pure functions without side effects. They must never interact with `this.$el` or the DOM.
4.  **Utility Availability Checks:**
    Before calling global utilities in computed properties or lifecycle hooks, verify their existence:
    ```javascript
    if (!window.classManager) {
        return baseClasses.join(' '); // Safe fallback
    }
    ```

## Contracts

- **No-Build Restrictions**: These rules exist strictly because we operate without a bundler and use `x-template`. They ensure robustness in an environment where execution order can slightly vary.
