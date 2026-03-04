/**
 * #JS-fJ68ZfEu
 * @description Provider payload adapters: toCloudflarePayload, toPostgresPayload (canonical draft → API shape).
 * @skill id:sk-02d3ea
 * @skill id:sk-bb7c8e
 *
 * REFERENCES:
 * - docs/A_PORTFOLIO_SYSTEM.md
 */
(function() {
    'use strict';

    function toCloudflarePayload(draft) {
        const safeDraft = draft || {};
        const assets = Array.isArray(safeDraft.assets) ? safeDraft.assets : [];
        return {
            name: safeDraft.name || 'New Portfolio',
            description: safeDraft.description || null,
            assets: assets.map(asset => ({
                coinId: asset.coinId,
                ticker: asset.ticker,
                weight: asset.weight,
                side: asset.side || ((asset.agr || 0) >= 0 ? 'long' : 'short'),
                delegatedBy: {
                    modelId: asset.delegatedBy?.modelId || safeDraft.metadata?.modelId || 'unknown',
                    modelName: asset.delegatedBy?.modelName || ''
                },
                agr: asset.agr
            }))
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
                    market_cap_rank: safeContext.assetMetaById?.[asset.coinId]?.rank ?? null
                },
                weight: asset.weight
            })),
            metrics: assets.map((asset, index) => ({
                id: `${snapshotId}-MET-${index}`,
                coin_id: asset.coinId,
                model_version_id: asset.delegatedBy?.modelId || safeDraft.metadata?.modelId || null,
                agr_final: asset.agr ?? null,
                agr_method_used: safeDraft.metadata?.agrMethod || null,
                created_at: createdAt
            }))
        };

        return { portfolio, snapshotsBatch };
    }

    window.portfolioAdapters = {
        toCloudflarePayload,
        toPostgresPayload
    };
})();
