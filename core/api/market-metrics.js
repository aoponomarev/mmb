/**
 * #JS-bU2BihXe
 * @description Standalone market metrics (FGI, VIX, BTC Dominance, OI, FR, LSR); exports via window.marketMetrics.
 * @skill id:sk-7cf3f7
 * @skill-anchor id:sk-bb7c8e #for-layer-separation
 * @skill-anchor id:sk-224210 #for-data-provider-interface
 * @skill-anchor id:sk-3c832d #for-market-metrics-cache-fallback
 *
 * FEATURES:
     * - VIX: 4h caching + fallback (Yahoo Finance, Stooq VI.C, Alpha Vantage)
 * - FGI: alternative.me API
 * - BTC Dominance: CoinGecko API
 * - OI, FR, LSR: Binance Futures API
 */

(function() {
    'use strict';

    // Global vars for metric values (math model compatibility)
    let fgiVal = 0, vixVal = null, btcDomVal = 0, oiVal = 0, frVal = 0, lsrVal = 0;
    let vixAvailable = false;

    window.marketMetrics = {
        // Utility to clamp value in range
        clamp(value, min, max) {
            if (value === null || value === undefined || isNaN(value)) return min;
            return Math.max(min, Math.min(max, parseFloat(value)));
        },

        // Utility for safe number conversion
        safeNumber(value, defaultValue = 0) {
            if (value === null || value === undefined || value === '') return defaultValue;
            const num = parseFloat(value);
            return isNaN(num) ? defaultValue : num;
        },

        // Update window globals (math model compatibility)
        updateWindowMetrics() {
            window.fgiVal = fgiVal;
            window.vixVal = vixVal;
            window.btcDomVal = btcDomVal;
            window.oiVal = oiVal;
            window.frVal = frVal;
            window.lsrVal = lsrVal;
            window.vixAvailable = vixAvailable;
        },

        // Fetch FGI (Fear & Greed Index)
        // Strategy:
        // - Normal path: 24h cache; if cache hit and live not needed — silent.
        // - On live success: update cache and return fresh value.
        // - On live failure: if cache exists, use cached value and inform user via messagesStore.
        async fetchFGI(options = {}) {
            const force = options.forceRefresh || false;
            // Check cache (24 hours)
            if (window.cacheManager && !force) {
                const cached = await window.cacheManager.get('fear-greed-index');
                if (cached && cached.value !== null) {
                    fgiVal = cached.value;
                    this.updateWindowMetrics();
                    const originalSource = cached.source || 'Alternative.me';
                    console.log('FGI loaded из кэша:', fgiVal, 'исходный source:', originalSource);
                    return { success: true, value: fgiVal.toString(), numericValue: fgiVal, source: originalSource };
                }
            }

            // Fetch from API
            try {
                const response = await fetch('https://api.alternative.me/fng/?limit=1');
                const data = await response.json();
                fgiVal = this.clamp(parseInt(data?.data?.[0]?.value), 0, 100);
                this.updateWindowMetrics();

                // Save to cache for 24 hours
                if (window.cacheManager) {
                    await window.cacheManager.set('fear-greed-index', { value: fgiVal, timestamp: Date.now(), source: 'Alternative.me' });
                }

                console.log('FGI успешно получен:', fgiVal, 'из Alternative.me');
                return { success: true, value: fgiVal.toString(), numericValue: fgiVal, source: 'Alternative.me' };
            } catch (error) {
                console.error('FGI fetch error:', error);
                // On live failure, try using cached value as fallback
                if (window.cacheManager) {
                    const cached = await window.cacheManager.get('fear-greed-index');
                    if (cached && cached.value !== null) {
                        fgiVal = cached.value;
                        this.updateWindowMetrics();
                        const originalSource = cached.source || 'Alternative.me';
                        const date = cached.timestamp
                            ? new Date(cached.timestamp).toLocaleString('ru-RU', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                              })
                            : 'неизвестно';
                        const errorSuffix = error ? `; ошибка live: ${error.message || String(error)}` : '';
                        if (window.messagesStore) {
                            window.messagesStore.addMessage({
                                type: 'info',
                                text: `FGI: ${fgiVal} (из кэша, live-источник недоступен; исходный source: ${originalSource}, ${date}${errorSuffix})`,
                                scope: 'global',
                                duration: 7000
                            });
                        }
                        return { success: true, value: fgiVal.toString(), numericValue: fgiVal, source: originalSource };
                    }
                }
                // No cache fallback available
                fgiVal = 0;
                this.updateWindowMetrics();
                return { success: false, value: null, numericValue: 0 };
            }
        },

        // Fetch VIX from multiple sources (fallback strategy)
        // Strategy:
        // 1) Try live sources (Yahoo via Cloudflare proxy, Yahoo direct, Stooq, Alpha Vantage).
        // 2) On live success: update cache (4h TTL, see cache-config.js: vix-index) and show one success message.
        // 3) If ALL live sources fail but cache exists: use cache as fallback and show info that live is unavailable.
        // 4) If neither live nor cache works: mark VIX as unavailable, no cache.
        async fetchVIX(options = {}) {
            const force = options.forceRefresh || false;

            // Determine if proxy needed (file://, GitHub Pages, or localhost)
            const isFileProtocol = window.location.protocol === 'file:' || 
                                   window.location.hostname.includes('github.io') || 
                                   window.location.hostname === 'localhost' || 
                                   window.location.hostname === '127.0.0.1';

            const sources = [
                // Yahoo Finance via Cloudflare Worker proxy (for file://)
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
                // Yahoo Finance (direct request for HTTP/HTTPS)
                async () => {
                    if (isFileProtocol) return null; // only for HTTP/HTTPS
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
                // Stooq VI.C via Cloudflare Worker proxy (for file://)
                async () => {
                    if (isFileProtocol && window.cloudflareConfig) {
                        try {
                            const url = window.cloudflareConfig.getApiProxyEndpoint(
                                'stooq',
                                '/q/d/l/',
                                { s: 'vi.c', i: 'd' }
                            );
                            const resp = await fetch(url);
                            const text = await resp.text();
                            if (text.includes('No data') || text.includes('N/A')) return null;
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
                // Stooq VI.C (direct request for HTTP/HTTPS)
                async () => {
                    if (isFileProtocol) return null;
                    try {
                        const resp = await fetch('https://stooq.com/q/d/l/?s=vi.c&i=d');
                        const text = await resp.text();
                        if (text.includes('No data') || text.includes('N/A')) return null;
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
                // Alpha Vantage (direct request for HTTP/HTTPS, requires API key)
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

            const MAX_SILENT_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours window for silent updates
            let lastLiveError = null;
            let triedLive = false;

            for (const getter of sources) {
                try {
                    const result = await getter.call(this);
                    if (result && result.value !== null && Number.isFinite(result.value) && result.value > 0 && result.value < 1000) {
                        vixVal = result.value;
                        vixAvailable = true;
                        this.updateWindowMetrics();

                        const fetchedAt = Date.now();

                        // Save to cache (TTL 4h via cache-config)
                        if (window.cacheManager) {
                            await window.cacheManager.set('vix-index', {
                                value: result.value,
                                timestamp: fetchedAt,
                                source: result.sourceName
                            });
                        }

                        console.log('VIX успешно получен:', result.value.toFixed(2), 'из', result.sourceName);

                        // Build human-readable source + timestamp for message
                        let sourceLabel = result.sourceName || 'Unknown source';
                        let baseSource = sourceLabel;
                        let qualifier = '';
                        const match = sourceLabel.match(/^(.+?) \((.+)\)$/);
                        if (match) {
                            baseSource = match[1];
                            qualifier = match[2];
                        }

                        const dateStr = new Date(fetchedAt).toLocaleString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                        });

                        const formattedSource =
                            qualifier
                                ? `${baseSource} ${dateStr} (${qualifier})`
                                : `${baseSource} ${dateStr}`;

                        // Show source message with timestamp only if data is older than 2 hours
                        const ageMs = Date.now() - fetchedAt;
                        if (ageMs > MAX_SILENT_AGE_MS && window.messagesStore) {
                            window.messagesStore.addMessage({
                                type: 'success',
                                text: `VIX обновлен из ${formattedSource}: ${result.value.toFixed(2)}`,
                                scope: 'global',
                                duration: 5000
                            });
                        }

                        return { success: true, value: result.value.toFixed(2), numericValue: result.value, source: result.sourceName };
                    } else {
                        // Live call completed but returned invalid/empty data
                        triedLive = true;
                    }
                } catch (error) {
                    // Live call threw — remember that we tried and save last error
                    triedLive = true;
                    lastLiveError = error;
                    // Try next source
                }
            }

            // Live failed or returned invalid values: try cache as fallback
            if (window.cacheManager) {
                const cached = await window.cacheManager.get('vix-index');
                if (cached && cached.value !== null) {
                    // If cache has no source, just treat as anonymous cache
                    const originalSource = cached.source || 'cache-only';
                    vixVal = cached.value;
                    vixAvailable = true;
                    this.updateWindowMetrics();
                    console.warn('VIX: using cached fallback due to live source failure. Cached value:', vixVal.toFixed(2), 'source:', originalSource);

                    // Inform user only in fallback case (live failed), and only if cache is older than 2 hours.
                    const ageMs = Date.now() - (cached.timestamp || Date.now());
                    if (triedLive && ageMs > MAX_SILENT_AGE_MS && window.messagesStore) {
                        const date = cached.timestamp
                            ? new Date(cached.timestamp).toLocaleString('ru-RU', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                              })
                            : 'неизвестно';
                        const errorSuffix = lastLiveError ? `; последняя ошибка live: ${lastLiveError.message || String(lastLiveError)}` : '';
                        window.messagesStore.addMessage({
                            type: 'info',
                            text: `VIX: ${vixVal.toFixed(2)} (из кэша, live-источники недоступны; исходный source: ${originalSource}, ${date}${errorSuffix})`,
                            scope: 'global',
                            duration: 7000
                        });
                    }

                    return { success: true, value: vixVal.toFixed(2), numericValue: vixVal, source: originalSource };
                }
            }

            // No live data and no cache fallback
            vixVal = null;
            vixAvailable = false;
            this.updateWindowMetrics();
            return { success: false, value: null, numericValue: null };
        },

        // Fetch BTC Dominance
        // Strategy:
        // - Normal path: respect requestRegistry; if too frequent and cache exists — silent cache hit.
        // - On live success: update cache and return fresh value.
        // - On live failure: if cache exists, use cached value and inform user via messagesStore.
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

                // If file:// — use Cloudflare Worker proxy
                if (isFile && window.cloudflareConfig) {
                    url = window.cloudflareConfig.getApiProxyEndpoint('coingecko', '/global');
                } else {
                    // Direct request to CoinGecko for HTTP/HTTPS
                    url = 'https://api.coingecko.com/api/v3/global';
                }

                const response = await fetch(url);
                const data = await response.json();
                btcDomVal = this.clamp(parseFloat(data?.data?.market_cap_percentage?.btc), 0, 100);
                this.updateWindowMetrics();

                // Save to registry and cache
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
                // On live failure, try using cached value as fallback
                if (window.cacheManager) {
                    const cached = await window.cacheManager.get('btc-dominance');
                    if (cached && cached.value) {
                        btcDomVal = cached.value;
                        this.updateWindowMetrics();
                        const date = cached.timestamp
                            ? new Date(cached.timestamp).toLocaleString('ru-RU', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                              })
                            : 'неизвестно';
                        const errorSuffix = error ? `; ошибка live: ${error.message || String(error)}` : '';
                        if (window.messagesStore) {
                            window.messagesStore.addMessage({
                                type: 'info',
                                text: `BTC Dominance: ${btcDomVal.toFixed(2)}% (из кэша, live-источник недоступен; ${date}${errorSuffix})`,
                                scope: 'global',
                                duration: 7000
                            });
                        }
                        return { success: true, value: btcDomVal.toFixed(2) + '%', numericValue: btcDomVal };
                    }
                }
                btcDomVal = 0;
                this.updateWindowMetrics();
                return { success: false, value: null, numericValue: 0 };
            }
        },

        // Fetch Open Interest
        // Strategy similar to BTC Dominance: registry-aware, with cache fallback on live failure.
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

                // On live failure, try using cached value as fallback
                if (window.cacheManager) {
                    const cached = await window.cacheManager.get('open-interest');
                    if (cached && cached.value) {
                        oiVal = cached.value;
                        this.updateWindowMetrics();
                        const date = cached.timestamp
                            ? new Date(cached.timestamp).toLocaleString('ru-RU', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                              })
                            : 'неизвестно';
                        const errorSuffix = error ? `; ошибка live: ${error.message || String(error)}` : '';
                        if (window.messagesStore) {
                            window.messagesStore.addMessage({
                                type: 'info',
                                text: `OI: $${oiVal.toFixed(2)} (из кэша, live-источник недоступен; ${date}${errorSuffix})`,
                                scope: 'global',
                                duration: 7000
                            });
                        }
                        return {
                            success: true,
                            value: '$' + oiVal.toFixed(2),
                            numericValue: oiVal
                        };
                    }
                }

                oiVal = 0;
                this.updateWindowMetrics();
                return { success: false, value: null, numericValue: 0 };
            }
        },

        // Fetch Funding Rate
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

                // On live failure, try using cached value as fallback
                if (window.cacheManager) {
                    const cached = await window.cacheManager.get('funding-rate');
                    if (cached && cached.value) {
                        frVal = cached.value;
                        this.updateWindowMetrics();
                        const date = cached.timestamp
                            ? new Date(cached.timestamp).toLocaleString('ru-RU', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                              })
                            : 'неизвестно';
                        const errorSuffix = error ? `; ошибка live: ${error.message || String(error)}` : '';
                        if (window.messagesStore) {
                            window.messagesStore.addMessage({
                                type: 'info',
                                text: `FR: ${frVal.toFixed(4)}% (из кэша, live-источник недоступен; ${date}${errorSuffix})`,
                                scope: 'global',
                                duration: 7000
                            });
                        }
                        return { success: true, value: frVal.toFixed(4) + '%', numericValue: frVal };
                    }
                }

                frVal = 0;
                this.updateWindowMetrics();
                return { success: false, value: null, numericValue: 0 };
            }
        },

        // Fetch Long/Short Ratio
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

                // On live failure, try using cached value as fallback
                if (window.cacheManager) {
                    const cached = await window.cacheManager.get('long-short-ratio');
                    if (cached && cached.value) {
                        lsrVal = cached.value;
                        this.updateWindowMetrics();
                        const date = cached.timestamp
                            ? new Date(cached.timestamp).toLocaleString('ru-RU', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                              })
                            : 'неизвестно';
                        const errorSuffix = error ? `; ошибка live: ${error.message || String(error)}` : '';
                        if (window.messagesStore) {
                            window.messagesStore.addMessage({
                                type: 'info',
                                text: `LSR: ${lsrVal.toFixed(2)} (из кэша, live-источник недоступен; ${date}${errorSuffix})`,
                                scope: 'global',
                                duration: 7000
                            });
                        }
                        return { success: true, value: lsrVal.toFixed(2), numericValue: lsrVal };
                    }
                }

                lsrVal = 0;
                this.updateWindowMetrics();
                return { success: false, value: null, numericValue: 0 };
            }
        },

        // Load all metrics at once
        async fetchAll(options = {}) {
            const force = options.forceRefresh || false;

            // If force, clear registry for these metrics
            if (force && window.requestRegistry) {
            // Cannot simply remove from registry, but fetch functions
            // can ignore check. Simpler to just pass force through.
            }

            const [fgi, vix, btcDom, oi, fr, lsr] = await Promise.all([
                this.fetchFGI({ forceRefresh: force }),
                this.fetchVIX({ forceRefresh: force }),
                this.fetchBTCDominance({ forceRefresh: force }),
                this.fetchOpenInterest({ forceRefresh: force }),
                this.fetchFundingRate({ forceRefresh: force }),
                this.fetchLongShortRatio({ forceRefresh: force })
            ]);

            // Update window after all loads
            this.updateWindowMetrics();

            return {
                fgi: fgi.success ? fgi.value : '—',
                fgiSource: fgi.source || null, // FGI data source (for footer tooltip)
                vix: vix.success ? vix.value : '—',
                vixSource: vix.source || null, // VIX data source (for footer tooltip)
                btcDom: btcDom.success ? btcDom.value : '—',
                oi: oi.success ? oi.value : '—',
                fr: fr.success ? fr.value : '—',
                lsr: lsr.success ? lsr.value : '—'
            };
        }
    };

    // Initialize window on module load
    window.marketMetrics.updateWindowMetrics();

    console.log('market-metrics.js: initialized');
})();

