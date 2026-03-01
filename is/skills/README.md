# Knowledge Base & MCP Skills (`is/skills/`)

## Scope
This directory is the brain of the Target App's AI-assisted development. It contains Markdown files (skills) that define the architectural rules, processes, and boundaries of the project.

## Integration
- These files are served to Cursor and Continue AI agents via the MCP server located in `is/mcp/skills/`.
- Code files reference these skills using JSDoc anchors (e.g., `/** @skill is/skills/arch-foundation.md */`).

## Contents
- `arch-*.md`: Architectural Decision Records (ADRs) defining the "why" and "how" of system design.
- `process-*.md`: Governance processes, collaboration rules, and language policies.

## Constraints
- **English Only**: All files in this directory MUST be written strictly in English (per `process-language-policy.md`).
- **Validation**: Every file must pass the structural checks enforced by `npm run skills:check`.
