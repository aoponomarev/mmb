---
id: copilot-beacon
status: active
last_updated: "2026-03-10"
---

# GitHub Copilot — Repository Context (Beacon)

> Copilot reads this file on every chat/agent request. Use it to align with project governance.

## SSOT References (read before making changes)

| Artifact | Path | Purpose |
|----------|------|---------|
| **Glossary** | [docs/glossary.md](../docs/glossary.md) | Terminology: Layer vs Contour, Service vs Provider, Gate vs Module. No calques (EIP→SSOT). |
| **ID Registry** | [is/contracts/docs/id-registry.json](../is/contracts/docs/id-registry.json) | Resolve `id:sk-xxx`, `id:ais-xxx` to file paths. |
| **Causality Registry** | [is/skills/causality-registry.md](../is/skills/causality-registry.md) | Use `#for-xxx` / `#not-xxx` hashes from here when adding rationale. |
| **Code File Registry** | [is/contracts/docs/code-file-registry.json](../is/contracts/docs/code-file-registry.json) | Resolve `#JS-xxx` hashes to file paths. |

## Layer Structure

- **app/** — Presentation Layer (UI, Vue components).
- **core/** — Business Logic Layer (services, providers, config).
- **is/** — Infrastructure Layer (scripts, contracts, skills, MCP).

Do not create `app/is/` or `core/is/` — "PF" means repository root.

## Output Conventions

- **Backlog tasks** (if creating): place in `docs/backlog/copilot-gh/` with date prefix.
- **No direct merges** — propose via PR; human reviews and merges.
- **Preflight** — code must pass `npm run preflight` before merge.

## Analytical Backlog Tasks (Issue "[Copilot] Аналитика интеграций")

When working on integration-analysis Issues:
1. **Do not** write generic "проверить релиз" — do analytical work.
2. **Study** release notes, changelog, new features of each source.
3. **Map** to app architecture (Beacon, glossary, layers app/core/is).
4. **Propose concrete improvements** — what to adopt, where, why.
5. **Write** to `docs/backlog/copilot-gh/YYYY-MM-DD-{source-id}.md` in Russian, with:
   - конкретное предложение (что сделать)
   - обоснование (какая новая фича, как применима к стеку)
   - ссылка на источник
