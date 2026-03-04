/**
 * #JS-3oL8h3k9
 * @description Market snapshot client: security boundary, request validation, backend error handling.
 * @skill id:sk-5c0ef8
 * @skill id:sk-918276
 */
import { parseMarketQuery } from "../contracts/market-contracts.js";
import { BACKEND_ERROR_CODES, BackendCoreError } from "./providers/errors.js";

function toSafeRequestId(value) {
  if (typeof value !== "string") return "";
  const v = value.trim();
  if (!v) return "";
  if (v.length > 64) return "";
  if (!/^[A-Za-z0-9._:-]+$/.test(v)) return "";
  return v;
}

function buildRequestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function assertResponseJson(raw) {
  if (raw && typeof raw === "object") return raw;
  return {};
}

export class MarketSnapshotClientError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "MarketSnapshotClientError";
    this.code = details.code || "CLIENT_ERROR";
    this.status = details.status || 0;
    this.requestId = details.requestId || null;
    this.payload = details.payload || null;
  }
}

export class MarketSnapshotApiClient {
  constructor(params = {}) {
    this.baseUrl = typeof params.baseUrl === "string" && params.baseUrl.trim() ? params.baseUrl.trim() : "http://127.0.0.1:18082";
    this.fetchFn = typeof params.fetchFn === "function" ? params.fetchFn : fetch;
    this.defaultRequestId = params.defaultRequestId || null;
  }

  buildUrl(params = {}) {
    let topCount;
    let sortBy;
    try {
        const query = parseMarketQuery(params);
        topCount = query.topCount;
        sortBy = query.sortBy;
    } catch {
        topCount = undefined;
        sortBy = undefined;
    }

    const url = new URL("/api/market-snapshot", this.baseUrl);
    const qp = new URLSearchParams();
    if (topCount !== undefined) qp.set("topCount", String(topCount));
    if (sortBy !== undefined) qp.set("sortBy", sortBy);
    const queryStr = qp.toString();
    if (queryStr) url.search = queryStr;
    return url.toString();
  }

  async getSnapshot(params = {}) {
    const requestId = toSafeRequestId(params.requestId) || toSafeRequestId(this.defaultRequestId) || buildRequestId();
    let url;
    try {
      url = this.buildUrl(params);
    } catch (error) {
      if (error instanceof BackendCoreError) {
        throw new MarketSnapshotClientError(error.message, {
          code: error.code || BACKEND_ERROR_CODES.InvalidInput,
          requestId,
        });
      }
      throw new MarketSnapshotClientError("Invalid snapshot input", { code: BACKEND_ERROR_CODES.InvalidInput, requestId });
    }

    let response;
    try {
      response = await this.fetchFn(url, {
        method: "GET",
        headers: {
          accept: "application/json",
          "x-request-id": requestId,
        },
      });
    } catch (error) {
      throw new MarketSnapshotClientError("Snapshot request failed", {
        code: BACKEND_ERROR_CODES.ExternalUnknown,
        requestId,
        payload: { message: error?.message || String(error) },
      });
    }

    let payload;
    try {
      payload = assertResponseJson(await response.json());
    } catch {
      payload = {};
    }
    const responseRequestId = toSafeRequestId(response.headers?.get?.("x-request-id")) || requestId;

    if (typeof payload === "object" && payload?.error && payload?.error?.requestId) {
      payload.error = {
        ...payload.error,
        requestId: payload.error.requestId || responseRequestId,
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        requestId: responseRequestId,
        error: {
          code: payload?.error?.code || "HTTP_ERROR",
          message: payload?.error?.message || "HTTP request failed",
          requestId: responseRequestId,
        },
      };
    }

    return {
      ok: true,
      status: response.status,
      requestId: responseRequestId,
      data: payload?.data || payload,
      meta: payload?.meta || {},
    };
  }
}

export function createMarketSnapshotApiClient(params = {}) {
  return new MarketSnapshotApiClient(params);
}
