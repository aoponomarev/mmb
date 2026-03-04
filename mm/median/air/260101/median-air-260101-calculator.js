/**
 * #JS-MW4CKfHg
 * @description Median/AIR/260101 calculator; AGR clamped, empty PV guarded, CGR slope div-by-zero guarded.
 * @skill id:sk-c3d639
 *
 * REFERENCES: docs/A_MATH_MODELS.md
 */

(function() {
    'use strict';

    // Depends: mm/base-model-calculator.js

    class MedianAir260101Calculator extends window.BaseModelCalculator {
        constructor() {
            super('Median/AIR/260101', 'Медиана (A.I.R.) 26.01.01');

            // Model constants
            this.CPT_BASE_WEIGHTS = [0.38, 0.32, 0.18, 0.08, 0.03, 0.01];
            this.CGR_BETAS = [1.00, 0.80, 0.40, 0.20, 0.10];
            this.MODEL_PARAMS = this.resolveModelParams(this.id, {
                agrLimit: 100,
                normalizationWeight: 0,
                weights: {
                    A: 0.35,
                    I: 0.45,
                    IA: 0.20,
                    I_CGR: 0.60,
                    I_CPT: 0.40,
                    riskRegimeStrength: 0.20
                },
                lambda: {
                    min: 0,
                    max: 0,
                    fgiBoost: 0,
                    vixBoost: 0
                }
            });
        }

        /**
         * Main calc method
         */
        calculateMetrics(coins, params = {}) {
            if (!Array.isArray(coins) || coins.length === 0) return { coins: [], marketData: {} };

            const hDays = params.horizonDays || 2;
            const indicators = params.marketIndicators || {};
            const agrMethod = params.agrMethod || 'mp';

            // 1. Pre-calc
            const prcWeights = this.calculatePrcWeights(hDays);
            const marketMedians = this.calculateMarketMedians(coins);
            const cmd = this.calculateCMD(marketMedians, prcWeights, hDays);
            const marketFactor = this.calculateMarketFactor(indicators);

            // 2. Find BTC for correlation
            const btcCoin = coins.find(c => c.ticker?.toLowerCase() === 'btc');
            const btcPvs = btcCoin ? (btcCoin.pvs || [btcCoin.PV1h, btcCoin.PV24h, btcCoin.PV7d, btcCoin.PV14d, btcCoin.PV30d, btcCoin.PV200d]) : null;

            // 3. First pass: Base metrics
            const enrichedCoins = coins.map(coin => {
                const metrics = coin.metrics || {};
                const pvs = coin.pvs || [coin.PV1h, coin.PV24h, coin.PV7d, coin.PV14d, coin.PV30d, coin.PV200d];

                metrics.cdWeighted = this.calculateCD(pvs, prcWeights);
                metrics.cdh = this.interpolateValue(metrics.cdWeighted, hDays);
                metrics.cpt = this.calculateCPT(pvs, hDays);

                const cgrData = this.calculateCGR(pvs);
                metrics.cgr = cgrData.slope;
                metrics.cgrDeg = cgrData.degrees;
                metrics.cgrValues = cgrData.slopes;

                // MAX/min PV (guard against empty array → -Infinity/Infinity)
                const validPvs = pvs.filter(v => v !== null && v !== undefined && Number.isFinite(Number(v)));
                metrics.maxPV = validPvs.length > 0 ? Math.max(...validPvs) : 0;
                metrics.minPV = validPvs.length > 0 ? Math.min(...validPvs) : 0;

                // BTC Correlation
                let adaptedMarketFactor = marketFactor;
                if (btcPvs && coin !== btcCoin) {
                    metrics.btcCorrelation = this.calculateSimpleCorrelation(pvs, btcPvs);
                    const correlationWeight = this.clamp(metrics.btcCorrelation, 0.3, 1.0);
                    adaptedMarketFactor = 1 + (marketFactor - 1) * correlationWeight;
                } else {
                    metrics.btcCorrelation = (coin === btcCoin) ? 1.0 : null;
                    adaptedMarketFactor = marketFactor;
                }

                metrics.din = this.calculateDIN(pvs, prcWeights, adaptedMarketFactor, metrics.cpt);

                // Stability
                metrics.dcs = this.calculateDirectionalConsistency(pvs, metrics.cdWeighted);
                metrics.tsi = this.calculateTrendStrengthIndex(pvs);
                metrics.mp = this.calculateMomentumPersistence(pvs, metrics.cdWeighted, metrics.cgr);

                return { ...coin, metrics };
            });

            // 4. Second pass: Final AGR
            const dins = enrichedCoins.map(c => Math.abs(c.metrics.din || 0));
            const medianDINValue = this.median(dins) || 0.01;

            const finalCoins = enrichedCoins.map(coin => {
                const m = coin.metrics;
                const A = this.tanh((m.cdh - (cmd.cdh || 0)) / 8);
                const CGRn = (m.cgr || 0) / 45;
                const CPTn = (m.cpt || 0) / 25;
                const I = this.tanh(this.MODEL_PARAMS.weights.I_CGR * CGRn + this.MODEL_PARAMS.weights.I_CPT * CPTn);
                const R = 1 / (1 + Math.abs(m.din || 0) / medianDINValue);

                let agrRaw = R * (this.MODEL_PARAMS.weights.I * I + this.MODEL_PARAMS.weights.A * A + this.MODEL_PARAMS.weights.IA * (I * A));

                let persistence = 0.5;
                if (agrMethod === 'dcs') persistence = m.dcs;
                else if (agrMethod === 'tsi') persistence = m.tsi;
                else if (agrMethod === 'mp') persistence = m.mp;

                const persistenceMultiplier = 0.9 + 0.2 * (persistence || 0);
                const agrUnbounded = agrRaw * persistenceMultiplier * this.MODEL_PARAMS.agrLimit;
                m.agr = this.clamp(agrUnbounded, -this.MODEL_PARAMS.agrLimit, this.MODEL_PARAMS.agrLimit);

                return coin;
            });

            return {
                coins: finalCoins,
                marketData: {
                    cmd,
                    medianDIN: medianDINValue
                }
            };
        }

        // --- Median model specific methods (moved from CoinMetricsCalculator) ---

        calculateCPT(pvs, hDays) {
            const g = 1 / (1 + Math.log10(hDays + 1));
            let totalWeight = 0;
            let sum = 0;
            pvs.forEach((pv, i) => {
                const baseW = this.CPT_BASE_WEIGHTS[i] || 0;
                const w = baseW * Math.pow(g, i);
                sum += (pv || 0) * w;
                totalWeight += w;
            });
            return totalWeight > 0 ? sum / totalWeight : 0;
        }

        calculateCGR(pvs) {
            const pv1h = pvs[0] || 0;
            const slopes = [];
            const degrees = [];
            for (let i = 1; i < pvs.length; i++) {
                const dt = this.TIME_FRAMES_DAYS[i] - this.TIME_FRAMES_DAYS[0];
                const dpv = pv1h - (pvs[i] || 0);
                const slope = dt !== 0 ? dpv / dt : 0;
                slopes.push(slope);
                degrees.push(Math.atan(slope) * (180 / Math.PI));
            }
            let totalSlope = 0;
            let totalWeight = 0;
            slopes.forEach((s, i) => {
                const w = this.CGR_BETAS[i] || 0;
                totalSlope += s * w;
                totalWeight += w;
            });
            return {
                slope: totalWeight > 0 ? totalSlope / totalWeight : 0,
                slopes: slopes,
                degrees: degrees
            };
        }

        calculateDIN(pvs, prcWeights, marketFactor, cpt) {
            let weightedPV = 0;
            let totalWeight = 0;
            pvs.forEach((pv, i) => {
                const w = prcWeights[i];
                weightedPV += (pv || 0) * w;
                totalWeight += w;
            });
            weightedPV = totalWeight > 0 ? weightedPV / totalWeight : 0;
            const cptMod = 1 + 0.25 * this.tanh(cpt / 25);
            return weightedPV * marketFactor * cptMod;
        }

        calculateMarketFactor(indicators) {
            const fgiMod = this.clamp(((indicators.fgi || 50) - 50) / 50, -1, 1);
            const btcMod = this.clamp(((indicators.btcDom || 50) - 50) / 50, -1, 1);
            const composite = 0.35 * fgiMod + 0.20 * btcMod + 0.15 * this.tanh((indicators.oi || 0) / 1e9) + 0.15 * this.clamp((indicators.fr || 0) / 0.05, -1, 1) + 0.15 * this.tanh(((indicators.lsr || 1) - 1) / 2);
            return 1 + 0.5 * this.tanh(composite);
        }

        calculateSimpleCorrelation(arr1, arr2) {
            if (!arr1 || !arr2 || arr1.length !== arr2.length || arr1.length === 0) return 0.5;
            let sameDirection = 0;
            for (let i = 0; i < arr1.length; i++) {
                if (Math.sign(arr1[i]) === Math.sign(arr2[i])) sameDirection++;
            }
            return sameDirection / arr1.length;
        }

        calculateMarketMedians(coins) {
            const medians = [];
            for (let i = 0; i < this.TIME_FRAMES_DAYS.length; i++) {
                const vals = coins.map(c => (c.pvs || [c.PV1h, c.PV24h, c.PV7d, c.PV14d, c.PV30d, c.PV200d])[i] || 0);
                medians.push(this.median(vals));
            }
            return medians;
        }

        calculateCMD(marketMedians, prcWeights, hDays) {
            const cdWeighted = this.calculateCD(marketMedians, prcWeights);
            const cdh = this.interpolateValue(cdWeighted, hDays);
            return { cdh, cdWeighted };
        }

        // Stability Methods (B.11)
        calculateDirectionalConsistency(pvs, cdValues) {
            if (!pvs || pvs.length === 0) return 0;

            // 1. Sign consistency (how many PV same direction)
            const signs = pvs.map(pv => Math.sign(this.safeNumber(pv, 0)));
            const positiveCount = signs.filter(s => s > 0).length;
            const negativeCount = signs.filter(s => s < 0).length;
            const maxSameSign = Math.max(positiveCount, negativeCount);
            const consistencyRatio = maxSameSign / pvs.length;

            // 2. Movement strength (avg PV magnitude) - adds uniqueness
            const avgMagnitude = pvs.reduce((sum, pv) => sum + Math.abs(this.safeNumber(pv, 0)), 0) / pvs.length;
            const normalizedMagnitude = Math.min(avgMagnitude / 20, 1); // normalize to 20%

            // 3. CD monotonicity (how monotonic cumulative delta)
            const cds = cdValues || [];
            const isMonotonic = cds.every((cd, i) => i === 0 || Math.sign(cd) === Math.sign(cds[0]) || cd === 0);
            const monotonicity = isMonotonic ? 1 : 0.5;

            // Combined metric (40% signs, 30% amplitude, 30% monotonicity)
            const persistence = consistencyRatio * 0.4 + normalizedMagnitude * 0.3 + monotonicity * 0.3;
            return this.clamp(persistence, 0, 1);
        }

        calculateTrendStrengthIndex(pvs) {
            if (!pvs || pvs.length < 6) return 0.5;

            // 1. Short-term impulse (1h, 24h, 7d)
            const shortTermAvg = pvs.slice(0, 3).reduce((a, b) => a + (b || 0), 0) / 3;

            // 2. Long-term trend (30d, 14d, 200d - by nodes)
            const longTermAvg = pvs.slice(3).reduce((a, b) => a + (b || 0), 0) / 3;

            // 3. Direction alignment
            const shortSign = Math.sign(shortTermAvg);
            const longSign = Math.sign(longTermAvg);
            const alignment = (shortSign === longSign && shortSign !== 0) ? 1 : 0.5;

            // 4. Short-to-long strength ratio (uniqueness)
            const ratio = longTermAvg !== 0 ? Math.abs(shortTermAvg) / Math.abs(longTermAvg) : 1;
            const strengthRatio = Math.min(ratio, 2) / 2; // normalize to [0, 1]

            return this.clamp(alignment * 0.6 + strengthRatio * 0.4, 0, 1);
        }

        calculateMomentumPersistence(pvs, cdValues, cgrSlope) {
            if (!pvs || pvs.length === 0) return 0;

            // 1. Directional Alignment
            const signs = pvs.map(pv => Math.sign(pv || 0));
            const positiveCount = signs.filter(s => s > 0).length;
            const negativeCount = signs.filter(s => s < 0).length;
            const dominantSign = positiveCount >= negativeCount ? 1 : -1;
            const alignmentScore = signs.filter(s => s === dominantSign || s === 0).length / pvs.length;

            // 2. Magnitude Stability (via std dev) - adds high uniqueness
            const magnitudes = pvs.map(pv => Math.abs(this.safeNumber(pv, 0)));
            const avgMagnitude = magnitudes.reduce((sum, m) => sum + m, 0) / magnitudes.length;
            const stdDev = this.calculateStdDev(magnitudes);
            const magnitudeStability = avgMagnitude > 0 ? Math.min(avgMagnitude / (stdDev + 1), 1) : 0;

            // 3. CGR Alignment
            const cgrAlignment = (Math.sign(cgrSlope || 0) === dominantSign) ? 1 : 0.5;

            // 4. Combined stability
            const persistence = alignmentScore * 0.4 + magnitudeStability * 0.3 + cgrAlignment * 0.3;
            return this.clamp(persistence, 0, 1);
        }

        /**
         * MDN (Market Direction Now) - market direction forecast (B.10)
         */
        calculateMDN(hours, coins, indicators) {
            if (!Array.isArray(coins) || coins.length === 0) return 0;

            const hoursClamped = this.clamp(hours || 4, 4, 12);
            const momentumWindowDays = (hoursClamped * 0.5) / 24;
            const trendWindowDays = (hoursClamped * 1.5) / 24;

            // Momentum component
            const momentumSeg = this.calculateSegmentedMedians(coins, c => {
                const pvs = c.pvs || [c.PV1h, c.PV24h, c.PV7d, c.PV14d, c.PV30d, c.PV200d];
                const cd = this.calculateCD(pvs);
                return this.interpolateValue(cd, momentumWindowDays);
            });
            const momentumThreshold = 10 * (1 + hoursClamped / 24);
            const momentumMedian = this.tanh(momentumSeg.medianP / momentumThreshold) - this.tanh(Math.abs(momentumSeg.medianN) / momentumThreshold);
            const momentumBreadth = this.tanh((momentumSeg.bullishPercent - 0.5) * 4);
            const momentumComponent = 0.45 * momentumMedian + 0.35 * momentumBreadth;

            // Trend component
            const trendSeg = this.calculateSegmentedMedians(coins, c => {
                const pvs = c.pvs || [c.PV1h, c.PV24h, c.PV7d, c.PV14d, c.PV30d, c.PV200d];
                const cd = this.calculateCD(pvs);
                return this.interpolateValue(cd, trendWindowDays);
            });
            const trendThreshold = 20 * (1 + hoursClamped / 48);
            const trendMedian = this.tanh(trendSeg.medianP / trendThreshold) - this.tanh(Math.abs(trendSeg.medianN) / trendThreshold);
            const trendBreadth = this.tanh((trendSeg.bullishPercent - 0.5) * 4);
            const trendComponent = 0.40 * trendMedian + 0.35 * trendBreadth;

            // Acceleration via CGR slope
            const cgrSeg = this.calculateSegmentedMedians(coins, c => {
                const pvs = c.pvs || [c.PV1h, c.PV24h, c.PV7d, c.PV14d, c.PV30d, c.PV200d];
                return this.calculateCGR(pvs).slope;
            });
            const cgrMedian = this.tanh(cgrSeg.medianP / 5) - this.tanh(Math.abs(cgrSeg.medianN) / 5);
            const cgrBreadth = this.tanh((cgrSeg.bullishPercent - 0.5) * 4);
            const accelComponent = 0.40 * cgrMedian + 0.35 * cgrBreadth;

            // Market indicators mix
            const fgiMod = this.clamp(((indicators.fgi || 50) - 50) / 50, -1, 1);
            const frMod = this.clamp((indicators.fr || 0) / 0.05, -1, 1);
            const lsrMod = this.tanh(((indicators.lsr || 1) - 1) / 2);
            const marketComponent = 0.40 * fgiMod + 0.30 * frMod + 0.30 * lsrMod;

            const mdnRaw = 0.35 * momentumComponent + 0.25 * trendComponent + 0.20 * accelComponent + 0.20 * marketComponent;
            return Math.round(this.clamp(mdnRaw, -1, 1) * 100);
        }

        /**
         * Recommended AGR method (heuristic, no impact on calc)
         */
        getRecommendedAgrMethod(params = {}) {
            const indicators = params.marketIndicators || {};
            const mdnHours = params.mdnHours || 4;
            const fgi = Number.isFinite(indicators.fgi) ? indicators.fgi : null;
            const vix = Number.isFinite(indicators.vix) ? indicators.vix : null;

            if ((fgi !== null && fgi < 35) || (vix !== null && vix > 25)) {
                return 'dcs';
            }
            if (mdnHours >= 8) {
                return 'tsi';
            }
            return 'mp';
        }
    }

    // Register in global scope
    window.MedianAir260101Calculator = new MedianAir260101Calculator();
})();
