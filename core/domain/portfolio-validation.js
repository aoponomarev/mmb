/**
 * #JS-hG34MvdS
 * @description Contract validator for portfolio drafts; invariants: sum=100, weight>=1, no duplicate coinId, disabled => locked + weight=1.
 * @skill id:sk-c3d639
 *
 * REFERENCES:
 * - id:ais-6f2b1d (docs/ais/ais-portfolio-system.md)
 * - Legacy donor recipe-portfolio-engine-mvp-hardening (id:ais-3f4e5c, LIR-005.A4)
 */
(function() {
    'use strict';

    function toFiniteNumber(value, fallback) {
        const num = Number(value);
        return Number.isFinite(num) ? num : fallback;
    }

    function validateDraft(draft) {
        const issues = [];
        const safeDraft = draft || {};
        const assets = Array.isArray(safeDraft.assets) ? safeDraft.assets : [];
        const constraints = safeDraft.constraints || {};
        const totalWeight = Math.max(0, Math.round(toFiniteNumber(constraints.totalWeight, 100)));
        const minWeight = Math.max(1, Math.round(toFiniteNumber(constraints.minWeight, 1)));

        if (assets.length === 0) {
            issues.push({
                code: 'ASSETS_EMPTY',
                message: 'Portfolio must include at least one asset.',
                path: 'assets'
            });
        }

        const seenIds = new Set();
        assets.forEach((asset, index) => {
            if (!asset || !asset.coinId) {
                issues.push({
                    code: 'ASSET_COIN_ID_REQUIRED',
                    message: 'Asset coinId is required.',
                    path: `assets[${index}].coinId`
                });
                return;
            }
            if (seenIds.has(asset.coinId)) {
                issues.push({
                    code: 'ASSET_DUPLICATE',
                    message: `Duplicate asset coinId: ${asset.coinId}`,
                    path: `assets[${index}].coinId`
                });
            }
            seenIds.add(asset.coinId);

            const weight = toFiniteNumber(asset.weight, NaN);
            if (!Number.isFinite(weight)) {
                issues.push({
                    code: 'ASSET_WEIGHT_REQUIRED',
                    message: 'Asset weight must be a number.',
                    path: `assets[${index}].weight`
                });
            } else {
                if (weight < minWeight) {
                    issues.push({
                        code: 'ASSET_WEIGHT_LT_MIN',
                        message: `Asset weight cannot be less than ${minWeight}.`,
                        path: `assets[${index}].weight`
                    });
                }
                if (weight > totalWeight) {
                    issues.push({
                        code: 'ASSET_WEIGHT_GT_TOTAL',
                        message: `Asset weight cannot exceed totalWeight ${totalWeight}.`,
                        path: `assets[${index}].weight`
                    });
                }
            }

            if (asset.isDisabledInRebalance) {
                if (!asset.isLocked) {
                    issues.push({
                        code: 'DISABLED_ASSET_NOT_LOCKED',
                        message: 'Disabled rebalance asset must be locked.',
                        path: `assets[${index}].isLocked`
                    });
                }
                if (toFiniteNumber(asset.weight, 0) !== minWeight) {
                    issues.push({
                        code: 'DISABLED_ASSET_WEIGHT_NOT_MIN',
                        message: `Disabled rebalance asset must have weight ${minWeight}.`,
                        path: `assets[${index}].weight`
                    });
                }
            }

            if (asset.keyMetric !== undefined && asset.keyMetric !== null) {
                const field = typeof asset.keyMetric.field === 'string' ? asset.keyMetric.field.trim() : '';
                const label = typeof asset.keyMetric.label === 'string' ? asset.keyMetric.label.trim() : '';
                if (!field) {
                    issues.push({
                        code: 'ASSET_KEY_METRIC_FIELD_REQUIRED',
                        message: 'Asset keyMetric.field must be a non-empty string.',
                        path: `assets[${index}].keyMetric.field`
                    });
                }
                if (!label) {
                    issues.push({
                        code: 'ASSET_KEY_METRIC_LABEL_REQUIRED',
                        message: 'Asset keyMetric.label must be a non-empty string.',
                        path: `assets[${index}].keyMetric.label`
                    });
                }
            }
        });

        const sum = assets.reduce((acc, asset) => acc + Math.round(toFiniteNumber(asset && asset.weight, 0)), 0);
        if (sum !== totalWeight) {
            issues.push({
                code: 'WEIGHT_SUM_INVALID',
                message: `Weight sum must be exactly ${totalWeight}, actual ${sum}.`,
                path: 'assets'
            });
        }

        return {
            ok: issues.length === 0,
            issues
        };
    }

    window.portfolioValidation = {
        validateDraft
    };
})();
