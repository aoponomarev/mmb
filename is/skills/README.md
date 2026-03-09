---
id: sk-a3f46c

---

# Knowledge Base & MCP Skills (`is/skills/`)

## Scope
This directory is the brain of the PF's AI-assisted development. It contains Markdown files (skills) that define the architectural rules, processes, and boundaries of the project.

## Integration
- These files are served to Cursor and Continue AI agents via the MCP server located in `is/mcp/skills/`.
- Code files reference these skills using JSDoc anchors (e.g., `/** @skill is/skills/arch-foundation.md */`).

## Contents

**Architectural skills** (`arch-*.md`) — ADRs defining the "why" and "how" of system design:
- `arch-foundation` — Core naming, paths SSOT, security, hosting, testing, control plane
- `arch-backend-core` — API layer, data providers, composition root, layer separation
- `arch-causality` — How architectural reasoning is recorded (textual, in arch-*.md)
- `arch-control-plane` — Preflight, health-check, single-writer guard
- `arch-dependency-governance` — Dependency minimalism, upgrade policy
- `arch-external-parity` — External infra parity during migration
- `arch-layout-governance` — Directory contracts, README enforcement policy
- `arch-monitoring` — Health monitoring, trends, rollback linkage
- `arch-rollback` — Rollback triggers, layered protocol, human confirmation
- `arch-skills-mcp` — Skills knowledge base, MCP server, validation gates
- `arch-testing-ci` — node:test, GitHub Actions CI, contract-first preflight

**Process skills** (`process-*.md`) — Governance processes and agent behavior rules:
- `process-ai-collaboration` — Agent directives, skepticism, micro-steps, no unprompted commits, 7 command dictionary (ВЗП/КАИ/АИС/ЕИП/ФИН/ФИНС/ОМК)
- `process-code-anchors` — Linking code to skills via @skill / @skill-anchor / @causality (hash-based)
- `causality-registry` — Canonical hash registry for #for-/#not- used in skills and code
- `process-env-sync` — .env / .env.example EIP sync contract
- `process-evolution-logging` — Session work and milestone recording in project-evolution.md
- `process-language-policy` — English-only for skills/code; Russian allowed in docs
- `process-migration-prioritization` — Scoring formula for next migration step
- `process-secrets-hygiene` — Zero-tolerance secrets policy, incident response
- `process-skill-placement` — Decision table and contract for correct skill profiling across is/core/app
- `process-windows-shell` — **HARD BAN: no bash in Cursor on Windows**. PowerShell patterns

> **Domain skills** live in `core/skills/` and `app/skills/` — see their README files.

## Constraints
- **English Only**: All files in this directory MUST be written strictly in English (per `process-language-policy.md`).
- **Validation**: Every file must pass the structural checks enforced by `npm run skills:check`.
