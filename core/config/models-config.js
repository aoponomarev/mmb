/**
 * ================================================================================================
 * MODELS CONFIG - Registry of math models and their default parameters
 * ================================================================================================
 * Skill: id:sk-c3d639
 * Doc: docs/A_MATH_MODELS.md
 *
 * PURPOSE: SSOT for math model metadata and base calculation parameters.
 *
 * PRINCIPLES:
 * - Centralized list of models and their attributes (id, name, description, calculator, default flag)
 * - Centralized default calculation parameters (horizonDays, mdnHours, agrMethod)
 * - Avoid hardcoding parameters in components and storage layers
 *
 * REFERENCES:
 * - Metrics documentation: id:sk-c3d639
 * - Models architecture: id:sk-483943 (section "Math models and portfolios")
 */

(function() {
    'use strict';

    // Registry of math models
    const MATH_MODELS = Object.freeze({
        'Median/AIR/260101': Object.freeze({
            id: 'Median/AIR/260101',
            name: 'Медиана (A.I.R.) 26.01.01',
            description: 'Каноническая версия: Alignment, Impulse, Risk (фиксированная)',
            calculator: 'MedianAir260101Calculator',
            // @skill-anchor id:sk-22dc19 #for-model-extensibility #for-air-math-contract
            legacyIds: ['mmMedian'],
            meta: Object.freeze({
                id: 'Median/AIR/260101',
                family: 'Median',
                type: 'AIR',
                versionDate: '260101',
                versionName: 'Медиана (A.I.R.) 26.01.01',
                createdAt: '2026-01-26',
                agrFormula: 'agrRaw = R * (0.45*I + 0.35*A + 0.20*(I*A)); agr = agrRaw * persistenceMultiplier * 100',
                normalizationScheme: 'tanh + medianDIN risk scaling',
                weightsPolicy: 'CPT_BASE_WEIGHTS + CGR_BETAS',
                recommendedMethodRules: 'mp default; dcs/tsi as selected',
                params: Object.freeze({
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
                })
            }),
            params: Object.freeze({
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
            }),
            isDefault: true
        }),
        'Median/AIR/260115': Object.freeze({
            id: 'Median/AIR/260115',
            name: 'Медиана (A.I.R.) 26.01.15',
            description: 'Новая версия: каркас for AGR 260115 (в разработке)',
            calculator: 'MedianAir260115Calculator',
            meta: Object.freeze({
                id: 'Median/AIR/260115',
                family: 'Median',
                type: 'AIR',
                versionDate: '260115',
                versionName: 'Медиана (A.I.R.) 26.01.15',
                createdAt: '2026-01-26',
                agrFormula: 'AGR_final = (1-λ)*AGR_long + λ*AGR_short; AGR_raw = R*(0.45*I + 0.35*A + 0.20*I*A)',
                normalizationScheme: 'Robust normalization via median+MAD for CDH/CGR/CPT/DIN',
                weightsPolicy: 'CPT_BASE_WEIGHTS + CGR_BETAS',
                recommendedMethodRules: 'mp default; dcs/tsi as selected',
                params: Object.freeze({
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
                })
            }),
            params: Object.freeze({
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
            }),
            isDefault: false
        })
        // Future models are added here
    });

    // Default model parameters
    const DEFAULT_PARAMS = Object.freeze({
        horizonDays: 2,
        mdnHours: 4,
        agrMethod: 'mp' // dcs | tsi | mp
    });

    const DEFAULT_MODEL_ID = Object.values(MATH_MODELS).find(model => model.isDefault)?.id
        || Object.keys(MATH_MODELS)[0]
        || null;

    function getModels() {
        return MATH_MODELS;
    }

    function getModel(modelId) {
        if (!modelId) return null;
        if (MATH_MODELS[modelId]) return MATH_MODELS[modelId];
        const byLegacy = Object.values(MATH_MODELS).find(model =>
            Array.isArray(model.legacyIds) && model.legacyIds.includes(modelId)
        );
        return byLegacy || null;
    }

    function getModelMeta(modelId) {
        const model = getModel(modelId);
        return model?.meta || null;
    }

    function getDefaultModelId() {
        return DEFAULT_MODEL_ID;
    }

    function getDefaultModel() {
        return getModel(DEFAULT_MODEL_ID);
    }

    function getDefaultParams() {
        return { ...DEFAULT_PARAMS };
    }

    function getDefaultParam(key) {
        return DEFAULT_PARAMS[key];
    }

    function getModelParams(modelId) {
        const model = getModel(modelId);
        const params = model?.meta?.params || model?.params;
        if (!params) return null;
        return JSON.parse(JSON.stringify(params));
    }

    window.modelsConfig = {
        getModels,
        getModel,
        getModelParams,
        getModelMeta,
        getDefaultModelId,
        getDefaultModel,
        getDefaultParams,
        getDefaultParam
    };

})();
