---
id: sk-7f4e5d
title: "Integration: Sentry (Production Error Plane)"
reasoning_confidence: 1.0
reasoning_audited_at: 2026-03-10
reasoning_checksum: 094f3cdd
last_change: ""
related_skills:
  - sk-92384e
  - sk-5cd3c9
related_ais:
  - ais-775420

---

# Integration: Sentry (Production Error Plane)

> **Context**: Sentry MCP and Cursor plugin for production error tracking. Complements id:sk-92384e (local monitoring); Sentry = remote production error plane.
> **Scope**: Cloudflare Workers (Edge API), Yandex Cloud Functions, app/core layers. Cursor rule: `.cursor/rules/infra-sentry.mdc`.

## Reasoning

- **#for-production-error-plane** Sentry covers production errors from Workers and Functions. Distinct from id:sk-92384e (health-check, jsonl, local logs). Agents query Sentry for "top errors", "critical issues" via MCP.
- **#for-redaction-by-design** Never log tokens, emails, user IDs in Sentry breadcrumbs or context. id:sk-92384e applies.
- **#for-observability** Production errors require a dedicated plane; local monitoring cannot see edge runtime failures.

## Core Rules

1. **Transport domain tags:** Errors from Cloudflare → `source:cloudflare`; Yandex → `source:yandex`. Map to id:ais-775420 domain separation.
2. **MCP usage:** Command `/seer` or Sentry MCP tools for "top errors last 24h", "critical issues in edge-api".
3. **Skill `sentry-code-review`:** For PRs with Sentry-detected bugs — agent applies fixes per project conventions (layers, glossary).
4. **No PII:** Breadcrumbs and context must never contain secrets or PII.

## Contracts

- **MCP:** `https://mcp.sentry.dev/mcp` (remote). Auth via Cursor plugin UI.
- **Instrumentation:** When adding Sentry SDK to Workers/Functions, follow transport tagging and redaction rules above.
- **SSOT:** id:ais-775420 (AIS Infrastructure), id:sk-5cd3c9 (Cloudflare routes), id:sk-92384e (local monitoring). Cursor rule: `.cursor/rules/infra-sentry.mdc`.
