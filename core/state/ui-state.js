/**
 * ================================================================================================
 * UI STATE - Централизованное состояние UI-флагов
 * ================================================================================================
 *
 * ЦЕЛЬ: Единый источник правды для UI-индикаторов и доступности контролов.
 * Данные расчетов (портфели/метрики) сюда не помещаются.
 * Skill: is/skills/arch-foundation
 *
 * ПРИНЦИПЫ:
 * - Только UI-флаги и метаданные (например, устаревание кэша)
 * - Реактивность через Vue reactive API
 * - Простой API set/get для обновления состояния
 *
 * ССЫЛКА: is/skills/arch-foundation
 */

(function() {
    'use strict';

    if (!window.Vue) {
        console.error('ui-state.js: Vue не загружен');
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

    console.log('ui-state.js: инициализирован');
})();
