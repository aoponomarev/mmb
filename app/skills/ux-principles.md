---
title: "UX: Design Principles & Interface Contracts"
reasoning_confidence: 0.9
reasoning_audited_at: "2026-03-01"
---

# UX: Design Principles & Interface Contracts

> **Context**: Rules for consistent, predictable user experience across all UI components.
> **Scope**: `app/`, `core/config/`, all UI-visible elements.

## Reasoning

- **#for-modal-button-match** User opens "Edit Portfolio" — modal must say "Edit Portfolio". Mismatch causes confusion and breaks mental model.
- **#for-color-semantics** Finance domain has established conventions. Green = profit, red = loss, grey = neutral. Violations cause misreading of data.
- **#for-action-feedback** Silent success leaves user uncertain. Toast or inline status confirms the action completed — reduces repeated clicks and support burden.
- **#for-nonblocking-async** Frozen UI suggests crash. Loading spinner or skeleton signals "working." User can distinguish idle vs in-progress.
- **#for-reversible-destructive** Single-click delete causes accidental data loss. Confirmation modal or two-step button prevents regret.
- **#for-hardcode-ban** Scattered hardcoded strings cause maintenance drift — the same label updated in one place but not another. A single SSOT config is the only mutation point.

---

## Consistency Contracts

**Modal titles**: A modal's heading MUST match the exact text of the button or link that opened it. If the button says "Edit Portfolio", the modal title is "Edit Portfolio" — not "Portfolio Management" or "Settings".

**Color semantics** (non-negotiable):
| Color | Meaning | Use for |
|---|---|---|
| Green | Profit / Success / Positive | Gains, confirmations, passing status |
| Red | Loss / Danger / Error | Losses, destructive actions, failures |
| Grey | Neutral / Inactive | Disabled state, secondary data, placeholders |

**Action feedback**: Every user-initiated action (Save, Delete, Refresh) MUST produce visible System Feedback — either a Toast notification or an inline status update. Silent success is not acceptable.

## Interaction Contracts

**Non-blocking async**: Long operations (data fetch, save) MUST show a loading spinner or skeleton state. The UI must never appear frozen. The user must always be able to tell whether the system is working or idle.

**Reversible destructive actions**: Any delete or irreversible operation MUST require explicit confirmation (confirmation modal or two-step button). No single-click deletes.

## SSOT for UI Strings

All user-visible text (button labels, modal titles, tooltips, toast messages) comes from centralized config files — never hardcoded inline in component code.

| Content type | Config SSOT |
|---|---|
| Modal titles and metadata | `core/config/modals-config.js` |
| Tooltip text | `core/config/tooltips-config.js` |
| System messages / toasts | Centralized messages config |

Enforcement: The AST linter at `is/scripts/tests/lint-frontend-hardcode-ast.test.js` catches any hardcoded user-facing string assignments.

## Naming Conventions for UI Code

| Pattern | Convention | Example |
|---|---|---|
| Action handlers | Verb-Noun | `savePortfolio`, `deleteAsset` |
| Boolean state | `is-` prefix | `isLoading`, `isActive`, `isVisible` |
| Event names | Past tense | `portfolioSaved`, `assetDeleted` |
| Container CSS classes | `avto-{descriptor}` | `avto-table-row`, `avto-modal-header` |

## Zod Validation Gate

UI config files (`modals-config.js`, `tooltips-config.js`) are validated against Zod schemas in `core/contracts/ui-contracts.js` before the app is considered production-ready.

A typo in a config key — missing required field, wrong type — must cause a **test failure** (fail-fast), not a silent runtime defect on the client.

See `app/skills/ui-architecture.md` for the full RRG and no-build architecture contracts.
