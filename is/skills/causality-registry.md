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
| `#for-classes-add-remove` | A universal mechanism to inject or override CSS classes inside generic Vue components without breaking encapsulation. |
| `#not-hardcoded-classes` | Hardcoded classes in `x-template` conflict with the `classesAdd`/`classesRemove` mechanism and cannot be dynamically overridden by parents. |
| `#for-fixed-class-objects` | Vue reactivity expects consistent object structures. Returning varying structures (e.g., `{}` then `{icon: 'p-0'}`) breaks computed reactivity. |
| `#for-classes-merge-order` | Merging classes in a specific sequence (base -> adaptive -> instanceHash -> conditional -> remove -> add) ensures overrides take precedence. |
| `#for-vue-comment-node-fallback` | Vue 3 fragments often leave `this.$el` as a Comment node in `x-template`. Direct DOM selection fails unless we fall back to nextSibling or parent. |
| `#not-methods-in-computed` | Methods placed inside the `computed` object block cannot be called properly and lead to structural errors. |
| `#not-dom-in-computed` | Computed properties can execute before the component is fully mounted, causing DOM-dependent functions to fail. |
| `#for-utility-availability-check` | Global utilities like `window.classManager` load asynchronously; failing to check their existence causes crashes during initial render. |
| `#for-bootstrap-nexttick-init` | Bootstrap components require the DOM to be fully rendered before initialization. `$nextTick` ensures the elements exist. |
| `#for-bootstrap-dispose` | Failing to call `instance.dispose()` in `beforeUnmount` causes memory leaks and ghost event listeners in SPAs. |
| `#for-bootstrap-event-proxying` | Vue components must proxy native Bootstrap events (e.g., `show.bs.modal`) to Vue events (`@show`) to maintain reactivity and component boundaries. |
| `#for-reactive-translations` | Using a reactive translation function ensures that changing the language state instantly updates all UI text without requiring a page reload. |
| `#for-tooltip-reactivity` | Tooltips must be re-initialized or their titles reactively bound so that language switches affect hover text immediately. |
| `#for-model-extensibility` | Using a base class (`BaseModelCalculator`) and a manager (`ModelManager`) allows adding new mathematical models without modifying the core application logic. |
| `#for-air-math-contract` | The A.I.R. formula (Alignment, Impulse, Risk) is a strict domain contract. AI agents must not alter the mathematical weights or logic without explicit architectural approval. |
| `#for-ai-provider-abstraction` | A unified `BaseAIProvider` interface ensures the application code remains agnostic to specific AI service APIs (YandexGPT, Perplexity), enabling seamless switching. |
| `#for-ai-manager-switching` | `AIProviderManager` centralizes the logic for retrieving API keys, models, and routing requests, preventing scattered API calls across components. |
| `#for-short-message-keys` | Using short keys (`e.net`) instead of long strings (`error.api.network`) reduces payload size and minimizes typos in code. |
| `#for-short-message-types` | Using single-character types (`d`, `w`, `i`, `s`) maps directly to Bootstrap variants (`danger`, `warning`, `info`, `success`) efficiently. |
| `#for-compact-translation-format` | The `KEY\|TEXT\|DETAILS` format for translations is highly optimized for parsing and storage compared to verbose JSON or XML. |
| `#for-integration-fallbacks` | External services (like AI providers or proxies) must implement fallback chains to ensure high availability when the primary provider fails. |
| `#for-geo-optimization` | Routing requests based on geography (e.g., Yandex Cloud for RU/CIS, Cloudflare for ROW) minimizes latency and complies with data localization policies. |
| `#for-oauth-postmessage` | Browsers block HTTPS to `file://` redirects. Using a popup window (`window.open`) and sending the token back via `postMessage` is the only reliable way to complete OAuth flows in a pure local static context. |
| `#for-cloudflare-kv-proxy` | External APIs enforce CORS, blocking `file://` requests. A Cloudflare Worker proxy with KV caching bypasses CORS and reduces rate-limit exhaustion. |
| `#for-d1-schema-migrations` | D1 is serverless SQLite. All schema changes must be tracked in SQL migration files and applied via Wrangler, never manually mutated in production. |
| `#for-umd-libraries` | The No-Build architecture requires libraries to be loaded directly in the browser via `<script>` tags. Only libraries providing UMD or Global builds are compatible. |
| `#for-cdn-fallback` | Relying on a single CDN (e.g., jsdelivr) creates a single point of failure. A fallback chain (GitHub Pages -> jsdelivr -> cdnjs) ensures the UI loads even if one CDN is down. |
| `#for-template-logic-separation` | In a No-Build Vue architecture, templates and logic are split into separate files. Documentation must follow this split: layout/DOM details in the template file, API/state details in the JS file. |
| `#not-doc-duplication` | Duplicating documentation across multiple files guarantees that one will eventually become outdated. Use cross-references instead. |
| `#for-data-provider-interface` | A unified interface for data providers (e.g., CoinGecko, Yandex Cache) abstracts the specific data fetching mechanisms from the orchestrator logic. |
| `#for-dual-channel-fallback` | Implementing a dual-channel fetch (primary + fallback) ensures data availability even when the primary external service goes down or hits rate limits. |
