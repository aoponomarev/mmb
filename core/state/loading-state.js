/**
 * ================================================================================================
 * LOADING STATE - Единая система состояний загрузки
 * ================================================================================================
 *
 * ЦЕЛЬ: Управление состояниями загрузки (loading, error, success) для всех компонентов.
 * Синхронизация состояний, индикаторы прогресса, отмена запросов.
 * Skill: a/skills/app/skills/architecture/architecture-core-stack.md
 *
 * ПРИНЦИПЫ:
 * - Единый интерфейс для всех состояний загрузки
 * - Отслеживание множественных загрузок
 * - Автоматическое управление состоянием
 *
 * ССЫЛКА: Критически важные структуры описаны в a/skills/app/skills/architecture/architecture-core-stack.md
 */

(function() {
    'use strict';

    /**
     * Активные загрузки по ключам
     */
    const activeLoadings = new Map();

    /**
     * Установить состояние загрузки
     * @param {string} key - ключ загрузки
     * @param {Object} state - состояние { loading: boolean, error: Error|null, data: any }
     */
    function setLoadingState(key, state) {
        activeLoadings.set(key, {
            loading: state.loading !== undefined ? state.loading : false,
            error: state.error || null,
            data: state.data || null,
            timestamp: Date.now()
        });

        // Эмит события через eventBus (если доступен)
        if (window.eventBus) {
            window.eventBus.emit('loading-state-changed', { key, state: activeLoadings.get(key) });
        }
    }

    /**
     * Получить состояние загрузки
     * @param {string} key - ключ загрузки
     * @returns {Object|null} - состояние или null
     */
    function getLoadingState(key) {
        return activeLoadings.get(key) || null;
    }

    /**
     * Проверить, идёт ли загрузка
     * @param {string} key - ключ загрузки
     * @returns {boolean}
     */
    function isLoading(key) {
        const state = activeLoadings.get(key);
        return state ? state.loading : false;
    }

    /**
     * Проверить, есть ли активные загрузки
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
     * Получить все активные загрузки
     * @returns {Array} - массив ключей активных загрузок
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
     * Очистить состояние загрузки
     * @param {string} key - ключ загрузки
     */
    function clearLoadingState(key) {
        activeLoadings.delete(key);
        if (window.eventBus) {
            window.eventBus.emit('loading-state-changed', { key, state: null });
        }
    }

    /**
     * Очистить все состояния загрузки
     */
    function clearAllLoadingStates() {
        activeLoadings.clear();
        if (window.eventBus) {
            window.eventBus.emit('loading-state-changed', { key: 'all', state: null });
        }
    }

    // Экспорт в глобальную область
    window.loadingState = {
        setLoadingState,
        getLoadingState,
        isLoading,
        hasActiveLoadings,
        getActiveLoadings,
        clearLoadingState,
        clearAllLoadingStates
    };

    console.log('loading-state.js: инициализирован');
})();

