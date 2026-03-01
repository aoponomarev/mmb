# UX: Design Principles & Interface Contracts

> **Context**: Rules for consistent, predictable user experience across all UI components.
> **Scope**: `app/`, `core/config/`, all UI-visible elements.

## 1. Consistency Contracts

**Modal titles**: A modal's heading MUST match the exact text of the button or link that opened it. If the button says "Edit Portfolio", the modal title is "Edit Portfolio" — not "Portfolio Management" or "Settings".

**Color semantics** (non-negotiable):
| Color | Meaning | Use for |
|---|---|---|
| Green | Profit / Success / Positive | Gains, confirmations, passing status |
| Red | Loss / Danger / Error | Losses, destructive actions, failures |
| Grey | Neutral / Inactive | Disabled state, secondary data, placeholders |

**Action feedback**: Every user-initiated action (Save, Delete, Refresh) MUST produce visible System Feedback — either a Toast notification or an inline status update. Silent success is not acceptable.

## 2. Interaction Contracts

**Non-blocking async**: Long operations (data fetch, save) MUST show a loading spinner or skeleton state. The UI must never appear frozen. The user must always be able to tell whether the system is working or idle.

**Reversible destructive actions**: Any delete or irreversible operation MUST require explicit confirmation (confirmation modal or two-step button). No single-click deletes.

## 3. SSOT for UI Strings

All user-visible text (button labels, modal titles, tooltips, toast messages) comes from centralized config files — never hardcoded inline in component code.

| Content type | Config SSOT |
|---|---|
| Modal titles and metadata | `core/config/modals-config.js` |
| Tooltip text | `core/config/tooltips-config.js` |
| System messages / toasts | Centralized messages config |

Enforcement: The AST linter at `is/scripts/tests/lint-frontend-hardcode-ast.test.js` catches any hardcoded user-facing string assignments.

## 4. Naming Conventions for UI Code

| Pattern | Convention | Example |
|---|---|---|
| Action handlers | Verb-Noun | `savePortfolio`, `deleteAsset` |
| Boolean state | `is-` prefix | `isLoading`, `isActive`, `isVisible` |
| Event names | Past tense | `portfolioSaved`, `assetDeleted` |
| Container CSS classes | `avto-{descriptor}` | `avto-table-row`, `avto-modal-header` |

## 5. Zod Validation Gate

UI config files (`modals-config.js`, `tooltips-config.js`) are validated against Zod schemas in `core/contracts/ui-contracts.js` before the app is considered production-ready.

A typo in a config key — missing required field, wrong type — must cause a **test failure** (fail-fast), not a silent runtime defect on the client.

See `app/skills/ui-architecture.md` for the full RRG and no-build architecture contracts.
