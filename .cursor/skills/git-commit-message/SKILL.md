---
name: git-commit-message
description: Generate descriptive git commit messages by analyzing staged changes (git diff). Use when the user asks to commit, write a commit message, or clicks the commit button in source control. Always run git diff --staged first, then produce a Conventional Commits title + detailed body enriched with architectural tags.
---

# Git Commit Message

## Workflow

1. Run `git diff --staged` to see all staged changes.
2. If nothing is staged, run `git status` and inform the user.
3. Analyze the diff: what changed, why it matters, what the impact is.
4. **Identify contextual tags:** Check if the changes affect SSOT, MCP servers, or specific Skills.
5. Write the commit message using the format below.
6. Execute `git commit -m "$(cat <<'EOF'\n...\nEOF\n)"` with the full message.

## Message Format

```
<type>(<scope>): <short imperative summary, max 72 chars>

<body: what changed and why, 2-5 sentences>

[Context Tags]
<footer: breaking changes, issue refs — omit if not applicable>
```

### Types

| Type | When to use |
|------|-------------|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `refactor` | Code restructuring without behavior change |
| `chore` | Tooling, deps, config, CI |
| `docs` | Documentation only (including `.mdc` rules and `.md` skills) |
| `style` | Formatting, whitespace |
| `test` | Adding or fixing tests |
| `perf` | Performance improvement |

### Scope

Use the module, folder, or feature name: `auth`, `api`, `ui`, `skills`, `mcp`, `infra`, `n8n`, etc. Omit if the change is truly cross-cutting.

## Context Tags (The "Magic" Enrichment)

To help future AI agents instantly find relevant commits and understand architectural decisions, append these tags to the bottom of your commit body (above the footer):

- `[Skill: <skill-name>]` — if the commit implements a pattern from a skill, modifies a skill, or creates a new one.
- `[MCP: <server-name>]` — if the commit touches MCP server logic or tools (e.g., `skills-mcp`, `memory-mcp`).
- `[SSOT: <path>]` — if the commit modifies a Single Source of Truth file (e.g., `INFRASTRUCTURE_CONFIG.yaml`).
- `[Rule: <rule-name>]` — if the commit modifies or creates a `.cursor/rules/*.mdc` file.

## Rules

- Title: imperative mood ("Add", not "Added" / "Adds"), no period at end.
- Body: explain **why**, not just what. Mention trade-offs or alternatives considered if relevant.
- Wrap body lines at 72 characters.
- Never skip the body for non-trivial changes (more than 1 file or 10 lines).
- **Always include at least one Context Tag** if the change touches the AI architecture (skills, mcp, rules, ssot).

## Examples

**Small fix:**
```
fix(api): handle null response from skills MCP server

The server occasionally returns null when no skills match the query.
Added a null-check before iterating to prevent a TypeError crash.

[MCP: skills-mcp]
```

**New feature with SSOT update:**
```
feat(infra): migrate DB connections to local SQLite

Moved n8n and Continue to use local SQLite databases stored in OneDrive
to prevent connection timeouts in Yandex Cloud. Updated the central
infrastructure config to reflect the new SSOT paths.

[SSOT: INFRASTRUCTURE_CONFIG.yaml]
[Rule: memory-protocol-always.mdc]
```

**Chore / tooling:**
```
chore(deps): upgrade MCP SDK to v1.4.0

Resolves a breaking change in the tool descriptor format introduced
in v1.3.x. No functional changes to existing tools.

[MCP: skills-mcp]
[MCP: agents-mcp]
```
