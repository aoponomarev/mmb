/**
 * @skill core/skills/api-layer
 * @description Market Snapshot Service: orchestrates data and metrics fetching to build a unified snapshot payload.
 *
 * @causality: We keep snapshot structure logic in a separate service to decouple it from individual fetch flows.
 */

import { buildSnapshotPayload, parseSortBy, parseTopCount } from "../contracts/market-contracts.js";

export class MarketSnapshotService {
  constructor(params = {}) {
    this.marketDataService = params.marketDataService;
    this.marketMetricsService = params.marketMetricsService;
  }

  async getSnapshot(params = {}) {
    // @causality: Validate input near the edge before orchestrating heavy calls.
    const topCount = parseTopCount(params.topCount, 25);
    const sortBy = parseSortBy(params.sortBy, "market_cap");

    const [topCoins, metrics] = await Promise.all([
      this.marketDataService.getTopCoins(topCount, sortBy),
      this.marketMetricsService.getAllBestEffort(),
    ]);

    return buildSnapshotPayload({ topCoins, metrics });
  }
}

export function createMarketSnapshotService(params = {}) {
  return new MarketSnapshotService(params);
}
