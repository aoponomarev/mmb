/**
 * #JS-rrLtero9
 * @description Pure domain logic for portfolio draft/rebalance; canonical allocation; invariants sum=100, minWeight=1, no delete in rebalance.
 * @skill id:sk-c3d639
 *
 * PURPOSE: Single canonical domain logic; pure functions, deterministic output.
 *
 * FUNCTIONS: allocateWeights, normalizeWeights, lockAssetWeight, unlockAsset, setRebalanceEnabled, buildDraftAssets, autoSelectCandidates.
 *
 * REFERENCES:
 * - id:ais-6f2b1d (docs/ais/ais-portfolio-system.md)
 * - Legacy donor recipe-portfolio-engine-mvp-hardening (id:ais-3f4e5c, LIR-005.A2, LIR-005.A3)
 */
(function() {
    'use strict';

    function toFiniteNumber(value, fallback) {
        const num = Number(value);
        return Number.isFinite(num) ? num : fallback;
    }

    function cloneDraft(draft) {
        return {
            ...draft,
            constraints: {
                totalWeight: 100,
                minWeight: 1,
                ...(draft && draft.constraints ? draft.constraints : {})
            },
            assets: Array.isArray(draft && draft.assets)
                ? draft.assets.map(asset => ({ ...asset }))
                : []
        };
    }

    function getPriorityOrder(assets, mode) {
        if (mode === 'agr') {
            return [...assets].sort((a, b) => {
                const diff = Math.abs(toFiniteNumber(b.agr, 0)) - Math.abs(toFiniteNumber(a.agr, 0));
                if (diff !== 0) return diff;
                return String(a.coinId || '').localeCompare(String(b.coinId || ''));
            });
        }
        return [...assets].sort((a, b) => String(a.coinId || '').localeCompare(String(b.coinId || '')));
    }

    function normalizeWeights(draft) {
        const next = cloneDraft(draft);
        const totalWeight = Math.max(0, Math.round(toFiniteNumber(next.constraints.totalWeight, 100)));
        const minWeight = Math.max(1, Math.round(toFiniteNumber(next.constraints.minWeight, 1)));
        const assets = next.assets;

        if (assets.length === 0) {
            return next;
        }

        const activeAssets = assets.filter(asset => !asset._exclude);
        if (activeAssets.length === 0) {
            return next;
        }

        // Initialize all asset weights and enforce hard floor.
        activeAssets.forEach(asset => {
            if (asset.isDisabledInRebalance) {
                asset.weight = minWeight;
                return;
            }
            const raw = toFiniteNumber(asset.weight, minWeight);
            asset.weight = Math.max(minWeight, Math.round(raw));
        });

        // If total minimum required exceeds target, distribute best-effort with deterministic order.
        const minRequired = activeAssets.length * minWeight;
        if (minRequired > totalWeight) {
            const ordered = getPriorityOrder(activeAssets, next.mode || 'equal');
            ordered.forEach(asset => { asset.weight = 0; });
            let remainder = totalWeight;
            for (let i = 0; i < ordered.length && remainder > 0; i++) {
                ordered[i].weight = 1;
                remainder -= 1;
            }
            return next;
        }

        let sum = activeAssets.reduce((acc, asset) => acc + asset.weight, 0);
        const mutableAssets = activeAssets.filter(asset => !asset.isDisabledInRebalance);

        if (sum > totalWeight) {
            let overflow = sum - totalWeight;
            const ordered = getPriorityOrder(mutableAssets, next.mode || 'equal').reverse();
            let guard = 0;
            while (overflow > 0 && guard < 100000) {
                guard += 1;
                let changed = false;
                for (let i = 0; i < ordered.length && overflow > 0; i++) {
                    if (ordered[i].weight > minWeight) {
                        ordered[i].weight -= 1;
                        overflow -= 1;
                        changed = true;
                    }
                }
                if (!changed) break;
            }
        } else if (sum < totalWeight) {
            let remainder = totalWeight - sum;
            const ordered = getPriorityOrder(mutableAssets, next.mode || 'equal');
            if (ordered.length === 0) {
                return next;
            }
            let index = 0;
            while (remainder > 0) {
                ordered[index % ordered.length].weight += 1;
                remainder -= 1;
                index += 1;
            }
        }

        return next;
    }

    function buildDraftAssets(candidates, modelId) {
        if (!Array.isArray(candidates)) return [];
        return candidates.map(candidate => {
            const agr = toFiniteNumber(candidate && candidate.metrics && candidate.metrics.agr, 0);
            return {
                coinId: candidate.coinId || candidate.id || '',
                ticker: String(candidate.ticker || candidate.symbol || '').toUpperCase(),
                side: agr >= 0 ? 'long' : 'short',
                agr,
                weight: null,
                isLocked: false,
                isDisabledInRebalance: false,
                delegatedBy: {
                    modelId: modelId || candidate?.delegatedBy?.modelId || 'unknown',
                    modelName: candidate?.delegatedBy?.modelName || ''
                }
            };
        });
    }

    function autoSelectCandidates(allCandidates, strategy) {
        if (!Array.isArray(allCandidates) || allCandidates.length === 0) return [];
        const selectedStrategy = strategy || 'top5x2';
        const scored = [...allCandidates].sort((a, b) => {
            const aAgr = toFiniteNumber(a && a.metrics && a.metrics.agr, 0);
            const bAgr = toFiniteNumber(b && b.metrics && b.metrics.agr, 0);
            return bAgr - aAgr;
        });
        if (selectedStrategy !== 'top5x2') return scored.slice(0, 10);

        const positives = scored.filter(item => toFiniteNumber(item?.metrics?.agr, 0) >= 0).slice(0, 5);
        const negatives = scored.filter(item => toFiniteNumber(item?.metrics?.agr, 0) < 0).slice(-5).reverse();
        const merged = [...positives, ...negatives];
        if (merged.length > 0) return merged;
        return scored.slice(0, 10);
    }

    function allocateWeights(draft, mode) {
        const next = cloneDraft(draft);
        const selectedMode = mode || next.mode || 'equal';
        next.mode = selectedMode;
        const totalWeight = Math.max(0, Math.round(toFiniteNumber(next.constraints.totalWeight, 100)));
        const minWeight = Math.max(1, Math.round(toFiniteNumber(next.constraints.minWeight, 1)));

        const assets = next.assets;
        const lockedSum = assets.reduce((acc, asset) => {
            if (asset.isDisabledInRebalance) {
                asset.isLocked = true;
                asset.weight = minWeight;
                return acc + minWeight;
            }
            if (asset.isLocked) {
                const w = Math.max(minWeight, Math.round(toFiniteNumber(asset.weight, minWeight)));
                asset.weight = w;
                return acc + w;
            }
            return acc;
        }, 0);

        const adjustable = assets.filter(asset => !asset.isLocked && !asset.isDisabledInRebalance);
        const available = Math.max(0, totalWeight - lockedSum);

        if (adjustable.length > 0) {
            if (selectedMode === 'agr') {
                const weighted = adjustable.map(asset => ({
                    asset,
                    score: Math.abs(toFiniteNumber(asset.agr, 0))
                }));
                const totalScore = weighted.reduce((acc, item) => acc + item.score, 0);
                if (totalScore <= 0) {
                    const base = Math.floor(available / adjustable.length);
                    adjustable.forEach(asset => {
                        asset.weight = Math.max(minWeight, base);
                    });
                } else {
                    let assigned = 0;
                    weighted.forEach(item => {
                        const share = Math.floor((item.score / totalScore) * available);
                        const safeShare = Math.max(minWeight, share);
                        item.asset.weight = safeShare;
                        assigned += safeShare;
                    });
                    let remainder = available - assigned;
                    const priority = weighted.sort((a, b) => b.score - a.score);
                    let i = 0;
                    // Distribute positive remainder
                    while (remainder > 0) {
                        priority[i % priority.length].asset.weight += 1;
                        remainder -= 1;
                        i += 1;
                    }
                    // Trim negative remainder (over-allocated due to minWeight enforcement)
                    if (remainder < 0) {
                        let overflow = -remainder;
                        const trimOrder = [...priority].reverse();
                        let j = 0;
                        while (overflow > 0 && j < trimOrder.length * 100) {
                            const idx = j % trimOrder.length;
                            if (trimOrder[idx].asset.weight > minWeight) {
                                trimOrder[idx].asset.weight -= 1;
                                overflow -= 1;
                            }
                            j += 1;
                        }
                    }
                }
            } else {
                const base = Math.floor(available / adjustable.length);
                adjustable.forEach(asset => {
                    asset.weight = Math.max(minWeight, base);
                });
                let assigned = adjustable.reduce((acc, asset) => acc + asset.weight, 0);
                let remainder = available - assigned;
                const priority = getPriorityOrder(adjustable, 'equal');
                let i = 0;
                while (remainder > 0) {
                    priority[i % priority.length].weight += 1;
                    remainder -= 1;
                    i += 1;
                }
            }
        }

        return normalizeWeights(next);
    }

    function lockAssetWeight(draft, coinId, weight) {
        const next = cloneDraft(draft);
        const minWeight = Math.max(1, Math.round(toFiniteNumber(next.constraints.minWeight, 1)));
        next.assets = next.assets.map(asset => {
            if (asset.coinId !== coinId) return asset;
            return {
                ...asset,
                isLocked: true,
                isDisabledInRebalance: false,
                weight: Math.max(minWeight, Math.round(toFiniteNumber(weight, minWeight)))
            };
        });
        return allocateWeights(next, next.mode);
    }

    function unlockAsset(draft, coinId) {
        const next = cloneDraft(draft);
        next.assets = next.assets.map(asset => {
            if (asset.coinId !== coinId) return asset;
            return {
                ...asset,
                isLocked: false,
                isDisabledInRebalance: false,
                weight: null
            };
        });
        return allocateWeights(next, next.mode);
    }

    function setRebalanceEnabled(draft, coinId, enabled) {
        const next = cloneDraft(draft);
        const minWeight = Math.max(1, Math.round(toFiniteNumber(next.constraints.minWeight, 1)));
        next.assets = next.assets.map(asset => {
            if (asset.coinId !== coinId) return asset;
            if (enabled) {
                return {
                    ...asset,
                    isDisabledInRebalance: false,
                    isLocked: false,
                    weight: null
                };
            }
            return {
                ...asset,
                isDisabledInRebalance: true,
                isLocked: true,
                weight: minWeight
            };
        });
        return allocateWeights(next, next.mode);
    }

    window.portfolioEngine = {
        buildDraftAssets,
        autoSelectCandidates,
        allocateWeights,
        lockAssetWeight,
        unlockAsset,
        setRebalanceEnabled,
        normalizeWeights
    };
})();
