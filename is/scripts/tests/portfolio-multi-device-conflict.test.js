/**
 * #JS-gkUdkghH
 * @description Verifies portfolio multi-device conflict helpers: lifecycle preservation, drift detection, detached conflict fork creation.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { ROOT } from '../../contracts/path-contracts.js';

function loadPortfolioConfig() {
    const fullPath = path.resolve(ROOT, 'core/config/portfolio-config.js');
    const code = fs.readFileSync(fullPath, 'utf8');
    const storage = new Map();
    const sandbox = {
        window: {
            modelsConfig: {
                getDefaultParams: () => ({ horizonDays: 2, mdnHours: 4, agrMethod: 'mp' }),
                getDefaultModelId: () => 'Median/AIR/260101',
                getModelMeta: () => null,
                getModel: () => ({ name: 'Median/AIR' })
            },
            fgiVal: 50,
            btcDomVal: 0,
            vixVal: null,
            oiVal: null,
            frVal: null,
            lsrVal: null
        },
        localStorage: {
            getItem: key => storage.get(key) ?? null,
            setItem: (key, value) => storage.set(key, value),
            removeItem: key => storage.delete(key)
        },
        console: {
            log() {},
            warn() {},
            error() {}
        },
        Date,
        JSON,
        Math,
        Map,
        Set
    };
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox);
    return sandbox.window.portfolioConfig;
}

test('preparePortfolioForPersistence preserves lifecycle and cloud lineage', () => {
    const portfolioConfig = loadPortfolioConfig();
    const previousPortfolio = {
        id: '250312-1000',
        name: 'Base',
        createdAt: '2026-03-12T10:00:00.000Z',
        updatedAt: '2026-03-12T10:00:00.000Z',
        cloudflareId: 42,
        cloudUpdatedAt: '2026-03-12T10:00:00.000Z',
        syncState: 'synced',
        cloudSyncMode: 'auto',
        coins: [],
        snapshots: { snapshotId: '250312-100000', assets: [], metrics: [], market: { snapshotId: '250312-100000' } }
    };
    const nextPortfolio = {
        id: '250312-1000',
        name: 'Edited',
        coins: [],
        snapshots: { snapshotId: '250312-100500', assets: [], metrics: [], market: { snapshotId: '250312-100500' } }
    };

    portfolioConfig.preparePortfolioForPersistence(nextPortfolio, previousPortfolio);

    assert.equal(nextPortfolio.createdAt, previousPortfolio.createdAt);
    assert.equal(nextPortfolio.cloudflareId, previousPortfolio.cloudflareId);
    assert.equal(nextPortfolio.cloudUpdatedAt, previousPortfolio.cloudUpdatedAt);
    assert.equal(nextPortfolio.syncState, 'local-only');
    assert.equal(nextPortfolio.cloudSyncMode, 'auto');
    assert.ok(typeof nextPortfolio.updatedAt === 'string' && nextPortfolio.updatedAt.length > 0);
});

test('detectMultiDeviceConflict flags diverged local and remote revisions', () => {
    const portfolioConfig = loadPortfolioConfig();
    const portfolio = {
        id: '250312-1000',
        cloudflareId: 42,
        updatedAt: '2026-03-12T10:05:00.000Z',
        cloudUpdatedAt: '2026-03-12T10:00:00.000Z',
        syncState: 'error',
        cloudSyncMode: 'auto'
    };

    assert.equal(
        portfolioConfig.detectMultiDeviceConflict(portfolio, '2026-03-12T10:03:00.000Z'),
        true
    );
});

test('detectMultiDeviceConflict stays false when local copy is clean', () => {
    const portfolioConfig = loadPortfolioConfig();
    const portfolio = {
        id: '250312-1000',
        cloudflareId: 42,
        updatedAt: '2026-03-12T10:00:00.000Z',
        cloudUpdatedAt: '2026-03-12T10:00:00.000Z',
        syncState: 'synced',
        cloudSyncMode: 'auto'
    };

    assert.equal(
        portfolioConfig.detectMultiDeviceConflict(portfolio, '2026-03-12T10:03:00.000Z'),
        false
    );
});

test('buildConflictPortfolio creates detached explicit copy', () => {
    const portfolioConfig = loadPortfolioConfig();
    const portfolio = {
        id: '250312-1000',
        name: 'Momentum',
        createdAt: '2026-03-12T10:00:00.000Z',
        updatedAt: '2026-03-12T10:05:00.000Z',
        cloudflareId: 42,
        cloudUpdatedAt: '2026-03-12T10:00:00.000Z',
        syncState: 'error',
        cloudSyncMode: 'auto',
        coins: [],
        snapshots: { snapshotId: '250312-100000', assets: [], metrics: [], market: { snapshotId: '250312-100000' } }
    };

    const conflictPortfolio = portfolioConfig.buildConflictPortfolio(portfolio, {
        detectedAt: '2026-03-12T10:06:00.000Z',
        remoteUpdatedAt: '2026-03-12T10:04:00.000Z'
    });

    assert.notEqual(conflictPortfolio.id, portfolio.id);
    assert.equal(conflictPortfolio.cloudflareId, null);
    assert.equal(conflictPortfolio.cloudUpdatedAt, null);
    assert.equal(conflictPortfolio.syncState, 'conflict');
    assert.equal(conflictPortfolio.cloudSyncMode, 'explicit');
    assert.match(conflictPortfolio.name, /\(конфликт\)$/);
    assert.equal(conflictPortfolio.conflictMeta.originPortfolioId, portfolio.id);
    assert.equal(conflictPortfolio.conflictMeta.originCloudflareId, '42');
    assert.equal(conflictPortfolio.conflictMeta.remoteUpdatedAt, '2026-03-12T10:04:00.000Z');
});
