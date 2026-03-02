# Causality Hash Registry

All hashes used in `@causality` and `@skill-anchor` MUST exist in this registry.
Add new hashes here before using in code. Skills and code share the same namespace.

**Semantic Duplication Check:** Before adding a new hash, read this entire table. If a semantically equivalent reason already exists (e.g., `#for-fail-fast` vs `#for-timeout-fail-fast`), REUSE the existing hash. You may expand the existing formulation to cover your nuance, but DO NOT create a duplicate hash.

**Formats:**
- `// @causality #for-X` or `// @causality #for-X #not-Y` or `// @causality #for-X: short context`
- `// @skill-anchor skill-id #for-X` or `// @skill-anchor skill-id #for-X #not-Y`

| Hash | Formulation |
|------|-------------|
| `#for-anti-calque` | Russian abbreviations transliterated into Latin (mbb, mmb, EIP) cause cognitive load, broken search, and AI hallucination. Standard IT terminology (SSOT, Target App, Legacy App) is unambiguous. |
| `#for-ssot-paths` | Infrastructure scripts run from varying CWDs (preflight, CI, local dev). Relative paths break; absolute paths from a single registry (`paths.js`) guarantee correctness. |
| `#for-imports-relative` | Bundlers and IDE static analysis rely on import paths. Absolute paths in imports break resolution; file operations use PATHS. |
| `#for-file-protocol` | No local Node.js server may be a UI dependency — GitHub Pages serves static files only. Cloudflare Worker proxy enables CORS bypass for both `file://` and `https://` without code changes. |
| `#for-node-test` | Zero external test dependency; built-in since Node 18. Sufficient for contract and integration testing at current scale. |
| `#for-skill-anchors` | Textual reasoning in skills (with #for-/#not- hashes) provides causality value. Skill anchors connect code to reasoning without a separate causality ID namespace. |
| `#not-central-docs` | Central docs/ architecture doc — low discoverability for AI agents; skills are MCP-indexed. |
| `#not-hardcoded-paths` | Hardcoded paths in scripts — CWD-dependent failures. |
| `#not-bundler-ui` | Bundler for UI — violates file:// and GitHub Pages static hosting. |
| `#for-order-as-contract` | The sequence (Review → Add → Score → Gate) prevents agents from adding confidence scores without verifying alignment. Scoring before review would be meaningless. |
| `#for-confidence-by-agent` | Only an AI (or human) that has analyzed the codebase can assign a meaningful score. Automated checks cannot verify semantic alignment. |
| `#for-gate-enforcement` | Without a failing gate, the protocol would be advisory. The gate makes Reasoning accuracy a release blocker, matching the project's "high cost of errors" stance. |
| `#for-fail-fast` | Fail-fast over graceful degradation during migration: fallback chains for external critical contracts are intentionally avoided. Failed provider = visible failure, not silent data corruption. |
| `#for-partial-failure-tolerance` | `getAllBestEffort` returns healthy metrics alongside error reports for failed ones, preventing one bad metric from blocking the entire snapshot. |
| `#for-rate-limiting` | Free-tier APIs have strict rate limits. Proactive waiting avoids persistent 429 failures. |
| `#for-single-writer-guard` | A strict `DATA_PLANE_ACTIVE_APP` contract ensures only one environment (Target or Legacy) writes to shared cloud resources, preventing data races. |
| `#for-hardcode-ban` | Scattered hardcoded strings cause maintenance drift — the same label updated in one place but not another. A single SSOT config is the only mutation point. |
| `#for-zod-ui-validation` | A typo in a config (missing required key) must not produce silent runtime errors on the client. Fail-fast at test time catches it before deployment. |
| `#for-eip` | Divergence between `.env` and `.env.example` is the #1 cause of "works on my machine" failures. New keys without template entries break CI and onboarding. |
| `#for-filesystem-cache` | A file-based cache survives script restarts, is trivially cleared, and does not consume application RAM. |
| `#for-layer-separation` | Layer separation (Service → Transport → HTTP Handler → Server): each layer has single responsibility, making testing trivial and replacement easy. |
| `#for-composition-root` | Composition Root pattern: assemble all dependencies in one place, enabling test-time injection of mocks and ensuring no hidden coupling. |
| `#for-request-id-traceability` | Every HTTP request carries a sanitized `x-request-id` through all layers, making distributed debugging possible from day one. |
| `#for-error-envelope` | Map errors to a known envelope so the client never receives raw stack traces; structured error objects enable consistent handling. |
| `#for-distinct-ttls` | Different data sources have different update frequencies; use per-metric TTLs instead of a single global cache duration. |
| `#for-validation-at-edge` | Validate input near the edge (before orchestrating heavy calls) to fail fast on malformed requests. |
| `#for-cors-central` | Standardizing OPTIONS preflight in one place avoids duplicating CORS logic across handlers. |
| `#for-readiness-probe` | Readiness probe ensures server only marks as ready if a basic flow succeeds; prevents routing traffic to broken instances. |
| `#for-explicit-links` | Without anchors, AI agents and developers lack context for why a file is structured the way it is. Refactors violate contracts silently. |
| `#for-machine-readable` | `@skill` JSDoc is parseable by MCP tools (`audit_skill_coverage`, `search_anchors`). Scattered prose docs are not discoverable. |
| `#for-inline-anchors-sparing` | Obvious code needs no anchor; noise reduces signal. Use `@skill-anchor` when the rationale is not self-evident. |
