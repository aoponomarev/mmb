/**
 * #JS-fJ68ZfEu
 * @description Provider payload adapters: toCloudflarePayload, toPostgresPayload (canonical draft → API shape).
 * @skill id:sk-02d3ea
 * @skill id:sk-bb7c8e
 *
 * REFERENCES:
 * - id:ais-6f2b1d (docs/ais/ais-portfolio-system.md)
 */
(function() {
    'use strict';

    function normalizeKeyMetric(keyMetric) {
        if (window.portfolioConfig?.normalizeKeyMetric) {
            return window.portfolioConfig.normalizeKeyMetric(keyMetric);
        }
        if (!keyMetric) return null;
        if (typeof keyMetric === 'string') {
            const label = keyMetric.trim();
            return label ? { field: null, label } : null;
        }
        if (typeof keyMetric !== 'object' || Array.isArray(keyMetric)) {
            return null;
        }
        const field = typeof keyMetric.field === 'string' && keyMetric.field.trim() ? keyMetric.field.trim() : null;
        const label = typeof keyMetric.label === 'string' && keyMetric.label.trim() ? keyMetric.label.trim() : null;
        if (!field && !label) return null;
        return { field, label: label || field };
    }

    function buildCloudflareDescriptionEnvelope(source) {
        const settings = source?.settings || {};
        const metadata = source?.metadata || {};
        const description = typeof source?.description === 'string' && source.description.trim()
            ? source.description.trim()
            : null;
        const envelope = {
            __appPortfolioMeta: 1,
            portfolioId: source?.id || null,
            userDescription: description,
            schemaVersion: Number(source?.schemaVersion) || 2,
            settings: {
                mode: source?.mode || settings.mode || 'equal',
                balanceMode: settings.balanceMode || null,
                modelId: settings.modelId || metadata.modelId || null,
                horizonDays: settings.horizonDays || metadata.horizonDays || null,
                mdnHours: settings.mdnHours || metadata.mdnHours || null,
                agrMethod: settings.agrMethod || metadata.agrMethod || null
            },
            modelVersion: source?.modelVersion || null,
            marketMetrics: source?.marketMetrics || null,
            marketAnalysis: source?.marketAnalysis || null,
            modelMix: source?.modelMix || null,
            snapshots: source?.snapshots?.market || source?.snapshots?.snapshotId
                ? {
                    snapshotId: source?.snapshots?.snapshotId || null,
                    market: source?.snapshots?.market || null
                }
                : null
        };

        const hasMeta = Object.values(envelope.settings).some(Boolean)
            || !!envelope.modelVersion
            || !!envelope.marketMetrics
            || !!envelope.marketAnalysis
            || !!envelope.modelMix
            || !!envelope.snapshots
            || !!envelope.userDescription;

        // Always return JSON envelope for cloud writes; CHECK in D1 requires json_valid(description). #for-portfolio-d1-json-invariants
        if (!hasMeta) {
            return JSON.stringify({ userDescription: description, __appPortfolioMeta: 1 });
        }

        return JSON.stringify(envelope);
    }

    function parseCloudflareDescriptionEnvelope(description) {
        if (typeof description !== 'string' || !description.trim()) {
            return { userDescription: null, meta: null };
        }

        try {
            const parsed = JSON.parse(description);
            if (parsed && parsed.__appPortfolioMeta === 1) {
                return {
                    userDescription: typeof parsed.userDescription === 'string' ? parsed.userDescription : null,
                    meta: parsed
                };
            }
        } catch (_) {
            // Not a JSON envelope, keep plain string description.
        }

        return { userDescription: description, meta: null };
    }

    function mapCoinLikeToCloudflareAsset(asset, index, fallbackModelId) {
        const safeAsset = asset || {};
        const keyMetric = normalizeKeyMetric(
            safeAsset.keyMetric
            || { field: safeAsset.keyMetricField || null, label: safeAsset.keyBuyer || null }
        );

        return {
            coinId: safeAsset.coinId || safeAsset.id || `${safeAsset.ticker || safeAsset.symbol || 'coin'}-${index}`,
            ticker: (safeAsset.ticker || safeAsset.symbol || '').toUpperCase(),
            name: safeAsset.name || '',
            weight: Number.isFinite(Number(safeAsset.weight))
                ? Number(safeAsset.weight)
                : (Number.isFinite(Number(safeAsset.portfolioPercent)) ? Number(safeAsset.portfolioPercent) : 0),
            side: safeAsset.side || (((safeAsset.agr ?? safeAsset.metrics?.agr ?? 0) >= 0) ? 'long' : 'short'),
            delegatedBy: {
                modelId: safeAsset.delegatedBy?.modelId || fallbackModelId || null,
                modelName: safeAsset.delegatedBy?.modelName || ''
            },
            agr: Number(safeAsset.agr ?? safeAsset.metrics?.agr ?? 0) || 0,
            currentPrice: safeAsset.currentPrice ?? safeAsset.price ?? safeAsset.current_price ?? 0,
            pvs: safeAsset.pvs || null,
            metrics: safeAsset.metrics ? { ...safeAsset.metrics } : null,
            isLocked: !!safeAsset.isLocked,
            isDisabledInRebalance: !!safeAsset.isDisabledInRebalance,
            keyMetric,
            keyBuyer: keyMetric?.label || null
        };
    }

    function toCloudflarePayload(draft) {
        const safeDraft = draft || {};
        const fallbackModelId = safeDraft?.settings?.modelId || safeDraft?.metadata?.modelId || null;
        const assetSource = Array.isArray(safeDraft.assets)
            ? safeDraft.assets
            : (Array.isArray(safeDraft.coins) ? safeDraft.coins : []);
        return {
            name: safeDraft.name || 'New Portfolio',
            description: buildCloudflareDescriptionEnvelope(safeDraft),
            assets: assetSource.map((asset, index) => mapCoinLikeToCloudflareAsset(asset, index, fallbackModelId))
        };
    }

    /**
     * Convert Cloudflare D1 portfolio record to local draft-like structure.
     * Input shape: { id, name, description, assets, created_at, updated_at, ... }.
     */
    function fromCloudflareRecord(record) {
        if (!record || typeof record !== 'object') return null;

        const { userDescription, meta } = parseCloudflareDescriptionEnvelope(record.description);
        const assets = Array.isArray(record.assets) ? record.assets : [];
        const createdAt = record.created_at || record.updated_at || new Date().toISOString();
        let localId = typeof meta?.portfolioId === 'string' && meta.portfolioId.trim()
            ? meta.portfolioId.trim()
            : null;
        try {
            if (!localId && window.portfolioConfig && typeof window.portfolioConfig.generatePortfolioId === 'function') {
                localId = window.portfolioConfig.generatePortfolioId(new Date(createdAt));
            }
        } catch (_) {
            // Fallback handled below.
        }
        if (!localId) {
            localId = String(record.id ?? createdAt);
        }

        const coins = assets.map((asset, index) => ({
            coinId: asset.coinId || asset.coin_id || `${asset.ticker || 'coin'}-${index}`,
            ticker: (asset.ticker || '').toUpperCase(),
            name: asset.name || '',
            currentPrice: asset.currentPrice ?? asset.price ?? 0,
            pvs: asset.pvs || null,
            metrics: asset.metrics && typeof asset.metrics === 'object'
                ? { ...asset.metrics, agr: asset.agr ?? asset.metrics.agr ?? 0 }
                : { agr: asset.agr ?? 0 },
            portfolioPercent: Number.isFinite(Number(asset.weight)) ? Number(asset.weight) : 0,
            isLocked: !!asset.isLocked,
            isDisabledInRebalance: !!asset.isDisabledInRebalance,
            delegatedBy: {
                modelId: asset.delegatedBy?.modelId || null,
                modelName: asset.delegatedBy?.modelName || ''
            },
            keyMetric: normalizeKeyMetric(asset.keyMetric || { field: asset.keyMetricField || null, label: asset.keyBuyer || null })
        }));

        return {
            id: localId,
            name: record.name || 'New Portfolio',
            archived: !!record.archived,
            description: userDescription,
            coins,
            createdAt,
            updatedAt: record.updated_at || createdAt,
            schemaVersion: Number(meta?.schemaVersion) || 2,
            marketMetrics: meta?.marketMetrics || record.marketMetrics || {},
            marketAnalysis: meta?.marketAnalysis || null,
            settings: {
                mode: meta?.settings?.mode || 'equal',
                balanceMode: meta?.settings?.balanceMode || null,
                modelId: meta?.settings?.modelId || null,
                horizonDays: meta?.settings?.horizonDays || null,
                mdnHours: meta?.settings?.mdnHours || null,
                agrMethod: meta?.settings?.agrMethod || null
            },
            modelVersion: meta?.modelVersion || null,
            modelMix: meta?.modelMix || {},
            snapshots: meta?.snapshots
                ? {
                    snapshotId: meta.snapshots.snapshotId || null,
                    market: meta.snapshots.market || null
                }
                : null
        };
    }

    function toPostgresPayload(draft, context) {
        const safeDraft = draft || {};
        const safeContext = context || {};
        const assets = Array.isArray(safeDraft.assets) ? safeDraft.assets : [];
        const snapshotId = safeContext.snapshotId || (window.portfolioConfig?.generateSnapshotId?.() || `${Date.now()}`);
        const portfolioId = safeDraft.id || safeContext.portfolioId || (window.portfolioConfig?.generatePortfolioId?.() || `${Date.now()}`);
        const createdAt = new Date().toISOString();

        const portfolio = {
            id: portfolioId,
            name: safeDraft.name || 'New Portfolio',
            model_version_id: safeDraft.metadata?.modelId || safeContext.modelId || null,
            settings: {
                horizonDays: safeDraft.metadata?.horizonDays || null,
                mdnHours: safeDraft.metadata?.mdnHours || null,
                agrMethod: safeDraft.metadata?.agrMethod || null,
                mode: safeDraft.mode || 'equal'
            },
            model_mix_json: safeContext.modelMix || null
        };

        const snapshotsBatch = {
            portfolio_id: portfolioId,
            market: {
                id: snapshotId,
                fgi: safeContext.marketMetrics?.fgi ?? null,
                btc_dom: safeContext.marketMetrics?.btcDominance ?? null,
                oi: safeContext.marketMetrics?.oi ?? null,
                fr: safeContext.marketMetrics?.fr ?? null,
                lsr: safeContext.marketMetrics?.lsr ?? null,
                vix: safeContext.marketMetrics?.vix ?? null,
                vix_available: !!safeContext.marketMetrics?.vix
            },
            assets: assets.map((asset, index) => ({
                id: `${snapshotId}-AS-${index}`,
                coin_id: asset.coinId,
                ticker: asset.ticker,
                name: safeContext.assetMetaById?.[asset.coinId]?.name || '',
                price: safeContext.assetMetaById?.[asset.coinId]?.price || 0,
                market_cap: safeContext.assetMetaById?.[asset.coinId]?.marketCap || 0,
                volume_24h: safeContext.assetMetaById?.[asset.coinId]?.volume24h || 0,
                pv_1h: safeContext.assetMetaById?.[asset.coinId]?.pvs?.[0] || null,
                pv_24h: safeContext.assetMetaById?.[asset.coinId]?.pvs?.[1] || null,
                pv_7d: safeContext.assetMetaById?.[asset.coinId]?.pvs?.[2] || null,
                pv_14d: safeContext.assetMetaById?.[asset.coinId]?.pvs?.[3] || null,
                pv_30d: safeContext.assetMetaById?.[asset.coinId]?.pvs?.[4] || null,
                pv_200d: safeContext.assetMetaById?.[asset.coinId]?.pvs?.[5] || null,
                extra_json: {
                    provider: safeContext.assetMetaById?.[asset.coinId]?.provider || null,
                    market_cap_rank: safeContext.assetMetaById?.[asset.coinId]?.rank ?? null,
                    isLocked: !!asset.isLocked,
                    isDisabledInRebalance: !!asset.isDisabledInRebalance,
                    keyMetric: normalizeKeyMetric(asset.keyMetric || { field: asset.keyMetricField || null, label: asset.keyBuyer || null }),
                    keyBuyer: normalizeKeyMetric(asset.keyMetric || { field: asset.keyMetricField || null, label: asset.keyBuyer || null })?.label || null
                },
                weight: asset.weight
            })),
            metrics: assets.map((asset, index) => ({
                id: `${snapshotId}-MET-${index}`,
                coin_id: asset.coinId,
                model_version_id: asset.delegatedBy?.modelId || safeDraft.metadata?.modelId || null,
                agr_final: asset.agr ?? null,
                key_buyer: normalizeKeyMetric(asset.keyMetric || { field: asset.keyMetricField || null, label: asset.keyBuyer || null })?.label || null,
                key_metric_field: normalizeKeyMetric(asset.keyMetric || { field: asset.keyMetricField || null, label: asset.keyBuyer || null })?.field || null,
                agr_method_used: safeDraft.metadata?.agrMethod || null,
                created_at: createdAt
            }))
        };

        return { portfolio, snapshotsBatch };
    }

    window.portfolioAdapters = {
        toCloudflarePayload,
        toPostgresPayload,
        fromCloudflareRecord
    };
})();
