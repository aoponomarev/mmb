---
title: "AI Providers Architecture"
reasoning_confidence: 1.0
reasoning_audited_at: "2026-03-02"
reasoning_checksum: "693e7d6f"

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
