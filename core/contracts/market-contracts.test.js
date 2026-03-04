/**
 * #JS-SR3QqzNb
 * @description Tests for market-contracts: parseMarketQuery, buildSnapshotPayload.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMarketQuery, buildSnapshotPayload } from './market-contracts.js';

test('parseMarketQuery: valid defaults', () => {
    const data = parseMarketQuery({});
    assert.equal(data.topCount, 25);
    assert.equal(data.sortBy, 'market_cap');
});

test('parseMarketQuery: valid inputs', () => {
    const data = parseMarketQuery({ topCount: '50', sortBy: 'volume' });
    assert.equal(data.topCount, 50);
    assert.equal(data.sortBy, 'volume');
});

test('parseMarketQuery: invalid topCount throws', () => {
    assert.throws(
        () => parseMarketQuery({ topCount: -5 }),
        /INVALID_TOP_COUNT/
    );
    assert.throws(
        () => parseMarketQuery({ topCount: 500 }),
        /INVALID_TOP_COUNT/
    );
});

test('parseMarketQuery: invalid sortBy throws', () => {
    assert.throws(
        () => parseMarketQuery({ sortBy: 'price' }),
        /INVALID_SORT_BY/
    );
});

test('buildSnapshotPayload: valid payload', () => {
    const raw = {
        topCoins: { data: [{ id: 'btc' }] },
        metrics: { fgi: 50 }
    };
    const payload = buildSnapshotPayload(raw);
    assert.ok(payload.ts);
    assert.equal(payload.topCoins.data[0].id, 'btc');
});

test('buildSnapshotPayload: invalid payload throws', () => {
    assert.throws(
        () => buildSnapshotPayload({ topCoins: {}, metrics: {} }),
        /INVALID_SNAPSHOT_PAYLOAD/
    );
});