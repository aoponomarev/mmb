---
name: git-commit-message
description: Generate descriptive git commit messages by analyzing staged changes (git diff). Use when the user asks to commit, write a commit message, or clicks the commit button in source control. Always run git diff --staged first, then produce a Conventional Commits title + detailed body.
---

# Git Commit Message

## Workflow

1. Run `git diff --staged` to see all staged changes.
2. If nothing is staged, run `git status` and inform the user.
3. Analyze the diff: what changed, why it matters, what the impact is.
4. Write the commit message using the format below.
5. Execute `git commit -m "$(cat <<'EOF'\n...\nEOF\n)"` with the full message.

## Message Format

```
<type>(<scope>): <short imperative summary, max 72 chars>

<body: what changed and why, 2-5 sentences>

<footer: breaking changes, issue refs — omit if not applicable>
```

### Types

| Type | When to use |
|------|-------------|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `refactor` | Code restructuring without behavior change |
| `chore` | Tooling, deps, config, CI |
| `docs` | Documentation only |
| `style` | Formatting, whitespace |
| `test` | Adding or fixing tests |
| `perf` | Performance improvement |

### Scope

Use the module, folder, or feature name: `auth`, `api`, `ui`, `skills`, `mcp`, etc. Omit if the change is truly cross-cutting.

## Rules

- Title: imperative mood ("Add", not "Added" / "Adds"), no period at end.
- Body: explain **why**, not just what. Mention trade-offs or alternatives considered if relevant.
- Wrap body lines at 72 characters.
- Never skip the body for non-trivial changes (more than 1 file or 10 lines).

## Examples

**Small fix:**
```
fix(api): handle null response from skills MCP server

The server occasionally returns null when no skills match the query.
Added a null-check before iterating to prevent a TypeError crash.
```

**New feature:**
```
feat(skills): add git-commit-message skill

Introduces a project-level skill that guides the agent to analyze
staged diffs and produce Conventional Commits messages with a
descriptive body. Replaces ad-hoc commit message generation.
```

**Chore / tooling:**
```
chore(deps): upgrade MCP SDK to v1.4.0

Resolves a breaking change in the tool descriptor format introduced
in v1.3.x. No functional changes to existing tools.
```
