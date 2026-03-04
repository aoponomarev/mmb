/**
 * #JS-oX451njh
 * @description Centralized API request management: adaptive timeouts, request queue, prioritization; prevent rate-limit blocking.
 * @skill id:sk-bb7c8e
 * @skill-anchor id:sk-bb7c8e #for-layer-separation
 * @skill-anchor id:sk-224210 #for-data-provider-interface #for-rate-limiting
 */

(function() {
    'use strict';

    // Dependencies
    // - core/config/api-config.js (window.apiConfig)

    /**
     * Adaptive timeout for requests
     */
    const adaptiveTimeout = {
        base: 300,        // 300ms base value
        max: 10000,       // 10 seconds max
        current: 300,    // Current value
        lastErrorTime: null
    };

    /**
     * Request queue
     */
    const requestQueue = {
        queue: [],
        processing: false
    };

    /**
     * Increase timeout (on 429 error)
     */
    function increaseTimeout() {
        adaptiveTimeout.current = Math.min(adaptiveTimeout.current * 2, adaptiveTimeout.max);
        adaptiveTimeout.lastErrorTime = Date.now();
        console.log(`rate-limiter: таймаут увеличен до ${adaptiveTimeout.current}ms`);
    }

    /**
     * Decrease timeout (on successful requests)
     */
    function decreaseTimeout() {
        // Decrease only if more than 5 seconds without errors
        if (adaptiveTimeout.lastErrorTime && Date.now() - adaptiveTimeout.lastErrorTime > 5000) {
            adaptiveTimeout.current = Math.max(adaptiveTimeout.current * 0.8, adaptiveTimeout.base);
            console.log(`rate-limiter: таймаут уменьшен до ${adaptiveTimeout.current}ms`);
        }
    }

    /**
     * Reset timeout to base value
     */
    function resetTimeout() {
        adaptiveTimeout.current = adaptiveTimeout.base;
        adaptiveTimeout.lastErrorTime = null;
        console.log('rate-limiter: таймаут сброшен к базовому значению');
    }

    /**
     * Get current timeout
     * @returns {number} - timeout in milliseconds
     */
    function getTimeout() {
        return adaptiveTimeout.current;
    }

    /**
     * Wait before next request
     * @returns {Promise}
     */
    async function waitBeforeRequest() {
        await new Promise(resolve => setTimeout(resolve, adaptiveTimeout.current));
    }

    /**
     * Add request to queue
     * @param {Function} requestFn - request function
     * @param {number} priority - priority (lower = higher priority)
     * @returns {Promise<any>} - request result
     */
    async function queueRequest(requestFn, priority = 5) {
        return new Promise((resolve, reject) => {
            requestQueue.queue.push({
                fn: requestFn,
                priority,
                resolve,
                reject
            });

            // Sort by priority
            requestQueue.queue.sort((a, b) => a.priority - b.priority);

            // Start queue processing if not running
            if (!requestQueue.processing) {
                processQueue();
            }
        });
    }

    /**
     * Process request queue
     */
    async function processQueue() {
        if (requestQueue.processing || requestQueue.queue.length === 0) {
            return;
        }

        requestQueue.processing = true;

        while (requestQueue.queue.length > 0) {
            const request = requestQueue.queue.shift();

            try {
                // Delay before request
                await waitBeforeRequest();

                // Execute request
                const result = await request.fn();
                request.resolve(result);

                // Decrease timeout on success
                decreaseTimeout();
            } catch (error) {
                // Skill anchor: adaptive 429 recovery (increase/decrease timeout cycle).
                // See id:sk-bb7c8e
                // Increase timeout on 429 error
                if (error.status === 429 || error.type === 'api_rate_limit') {
                    increaseTimeout();
                }

                request.reject(error);
            }
        }

        requestQueue.processing = false;
    }

    // Export to global scope (legacy API for backward compatibility)
    window.rateLimiter = {
        increaseTimeout,
        decreaseTimeout,
        resetTimeout,
        getTimeout,
        waitBeforeRequest,
        queueRequest
    };

    /**
     * RateLimiter class for new provider architecture
     * Wrapper over existing functional API
     */
    class RateLimiter {
        // Shared instance store for different services (SSOT)
        static instances = new Map();

        /**
         * Get or create named RateLimiter instance (SSOT)
         * @param {string} key - unique key (e.g. 'coingecko')
         * @param {number} requestsPerMinute
         * @param {number} requestsPerSecond
         */
        static getOrCreate(key, requestsPerMinute = 50, requestsPerSecond = 10) {
            if (!RateLimiter.instances.has(key)) {
                console.log(`rate-limiter: created new named instance for "${key}"`);
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
         * Wait for token availability for request
         * @returns {Promise<void>}
         */
        async waitForToken() {
            // Refresh tokens based on elapsed time
            const now = Date.now();
            const elapsed = now - this.lastRefill;
            const tokensToAdd = (elapsed / 1000) * this.requestsPerSecond;

            this.tokens = Math.min(this.requestsPerSecond, this.tokens + tokensToAdd);
            this.lastRefill = now;

            // If no tokens, wait
            if (this.tokens < 1) {
                const waitTime = ((1 - this.tokens) / this.requestsPerSecond) * 1000;
                await new Promise(resolve => setTimeout(resolve, waitTime));
                this.tokens = 1;
            }

            // Consume one token
            this.tokens -= 1;

            // Additional delay from adaptive timeout
            await waitBeforeRequest();
        }

        /**
         * Proxy method for functional API (compatibility)
         */
        async waitBeforeRequest() {
            await this.waitForToken();
        }

        /**
         * Increase delay (on rate limiting)
         */
        increaseTimeout() {
            increaseTimeout();
        }

        /**
         * Decrease delay (on successful request)
         */
        decreaseTimeout() {
            decreaseTimeout();
        }
    }

    // Export class for new architecture
    window.RateLimiter = RateLimiter;

    console.log('✅ rate-limiter.js: initialized (функциональный API + класс RateLimiter + SSOT менеджер)');
})();
