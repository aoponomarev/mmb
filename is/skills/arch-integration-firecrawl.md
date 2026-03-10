---
id: sk-9f6a7b
title: "Integration: Firecrawl (Docs Scraping for Agents)"
reasoning_confidence: 1.0
reasoning_audited_at: 2026-03-10
reasoning_checksum: e30d97bc
last_change: ""
related_skills:
  - sk-918276
related_ais:
  - ais-c8f2a1

---

# Integration: Firecrawl (Docs Scraping for Agents)

> **Context**: Firecrawl MCP for web scraping, crawling, and structured extraction. Enables agents to fetch changelogs, docs, release notes without manual copy-paste.
> **Scope**: Copilot backlog (id:ais-c8f2a1), docs/backlog/copilot-gh/sources.json, is/scripts/infrastructure. Cursor rule: `.cursor/rules/infra-firecrawl.mdc`.

## Reasoning

- **#for-docs-scraping-agent** Agents can scrape external URLs (changelogs, docs) for Copilot backlog analysis. Replaces manual copy-paste.
- **#for-env-sync-ssot** Wrapper `is/scripts/infrastructure/firecrawl-mcp-wrapper.js` loads .env before spawning; FIRECRAWL_API_KEY in .env.example.
- **#for-ai-tooling-abstraction** firecrawl_scrape, firecrawl_search, firecrawl_extract — structured tools over raw fetch.

## Core Rules

1. **firecrawl_scrape:** Single URL (changelog, release notes) — when Copilot Issue references a source URL.
2. **firecrawl_search:** Broad research — "TypeScript MCP best practices", "Cloudflare Workers KV limits".
3. **firecrawl_extract:** Structured output — JSON schema for release notes, feature lists.
4. **Output location:** Copilot backlog writes to `docs/backlog/copilot-gh/YYYY-MM-DD-{source-id}.md` per id:ais-c8f2a1.

## Contracts

- **MCP:** `npx firecrawl-mcp` via wrapper (loads .env). Wrapper: `is/scripts/infrastructure/firecrawl-mcp-wrapper.js`.
- **API key:** firecrawl.dev/app. Add to .env as `FIRECRAWL_API_KEY` (.env.example §5).
- **SSOT:** id:ais-c8f2a1 (Copilot AIS), docs/backlog/copilot-gh/sources.json. Cursor rule: `.cursor/rules/infra-firecrawl.mdc`.
