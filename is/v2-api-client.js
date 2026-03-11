/**
 * @description Standalone V2 API client for legacy IS dashboard; local API + n8n webhook access with fallback orchestration.
 * @skill-anchor id:sk-7b4ee5 #for-adapter-mandatory
 * @skill-anchor id:sk-7b4ee5 #for-integration-fallbacks
 *
 * PURPOSE: Keep external transport out of `V2_logic.js` while preserving the legacy dashboard contract.
 */
(function() {
  'use strict';

  function resolveFetchFn(fetchFn) {
    if (typeof fetchFn === 'function') {
      return fetchFn;
    }
    if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
      return window.fetch.bind(window);
    }
    return (...args) => fetch(...args);
  }

  class N8nApiClient {
    constructor(options = {}) {
      this.fetchFn = resolveFetchFn(options.fetchFn);
      this.hostResolver = typeof options.hostResolver === 'function'
        ? options.hostResolver
        : () => `${window.location.hostname}:5678`;
    }

    getBaseUrl() {
      return `http://${this.hostResolver()}/webhook`;
    }

    async call(webhookPath, options = {}) {
      const res = await this.fetchFn(`${this.getBaseUrl()}/${webhookPath}`, options);
      if (res.status === 429) throw new Error('RATE_LIMIT');
      if (!res.ok) throw new Error(`n8n ${res.status}`);
      const text = await res.text();
      return text ? JSON.parse(text) : {};
    }

    async post(webhookPath, body) {
      const raw = await this.call(webhookPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      return Array.isArray(raw) && raw.length === 1 ? raw[0] : raw;
    }
  }

  class V2ApiClient {
    constructor(options = {}) {
      this.fetchFn = resolveFetchFn(options.fetchFn);
      this.n8n = options.n8nClient || new N8nApiClient({ fetchFn: this.fetchFn });
    }

    async call(path, options = {}) {
      const res = await this.fetchFn(path, options);
      if (res.status === 429) throw new Error('RATE_LIMIT');
      if (!res.ok) {
        const errText = await res.text();
        try {
          const errJson = errText ? JSON.parse(errText) : {};
          throw new Error(errJson.error || errJson.message || `${res.status} ${res.statusText}`);
        } catch {
          throw new Error(errText || `${res.status} ${res.statusText}`);
        }
      }
      const text = await res.text();
      return text ? JSON.parse(text) : {};
    }

    async post(path, body) {
      return this.call(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    }

    async n8nCall(webhookPath, options = {}) {
      return this.n8n.call(webhookPath, options);
    }

    async n8nPost(webhookPath, body) {
      return this.n8n.post(webhookPath, body);
    }

    async fetchWithFallback(n8nPath, localPath, extract) {
      try {
        return extract(await this.n8nCall(n8nPath));
      } catch {
        console.warn(`n8n ${n8nPath} unavailable, falling back to ${localPath}`);
        return extract(await this.call(localPath));
      }
    }

    async init() {
      try {
        window.V2State.initData = await this.call('/api/v2/init');
        if (typeof window.syncAllDropdowns === 'function') {
          window.syncAllDropdowns();
        }
      } catch (err) {
        console.error('V2 Init failed:', err.message);
      }
    }
  }

  window.N8nApiClient = N8nApiClient;
  window.v2ApiClient = new V2ApiClient();
})();
