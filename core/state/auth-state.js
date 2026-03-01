/**
 * ================================================================================================
 * AUTH STATE - Единая система состояния авторизации
 * ================================================================================================
 *
 * ЦЕЛЬ: Централизованное управление состоянием авторизации для синхронизации между всеми компонентами.
 * Все экземпляры компонентов авторизации используют единый источник правды.
 *
 * Skill: a/skills/app/skills/integrations/integrations-oauth-file-protocol.md
 *
 * ПРИНЦИПЫ:
 * - Единый источник правды для состояния авторизации
 * - Реактивность через Vue reactive API
 * - Синхронизация через eventBus для оповещения всех подписчиков
 * - Автоматическое обновление всех компонентов при изменении состояния
 *
 * ИСПОЛЬЗОВАНИЕ:
 * const authState = window.authState.getState(); // Получить reactive объект
 * window.authState.setAuthState(true, userData); // Установить состояние авторизации
 * window.authState.clearAuthState(); // Очистить состояние авторизации
 * window.authState.setLoading(true); // Установить состояние загрузки
 *
 * ССЫЛКА: Критически важные структуры описаны в a/skills/app/skills/architecture/architecture-core-stack.md
 */

(function() {
    'use strict';

    // Проверяем доступность Vue
    if (!window.Vue) {
        console.error('auth-state.js: Vue не загружен');
        return;
    }

    /**
     * Реактивное состояние авторизации (единый источник правды)
     * Все компоненты работают с этим объектом напрямую
     */
    const authState = window.Vue.reactive({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        lastUpdated: null
    });

    /**
     * Установить состояние авторизации
     * @param {boolean} isAuthenticated - статус авторизации
     * @param {Object|null} user - данные пользователя (name, email, picture и т.д.)
     */
    function setAuthState(isAuthenticated, user = null) {
        authState.isAuthenticated = isAuthenticated;
        authState.user = user;
        authState.lastUpdated = Date.now();

        // Эмит события через eventBus (если доступен) для компонентов, которые не используют реактивное состояние напрямую
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
     * Установить состояние загрузки
     * @param {boolean} isLoading - идет ли загрузка
     */
    function setLoading(isLoading) {
        authState.isLoading = isLoading;
        if (window.uiState && typeof window.uiState.setAuthLoading === 'function') {
            window.uiState.setAuthLoading(isLoading);
        }
    }

    /**
     * Очистить состояние авторизации
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
     * Получить реактивный объект состояния авторизации
     * @returns {Object} - реактивный объект { isAuthenticated, isLoading, user, lastUpdated }
     */
    function getState() {
        return authState;
    }

    /**
     * Проверить статус авторизации через auth-client и обновить состояние
     * @returns {Promise<boolean>} - статус авторизации
     */
    async function checkAuthStatus() {
        if (!window.authClient) {
            console.warn('auth-state.checkAuthStatus: authClient не загружен');
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

    // Экспорт в глобальную область
    window.authState = {
        getState,
        setAuthState,
        setLoading,
        clearAuthState,
        checkAuthStatus
    };

    console.log('auth-state.js: инициализирован');
})();
