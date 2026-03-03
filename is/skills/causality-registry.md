---
id: sk-3b1519

---

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
| `#for-header-skill-separation` | File headers must contain only technical API contracts (What/How). Philosophical principles and systemic rules belong in skills to prevent context bloat and divergence. |
| `#for-english-why-comments` | Inline comments must be in English and explain the "Why" and "For what", never the "What". Describing what code does creates noise; describing why it exists creates value. |
| `#for-mandatory-comment-rewrite` | AI agents must proactively rewrite legacy Russian or descriptive comments into English causal comments whenever touching a piece of code. |
| `#for-causality-harvesting` | Using raw `@causality` markers in code allows developers/agents to log rationale instantly without breaking flow to update the registry, creating a searchable backlog of potential patterns. |
| `#for-data-provider-interface` | A unified interface for data providers (e.g., CoinGecko, Yandex Cache) abstracts the specific data fetching mechanisms from the orchestrator logic. |
| `#for-dual-channel-fallback` | Implementing a dual-channel fetch (primary + fallback) ensures data availability even when the primary external service goes down or hits rate limits. |
| `#for-explicit-unknowns` | Guessing the causality of legacy "magic numbers" leads to dangerous hallucinations. We must explicitly mark unknowns so the human developer can answer them later. |
| `#for-harvester-integration` | Using the raw `@causality` marker directly in the code with a question mark integrates perfectly with our MCP `harvest_causalities` tool, deprecating standalone draft files. |
| `#for-ai-tooling-abstraction` | Forcing agents to remember and perfectly type CLI commands (like `node scripts/xyz.js` or `wrangler d1 execute`) is error-prone. Exposing these as strict JSON-schema MCP Tools guarantees safer, more predictable execution. |
| `#for-context-injection` | Dynamically injecting telemetry data (e.g., "This skill has 42 anchors") into the top of Markdown files *as they are being read by the agent* dynamically influences agent behavior without mutating the actual markdown file on disk. |
| `#for-docs-pipeline` | Separating active plans (`docs/plans`), archived plans (`docs/done`), and macro-specifications (`docs/ais/`) prevents context pollution and keeps active work focused. |
| `#for-ais-russian` | High-level specifications (AIS) and plans are written in Russian to maximize the user's cognitive bandwidth and strategic planning speed. |
| `#for-ais-mermaid-diagrams` | Every AIS must include at least one Mermaid diagram in the Infrastructure & Data Flow section. Fenced `mermaid` code blocks render on GitHub, VS Code, GitLab; diagrams stay version-controlled as text and avoid stale image files. |
| `#for-distillation` | A completed plan contains implementation noise. It must be distilled: macro-knowledge goes to `docs/ais/` (Russian), and micro-rules go to `is/skills/` (English). |
| `#for-distillation-cleanup` | After a completed plan in `docs/done/` is fully distilled into specifications and skills, the original file MUST be deleted. The folder `docs/done/` remains as a staging ground, but keeping distilled files creates redundant, dead knowledge. |
| `#for-audits-path-contract` | The path `docs/audits/causality-exceptions.jsonl` is hardcoded in `validate-causality-invariant.js`. Agents must never rename or move this folder; doing so breaks the invariant gate. |
| `#not-redundant-folders` | Do not create new folders when a functionally suitable one already exists. Place documents in the existing structure (plans, backlog, runbooks, etc.) instead of inventing `docs/misc/`, `docs/temp/`, or similar. |
| `#for-stable-ids` | AIS and Skills use short hash ids (`ais-xxxxxx`, `sk-xxxxxx`) instead of semantic names. Ids survive file renames and decomposition; `related_skills` and `related_ais` reference ids. Index files use `index-` prefix. |
| `#for-docs-ids-gate` | Preflight runs `validate-docs-ids.js` to ensure all ids in `related_skills` and `related_ais` resolve. `generate-id-registry.js` produces `is/contracts/docs/id-registry.json` for MCP and tooling. |
| `#for-memory-to-skills` | Memory MCP stores chat agreements; they must be formalized into skills or AIS when they describe rules or constraints. Ensures knowledge lives in files, not only in ephemeral chat history. |
| `#for-token-efficiency` | Long context degrades model attention ("lost in the middle"). Minimal viable context produces better results. |
| `#for-front-load` | Putting all relevant context in the first message avoids 3x token waste from incremental context building. |
| `#for-fresh-chats` | After 6–8 exchanges or when switching domains, start a new chat — condensation loses detail. |
| `#for-minimum-viable-at` | Attach only files the agent actually needs; agent can explore more if needed. |
| `#for-token-budget` | alwaysApply rules consume tokens before every conversation. Budget <1,000 lines; prefer glob-scoped or agent-decided. |
| `#for-distillation-cleanup` | After a completed plan in `docs/done/` is fully distilled into specifications and skills, the original file MUST be deleted. The folder `docs/done/` remains, but keeping distilled files creates redundant, dead knowledge. |
| `#for-prefix-ssot` | A single prefix registry prevents ad-hoc prefixes and naming drift. All consumers read from one source. |
| `#for-prefix-gate` | The validate-skills gate fails preflight on unregistered prefixes, forcing registration before use. |
| `#for-prefix-categories` | Grouping prefixes by category (Layer, Vendor, Tech, etc.) improves discoverability and prevents semantic overlap. |
| `#for-prefix-semantics` | SKILL_SEMANTICS documents intent for each prefix so agents choose correctly. |
| `#not-ad-hoc` | Inventing prefixes without registration creates gate failures and inconsistent naming. |
