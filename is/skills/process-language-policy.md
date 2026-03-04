---
title: "Process: Language & Terminology Governance"
tags: ["#process", "#language", "#terminology", "#naming", "#anti-calque"]
reasoning_confidence: 0.95
reasoning_audited_at: "2026-03-04"
reasoning_checksum: "254ee5f7"
id: sk-883639

---

# Process: Language & Terminology Governance

> **Context**: During the migration, a severe terminology collision was discovered: Russian abbreviations were being directly transliterated into English letters (calquing) by AI agents or developers. To prevent cognitive load, broken searches, and AI hallucination, **transliterating Russian abbreviations into Latin letters is STRICTLY FORBIDDEN** in any code, filename, variable name, or English documentation.

## Reasoning

- **#for-anti-calque** Transliterated Russian abbreviations (mbb, mmb, EIP) break text searches, increase cognitive load, and cause AI hallucination. Use standard English IT terminology instead.
- **#for-skills-english** Skills must be in English since they are indexed and consumed by MCP servers and AI agents.
- **#for-code-english** Code comments and variables must be universally readable by future maintainers and agents.
- **#for-russian-in-docs** Stakeholder-facing docs (migration plans, runbooks) may use Russian, but implementation artifacts must stay English.

---

## Core Rules

- All files under `skills/**` (including `is/skills`, `core/skills`, `app/skills`) MUST be authored in **English**.
- All code comments, variable names, and commit messages MUST be authored in **English**.
- This includes titles, section text, comments, checklists, and operational instructions.
- Legacy non-English content is allowed only as quoted historical context when strictly needed for migration fidelity, including legacy abbreviations and their original Russian expansions.
- Russian is permitted in ALL documentation files across different folders (not just `docs/plans/`). However, all code, code comments, variable names, commit messages, and skills (`skills/**`) MUST remain strictly in English.
- Any file containing Cyrillic text MUST be saved in UTF-8. Encoding regressions (mojibake, e.g. U+FFFD replacement character or BOM rendered as cp1251 text) are treated as documentation corruption and must be fixed before closing the task.

## Contracts

When a Russian concept must be named in English (e.g. for code or file paths), you must translate its *meaning* to standard IT terminology.

| Russian Concept | Meaning | ❌ BANNED (Calque) | ✅ REQUIRED (Translation) |
|---|---|---|---|
| **ЕИП** (Единый Источник Правды) | Single Source of Truth | `EIP` | `SSOT` |
| **MBB/MMB** | Legacy / Target App | `MBB`, `MMB` | `Legacy App`, `Target App` |

## Implementation Status

- **Trigger:** Whenever an agent generates variable names, writes documentation, translates concepts, or creates new files based on Russian prompts.
- **Migration Guardrail:** When migrating legacy code, agents must actively translate Russian comments to English and scan for banned calques, replacing them with correct standard terminology.
