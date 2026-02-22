---
id: skills-terminology-governance
title: "Meta: Terminology & Anti-Calque Governance"
scope: meta
tags: [#meta, #terminology, #naming, #anti-calque, #ssot, #еип]
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
---

# Meta: Terminology & Anti-Calque Governance

## Problem Context
During the migration from MBB to MMB, a severe terminology collision was discovered: Russian abbreviations were being directly transliterated into English letters (calquing) by AI agents or developers. 

The worst offender was **ЕИП** (Единый Источник Правды) being transliterated to **EIP** (which is a standard IT acronym for *Enterprise Integration Patterns*). This caused AI agents to hallucinate incorrect architectural concepts.

## Contract (Mandatory Naming Rules)

To prevent cognitive load, broken searches, and AI hallucination, **transliterating Russian abbreviations into Latin letters is STRICTLY FORBIDDEN** in any code, filename, variable name, or English documentation.

### The Translation Mapping (Do vs Don't)

When a Russian concept must be named in English (e.g. for code or file paths), you must translate its *meaning* to standard IT terminology.

| Russian Concept | Meaning | ❌ BANNED (Calque) | ✅ REQUIRED (Translation) |
|---|---|---|---|
| **ЕИП** (Единый Источник Правды) | Single Source of Truth | `EIP` | `SSOT` |
| **ВЗП** (Запланированное выполнение)| Planned Execution | `VZP` | `Planned Execution`, `Task Plan` |
| **КАИ** (Код, Архитектура, Инфра)| Code, Arch, Infra scan | `KAI` | `CAI`, `Arch-Scan` |
| **ОМК** (Отказ от мыслей / Краткость)| Brevity Protocol | `OMK` | `Brevity`, `Concise` |
| **АИС** (Обзор архитектуры) | Architecture Scan | `AIS` | `Arch-Scan` |
| **ФИН** (Финализация) | Task Finalization | `FIN` | `Finalization`, `Task-Close` |

## Enforcement & Triggers
- This policy is permanently enforced by the global MDC rule: `.cursor/rules/global-rules/anti-calque-terminology-always.mdc`.
- **Trigger:** Whenever an agent generates variable names, writes documentation, translates concepts, or creates new files based on Russian prompts.
- **Migration Guardrail:** When migrating legacy code from MBB, agents must actively scan for banned calques (like `EIP`) and replace them with the correct standard terminology (e.g. `SSOT`).
