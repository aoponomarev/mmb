---
id: arch-template-adr
title: "Architecture: ADR Template"
scope: architecture
tags: [#architecture, #adr, #template, #migration]
version: 1.0.0
priority: high
updated_at: 2026-02-22
status: active
confidence: high
review_after: 2026-05-22
decision_scope: architecture
decision_id: ADR-ARCH-000
supersedes: none
---

# Architecture ADR Template

## Overview
- Коротко: что за архитектурное решение и где применяется.

## Implementation Status in MMB
- **Implemented:** что уже есть в коде MMB.
- **Pending:** что еще не реализовано.
- **Doubtful:** что под вопросом или требует переоценки.

## Architectural Reasoning (Why this way)
- Почему выбрали этот вариант.
- Какие ограничения учитывали (runtime, infra, безопасность, DX).

## Alternatives Considered
- Вариант A: плюсы/минусы и почему отклонен.
- Вариант B: плюсы/минусы и почему отклонен.

## Migration Notes
- Что убрано из MBB-специфики.
- Что оставлено и почему.

## Supersedes
- Если решение заменяет старое: укажи ID предыдущего ADR в `supersedes`.
- Если это первое решение: `supersedes: none`.

## Relations
- process-skill-id (governing process)
- security-or-integration-skill-id (cross-domain dependency)
