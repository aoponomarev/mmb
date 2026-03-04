/**
 * ================================================================================================
 * LOADING STATE - Unified loading states system
 * ================================================================================================
 *
 * PURPOSE: Manage loading states (loading, error, success) for all components.
 * State synchronization, progress indicators, request cancellation.
 * Skill: id:sk-483943
 *
 * PRINCIPLES:
 * - Unified interface for all loading states
 * - Tracking of multiple loads
 * - Automatic state management
 *
 * REFERENCE: Critical structures described in id:sk-483943
 */

(function() {
    'use strict';

    /**
     * Active loads by key
     */
    const activeLoadings = new Map();

    /**
     * Set loading state
     * @param {string} key - loading key
     * @param {Object} state - state { loading: boolean, error: Error|null, data: any }
     */
    function setLoadingState(key, state) {
        activeLoadings.set(key, {
            loading: state.loading !== undefined ? state.loading : false,
            error: state.error || null,
            data: state.data || null,
            timestamp: Date.now()
        });

        // Emit event via eventBus (if available)
        if (window.eventBus) {
            window.eventBus.emit('loading-state-changed', { key, state: activeLoadings.get(key) });
        }
    }

    /**
     * Get loading state
     * @param {string} key - loading key
     * @returns {Object|null} - state or null
     */
    function getLoadingState(key) {
        return activeLoadings.get(key) || null;
    }

    /**
     * Check if loading is in progress
     * @param {string} key - loading key
     * @returns {boolean}
     */
    function isLoading(key) {
        const state = activeLoadings.get(key);
        return state ? state.loading : false;
    }

    /**
     * Check if there are active loads
     * @returns {boolean}
     */
    function hasActiveLoadings() {
        for (const state of activeLoadings.values()) {
            if (state.loading) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get all active loads
     * @returns {Array} - array of active load keys
     */
    function getActiveLoadings() {
        const active = [];
        for (const [key, state] of activeLoadings.entries()) {
            if (state.loading) {
                active.push(key);
            }
        }
        return active;
    }

    /**
     * Clear loading state
     * @param {string} key - loading key
     */
    function clearLoadingState(key) {
        activeLoadings.delete(key);
        if (window.eventBus) {
            window.eventBus.emit('loading-state-changed', { key, state: null });
        }
    }

    /**
     * Clear all loading states
     */
    function clearAllLoadingStates() {
        activeLoadings.clear();
        if (window.eventBus) {
            window.eventBus.emit('loading-state-changed', { key: 'all', state: null });
        }
    }

    // Export to global scope
    window.loadingState = {
        setLoadingState,
        getLoadingState,
        isLoading,
        hasActiveLoadings,
        getActiveLoadings,
        clearLoadingState,
        clearAllLoadingStates
    };

    console.log('loading-state.js: initialized');
})();

