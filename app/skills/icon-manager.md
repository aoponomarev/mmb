---
id: sk-icon-mgr
title: "Icon Manager (Coin Assets)"
reasoning_confidence: 1.0
reasoning_audited_at: 2026-03-05
reasoning_checksum: 1b71a9fa
last_change: ""

---

# Icon Manager

> **Context**: Resolving coin icon URLs with caching and fallbacks for the portfolio UI.
> **Scope**: core/api/icon-manager.js, libs assets (coin icons)

## Reasoning

- **#for-asset-fallback** Local assets may be missing for new coins; CDN fallback ensures UI never breaks on 404.
- **#for-cache-busting** URLs include `?v={appVersionHash}` to bust browser cache on app update.
- **#not-hardcoded-paths** Icon resolution must go through IconManager so alias mapping and fallback logic apply consistently.

## Core Rules

1.  **Resolution Order:**
    Primary: Local/Repo Assets (`libs/assets/coins/`). Fallback: External CDN (CoinGecko). Alias: Map symbols to known filenames (e.g. `WETH` → `ETH`).
2.  **API Usage:**
    Components must use `IconManager.getIconUrl('BTC')` and optionally `IconManager.preload(['BTC', 'ETH'])`.
3.  **File Naming:**
    Files on disk are strictly lowercase (`btc.png`).
4.  **Error Handling:**
    Component `coin-block.js` must handle load errors and show a generic placeholder. No 404s visible to user.

## Contracts

- **SSOT**: `core/api/icon-manager.js` — resolution logic.
- **Storage**: libs assets — icon files.
