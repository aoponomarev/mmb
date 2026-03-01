/**
 * ================================================================================================
 * AI PROVIDER MANAGER - Менеджер for переключения между AI провайдерами
 * ================================================================================================
 *
 * PURPOSE: Единая точка доступа for работы с AI провайдером (YandexGPT).
 * Управляет переключением между провайдерами и предоставляет единый интерфейс.
 *
 * Skill: core/skills/api-layer
 *
 * PRINCIPLES:
 * - Единый интерфейс for всех провайдеров
 * - Автоматическое получение настроек (API ключ, модель) for текущего провайдера
 * - Кэширование переводов/новостей отдельно for каждого провайдера
 *
 * ОСОБЕННОСТИ:
 * - Дефолтный провайдер: YandexGPT
 * - Хранение текущего провайдера в cacheManager ('ai-provider')
 * - Хранение API ключей отдельно for каждого провайдера
 *
 * USAGE:
 * // Отправить запрос через текущий провайдер
 * const response = await window.aiProviderManager.sendRequest(messages);
 *
 * // Переключить провайдера
 * await window.aiProviderManager.setProvider('yandex');
 *
 * // Get текущий провайдер
 * const provider = await window.aiProviderManager.getCurrentProvider();
 *
 * REFERENCES:
 * - Провайдеры: core/api/ai-providers/
 * - Кэш-менеджер: core/cache/cache-manager.js
 */

(function() {
    'use strict';

    /**
     * Менеджер AI провайдеров
     */
    class AIProviderManager {
        constructor() {
            this.providers = {};
            this.defaultProvider = 'yandex'; // Яндекс по умолчанию
            // Флаг: KV-запрос уже был выполнен в этой сессии (успешно или нет).
            // Предотвращает повторные HTTP-запросы при каждом вызове getApiKey.
            this._kvFetchAttempted = false;
            this._kvFetchPromise = null; // дедупликация параллельных вызовов
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
         * Инициализация провайдеров
         * Вызывается после загрузки всех провайдеров
         */
        init() {
            if (window.YandexProvider) {
                this.providers['yandex'] = new window.YandexProvider();
            }

            // Проверяем валидность текущего провайдера в кэше
            this.validateCurrentProvider();
        }

        /**
         * Проверить валидность текущего провайдера и сбросить на дефолтный если нужно
         */
        async validateCurrentProvider() {
            try {
                const providerName = await window.cacheManager.get('ai-provider');
                if (providerName && !this.providers[providerName]) {
                    console.warn(`ai-provider-manager: провайдер "${providerName}" невалиден, сброс на "${this.defaultProvider}"`);
                    await window.cacheManager.set('ai-provider', this.defaultProvider);
                }
            } catch (e) {
                // Игнорируем ошибки at initialization
            }
        }

        /**
         * Get текущий активный провайдер
         * @returns {Promise<BaseAIProvider>}
         */
        async getCurrentProvider() {
            const providerName = await this.getCurrentProviderName();
            return this.providers[providerName] || this.providers[this.defaultProvider];
        }

        /**
         * Get имя текущего провайдера
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
         * Set активный провайдер
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
         * Отправить запрос через текущий провайдер
         * @param {Array<Object>} messages - Массив сообщений {role: 'user'|'assistant', content: string}
         * @param {Object} options - Дополнительные опции (temperature, maxTokens и т.д.)
         * @returns {Promise<string>} Текст ответа
         * @throws {Error} При ошибке запроса или отсутствии настроек
         */
        async sendRequest(messages, options = {}) {
            const provider = await this.getCurrentProvider();
            const providerName = await this.getCurrentProviderName();

            // Получаем API ключ и модель for текущего провайдера
            const apiKey = await this.getApiKey(providerName);
            const model = await this.getModel(providerName);

            if (!apiKey) {
                throw new Error(`API ключ for ${providerName} not configured`);
            }

            const result = await provider.sendRequest(apiKey, model, messages, options);

            return result;
        }

        /**
         * Get API ключ for провайдера
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
                console.warn(`ai-provider-manager: ошибка чтения ключа ${providerName} из cacheManager`, error);
            }

            // Skill anchor: fallback на Cloudflare KV — ключи не теряются при сбросе кэша.
            // Запрос делается только ОДИН РАЗ за сессию (флаг _kvFetchAttempted).
            // Параллельные вызовы дедуплицируются через _kvFetchPromise.
            if (this._kvFetchAttempted) {
                // KV уже опрашивался — повторно читаем только из cacheManager
                try {
                    return await window.cacheManager.get(keyName) || null;
                } catch (_) { return null; }
            }

            if (this._kvFetchPromise) {
                // Параллельный вызов уже выполняется — ждём его результата
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

                    // Сохраняем всё что пришло из KV в cacheManager, чтобы не ходить снова
                    const saves = [];
                    if (d.yandexApiKey)   saves.push(window.cacheManager.set('yandex-api-key', d.yandexApiKey));
                    if (d.yandexFolderId) saves.push(window.cacheManager.set('yandex-folder-id', d.yandexFolderId));
                    if (d.yandexModel)    saves.push(window.cacheManager.set('yandex-model', d.yandexModel));
                    if (d.provider)       saves.push(window.cacheManager.set('ai-provider', d.provider));
                    if (d.apiBaseUrl)     saves.push(window.cacheManager.set('postgres-api-base-url', d.apiBaseUrl));
                    await Promise.all(saves);
                    console.log('ai-provider-manager: настройки восстановлены из Cloudflare KV');
                    // Уведомляем подписчиков (например, app-footer) что ключ готов
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
         * Get модель for провайдера
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
         * Get list доступных моделей for провайдера
         * @param {string} providerName - 'yandex'
         * @returns {Array<Object>} [{ value: string, label: string }]
         */
        getAvailableModels(providerName) {
            const provider = this.providers[providerName];
            return provider ? provider.getAvailableModels() : [];
        }

        /**
         * Get list всех доступных провайдеров
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
         * Get провайдер по имени
         * @param {string} providerName
         * @returns {BaseAIProvider|null}
         */
        getProvider(providerName) {
            return this.providers[providerName] || null;
        }
    }

    // Создаем и экспортируем экземпляр менеджера
    window.aiProviderManager = new AIProviderManager();

    // Инициализируем после загрузки всех провайдеров
    // Вызываем init() сразу, так как провайдеры уже должны быть loadedы
    // (они загружаются раньше через модульную систему)
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

