/**
 * @skill core/skills/api-layer
 * @description Binance metrics provider (Funding Rate, Long/Short Ratio, Open Interest).
 * Uses a strict Fail-Fast approach: no hidden retry chains here, handled at higher levels.
 */
import { BACKEND_ERROR_CODES, BackendCoreError } from "./errors.js";

function toNumber(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export class BinanceMetricsProvider {
  constructor(params = {}) {
    this.fetchFn = typeof params.fetchFn === "function" ? params.fetchFn : fetch;
    this.timeoutMs = Number.isFinite(params.timeoutMs) ? Math.max(1, Math.floor(params.timeoutMs)) : 10_000;
  }

  // @causality: We wrap fetch with AbortSignal to avoid hanging requests if Binance API stalls.
  // Explicit timeout handling maps to standardized ExternalTimeout error.
  async fetchJson(url, op) {
    let response;
    try {
      response = await this.fetchFn(url, { signal: AbortSignal.timeout(this.timeoutMs) });
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new BackendCoreError(BACKEND_ERROR_CODES.ExternalTimeout, `${op}: timeout`, { op });
      }
      throw new BackendCoreError(BACKEND_ERROR_CODES.ExternalUnknown, `${op}: request failed`, { op, cause: error?.message || String(error) });
    }
    if (!response.ok) {
      throw new BackendCoreError(BACKEND_ERROR_CODES.ExternalHttp, `${op}: HTTP ${response.status}`, { op, status: response.status });
    }
    return response.json();
  }

  async getOpenInterest() {
    const data = await this.fetchJson("https://fapi.binance.com/futures/data/openInterestHist?symbol=BTCUSDT&period=5m&limit=1", "fetchOpenInterest");
    const raw = Array.isArray(data) ? data[0]?.sumOpenInterestValue : null;
    const value = toNumber(raw, null);
    if (value === null || value < 0) {
      throw new BackendCoreError(BACKEND_ERROR_CODES.ExternalUnknown, "fetchOpenInterest: invalid value", { value: raw });
    }
    return value;
  }

  async getFundingRate() {
    const data = await this.fetchJson("https://fapi.binance.com/fapi/v1/premiumIndex", "fetchFundingRate");
    const list = Array.isArray(data) ? data : [];
    if (list.length === 0) {
      throw new BackendCoreError(BACKEND_ERROR_CODES.ExternalUnknown, "fetchFundingRate: empty payload");
    }
    const avg = list.reduce((sum, item) => sum + (toNumber(item?.lastFundingRate, 0) * 100), 0) / list.length;
    if (!Number.isFinite(avg)) {
      throw new BackendCoreError(BACKEND_ERROR_CODES.ExternalUnknown, "fetchFundingRate: invalid value", { value: avg });
    }
    return avg;
  }

  async getLongShortRatio() {
    const data = await this.fetchJson("https://fapi.binance.com/futures/data/topLongShortPositionRatio?symbol=BTCUSDT&period=5m&limit=1", "fetchLongShortRatio");
    const raw = Array.isArray(data) ? data[0]?.longShortRatio : null;
    const value = toNumber(raw, null);
    if (value === null || value < 0) {
      throw new BackendCoreError(BACKEND_ERROR_CODES.ExternalUnknown, "fetchLongShortRatio: invalid value", { value: raw });
    }
    return value;
  }
}

export function createBinanceMetricsProvider(params = {}) {
  return new BinanceMetricsProvider(params);
}
