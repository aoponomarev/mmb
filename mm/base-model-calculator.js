/**
 * ================================================================================================
 * BASE MODEL CALCULATOR - Base class for math models
 * ================================================================================================
 * Skill: id:sk-c3d639
 *
 * PURPOSE: Provide abstract interface for all math models in app.
 * Each model (Median, Momentum, etc.) must extend this class.
 *
 * PRINCIPLES:
 * - Modularity: Each model is independent.
 * - Unified interface: app-ui-root works with models via common methods.
 * - Encapsulation: Calc logic hidden inside model.
 */

(function() {
    'use strict';

    class BaseModelCalculator {
        /**
         * @param {string} id - Unique model id (e.g. 'Median/AIR/260101')
         * @param {string} name - Display name
         */
        constructor(id, name) {
            this.id = id;
            this.name = name;

            // Time frames in days for PV from CoinGecko: [1h, 24h, 7d, 14d, 30d, 200d]
            this.TIME_FRAMES_DAYS = [1/24, 1, 7, 14, 30, 200];
            this.EPSILON = 0.2;
        }

        /**
         * Get model params from modelsConfig with fallback
         */
        resolveModelParams(modelId, fallback) {
            const safeFallback = fallback && typeof fallback === 'object' ? fallback : {};
            if (window.modelsConfig && typeof window.modelsConfig.getModelParams === 'function') {
                const params = window.modelsConfig.getModelParams(modelId);
                if (params && typeof params === 'object') {
                    return {
                        ...safeFallback,
                        ...params,
                        weights: { ...(safeFallback.weights || {}), ...(params.weights || {}) },
                        lambda: { ...(safeFallback.lambda || {}), ...(params.lambda || {}) }
                    };
                }
            }
            return safeFallback;
        }

        /**
         * Main metrics calc for coin list
         */
        calculateMetrics(coins, params) {
            throw new Error(`calculateMetrics not implemented in model "${this.name}"`);
        }

        // --- Common math utilities ---

        clamp(x, min, max) { return Math.max(min, Math.min(max, x)); }

        safeNumber(x, def = 0) { const n = Number(x); return Number.isFinite(n) ? n : def; }

        tanh(x) { return Math.tanh ? Math.tanh(x) : (Math.exp(x) - Math.exp(-x)) / (Math.exp(x) + Math.exp(-x)); }

        median(values) {
            if (!values || values.length === 0) return 0;
            const sorted = [...values].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        }

        calculateStdDev(values) {
            if (!values || values.length === 0) return 0;
            const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
            const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
            const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / values.length;
            return Math.sqrt(variance);
        }

        /**
         * PRC Weights: exp(-|t - hDays| / tau)
         */
        calculatePrcWeights(hDays) {
            const tau = 0.35 * Math.max(1, Math.min(90, hDays));
            const base = this.TIME_FRAMES_DAYS.map(t => Math.exp(-Math.abs(t - hDays) / tau) + 0.05);
            const sum = base.reduce((a, b) => a + b, 0);
            return base.map(w => w / sum);
        }

        /**
         * CD (Cumulative Delta): CD[i] = sum(PV[0..i] * weights[0..i])
         */
        calculateCD(pvs, weights = null) {
            let sum = 0;
            return pvs.map((pv, i) => {
                const val = pv || 0;
                const w = weights ? weights[i] : 1;
                sum += val * w;
                return sum;
            });
        }

        /**
         * Interpolate value to given horizon
         */
        interpolateValue(values, hDays) {
            let i1 = 0;
            for (let i = 0; i < this.TIME_FRAMES_DAYS.length; i++) {
                if (this.TIME_FRAMES_DAYS[i] <= hDays) i1 = i;
                else break;
            }
            const i2 = Math.min(i1 + 1, this.TIME_FRAMES_DAYS.length - 1);

            if (i1 === i2) return values[i1];

            const t1 = this.TIME_FRAMES_DAYS[i1];
            const t2 = this.TIME_FRAMES_DAYS[i2];
            const v1 = values[i1];
            const v2 = values[i2];

            return v1 + (v2 - v1) * (hDays - t1) / (t2 - t1);
        }

        /**
         * Segmented medians (B.12)
         */
        calculateSegmentedMedians(items, getValue) {
            const values = items
                .map(getValue)
                .filter(v => Number.isFinite(v) && Math.abs(v) > this.EPSILON);

            const pos = values.filter(v => v > 0);
            const neg = values.filter(v => v < 0);

            const countP = pos.length;
            const countN = neg.length;
            const totalCount = values.length;

            const medianP = pos.length > 0 ? this.median(pos) : 0;
            const medianN = neg.length > 0 ? this.median(neg) : 0;

            let ratio = null;
            if (medianN !== 0) ratio = (medianP / Math.abs(medianN)).toFixed(4);
            else if (medianP > 0) ratio = '∞';
            else if (medianN !== 0) ratio = '—';

            let adRatio = null;
            if (countN > 0) adRatio = (countP / countN).toFixed(4);
            else if (countP > 0) adRatio = '∞';
            else adRatio = '—';

            const bullishPercent = totalCount > 0 ? countP / totalCount : 0.5;

            return {
                medianP, medianN, ratio, countP, countN, totalCount, adRatio, bullishPercent
            };
        }
    }

    // Export to global scope
    window.BaseModelCalculator = BaseModelCalculator;
})();
