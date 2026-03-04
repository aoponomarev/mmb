/**
 * ================================================================================================
 * AUTH STATE - Unified authorization state system
 * ================================================================================================
 *
 * PURPOSE: Centralized management of authorization state for synchronization across all components.
 * All auth component instances use SSOT.
 *
 * Skill: id:sk-7cf3f7
 *
 * PRINCIPLES:
 * - SSOT for authorization state
 * - Reactivity via Vue reactive API
 * - Synchronization via eventBus for notifying all subscribers
 * - Automatic update of all components when state changes
 *
 * USAGE:
 * const authState = window.authState.getState(); // Get reactive object
 * window.authState.setAuthState(true, userData); // Set authorization state
 * window.authState.clearAuthState(); // Clear authorization state
 * window.authState.setLoading(true); // Set loading state
 *
 * REFERENCE: Critical structures described in id:sk-483943
 */

(function() {
    'use strict';

    // Check Vue availability
    if (!window.Vue) {
        console.error('auth-state.js: Vue not loaded');
        return;
    }

    /**
     * Reactive auth state (SSOT)
     * All components work with this object directly
     */
    const authState = window.Vue.reactive({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        lastUpdated: null
    });

    /**
     * Set authorization state
     * @param {boolean} isAuthenticated - authorization status
     * @param {Object|null} user - user data (name, email, picture, etc.)
     */
    function setAuthState(isAuthenticated, user = null) {
        authState.isAuthenticated = isAuthenticated;
        authState.user = user;
        authState.lastUpdated = Date.now();

        // Emit event via eventBus (if available) for components that don't use reactive state directly
        if (window.eventBus) {
            window.eventBus.emit('auth-state-changed', {
                isAuthenticated: authState.isAuthenticated,
                user: authState.user,
                timestamp: authState.lastUpdated
            });
        }

        console.log('auth-state: состояние обновлено', {
            isAuthenticated: authState.isAuthenticated,
            user: authState.user ? authState.user.email : null
        });
    }

    /**
     * Set loading state
     * @param {boolean} isLoading - whether loading is in progress
     */
    function setLoading(isLoading) {
        authState.isLoading = isLoading;
        if (window.uiState && typeof window.uiState.setAuthLoading === 'function') {
            window.uiState.setAuthLoading(isLoading);
        }
    }

    /**
     * Clear authorization state
     */
    function clearAuthState() {
        authState.isAuthenticated = false;
        authState.user = null;
        authState.lastUpdated = Date.now();

        if (window.eventBus) {
            window.eventBus.emit('auth-state-changed', {
                isAuthenticated: false,
                user: null,
                timestamp: authState.lastUpdated
            });
        }

        console.log('auth-state: состояние очищено');
    }

    /**
     * Get reactive authorization state object
     * @returns {Object} - reactive object { isAuthenticated, isLoading, user, lastUpdated }
     */
    function getState() {
        return authState;
    }

    /**
     * Check authorization status via auth-client and update state
     * @returns {Promise<boolean>} - authorization status
     */
    async function checkAuthStatus() {
        if (!window.authClient) {
            console.warn('auth-state.checkAuthStatus: authClient not loaded');
            return false;
        }

        try {
            setLoading(true);

            const authenticated = await window.authClient.isAuthenticated();

            if (authenticated) {
                const user = await window.authClient.getCurrentUser();
                setAuthState(user !== null, user);
                return user !== null;
            } else {
                clearAuthState();
                return false;
            }
        } catch (error) {
            console.error('auth-state.checkAuthStatus error:', error);
            clearAuthState();
            return false;
        } finally {
            setLoading(false);
        }
    }

    // Export to global scope
    window.authState = {
        getState,
        setAuthState,
        setLoading,
        clearAuthState,
        checkAuthStatus
    };

    console.log('auth-state.js: initialized');
})();
