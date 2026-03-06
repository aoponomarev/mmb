---
id: sk-471974
title: "Protocol: Node.js Async Safety & Timeout Contracts"
reasoning_confidence: 0.9
reasoning_audited_at: 2026-03-05
reasoning_checksum: 4f450f17
last_change: ""

---

# Protocol: Node.js Async Safety & Timeout Contracts

> **Context**: Defines mandatory async patterns for all Node.js code in the Target App to prevent hanging I/O, silent swallowed errors, and unpredictable failure modes.
> **Scope**: `core/api/`, `is/scripts/`, any Node.js module making external calls.

## Reasoning

- **#for-try-catch-await** Every async boundary must have a catch to prevent unhandled promise rejections from crashing the process or producing opaque errors.
- **#for-partial-failure-tolerance** We use `Promise.allSettled` to fetch multiple external APIs, preventing one slow or failed provider from tanking the entire response.
- **#for-timeout-external** All external HTTP calls must use `AbortController` and `setTimeout` so network hangs don't leave promises dangling indefinitely.
- **#for-error-classification** Classifying timeouts vs 429s vs 400s drives correct retry and backoff behavior.
- **#for-rate-limiting** Rate-limiting logic applies to retryable errors to prevent IP bans.

---

## Contracts

- Wrap all top-level `await` boundaries in try/catch. Never leave a promise chain without `.catch()` in service code.
- Use structured error types where possible (e.g., `BackendCoreError` with `{ code, message, cause }`).
- Never swallow errors silently — if you catch, you must either re-throw, log with context, or return a typed error value.

### Parallel Execution Rules

| Pattern | Use When |
|---|---|
| `Promise.allSettled(...)` | Independent checks where one failure must not block others (health checks, multi-provider fetch) |
| `Promise.all(...)` | All operations are interdependent — one failure should fail the entire batch |

**Default**: prefer `Promise.allSettled` for external provider calls. The `MarketMetricsService.getAllBestEffort()` pattern is the canonical example.

### Timeout & AbortController Contract

Every external HTTP call (fetch, provider request) **MUST** define timeout behavior:

```javascript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

try {
  const response = await fetch(url, { signal: controller.signal });
  // ...
} catch (err) {
  if (err.name === 'AbortError') {
    throw new BackendCoreError('TIMEOUT', `Request to ${url} timed out after ${TIMEOUT_MS}ms`);
  }
  throw err;
} finally {
  clearTimeout(timeoutId);
}
```

**Rules:**
- Timeout values must be defined as named constants (not magic numbers inline).
- Timeout errors must be classified: retryable (network flap) vs non-retryable (provider down).
- Differentiate: **transport failure** (network) vs **timeout** vs **provider business error** (4xx/5xx with body).

### Error Classification

| Error class | Code pattern | Retryable? |
|---|---|---|
| Network transport failure | `NETWORK_ERROR` | Yes (with backoff) |
| Timeout | `TIMEOUT` | Yes (with backoff) |
| Provider rate limit (429) | `RATE_LIMIT` | Yes (with wait) |
| Provider business error (4xx) | `PROVIDER_CLIENT_ERROR` | No |
| Provider server error (5xx) | `PROVIDER_SERVER_ERROR` | Sometimes |

### Verification (Timeout-Related Changes)

When changing timeout/abort logic: run `npm run test`; keep HTTP status mapping stable (e.g. `N8N_HTTP_<status>` style). *(When Docker/control-plane exist: `node control-plane/scripts/self-test.js`; `curl http://127.0.0.1:3002/health`; `docker compose --profile core config`.)*

### Rate Limiting Integration

All external provider calls must go through #JS-iH26jSeT (core/api/request-registry.js):
- On HTTP 429: interval multiplied by backoff factor.
- On success: interval resets to base value.
- The registry journals all calls to prevent ban accumulation.

### Verification After Any Async Change

After modifying async flow, timeout logic, or error handling:
1. Run `npm run test` — all provider and service tests must pass.
2. Check for unhandled promise rejection warnings in test output.
3. For timeout changes: manually test with a mock slow endpoint if possible.
