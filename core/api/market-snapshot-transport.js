/**
 * @skill id:sk-bb7c8e
 * @description Transport adapter for Market Snapshot. Maps internal domain responses and errors to transport-friendly format.
 * @causality #for-layer-separation
 */
import { BACKEND_ERROR_CODES, toBackendCoreError, toBackendHttpStatus } from "./providers/errors.js";

export class MarketSnapshotTransport {
  constructor(params = {}) {
    this.snapshotService = params.snapshotService;
  }

  async handleGetSnapshot(query = {}) {
    try {
      const result = await this.snapshotService.getSnapshot({
        topCount: query.topCount,
        sortBy: query.sortBy,
      });
      return {
        status: 200,
        body: {
          ok: true,
          data: result,
        },
      };
    } catch (error) {
      // @causality #for-error-envelope
      const mapped = toBackendCoreError(
        error,
        BACKEND_ERROR_CODES.ExternalUnknown,
        "SNAPSHOT_TRANSPORT_FAILED",
      );
      return {
        status: toBackendHttpStatus(mapped.code),
        body: {
          ok: false,
          error: {
            code: mapped.code,
            message: mapped.message,
          },
        },
      };
    }
  }
}

export function createMarketSnapshotTransport(params = {}) {
  return new MarketSnapshotTransport(params);
}
