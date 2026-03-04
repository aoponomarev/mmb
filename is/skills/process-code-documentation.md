---
title: "Code Documentation"
reasoning_confidence: 1.0
reasoning_audited_at: "2026-03-04"
reasoning_checksum: "208c2136"
id: sk-f449b3

---

# Code Documentation

> **Context**: Rules for documenting Vue components, separating API contracts from architectural principles, and formatting inline code comments.
> **Scope**: `shared/components/*`, `shared/templates/*`, `app/components/*`, `app/templates/*`, all `.js` files

## Reasoning

- **#for-header-skill-separation** File headers must act as strict API contracts answering "What is this?" and "How do I use it?". Broad philosophical principles and "Why" statements belong in the skills registry (см. is/skills/, core/skills/, app/skills/). Mixing them causes context window bloat and rule divergence across the codebase.
- **#for-template-logic-separation** In our No-Build Vue architecture, templates (`*-template.js`) and logic (`*.js`) are physically separated. Documenting DOM structure in the logic file or API props in the template file creates cognitive dissonance.
- **#not-doc-duplication** Duplicating documentation (e.g., listing props in both the template and the component file) guarantees that one will eventually drift and become incorrect.
- **#for-english-why-comments** Inline comments describing "what" the code does (e.g., `// loop through array`) are noise. Comments must exclusively explain "Why" (circumstances) and "For what" (goal) in English to build a raw causality base.
- **#for-mandatory-comment-rewrite** Legacy code contains Russian comments and descriptive noise. AI agents are contractually obligated to rewrite these into English causal comments whenever they edit a surrounding block.

## Core Rules

1.  **Header vs. Skill Separation:**
    - **File Header**: Only contains technical API (Props, Emits, Methods) and the `PURPOSE:` (1-2 sentences). Must include `@skill-anchor` pointing to relevant architecture skills.
    - **Skill Files**: Contains the "Why", the principles, and the systemic rules. Do not put global rules in file headers.

2.  **Template vs. Component Headers:**
    - `*-template.js`: HTML structure, layout decisions, CSS classes, slots.
    - `*.js`: API (props/emits), state, business logic, integrations.
    - *Cross-Reference*: Use "Logic and API: see `X.js`" or "Layout: see `Y-template.js`". Never duplicate.

3.  **Inline Code Comments (MANDATORY REWRITE POLICY):**
    When an AI agent modifies or reviews code, it **MUST** proactively rewrite nearby comments according to these rules:
    - **Language**: Strictly English.
    - **Focus**: Explain ONLY the *Why* (the underlying reason/edge case) and *For what* (the intended business goal).
    - **Ban**: Never describe *What* the code is doing (e.g., `// filter active users`). If the code is not self-documenting, refactor the code first.

### Documentation Style (Telegraphic Technical)

**Context**: "Telegraphic Technical" standard for skills and docs.

**Style guide**: Tone — dry, precise, imperative; Structure — Context, Rules, Workflow, File Map; Lists — numbered for sequences, bullets for sets; Links — relative paths; Argumentation — critical rules need *why*; Commands — backticks.

**Cyrillic anchors**: Core protocol commands use Cyrillic abbreviations as semantic anchors; ALWAYS wrap in backticks (e.g. `ЕИП`, `ОМК`, `АИС`).

**Constraints**: Docs freeze — no new files in old docs/; use skills (см. is/skills/ и т.д.); English for new content (except anchors).

## Contracts

- **AI Enforcement**: Agents modifying code without simultaneously upgrading its comments to English causality format violate the `#for-mandatory-comment-rewrite` contract.
