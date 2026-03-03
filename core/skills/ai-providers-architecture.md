---
title: "AI Providers Architecture"
reasoning_confidence: 1.0
reasoning_audited_at: "2026-03-03"
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

## Contracts

- **Stateless Requests**: Providers must be stateless. They receive the API key and model on every request, rather than storing them internally.
- **Error Handling**: Providers must throw standard errors that the UI can catch and display via the messages system.

### Perplexity Integration

Perplexity serves as secondary AI provider and primary engine for real-time web search and market sentiment. **API**: OpenAI-compatible Chat Completions; endpoint `https://api.perplexity.ai/chat/completions`; model `sonar-pro`. **Workflow**: Key in Settings → AI API; stored in `localStorage` (`perplexity-api-key`); `aiProviderManager.sendRequest()` routes when selected. **Constraints**: Respect tier-based rate limits; do not send sensitive portfolio data — use for public market analysis only. File Map: `core/api/ai-providers/perplexity-provider.js`, `core/config/app-config.js`.

### LLM Fallback Mechanism

Handle failures: generation timeouts, content filtering, model unavailability, quality degradation, context limits. **Error detection**: Parse API response; check `json.error`, `json.choices[0].message.content`; throw on invalid format. **Fallback strategy**: Tiered chain (e.g. primary → Mistral → Groq → OpenRouter); sort by model health (recent success, fewer failures). Track `fallback_trigger_rate`, `fallback_success_rate`, `latency_with_fallback`. Target: false positive <1%, quality ≥70% of original, 99.9% uptime.

### Ollama Timeout & Fallback Contract

**Timeout classes**: Fast (`OLLAMA_TIMEOUT_FAST_MS`), Heavy (`OLLAMA_TIMEOUT_HEAVY_MS`). Never run local-LLM request without timeout. **Fallback semantics**: Local timeout is NOT rate-limit; on timeout route to fallback without cooldown lockout. Error codes: `TIMEOUT`, `NETWORK`, `PROVIDER`. **Reliability gates**: If Ollama-affecting files changed, run preflight health probe. `PRECHECK_OLLAMA_STRICT=1` blocks preflight on failed probe; default mode is warning-only.

### Provider Configuration Patterns

Use provider-specific model IDs (exact slugs from provider docs). Respect rate limits (TPM, RPM). API keys from centralized config; no env interpolation in runtime config. Delete legacy `config.ts` if it overrides YAML and causes confusion.
