# Protocol: Node.js Async Safety & Timeout Contracts

> **Context**: Defines mandatory async patterns for all Node.js code in the Target App to prevent hanging I/O, silent swallowed errors, and unpredictable failure modes.
> **Scope**: `core/api/`, `is/scripts/`, any Node.js module making external calls.

## 1. Async Failure Rules

- Wrap all top-level `await` boundaries in `try/catch`. Never leave a promise chain without `.catch()` in service code.
- Use structured error types where possible (e.g., `BackendCoreError` with `{ code, message, cause }`).
- Never swallow errors silently — if you catch, you must either re-throw, log with context, or return a typed error value.

## 2. Parallel Execution Rules

| Pattern | Use When |
|---|---|
| `Promise.allSettled(...)` | Independent checks where one failure must not block others (health checks, multi-provider fetch) |
| `Promise.all(...)` | All operations are interdependent — one failure should fail the entire batch |

**Default**: prefer `Promise.allSettled` for external provider calls. The `MarketMetricsService.getAllBestEffort()` pattern is the canonical example.

## 3. Timeout & AbortController Contract

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

## 4. Error Classification

| Error class | Code pattern | Retryable? |
|---|---|---|
| Network transport failure | `NETWORK_ERROR` | Yes (with backoff) |
| Timeout | `TIMEOUT` | Yes (with backoff) |
| Provider rate limit (429) | `RATE_LIMIT` | Yes (with wait) |
| Provider business error (4xx) | `PROVIDER_CLIENT_ERROR` | No |
| Provider server error (5xx) | `PROVIDER_SERVER_ERROR` | Sometimes |

## 5. Rate Limiting Integration

All external provider calls must go through `core/api/request-registry.js`:
- On HTTP 429: interval multiplied by backoff factor.
- On success: interval resets to base value.
- The registry journals all calls to prevent ban accumulation.

## 6. Verification After Any Async Change

After modifying async flow, timeout logic, or error handling:
1. Run `npm run test` — all provider and service tests must pass.
2. Check for unhandled promise rejection warnings in test output.
3. For timeout changes: manually test with a mock slow endpoint if possible.
