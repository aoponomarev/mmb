/**
 * ================================================================================================
 * MATH VALIDATION - Валидация математических вычислений
 * ================================================================================================
 *
 * ЦЕЛЬ: Проверка корректности финансовых расчётов и математических операций.
 * Валидация диапазонов, проверка на NaN/Infinity, валидация портфелей.
 *
 * Skill: a/skills/app/skills/metrics/metrics-validation.md
 *
 * ПРИНЦИПЫ:
 * - Строгая проверка перед использованием результатов расчётов
 * - Валидация портфелей (сумма весов = 1)
 * - Проверка корреляций (-1 до 1)
 * - Проверка метрик на NaN/Infinity
 *
 * ССЫЛКА: Критически важные структуры описаны в a/skills/app/skills/architecture/architecture-core-stack.md
 */

(function() {
    'use strict';

    /**
     * Проверить, является ли число валидным (не NaN, не Infinity)
     * @param {number} value - значение
     * @returns {boolean}
     */
    function isValidNumber(value) {
        return typeof value === 'number' && !isNaN(value) && isFinite(value);
    }

    /**
     * Валидировать вес портфеля (сумма весов должна быть равна 1)
     * @param {Array} assets - массив активов с весами [{ coinId, weight }, ...]
     * @param {number} tolerance - допустимое отклонение (по умолчанию 0.001)
     * @param {Object} options - опции { showMessage: boolean, scope: string }
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

                // Автоматический показ сообщения
                const showMessage = options.showMessage !== false;
                if (showMessage && window.AppMessages && window.messagesConfig) {
                    const messageData = window.messagesConfig.getMessage(errorKey);
                    const scope = options.scope || 'portfolios';
                    window.AppMessages.push({
                        text: messageData.text,
                        details: errorDetails,
                        type: messageData.type || 'warning',
                        priority: messageData.priority || 3,
                        key: errorKey, // Сохраняем ключ для последующего перевода
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

            // Автоматический показ сообщения
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
     * Валидировать корреляцию (должна быть от -1 до 1)
     * @param {number} correlation - значение корреляции
     * @param {Object} options - опции { showMessage: boolean, scope: string }
     * @returns {Object} - { valid: boolean, error: string }
     */
    function validateCorrelation(correlation, options = {}) {
        if (!isValidNumber(correlation)) {
            return { valid: false, error: 'Корреляция должна быть числом' };
        }
        if (correlation < -1 || correlation > 1) {
            const result = { valid: false, error: `Корреляция должна быть от -1 до 1, получена ${correlation}` };

            // Автоматический показ сообщения
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
     * Валидировать метрику (не должна быть NaN или Infinity)
     * @param {number} metric - значение метрики
     * @param {string} metricName - имя метрики (для сообщения об ошибке)
     * @param {Object} options - опции { showMessage: boolean, scope: string }
     * @returns {Object} - { valid: boolean, error: string }
     */
    function validateMetric(metric, metricName = 'метрика', options = {}) {
        if (!isValidNumber(metric)) {
            let errorMsg = `${metricName} должна быть числом`;
            if (isNaN(metric)) {
                errorMsg = `${metricName} не может быть NaN`;
            } else if (!isFinite(metric)) {
                errorMsg = `${metricName} не может быть Infinity`;
            }

            const result = { valid: false, error: errorMsg };

            // Автоматический показ сообщения
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
     * Валидировать временной ряд (монотонность времени, отсутствие пропусков)
     * @param {Array} timeSeries - массив точек [{ timestamp, value }, ...]
     * @param {Object} options - опции { showMessage: boolean, scope: string }
     * @returns {Object} - { valid: boolean, error: string }
     */
    function validateTimeSeries(timeSeries, options = {}) {
        if (!Array.isArray(timeSeries) || timeSeries.length === 0) {
            const result = { valid: false, error: 'Временной ряд должен быть непустым массивом' };

            // Автоматический показ сообщения
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

                // Автоматический показ сообщения
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

    // Экспорт в глобальную область
    window.mathValidation = {
        isValidNumber,
        validatePortfolioWeights,
        validateCorrelation,
        validateMetric,
        validateTimeSeries
    };

    console.log('math-validation.js: инициализирован');
})();

