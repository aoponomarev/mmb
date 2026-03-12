/**
 * #JS-aNzHSaKo
 * @description SSOT for portfolio data structure and parameters; compatibility facade over portfolio-engine.
 * @skill id:sk-c3d639
 *
 * PURPOSE: Portfolio data structure; support mixed portfolios, preserve formation context; compatible with migration plan (Block D.1).
 *
 * PRINCIPLES:
 * - Support mixed portfolios (coins from different models)
 * - Preserve formation context (market metrics, model state)
 * - Compatible with migration plan (Block D.1)
 *
 * REFERENCES:
 * - Doc: id:ais-6f2b1d (docs/ais/ais-portfolio-system.md)
 * - Metrics documentation: id:sk-c3d639
 * - Portfolio architecture: id:sk-483943 (section "Portfolio system")
 * - Hardening: legacy donor recipe-portfolio-engine-mvp-hardening (id:ais-3f4e5c, LIR-005.A1)
 *
 * NOTE: Compatibility facade over #JS-rrLtero9 (portfolio-engine.js); new code should call window.portfolioEngine.* directly when possible.
 */

(function() {
    'use strict';

    function resolvePortfolioModelInfo(modelId) {
        const resolvedModelId = modelId
            || window.modelsConfig?.getDefaultModelId?.()
            || 'Median/AIR/260101';
        const model = window.modelsConfig ? window.modelsConfig.getModel(resolvedModelId) : null;
        const modelMeta = window.modelsConfig ? window.modelsConfig.getModelMeta?.(resolvedModelId) : null;

        return {
            modelId: resolvedModelId,
            model,
            modelMeta,
            modelName: modelMeta?.versionName || model?.name || 'Unknown'
        };
    }

    function normalizeKeyMetric(keyMetric) {
        if (!keyMetric) return null;
        if (typeof keyMetric === 'string') {
            const label = keyMetric.trim();
            return label ? { field: null, label } : null;
        }
        if (typeof keyMetric !== 'object' || Array.isArray(keyMetric)) {
            return null;
        }

        const field = typeof keyMetric.field === 'string' && keyMetric.field.trim()
            ? keyMetric.field.trim()
            : null;
        const label = typeof keyMetric.label === 'string' && keyMetric.label.trim()
            ? keyMetric.label.trim()
            : null;

        if (!field && !label) {
            return null;
        }

        return {
            field,
            label: label || field
        };
    }

    function normalizePortfolioCoin(coin, fallbackModelId) {
        const info = resolvePortfolioModelInfo(coin?.delegatedBy?.modelId || fallbackModelId);
        const keyMetric = normalizeKeyMetric(
            coin?.keyMetric
            || { field: coin?.keyMetricField || null, label: coin?.keyBuyer || coin?.keyMetricLabel || null }
        );

        return {
            ...coin,
            coinId: coin?.coinId || coin?.id || null,
            ticker: (coin?.ticker || coin?.symbol || '').toUpperCase(),
            name: coin?.name || '',
            currentPrice: coin?.currentPrice ?? coin?.price ?? coin?.current_price ?? 0,
            pvs: coin?.pvs || [coin?.PV1h, coin?.PV24h, coin?.PV7d, coin?.PV14d, coin?.PV30d, coin?.PV200d],
            metrics: { ...(coin?.metrics || {}) },
            portfolioPercent: Number.isFinite(Number(coin?.portfolioPercent)) ? Number(coin.portfolioPercent) : 0,
            isLocked: !!coin?.isLocked,
            isDisabledInRebalance: !!coin?.isDisabledInRebalance,
            delegatedBy: {
                modelId: info.modelId,
                modelName: coin?.delegatedBy?.modelName || info.modelName,
                agrAtDelegation: Number.isFinite(Number(coin?.delegatedBy?.agrAtDelegation))
                    ? Number(coin.delegatedBy.agrAtDelegation)
                    : Number(coin?.metrics?.agr || 0),
                timestamp: coin?.delegatedBy?.timestamp || coin?.createdAt || new Date().toISOString()
            },
            keyMetric
        };
    }

    /**
     * Creates empty coin structure for portfolio
     * @param {Object} coin - Source coin data with metrics
     * @param {string} modelId - ID of model that delegated the coin
     * @param {number} weight - Share in portfolio (0-100)
     * @returns {Object} Coin structure in portfolio
     */
    function createPortfolioCoin(coin, modelId, weight = 0) {
        const info = resolvePortfolioModelInfo(modelId);

        return normalizePortfolioCoin({
            coinId: coin.id || coin.coinId,
            ticker: (coin.symbol || coin.ticker || '').toUpperCase(),
            name: coin.name || '',

            // Price and PV snapshot at add time
            currentPrice: coin.current_price || coin.price || 0,
            pvs: coin.pvs || [coin.PV1h, coin.PV24h, coin.PV7d, coin.PV14d, coin.PV30d, coin.PV200d],

            // Metrics
            metrics: { ...(coin.metrics || {}) },

            // Portfolio attributes
            portfolioPercent: weight,

            // Link to model (D.1)
            delegatedBy: {
                modelId: info.modelId,
                modelName: info.modelName,
                agrAtDelegation: coin.metrics?.agr || 0,
                timestamp: new Date().toISOString()
            }
        }, info.modelId);
    }

    /**
     * Creates new portfolio structure (D.1)
     */
    function createPortfolio(id, name, coins = [], marketMetrics = {}, marketAnalysis = {}, settings = {}, modelMix = {}) {
        const defaultParams = window.modelsConfig?.getDefaultParams?.() || {};
        const defaultModelId = window.modelsConfig?.getDefaultModelId?.() || 'Median/AIR/260101';
        const horizonDays = Number(defaultParams.horizonDays);
        const mdnHours = Number(defaultParams.mdnHours);
        const defaultSettings = {
            horizonDays: Number.isFinite(horizonDays) && horizonDays > 0 ? horizonDays : 2,
            mdnHours: Number.isFinite(mdnHours) && mdnHours > 0 ? mdnHours : 4,
            agrMethod: typeof defaultParams.agrMethod === 'string' ? defaultParams.agrMethod : 'mp',
            mode: 'equal',
            modelId: defaultModelId
        };
        const nowIso = new Date().toISOString();
        const snapshotId = generateSnapshotId();
        const normalizedCoins = Array.isArray(coins)
            ? coins.map(coin => normalizePortfolioCoin(coin, (settings && settings.modelId) || defaultModelId))
            : [];
        return {
            id: id || generatePortfolioId(),
            name: name || 'New Portfolio',
            createdAt: nowIso,
            updatedAt: nowIso,
            schemaVersion: 2,
            coins: normalizedCoins,
            snapshots: buildSnapshots(snapshotId, normalizedCoins, marketMetrics, settings || {}, (settings && settings.modelId) || defaultModelId),
            marketMetrics: {
                fgi: window.fgiVal || 50,
                btcDominance: 0,
                ...marketMetrics
            },
            marketAnalysis: marketAnalysis || null,
            settings: {
                ...defaultSettings,
                ...settings
            },
            modelMix: modelMix || {},
            modelVersion: {
                modelId: (settings && settings.modelId) || defaultModelId,
                modelName: window.modelsConfig?.getModelMeta?.((settings && settings.modelId) || defaultModelId)?.versionName
                    || window.modelsConfig?.getModel?.((settings && settings.modelId) || defaultModelId)?.name
                    || 'Unknown',
                versionName: window.modelsConfig?.getModelMeta?.((settings && settings.modelId) || defaultModelId)?.versionName
                    || null,
                versionDate: window.modelsConfig?.getModelMeta?.((settings && settings.modelId) || defaultModelId)?.versionDate
                    || null
            }
        };
    }

    function buildSnapshots(snapshotId, coins, marketMetrics, settings, modelId) {
        const createdAt = new Date().toISOString();
        const assets = Array.isArray(coins) ? coins.map(coin => ({
            coinId: coin.coinId || coin.id || null,
            ticker: (coin.ticker || coin.symbol || '').toUpperCase(),
            name: coin.name || '',
            price: coin.currentPrice || coin.price || coin.current_price || 0,
            marketCap: coin.market_cap || 0,
            volume24h: coin.total_volume || 0,
            pvs: coin.pvs || [coin.PV1h, coin.PV24h, coin.PV7d, coin.PV14d, coin.PV30d, coin.PV200d],
            keyMetric: normalizeKeyMetric(coin.keyMetric),
            keyBuyer: normalizeKeyMetric(coin.keyMetric)?.label || null
        })) : [];
        const metrics = Array.isArray(coins) ? coins.map(coin => ({
            coinId: coin.coinId || coin.id || null,
            agr: coin.metrics?.agr || 0,
            agrLong: coin.metrics?.agrLong || null,
            agrShort: coin.metrics?.agrShort || null,
            A: coin.metrics?.A ?? null,
            I: coin.metrics?.I ?? null,
            R: coin.metrics?.R ?? null,
            DIN: coin.metrics?.din ?? null,
            CGR: coin.metrics?.cgr ?? null,
            CPT: coin.metrics?.cpt ?? null,
            CDH: coin.metrics?.cdh ?? null,
            keyMetricField: normalizeKeyMetric(coin.keyMetric)?.field || null,
            keyBuyer: normalizeKeyMetric(coin.keyMetric)?.label || null,
            modelId,
            agrMethodUsed: settings?.agrMethod ?? null
        })) : [];

        return {
            snapshotId,
            market: {
                createdAt,
                snapshotId,
                modelId,
                settings: {
                    horizonDays: settings?.horizonDays ?? null,
                    mdnHours: settings?.mdnHours ?? null,
                    agrMethod: settings?.agrMethod ?? null
                },
                metrics: {
                    fgi: window.fgiVal ?? 50,
                    btcDominance: window.btcDomVal ?? 0,
                    vix: window.vixVal ?? null,
                    oi: window.oiVal ?? null,
                    fr: window.frVal ?? null,
                    lsr: window.lsrVal ?? null,
                    ...marketMetrics
                }
            },
            assets,
            metrics,
            assetsSnapshotId: snapshotId,
            metricsSnapshotId: snapshotId
        };
    }

    /**
     * Generates ID by template YYMMDD-hhmm
     */
    function generatePortfolioId(date = new Date()) {
        const year = date.getFullYear().toString().slice(-2);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}${month}${day}-${hours}${minutes}`;
    }

    function generateSnapshotId(date = new Date()) {
        const year = date.getFullYear().toString().slice(-2);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}${month}${day}-${hours}${minutes}${seconds}`;
    }

    function normalizeCloudSyncMode(mode) {
        return mode === 'explicit' ? 'explicit' : 'auto';
    }

    function normalizeSyncState(syncState) {
        const normalized = typeof syncState === 'string' ? syncState.trim().toLowerCase() : '';
        return ['local-only', 'synced', 'error', 'stale', 'conflict'].includes(normalized)
            ? normalized
            : null;
    }

    function normalizeIsoTimestamp(value) {
        if (typeof value !== 'string') {
            return null;
        }
        const normalized = value.trim();
        if (!normalized) {
            return null;
        }
        const timestampMs = Date.parse(normalized);
        return Number.isFinite(timestampMs) ? new Date(timestampMs).toISOString() : null;
    }

    function toTimestampMs(value) {
        const normalized = normalizeIsoTimestamp(value);
        return normalized ? Date.parse(normalized) : null;
    }

    function hasTimestampDrift(candidate, baseline) {
        const candidateMs = toTimestampMs(candidate);
        const baselineMs = toTimestampMs(baseline);
        if (!Number.isFinite(candidateMs) || !Number.isFinite(baselineMs)) {
            return false;
        }
        return candidateMs > baselineMs + 1;
    }

    function normalizeConflictMeta(conflictMeta) {
        if (!conflictMeta || typeof conflictMeta !== 'object' || Array.isArray(conflictMeta)) {
            return null;
        }
        const detectedAt = normalizeIsoTimestamp(conflictMeta.detectedAt) || new Date().toISOString();
        const localUpdatedAt = normalizeIsoTimestamp(conflictMeta.localUpdatedAt);
        const remoteUpdatedAt = normalizeIsoTimestamp(conflictMeta.remoteUpdatedAt);
        const originPortfolioId = typeof conflictMeta.originPortfolioId === 'string' && conflictMeta.originPortfolioId.trim()
            ? conflictMeta.originPortfolioId.trim()
            : null;
        const originCloudflareId = conflictMeta.originCloudflareId === undefined || conflictMeta.originCloudflareId === null
            ? null
            : String(conflictMeta.originCloudflareId).trim() || null;
        const strategy = typeof conflictMeta.strategy === 'string' && conflictMeta.strategy.trim()
            ? conflictMeta.strategy.trim()
            : 'fork-local-copy';
        return {
            detectedAt,
            localUpdatedAt,
            remoteUpdatedAt,
            originPortfolioId,
            originCloudflareId,
            strategy
        };
    }

    function buildConflictPortfolioName(name) {
        const safeName = typeof name === 'string' && name.trim() ? name.trim() : 'New Portfolio';
        return safeName.endsWith(' (конфликт)') ? safeName : `${safeName} (конфликт)`;
    }

    function generateConflictPortfolioId(date = new Date()) {
        const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
        return `${generateSnapshotId(date)}-CF${milliseconds}`;
    }

    function hasLocalChangesSinceCloudSync(portfolio) {
        if (!portfolio || typeof portfolio !== 'object') {
            return false;
        }
        if (normalizeCloudSyncMode(portfolio.cloudSyncMode) === 'explicit') {
            return false;
        }
        const syncState = normalizeSyncState(portfolio.syncState);
        if (syncState === 'conflict') {
            return true;
        }
        if (hasTimestampDrift(portfolio.updatedAt, portfolio.cloudUpdatedAt)) {
            return true;
        }
        return syncState === 'local-only' || syncState === 'error';
    }

    function detectMultiDeviceConflict(portfolio, remoteUpdatedAt) {
        if (!portfolio || typeof portfolio !== 'object' || portfolio.cloudflareId === undefined || portfolio.cloudflareId === null) {
            return false;
        }
        if (!hasTimestampDrift(remoteUpdatedAt, portfolio.cloudUpdatedAt)) {
            return false;
        }
        return hasLocalChangesSinceCloudSync(portfolio);
    }

    function preparePortfolioForPersistence(portfolio, previousPortfolio = null) {
        if (!portfolio || typeof portfolio !== 'object') {
            return portfolio;
        }
        const nowIso = new Date().toISOString();
        const previous = previousPortfolio && typeof previousPortfolio === 'object' ? previousPortfolio : null;
        portfolio.createdAt = previous?.createdAt || portfolio.createdAt || nowIso;
        portfolio.updatedAt = nowIso;
        portfolio.cloudflareId = previous?.cloudflareId ?? portfolio.cloudflareId ?? null;
        portfolio.cloudUpdatedAt = normalizeIsoTimestamp(
            previous?.cloudUpdatedAt
            || portfolio.cloudUpdatedAt
            || (portfolio.cloudflareId ? previous?.updatedAt || portfolio.updatedAt : null)
        );
        portfolio.syncState = 'local-only';
        portfolio.cloudSyncMode = 'auto';
        portfolio.conflictMeta = null;
        return portfolio;
    }

    function buildConflictPortfolio(portfolio, conflictMeta = {}) {
        const detectedAt = normalizeIsoTimestamp(conflictMeta.detectedAt) || new Date().toISOString();
        const fork = normalizePortfolio(JSON.parse(JSON.stringify(portfolio || {})));
        // @causality #for-multi-device-conflict-forking
        fork.id = generateConflictPortfolioId(new Date(detectedAt));
        fork.name = buildConflictPortfolioName(fork.name);
        fork.createdAt = detectedAt;
        fork.updatedAt = detectedAt;
        fork.cloudflareId = null;
        fork.cloudUpdatedAt = null;
        fork.syncState = 'conflict';
        fork.cloudSyncMode = 'explicit';
        fork.conflictMeta = normalizeConflictMeta({
            detectedAt,
            localUpdatedAt: conflictMeta.localUpdatedAt || portfolio?.updatedAt || detectedAt,
            remoteUpdatedAt: conflictMeta.remoteUpdatedAt || null,
            originPortfolioId: conflictMeta.originPortfolioId || portfolio?.id || null,
            originCloudflareId: conflictMeta.originCloudflareId || portfolio?.cloudflareId || null,
            strategy: conflictMeta.strategy || 'fork-local-copy'
        });
        return fork;
    }

    const GUEST_STORAGE_KEY = 'app-portfolios';
    const AUTH_STORAGE_KEY_SEPARATOR = '::';

    function normalizePortfolioStorageScope(scope) {
        if (typeof scope !== 'string') {
            return 'guest';
        }
        const normalized = scope.trim().toLowerCase();
        return normalized || 'guest';
    }

    function getCurrentPortfolioStorageScope() {
        const authState = window.authState?.getState?.();
        const userEmail = authState?.isAuthenticated ? authState?.user?.email : null;
        return normalizePortfolioStorageScope(userEmail || 'guest');
    }

    function resolvePortfolioStorageKey(scope) {
        const resolvedScope = scope === undefined || scope === null || scope === 'current'
            ? getCurrentPortfolioStorageScope()
            : normalizePortfolioStorageScope(scope);
        return resolvedScope === 'guest'
            ? GUEST_STORAGE_KEY
            : `${GUEST_STORAGE_KEY}${AUTH_STORAGE_KEY_SEPARATOR}${resolvedScope}`;
    }

    function readLocalPortfoliosForKey(storageKey) {
        try {
            const data = localStorage.getItem(storageKey);
            const parsed = data ? JSON.parse(data) : [];
            if (!Array.isArray(parsed)) return [];
            return parsed.map(normalizePortfolio);
        } catch (e) {
            console.error(`portfolio-config: localStorage read error for ${storageKey}`, e);
            return [];
        }
    }

    function writeLocalPortfoliosForKey(storageKey, portfolios) {
        try {
            const normalized = Array.isArray(portfolios)
                ? portfolios.map(normalizePortfolio)
                : portfolios;
            localStorage.setItem(storageKey, JSON.stringify(normalized));
            return true;
        } catch (e) {
            console.error(`portfolio-config: localStorage write error for ${storageKey}`, e);
            return false;
        }
    }

    function bootstrapAuthPortfoliosFromGuest() {
        const authKey = resolvePortfolioStorageKey();
        if (authKey === GUEST_STORAGE_KEY) {
            return false;
        }
        const authPortfolios = readLocalPortfoliosForKey(authKey);
        if (authPortfolios.length > 0) {
            return false;
        }
        const guestPortfolios = readLocalPortfoliosForKey(GUEST_STORAGE_KEY);
        if (guestPortfolios.length === 0) {
            return false;
        }
        return writeLocalPortfoliosForKey(authKey, guestPortfolios);
    }

    function normalizePortfolio(portfolio) {
        if (!portfolio || typeof portfolio !== 'object') return portfolio;
        const defaultParams = window.modelsConfig?.getDefaultParams?.() || {};
        const defaultHorizon = Number(defaultParams.horizonDays);
        const defaultMdn = Number(defaultParams.mdnHours);
        const defaultAgr = typeof defaultParams.agrMethod === 'string' ? defaultParams.agrMethod : 'mp';
        const info = resolvePortfolioModelInfo(
            portfolio?.settings?.modelId
            || portfolio?.modelVersion?.modelId
            || portfolio?.coins?.[0]?.delegatedBy?.modelId
        );
        const modelId = info.modelId;
        const meta = info.modelMeta;
        const modelName = info.modelName;

        if (!portfolio.settings) {
            portfolio.settings = { modelId };
        } else if (!portfolio.settings.modelId) {
            portfolio.settings.modelId = modelId;
        }
        if (!portfolio.settings.horizonDays) {
            portfolio.settings.horizonDays = Number.isFinite(defaultHorizon) && defaultHorizon > 0 ? defaultHorizon : 2;
        }
        if (!portfolio.settings.mdnHours) {
            portfolio.settings.mdnHours = Number.isFinite(defaultMdn) && defaultMdn > 0 ? defaultMdn : 4;
        }
        if (!portfolio.settings.agrMethod) {
            portfolio.settings.agrMethod = defaultAgr;
        }

        if (!portfolio.modelVersion) {
            portfolio.modelVersion = {
                modelId,
                modelName,
                versionDate: meta?.versionDate || null
            };
        }
        if (!portfolio.modelVersion.versionName) {
            portfolio.modelVersion.versionName = meta?.versionName || modelName;
        }
        portfolio.schemaVersion = Math.max(Number(portfolio.schemaVersion) || 0, 2);
        if (!portfolio.updatedAt) {
            portfolio.updatedAt = portfolio.createdAt || new Date().toISOString();
        }
        portfolio.description = typeof portfolio.description === 'string' ? portfolio.description : null;
        portfolio.cloudSyncMode = normalizeCloudSyncMode(portfolio.cloudSyncMode);
        portfolio.cloudUpdatedAt = normalizeIsoTimestamp(
            portfolio.cloudUpdatedAt
            || (portfolio.cloudflareId ? portfolio.updatedAt : null)
        );
        portfolio.conflictMeta = normalizeConflictMeta(portfolio.conflictMeta);
        portfolio.coins = Array.isArray(portfolio.coins)
            ? portfolio.coins.map(coin => normalizePortfolioCoin(coin, modelId))
            : [];
        if (!portfolio.snapshots?.market?.createdAt) {
            if (portfolio.snapshots?.market) {
                portfolio.snapshots.market.createdAt = portfolio.createdAt || new Date().toISOString();
            }
        }
        if (portfolio.snapshots?.assets && !portfolio.snapshots.assetsCreatedAt) {
            portfolio.snapshots.assetsCreatedAt = portfolio.createdAt || new Date().toISOString();
        }
        if (portfolio.snapshots?.metrics && !portfolio.snapshots.metricsCreatedAt) {
            portfolio.snapshots.metricsCreatedAt = portfolio.createdAt || new Date().toISOString();
        }

        if (portfolio.modelMix && typeof portfolio.modelMix === 'object') {
            Object.keys(portfolio.modelMix).forEach(id => {
                const mixMeta = window.modelsConfig?.getModelMeta?.(id) || null;
                if (!portfolio.modelMix[id].modelName) {
                    portfolio.modelMix[id].modelName = mixMeta?.versionName
                        || window.modelsConfig?.getModel?.(id)?.name
                        || 'Unknown';
                }
                if (!portfolio.modelMix[id].versionDate) {
                    portfolio.modelMix[id].versionDate = mixMeta?.versionDate || null;
                }
            });
        }

        const existingMarketSnapshot = portfolio.snapshots?.market
            && typeof portfolio.snapshots.market === 'object'
            ? { ...portfolio.snapshots.market }
            : null;
        if (
            !portfolio.snapshots
            || !portfolio.snapshots.snapshotId
            || !Array.isArray(portfolio.snapshots.assets)
            || !Array.isArray(portfolio.snapshots.metrics)
        ) {
            const snapshotId = portfolio.snapshots?.snapshotId
                || generateSnapshotId(new Date(portfolio.createdAt || Date.now()));
            portfolio.snapshots = buildSnapshots(
                snapshotId,
                portfolio.coins || [],
                portfolio.marketMetrics || {},
                portfolio.settings || {},
                modelId
            );
            if (existingMarketSnapshot) {
                portfolio.snapshots.market = {
                    ...portfolio.snapshots.market,
                    ...existingMarketSnapshot
                };
            }
        }
        const coinKeyMetrics = new Map(
            (portfolio.coins || []).map(coin => [
                coin.coinId,
                normalizeKeyMetric(coin.keyMetric)
            ])
        );
        if (portfolio.snapshots?.market && !portfolio.snapshots.market.metrics) {
            portfolio.snapshots.market.metrics = {};
        }
        if (portfolio.snapshots.market?.metrics?.fgi === undefined || portfolio.snapshots.market?.metrics?.fgi === null) {
            portfolio.snapshots.market.metrics.fgi = portfolio.marketMetrics?.fgi ?? window.fgiVal ?? 50;
        }
        if (portfolio.snapshots.market?.metrics?.btcDominance === undefined || portfolio.snapshots.market?.metrics?.btcDominance === null) {
            portfolio.snapshots.market.metrics.btcDominance = portfolio.marketMetrics?.btcDominance ?? window.btcDomVal ?? 0;
        }
        if (portfolio.snapshots.market?.metrics?.vix === undefined || portfolio.snapshots.market?.metrics?.vix === null) {
            portfolio.snapshots.market.metrics.vix = window.vixVal ?? null;
        }
        if (portfolio.snapshots.market?.metrics?.oi === undefined || portfolio.snapshots.market?.metrics?.oi === null) {
            portfolio.snapshots.market.metrics.oi = window.oiVal ?? null;
        }
        if (portfolio.snapshots.market?.metrics?.fr === undefined || portfolio.snapshots.market?.metrics?.fr === null) {
            portfolio.snapshots.market.metrics.fr = window.frVal ?? null;
        }
        if (portfolio.snapshots.market?.metrics?.lsr === undefined || portfolio.snapshots.market?.metrics?.lsr === null) {
            portfolio.snapshots.market.metrics.lsr = window.lsrVal ?? null;
        }
        if (!portfolio.snapshots.snapshotId) {
            portfolio.snapshots.snapshotId = generateSnapshotId(new Date(portfolio.createdAt || Date.now()));
        }
        if (portfolio.snapshots.market && !portfolio.snapshots.market.snapshotId) {
            portfolio.snapshots.market.snapshotId = portfolio.snapshots.snapshotId;
        }
        if (portfolio.snapshots.assets && !portfolio.snapshots.assetsSnapshotId) {
            portfolio.snapshots.assetsSnapshotId = portfolio.snapshots.snapshotId;
        }
        if (portfolio.snapshots.metrics && !portfolio.snapshots.metricsSnapshotId) {
            portfolio.snapshots.metricsSnapshotId = portfolio.snapshots.snapshotId;
        }
        if (Array.isArray(portfolio.snapshots.assets)) {
            portfolio.snapshots.assets.forEach(asset => {
                const keyMetric = normalizeKeyMetric(
                    asset?.keyMetric || { field: asset?.keyMetricField || null, label: asset?.keyBuyer || null }
                ) || coinKeyMetrics.get(asset?.coinId) || null;
                asset.keyMetric = keyMetric;
                asset.keyBuyer = keyMetric?.label || null;
            });
        }
        if (Array.isArray(portfolio.snapshots.metrics)) {
            portfolio.snapshots.metrics.forEach(metric => {
                if (!metric.modelId) {
                    metric.modelId = modelId;
                }
                if (!metric.agrMethodUsed) {
                    metric.agrMethodUsed = portfolio.settings?.agrMethod ?? null;
                }
                const keyMetric = coinKeyMetrics.get(metric?.coinId) || null;
                if (!metric.keyMetricField) {
                    metric.keyMetricField = keyMetric?.field || null;
                }
                if (!metric.keyBuyer) {
                    metric.keyBuyer = keyMetric?.label || null;
                }
            });
        }

        // Keep sync state explicit so multi-device resolution can distinguish
        // clean cloud replicas from detached conflict copies and pending local edits.
        portfolio.syncState = normalizeSyncState(portfolio.syncState)
            || (portfolio.conflictMeta ? 'conflict' : (portfolio.cloudflareId ? 'synced' : 'local-only'));

        return portfolio;
    }

    window.portfolioConfig = {
        createPortfolioCoin,
        createPortfolio,
        generatePortfolioId,
        generateSnapshotId,
        normalizeKeyMetric,
        normalizePortfolioCoin,
        normalizePortfolio,
        normalizeCloudSyncMode,
        normalizeSyncState,
        normalizeConflictMeta,
        hasTimestampDrift,
        hasLocalChangesSinceCloudSync,
        detectMultiDeviceConflict,
        preparePortfolioForPersistence,
        buildConflictPortfolio,
        getCurrentPortfolioStorageScope,
        resolvePortfolioStorageKey,
        bootstrapAuthPortfoliosFromGuest,

        /**
         * Gets portfolio list from local storage (D.5)
         */
        getLocalPortfolios(scope = 'current') {
            return readLocalPortfoliosForKey(resolvePortfolioStorageKey(scope));
        },

        /**
         * Save portfolios list to local storage (D.5)
         */
        saveLocalPortfolios(portfolios, scope = 'current') {
            return writeLocalPortfoliosForKey(resolvePortfolioStorageKey(scope), portfolios);
        },
        /**
         * Export portfolios to JSON (stage 4)
         * @param {string} mode - 'light' (portfolios only) | 'full' (portfolios + snapshots)
         */
        exportPortfolios(mode = 'light') {
            const portfolios = this.getLocalPortfolios();
            const exportData = {
                schemaVersion: 2,
                mode: mode,
                exportedAt: new Date().toISOString(),
                models: window.modelsConfig?.getModels?.() || {},
                portfolios
            };

            // In 'light' mode remove heavy snapshots from portfolios if present
            if (mode === 'light') {
                exportData.portfolios = portfolios.map(p => {
                    const cloned = { ...p };
                    if (cloned.snapshots) {
                        // Keep only snapshot IDs for references, remove data arrays
                        cloned.snapshots = {
                            snapshotId: cloned.snapshots.snapshotId,
                            market: { snapshotId: cloned.snapshots.market?.snapshotId },
                            assetsSnapshotId: cloned.snapshots.assetsSnapshotId,
                            metricsSnapshotId: cloned.snapshots.metricsSnapshotId
                        };
                    }
                    return cloned;
                });
            }

            return exportData;
        },
        /**
         * Import portfolios from JSON (stage 4)
         * @param {Object} payload
         * @param {Object} options
         */
        importPortfolios(payload, options = {}) {
            const mode = options.mode === 'replace' ? 'replace' : 'merge';
            const scope = getCurrentPortfolioStorageScope();
            const incoming = payload?.portfolios;
            if (!Array.isArray(incoming)) {
                return {
                    ok: false,
                    count: 0,
                    mode,
                    scope,
                    explicitCloudSyncRequired: false,
                    detachedCount: 0,
                    reason: 'invalid-payload'
                };
            }
            const normalized = incoming
                .map(normalizePortfolio)
                .filter(portfolio => portfolio && typeof portfolio === 'object')
                .map(portfolio => {
                    // Imported archives stay local-only until the user explicitly opens and saves them again.
                    // @causality #for-explicit-import-sync
                    portfolio.cloudflareId = null;
                    portfolio.cloudUpdatedAt = null;
                    portfolio.syncState = 'local-only';
                    portfolio.cloudSyncMode = 'explicit';
                    portfolio.conflictMeta = null;
                    return portfolio;
                });

            let ok = false;
            if (mode === 'replace') {
                ok = this.saveLocalPortfolios(normalized);
            } else {
                const existing = this.getLocalPortfolios();
                const byId = new Map(existing.map(p => [p.id, p]));
                normalized.forEach(p => byId.set(p.id, p));
                ok = this.saveLocalPortfolios(Array.from(byId.values()));
            }

            return {
                ok,
                count: normalized.length,
                mode,
                scope,
                explicitCloudSyncRequired: normalized.length > 0,
                detachedCount: normalized.length,
                reason: ok ? null : 'local-save-failed'
            };
        },

        /**
         * Distributes shares (percent) among coins in portfolio (D.2)
         * @param {Array} coins - Array of coins (objects with metrics.agr)
         * @param {string} mode - 'equal' | 'agr'
         * @param {number} totalPercent - Total target percent (usually 100)
         */
        calculateWeights(coins, mode = 'equal', totalPercent = 100) {
            if (!Array.isArray(coins) || coins.length === 0) return;

            // Backward-compatible facade: build canonical draft and return result in legacy portfolioPercent field.
            if (window.portfolioEngine && typeof window.portfolioEngine.allocateWeights === 'function') {
                const assets = coins.map((coin, index) => ({
                    coinId: coin.coinId || coin.id || `${coin.symbol || 'coin'}-${index}`,
                    ticker: (coin.ticker || coin.symbol || '').toUpperCase(),
                    side: (coin.metrics?.agr || 0) >= 0 ? 'long' : 'short',
                    agr: coin.metrics?.agr || 0,
                    weight: Number.isFinite(Number(coin.portfolioPercent)) ? Number(coin.portfolioPercent) : null,
                    isLocked: false,
                    isDisabledInRebalance: false,
                    delegatedBy: { modelId: coin.delegatedBy?.modelId || 'unknown', modelName: coin.delegatedBy?.modelName || '' }
                }));

                const draft = {
                    mode: mode === 'agr' ? 'agr' : 'equal',
                    constraints: {
                        totalWeight: Math.max(0, Math.round(Number(totalPercent) || 100)),
                        minWeight: 1
                    },
                    assets
                };

                const allocated = window.portfolioEngine.allocateWeights(draft, draft.mode);
                const byId = new Map((allocated.assets || []).map(asset => [asset.coinId, asset.weight]));
                coins.forEach((coin, index) => {
                    const key = coin.coinId || coin.id || `${coin.symbol || 'coin'}-${index}`;
                    const weight = byId.get(key);
                    coin.portfolioPercent = Number.isFinite(Number(weight)) ? Number(weight) : 0;
                });
                return;
            }

            // Fallback path (if engine is unavailable)
            const target = Math.max(0, Math.round(totalPercent));
            const base = Math.floor(target / coins.length);
            let assigned = 0;
            coins.forEach(c => {
                c.portfolioPercent = base;
                assigned += base;
            });
            let remainder = target - assigned;
            const sorted = [...coins].sort((a, b) => Math.abs(b.metrics?.agr || 0) - Math.abs(a.metrics?.agr || 0));
            let i = 0;
            while (remainder > 0) {
                sorted[i % sorted.length].portfolioPercent += 1;
                remainder--;
                i++;
            }
        },

        /**
         * Auto-selects top-5 Long and top-5 Short by AGR (D.2)
         * @param {Array} allCoins - Full list of coins with metrics
         * @returns {Array} Selected coins list
         */
        autoSelectCoins(allCoins) {
            if (!Array.isArray(allCoins) || allCoins.length === 0) return [];

            // Skill anchor: exclude stablecoins and wrappers from default auto-selection
            // See id:sk-c3d639
            const candidates = allCoins.filter(coin => {
                if (!window.coinsConfig) return true;
                // Exclude stablecoins, wrappers and LST from default set
                const type = window.coinsConfig.getCoinType(coin.id || coin.coinId, coin.symbol || coin.ticker, coin.name);
                return !type;
            });
            const banContext = window.banCoinSet && typeof window.banCoinSet.getContext === 'function'
                ? window.banCoinSet.getContext()
                : { bannedIds: new Set(), bannedTickers: new Set() };
            const filteredCandidates = candidates.filter(coin => {
                const coinId = String(coin?.id || coin?.coinId || '').trim();
                const ticker = String(coin?.symbol || coin?.ticker || '').trim().toLowerCase();
                return !(banContext.bannedIds.has(coinId) || banContext.bannedTickers.has(ticker));
            });

            if (window.portfolioEngine && typeof window.portfolioEngine.autoSelectCandidates === 'function') {
                return window.portfolioEngine.autoSelectCandidates(filteredCandidates, 'top5x2');
            }
            const sorted = [...filteredCandidates].sort((a, b) => (b.metrics?.agr || 0) - (a.metrics?.agr || 0));
            const positive = sorted.filter(c => (c.metrics?.agr || 0) >= 0).slice(0, 5);
            const negative = sorted.filter(c => (c.metrics?.agr || 0) < 0).slice(-5).reverse();
            return [...positive, ...negative];
        },

        /**
         * Validate canonical draft portfolio.
         * @param {Object} draft
         * @returns {{ok: boolean, issues: Array}}
         */
        validateDraft(draft) {
            if (window.portfolioValidation?.validateDraft) {
                return window.portfolioValidation.validateDraft(draft);
            }
            return { ok: true, issues: [] };
        },

        /**
         * Convert to Cloudflare payload.
         * @param {Object} draft
         * @returns {Object}
         */
        toCloudflarePayload(draft) {
            if (window.portfolioAdapters?.toCloudflarePayload) {
                return window.portfolioAdapters.toCloudflarePayload(draft);
            }
            return { name: draft?.name || 'New Portfolio', description: null, assets: [] };
        },

        /**
         * Convert to PostgreSQL payload.
         * @param {Object} draft
         * @param {Object} context
         * @returns {{portfolio: Object, snapshotsBatch: Object}}
         */
        toPostgresPayload(draft, context = {}) {
            if (window.portfolioAdapters?.toPostgresPayload) {
                return window.portfolioAdapters.toPostgresPayload(draft, context);
            }
            return { portfolio: {}, snapshotsBatch: {} };
        },

        /**
         * Computes model contribution stats for portfolio (D.2)
         * @param {Array} portfolioCoins - Coins already in portfolio structure
         * @returns {Object} Object with stats per modelId
         */
        calculateModelMix(portfolioCoins) {
            const mix = {};
            if (!portfolioCoins) return mix;

            portfolioCoins.forEach(coin => {
                const modelId = coin.delegatedBy?.modelId || 'unknown';
                const modelMeta = window.modelsConfig?.getModelMeta?.(modelId) || null;
                const modelName = modelMeta?.versionName || coin.delegatedBy?.modelName || 'Unknown';
                if (!mix[modelId]) {
                    mix[modelId] = {
                        coinsCount: 0,
                        totalPercent: 0,
                        modelName,
                        versionDate: modelMeta?.versionDate || null
                    };
                }
                mix[modelId].coinsCount++;
                mix[modelId].totalPercent += (coin.portfolioPercent || 0);
            });
            return mix;
        }
    };

})();
