---
title: "Code Documentation"
reasoning_confidence: 1.0
reasoning_audited_at: "2026-03-02"
reasoning_checksum: "6dbfb3f4"
---

# Code Documentation

> **Context**: Rules for documenting Vue components that are split into separate template and script files.
> **Scope**: `shared/components/*`, `shared/templates/*`, `app/components/*`, `app/templates/*`

## Reasoning

- **#for-template-logic-separation** In our No-Build Vue architecture, templates (`*-template.js`) and logic (`*.js`) are physically separated. Documenting DOM structure in the logic file or API props in the template file creates cognitive dissonance and leads to outdated comments.
- **#not-doc-duplication** Duplicating documentation (e.g., listing props in both the template and the component file) guarantees that one will eventually drift and become incorrect. Cross-referencing is the only scalable approach.

## Core Rules

1.  **Template Headers (`*-template.js`):**
    Must ONLY contain documentation about:
    - HTML structure and nesting.
    - Layout decisions (flexbox, grid, paddings).
    - CSS classes used for layout.
    - Conditional rendering logic (`v-if`, `v-show`).
    - Slots and their scope.
    - *Do not document props or methods here.*

2.  **Component Headers (`*.js`):**
    Must ONLY contain documentation about:
    - Component API (props, emits, exposed methods).
    - Internal state and reactivity.
    - Business logic and data transformations.
    - Integration with external APIs (e.g., Bootstrap JS).
    - *Do not document HTML structure here.*

3.  **Cross-Referencing:**
    - In the template header, add: "Logic and API: see `component-name.js`".
    - In the component header, add: "Layout and DOM structure: see `component-name-template.js`".

## Contracts

- **No Duplication**: Never copy-paste descriptions of props or state into the template file.
