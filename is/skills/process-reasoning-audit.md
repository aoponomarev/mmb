---
title: "Process: Reasoning Audit Protocol"
reasoning_confidence: 0.85
reasoning_audited_at: "2026-03-01"
---

# Process: Reasoning Audit Protocol

> **Context**: Ensures all skills contain accurate, up-to-date Reasoning that reflects the actual codebase and algorithms. This protocol defines the mandatory order of operations and the gate that enforces compliance.

## Reasoning

- **#for-order-as-contract** The sequence (Review → Add → Score → Gate) prevents agents from adding confidence scores without verifying alignment. Scoring before review would be meaningless.
- **#for-confidence-by-agent** Only an AI (or human) that has analyzed the codebase can assign a meaningful score. Automated checks cannot verify semantic alignment.
- **#for-gate-enforcement** Without a failing gate, the protocol would be advisory. The gate makes Reasoning accuracy a release blocker, matching the project's "high cost of errors" stance.

---

## Mandatory Order of Operations

The Reasoning audit MUST be performed in this exact sequence. Skipping or reordering invalidates the audit.

| Step | Action | Owner |
|------|--------|-------|
| **1** | **Review** — Verify each existing Reasoning block against the current codebase and algorithms. Update or remove any Reasoning that no longer matches reality. | AI agent |
| **2** | **Add** — For skills lacking Reasoning, add it based on deep analysis of the skill's scope, governed code, and architectural intent. | AI agent |
| **3** | **Score** — Assign a confidence score (0–1) to each Reasoning. The AI agent evaluates how well the Reasoning reflects the actual implementation. | AI agent |
| **4** | **Gate** — Run `npm run skills:reasoning:check`. The gate fails if any skill violates the Reasoning contract. | CI / preflight |

## Reasoning Format Contract (Hash-Tagged List)

**Reasoning MUST be the first substantive section** (immediately after Context/Scope). Rules and implementation details follow Reasoning.

**Hash prefixes (causality):**
- **#for-...** — "for" — positive reasons, why we chose this way.
- **#not-...** — negative reasons, why we rejected alternatives. Placed at the **end** of the Reasoning list. No separate "Alternatives Considered" section; no "rejected" marking (prefix implies it).

**Format:**
- One `## Reasoning` section.
- Unnumbered list: first all `#for-...` (most to least significant), then all `#not-...` at the end.
- Each item: `**#for-hash**` or `**#not-hash**` in bold — same hash = same concept across skills (cross-skill search).

**Example:**
```markdown
## Reasoning

- **#for-anti-calque** Russian abbreviations transliterated into Latin cause cognitive load and broken search. Standard IT terms (SSOT, Target App) are unambiguous.
- **#for-ssot-paths** Infrastructure scripts run from varying CWDs. Absolute paths from a single registry guarantee correctness.
- **#not-central-docs** Central docs/ architecture doc — low discoverability for AI agents; skills are MCP-indexed.
- **#not-hardcoded-paths** Hardcoded paths in scripts — CWD-dependent failures.
```

**Hash registry:** Hashes are canonical. Reuse the same hash across skills. **Identical formulation:** when reusing a hash, the text after it MUST be verbatim identical to the canonical formulation in the registry below. This enables grep/search to find all occurrences of the same reason.

**Section headers:** No numbering. Use `## Rejection of Old Abbreviations` not `## 1. Rejection of Old Abbreviations`.

### Canonical Hash Registry (Formulations)

When a skill references a hash, use the exact formulation below. Add new hashes here when introducing new concepts.

| Hash | Formulation |
|------|-------------|
| `#for-anti-calque` | Russian abbreviations transliterated into Latin (mbb, mmb, EIP) cause cognitive load, broken search, and AI hallucination. Standard IT terminology (SSOT, Target App, Legacy App) is unambiguous. |
| `#for-ssot-paths` | Infrastructure scripts run from varying CWDs (preflight, CI, local dev). Relative paths break; absolute paths from a single registry (`paths.js`) guarantee correctness. |
| `#for-imports-relative` | Bundlers and IDE static analysis rely on import paths. Absolute paths in imports break resolution; file operations use PATHS. |
| `#for-file-protocol` | No local Node.js server may be a UI dependency — GitHub Pages serves static files only. Cloudflare Worker proxy enables CORS bypass for both `file://` and `https://` without code changes. |
| `#for-node-test` | Zero external test dependency; built-in since Node 18. Sufficient for contract and integration testing at current scale. |
| `#for-skill-anchors` | Textual reasoning in skills (with #for-/#not- hashes) provides causality value. Skill anchors connect code to reasoning without a separate causality ID namespace. |
| `#not-central-docs` | Central docs/ architecture doc — low discoverability for AI agents; skills are MCP-indexed. |
| `#not-hardcoded-paths` | Hardcoded paths in scripts — CWD-dependent failures. |
| `#not-bundler-ui` | Bundler for UI — violates file:// and GitHub Pages static hosting. |
| `#for-order-as-contract` | The sequence (Review → Add → Score → Gate) prevents agents from adding confidence scores without verifying alignment. Scoring before review would be meaningless. |
| `#for-confidence-by-agent` | Only an AI (or human) that has analyzed the codebase can assign a meaningful score. Automated checks cannot verify semantic alignment. |
| `#for-gate-enforcement` | Without a failing gate, the protocol would be advisory. The gate makes Reasoning accuracy a release blocker, matching the project's "high cost of errors" stance. |
| `#for-fail-fast` | Fail-fast over graceful degradation during migration: fallback chains for external critical contracts are intentionally avoided. Failed provider = visible failure, not silent data corruption. |
| `#for-partial-failure-tolerance` | `getAllBestEffort` returns healthy metrics alongside error reports for failed ones, preventing one bad metric from blocking the entire snapshot. |
| `#for-rate-limiting` | Free-tier APIs have strict rate limits. Proactive waiting avoids persistent 429 failures. |
| `#for-single-writer-guard` | A strict `DATA_PLANE_ACTIVE_APP` contract ensures only one environment (Target or Legacy) writes to shared cloud resources, preventing data races. |
| `#for-hardcode-ban` | Scattered hardcoded strings cause maintenance drift — the same label updated in one place but not another. A single SSOT config is the only mutation point. |
| `#for-zod-ui-validation` | A typo in a config (missing required key) must not produce silent runtime errors on the client. Fail-fast at test time catches it before deployment. |
| `#for-eip` | Divergence between `.env` and `.env.example` is the #1 cause of "works on my machine" failures. New keys without template entries break CI and onboarding. |

## Reasoning Formats by Skill Type

| Skill type | Required Reasoning format | Example |
|------------|---------------------------|---------|
| `arch-*.md` | `## Reasoning` (hash-tagged: #for-... then #not-...) | See `arch-foundation.md` |
| `core/skills/*.md` | `## Reasoning` (hash-tagged) or per-rule `**#for-hash**` inline | See `api-layer.md` |
| `app/skills/*.md` | Same as core | See `ui-architecture.md` |
| `process-*.md` | `## Reasoning` (hash-tagged) | See `process-secrets-hygiene.md` |

**Context** (the `> **Context**:` block) is NOT sufficient. Context describes *when* to use the skill; Reasoning explains *why* specific rules or decisions were made.

## Confidence Scoring

Every skill with Reasoning MUST include a confidence score in frontmatter:

```yaml
---
reasoning_confidence: 0.85
reasoning_audited_at: "2026-03-01"
---
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reasoning_confidence` | float 0–1 | Yes | AI agent's assessment: how well Reasoning matches the codebase. See scale below. |
| `reasoning_audited_at` | ISO date | Yes | Date of last audit. Used to detect stale Reasoning. |

### Confidence Scale

| Score | Meaning |
|-------|---------|
| **0.9–1.0** | Reasoning fully aligned with code. All referenced files, patterns, and algorithms exist and behave as described. |
| **0.7–0.89** | Minor gaps: some edge cases or recent refactors not yet reflected. No contradictions. |
| **0.5–0.69** | Notable gaps: outdated references, missing alternatives, or partial mismatch. Needs update soon. |
| **0.3–0.49** | Significant drift: Reasoning describes patterns that no longer exist or are contradicted by code. |
| **0–0.29** | Reasoning is obsolete or speculative. Must be rewritten or removed. |

**Gate threshold**: `reasoning_confidence >= 0.5`. Below 0.5, the skill fails the gate.

## Gate Contract

The `validate-reasoning.js` script enforces:

1. **Reasoning presence**: Every skill (except README/index files) MUST have Reasoning in the format appropriate for its type.
2. **Confidence presence**: Every skill with Reasoning MUST have `reasoning_confidence` in frontmatter.
3. **Confidence threshold**: `reasoning_confidence >= 0.5`.
4. **Audit recency**: `reasoning_audited_at` within last 180 days (configurable). Stale audits produce a warning.

**Exit codes**:
- `0` — All skills pass.
- `1` — One or more skills fail (missing Reasoning, missing/low confidence, or stale audit).

## When to Run the Audit

| Trigger | Scope |
|---------|-------|
| Before major release | Full audit of all skills |
| After significant refactor | Skills governing changed code |
| After adding a new skill | That skill only |
| Periodic (e.g. quarterly) | Full audit |

## Relationship to Other Skills

- **arch-causality**: Defines *what* causality is and *where* it lives. This skill defines *how* to keep it accurate.
- **process-skill-placement**: Defines where skills live. This skill defines what each skill must contain.
- **process-ai-collaboration**: "Active Causality Recording" — when writing code, record why. This skill — when auditing, verify and score.

## Transitional Period (Initial Audit)

Until all skills have Reasoning and confidence scores, preflight will fail the Reasoning gate. Options:

- **Run full audit**: Add Reasoning and `reasoning_confidence` / `reasoning_audited_at` to all skills. Then preflight passes.
- **Temporary bypass**: `PREFLIGHT_SKIP_REASONING=1 npm run preflight` — skips the Reasoning gate. Use only during the audit phase; remove before release.

## Anti-Patterns

| Anti-pattern | Correct action |
|--------------|----------------|
| Adding `reasoning_confidence` without reviewing the codebase | Run Step 1 first. Score reflects actual alignment. |
| Copying Reasoning from a donor project without verifying | Audit against Target App codebase only. |
| Using "Context" as a substitute for Reasoning | Context = when to use. Reasoning = why rules exist. Both required. |
| Skipping the gate to unblock CI | Fix the skill; do not disable the gate. Use `PREFLIGHT_SKIP_REASONING=1` only during transition. |
