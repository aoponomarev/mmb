/**
 * ================================================================================================
 * MODEL MANAGER - Math models manager
 * ================================================================================================
 * Skill: id:sk-c3d639
 * Doc: docs/A_MATH_MODELS.md
 *
 * PURPOSE: Register, switch and manage active math model.
 */

(function() {
    'use strict';

    class ModelManager {
        constructor() {
            this.models = new Map();
            this.activeModelId = null;
        }

        /**
         * Register new model
         * @param {BaseModelCalculator} model - Model instance
         */
        registerModel(model) {
            if (!model || !model.id) {
                console.error('ModelManager: invalid model for registration', model);
                return;
            }
            this.models.set(model.id, model);
            // Register model without extra logs (less console noise)

            // If first model, make it active
            if (!this.activeModelId) {
                this.activeModelId = model.id;
            }
        }

        /**
         * Set active model
         * @param {string} modelId - Model ID
         */
        setActiveModel(modelId) {
            if (this.models.has(modelId)) {
                this.activeModelId = modelId;
                return true;
            }

            // Try normalizing via modelsConfig (legacyIds)
            if (window.modelsConfig && typeof window.modelsConfig.getModel === 'function') {
                const resolved = window.modelsConfig.getModel(modelId);
                const resolvedId = resolved?.id || null;
                if (resolvedId && this.models.has(resolvedId)) {
                    this.activeModelId = resolvedId;
                    return true;
                }
            }

            console.warn(`ModelManager: model with ID "${modelId}" not found`);
            return false;
        }

        /**
         * Get active model
         * @returns {BaseModelCalculator}
         */
        getActiveModel() {
            return this.models.get(this.activeModelId);
        }

        /**
         * Get active model ID
         * @returns {string|null}
         */
        getActiveModelId() {
            return this.activeModelId;
        }

        /**
         * Get all registered models
         * @returns {Array}
         */
        getAllModels() {
            return Array.from(this.models.values());
        }

        /**
         * Main calc via active model
         */
        calculateMetrics(coins, params) {
            const model = this.getActiveModel();
            if (!model) {
                console.error('ModelManager: active model not set');
                return { coins: [], marketData: {} };
            }
            return model.calculateMetrics(coins, params);
        }

        /**
         * Proxy methods of active model
         */
        calculateMDN(hours, coins, indicators) {
            const model = this.getActiveModel();
            if (model && typeof model.calculateMDN === 'function') {
                return model.calculateMDN(hours, coins, indicators);
            }
            return 0;
        }

        median(values) {
            const model = this.getActiveModel();
            if (model && typeof model.median === 'function') {
                return model.median(values);
            }
            return 0;
        }

        calculateSegmentedMedians(coins, mapper) {
            const model = this.getActiveModel();
            if (model && typeof model.calculateSegmentedMedians === 'function') {
                return model.calculateSegmentedMedians(coins, mapper);
            }
            return {};
        }

        calculateMarketMedians(coins) {
            const model = this.getActiveModel();
            if (model && typeof model.calculateMarketMedians === 'function') {
                return model.calculateMarketMedians(coins);
            }
            return [];
        }

        calculatePrcWeights(hDays) {
            const model = this.getActiveModel();
            if (model && typeof model.calculatePrcWeights === 'function') {
                return model.calculatePrcWeights(hDays);
            }
            return [];
        }

        calculateCMD(marketMedians, prcWeights, hDays) {
            const model = this.getActiveModel();
            if (model && typeof model.calculateCMD === 'function') {
                return model.calculateCMD(marketMedians, prcWeights, hDays);
            }
            return { cdh: 0, cdWeighted: [] };
        }

        /**
         * Get recommended AGR method for active model
         * @param {Object} params
         * @returns {string|null}
         */
        getRecommendedAgrMethod(params = {}) {
            const model = this.getActiveModel();
            if (!model || typeof model.getRecommendedAgrMethod !== 'function') {
                return null;
            }
            return model.getRecommendedAgrMethod(params);
        }
    }

    // Export to global scope
    window.modelManager = new ModelManager();

    // Auto-register existing models (if already loaded)
    if (window.MedianAir260101Calculator) {
        window.modelManager.registerModel(window.MedianAir260101Calculator);
    }
    if (window.MedianAir260115Calculator) {
        window.modelManager.registerModel(window.MedianAir260115Calculator);
    }
})();
