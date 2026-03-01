/**
 * ================================================================================================
 * RATE LIMITER - Централизованное управление запросами к API
 * ================================================================================================
 * Skill: core/skills/api-layer
 *
 * PURPOSE: Предотвратить блокировку API из-за превышения лимитов запросов.
 * Адаптивные таймауты, очередь запросов, приоритизация.
 *
 * PRINCIPLES:
 * - Адаптивные таймауты (увеличение при 429, уменьшение при успехе)
 * - Очередь запросов с приоритизацией
 * - Обработка rate limiting for всех внешних API
 *
 * ССЫЛКА: Критически важные структуры описаны в `is/skills/arch-foundation`
 */

(function() {
    'use strict';

    // Зависимости
    // - core/config/api-config.js (window.apiConfig)

    /**
     * Адаптивный таймаут for запросов
     */
    const adaptiveTimeout = {
        base: 300,        // 300ms базовое значение
        max: 10000,       // 10 секунд максимум
        current: 300,    // Текущее значение
        lastErrorTime: null
    };

    /**
     * Очередь запросов
     */
    const requestQueue = {
        queue: [],
        processing: false
    };

    /**
     * Увеличить таймаут (при получении 429 ошибки)
     */
    function increaseTimeout() {
        adaptiveTimeout.current = Math.min(adaptiveTimeout.current * 2, adaptiveTimeout.max);
        adaptiveTimeout.lastErrorTime = Date.now();
        console.log(`rate-limiter: таймаут увеличен до ${adaptiveTimeout.current}ms`);
    }

    /**
     * Уменьшить таймаут (при успешных запросах)
     */
    function decreaseTimeout() {
        // Уменьшаем только если прошло более 5 секунд без ошибок
        if (adaptiveTimeout.lastErrorTime && Date.now() - adaptiveTimeout.lastErrorTime > 5000) {
            adaptiveTimeout.current = Math.max(adaptiveTimeout.current * 0.8, adaptiveTimeout.base);
            console.log(`rate-limiter: таймаут уменьшен до ${adaptiveTimeout.current}ms`);
        }
    }

    /**
     * Сбросить таймаут к базовому значению
     */
    function resetTimeout() {
        adaptiveTimeout.current = adaptiveTimeout.base;
        adaptiveTimeout.lastErrorTime = null;
        console.log('rate-limiter: таймаут сброшен к базовому значению');
    }

    /**
     * Get текущий таймаут
     * @returns {number} - таймаут в миллисекундах
     */
    function getTimeout() {
        return adaptiveTimeout.current;
    }

    /**
     * Выполнить задержку перед следующим запросом
     * @returns {Promise}
     */
    async function waitBeforeRequest() {
        await new Promise(resolve => setTimeout(resolve, adaptiveTimeout.current));
    }

    /**
     * Добавить запрос в очередь
     * @param {Function} requestFn - функция запроса
     * @param {number} priority - приоритет (меньше = выше приоритет)
     * @returns {Promise<any>} - результат запроса
     */
    async function queueRequest(requestFn, priority = 5) {
        return new Promise((resolve, reject) => {
            requestQueue.queue.push({
                fn: requestFn,
                priority,
                resolve,
                reject
            });

            // Сортировка по приоритету
            requestQueue.queue.sort((a, b) => a.priority - b.priority);

            // Запуск обработки очереди, если не запущена
            if (!requestQueue.processing) {
                processQueue();
            }
        });
    }

    /**
     * Обработать очередь запросов
     */
    async function processQueue() {
        if (requestQueue.processing || requestQueue.queue.length === 0) {
            return;
        }

        requestQueue.processing = true;

        while (requestQueue.queue.length > 0) {
            const request = requestQueue.queue.shift();

            try {
                // Задержка перед запросом
                await waitBeforeRequest();

                // Выполнение запроса
                const result = await request.fn();
                request.resolve(result);

                // Уменьшение таймаута при успехе
                decreaseTimeout();
            } catch (error) {
                // Skill anchor: адаптивный 429 recovery (increase/decrease timeout цикл).
                // See core/skills/api-layer
                // Увеличение таймаута при 429 ошибке
                if (error.status === 429 || error.type === 'api_rate_limit') {
                    increaseTimeout();
                }

                request.reject(error);
            }
        }

        requestQueue.processing = false;
    }

    // Export to global scope (старый API for обратной совместимости)
    window.rateLimiter = {
        increaseTimeout,
        decreaseTimeout,
        resetTimeout,
        getTimeout,
        waitBeforeRequest,
        queueRequest
    };

    /**
     * Класс RateLimiter for использования в новой архитектуре провайдеров
     * Обертка над существующим функциональным API
     */
    class RateLimiter {
        // Хранилище общих экземпляров for разных сервисов (ЕИП)
        static instances = new Map();

        /**
         * Get или создать именованный экземпляр RateLimiter (ЕИП)
         * @param {string} key - уникальный ключ (напр. 'coingecko')
         * @param {number} requestsPerMinute
         * @param {number} requestsPerSecond
         */
        static getOrCreate(key, requestsPerMinute = 50, requestsPerSecond = 10) {
            if (!RateLimiter.instances.has(key)) {
                console.log(`rate-limiter: создан новый именованный экземпляр for "${key}"`);
                RateLimiter.instances.set(key, new RateLimiter(requestsPerMinute, requestsPerSecond));
            }
            return RateLimiter.instances.get(key);
        }

        constructor(requestsPerMinute = 50, requestsPerSecond = 10) {
            this.requestsPerMinute = requestsPerMinute;
            this.requestsPerSecond = requestsPerSecond;
            this.tokens = requestsPerSecond;
            this.lastRefill = Date.now();
        }

        /**
         * Ожидание доступности токена for запроса
         * @returns {Promise<void>}
         */
        async waitForToken() {
            // Обновляем токены на основе прошедшего времени
            const now = Date.now();
            const elapsed = now - this.lastRefill;
            const tokensToAdd = (elapsed / 1000) * this.requestsPerSecond;

            this.tokens = Math.min(this.requestsPerSecond, this.tokens + tokensToAdd);
            this.lastRefill = now;

            // Если токенов нет, ждем
            if (this.tokens < 1) {
                const waitTime = ((1 - this.tokens) / this.requestsPerSecond) * 1000;
                await new Promise(resolve => setTimeout(resolve, waitTime));
                this.tokens = 1;
            }

            // Используем один токен
            this.tokens -= 1;

            // Дополнительная задержка из адаптивного таймаута
            await waitBeforeRequest();
        }

        /**
         * Прокси-метод for функционального API (совместимость)
         */
        async waitBeforeRequest() {
            await this.waitForToken();
        }

        /**
         * Увеличить задержку (при rate limiting)
         */
        increaseTimeout() {
            increaseTimeout();
        }

        /**
         * Уменьшить задержку (при успешном запросе)
         */
        decreaseTimeout() {
            decreaseTimeout();
        }
    }

    // Экспорт класса for новой архитектуры
    window.RateLimiter = RateLimiter;

    console.log('✅ rate-limiter.js: initialized (функциональный API + класс RateLimiter + ЕИП менеджер)');
})();
