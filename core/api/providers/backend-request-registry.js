/**
 * @skill id:sk-bb7c8e
 * @description Backend request registry for provider calls. Stores minimal per-resource call metadata and enforces rate limiting / interval checks.
 */

function stableKey(value) {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map((x) => stableKey(x)).join(",")}]`;
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableKey(value[k])}`).join(",")}}`;
}

function buildResourceKey(provider, endpoint, params = {}) {
    return `${provider}:${endpoint}:${stableKey(params)}`;
}

export class RequestRegistry {
    constructor() {
        this.calls = new Map();
    }

    isAllowed(provider, endpoint, params = {}, minIntervalMs = 60_000) {
        const key = buildResourceKey(provider, endpoint, params);
        const record = this.calls.get(key);
        if (!record || !record.lastSuccess) return { allowed: true, waitMs: 0 };

        const multiplier = record.lastErrorStatus === 429 ? 3 : 1;
        const effectiveInterval = minIntervalMs * multiplier;
        const elapsed = Date.now() - record.lastSuccess;
        if (elapsed >= effectiveInterval) return { allowed: true, waitMs: 0 };
        return { allowed: false, waitMs: effectiveInterval - elapsed };
    }

    recordCall(provider, endpoint, params = {}, status = 200, isSuccess = true) {
        const key = buildResourceKey(provider, endpoint, params);
        const now = Date.now();
        const current = this.calls.get(key) || { errorCount: 0, lastErrorStatus: null, lastError: null, lastSuccess: null };
        if (isSuccess) {
            current.lastSuccess = now;
            current.errorCount = 0;
            current.lastErrorStatus = null;
        } else {
            current.lastError = now;
            current.lastErrorStatus = status;
            current.errorCount += 1;
        }
        this.calls.set(key, current);
    }

    getTimeUntilNext(provider, endpoint, params = {}, minIntervalMs = 60_000) {
        const check = this.isAllowed(provider, endpoint, params, minIntervalMs);
        return check.allowed ? 0 : check.waitMs;
    }

    clear() {
        this.calls.clear();
    }
}

export function createRequestRegistry() {
    return new RequestRegistry();
}

export { buildResourceKey };
