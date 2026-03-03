---
title: "Messages Architecture"
reasoning_confidence: 1.0
reasoning_audited_at: "2026-03-02"
reasoning_checksum: "969bc573"
id: sk-f2bc48

---

# Messages Architecture

> **Context**: The architecture of the system messages, notifications, and translation dictionaries (v2).
> **Scope**: `core/config/messages-config.js`, `core/api/messages-translator.js`

## Reasoning

- **#for-short-message-keys** Using short keys (`e.net`, `i.switch`) instead of legacy long strings (`error.api.network`) reduces payload size, minimizes typos in code, and makes the configuration more readable.
- **#for-short-message-types** Using single-character types (`d`, `w`, `i`, `s`) maps directly to Bootstrap variants (`danger`, `warning`, `info`, `success`) efficiently, saving space in the configuration object.
- **#for-compact-translation-format** The `KEY|TEXT|DETAILS` format for storing translations in localStorage or fetching them is highly optimized for parsing and storage compared to verbose JSON or XML formats.

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

## Contracts

- **Legacy Compatibility**: `messages-config.js` must maintain a `LEGACY_KEY_MAP` to ensure backward compatibility with older components that still use long keys.
- **Translation Fallback**: If a translation is missing for a specific language, the system must fallback to the default text defined in the config.
