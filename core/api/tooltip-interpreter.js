/**
 * #JS-Kg2tEBFr
 * @description Dynamic tooltip part from current metric values; static part from tooltipsConfig.
 * @skill id:sk-e0b8f3
 * @skill-anchor id:sk-bb7c8e #for-layer-separation
 * @skill-anchor id:sk-224210 #for-data-provider-interface
 *
 * USAGE:
 * const tooltip = window.tooltipInterpreter.getTooltip('agr', { value: 12.5, lang: 'ru' });
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
                ],
                de: [
                    '⚠ Extrem bärisches Signal.\nShort-Positionen bevorzugt.',
                    '↘ Bärische Dynamik.\nVorsicht bei Long-Positionen.',
                    '— Neutrale Zone.\nMarkt ohne klaren Trend.',
                    '↗ Bullische Dynamik.\nLong-Positionen bevorzugt.',
                    '🚀 Extrem bullisches Signal.\nStarke Long-Möglichkeit.'
                ],
                zh: [
                    '⚠ 极度看跌信号。空头优先。',
                    '↘ 看跌走势。做多需谨慎。',
                    '— 中性区。市场无明确趋势。',
                    '↗ 看涨走势。多头优先。',
                    '🚀 极度看涨信号。强烈做多机会。'
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
                ],
                de: [
                    '⚠ Marktpanik.\nShort-Korrektur möglich.',
                    '↘ Bärischer Druck dominiert.',
                    '— Kräftegleichgewicht.\nSeitwärtsbewegung wahrscheinlich.',
                    '↗ Bullischer Druck dominiert.',
                    '🚀 Markteuphorie.\nÜberhitzungsrisiko.'
                ],
                zh: [
                    '⚠ 市场恐慌。可能空头回补。',
                    '↘ 看跌压力主导。',
                    '— 力量平衡。可能横盘。',
                    '↗ 看涨压力主导。',
                    '🚀 市场亢奋。过热风险。'
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
                ],
                de: [
                    '⚠ Hohe Abwärtsvolatilität.',
                    '↘ Erhöhtes Abwärtsrisiko.',
                    '— Moderate Volatilität.',
                    '↗ Erhöhtes Aufwärtspotenzial.',
                    '🚀 Hohe Aufwärtsvolatilität.'
                ],
                zh: [
                    '⚠ 下行波动剧烈。',
                    '↘ 下行风险升高。',
                    '— 波动适中。',
                    '↗ 上行潜力升高。',
                    '🚀 上行波动剧烈。'
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
                ],
                de: [
                    '⚠ Geringe Persistenz.\nTrend kann sich umkehren.',
                    '↘ Mäßige Persistenz.\nBestätigung erforderlich.',
                    '↗ Gute Persistenz.\nTrend wahrscheinlich.',
                    '✓ Hohe Persistenz.\nTrend ist stabil.'
                ],
                zh: [
                    '⚠ 持续性低。趋势可能反转。',
                    '↘ 持续性中等。需确认。',
                    '↗ 持续性良好。趋势可能。',
                    '✓ 持续性高。趋势稳定。'
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
                ],
                de: [
                    '⚠ Schwacher Trend.\nKein Momentum.',
                    '↘ Mäßiger Trend.\nMomentum bildet sich.',
                    '↗ Starker Trend.\nMomentum bestätigt.',
                    '✓ Extremer Trend.\nMaximales Momentum.'
                ],
                zh: [
                    '⚠ 趋势弱。无动能。',
                    '↘ 趋势中等。动能形成中。',
                    '↗ 趋势强。动能确认。',
                    '✓ 趋势极端。动能最大。'
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
                ],
                de: [
                    '⚠ Schwaches Momentum.\nBewegung kann abflauen.',
                    '↘ Mäßiges Momentum.\nUnterstützung erforderlich.',
                    '↗ Starkes Momentum.\nBewegung ist stabil.',
                    '✓ Extremes Momentum.\nBewegung ist träge.'
                ],
                zh: [
                    '⚠ 动能弱。走势可能消退。',
                    '↘ 动能中等。需支撑。',
                    '↗ 动能强。走势稳定。',
                    '✓ 动能极端。走势惯性。'
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
                ],
                de: [
                    '⚠ Extreme Angst.\nAufwärtstrend möglich.',
                    '↘ Angst dominiert.\nBärische Stimmung.',
                    '— Neutraler Markt.\nAusgewogene Emotionen.',
                    '↗ Gier dominiert.\n🤘 Bullische Stimmung.',
                    '🚀 Extreme Gier.\nKorrekturrisiko.'
                ],
                zh: [
                    '⚠ 极度恐惧。可能反转向上。',
                    '↘ 恐惧主导。看跌情绪。',
                    '— 中性市场。情绪平衡。',
                    '↗ 贪婪主导。🤘 看涨情绪。',
                    '🚀 极度贪婪。回调风险。'
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
                ],
                de: [
                    '⏱ Ultrakurz: 1 Tag.\nScalping.',
                    '📅 Kurzfristig: 2-3 Tage.\nDaytrading.',
                    '📆 Mittelfristig: 4-7 Tage.\nWochenschwünge.',
                    '📊 Langfristig: 8-30 Tage.\nMonatstrend.',
                    '🌍 Langfristig: >30 Tage.\nInvestitionen.'
                ],
                zh: [
                    '⏱ 超短期：1天。剥头皮。',
                    '📅 短期：2-3天。日内交易。',
                    '📆 中期：4-7天。周线波动。',
                    '📊 长期：8-30天。月线趋势。',
                    '🌍 长期：>30天。投资。'
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
                ],
                de: [
                    '⏱ 4 Stunden:\nkurzfristiger Marktpuls.',
                    '📅 8 Stunden:\nmittelfristiger Bewegungs-Kontext.',
                    '📆 12 Stunden:\nlangfristiger Richtungsindikator.'
                ],
                zh: [
                    '⏱ 4小时：短期市场脉搏。',
                    '📅 8小时：中期走势背景。',
                    '📆 12小时：长期方向指标。'
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
        const interpretations = threshold.interpretations[lang]
            || threshold.interpretations['en']
            || threshold.interpretations['ru'];

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
            const staticText = window.tooltipsConfig.getTooltip(staticKey, { lang });
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
