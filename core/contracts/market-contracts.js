/**
 * @skill core/skills/market-contracts
 * @description Zod-based SSOT for market data inputs and outputs. Replaces manual validation.
 */
import { z } from 'zod';
import { BACKEND_ERROR_CODES, BackendCoreError } from '../api/providers/errors.js';

export const ALLOWED_SORT = ["market_cap", "volume"];
export const MAX_TOP_COUNT = 250;

/**
 * Validates request parameters for market top queries.
 */
export const marketQuerySchema = z.object({
    topCount: z.coerce.number()
        .int('INVALID_TOP_COUNT: expected positive integer')
        .min(1, 'INVALID_TOP_COUNT: expected positive integer')
        .max(MAX_TOP_COUNT, `INVALID_TOP_COUNT: max allowed is ${MAX_TOP_COUNT}`)
        .default(25),
        
    sortBy: z.string()
        .trim()
        .refine(val => ALLOWED_SORT.includes(val), {
            message: "INVALID_SORT_BY: allowed values are market_cap | volume"
        })
        .default("market_cap")
});

/**
 * Validates the structure of a market snapshot payload before caching or sending.
 */
export const marketSnapshotSchema = z.object({
    ts: z.string().datetime(),
    topCoins: z.object({
        data: z.array(z.any())
    }, { required_error: "INVALID_SNAPSHOT_PAYLOAD: topCoins must be object containing data array", invalid_type_error: "INVALID_SNAPSHOT_PAYLOAD: topCoins must be object containing data array" }),
    metrics: z.record(z.string(), z.any(), { required_error: "INVALID_SNAPSHOT_PAYLOAD: metrics must be object", invalid_type_error: "INVALID_SNAPSHOT_PAYLOAD: metrics must be object" })
});

export function parseMarketQuery(input) {
    const result = marketQuerySchema.safeParse(input || {});
    if (!result.success) {
        const msg = result.error.issues[0].message;
        throw new BackendCoreError(BACKEND_ERROR_CODES.InvalidInput, msg);
    }
    return result.data;
}

export function buildSnapshotPayload(data) {
    const payload = {
        ts: new Date().toISOString(),
        ...data
    };
    
    const result = marketSnapshotSchema.safeParse(payload);
    if (!result.success) {
        const invalidMsg = result.error.issues.find(i => i.message.includes('INVALID_SNAPSHOT_PAYLOAD'))?.message 
                           || "INVALID_SNAPSHOT_PAYLOAD: malformed data";
        throw new BackendCoreError(BACKEND_ERROR_CODES.InvalidInput, invalidMsg);
    }
    return result.data;
}
