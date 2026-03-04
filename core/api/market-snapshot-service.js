/**
 * #JS-4K2gU4Fq
 * @description Market Snapshot Service: orchestrates data and metrics fetching to build a unified snapshot payload.
 * @skill id:sk-bb7c8e
 * @causality #for-layer-separation
 */

import { buildSnapshotPayload, parseMarketQuery } from "../contracts/market-contracts.js";

export class MarketSnapshotService {
  constructor(params = {}) {
    this.marketDataService = params.marketDataService;
    this.marketMetricsService = params.marketMetricsService;
  }

  async getSnapshot(params = {}) {
    // @causality #for-validation-at-edge
        const query = parseMarketQuery(params);
        const topCount = query.topCount;
        const sortBy = query.sortBy;

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
