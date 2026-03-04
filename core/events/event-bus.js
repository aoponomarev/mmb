/**
 * #JS-v8M9uv5A
 * @description Global event bus for component communication without tight coupling; subscribe, emit, auto-unsubscribe.
 * @skill id:sk-483943
 *
 * PRINCIPLES:
 * - Global event bus for all components
 * - Subscribe/unsubscribe via simple API
 * - One-time subscription support
 *
 * REFERENCE: Critical structures described in id:sk-483943
 */

(function() {
    'use strict';

    /**
     * Subscription storage
     * Format: { eventName: [{ callback, once, id }, ...] }
     */
    const subscriptions = new Map();

    /**
     * Counter for subscription ID generation
     */
    let subscriptionIdCounter = 0;

    /**
     * Subscribe to event
     * @param {string} eventName - event name
     * @param {Function} callback - handler function
     * @param {boolean} once - one-time subscription
     * @returns {string} - subscription ID (for unsubscribe)
     */
    function on(eventName, callback, once = false) {
        if (typeof callback !== 'function') {
            console.error('event-bus.on: callback должен быть функцией');
            return null;
        }

        const id = `sub_${subscriptionIdCounter++}`;

        if (!subscriptions.has(eventName)) {
            subscriptions.set(eventName, []);
        }

        subscriptions.get(eventName).push({
            id,
            callback,
            once
        });

        return id;
    }

    /**
     * Subscribe to event once
     * @param {string} eventName - event name
     * @param {Function} callback - handler function
     * @returns {string} - subscription ID
     */
    function once(eventName, callback) {
        return on(eventName, callback, true);
    }

    /**
     * Unsubscribe from event
     * @param {string} eventName - event name
     * @param {string|Function} idOrCallback - subscription ID or handler function
     */
    function off(eventName, idOrCallback) {
        if (!subscriptions.has(eventName)) {
            return;
        }

        const subs = subscriptions.get(eventName);
        const index = subs.findIndex(sub =>
            sub.id === idOrCallback || sub.callback === idOrCallback
        );

        if (index !== -1) {
            subs.splice(index, 1);
        }

        if (subs.length === 0) {
            subscriptions.delete(eventName);
        }
    }

    /**
     * Emit event
     * @param {string} eventName - event name
     * @param {any} data - event data
     */
    function emit(eventName, data) {
        if (!subscriptions.has(eventName)) {
            return;
        }

        const subs = subscriptions.get(eventName);
        const toRemove = [];

        for (const sub of subs) {
            try {
                sub.callback(data);
                if (sub.once) {
                    toRemove.push(sub.id);
                }
            } catch (error) {
                console.error(`event-bus.emit(${eventName}): ошибка в обработчике:`, error);
            }
        }

        // Remove one-time subscriptions
        for (const id of toRemove) {
            off(eventName, id);
        }
    }

    /**
     * Get subscription count for event
     * @param {string} eventName - event name
     * @returns {number}
     */
    function listenerCount(eventName) {
        return subscriptions.has(eventName) ? subscriptions.get(eventName).length : 0;
    }

    /**
     * Clear all subscriptions
     */
    function clear() {
        subscriptions.clear();
    }

    // Export to global scope
    window.eventBus = {
        on,
        once,
        off,
        emit,
        listenerCount,
        clear
    };

    console.log('event-bus.js: initialized');
})();

