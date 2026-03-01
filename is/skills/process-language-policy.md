---
title: "Process: Language & Terminology Governance"
tags: ["#process", "#language", "#terminology", "#naming", "#anti-calque"]
---

# Process: Language & Terminology Governance

> **Context**: During the migration, a severe terminology collision was discovered: Russian abbreviations were being directly transliterated into English letters (calquing) by AI agents or developers. To prevent cognitive load, broken searches, and AI hallucination, **transliterating Russian abbreviations into Latin letters is STRICTLY FORBIDDEN** in any code, filename, variable name, or English documentation.

## 1. Language Policy for Skills and Code (Mandatory)

- All files under `skills/**` (including `is/skills`, `core/skills`, `app/skills`) MUST be authored in **English**.
- All code comments, variable names, and commit messages MUST be authored in **English**.
- This includes titles, section text, comments, checklists, and operational instructions.
- Legacy non-English content is allowed only as quoted historical context when strictly needed for migration fidelity, including legacy abbreviations and their original Russian expansions.
- Russian is permitted in ALL documentation files across different folders (not just `docs/plans/`). However, all code, code comments, variable names, commit messages, and skills (`skills/**`) MUST remain strictly in English.

## 2. The Translation Mapping (Do vs Don't)

When a Russian concept must be named in English (e.g. for code or file paths), you must translate its *meaning* to standard IT terminology.

| Russian Concept | Meaning | ❌ BANNED (Calque) | ✅ REQUIRED (Translation) |
|---|---|---|---|
| **ЕИП** (Единый Источник Правды) | Single Source of Truth | `EIP` | `SSOT` |
| **MBB/MMB** | Legacy / Target App | `MBB`, `MMB` | `Legacy App`, `Target App` |

## 3. Enforcement
- **Trigger:** Whenever an agent generates variable names, writes documentation, translates concepts, or creates new files based on Russian prompts.
- **Migration Guardrail:** When migrating legacy code, agents must actively translate Russian comments to English and scan for banned calques, replacing them with correct standard terminology.
