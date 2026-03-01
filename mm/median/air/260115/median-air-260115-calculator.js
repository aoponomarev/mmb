/**
 * ================================================================================================
 * MEDIAN AIR 260115 CALCULATOR - Версия модели "Медиана" (A.I.R.) от 26.01.15
 * ================================================================================================
 * Skill: core/skills/domain-portfolio
 * Doc: docs/A_MATH_MODELS.md
 *
 * PURPOSE: Новая версия модели Median/AIR с Robust-нормализацией (median+MAD)
 *        и λ-смешиванием краткосрочного/долгосрочного AGR.
 * AGR_final = (1-λ)*AGR_long + λ*AGR_short
 * AGR_raw   = R*(w_I*I + w_A*A + w_IA*I*A)
 *
 * Отличия от 260101:
 * - normalizationWeight = 1 (robust normalization через median+MAD)
 * - Веса: A=0.40, I=0.40, IA=0.20, I_CGR=0.70, I_CPT=0.30
 * - Lambda: min=0.05, max=0.2, fgiBoost/vixBoost=0.05
 */

(function() {
    'use strict';

    class MedianAir260115Calculator extends window.BaseModelCalculator {
        constructor() {
            super('Median/AIR/260115', 'Медиана (A.I.R.) 26.01.15');

            this.CPT_BASE_WEIGHTS = [0.38, 0.32, 0.18, 0.08, 0.03, 0.01];
            this.CGR_BETAS = [1.00, 0.80, 0.40, 0.20, 0.10];
            this.MODEL_PARAMS = this.resolveModelParams(this.id, {
                agrLimit: 100,
                normalizationWeight: 1,
                weights: {
                    A: 0.40,
                    I: 0.40,
                    IA: 0.20,
                    I_CGR: 0.70,
                    I_CPT: 0.30,
                    riskRegimeStrength: 0.30
                },
                lambda: {
                    min: 0.05,
                    max: 0.2,
                    fgiBoost: 0.05,
                    vixBoost: 0.05
                }
            });
        }

        /**
         * Robust normalization: (x - median) / (MAD + ε)
         */
        robustNormalize(values) {
            if (!values || values.length === 0) return [];
            const med = this.median(values);
            const deviations = values.map(v => Math.abs(v - med));
            const mad = this.median(deviations) || 1;
            return values.map(v => (v - med) / (mad + 0.001));
        }

        /**
         * Вычислить динамический λ на основе рыночных индикаторов
         */
        calculateLambda(indicators) {
            const lp = this.MODEL_PARAMS.lambda;
            let lambda = lp.min;
            const fgi = indicators.fgi;
            const vix = indicators.vix;
            if (Number.isFinite(fgi) && fgi < 35) lambda += lp.fgiBoost;
            if (Number.isFinite(vix) && vix > 25) lambda += lp.vixBoost;
            return this.clamp(lambda, lp.min, lp.max);
        }

        calculateMetrics(coins, params = {}) {
            if (!Array.isArray(coins) || coins.length === 0) return { coins: [], marketData: {} };

            const hDays = params.horizonDays || 2;
            const indicators = params.marketIndicators || {};
            const agrMethod = params.agrMethod || 'mp';
            const nw = this.MODEL_PARAMS.normalizationWeight;
            const lambda = this.calculateLambda(indicators);

            const prcWeights = this.calculatePrcWeights(hDays);
            const marketMedians = this.calculateMarketMedians(coins);
            const cmd = this.calculateCMD(marketMedians, prcWeights, hDays);
            const marketFactor = this.calculateMarketFactor(indicators);

            const btcCoin = coins.find(c => c.ticker?.toLowerCase() === 'btc');
            const btcPvs = btcCoin ? (btcCoin.pvs || [btcCoin.PV1h, btcCoin.PV24h, btcCoin.PV7d, btcCoin.PV14d, btcCoin.PV30d, btcCoin.PV200d]) : null;

            // Pass 1: base metrics
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

                const validPvs = pvs.filter(v => v !== null && v !== undefined && Number.isFinite(Number(v)));
                metrics.maxPV = validPvs.length > 0 ? Math.max(...validPvs) : 0;
                metrics.minPV = validPvs.length > 0 ? Math.min(...validPvs) : 0;

                let adaptedMarketFactor = marketFactor;
                if (btcPvs && coin !== btcCoin) {
                    metrics.btcCorrelation = this.calculateSimpleCorrelation(pvs, btcPvs);
                    const correlationWeight = this.clamp(metrics.btcCorrelation, 0.3, 1.0);
                    adaptedMarketFactor = 1 + (marketFactor - 1) * correlationWeight;
                } else {
                    metrics.btcCorrelation = (coin === btcCoin) ? 1.0 : null;
                }

                metrics.din = this.calculateDIN(pvs, prcWeights, adaptedMarketFactor, metrics.cpt);

                metrics.dcs = this.calculateDirectionalConsistency(pvs, metrics.cdWeighted);
                metrics.tsi = this.calculateTrendStrengthIndex(pvs);
                metrics.mp = this.calculateMomentumPersistence(pvs, metrics.cdWeighted, metrics.cgr);

                return { ...coin, metrics };
            });

            // Robust normalization (active when normalizationWeight > 0)
            const rawCdhs = enrichedCoins.map(c => c.metrics.cdh);
            const rawCgrs = enrichedCoins.map(c => c.metrics.cgr);
            const rawCpts = enrichedCoins.map(c => c.metrics.cpt);
            const rawDins = enrichedCoins.map(c => Math.abs(c.metrics.din || 0));

            const normCdhs = nw > 0 ? this.robustNormalize(rawCdhs) : null;
            const normCgrs = nw > 0 ? this.robustNormalize(rawCgrs) : null;
            const normCpts = nw > 0 ? this.robustNormalize(rawCpts) : null;

            const dins = enrichedCoins.map(c => Math.abs(c.metrics.din || 0));
            const medianDINValue = this.median(dins) || 0.01;

            // Pass 2: final AGR with optional normalization and lambda blending
            const finalCoins = enrichedCoins.map((coin, idx) => {
                const m = coin.metrics;

                const cdhVal = nw > 0 ? nw * normCdhs[idx] + (1 - nw) * m.cdh : m.cdh;
                const cgrVal = nw > 0 ? nw * normCgrs[idx] + (1 - nw) * m.cgr : m.cgr;
                const cptVal = nw > 0 ? nw * normCpts[idx] + (1 - nw) * m.cpt : m.cpt;

                const A = this.tanh((cdhVal - (cmd.cdh || 0)) / 8);
                const CGRn = cgrVal / 45;
                const CPTn = cptVal / 25;
                const I = this.tanh(this.MODEL_PARAMS.weights.I_CGR * CGRn + this.MODEL_PARAMS.weights.I_CPT * CPTn);
                const R = 1 / (1 + Math.abs(m.din || 0) / medianDINValue);

                const agrRaw = R * (this.MODEL_PARAMS.weights.I * I + this.MODEL_PARAMS.weights.A * A + this.MODEL_PARAMS.weights.IA * (I * A));

                let persistence = 0.5;
                if (agrMethod === 'dcs') persistence = m.dcs;
                else if (agrMethod === 'tsi') persistence = m.tsi;
                else if (agrMethod === 'mp') persistence = m.mp;

                const persistenceMultiplier = 0.9 + 0.2 * (persistence || 0);
                const agrLong = agrRaw * persistenceMultiplier * this.MODEL_PARAMS.agrLimit;

                // Short-term AGR: uses raw (un-normalized) short-horizon data
                const shortA = this.tanh((m.cdh - (cmd.cdh || 0)) / 8);
                const shortI = this.tanh(this.MODEL_PARAMS.weights.I_CGR * ((m.cgr || 0) / 45) + this.MODEL_PARAMS.weights.I_CPT * ((m.cpt || 0) / 25));
                const agrShort = R * (this.MODEL_PARAMS.weights.I * shortI + this.MODEL_PARAMS.weights.A * shortA + this.MODEL_PARAMS.weights.IA * (shortI * shortA)) * persistenceMultiplier * this.MODEL_PARAMS.agrLimit;

                // Lambda blending: AGR_final = (1-λ)*AGR_long + λ*AGR_short
                const agrFinal = (1 - lambda) * agrLong + lambda * agrShort;
                m.agr = this.clamp(agrFinal, -this.MODEL_PARAMS.agrLimit, this.MODEL_PARAMS.agrLimit);

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

        // --- Model-specific methods (shared with 260101 baseline) ---

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

        calculateDirectionalConsistency(pvs, cdValues) {
            if (!pvs || pvs.length === 0) return 0;
            const signs = pvs.map(pv => Math.sign(this.safeNumber(pv, 0)));
            const positiveCount = signs.filter(s => s > 0).length;
            const negativeCount = signs.filter(s => s < 0).length;
            const maxSameSign = Math.max(positiveCount, negativeCount);
            const consistencyRatio = maxSameSign / pvs.length;
            const avgMagnitude = pvs.reduce((sum, pv) => sum + Math.abs(this.safeNumber(pv, 0)), 0) / pvs.length;
            const normalizedMagnitude = Math.min(avgMagnitude / 20, 1);
            const cds = cdValues || [];
            const isMonotonic = cds.every((cd, i) => i === 0 || Math.sign(cd) === Math.sign(cds[0]) || cd === 0);
            const monotonicity = isMonotonic ? 1 : 0.5;
            const persistence = consistencyRatio * 0.4 + normalizedMagnitude * 0.3 + monotonicity * 0.3;
            return this.clamp(persistence, 0, 1);
        }

        calculateTrendStrengthIndex(pvs) {
            if (!pvs || pvs.length < 6) return 0.5;
            const shortTermAvg = pvs.slice(0, 3).reduce((a, b) => a + (b || 0), 0) / 3;
            const longTermAvg = pvs.slice(3).reduce((a, b) => a + (b || 0), 0) / 3;
            const shortSign = Math.sign(shortTermAvg);
            const longSign = Math.sign(longTermAvg);
            const alignment = (shortSign === longSign && shortSign !== 0) ? 1 : 0.5;
            const ratio = longTermAvg !== 0 ? Math.abs(shortTermAvg) / Math.abs(longTermAvg) : 1;
            const strengthRatio = Math.min(ratio, 2) / 2;
            return this.clamp(alignment * 0.6 + strengthRatio * 0.4, 0, 1);
        }

        calculateMomentumPersistence(pvs, cdValues, cgrSlope) {
            if (!pvs || pvs.length === 0) return 0;
            const signs = pvs.map(pv => Math.sign(pv || 0));
            const positiveCount = signs.filter(s => s > 0).length;
            const negativeCount = signs.filter(s => s < 0).length;
            const dominantSign = positiveCount >= negativeCount ? 1 : -1;
            const alignmentScore = signs.filter(s => s === dominantSign || s === 0).length / pvs.length;
            const magnitudes = pvs.map(pv => Math.abs(this.safeNumber(pv, 0)));
            const avgMagnitude = magnitudes.reduce((sum, m) => sum + m, 0) / magnitudes.length;
            const stdDev = this.calculateStdDev(magnitudes);
            const magnitudeStability = avgMagnitude > 0 ? Math.min(avgMagnitude / (stdDev + 1), 1) : 0;
            const cgrAlignment = (Math.sign(cgrSlope || 0) === dominantSign) ? 1 : 0.5;
            const persistence = alignmentScore * 0.4 + magnitudeStability * 0.3 + cgrAlignment * 0.3;
            return this.clamp(persistence, 0, 1);
        }

        calculateMDN(hours, coins, indicators) {
            if (!Array.isArray(coins) || coins.length === 0) return 0;

            const hoursClamped = this.clamp(hours || 4, 4, 12);
            const momentumWindowDays = (hoursClamped * 0.5) / 24;
            const trendWindowDays = (hoursClamped * 1.5) / 24;

            const momentumSeg = this.calculateSegmentedMedians(coins, c => {
                const pvs = c.pvs || [c.PV1h, c.PV24h, c.PV7d, c.PV14d, c.PV30d, c.PV200d];
                const cd = this.calculateCD(pvs);
                return this.interpolateValue(cd, momentumWindowDays);
            });
            const momentumThreshold = 10 * (1 + hoursClamped / 24);
            const momentumMedian = this.tanh(momentumSeg.medianP / momentumThreshold) - this.tanh(Math.abs(momentumSeg.medianN) / momentumThreshold);
            const momentumBreadth = this.tanh((momentumSeg.bullishPercent - 0.5) * 4);
            const momentumComponent = 0.45 * momentumMedian + 0.35 * momentumBreadth;

            const trendSeg = this.calculateSegmentedMedians(coins, c => {
                const pvs = c.pvs || [c.PV1h, c.PV24h, c.PV7d, c.PV14d, c.PV30d, c.PV200d];
                const cd = this.calculateCD(pvs);
                return this.interpolateValue(cd, trendWindowDays);
            });
            const trendThreshold = 20 * (1 + hoursClamped / 48);
            const trendMedian = this.tanh(trendSeg.medianP / trendThreshold) - this.tanh(Math.abs(trendSeg.medianN) / trendThreshold);
            const trendBreadth = this.tanh((trendSeg.bullishPercent - 0.5) * 4);
            const trendComponent = 0.40 * trendMedian + 0.35 * trendBreadth;

            const cgrSeg = this.calculateSegmentedMedians(coins, c => {
                const pvs = c.pvs || [c.PV1h, c.PV24h, c.PV7d, c.PV14d, c.PV30d, c.PV200d];
                return this.calculateCGR(pvs).slope;
            });
            const cgrMedian = this.tanh(cgrSeg.medianP / 5) - this.tanh(Math.abs(cgrSeg.medianN) / 5);
            const cgrBreadth = this.tanh((cgrSeg.bullishPercent - 0.5) * 4);
            const accelComponent = 0.40 * cgrMedian + 0.35 * cgrBreadth;

            const fgiMod = this.clamp(((indicators.fgi || 50) - 50) / 50, -1, 1);
            const frMod = this.clamp((indicators.fr || 0) / 0.05, -1, 1);
            const lsrMod = this.tanh(((indicators.lsr || 1) - 1) / 2);
            const marketComponent = 0.40 * fgiMod + 0.30 * frMod + 0.30 * lsrMod;

            const mdnRaw = 0.35 * momentumComponent + 0.25 * trendComponent + 0.20 * accelComponent + 0.20 * marketComponent;
            return Math.round(this.clamp(mdnRaw, -1, 1) * 100);
        }

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

    window.MedianAir260115Calculator = new MedianAir260115Calculator();
})();
