/**
 * ================================================================================================
 * YANDEX AI PROVIDER - Провайдер for YandexGPT API
 * ================================================================================================
 *
 * PURPOSE: Реализация провайдера for работы с YandexGPT через Yandex Cloud API.
 *
 * Skill: core/skills/api-layer
 * Skill: app/skills/file-protocol-cors-guard
 *
 * PRINCIPLES:
 * - Использует Yandex Cloud Foundation Models API
 * - Поддерживает yandexgpt и yandexgpt-lite
 * - Аутентификация через Api-Key
 * - Прокси через Yandex Cloud Functions for CORS bypass (обязателен for работы из браузера)
 *
 * ОСОБЕННОСТИ:
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
 * REFERENCES:
 * - Базовый класс: core/api/ai-providers/base-provider.js
 * - Конфигурация прокси: core/config/app-config.js
 * - Yandex Cloud API: https://yandex.cloud/ru/docs/foundation-models/
 * - Documentation прокси: docs/archive/yandex/ya-cloud-function-code.md
 */

(function() {
    'use strict';

    if (!window.BaseAIProvider) {
        console.error('yandex-provider: BaseAIProvider not loaded');
        return;
    }

    /**
     * Провайдер for YandexGPT API
     */
    class YandexProvider extends window.BaseAIProvider {
        constructor() {
            super();
            this.endpoint = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';
            this.defaultFolderId = 'b1gv03a122le5a934cqj';
            // Инициализация прокси (ленивая - при первом использовании)
            // Для обратной совместимости используем синхронную загрузку из конфигурации
            this.proxyUrl = null;
            this._proxyInitialized = false;
        }

        /**
         * Инициализация прокси (асинхронная загрузка из кэша)
         * Вызывается при первом использовании
         */
        async initProxy() {
            if (this._proxyInitialized) return;

            try {
                // Пытаемся получить тип прокси из настроек пользователя
                let proxyType = await window.cacheManager.get('yandex-proxy-type');

                // Если не найден в кэше, используем дефолтный из конфигурации
                if (!proxyType && window.appConfig) {
                    proxyType = window.appConfig.get('defaults.yandex.proxyType', 'yandex');
                }

                this.proxyUrl = window.appConfig.getProxyUrl('yandex', proxyType);
                this._proxyInitialized = true;
            } catch (error) {
                console.warn('yandex-provider: ошибка инициализации прокси:', error);
                this.proxyUrl = window.appConfig?.getProxyUrl?.('yandex') || null;
                this._proxyInitialized = true;
            }
        }

        /**
         * Отправить запрос к YandexGPT API
         * @param {string} apiKey - API ключ Yandex Cloud
         * @param {string} model - Model URI (например: gpt://folderId/yandexgpt-lite/latest)
         * @param {Array<Object>} messages - Массив сообщений {role: 'user'|'assistant', content: string}
         * @param {Object} options - Дополнительные опции {temperature: number, maxTokens: number}
         * @returns {Promise<string>} Текст ответа
         * @throws {Error} При ошибке запроса
         */
        async sendRequest(apiKey, model, messages, options = {}) {
            if (!this.validateApiKey(apiKey)) {
                throw new Error('Необходимы apiKey for запроса к YandexGPT');
            }

            if (!messages || messages.length === 0) {
                throw new Error('Необходимы messages for запроса к YandexGPT');
            }

            // Преобразуем messages в формат YandexGPT
            // YandexGPT использует {role: 'user'|'assistant', text: string}
            const yandexMessages = messages.map(msg => ({
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                text: msg.content || msg.text || ''
            }));

            // Формируем modelUri / assistant ID (если не передан, используем дефолтный)
            const selectedModel = model || this.getDefaultModel();
            const isAssistant = selectedModel.startsWith('assistant:');
            const assistantId = isAssistant ? selectedModel.replace(/^assistant:/, '').trim() : '';
            let modelUri = selectedModel;

            // Формируем тело запроса согласно документации Yandex API
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
                    requestBody.completionOptions.temperature = 0.6; // Дефолтное значение
                }
                if (options.maxTokens) {
                    requestBody.completionOptions.maxTokens = typeof options.maxTokens === 'string'
                        ? parseInt(options.maxTokens, 10)
                        : options.maxTokens;
                } else {
                    requestBody.completionOptions.maxTokens = 2000; // Дефолтное значение
                }
            }

            try {
                // Инициализируем прокси при первом использовании
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

                // Если указан прокси, используем его (for CORS bypass)
                if (this.proxyUrl) {
                    // Через прокси: передаем API ключ и тело запроса в теле запроса к прокси
                    // Формируем тело запроса в том же формате, что и for прямого запроса
                    const proxyRequestBody = {
                        apiKey: apiKey,
                        modelUri: modelUri,
                        messages: yandexMessages
                    };

                    // Добавляем completionOptions, если указаны temperature или maxTokens
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
                        // Если опции не указаны, используем дефолтные значения
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
                            // Если failed to распарсить, используем дефолтное сообщение
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

                    // Проверяем наличие ошибки в ответе от Yandex API
                    if (data.error) {
                        const errorMessage = data.error.message || 'Неизвестная ошибка от Yandex API';
                        const httpCode = data.error.httpCode || '';
                        throw new Error(`Yandex API ошибка (HTTP ${httpCode}): ${errorMessage}`);
                    }

                    // Парсим ответ YandexGPT
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
                    // Прямой запрос к Yandex API (работает только с серверной частью)
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

                    // Парсим ответ YandexGPT
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
                // Проверяем, является ли это CORS ошибкой
                const isCorsError = error.message === 'Failed to fetch' ||
                                   error.name === 'TypeError' && error.message?.includes('fetch');

                if (isCorsError) {
                    throw new Error('CORS ошибка: Yandex API блокирует запросы из браузера. Для работы API необходим прокси-сервер или серверная часть. Текущий origin: ' + (window.location.origin || 'unknown'));
                }

                // Если это уже наша ошибка - пробрасываем её дальше
                if (error instanceof Error && error.message) {
                    throw error;
                }
                // Иначе оборачиваем в общую ошибку
                throw new Error(`Ошибка при запросе к YandexGPT: ${error.message || 'Неизвестная ошибка'}`);
            }
        }

        /**
         * Get модель по умолчанию
         * @returns {string} Model URI
         */
        getDefaultModel() {
            return `gpt://${this.defaultFolderId}/yandexgpt-lite/latest`;
        }

        /**
         * Get list доступных моделей
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
         * Get имя провайдера
         * @returns {string}
         */
        getName() {
            return 'yandex';
        }

        /**
         * Get отображаемое имя провайдера
         * @returns {string}
         */
        getDisplayName() {
            return 'YandexGPT';
        }
    }

    // Экспорт класса
    window.YandexProvider = YandexProvider;

    console.log('yandex-provider.js: initialized');
})();

