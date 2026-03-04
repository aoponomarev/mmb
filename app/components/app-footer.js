/**
 * #JS-zB467gvM
 * @description Application footer: market metrics (FGI, VIX, BTC Dom, OI, FR, LSR), timezone, time, crypto news via AI.
 * @skill id:sk-e0b8f3
 * @skill-anchor id:sk-add9a6 #for-classes-add-remove
 * @skill-anchor id:sk-eeb23d #for-bootstrap-event-proxying
 * @skill-anchor id:sk-cb75ec #for-utility-availability-check
 *
 * DATA: theme from body, fixed bottom; fgi, vix, btcDom, oi, fr, lsr (+ Value); timezone, timeDisplay (ABBR:hh.mm); currentNewsIndex, currentNews, currentNewsTranslated. Metrics 3×/day (09/12/18 MSK).
 *
 * METHODS: fetchMarketIndices, getTime, getTimezoneAbbr, load/saveTimezone, openTimezoneModal, getNextUpdateTime, scheduleNextUpdate, formatOIMobile, formatValueMobile, fetchSingleCryptoNews, parseSingleNews, cleanMarkdown/cleanTranslation, save/loadNewsState, switchToNextNews, loadTranslationLanguage, updateTranslationLanguage.
 *
 * EVENTS: open-timezone-modal.
 */

window.appFooter = {
    template: '#app-footer-template',

    data() {
        return {
            uiState: window.uiState ? window.uiState.getState() : null,
            // String values for metrics
            fgi: '—',
            vix: '—',
            btcDom: '—',
            oi: '—',
            fr: '—',
            lsr: '—',

            // Numeric values for calculations
            fgiValue: null,
            vixValue: null,
            btcDomValue: null,
            oiValue: null,
            frValue: null,
            lsrValue: null,

            // Data sources for tooltip
            fgiSource: null,
            vixSource: null,

            // Time
            timezone: window.appConfig?.get('defaults.timezone', 'Europe/Moscow'),
            timeDisplay: 'MCK:--.--',

            // Timers
            updateTimer: null,
            timeUpdateTimer: null,

            // Crypto news
            currentNewsIndex: 0, // Index of current news (0-4)
            currentNews: '', // Currently displayed news
            currentNewsTranslated: '', // Translation of current news for tooltip
            translationLanguage: window.appConfig?.get('defaults.translationLanguage', 'ru'),
            fallbackCount: 0,
            fallbackLast: null,
            fallbackSubId: null,
            aiKeyMissingNotified: false
        };
    },

    methods: {
        // Load market metrics
        async fetchMarketIndices(options = {}) {
            if (!window.marketMetrics) {
                console.error('marketMetrics module not loaded');
                return;
            }

            try {
                const metrics = await window.marketMetrics.fetchAll(options);

                // Store string values
                this.fgi = metrics.fgi;
                this.vix = metrics.vix;
                this.btcDom = metrics.btcDom;
                this.oi = metrics.oi;
                this.fr = metrics.fr;
                this.lsr = metrics.lsr;

                // Store sources for tooltip
                this.fgiSource = metrics.fgiSource || null;
                this.vixSource = metrics.vixSource || null;

                // Parse numeric values
                this.fgiValue = metrics.fgi !== '—' ? parseFloat(metrics.fgi) : null;
                this.vixValue = metrics.vix !== '—' ? parseFloat(metrics.vix) : null;
                if (metrics.btcDom !== '—') {
                    this.btcDomValue = parseFloat(metrics.btcDom.replace('%', ''));
                } else {
                    this.btcDomValue = null;
                }
                if (metrics.oi !== '—') {
                    this.oiValue = parseFloat(metrics.oi.replace('$', ''));
                } else {
                    this.oiValue = null;
                }
                if (metrics.fr !== '—') {
                    this.frValue = parseFloat(metrics.fr.replace('%', ''));
                } else {
                    this.frValue = null;
                }
                this.lsrValue = metrics.lsr !== '—' ? parseFloat(metrics.lsr) : null;
            } catch (error) {
                console.error('Market indices fetch error:', error);
            }
        },

        // Get current time in selected timezone
        getTime() {
            try {
                const now = new Date();
                const formatter = new Intl.DateTimeFormat('en-US', {
                    timeZone: this.timezone,
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });
                const parts = formatter.formatToParts(now);
                const hours = parts.find(p => p.type === 'hour').value;
                const minutes = parts.find(p => p.type === 'minute').value;

                // Get timezone abbreviation
                const tzAbbr = this.getTimezoneAbbr();
                return `${tzAbbr}:${hours}.${minutes}`;
            } catch (error) {
                // Fallback to system time
                const now = new Date();
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                return `SYS:${hours}.${minutes}`;
            }
        },

        // Get timezone abbreviation
        getTimezoneAbbr() {
            const baseAbbr = window.appConfig?.getTimezoneAbbr
                ? window.appConfig.getTimezoneAbbr(this.timezone)
                : this.timezone.split('/').pop().substring(0, 3).toUpperCase();

            if (baseAbbr === 'MSK' || baseAbbr === 'МСК' || baseAbbr === 'MCK') {
                return this.currentLanguage === 'ru' ? 'МСК' : 'MSK';
            }

            return baseAbbr;
        },

        // Update time
        updateTime() {
            this.timeDisplay = this.getTime();
        },

        // Load timezone from cache
        async loadTimezone() {
            try {
                const savedTimezone = await window.cacheManager.get('timezone');
                if (savedTimezone && typeof savedTimezone === 'string') {
                    this.timezone = savedTimezone;
                }
            } catch (error) {
                console.error('Failed to load timezone:', error);
            }
        },

        // Update timezone (called externally after saving to cache)
        async saveTimezone(timezone) {
            this.timezone = timezone;
            this.updateTime();
        },

        // Update translation language (called externally after saving to cache)
        updateTranslationLanguage(language) {
            this.translationLanguage = language;
            // If current news exists, reload it with new language
            if (this.currentNews) {
                this.fetchSingleCryptoNews(this.currentNewsIndex).then(newsItem => {
                    if (newsItem) {
                        this.currentNews = newsItem.news;
                        this.currentNewsTranslated = newsItem.translation;
                    }
                });
            }
        },

        // Load translation language from cache
        async loadTranslationLanguage() {
            try {
                const savedLanguage = await window.cacheManager.get('translation-language');
                if (savedLanguage && typeof savedLanguage === 'string') {
                    this.translationLanguage = savedLanguage;
                }
            } catch (error) {
                console.error('Failed to load translation language:', error);
            }
        },

        // Open timezone selection modal
        openTimezoneModal() {
            this.$emit('open-timezone-modal');
        },

        // Calculate next update time (09:00, 12:00, 18:00 MSK)
        getNextUpdateTime() {
            const updateHours = window.appConfig?.get('defaults.marketUpdates.times', [9, 12, 18]);
            const now = new Date();

            try {
                // Get current time in MSK via Intl.DateTimeFormat
                const defaultTimezone = window.appConfig?.get('defaults.timezone', 'Europe/Moscow');
                const mskFormatter = new Intl.DateTimeFormat('en-US', {
                    timeZone: defaultTimezone,
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });
                const mskParts = mskFormatter.formatToParts(now);
                const mskYear = parseInt(mskParts.find(p => p.type === 'year').value);
                const mskMonth = parseInt(mskParts.find(p => p.type === 'month').value) - 1;
                const mskDay = parseInt(mskParts.find(p => p.type === 'day').value);
                const mskHour = parseInt(mskParts.find(p => p.type === 'hour').value);
                const mskMinute = parseInt(mskParts.find(p => p.type === 'minute').value);

                // Find next update time in MSK
                let nextHour = updateHours.find(h => h > mskHour);
                let nextDay = mskDay;
                if (!nextHour) {
                    // If past 18:00, next update is tomorrow at 09:00
                    nextHour = 9;
                    nextDay = mskDay + 1;
                }

                // Calculate millisecond difference between current MSK time and next update
                const currentMSKTime = mskHour * 60 + mskMinute; // Current time in minutes from day start
                const nextMSKTime = nextHour * 60; // Next update time in minutes
                const minutesDiff = (nextDay - mskDay) * 24 * 60 + (nextMSKTime - currentMSKTime);
                const delay = minutesDiff * 60 * 1000; // Convert to milliseconds

                const maxDelay = window.ssot && typeof window.ssot.getFooterMarketUpdateDelayMaxMs === 'function'
                    ? window.ssot.getFooterMarketUpdateDelayMaxMs()
                    : (window.cacheConfig?.getTTL('market-update-delay-max') || 24 * 60 * 60 * 1000);
                return delay > 0 ? delay : delay + maxDelay; // If negative, add 24 hours
            } catch (error) {
                // Fallback: update in 3 hours
                const fallbackTTL = window.ssot && typeof window.ssot.getFooterMarketUpdateFallbackMs === 'function'
                    ? window.ssot.getFooterMarketUpdateFallbackMs()
                    : (window.cacheConfig?.getTTL('market-update-fallback') || 3 * 60 * 60 * 1000);
                if (window.fallbackMonitor && typeof window.fallbackMonitor.notify === 'function') {
                    window.fallbackMonitor.notify({
                        source: 'appFooter.getNextUpdateTime',
                        phase: 'schedule-fallback',
                        details: `ttlMs=${fallbackTTL}`
                    });
                }
                return fallbackTTL;
            }
        },

        // Schedule next update
        scheduleNextUpdate() {
            if (this.updateTimer) {
                clearTimeout(this.updateTimer);
            }

            const delay = this.getNextUpdateTime();
            this.updateTimer = setTimeout(() => {
                this.fetchMarketIndices();
                this.scheduleNextUpdate(); // Schedule next
            }, delay);
        },

        // Format OI for mobile (compact format with billion suffix)
        formatOIMobile() {
            if (this.oiValue === null || this.oi === '—') {
                return '—';
            }
            // Convert to billions
            const billions = this.oiValue / 1000000000;
            return '$' + billions.toFixed(1) + 'B';
        },

        // Format value for mobile (round to tenths, except FR)
        formatValueMobile(value, originalValue) {
            if (value === null || originalValue === '—') {
                return '—';
            }
            return value.toFixed(1);
        },


        // Fetch single crypto news via AI provider (with translation)
        async fetchSingleCryptoNews(index, preResolvedApiKey = null) {
            if (!window.aiProviderManager) {
                return null;
            }

            // If key already resolved by caller — do not re-check.
            // Otherwise check ourselves (call from news rotator, not from startNewsLoad).
            if (!preResolvedApiKey) {
                try {
                    const provider = await window.aiProviderManager.getCurrentProvider();
                    const providerName = provider.getName();
                    const apiKey = await window.aiProviderManager.getApiKey(providerName);
                    if (!apiKey) {
                        if (!this.aiKeyMissingNotified) {
                            console.warn(
                                `app-footer: API key for ${providerName} not found. ` +
                                'Check AI API settings or access to /api/settings.'
                            );
                        }
                        this.aiKeyMissingNotified = true;
                        return null;
                    }
                    this.aiKeyMissingNotified = false;
                } catch (error) {
                    console.error('app-footer: API key check error:', error);
                    return null;
                }
            }

            try {
                const priority = ['most important', 'second most important', 'third most important', 'fourth most important', 'fifth most important'];

                // Get language name for prompt
                const languageNames = {
                    'ru': 'Russian',
                    'en': 'English',
                    'es': 'Spanish',
                    'fr': 'French',
                    'de': 'German',
                    'it': 'Italian',
                    'pt': 'Portuguese',
                    'zh': 'Chinese',
                    'ja': 'Japanese',
                    'ko': 'Korean'
                };
                const targetLanguage = languageNames[this.translationLanguage] || 'Russian';

                const prompt = `What is the ${priority[index]} cryptocurrency news today? Provide exactly one news item with the following structure:
- One headline sentence (concise summary)
- Two sentences that explain the details and context

CRITICAL: Format the response EXACTLY as follows (do not modify the markers):
---NEWS---
[Headline sentence. Detail sentence 1. Detail sentence 2.]
---TRANSLATION---
[${targetLanguage} translation]
---END---

IMPORTANT: Always include the markers ---NEWS---, ---TRANSLATION---, and ---END--- in your response.`;

                // Send request via current provider
                const response = await window.aiProviderManager.sendRequest(
                    [{ role: 'user', content: prompt }]
                );

                // Check for errors/limitations
                if (response && (response.toLowerCase().includes('cannot provide') || response.toLowerCase().includes('limited') || response.toLowerCase().includes('error'))) {
                    const providerName = await window.aiProviderManager.getCurrentProviderName();
                    console.warn(`${providerName} API returned error/limitation message for index`, index);
                    return null;
                }

                // Parse response
                const newsItem = this.parseSingleNews(response);
                return newsItem;
            } catch (error) {
                console.error('Failed to fetch crypto news for index', index, error);
                return null;
            }
        },

        // Parse single news with translation by explicit markers
        parseSingleNews(response) {
            if (!response) return null;

            // Find markers
            const newsIndex = response.indexOf('---NEWS---');
            const translationIndex = response.indexOf('---TRANSLATION---');
            const endIndex = response.indexOf('---END---');

            let newsText = null;
            let translationText = null;

            // Try parsing with markers
            if (newsIndex !== -1 && translationIndex !== -1) {
                // Extract English news
                newsText = response
                    .substring(newsIndex + '---NEWS---'.length, translationIndex)
                    .trim();

                // Extract translation
                translationText = endIndex !== -1
                    ? response.substring(translationIndex + '---TRANSLATION---'.length, endIndex).trim()
                    : response.substring(translationIndex + '---TRANSLATION---'.length).trim();
            } else {
                // Fallback: try parsing without markers
                // Look for separators: "Translation:" (or localized equivalent), or empty line
                const lines = response.split('\n').map(l => l.trim()).filter(l => l);

                // Try to find split between English text and translation
                let splitIndex = -1;
                for (let i = 0; i < lines.length; i++) {
                    const lowerLine = lines[i].toLowerCase();
                    if (lowerLine.includes('translation:') ||
                        lowerLine.includes('перевод:') ||
                        lowerLine.includes('русский:')) {
                        splitIndex = i;
                        break;
                    }
                }

                if (splitIndex > 0) {
                    // Split into news and translation
                    newsText = lines.slice(0, splitIndex).join(' ').trim();
                    translationText = lines.slice(splitIndex + 1).join(' ').trim();
                    // Remove "Translation:" prefix if present
                    translationText = translationText.replace(/^(translation|перевод|русский):\s*/i, '').trim();
                } else {
                    // If no split, try first 2-3 sentences as news and rest as translation
                    const sentences = response.split(/[.!?]+/).filter(s => s.trim());
                    if (sentences.length >= 4) {
                        // First 2-3 sentences — news
                        newsText = sentences.slice(0, 3).join('. ').trim() + '.';
                        // Rest — translation
                        translationText = sentences.slice(3).join('. ').trim() + '.';
                    } else {
                        // Last attempt: split in half
                        const midPoint = Math.floor(response.length / 2);
                        const spaceIndex = response.indexOf(' ', midPoint);
                        if (spaceIndex > 0) {
                            newsText = response.substring(0, spaceIndex).trim();
                            translationText = response.substring(spaceIndex).trim();
                        }
                    }
                }
            }

            // Strip artifacts from translation
            if (translationText) {
                translationText = this.cleanTranslation(translationText);
            }

            if (!newsText || !translationText) {
                console.warn('News markers not found and fallback parsing failed', {
                    hasMarkers: newsIndex !== -1 && translationIndex !== -1,
                    responseLength: response?.length,
                    responsePreview: response?.substring(0, 200)
                });
                return null;
            }

            return {
                news: this.cleanMarkdown(newsText),
                translation: this.cleanMarkdown(translationText)
            };
        },

        // Strip artifacts from translation
        cleanTranslation(text) {
            if (!text) return '';
            return text
                // Remove prompt example
                .replace(/^Заголовочное предложение\.\s*Первое предложение с деталями\.\s*Второе предложение с деталями\.\s*/i, '')
                // Remove "Russian translation:" or localized equivalent prefix
                .replace(/^(Российский перевод|Russian translation):\s*/i, '')
                // Remove leading newlines
                .replace(/^\s*[\r\n]+/, '')
                .trim();
        },

        // Strip markdown from news
        cleanMarkdown(text) {
            if (!text) return '';
            return text
                .replace(/\*\*/g, '') // Remove double asterisks (bold)
                .replace(/\*/g, '') // Remove single asterisks
                .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove markdown links [text](url) -> text
                .replace(/\[([^\]]+)\]/g, '$1') // Remove square brackets [text] -> text
                .replace(/\([^\)]+\)/g, '') // Remove parentheses with content
                .replace(/#{1,6}\s+/g, '') // Remove markdown headers
                .replace(/`([^`]+)`/g, '$1') // Remove backtick code
                .replace(/~~([^~]+)~~/g, '$1') // Remove strikethrough
                .replace(/\.(\d+)/g, '.') // Remove footnote numbers after dots (e.g. ".1" -> ".")
                .replace(/\.\s*[\d\[\]]+(?=\s|$)/g, '.') // Remove footnotes after dots with space
                .trim();
        },

        // Save current news state to cache (index and timestamp only)
        async saveCurrentNewsState() {
            try {
                const dataToSave = {
                    index: this.currentNewsIndex,
                    timestamp: Date.now()
                };
                await window.cacheManager.set('crypto-news-state', dataToSave);
            } catch (error) {
                console.error('Failed to save crypto news state:', error);
            }
        },

        // Load news state from cache
        async loadNewsState() {
            try {
                let savedData = null;

                savedData = await window.cacheManager.get('crypto-news-state');

                // Ensure state is not older than 24 hours
                if (savedData && typeof savedData.index === 'number') {
                    const age = Date.now() - (savedData.timestamp || 0);
                    const maxAge = window.ssot && typeof window.ssot.getFooterCryptoNewsCacheMaxAgeMs === 'function'
                        ? window.ssot.getFooterCryptoNewsCacheMaxAgeMs()
                        : (window.cacheConfig?.getTTL('crypto-news-cache-max-age') || 24 * 60 * 60 * 1000);

                    if (age < maxAge) {
                        return savedData.index;
                    }
                }
            } catch (error) {
                console.error('Failed to load crypto news state:', error);
            }
            return null;
        },

        // Switch to next (less significant) news
        async switchToNextNews() {
            // Switch to next news cyclically (0-4)
            const nextIndex = (this.currentNewsIndex + 1) % 5;

            // Load new news
            const newsItem = await this.fetchSingleCryptoNews(nextIndex);

            if (newsItem) {
                this.currentNewsIndex = nextIndex;
                this.currentNews = newsItem.news;
                this.currentNewsTranslated = newsItem.translation;
                await this.saveCurrentNewsState();
            } else {
                // If failed to load, show message
                console.warn('Failed to load next news item');
            }
        },

        syncFallbackState() {
            if (!window.fallbackMonitor) {
                this.fallbackCount = 0;
                this.fallbackLast = null;
                return;
            }
            this.fallbackCount = window.fallbackMonitor.getCount();
            const recent = window.fallbackMonitor.getRecent(1);
            this.fallbackLast = recent.length > 0 ? recent[0] : null;
        }
    },

    async mounted() {
        this.syncFallbackState();
        if (window.eventBus && typeof window.eventBus.on === 'function') {
            this.fallbackSubId = window.eventBus.on('fallback:used', () => this.syncFallbackState());
        }

        // Load timezone from cache
        await this.loadTimezone();

        // Load translation language from cache
        await this.loadTranslationLanguage();

        // Initialize time
        this.updateTime();
        // Update time every minute
        this.timeUpdateTimer = setInterval(() => {
            this.updateTime();
        }, 60 * 1000);

        // Load metrics when app unlocks
        // If window.appUnlocked undefined, consider app unlocked
        const isUnlocked = window.appUnlocked !== undefined ? window.appUnlocked : true;

        // Load news with already known key (no repeated KV requests).
        const startNewsLoad = async (apiKey) => {
            const savedIndex = await this.loadNewsState();
            const startIndex = savedIndex !== null ? savedIndex : 0;
            const newsItem = await this.fetchSingleCryptoNews(startIndex, apiKey);
            if (newsItem) {
                this.currentNewsIndex = startIndex;
                this.currentNews = newsItem.news;
                this.currentNewsTranslated = newsItem.translation;
                await this.saveCurrentNewsState();
            }
        };

        // Single entry point for getting key and loading news.
        // Algorithm: getApiKey waits for KV if needed → get key → load.
        // No timers, no races: getApiKey itself is the await point.
        const waitForApiKeyThenLoadNews = async () => {
            try {
                if (!window.aiProviderManager) return;
                const provider = await window.aiProviderManager.getCurrentProvider();
                const providerName = provider?.getName?.();
                if (!providerName) return;

                // getApiKey: first cache, then KV (once per session, await until done)
                const apiKey = await window.aiProviderManager.getApiKey(providerName);

                if (apiKey) {
                    this.aiKeyMissingNotified = false;
                    await startNewsLoad(apiKey);
                } else {
                    if (!this.aiKeyMissingNotified) {
                        console.warn('app-footer: AI API key not found, news loading skipped.');
                        this.aiKeyMissingNotified = true;
                    }
                }
            } catch (err) {
                console.error('app-footer: error waiting for API key:', err);
            }
        };

        if (isUnlocked) {
            this.fetchMarketIndices();
            this.scheduleNextUpdate();
            waitForApiKeyThenLoadNews();
        } else {
            const checkUnlocked = async () => {
                if (window.appUnlocked) {
                    this.fetchMarketIndices();
                    this.scheduleNextUpdate();
                    waitForApiKeyThenLoadNews();
                } else {
                    setTimeout(checkUnlocked, 100);
                }
            };
            checkUnlocked();
        }
    },

    watch: {
        currentLanguage(newLanguage, oldLanguage) {
            if (newLanguage !== oldLanguage) {
                this.updateTime();
            }
        }
    },
    computed: {
        // Centralized language for tooltip
        currentLanguage() {
            return this.uiState?.tooltips?.currentLanguage || 'ru';
        },

        // Reactive tooltips for footer metrics
        tooltipFgi() {
            if (!window.tooltipInterpreter) return '';
            const base = window.tooltipInterpreter.getTooltip('fgi', {
                value: this.fgiValue,
                lang: this.currentLanguage
            });
            return this.fgiSource ? `${base}\n© ${this.fgiSource}` : base;
        },
        tooltipVix() {
            if (!window.tooltipsConfig) return '';
            const lang = this.currentLanguage;
            const description = window.tooltipsConfig.getTooltip('metric.vix.description');
            const prefix = window.tooltipsConfig.getTooltip('ui.vix.sourcePrefix');
            if (this.vixSource) {
                return `${description}\n\n${prefix} ${this.vixSource}`;
            }
            return description;
        },
        tooltipBtcDom() {
            if (!window.tooltipInterpreter) return '';
            return window.tooltipInterpreter.getTooltip('btcDom', {
                value: this.btcDomValue,
                lang: this.currentLanguage
            });
        },
        tooltipOi() {
            if (!window.tooltipInterpreter) return '';
            return window.tooltipInterpreter.getTooltip('oi', {
                value: this.oiValue,
                lang: this.currentLanguage
            });
        },
        tooltipFr() {
            if (!window.tooltipInterpreter) return '';
            return window.tooltipInterpreter.getTooltip('fr', {
                value: this.frValue,
                lang: this.currentLanguage
            });
        },
        tooltipLsr() {
            if (!window.tooltipInterpreter) return '';
            return window.tooltipInterpreter.getTooltip('lsr', {
                value: this.lsrValue,
                lang: this.currentLanguage
            });
        },
        fallbackIndicatorTitle() {
            if (!this.fallbackLast) {
                return 'Fallback monitor: no events';
            }
            const time = new Date(this.fallbackLast.timestamp).toLocaleTimeString();
            const details = this.fallbackLast.details ? ` ${this.fallbackLast.details}` : '';
            return `Fallbacks: ${this.fallbackCount}. Last: ${this.fallbackLast.source}/${this.fallbackLast.phase} at ${time}.${details}`;
        }
    },

    beforeUnmount() {
        if (window.eventBus && typeof window.eventBus.off === 'function' && this.fallbackSubId) {
            window.eventBus.off('fallback:used', this.fallbackSubId);
            this.fallbackSubId = null;
        }
        if (this.updateTimer) {
            clearTimeout(this.updateTimer);
        }
        if (this.timeUpdateTimer) {
            clearInterval(this.timeUpdateTimer);
        }
    }
};

