/**
 * ================================================================================================
 * BASE AI PROVIDER - Base interface for AI providers
 * ================================================================================================
 *
 * PURPOSE: Base class for all AI providers (YandexGPT, etc.)
 *
 * @skill-anchor id:sk-bb7c8e #for-layer-separation
 * @skill-anchor id:sk-224210 #for-data-provider-interface
 * Provides unified interface for working with different providers.
 *
 * Skill: id:sk-bb7c8e
 *
 * USAGE:
 * Extend this class to create new providers:
 * class MyProvider extends BaseAIProvider { ... }
 *
 */

(function() {
    'use strict';

    /**
     * Base class for AI providers
     */
    class BaseAIProvider {
        /**
         * Send request to AI API
         * @param {string} apiKey - API key
         * @param {string} model - Model
         * @param {Array<Object>} messages - Array of messages in format {role: 'user'|'assistant', content: string}
         * @param {Object} options - Additional options (temperature, maxTokens, etc.)
         * @returns {Promise<string>} Response text
         * @throws {Error} On request error
         */
        async sendRequest(apiKey, model, messages, options = {}) {
            throw new Error('sendRequest must be implemented by subclass');
        }

        /**
         * Get default model
         * @returns {string}
         */
        getDefaultModel() {
            throw new Error('getDefaultModel must be implemented by subclass');
        }

        /**
         * Get list of available models
         * @returns {Array<Object>} [{ value: string, label: string }]
         */
        getAvailableModels() {
            throw new Error('getAvailableModels must be implemented by subclass');
        }

        /**
         * Validate API key (basic format check)
         * @param {string} apiKey
         * @returns {boolean}
         */
        validateApiKey(apiKey) {
            return apiKey && typeof apiKey === 'string' && apiKey.trim().length > 0;
        }

        /**
         * Get provider name
         * @returns {string} 'yandex' | etc.
         */
        getName() {
            throw new Error('getName must be implemented by subclass');
        }

        /**
         * Get provider display name
         * @returns {string}
         */
        getDisplayName() {
            throw new Error('getDisplayName must be implemented by subclass');
        }
    }

    // Export class
    window.BaseAIProvider = BaseAIProvider;

    console.log('base-provider.js: initialized');
})();

