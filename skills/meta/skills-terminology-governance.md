---
id: skills-terminology-governance
title: "Meta: Terminology & Anti-Calque Governance"
scope: meta
tags: [#meta, #terminology, #naming, #anti-calque, #ssot, #ssot-command]
version: 1.1.0
priority: high
updated_at: 2026-02-22
status: active
decision_scope: architecture
decision_id: ADR-META-003
supersedes: none
relations:
  - protocol-command-eip
  - process-agent-commands
  - protocol-command-fin-discovery
---

# Meta: Terminology & Anti-Calque Governance

## Problem Context
During the migration from MBB to MMB, a severe terminology collision was discovered: Russian abbreviations were being directly transliterated into English letters (calquing) by AI agents or developers. 

The worst offender was **ЕИП** (Single Source of Truth command) being transliterated to **EIP** (a standard IT acronym for *Enterprise Integration Patterns*). This caused AI agents to hallucinate incorrect architectural concepts.

## Contract (Mandatory Naming Rules)

To prevent cognitive load, broken searches, and AI hallucination, **transliterating Russian abbreviations into Latin letters is STRICTLY FORBIDDEN** in any code, filename, variable name, or English documentation.

### Language Policy for Skills (Mandatory)

- All files under `skills/**` must be authored in English.
- This includes titles, section text, comments, checklists, and operational instructions.
- Legacy non-English content is allowed only as quoted historical context when strictly needed for migration fidelity, including legacy abbreviations and their original Russian expansions.
- Personal migration notes that are explicitly user-owned can remain outside this rule by direct user decision (for example `skills/MIGRATION.md`).

### The Translation Mapping (Do vs Don't)

When a Russian concept must be named in English (e.g. for code or file paths), you must translate its *meaning* to standard IT terminology.

| Russian Concept | Meaning | ❌ BANNED (Calque) | ✅ REQUIRED (Translation) |
|---|---|---|---|
| **ЕИП** (Единый Источник Правды / SSOT command) | Single Source of Truth | `EIP` | `SSOT` |
| **ВЗП** (Выполнение по Плану / planned execution command) | Planned Execution | `VZP` | `Planned Execution`, `Task Plan` |
| **КАИ** (Код, Архитектура, Инфраструктура / code-architecture-infrastructure command) | Code, Arch, Infra scan | `KAI` | `CAI`, `Arch-Scan` |
| **ОМК** (Очень Мало Кода / brevity command) | Brevity Protocol | `OMK` | `Brevity`, `Concise` |
| **АИС** (Архитектурно-Инфраструктурное Сканирование / architecture scan command) | Architecture Scan | `AIS` | `Arch-Scan` |
| **ФИН** (Финализация / finalization command) | Task Finalization | `FIN` | `Finalization`, `Task-Close` |
| **ФИНС** (Фичи, Интеграции, Настройки, Навыки / discovery command) | Structured Discovery Blocks | `FINS` | `Finalization Discovery Blocks`, `Features/Integrations/Settings/Skills` |

## Enforcement & Triggers
- This policy is permanently enforced by the global MDC rule: `.cursor/rules/global-rules/anti-calque-terminology-always.mdc`.
- **Trigger:** Whenever an agent generates variable names, writes documentation, translates concepts, or creates new files based on Russian prompts.
- **Migration Guardrail:** When migrating legacy code from MBB, agents must actively scan for banned calques (like `EIP`) and replace them with the correct standard terminology (e.g. `SSOT`).
