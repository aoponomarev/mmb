---
title: "AI Providers Architecture"
reasoning_confidence: 1.0
reasoning_audited_at: "2026-03-04"
reasoning_checksum: "693e7d6f"
id: sk-d76b68

---

# AI Providers Architecture

> **Context**: The abstraction layer for integrating and switching between various AI services (YandexGPT, Perplexity AI, etc.).
> **Scope**: `core/api/ai-providers/*`, `core/api/ai-provider-manager.js`

## Reasoning

- **#for-ai-provider-abstraction** Different AI APIs have different request/response formats. A unified `BaseAIProvider` interface ensures that the core application code remains agnostic to these details, enabling seamless switching without refactoring UI or business logic.
- **#for-ai-manager-switching** The `AIProviderManager` centralizes the logic for retrieving API keys, default models, and routing requests to the active provider. This prevents scattered API calls across components and ensures a single source of truth for the active AI state.

## Core Rules

1.  **Base Interface:**
    All new AI providers must extend `BaseAIProvider` and implement its mandatory methods:
    - `sendRequest(apiKey, model, messages, options)`
    - `getDefaultModel()`
    - `getAvailableModels()`
    - `getName()`
    - `getDisplayName()`
    - `validateApiKey(apiKey)`
2.  **Format Normalization:**
    The provider implementation is strictly responsible for translating the application's standard message format (`{role: 'user'|'assistant', content: string}`) into the specific API's required format, and extracting the final text string from the response.
3.  **Manager Routing:**
    Components must never instantiate providers directly. They must call `window.aiProviderManager.sendRequest(...)`, which automatically resolves the current active provider and its credentials.

### Key Recovery (Cloudflare KV Fallback)

When `getApiKey(providerName)` finds no key in local cache: (1) Call `resolveSettingsToken()` — check `localStorage('mbb_github_token')`, then bootstrap from the settings API; (2) Fetch all settings with resolved token; (3) Save recovered keys to `cacheManager` so subsequent calls are instant. Active provider and models stored in `cacheManager` (keys `ai-provider`, `yandex-api-key`, `perplexity-api-key`, `yandex-model`, `perplexity-model`).

### CORS & Timing

All cloud AI calls MUST go through the Cloudflare Proxy (Yandex via Cloud Function, Perplexity via Worker). Components that depend on API keys at startup must wait for key availability (polling pattern).

## Contracts

- **Stateless Requests**: Providers must be stateless. They receive the API key and model on every request, rather than storing them internally.
- **Error Handling**: Providers must throw standard errors that the UI can catch and display via the messages system.

### Perplexity Integration

Perplexity serves as secondary AI provider and primary engine for real-time web search and market sentiment. **API**: OpenAI-compatible Chat Completions; endpoint `https://api.perplexity.ai/chat/completions`; model `sonar-pro`. **Workflow**: Key in Settings → AI API; stored in `localStorage` (`perplexity-api-key`); `aiProviderManager.sendRequest()` routes when selected. **Constraints**: Respect tier-based rate limits; do not send sensitive portfolio data — use for public market analysis only. File Map: core/api/ai-providers/, core/config/app-config.js.

### LLM Fallback Mechanism

Handle failures: generation timeouts, content filtering, model unavailability, quality degradation, context limits. **Error detection**: Parse API response; check `json.error`, `json.choices[0].message.content`; throw on invalid format. **Fallback strategy**: Tiered chain (e.g. primary → Mistral → Groq → OpenRouter); sort by model health (recent success, fewer failures). Track `fallback_trigger_rate`, `fallback_success_rate`, `latency_with_fallback`. Target: false positive <1%, quality ≥70% of original, 99.9% uptime.

### Ollama Timeout & Fallback Contract

**Timeout classes**: Fast (`OLLAMA_TIMEOUT_FAST_MS`), Heavy (`OLLAMA_TIMEOUT_HEAVY_MS`). Never run local-LLM request without timeout. **Fallback semantics**: Local timeout is NOT rate-limit; on timeout route to fallback without cooldown lockout. Error codes: `TIMEOUT`, `NETWORK`, `PROVIDER`. **Reliability gates**: If Ollama-affecting files changed, run preflight health probe. `PRECHECK_OLLAMA_STRICT=1` blocks preflight on failed probe; default mode is warning-only.

### Provider Configuration Patterns

Use provider-specific model IDs (exact slugs from provider docs). Respect rate limits (TPM, RPM). API keys from centralized config; no env interpolation in runtime config. Delete legacy `config.ts` if it overrides YAML and causes confusion.

### Artificial Analysis IQ Scoring

**Context**: Agent/model scoring via Artificial Analysis API benchmarks. SSOT: benchmark-service script.

**Scope**: Adding model via API; recruiting agent; bulk re-scoring; displaying quality in UI.

**Key rules**: API key in `.env`; fallback `DEFAULT_IQ=50` if no key or API down; score priority: livecodebench*100 > coding_index > intelligence_index; fuzzy matching via slug normalization; EMA blending on sync: `new_iq = 0.3*benchmark + 0.7*current`. **Hard constraints**: Never add model without IQ lookup; never trust IQ=50 as "real" (means no benchmark); always run origin detection for security.

### Unified LLM Management (Model Registry)

**Context**: Unified management of LLM models across config, registry, stats. SSOT: .continue/config.yaml или app config (см. core/config/).

**Controller**: All operations via unified controller (list, add, remove, sync). **Protected models**: Critical models cannot be removed via automated scripts.

**Maintenance flow**: Automated discovery → testing → registration via controller → health monitoring → sync. **Hard constraints**: No manual config edits; registry consistency; fallback chain follows config order.

### Ollama Node Integration Checks

**Goal**: Ensure Node/MCP edits do not silently break Ollama fallback. SSOT: preflight script.

**Trigger**: Staged files include `.continue/*`, `mcp/*`, `docker-compose*.yml`, `.env.example`.

**Checks**: Preflight run; wrapper reachability (`curl /health`) when HTTP wrapper exists. **Acceptance**: No preflight failures; no unexpected timeout/cooldown; core runtime healthy. *(When control-plane exists: control-plane self-test.)*

### Ollama Runtime Governance

**Goal**: Keep local Ollama integration stable as fallback layer.

**Runtime policy**: Ollama is fallback, not primary; use pinned model profiles (`OLLAMA_MODEL_FAST`, `OLLAMA_MODEL_HEAVY`); keep concurrency low.

**Timeout policy**: Fast/heavy timeout classes; behavior explicit and observable. **Warm pool**: At least one warm model; compact to avoid memory bloat.

**Verification**: preflight; health probe. *(When Docker exists: `docker compose config`.)*

### Ollama v0.15+ Improvements

**Context**: Ollama v0.15.6+ improvements for local LLM fallback.

**Auto-download**: `ollama launch` now auto-downloads missing models instead of error; improves reliability of automated workflows.

**Context fixes**: Fixed context limits and compaction bug with vision models/large context.

**Config**: `OLLAMA_BASE_URL: http://host.docker.internal:11434` for Docker containers. Access via `host.docker.internal:11434`.
