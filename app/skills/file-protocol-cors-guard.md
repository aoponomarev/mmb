# Guard: file:// Protocol & CORS

> **Context**: The Target App runs from local `index.html` (`origin = null`, protocol `file:`). In this mode, direct browser `fetch()` calls to external APIs are blocked by CORS preflight.
> **Scope**: All frontend data-fetching code in `app/`, any direct API call from `index.html`.

## Non-Negotiable Rule

Before any `fetch()` to an external API from frontend code, the runtime protocol must be checked:

```javascript
if (window.location.protocol === 'file:') {
  // NEVER call CORS-restricted endpoints directly from browser
  // Route through Cloudflare Worker proxy instead
}
```

All external API calls from the UI **must** go through `cloudflareConfig.getApiProxyEndpoint()` — in **both** `file://` and `https://` modes. The Cloudflare Worker handles CORS, auth headers, and rate limiting.

## Symptoms of a Violation

Classic console signature when a direct call is attempted:
```
Access to fetch '...' has been blocked by CORS policy
No 'Access-Control-Allow-Origin' header is present
net::ERR_FAILED
```

If the UI keeps working only after a fallback fires but the console is noisy with CORS errors — root cause is: **direct call is attempted first, proxy fallback second**. Fix: route through proxy from the start.

## Canonical Fix Pattern

```javascript
// BAD — direct call, fails on file:// protocol
const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?...');

// GOOD — always proxy through Cloudflare Worker
const proxyUrl = cloudflareConfig.getApiProxyEndpoint('/coingecko/markets');
const response = await fetch(proxyUrl);
```

## Which APIs Are CORS-Restricted in file:// Mode

| Provider | Direct browser call | Status |
|---|---|---|
| CoinGecko API | `api.coingecko.com` | ❌ CORS-blocked — use Cloudflare proxy |
| Binance API | `api.binance.com` | ❌ CORS-blocked — use Cloudflare proxy |
| Yandex Cloud functions | `functions.yandexcloud.net` | ❌ CORS-blocked — use Cloudflare proxy |
| GitHub Pages assets | Same origin | ✅ OK — no proxy needed |

## Code Review Checklist

When reviewing any new frontend data-fetch:
- [ ] Does it check `window.location.protocol` before calling an external API?
- [ ] Does it route through `cloudflareConfig.getApiProxyEndpoint()` for external calls?
- [ ] Is the fallback/proxy path tested and confirmed to return valid data for the UI?
- [ ] Is there no CORS `ERR_FAILED` spam in the browser console?

## Relationship to Hosting Contract

This guard is a concrete implementation of the **Zero-Config Portability** constraint in `arch-foundation.md` §6: the UI must function on both `file://` and `https://aoponomarev.github.io/...` without code changes. The Cloudflare proxy is the mechanism that enables this.
