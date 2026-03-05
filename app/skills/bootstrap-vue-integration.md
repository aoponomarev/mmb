---
title: "Bootstrap Vue Integration"
reasoning_confidence: 1.0
reasoning_audited_at: "2026-03-05"
reasoning_checksum: "d72fe70c"
id: sk-eeb23d

---

# Bootstrap Vue Integration

> **Context**: Strict rules for creating Vue wrappers over native Bootstrap 5 components (Modal, Dropdown, Tooltip, etc.) in a No-Build environment.
> **Scope**: All Vue UI components (`shared/components/*` and `app/components/*`) that interact with Bootstrap's JavaScript API.

## Reasoning

- **#for-bootstrap-nexttick-init** Bootstrap's JS API (`new bootstrap.Modal()`) requires the target DOM elements to be fully rendered. Since Vue renders asynchronously, initialization must happen inside `$nextTick` within the `mounted` hook.
- **#for-bootstrap-dispose** Vue components are frequently destroyed and recreated. If the underlying Bootstrap instance is not explicitly disposed (`instance.dispose()`), it leaves behind detached DOM elements, event listeners, and memory leaks.
- **#for-bootstrap-event-proxying** Bootstrap emits native DOM events (e.g., `show.bs.modal`). Vue components cannot directly listen to these via `@show.bs.modal` cleanly in all contexts. The wrapper must listen to the native event and emit a clean Vue event (`this.$emit('show')`).

## Core Rules

1.  **Initialization:**
    Always initialize Bootstrap components in `mounted()` inside a `this.$nextTick()` callback.
    ```javascript
    mounted() {
        this.$nextTick(() => {
            if (window.bootstrap && window.bootstrap.Modal) {
                this.modalInstance = new window.bootstrap.Modal(this.$refs.modalEl);
            }
        });
    }
    ```
2.  **Cleanup (Mandatory):**
    Always call `.dispose()` on the Bootstrap instance in `beforeUnmount()`.
    ```javascript
    beforeUnmount() {
        if (this.modalInstance) {
            this.modalInstance.dispose();
            this.modalInstance = null;
        }
    }
    ```
3.  **Event Proxying:**
    Attach native event listeners to the DOM element and emit Vue events.
    ```javascript
    this.$refs.modalEl.addEventListener('hidden.bs.modal', () => {
        this.$emit('hidden');
    });
    ```
4.  **Programmatic API:**
    Provide wrapper methods (`show()`, `hide()`, `toggle()`) that safely call the Bootstrap instance if it exists. Expose instance via `getBootstrapInstance()` for parent access.
5.  **Data Attributes:**
    Preserve `data-bs-*` attributes for native Bootstrap functionality.
6.  **Styling:**
    Use Bootstrap utility classes first; use CSS variables (`--bs-body-bg`) for Light/Dark mode; no inline styles unless dynamically calculated (e.g. progress bars).

## Contracts

- **No Custom Wrappers for Simple Containers**: Do not create Vue wrappers for simple Bootstrap containers unless extended functionality (like search, dynamic loading) is required. Use native Bootstrap data-attributes (`data-bs-toggle`) wherever possible.
