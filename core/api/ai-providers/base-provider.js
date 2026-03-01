/**
 * ================================================================================================
 * BASE AI PROVIDER - Базовый интерфейс для AI провайдеров
 * ================================================================================================
 *
 * ЦЕЛЬ: Базовый класс для всех AI провайдеров (YandexGPT и т.д.)
 * Обеспечивает единый интерфейс для работы с разными провайдерами.
 *
 * Skill: a/skills/app/skills/integrations/integrations-ai-core.md
 *
 * ПРИНЦИПЫ:
 * - Единый интерфейс для всех провайдеров
 * - Абстракция различий в форматах запросов/ответов
 * - Независимость от конкретной реализации
 *
 * ИСПОЛЬЗОВАНИЕ:
 * Наследуйте этот класс для создания новых провайдеров:
 * class MyProvider extends BaseAIProvider { ... }
 *
 * ССЫЛКИ:
 * - Менеджер провайдеров: core/api/ai-provider-manager.js
 */

(function() {
    'use strict';

    /**
     * Базовый класс для AI провайдеров
     */
    class BaseAIProvider {
        /**
         * Отправить запрос к AI API
         * @param {string} apiKey - API ключ
         * @param {string} model - Модель
         * @param {Array<Object>} messages - Массив сообщений в формате {role: 'user'|'assistant', content: string}
         * @param {Object} options - Дополнительные опции (temperature, maxTokens и т.д.)
         * @returns {Promise<string>} Текст ответа
         * @throws {Error} При ошибке запроса
         */
        async sendRequest(apiKey, model, messages, options = {}) {
            throw new Error('sendRequest must be implemented by subclass');
        }

        /**
         * Получить модель по умолчанию
         * @returns {string}
         */
        getDefaultModel() {
            throw new Error('getDefaultModel must be implemented by subclass');
        }

        /**
         * Получить список доступных моделей
         * @returns {Array<Object>} [{ value: string, label: string }]
         */
        getAvailableModels() {
            throw new Error('getAvailableModels must be implemented by subclass');
        }

        /**
         * Валидация API ключа (базовая проверка формата)
         * @param {string} apiKey
         * @returns {boolean}
         */
        validateApiKey(apiKey) {
            return apiKey && typeof apiKey === 'string' && apiKey.trim().length > 0;
        }

        /**
         * Получить имя провайдера
         * @returns {string} 'yandex' | etc.
         */
        getName() {
            throw new Error('getName must be implemented by subclass');
        }

        /**
         * Получить отображаемое имя провайдера
         * @returns {string}
         */
        getDisplayName() {
            throw new Error('getDisplayName must be implemented by subclass');
        }
    }

    // Экспорт класса
    window.BaseAIProvider = BaseAIProvider;

    console.log('base-provider.js: инициализирован');
})();

