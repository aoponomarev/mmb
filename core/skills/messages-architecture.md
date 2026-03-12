---
id: sk-f2bc48
title: "Messages Architecture"
reasoning_confidence: 1.0
reasoning_audited_at: 2026-03-12
reasoning_checksum: fd93ebd0
last_change: "#for-message-display-vs-observability — display path clarification"

---

# Messages Architecture

> **Context**: The architecture of the system messages, notifications, and translation dictionaries (v2).
> **Scope**: `core/config/messages-config.js`, `core/api/messages-translator.js`

## Reasoning

- **#for-short-message-keys** Using short keys (`e.net`, `i.switch`) instead of legacy long strings (`error.api.network`) reduces payload size, minimizes typos in code, and makes the configuration more readable.
- **#for-short-message-types** Using single-character types (`d`, `w`, `i`, `s`) maps directly to Bootstrap variants (`danger`, `warning`, `info`, `success`) efficiently, saving space in the configuration object.
- **#for-compact-translation-format** The `KEY|TEXT|DETAILS` format for storing translations in localStorage or fetching them is highly optimized for parsing and storage compared to verbose JSON or XML formats.
- **#for-message-display-vs-observability** Display path uses AppMessages only; Event Bus serves observability, not UI reactivity.

## Core Rules

1.  **Short Keys Prefix Convention:**
    - `e.*` : Errors (`e.net`, `e.rate`)
    - `i.*` : Info (`i.switch`, `i.cache`)
    - `h.*` : Health/State (`h.proxy.up`)
    - `v.*` : Validation (`v.wsum`)
    - `a.*` : Auth (`a.login`)
    - `p.*` : Portfolios (`p.save`)
2.  **Short Types Convention:**
    - `d` = danger (Critical errors)
    - `w` = warning (Warnings)
    - `i` = info (Information)
    - `s` = success (Success)
3.  **Configuration Structure:**
    All messages must be defined in `core/config/messages-config.js` using the compact structure:
    ```javascript
    'e.net': {
        t: 'Ошибка сети',
        d: 'Проверьте подключение к интернету',
        type: 'd'
    }
    ```

### Key Workflow

Add key to `messages-config.js`; assign `type` and default RU/EN text; access via `messagesConfig.get(key, params)`. Prefix `ai.*` reserved for AI/LLM events.

### Translation (i18n)

**#for-compact-translation-format** Messages stored as `KEY|TEXT|DETAILS`. **Storage**: `localStorage` key `tr-{lang}`; structure `[text, details]`. **Workflow**: `messagesTranslator.init(lang)` loads cache; if key missing, request from AI Provider; parse response; `updateDisplayedMessages()` triggers Vue reactivity. **Constraints**: AI MUST NOT translate `{name}` or `{value}` placeholders; translation is non-blocking (show "Translating..." or default).

### Messages UI & Lifecycle

**Lifecycle**: Creation (`messagesConfig.get(key, params)`) → Dispatch (`AppMessages.push`) → Translation (async via `messagesTranslator`) → Display (reactive list `cmp-system-messages`) → Removal (TTL or manual close). **Constraints**: Every message MUST retain `key` for re-translation on language switch; use `{ ...msg }` when modifying; `cmp-system-message` registered locally within `cmp-system-messages`. **Components**: `cmp-system-messages` (container, positioning); `cmp-system-message` (item, animations). File Map: `shared/utils/messages-store.js`, `shared/components/system-messages.js`, `shared/components/system-message.js`.

### Display Path vs Event Bus (Observability)

**#for-message-display-vs-observability** Display path: UI receives messages via `AppMessages.state` (Vue.reactive or CustomEvent fallback). `cmp-system-messages` does **not** subscribe to Event Bus for display — it reads `window.AppMessages.state.messages`. Event Bus (`message-shown`, `message-dismissed`, `messages-cleared`, `error-occurred`) is for **observability only** (future Sentry, session-log, diagnostics). Single transport for UI: Vue.reactive when Vue present; CustomEvent `app-messages:changed` as fallback for non-Vue. Do not add Event Bus as a second display transport.

## Contracts

- **Legacy Compatibility**: `messages-config.js` must maintain a `LEGACY_KEY_MAP` to ensure backward compatibility with older components that still use long keys.
- **Translation Fallback**: If a translation is missing for a specific language, the system must fallback to the default text defined in the config.
