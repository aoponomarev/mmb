/**
 * ================================================================================================
 * TOOLTIP INTERPRETER - Metric value interpretation for dynamic tooltips
 * ================================================================================================
 *
 * PURPOSE: Generate dynamic part of tooltip from current metric values.
 *
 * @skill-anchor id:sk-bb7c8e #for-layer-separation
 * @skill-anchor id:sk-224210 #for-data-provider-interface
 * Static part from tooltipsConfig, dynamic part built here.
 * Skill: id:sk-e0b8f3
 *
 * USAGE:
 * const tooltip = window.tooltipInterpreter.getTooltip('agr', { value: 12.5, lang: 'ru' });
 *
*/

(function() {
    'use strict';

    /**
     * Threshold values for metric interpretation
     * Structure: { metric: { levels: [values], interpretations: { ru: [...], en: [...] } } }
     */
    const THRESHOLDS = {
        agr: {
            levels: [-10, -5, 0, 5, 10], // critical AGR thresholds
            interpretations: {
                ru: [
                    '⚠ Экстремально медвежий сигнал.\nShort-позиции предпочтительны.',
                    '↘ Медвежья динамика.\nОсторожно с Long-позициями.',
                    '— Нейтральная зона.\nРынок без явного тренда.',
                    '↗ Бычья динамика.\nLong-позиции предпочтительны.',
                    '🚀 Экстремально бычий сигнал.\nСильная Long-возможность.'
                ],
                en: [
                    '⚠ Extremely bearish signal.\nShort positions preferred.',
                    '↘ Bearish dynamics.\nCaution with Long positions.',
                    '— Neutral zone.\nMarket without clear trend.',
                    '↗ Bullish dynamics.\nLong positions preferred.',
                    '🚀 Extremely bullish signal.\nStrong Long opportunity.'
                ]
            }
        },
        mdn: {
            levels: [-40, -20, 0, 20, 40],
            interpretations: {
                ru: [
                    '⚠ Рыночная паника.\nВозможна коррекция Short.',
                    '↘ Медвежье давление доминирует.',
                    '— Баланс сил.\nБоковое движение вероятно.',
                    '↗ Бычье давление доминирует.',
                    '🚀 Рыночная эйфория.\nРиск перегрева.'
                ],
                en: [
                    '⚠ Market panic.\nShort correction possible.',
                    '↘ Bearish pressure dominates.',
                    '— Balance of forces.\nSideways movement likely.',
                    '↗ Bullish pressure dominates.',
                    '🚀 Market euphoria.\nOverheating risk.'
                ]
            }
        },
        din: {
            levels: [-15, -5, 0, 5, 15],
            interpretations: {
                ru: [
                    '⚠ Высокая волатильность вниз.',
                    '↘ Повышенный риск падения.',
                    '— Умеренная волатильность.',
                    '↗ Повышенный потенциал роста.',
                    '🚀 Высокая волатильность вверх.'
                ],
                en: [
                    '⚠ High downside volatility.',
                    '↘ Elevated downside risk.',
                    '— Moderate volatility.',
                    '↗ Elevated upside potential.',
                    '🚀 High upside volatility.'
                ]
            }
        },
        dcs: {
            levels: [0.3, 0.5, 0.7, 0.85],
            interpretations: {
                ru: [
                    '⚠ Низкая устойчивость.\nТренд может развернуться.',
                    '↘ Умеренная устойчивость.\nТребуется подтверждение.',
                    '↗ Хорошая устойчивость.\nТренд вероятен.',
                    '✓ Высокая устойчивость.\nТренд стабилен.'
                ],
                en: [
                    '⚠ Low persistence.\nTrend may reverse.',
                    '↘ Moderate persistence.\nConfirmation required.',
                    '↗ Good persistence.\nTrend likely.',
                    '✓ High persistence.\nTrend is stable.'
                ]
            }
        },
        tsi: {
            levels: [0.3, 0.5, 0.7, 0.85],
            interpretations: {
                ru: [
                    '⚠ Слабый тренд.\nИмпульс отсутствует.',
                    '↘ Умеренный тренд.\nИмпульс формируется.',
                    '↗ Сильный тренд.\nИмпульс подтвержден.',
                    '✓ Экстремальный тренд.\nМаксимальный импульс.'
                ],
                en: [
                    '⚠ Weak trend.\nNo momentum.',
                    '↘ Moderate trend.\nMomentum forming.',
                    '↗ Strong trend.\nMomentum confirmed.',
                    '✓ Extreme trend.\nMaximum momentum.'
                ]
            }
        },
        mp: {
            levels: [0.3, 0.5, 0.7, 0.85],
            interpretations: {
                ru: [
                    '⚠ Моментум слаб.\nДвижение может затухнуть.',
                    '↘ Моментум умеренный.\nТребуется поддержка.',
                    '↗ Моментум сильный.\nДвижение устойчиво.',
                    '✓ Моментум экстремальный.\nДвижение инерционно.'
                ],
                en: [
                    '⚠ Weak momentum.\nMovement may fade.',
                    '↘ Moderate momentum.\nSupport required.',
                    '↗ Strong momentum.\nMovement is stable.',
                    '✓ Extreme momentum.\nMovement is inertial.'
                ]
            }
        },
        fgi: {
            levels: [25, 45, 55, 75],
            interpretations: {
                ru: [
                    '⚠ Экстремальный страх.\nВозможен разворот вверх.',
                    '↘ Страх доминирует.\nМедвежьи настроения.',
                    '— Нейтральный рынок.\nБаланс эмоций.',
                    '↗ Жадность доминирует.\n🤘 Бычьи настроения.',
                    '🚀 Экстремальная жадность.\nРиск коррекции.'
                ],
                en: [
                    '⚠ Extreme fear.\nReversal possible.',
                    '↘ Fear dominates.\nBearish sentiment.',
                    '— Neutral market.\nBalanced emotions.',
                    '↗ Greed dominates.\n🤘 Bullish sentiment.',
                    '🚀 Extreme greed.\nCorrection risk.'
                ]
            }
        },
        horizonDays: {
            levels: [1, 3, 7, 14, 30],
            interpretations: {
                ru: [
                    '⏱ Сверхкраткосрочный: 1 день.\nСкальпинг.',
                    '📅 Краткосрочный: 2-3 дня.\nДневная торговля.',
                    '📆 Среднесрочный: 4-7 дней.\nНедельные качели.',
                    '📊 Долгосрочный: 8-30 дней.\nМесячный тренд.',
                    '🌍 Долгосрочный: >30 дней.\nИнвестиции.'
                ],
                en: [
                    '⏱ Ultra-short: 1 day.\nScalping.',
                    '📅 Short-term: 2-3 days.\nDay trading.',
                    '📆 Medium-term: 4-7 days.\nWeekly swings.',
                    '📊 Long-term: 8-30 days.\nMonthly trend.',
                    '🌍 Long-term: >30 days.\nInvestments.'
                ]
            }
        },
        mdnHours: {
            levels: [4, 8, 12],
            interpretations: {
                ru: [
                    '⏱ 4 часа:\nкраткосрочный рыночный пульс.',
                    '📅 8 часов:\nсреднесрочный контекст движения.',
                    '📆 12 часов:\nдолгосрочный индикатор направления.'
                ],
                en: [
                    '⏱ 4 hours:\nshort-term market pulse.',
                    '📅 8 hours:\nmedium-term movement context.',
                    '📆 12 hours:\nlong-term direction indicator.'
                ]
            }
        }
    };

    /**
     * Get metric value interpretation
     * @param {string} key - metric key ('agr', 'mdn', 'fgi', etc.)
     * @param {number} value - current metric value
     * @param {string} lang - language ('ru', 'en')
     * @returns {string} - interpretation
     */
    function getInterpretation(key, value, lang = 'ru') {
        const threshold = THRESHOLDS[key];
        if (!threshold) return '';

        const levels = threshold.levels;
        const interpretations = threshold.interpretations[lang] || threshold.interpretations['ru'];

        // Determine interpretation index from value
        let index = 0;
        for (let i = 0; i < levels.length; i++) {
            if (value >= levels[i]) {
                index = i + 1;
            }
        }

        return interpretations[Math.min(index, interpretations.length - 1)] || '';
    }

    /**
     * Get full tooltip (static + dynamic parts)
     * @param {string} key - metric key ('agr', 'mdn', 'fgi', etc.)
     * @param {Object} options - options { value, lang, skipStatic }
     * @returns {string} - final tooltip
     */
    function getTooltip(key, options = {}) {
        const { value, lang = 'ru', skipStatic = false } = options;

        let tooltip = '';

        // Static part (from tooltipsConfig)
        if (!skipStatic && window.tooltipsConfig) {
            const staticKey = `metric.${key}.description`;
            const staticText = window.tooltipsConfig.getTooltip(staticKey);
            if (staticText) {
                tooltip = staticText;
            }
        }

        // Dynamic part (interpretation of current value)
        if (value !== undefined && value !== null) {
            const interpretation = getInterpretation(key, value, lang);
            if (interpretation) {
                tooltip += tooltip ? `\n${interpretation}` : interpretation;
            }
        }

        return tooltip;
    }

    /**
     * Get list of all available metrics with thresholds
     * @returns {Array<string>} - metric keys array
     */
    function getAvailableMetrics() {
        return Object.keys(THRESHOLDS);
    }

    // Export to global scope
    window.tooltipInterpreter = {
        getTooltip,
        getInterpretation,
        getAvailableMetrics,
        THRESHOLDS
    };

    console.log('tooltip-interpreter.js: initialized');
})();
