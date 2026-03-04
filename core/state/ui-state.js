/**
 * ================================================================================================
 * UI STATE - Centralized UI flags state
 * ================================================================================================
 *
 * PURPOSE: SSOT for UI indicators and control availability.
 * Calculation data (portfolios/metrics) not stored here.
 * Skill: id:sk-483943
 *
 * PRINCIPLES:
 * - UI flags and metadata only (e.g. cache staleness)
 * - Reactivity via Vue reactive API
 * - Simple set/get API for state updates
 *
 * REFERENCE: id:sk-483943
 */

(function() {
    'use strict';

    if (!window.Vue) {
        console.error('ui-state.js: Vue not loaded');
        return;
    }

    const uiState = window.Vue.reactive({
        cache: {
            coinsCacheMeta: {
                expiresAt: null,
                timestamp: null
            }
        },
        auth: {
            isLoading: false
        },
        tooltips: {
            currentLanguage: 'ru'
        },
        cloud: {
            postgres: {
                enabled: false
            }
        }
    });

    function getState() {
        return uiState;
    }

    function setCoinsCacheMeta(meta) {
        const safeMeta = meta && typeof meta === 'object' ? meta : {};
        uiState.cache.coinsCacheMeta = {
            expiresAt: typeof safeMeta.expiresAt === 'number' ? safeMeta.expiresAt : null,
            timestamp: typeof safeMeta.timestamp === 'number' ? safeMeta.timestamp : null
        };
    }

    function setAuthLoading(isLoading) {
        uiState.auth.isLoading = Boolean(isLoading);
    }

    function setTooltipsLanguage(language) {
        uiState.tooltips.currentLanguage = language || 'ru';
    }

    function setPostgresSyncEnabled(isEnabled) {
        uiState.cloud.postgres.enabled = Boolean(isEnabled);
    }

    window.uiState = {
        getState,
        setCoinsCacheMeta,
        setAuthLoading,
        setTooltipsLanguage,
        setPostgresSyncEnabled
    };

    console.log('ui-state.js: initialized');
})();
