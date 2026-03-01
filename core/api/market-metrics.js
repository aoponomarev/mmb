/**
 * ================================================================================================
 * MARKET METRICS API - Утилита for получения метрик рынка
 * ================================================================================================
 *
 * PURPOSE: Независимый модуль for получения метрик рынка (FGI, VIX, BTC Dominance, OI, FR, LSR).
 * Экспортирует функции через window.marketMetrics.
 *
 * Skill: app/skills/file-protocol-cors-guard
 *
 * PRINCIPLES:
 * - Чистая логика без UI
 * - Fallback стратегия for VIX (3 источника + Cloudflare proxy)
 * - Кэширование VIX на 24 часа (TTL в cache-config.js)
 * - Глобальные переменные for совместимости с математическими моделями
 *
 * ПРОКСИРОВАНИЕ (КРИТИЧЕСКИ ВАЖНО):
 * - На file:// протоколе ВСЕ запросы ОБЯЗАТЕЛЬНО проксируются через Cloudflare Worker
 * - Fallback стратегия: Cloudflare proxy (file://) → прямые запросы (HTTP/HTTPS)
 * - Yahoo Finance, Stooq: через cloudflareConfig.getApiProxyEndpoint() на file://
 * - BTC Dominance (CoinGecko): через cloudflareConfig.getApiProxyEndpoint() на file://
 * - ЗАПРЕЩЕНО блокировать запросы на file:// с early return
 * - Details: app/skills/file-protocol-cors-guard
 *
 * ОСОБЕННОСТИ:
 * - VIX: кэширование 24ч + fallback (Yahoo Finance, Stooq, Alpha Vantage)
 * - FGI: alternative.me API
 * - BTC Dominance: CoinGecko API
 * - OI, FR, LSR: Binance Futures API
 *
 * REFERENCES:
 * - Конфигурация API: core/config/app-config.js
 * - Конфигурация кэша: core/cache/cache-config.js (vix-index: 24h)
 * - Cloudflare Config: core/config/cloudflare-config.js
 */

(function() {
    'use strict';

    // Глобальные переменные for хранения числовых значений метрик (совместимость с математическими моделями)
    let fgiVal = 0, vixVal = null, btcDomVal = 0, oiVal = 0, frVal = 0, lsrVal = 0;
    let vixAvailable = false;

    window.marketMetrics = {
        // Утилита for ограничения значения в диапазоне
        clamp(value, min, max) {
            if (value === null || value === undefined || isNaN(value)) return min;
            return Math.max(min, Math.min(max, parseFloat(value)));
        },

        // Утилита for безопасного преобразования в число
        safeNumber(value, defaultValue = 0) {
            if (value === null || value === undefined || value === '') return defaultValue;
            const num = parseFloat(value);
            return isNaN(num) ? defaultValue : num;
        },

        // Обновление глобальных переменных в window (совместимость с математическими моделями)
        updateWindowMetrics() {
            window.fgiVal = fgiVal;
            window.vixVal = vixVal;
            window.btcDomVal = btcDomVal;
            window.oiVal = oiVal;
            window.frVal = frVal;
            window.lsrVal = lsrVal;
            window.vixAvailable = vixAvailable;
        },

        // Получение FGI (Fear & Greed Index)
        // С кэшированием на 24 часа
        async fetchFGI(options = {}) {
            const force = options.forceRefresh || false;
            // Проверяем кэш (24 часа)
            if (window.cacheManager && !force) {
                const cached = await window.cacheManager.get('fear-greed-index');
                if (cached && cached.value !== null) {
                    fgiVal = cached.value;
                    this.updateWindowMetrics();
                    const originalSource = cached.source || 'Alternative.me';
                    console.log('FGI loaded из кэша:', fgiVal, 'исходный источник:', originalSource);
                    return { success: true, value: fgiVal.toString(), numericValue: fgiVal, source: originalSource };
                }
            }

            // Загружаем из API
            try {
                const response = await fetch('https://api.alternative.me/fng/?limit=1');
                const data = await response.json();
                fgiVal = this.clamp(parseInt(data?.data?.[0]?.value), 0, 100);
                this.updateWindowMetrics();

                // Сохраняем в кэш на 24 часа
                if (window.cacheManager) {
                    await window.cacheManager.set('fear-greed-index', { value: fgiVal, timestamp: Date.now(), source: 'Alternative.me' });
                }

                console.log('FGI успешно получен:', fgiVal, 'из Alternative.me');
                return { success: true, value: fgiVal.toString(), numericValue: fgiVal, source: 'Alternative.me' };
            } catch (error) {
                console.error('FGI fetch error:', error);
                fgiVal = 0;
                this.updateWindowMetrics();
                return { success: false, value: null, numericValue: 0 };
            }
        },

        // Получение VIX из нескольких источников (fallback стратегия)
        // С кэшированием на 24 часа
        async fetchVIX(options = {}) {
            const force = options.forceRefresh || false;
            // Проверяем кэш (24 часа)
            if (window.cacheManager && !force) {
                const cached = await window.cacheManager.get('vix-index');
                if (cached && cached.value !== null) {
                    // Если в кэше нет источника, загружаем заново из API
                    if (!cached.source) {
                        console.log('VIX: в кэше отсутствует источник, загружаем заново из API...');
                        // Удаляем кэш без источника и продолжаем загрузку из API
                        await window.cacheManager.delete('vix-index');
                    } else {
                        vixVal = cached.value;
                        vixAvailable = true;
                        this.updateWindowMetrics();
                        const originalSource = cached.source;
                        console.log('VIX loaded из кэша:', vixVal.toFixed(2), 'исходный источник:', originalSource);

                        // Показываем сообщение об источнике (исходный источник, не "cache")
                        if (window.messagesStore) {
                            const date = new Date(cached.timestamp).toLocaleString('ru-RU', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                            });
                            window.messagesStore.addMessage({
                                type: 'info',
                                text: `VIX: ${vixVal.toFixed(2)} (из кэша, исходный источник: ${originalSource}, ${date})`,
                                scope: 'global',
                                duration: 5000
                            });
                        }

                        return { success: true, value: vixVal.toFixed(2), numericValue: vixVal, source: originalSource };
                    }
                }
            }

            // Определяем, нужен ли прокси (file://, GitHub Pages, или localhost)
            const isFileProtocol = window.location.protocol === 'file:' || 
                                   window.location.hostname.includes('github.io') || 
                                   window.location.hostname === 'localhost' || 
                                   window.location.hostname === '127.0.0.1';

            const sources = [
                // Yahoo Finance через Cloudflare Worker proxy (for file://)
                async () => {
                    if (isFileProtocol && window.cloudflareConfig) {
                        try {
                            const url = window.cloudflareConfig.getApiProxyEndpoint(
                                'yahooFinance',
                                '/v8/finance/chart/%5EVIX',
                                { interval: '1d', range: '1d' }
                            );
                            const resp = await fetch(url);
                            const data = await resp.json();
                            const value = this.safeNumber(data?.chart?.result?.[0]?.meta?.regularMarketPrice, null);
                            if (value !== null) {
                                return { value, sourceName: 'Yahoo Finance (Cloudflare proxy)' };
                            }
                        } catch (err) {
                            console.warn('VIX: Cloudflare proxy (Yahoo Finance) failed:', err);
                        }
                    }
                    return null;
                },
                // Yahoo Finance (прямой запрос for HTTP/HTTPS)
                async () => {
                    if (isFileProtocol) return null; // только for HTTP/HTTPS
                    try {
                        const url = 'https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=1d';
                        const resp = await fetch(url);
                        const data = await resp.json();
                        const value = this.safeNumber(data?.chart?.result?.[0]?.meta?.regularMarketPrice, null);
                        if (value !== null) {
                            return { value, sourceName: 'Yahoo Finance' };
                        }
                    } catch (err) {
                        console.warn('VIX: Yahoo Finance direct failed:', err);
                    }
                    return null;
                },
                // Stooq через Cloudflare Worker proxy (for file://)
                async () => {
                    if (isFileProtocol && window.cloudflareConfig) {
                        try {
                            const url = window.cloudflareConfig.getApiProxyEndpoint(
                                'stooq',
                                '/q/d/l/',
                                { s: '^vix', i: 'd' }
                            );
                            const resp = await fetch(url);
                            const text = await resp.text();
                            const lines = text.trim().split('\n');
                            const last = lines[lines.length - 1]?.split(',');
                            const value = this.safeNumber(last ? parseFloat(last[4]) : null, null);
                            if (value !== null) {
                                return { value, sourceName: 'Stooq (Cloudflare proxy)' };
                            }
                        } catch (err) {
                            console.warn('VIX: Cloudflare proxy (Stooq) failed:', err);
                        }
                    }
                    return null;
                },
                // Stooq (прямой запрос for HTTP/HTTPS)
                async () => {
                    if (isFileProtocol) return null;
                    try {
                        const resp = await fetch('https://stooq.com/q/d/l/?s=^vix&i=d');
                        const text = await resp.text();
                        const lines = text.trim().split('\n');
                        const last = lines[lines.length - 1]?.split(',');
                        const value = this.safeNumber(last ? parseFloat(last[4]) : null, null);
                        if (value !== null) {
                            return { value, sourceName: 'Stooq' };
                        }
                    } catch (err) {
                        console.warn('VIX: Stooq direct failed:', err);
                    }
                    return null;
                },
                // Alpha Vantage (прямой запрос for HTTP/HTTPS, требует API ключ)
                async () => {
                    if (isFileProtocol) return null;
                    try {
                        const resp = await fetch('https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=VIX&apikey=demo');
                        const data = await resp.json();
                        const series = data['Time Series (Daily)'];
                        const lastKey = series ? Object.keys(series)[0] : null;
                        const value = this.safeNumber(lastKey ? parseFloat(series[lastKey]['4. close']) : null, null);
                        if (value !== null) {
                            return { value, sourceName: 'Alpha Vantage' };
                        }
                    } catch (err) {
                        console.warn('VIX: Alpha Vantage failed:', err);
                    }
                    return null;
                }
            ];

            for (const getter of sources) {
                try {
                    const result = await getter.call(this);
                    if (result && result.value !== null && Number.isFinite(result.value) && result.value > 0 && result.value < 1000) {
                        vixVal = result.value;
                        vixAvailable = true;
                        this.updateWindowMetrics();

                        // Сохраняем в кэш на 24 часа
                        if (window.cacheManager) {
                            await window.cacheManager.set('vix-index', { value: result.value, timestamp: Date.now(), source: result.sourceName });
                        }

                        console.log('VIX успешно получен:', result.value.toFixed(2), 'из', result.sourceName);

                        // Показываем сообщение об источнике
                        if (window.messagesStore) {
                            window.messagesStore.addMessage({
                                type: 'success',
                                text: `VIX обновлен из ${result.sourceName}: ${result.value.toFixed(2)}`,
                                scope: 'global',
                                duration: 5000
                            });
                        }

                        return { success: true, value: result.value.toFixed(2), numericValue: result.value, source: result.sourceName };
                    }
                } catch (error) {
                    // Пробуем следующий источник
                }
            }
            vixVal = null;
            vixAvailable = false;
            this.updateWindowMetrics();
            return { success: false, value: null, numericValue: null };
        },

        // Получение BTC Dominance
        async fetchBTCDominance(options = {}) {
            const force = options.forceRefresh || false;
            if (window.requestRegistry && !force) {
                const minInterval = window.ssot?.getMarketMetricsIntervalMs?.() || 4 * 60 * 60 * 1000;
                if (!window.requestRegistry.isAllowed('coingecko', 'global', {}, minInterval)) {
                    if (window.cacheManager) {
                        const cached = await window.cacheManager.get('btc-dominance');
                        if (cached && cached.value) {
                            btcDomVal = cached.value;
                            this.updateWindowMetrics();
                            return { success: true, value: btcDomVal.toFixed(2) + '%', numericValue: btcDomVal };
                        }
                    }
                }
            }

            try {
                const isFile = window.location && (window.location.protocol === 'file:' || 
                               window.location.hostname.includes('github.io') || 
                               window.location.hostname === 'localhost' || 
                               window.location.hostname === '127.0.0.1');
                let url;

                // Если file:// — используем Cloudflare Worker proxy
                if (isFile && window.cloudflareConfig) {
                    url = window.cloudflareConfig.getApiProxyEndpoint('coingecko', '/global');
                } else {
                    // Прямой запрос к CoinGecko for HTTP/HTTPS
                    url = 'https://api.coingecko.com/api/v3/global';
                }

                const response = await fetch(url);
                const data = await response.json();
                btcDomVal = this.clamp(parseFloat(data?.data?.market_cap_percentage?.btc), 0, 100);
                this.updateWindowMetrics();

                // Сохраняем в журнал и кэш
                if (window.requestRegistry) {
                    window.requestRegistry.recordCall('coingecko', 'global', {}, 200, true);
                }
                if (window.cacheManager) {
                    await window.cacheManager.set('btc-dominance', { value: btcDomVal, timestamp: Date.now() });
                }

                return { success: true, value: btcDomVal.toFixed(2) + '%', numericValue: btcDomVal };
            } catch (error) {
                console.error('BTC Dominance fetch error:', error);
                if (window.requestRegistry) {
                    window.requestRegistry.recordCall('coingecko', 'global', {}, 500, false);
                }
                btcDomVal = 0;
                this.updateWindowMetrics();
                return { success: false, value: null, numericValue: 0 };
            }
        },

        // Получение Open Interest
        async fetchOpenInterest(options = {}) {
            const force = options.forceRefresh || false;
            if (window.requestRegistry && !force) {
                const minInterval = window.ssot?.getMarketMetricsIntervalMs?.() || 4 * 60 * 60 * 1000;
                if (!window.requestRegistry.isAllowed('binance', 'openInterest', {}, minInterval)) {
                    if (window.cacheManager) {
                        const cached = await window.cacheManager.get('open-interest');
                        if (cached && cached.value) {
                            oiVal = cached.value;
                            this.updateWindowMetrics();
                            return { success: true, value: '$' + oiVal.toFixed(2), numericValue: oiVal };
                        }
                    }
                }
            }

            try {
                const response = await fetch('https://fapi.binance.com/futures/data/openInterestHist?symbol=BTCUSDT&period=5m&limit=1');
                const data = await response.json();
                oiVal = this.safeNumber(data?.[0]?.sumOpenInterestValue, 0);
                this.updateWindowMetrics();

                if (window.requestRegistry) {
                    window.requestRegistry.recordCall('binance', 'openInterest', {}, 200, true);
                }
                if (window.cacheManager) {
                    await window.cacheManager.set('open-interest', { value: oiVal, timestamp: Date.now() });
                }

                return {
                    success: true,
                    value: oiVal ? ('$' + oiVal.toFixed(2)) : '—',
                    numericValue: oiVal
                };
            } catch (error) {
                console.error('Open Interest fetch error:', error);
                if (window.requestRegistry) {
                    window.requestRegistry.recordCall('binance', 'openInterest', {}, 500, false);
                }
                oiVal = 0;
                this.updateWindowMetrics();
                return { success: false, value: null, numericValue: 0 };
            }
        },

        // Получение Funding Rate
        async fetchFundingRate(options = {}) {
            const force = options.forceRefresh || false;
            if (window.requestRegistry && !force) {
                const minInterval = window.ssot?.getMarketMetricsIntervalMs?.() || 4 * 60 * 60 * 1000;
                if (!window.requestRegistry.isAllowed('binance', 'fundingRate', {}, minInterval)) {
                    if (window.cacheManager) {
                        const cached = await window.cacheManager.get('funding-rate');
                        if (cached && cached.value) {
                            frVal = cached.value;
                            this.updateWindowMetrics();
                            return { success: true, value: frVal.toFixed(4) + '%', numericValue: frVal };
                        }
                    }
                }
            }

            try {
                const response = await fetch('https://fapi.binance.com/fapi/v1/premiumIndex');
                const data = await response.json();
                frVal = Array.isArray(data) && data.length > 0
                    ? data.reduce((sum, item) => sum + this.safeNumber(item.lastFundingRate, 0), 0) / data.length * 100
                    : 0;
                this.updateWindowMetrics();

                if (window.requestRegistry) {
                    window.requestRegistry.recordCall('binance', 'fundingRate', {}, 200, true);
                }
                if (window.cacheManager) {
                    await window.cacheManager.set('funding-rate', { value: frVal, timestamp: Date.now() });
                }

                return { success: true, value: frVal.toFixed(4) + '%', numericValue: frVal };
            } catch (error) {
                console.error('Funding Rate fetch error:', error);
                if (window.requestRegistry) {
                    window.requestRegistry.recordCall('binance', 'fundingRate', {}, 500, false);
                }
                frVal = 0;
                this.updateWindowMetrics();
                return { success: false, value: null, numericValue: 0 };
            }
        },

        // Получение Long/Short Ratio
        async fetchLongShortRatio(options = {}) {
            const force = options.forceRefresh || false;
            if (window.requestRegistry && !force) {
                const minInterval = window.ssot?.getMarketMetricsIntervalMs?.() || 4 * 60 * 60 * 1000;
                if (!window.requestRegistry.isAllowed('binance', 'longShortRatio', {}, minInterval)) {
                    if (window.cacheManager) {
                        const cached = await window.cacheManager.get('long-short-ratio');
                        if (cached && cached.value) {
                            lsrVal = cached.value;
                            this.updateWindowMetrics();
                            return { success: true, value: lsrVal.toFixed(2), numericValue: lsrVal };
                        }
                    }
                }
            }

            try {
                const response = await fetch('https://fapi.binance.com/futures/data/topLongShortPositionRatio?symbol=BTCUSDT&period=5m&limit=1');
                const data = await response.json();
                lsrVal = this.safeNumber(data?.[0]?.longShortRatio, 1);
                this.updateWindowMetrics();

                if (window.requestRegistry) {
                    window.requestRegistry.recordCall('binance', 'longShortRatio', {}, 200, true);
                }
                if (window.cacheManager) {
                    await window.cacheManager.set('long-short-ratio', { value: lsrVal, timestamp: Date.now() });
                }

                return { success: true, value: lsrVal.toFixed(2), numericValue: lsrVal };
            } catch (error) {
                console.error('Long/Short Ratio fetch error:', error);
                if (window.requestRegistry) {
                    window.requestRegistry.recordCall('binance', 'longShortRatio', {}, 500, false);
                }
                lsrVal = 0;
                this.updateWindowMetrics();
                return { success: false, value: null, numericValue: 0 };
            }
        },

        // Загрузка всех метрик одновременно
        async fetchAll(options = {}) {
            const force = options.forceRefresh || false;

            // Если принудительно, очищаем журнал for этих метрик
            if (force && window.requestRegistry) {
                // Мы не можем просто удалить из журнала, но можем сделать так,
                // чтобы fetch функции игнорировали проверку.
                // Но проще просто передать force дальше.
            }

            const [fgi, vix, btcDom, oi, fr, lsr] = await Promise.all([
                this.fetchFGI({ forceRefresh: force }),
                this.fetchVIX({ forceRefresh: force }),
                this.fetchBTCDominance({ forceRefresh: force }),
                this.fetchOpenInterest({ forceRefresh: force }),
                this.fetchFundingRate({ forceRefresh: force }),
                this.fetchLongShortRatio({ forceRefresh: force })
            ]);

            // Обновляем window после всех загрузок
            this.updateWindowMetrics();

            return {
                fgi: fgi.success ? fgi.value : '—',
                fgiSource: fgi.source || null, // Источник данных FGI (for tooltip в футере)
                vix: vix.success ? vix.value : '—',
                vixSource: vix.source || null, // Источник данных VIX (for tooltip в футере)
                btcDom: btcDom.success ? btcDom.value : '—',
                oi: oi.success ? oi.value : '—',
                fr: fr.success ? fr.value : '—',
                lsr: lsr.success ? lsr.value : '—'
            };
        }
    };

    // Инициализируем window при загрузке модуля
    window.marketMetrics.updateWindowMetrics();

    console.log('market-metrics.js: initialized');
})();

