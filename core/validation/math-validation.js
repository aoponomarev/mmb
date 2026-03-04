/**
 * ================================================================================================
 * MATH VALIDATION - Mathematical computation validation
 * ================================================================================================
 *
 * PURPOSE: Check correctness of financial calculations and math operations.
 * Range validation, NaN/Infinity checks, portfolio validation.
 *
 * Skill: id:sk-c3d639
 *
 * PRINCIPLES:
 * - Strict checks before using calculation results
 * - Portfolio validation (weights sum = 1)
 * - Correlation checks (-1 to 1)
 * - Metric checks for NaN/Infinity
 *
 * REFERENCE: Critical structures described in id:sk-483943
 */

(function() {
    'use strict';

    /**
     * Check if number is valid (not NaN, not Infinity)
     * @param {number} value - Value
     * @returns {boolean}
     */
    function isValidNumber(value) {
        return typeof value === 'number' && !isNaN(value) && isFinite(value);
    }

    /**
     * Validate portfolio weights (sum must equal 1)
     * @param {Array} assets - Array of assets with weights [{ coinId, weight }, ...]
     * @param {number} tolerance - Allowed deviation (default 0.001)
     * @param {Object} options - Options { showMessage: boolean, scope: string }
     * @returns {Object} - { valid: boolean, error: string, sum: number }
     */
    function validatePortfolioWeights(assets, tolerance = 0.001, options = {}) {
        if (!Array.isArray(assets)) {
            return { valid: false, error: 'Активы должны быть массивом', sum: 0 };
        }

        let sum = 0;
        let errorKey = null;
        let errorDetails = null;

        for (const asset of assets) {
            if (!asset || typeof asset.weight !== 'number') {
                errorKey = 'validation.portfolio.weights.range';
                errorDetails = 'Каждый актив должен иметь числовой вес';
                return { valid: false, error: errorDetails, sum: 0 };
            }
            if (asset.weight < 0 || asset.weight > 1) {
                errorKey = 'validation.portfolio.weights.range';
                errorDetails = `Получен вес ${asset.weight}`;
                const result = { valid: false, error: `Вес актива должен быть от 0 до 1, получен ${asset.weight}`, sum: 0 };

                // Show message automatically
                const showMessage = options.showMessage !== false;
                if (showMessage && window.AppMessages && window.messagesConfig) {
                    const messageData = window.messagesConfig.getMessage(errorKey);
                    const scope = options.scope || 'portfolios';
                    window.AppMessages.push({
                        text: messageData.text,
                        details: errorDetails,
                        type: messageData.type || 'warning',
                        priority: messageData.priority || 3,
                        key: errorKey, // Keep key for later translation
                        scope: scope,
                        actions: []
                    });
                }

                return result;
            }
            sum += asset.weight;
        }

        const diff = Math.abs(sum - 1);
        if (diff > tolerance) {
            errorKey = 'validation.portfolio.weights.sum';
            errorDetails = `Получена сумма ${sum.toFixed(4)}`;
            const result = { valid: false, error: `Сумма весов должна быть равна 1, получена ${sum.toFixed(4)}`, sum };

            // Show message automatically
            const showMessage = options.showMessage !== false;
            if (showMessage && window.AppMessages && window.messagesConfig) {
                const messageData = window.messagesConfig.getMessage(errorKey);
                const scope = options.scope || 'portfolios';
                window.AppMessages.push({
                    text: messageData.text,
                    details: errorDetails,
                    type: messageData.type || 'warning',
                    priority: messageData.priority || 3,
                    scope: scope,
                    actions: []
                });
            }

            return result;
        }

        return { valid: true, error: null, sum };
    }

    /**
     * Validate correlation (must be from -1 to 1)
     * @param {number} correlation - Correlation value
     * @param {Object} options - Options { showMessage: boolean, scope: string }
     * @returns {Object} - { valid: boolean, error: string }
     */
    function validateCorrelation(correlation, options = {}) {
        if (!isValidNumber(correlation)) {
            return { valid: false, error: 'Корреляция должна быть числом' };
        }
        if (correlation < -1 || correlation > 1) {
            const result = { valid: false, error: `Корреляция должна быть от -1 до 1, получена ${correlation}` };

            // Show message automatically
            const showMessage = options.showMessage !== false;
            if (showMessage && window.AppMessages && window.messagesConfig) {
                const messageData = window.messagesConfig.getMessage('validation.correlation.range');
                const scope = options.scope || 'global';
                window.AppMessages.push({
                    text: messageData.text,
                    details: `Получена ${correlation}`,
                    type: messageData.type || 'warning',
                    priority: messageData.priority || 3,
                    scope: scope,
                    actions: []
                });
            }

            return result;
        }
        return { valid: true, error: null };
    }

    /**
     * Validate metric (must not be NaN or Infinity)
     * @param {number} metric - Metric value
     * @param {string} metricName - Metric name (for error message)
     * @param {Object} options - Options { showMessage: boolean, scope: string }
     * @returns {Object} - { valid: boolean, error: string }
     */
    function validateMetric(metric, metricName = 'metric', options = {}) {
        if (!isValidNumber(metric)) {
            let errorMsg = `${metricName} должна быть числом`;
            if (isNaN(metric)) {
                errorMsg = `${metricName} не can be NaN`;
            } else if (!isFinite(metric)) {
                errorMsg = `${metricName} не can be Infinity`;
            }

            const result = { valid: false, error: errorMsg };

            // Show message automatically
            const showMessage = options.showMessage !== false;
            if (showMessage && window.AppMessages && window.messagesConfig) {
                const messageData = window.messagesConfig.getMessage('validation.metric.nan');
                const scope = options.scope || 'global';
                window.AppMessages.push({
                    text: messageData.text,
                    details: errorMsg,
                    type: messageData.type || 'danger',
                    priority: messageData.priority || 4,
                    scope: scope,
                    actions: []
                });
            }

            return result;
        }
        return { valid: true, error: null };
    }

    /**
     * Validate time series (time monotonicity, no gaps)
     * @param {Array} timeSeries - Array of points [{ timestamp, value }, ...]
     * @param {Object} options - Options { showMessage: boolean, scope: string }
     * @returns {Object} - { valid: boolean, error: string }
     */
    function validateTimeSeries(timeSeries, options = {}) {
        if (!Array.isArray(timeSeries) || timeSeries.length === 0) {
            const result = { valid: false, error: 'Временной ряд должен быть непустым массивом' };

            // Show message automatically
            const showMessage = options.showMessage !== false;
            if (showMessage && window.AppMessages && window.messagesConfig) {
                const messageData = window.messagesConfig.getMessage('validation.timeseries.empty');
                const scope = options.scope || 'global';
                window.AppMessages.push({
                    text: messageData.text,
                    details: null,
                    type: messageData.type || 'warning',
                    priority: messageData.priority || 3,
                    scope: scope,
                    actions: []
                });
            }

            return result;
        }

        let prevTimestamp = null;
        for (let i = 0; i < timeSeries.length; i++) {
            const point = timeSeries[i];
            if (!point || typeof point.timestamp !== 'number') {
                return { valid: false, error: `Точка [${i}] должна иметь числовой timestamp` };
            }
            if (typeof point.value !== 'number' || !isValidNumber(point.value)) {
                return { valid: false, error: `Точка [${i}] должна иметь валидное числовое value` };
            }
            if (prevTimestamp !== null && point.timestamp < prevTimestamp) {
                const result = { valid: false, error: `Точка [${i}] имеет timestamp меньше предыдущей (нарушена монотонность)` };

                // Show message automatically
                const showMessage = options.showMessage !== false;
                if (showMessage && window.AppMessages && window.messagesConfig) {
                    const messageData = window.messagesConfig.getMessage('validation.timeseries.monotonic');
                    const scope = options.scope || 'global';
                    window.AppMessages.push({
                        text: messageData.text,
                        details: `Точка [${i}]`,
                        type: messageData.type || 'warning',
                        priority: messageData.priority || 3,
                        scope: scope,
                        actions: []
                    });
                }

                return result;
            }
            prevTimestamp = point.timestamp;
        }

        return { valid: true, error: null };
    }

    // Export to global scope
    window.mathValidation = {
        isValidNumber,
        validatePortfolioWeights,
        validateCorrelation,
        validateMetric,
        validateTimeSeries
    };

    console.log('math-validation.js: initialized');
})();

