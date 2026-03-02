/**
 * @skill core/skills/api-layer
 * @description Framework-agnostic HTTP handler for Market Snapshot. Handles headers, CORS, method limits, and query extraction.
 */

function normalizeQueryFromUrl(url) {
  if (typeof url !== "string" || !url.includes("?")) return {};
  const queryString = url.slice(url.indexOf("?") + 1);
  const params = new URLSearchParams(queryString);
  return Object.fromEntries(params.entries());
}

function normalizePath(url) {
  if (typeof url !== "string" || url.length === 0) return "/";
  const path = url.split("?")[0] || "/";
  return path;
}

function queryStringLength(url) {
  if (typeof url !== "string" || !url.includes("?")) return 0;
  return url.slice(url.indexOf("?") + 1).length;
}

function hasUnsupportedQueryKeys(query, allowedKeys) {
  const keys = Object.keys(query || {});
  return keys.some((key) => !allowedKeys.has(key));
}

function toRequestId(value) {
  if (typeof value !== "string") return "";
  const v = value.trim();
  if (v.length === 0) return "";
  if (v.length > 64) return "";
  if (!/^[A-Za-z0-9._:-]+$/.test(v)) return "";
  return v;
}

function buildRequestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function toJsonResponse(status, payload, requestId) {
  return {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-request-id": requestId,
      "x-api-version": "v1",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,OPTIONS",
      "access-control-allow-headers": "content-type,x-request-id",
      "x-service-state": status >= 500 ? "degraded" : "ok",
    },
    body: JSON.stringify(payload),
  };
}

function toMethodNotAllowedResponse(requestId) {
  const response = toJsonResponse(
    405,
    buildErrorPayload("METHOD_NOT_ALLOWED", "Only GET is allowed", requestId),
    requestId,
  );
  response.headers.allow = "GET,HEAD";
  return response;
}

function toCorsPreflightResponse(requestId) {
  return {
    status: 204,
    headers: {
      "x-request-id": requestId,
      "x-service-state": "ok",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,OPTIONS",
      "access-control-allow-headers": "content-type,x-request-id",
      "access-control-max-age": "600",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
    body: "",
  };
}

function buildErrorPayload(code, message, requestId) {
  return {
    ok: false,
    error: { code, message, requestId },
  };
}

export class MarketSnapshotHttpHandler {
  constructor(params = {}) {
    this.transport = params.transport;
    this.routePath = params.routePath || "/api/market-snapshot";
    this.healthPath = params.healthPath || "/api/health";
    this.readyPath = params.readyPath || "/api/ready";
    this.readinessProbe = typeof params.readinessProbe === "function" ? params.readinessProbe : null;
    this.allowedSnapshotQueryKeys = new Set(["topCount", "sortBy"]);
  }

  async handle(request = {}) {
    const method = typeof request.method === "string" ? request.method.toUpperCase() : "GET";
    const url = typeof request.url === "string" ? request.url : "/";
    const path = normalizePath(url);
    const requestId = toRequestId(request.requestId)
      || toRequestId(request.headers?.["x-request-id"])
      || buildRequestId();

    if (method === "OPTIONS" && (path === this.routePath || path === this.healthPath || path === this.readyPath)) {
      return toCorsPreflightResponse(requestId);
    }
    const isReadMethod = method === "GET" || method === "HEAD";

    if (path === this.healthPath) {
      if (!isReadMethod) {
        return toMethodNotAllowedResponse(requestId);
      }
      return toJsonResponse(200, {
        ok: true,
        data: {
          requestId,
          service: "market-snapshot-http",
          status: "ok",
          ts: new Date().toISOString(),
        },
      }, requestId);
    }

    if (path === this.readyPath) {
      if (!isReadMethod) {
        return toMethodNotAllowedResponse(requestId);
      }
      let ready = true;
      if (this.readinessProbe) {
        try {
          ready = (await this.readinessProbe()) === true;
        } catch {
          ready = false;
        }
      }
      if (!ready) {
        return toJsonResponse(503, buildErrorPayload("NOT_READY", "Service is not ready", requestId), requestId);
      }
      return toJsonResponse(200, {
        ok: true,
        data: {
          requestId,
          service: "market-snapshot-http",
          status: "ready",
          ts: new Date().toISOString(),
        },
      }, requestId);
    }

    if (path !== this.routePath) {
      return toJsonResponse(404, buildErrorPayload("NOT_FOUND", "Route not found", requestId), requestId);
    }

    if (!isReadMethod) {
      return toMethodNotAllowedResponse(requestId);
    }

    if (queryStringLength(url) > 512) {
      return toJsonResponse(400, buildErrorPayload("INVALID_QUERY_SIZE", "Query string is too large", requestId), requestId);
    }

    const query = request.query && typeof request.query === "object"
      ? request.query
      : normalizeQueryFromUrl(url);
    if (hasUnsupportedQueryKeys(query, this.allowedSnapshotQueryKeys)) {
      return toJsonResponse(400, buildErrorPayload("INVALID_QUERY_KEY", "Unsupported query parameter", requestId), requestId);
    }
    const result = await this.transport.handleGetSnapshot(query);
    const body = result.body?.ok
      ? { ...result.body, meta: { ...(result.body.meta || {}), requestId } }
      : {
        ...result.body,
        error: {
          ...(result.body?.error || {}),
          requestId,
        },
      };
    return toJsonResponse(result.status, body, requestId);
  }
}

export function createMarketSnapshotHttpHandler(params = {}) {
  return new MarketSnapshotHttpHandler(params);
}
