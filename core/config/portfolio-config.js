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
 * - Doc: docs/A_PORTFOLIO_SYSTEM.md
 * - Metrics documentation: id:sk-c3d639
 * - Portfolio architecture: id:sk-483943 (section "Portfolio system")
 * - Hardening: legacy donor recipe-portfolio-engine-mvp-hardening (docs/ais/ais-portfolio-controls.md#LIR-005.A1)
 *
 * NOTE: Compatibility facade over #JS-rrLtero9 (portfolio-engine.js); new code should call window.portfolioEngine.* directly when possible.
 */

(function() {
    'use strict';

    /**
     * Creates empty coin structure for portfolio
     * @param {Object} coin - Source coin data with metrics
     * @param {string} modelId - ID of model that delegated the coin
     * @param {number} weight - Share in portfolio (0-100)
     * @returns {Object} Coin structure in portfolio
     */
    function createPortfolioCoin(coin, modelId, weight = 0) {
        const model = window.modelsConfig ? window.modelsConfig.getModel(modelId) : null;
        const modelMeta = window.modelsConfig ? window.modelsConfig.getModelMeta?.(modelId) : null;
        const modelName = modelMeta?.versionName || model?.name || 'Unknown';

        return {
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
                modelId: modelId,
                modelName,
                agrAtDelegation: coin.metrics?.agr || 0,
                timestamp: new Date().toISOString()
            }
        };
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
        return {
            id: id || generatePortfolioId(),
            name: name || 'New Portfolio',
            createdAt: nowIso,
            updatedAt: nowIso,
            schemaVersion: 1,
            coins: coins,
            snapshots: buildSnapshots(snapshotId, coins, marketMetrics, settings || {}, (settings && settings.modelId) || defaultModelId),
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
            pvs: coin.pvs || [coin.PV1h, coin.PV24h, coin.PV7d, coin.PV14d, coin.PV30d, coin.PV200d]
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

    const STORAGE_KEY = 'app-portfolios';

    function normalizePortfolio(portfolio) {
        if (!portfolio || typeof portfolio !== 'object') return portfolio;
        const defaultParams = window.modelsConfig?.getDefaultParams?.() || {};
        const defaultHorizon = Number(defaultParams.horizonDays);
        const defaultMdn = Number(defaultParams.mdnHours);
        const defaultAgr = typeof defaultParams.agrMethod === 'string' ? defaultParams.agrMethod : 'mp';
        const modelId = portfolio?.settings?.modelId
            || window.modelsConfig?.getDefaultModelId?.()
            || 'Median/AIR/260101';
        const meta = window.modelsConfig?.getModelMeta?.(modelId) || null;
        const modelName = meta?.versionName
            || window.modelsConfig?.getModel?.(modelId)?.name
            || 'Unknown';

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
        if (!portfolio.schemaVersion) {
            portfolio.schemaVersion = 1;
        }
        if (!portfolio.updatedAt) {
            portfolio.updatedAt = portfolio.createdAt || new Date().toISOString();
        }
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

        if (!portfolio.snapshots || !portfolio.snapshots.snapshotId) {
            const snapshotId = portfolio.snapshots?.snapshotId
                || generateSnapshotId(new Date(portfolio.createdAt || Date.now()));
            portfolio.snapshots = buildSnapshots(
                snapshotId,
                portfolio.coins || [],
                portfolio.marketMetrics || {},
                portfolio.settings || {},
                modelId
            );
        }
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
        if (Array.isArray(portfolio.snapshots.metrics)) {
            portfolio.snapshots.metrics.forEach(metric => {
                if (!metric.modelId) {
                    metric.modelId = modelId;
                }
                if (!metric.agrMethodUsed) {
                    metric.agrMethodUsed = portfolio.settings?.agrMethod ?? null;
                }
            });
        }

        return portfolio;
    }

    window.portfolioConfig = {
        createPortfolioCoin,
        createPortfolio,
        generatePortfolioId,
        generateSnapshotId,

        /**
         * Gets portfolio list from local storage (D.5)
         */
        getLocalPortfolios() {
            try {
                const data = localStorage.getItem(STORAGE_KEY);
                const parsed = data ? JSON.parse(data) : [];
                if (!Array.isArray(parsed)) return [];
                return parsed.map(normalizePortfolio);
            } catch (e) {
                console.error('portfolio-config: localStorage read error', e);
                return [];
            }
        },

        /**
         * Save portfolios list to local storage (D.5)
         */
        saveLocalPortfolios(portfolios) {
            try {
                const normalized = Array.isArray(portfolios)
                    ? portfolios.map(normalizePortfolio)
                    : portfolios;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
                return true;
            } catch (e) {
                console.error('portfolio-config: localStorage write error', e);
                return false;
            }
        },
        /**
         * Export portfolios to JSON (stage 4)
         * @param {string} mode - 'light' (portfolios only) | 'full' (portfolios + snapshots)
         */
        exportPortfolios(mode = 'light') {
            const portfolios = this.getLocalPortfolios();
            const exportData = {
                schemaVersion: 1,
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
            const mode = options.mode || 'merge'; // merge | replace
            const incoming = payload?.portfolios;
            if (!Array.isArray(incoming)) {
                return false;
            }
            const normalized = incoming.map(normalizePortfolio);
            if (mode === 'replace') {
                return this.saveLocalPortfolios(normalized);
            }
            const existing = this.getLocalPortfolios();
            const byId = new Map(existing.map(p => [p.id, p]));
            normalized.forEach(p => byId.set(p.id, p));
            return this.saveLocalPortfolios(Array.from(byId.values()));
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
