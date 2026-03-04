/**
 * ================================================================================================
 * YANDEX AI PROVIDER - Provider for YandexGPT API
 * ================================================================================================
 *
 * PURPOSE: Provider implementation for YandexGPT via Yandex Cloud API.
 *
 * @skill-anchor core/skills/api-layer #for-layer-separation
 * @skill-anchor core/skills/data-providers-architecture #for-data-provider-interface
 *
 * Skill: core/skills/api-layer
 * Skill: app/skills/file-protocol-cors-guard
 *
 * FEATURES:
 * - Endpoint: https://llm.api.cloud.yandex.net/foundationModels/v1/completion
 * - Прокси URL: https://functions.yandexcloud.net/d4erd8d1pttbufsl26s1 (Yandex Cloud Functions)
 * - Folder ID: b1gv03a122le5a934cqj
 * - Формат modelUri: gpt://{folderId}/{model}/latest (например: gpt://b1gv03a122le5a934cqj/yandexgpt-lite/latest)
 * - Формат запроса к API: { modelUri, messages: [{role: 'user'|'assistant', text: string}], completionOptions: {temperature: 0.6, maxTokens: 2000} }
 * - Формат запроса к прокси: { apiKey, modelUri, messages, completionOptions } (API ключ передается в теле запроса)
 * - Формат ответа: { result: { alternatives: [{ message: { text: string } }] } } или { error: { message: string, httpCode: number } }
 * - Формат сообщений: YandexGPT использует {role: 'user'|'assistant', text: string}, а не {role, content}
 * - Дефолтные completionOptions: temperature: 0.6, maxTokens: 2000
 * - API ключ: получается из Yandex Cloud IAM (показывается только один раз при создании)
 *
 * CORS:
 * - Yandex API блокирует CORS-запросы из браузера, поэтому обязателен прокси
 * - Прокси обрабатывает OPTIONS preflight запросы (возвращает статус 204)
 * - Прокси добавляет CORS заголовки: Access-Control-Allow-Origin: *, Access-Control-Allow-Methods: POST, OPTIONS
 *
 * USAGE:
 * const provider = new YandexProvider();
 * const response = await provider.sendRequest(apiKey, model, messages);
 *
*/

(function() {
    'use strict';

    if (!window.BaseAIProvider) {
        console.error('yandex-provider: BaseAIProvider not loaded');
        return;
    }

    /**
     * Provider for YandexGPT API
     */
    class YandexProvider extends window.BaseAIProvider {
        constructor() {
            super();
            this.endpoint = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';
            this.defaultFolderId = 'b1gv03a122le5a934cqj';
            // Proxy initialization (lazy - on first use)
            // For backward compatibility use sync load from config
            this.proxyUrl = null;
            this._proxyInitialized = false;
        }

        /**
         * Initialize proxy (async load from cache)
         * Called on first use
         */
        async initProxy() {
            if (this._proxyInitialized) return;

            try {
                // Try to get proxy type from user settings
                let proxyType = await window.cacheManager.get('yandex-proxy-type');

                // If not in cache, use default from config
                if (!proxyType && window.appConfig) {
                    proxyType = window.appConfig.get('defaults.yandex.proxyType', 'yandex');
                }

                this.proxyUrl = window.appConfig.getProxyUrl('yandex', proxyType);
                this._proxyInitialized = true;
            } catch (error) {
                console.warn('yandex-provider: proxy init error:', error);
                this.proxyUrl = window.appConfig?.getProxyUrl?.('yandex') || null;
                this._proxyInitialized = true;
            }
        }

        /**
         * Send request to YandexGPT API
         * @param {string} apiKey - Yandex Cloud API key
         * @param {string} model - Model URI (e.g. gpt://folderId/yandexgpt-lite/latest)
         * @param {Array<Object>} messages - Message array {role: 'user'|'assistant', content: string}
         * @param {Object} options - Additional options {temperature: number, maxTokens: number}
         * @returns {Promise<string>} Response text
         * @throws {Error} On request error
         */
        async sendRequest(apiKey, model, messages, options = {}) {
            if (!this.validateApiKey(apiKey)) {
                throw new Error('Необходимы apiKey for запроса к YandexGPT');
            }

            if (!messages || messages.length === 0) {
                throw new Error('Необходимы messages for запроса к YandexGPT');
            }

            // Convert messages to YandexGPT format
            // YandexGPT использует {role: 'user'|'assistant', text: string}
            const yandexMessages = messages.map(msg => ({
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                text: msg.content || msg.text || ''
            }));

            // Build modelUri / assistant ID (if not provided, use default)
            const selectedModel = model || this.getDefaultModel();
            const isAssistant = selectedModel.startsWith('assistant:');
            const assistantId = isAssistant ? selectedModel.replace(/^assistant:/, '').trim() : '';
            let modelUri = selectedModel;

            // Build request body per Yandex API docs
            // Используем completionOptions for temperature и maxTokens
            const requestBody = {
                modelUri: modelUri,
                messages: yandexMessages
            };

            // Добавляем completionOptions, если указаны temperature или maxTokens
            if (options.temperature !== undefined || options.maxTokens) {
                requestBody.completionOptions = {};
                if (options.temperature !== undefined) {
                    requestBody.completionOptions.temperature = options.temperature;
                } else {
                    requestBody.completionOptions.temperature = 0.6; // Default
                }
                if (options.maxTokens) {
                    requestBody.completionOptions.maxTokens = typeof options.maxTokens === 'string'
                        ? parseInt(options.maxTokens, 10)
                        : options.maxTokens;
                } else {
                    requestBody.completionOptions.maxTokens = 2000; // Default
                }
            }

            try {
                // Initialize proxy on first use
                await this.initProxy();

                // Assistant API currently uses separate endpoint and request shape.
                // In file:// mode this direct endpoint can be blocked by CORS, so
                // we gracefully fall back to Foundation model to avoid empty UI blocks.
                if (isAssistant) {
                    // Skill anchor: на file:// прямой вызов Assistant API заблокирован CORS, обязателен fallback через proxy.
                    // See app/skills/file-protocol-cors-guard
                    if (window.location.protocol === 'file:' || window.location.hostname.includes('github.io') || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                        modelUri = `gpt://${this.defaultFolderId}/yandexgpt/latest`;
                        requestBody.modelUri = modelUri;
                    } else {
                    try {
                        const body = {
                            prompt: { id: assistantId },
                            input: yandexMessages.map(m => `${m.role}: ${m.text}`).join('\n'),
                        };
                        const response = await fetch('https://rest-assistant.api.cloud.yandex.net/v1/responses', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Api-Key ${apiKey}`,
                                'x-folder-id': this.defaultFolderId,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(body),
                        });

                        if (!response.ok) {
                            const errorData = await response.json().catch(() => ({ error: { message: 'Неизвестная ошибка' } }));
                            throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
                        }

                        const data = await response.json();
                        const answer = data.output_text || data.output?.[0]?.content?.[0]?.text || data.message?.text || '';
                        if (!answer || answer.trim().length === 0) {
                            throw new Error('Пустой ответ от Assistant API');
                        }
                        return answer.trim();
                    } catch (assistantError) {
                        console.warn('yandex-provider: assistant request failed, fallback to YandexGPT foundation:', assistantError?.message || assistantError);
                        if (window.fallbackMonitor && typeof window.fallbackMonitor.notify === 'function') {
                            window.fallbackMonitor.notify({
                                source: 'yandexProvider.sendRequest',
                                phase: 'assistant-to-foundation',
                                details: assistantError && assistantError.message ? assistantError.message : 'assistant endpoint failed'
                            });
                        }
                        // Fallback to Foundation through existing proxy/direct flow.
                        // This keeps footer/news rendering alive even when assistant endpoint is blocked by CORS.
                        modelUri = `gpt://${this.defaultFolderId}/yandexgpt/latest`;
                        requestBody.modelUri = modelUri;
                    }
                    }
                }

                // If proxy specified, use it (for CORS bypass)
                if (this.proxyUrl) {
                    // Via proxy: pass API key and body in proxy request body
                    // Формируем тело запроса в том же формате, что и for прямого запроса
                    const proxyRequestBody = {
                        apiKey: apiKey,
                        modelUri: modelUri,
                        messages: yandexMessages
                    };

                    // Add completionOptions if temperature or maxTokens specified
                    if (options.temperature !== undefined || options.maxTokens) {
                        proxyRequestBody.completionOptions = {};
                        if (options.temperature !== undefined) {
                            proxyRequestBody.completionOptions.temperature = options.temperature;
                        } else {
                            proxyRequestBody.completionOptions.temperature = 0.6; // Дефолтное значение
                        }
                        if (options.maxTokens) {
                            proxyRequestBody.completionOptions.maxTokens = typeof options.maxTokens === 'string'
                                ? parseInt(options.maxTokens, 10)
                                : options.maxTokens;
                        } else {
                            proxyRequestBody.completionOptions.maxTokens = 2000; // Дефолтное значение
                        }
                    } else {
                        // If options not specified, use defaults
                        proxyRequestBody.completionOptions = {
                            temperature: 0.6,
                            maxTokens: 2000
                        };
                    }
                    const proxyRequestBodyJson = JSON.stringify(proxyRequestBody);
                    const proxyStartTime = Date.now();
                    const response = await fetch(this.proxyUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: proxyRequestBodyJson
                    });

                    if (!response.ok) {
                        let errorText = '';
                        try {
                            errorText = await response.text();
                        } catch (e) {
                            errorText = '';
                        }
                        let errorData = { error: { message: 'Неизвестная ошибка' } };
                        try {
                            if (errorText) {
                                errorData = JSON.parse(errorText);
                            }
                        } catch (parseError) {
                            // If parse failed, use default message
                        }
                        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
                    }

                    const responseText = await response.text();

                    let data;
                    try {
                        data = JSON.parse(responseText);
                    } catch (parseError) {
                        throw new Error(`Ошибка парсинга ответа от прокси: ${parseError.message}`);
                    }

                    // Check for error in Yandex API response
                    if (data.error) {
                        const errorMessage = data.error.message || 'Неизвестная ошибка от Yandex API';
                        const httpCode = data.error.httpCode || '';
                        throw new Error(`Yandex API ошибка (HTTP ${httpCode}): ${errorMessage}`);
                    }

                    // Parse YandexGPT response
                    if (data.result && data.result.alternatives && data.result.alternatives.length > 0) {
                        const answer = data.result.alternatives[0].message.text;
                        if (!answer || answer.trim().length === 0) {
                            throw new Error('Пустой ответ от API');
                        }
                        return answer.trim();
                    } else {
                        throw new Error('Пустой ответ от API');
                    }
                } else {
                    // Direct request to Yandex API (works only with server-side)
                    const response = await fetch(this.endpoint, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Api-Key ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(requestBody)
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({
                            error: { message: 'Неизвестная ошибка' }
                        }));
                        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
                    }

                    const data = await response.json();

                    // Parse YandexGPT response
                    // Формат: { result: { alternatives: [{ message: { text: string } }] } }
                    if (data.result && data.result.alternatives && data.result.alternatives.length > 0) {
                        const answer = data.result.alternatives[0].message.text;
                        if (!answer || answer.trim().length === 0) {
                            throw new Error('Пустой ответ от API');
                        }
                        return answer.trim();
                    } else {
                        throw new Error('Пустой ответ от API');
                    }
                }
            } catch (error) {
                // Check if this is CORS error
                const isCorsError = error.message === 'Failed to fetch' ||
                                   error.name === 'TypeError' && error.message?.includes('fetch');

                if (isCorsError) {
                    throw new Error('CORS ошибка: Yandex API блокирует запросы из браузера. Для работы API необходим прокси-сервер или серверная часть. Текущий origin: ' + (window.location.origin || 'unknown'));
                }

                // If already our error - rethrow
                if (error instanceof Error && error.message) {
                    throw error;
                }
                // Otherwise wrap in generic error
                throw new Error(`Ошибка при запросе к YandexGPT: ${error.message || 'Неизвестная ошибка'}`);
            }
        }

        /**
         * Get default model
         * @returns {string} Model URI
         */
        getDefaultModel() {
            return `gpt://${this.defaultFolderId}/yandexgpt-lite/latest`;
        }

        /**
         * Get list of available models
         * @returns {Array<Object>} [{ value: string, label: string }]
         */
        getAvailableModels() {
            return [
                {
                    value: `gpt://${this.defaultFolderId}/yandexgpt-lite/latest`,
                    label: 'YandexGPT Lite'
                },
                {
                    value: `gpt://${this.defaultFolderId}/yandexgpt/latest`,
                    label: 'YandexGPT'
                },
                {
                    value: 'assistant:fvtj79pcagqihmvsaivl',
                    label: 'Assistant'
                }
            ];
        }

        /**
         * Get provider name
         * @returns {string}
         */
        getName() {
            return 'yandex';
        }

        /**
         * Get provider display name
         * @returns {string}
         */
        getDisplayName() {
            return 'YandexGPT';
        }
    }

    // Export class
    window.YandexProvider = YandexProvider;

    console.log('yandex-provider.js: initialized');
})();

