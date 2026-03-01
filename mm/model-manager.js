/**
 * ================================================================================================
 * MODEL MANAGER - Менеджер математических моделей
 * ================================================================================================
 * Skill: a/skills/app/skills/metrics/metrics-models.md
 * Doc: docs/A_MATH_MODELS.md
 *
 * ЦЕЛЬ: Регистрация, переключение и управление активной математической моделью.
 */

(function() {
    'use strict';

    class ModelManager {
        constructor() {
            this.models = new Map();
            this.activeModelId = null;
        }

        /**
         * Регистрация новой модели
         * @param {BaseModelCalculator} model - Объект модели
         */
        registerModel(model) {
            if (!model || !model.id) {
                console.error('ModelManager: некорректная модель для регистрации', model);
                return;
            }
            this.models.set(model.id, model);
            // Регистрация модели без лишних логов (меньше шума в консоли)

            // Если это первая модель, делаем ее активной
            if (!this.activeModelId) {
                this.activeModelId = model.id;
            }
        }

        /**
         * Установка активной модели
         * @param {string} modelId - ID модели
         */
        setActiveModel(modelId) {
            if (this.models.has(modelId)) {
                this.activeModelId = modelId;
                return true;
            }

            // Пытаемся нормализовать через modelsConfig (legacyIds)
            if (window.modelsConfig && typeof window.modelsConfig.getModel === 'function') {
                const resolved = window.modelsConfig.getModel(modelId);
                const resolvedId = resolved?.id || null;
                if (resolvedId && this.models.has(resolvedId)) {
                    this.activeModelId = resolvedId;
                    return true;
                }
            }

            console.warn(`ModelManager: модель с ID "${modelId}" не найдена`);
            return false;
        }

        /**
         * Получить активную модель
         * @returns {BaseModelCalculator}
         */
        getActiveModel() {
            return this.models.get(this.activeModelId);
        }

        /**
         * Получить ID активной модели
         * @returns {string|null}
         */
        getActiveModelId() {
            return this.activeModelId;
        }

        /**
         * Получить все зарегистрированные модели
         * @returns {Array}
         */
        getAllModels() {
            return Array.from(this.models.values());
        }

        /**
         * Основной метод расчета через активную модель
         */
        calculateMetrics(coins, params) {
            const model = this.getActiveModel();
            if (!model) {
                console.error('ModelManager: активная модель не установлена');
                return { coins: [], marketData: {} };
            }
            return model.calculateMetrics(coins, params);
        }

        /**
         * Прокси-методы активной модели
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
         * Получить рекомендуемый метод AGR для активной модели
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

    // Экспорт в глобальную область
    window.modelManager = new ModelManager();

    // Автоматическая регистрация существующих моделей (если они уже загружены)
    if (window.MedianAir260101Calculator) {
        window.modelManager.registerModel(window.MedianAir260101Calculator);
    }
    if (window.MedianAir260115Calculator) {
        window.modelManager.registerModel(window.MedianAir260115Calculator);
    }
})();
