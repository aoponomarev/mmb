/**
 * #JS-MW2TvCHg
 * @description Single access point for AI provider (YandexGPT); switching and unified interface; provider in cacheManager 'ai-provider'.
 * @skill id:sk-bb7c8e
 * @skill-anchor id:sk-bb7c8e #for-layer-separation
 * @skill-anchor id:sk-224210 #for-data-provider-interface
 * @skill-anchor id:sk-d76b68 #for-ai-provider-abstraction #for-ai-manager-switching
 *
 * USAGE:
 * const response = await window.aiProviderManager.sendRequest(messages);
 * await window.aiProviderManager.setProvider('yandex');
 * const provider = await window.aiProviderManager.getCurrentProvider();
 */
(function() {
    'use strict';

    /**
     * AI providers manager
     */
    class AIProviderManager {
        constructor() {
            this.providers = {};
            this.defaultProvider = 'yandex'; // Yandex by default
            /** Only these IDs are valid AI providers; e.g. "github" is for token/metadata upload, not AI. */
            this.validProviderIds = ['yandex'];
            // Flag: KV request already executed this session (success or not).
            // Prevents repeated HTTP requests on each getApiKey call.
            this._kvFetchAttempted = false;
            this._kvFetchPromise = null; // deduplicate parallel calls
        }

        async resolveSettingsToken() {
            try {
                if (window.authClient && typeof window.authClient.getAccessToken === 'function') {
                    const authTokenData = await window.authClient.getAccessToken();
                    const jwt = (authTokenData?.access_token || '').trim();
                    if (jwt) {
                        return jwt;
                    }
                }
            } catch (_) {}

            const stored = (localStorage.getItem('app_github_token') || '').trim();
            if (stored) return stored;

            try {
                const backupRaw = localStorage.getItem('app_api_settings_backup_v1');
                if (backupRaw) {
                    const backup = JSON.parse(backupRaw);
                    const backupToken = (backup?.githubToken || '').trim();
                    if (backupToken) {
                        localStorage.setItem('app_github_token', backupToken);
                        return backupToken;
                    }
                }
            } catch (_) {}

            return '';
        }

        /**
         * Initialize providers
         * Called after all providers are loaded
         */
        init() {
            if (window.YandexProvider) {
                this.providers['yandex'] = new window.YandexProvider();
            }

            // Validate current provider in cache
            this.validateCurrentProvider();
        }

        /**
         * Validate current provider and reset to default if stored value is not a registered AI provider.
         */
        async validateCurrentProvider() {
            try {
                const providerName = await window.cacheManager.get('ai-provider');
                const isValid = providerName && this.validProviderIds.includes(providerName) && this.providers[providerName];
                if (providerName && !isValid) {
                    console.warn(`ai-provider-manager: provider "${providerName}" is not available (only ${this.validProviderIds.join(', ')}), reset to "${this.defaultProvider}"`);
                    await window.cacheManager.set('ai-provider', this.defaultProvider);
                }
            } catch (e) {
                // Ignore errors at initialization
            }
        }

        /**
         * Get current active provider
         * @returns {Promise<BaseAIProvider>}
         */
        async getCurrentProvider() {
            const providerName = await this.getCurrentProviderName();
            return this.providers[providerName] || this.providers[this.defaultProvider];
        }

        /**
         * Get current provider name
         * @returns {Promise<string>}
         */
        async getCurrentProviderName() {
            try {
                const providerName = await window.cacheManager.get('ai-provider');
                return providerName || this.defaultProvider;
            } catch (error) {
                console.warn('ai-provider-manager: ошибка получения провайдера, using дефолтный', error);
                return this.defaultProvider;
            }
        }

        /**
         * Set active provider
         * @param {string} providerName - 'yandex'
         * @returns {Promise<void>}
         */
        async setProvider(providerName) {
            if (!this.providers[providerName]) {
                throw new Error(`Провайдер ${providerName} не найден`);
            }
            await window.cacheManager.set('ai-provider', providerName);
        }

        /**
         * Send request via current provider
         * @param {Array<Object>} messages - Messages array {role: 'user'|'assistant', content: string}
         * @param {Object} options - Additional options (temperature, maxTokens, etc.)
         * @returns {Promise<string>} Response text
         * @throws {Error} On request error or missing config
         */
        async sendRequest(messages, options = {}) {
            const provider = await this.getCurrentProvider();
            const providerName = await this.getCurrentProviderName();

            // Get API key and model for current provider
            const apiKey = await this.getApiKey(providerName);
            const model = await this.getModel(providerName);

            if (!apiKey) {
                throw new Error(`API ключ for ${providerName} not configured`);
            }

            const result = await provider.sendRequest(apiKey, model, messages, options);

            return result;
        }

        /**
         * Get API key for provider
         * @param {string} providerName - 'yandex'
         * @returns {Promise<string|null>}
         */
        async getApiKey(providerName) {
            let keyName = null;
            if (providerName === 'yandex') keyName = 'yandex-api-key';

            if (!keyName) return null;

            try {
                const apiKey = await window.cacheManager.get(keyName);
                if (apiKey) return apiKey;
            } catch (error) {
                console.warn(`ai-provider-manager: read error ключа ${providerName} из cacheManager`, error);
            }

            // Skill anchor: fallback to Cloudflare KV — keys survive cache reset.
            // Request made only ONCE per session (flag _kvFetchAttempted).
            // Parallel calls deduplicated via _kvFetchPromise.
            if (this._kvFetchAttempted) {
                // KV already polled — read only from cacheManager
                try {
                    return await window.cacheManager.get(keyName) || null;
                } catch (_) { return null; }
            }

            if (this._kvFetchPromise) {
                // Parallel call in progress — wait for its result
                await this._kvFetchPromise;
                try {
                    return await window.cacheManager.get(keyName) || null;
                } catch (_) { return null; }
            }

            this._kvFetchPromise = (async () => {
                try {
                    const token = await this.resolveSettingsToken();
                    if (!token) return;

                    const base = window.cloudflareConfig?.getAuthBaseUrl?.()
                        || window.cloudflareConfig?.getWorkersBaseUrl?.()
                        || 'https://app-api.ponomarev-ux.workers.dev';
                    const resp = await fetch(`${base}/api/settings`, {
                        headers: { 'Authorization': `Bearer ${token}` },
                        signal: AbortSignal.timeout(4000)
                    });
                    if (!resp.ok) return;

                    const json = await resp.json();
                    const d = json.data;
                    if (!d) return;

                    // Save all from KV to cacheManager to avoid repeat fetch
                    const saves = [];
                    if (d.yandexApiKey)   saves.push(window.cacheManager.set('yandex-api-key', d.yandexApiKey));
                    if (d.yandexFolderId) saves.push(window.cacheManager.set('yandex-folder-id', d.yandexFolderId));
                    if (d.yandexModel)    saves.push(window.cacheManager.set('yandex-model', d.yandexModel));
                    if (d.provider)       saves.push(window.cacheManager.set('ai-provider', d.provider));
                    if (d.apiBaseUrl)     saves.push(window.cacheManager.set('postgres-api-base-url', d.apiBaseUrl));
                    await Promise.all(saves);
                    console.log('ai-provider-manager: настройки восстановлены из Cloudflare KV');
                    // Notify subscribers (e.g. app-footer) that key is ready
                    window.dispatchEvent(new CustomEvent('ai-api-key-ready', { detail: { provider: providerName } }));
                    if (window.fallbackMonitor && typeof window.fallbackMonitor.notify === 'function') {
                        window.fallbackMonitor.notify({
                            source: 'aiProviderManager.getApiKey',
                            phase: 'cloudflare-kv-success',
                            details: `provider=${providerName}`
                        });
                    }
                } catch (kvErr) {
                    console.warn(`ai-provider-manager: KV fallback не удался:`, kvErr.message);
                    if (window.fallbackMonitor && typeof window.fallbackMonitor.notify === 'function') {
                        window.fallbackMonitor.notify({
                            source: 'aiProviderManager.getApiKey',
                            phase: 'cloudflare-kv-failed',
                            details: kvErr && kvErr.message ? kvErr.message : 'kv fallback failed'
                        });
                    }
                } finally {
                    this._kvFetchAttempted = true;
                    this._kvFetchPromise = null;
                }
            })();

            await this._kvFetchPromise;
            try {
                return await window.cacheManager.get(keyName) || null;
            } catch (_) { return null; }
        }

        /**
         * Get model for provider
         * @param {string} providerName - 'yandex'
         * @returns {Promise<string>}
         */
        async getModel(providerName) {
            const provider = this.providers[providerName];
            if (!provider) {
                return null;
            }

            const modelKey = 'yandex-model';
            try {
                const savedModel = await window.cacheManager.get(modelKey);
                return savedModel || provider.getDefaultModel();
            } catch (error) {
                console.warn(`ai-provider-manager: ошибка получения модели for ${providerName}`, error);
                return provider.getDefaultModel();
            }
        }

        /**
         * Get list of available models for provider
         * @param {string} providerName - 'yandex'
         * @returns {Array<Object>} [{ value: string, label: string }]
         */
        getAvailableModels(providerName) {
            const provider = this.providers[providerName];
            return provider ? provider.getAvailableModels() : [];
        }

        /**
         * Get list of all available providers
         * @returns {Array<Object>} [{ value: string, label: string, provider: BaseAIProvider }]
         */
        getAvailableProviders() {
            return Object.entries(this.providers).map(([name, provider]) => ({
                value: name,
                label: provider.getDisplayName(),
                provider: provider
            }));
        }

        /**
         * Get provider by name
         * @param {string} providerName
         * @returns {BaseAIProvider|null}
         */
        getProvider(providerName) {
            return this.providers[providerName] || null;
        }
    }

    // Create and export manager instance
    window.aiProviderManager = new AIProviderManager();

    // Initialize after all providers loaded
    // Call init() immediately as providers should already be loaded
    // (they load earlier via module system)
    if (window.YandexProvider) {
        window.aiProviderManager.init();
    } else {
        const checkProviders = setInterval(() => {
            if (window.YandexProvider) {
                window.aiProviderManager.init();
                clearInterval(checkProviders);
            }
        }, 50);
        setTimeout(() => {
            clearInterval(checkProviders);
        }, 5000);
    }

    console.log('ai-provider-manager.js: initialized');
})();

