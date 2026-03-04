/**
 * #JS-w33hCfsD
 * @description SSOT for modal titles, icons, metadata; menu/buttons get title from here.
 * @skill id:sk-e0b8f3
 *
 * PURPOSE: One place for modal config; title change syncs everywhere; modal title must match menu/button text.
 *
 * STRUCTURE:
 * - modalId: { title, icon?, description?, bodyComponent?, centered?, condition? }
 *
 * REFERENCES:
 * - Modal component: shared/components/modal.js
 * - Menus config: core/config/menus-config.js
 */

(function() {
    'use strict';

    const MODALS_CONFIG = {
        'timezoneModal': {
            title: 'Таймзона & i18n',
            icon: 'fas fa-adjust',
            description: 'Настройка таймзоны и языка перевода новостей',
            bodyComponent: 'timezone-modal-body',
            centered: true,
            autoRegister: false // Requires props (v-model, on-save, on-cancel)
        },
        'aiApiModal': {
            title: 'API-ключи',
            icon: 'fas fa-robot',
            description: 'Настройки API-ключей (GitHub, Yandex, PostgreSQL)',
            bodyComponent: 'ai-api-settings',
            centered: true,
            autoRegister: true // Does not require props
        },
        'portfolioModal': {
            title: 'Портфель',
            icon: 'fas fa-briefcase',
            description: 'Создание или редактирование portfolioя',
            bodyComponent: 'portfolio-modal-body',
            centered: true,
            autoRegister: false, // Requires props
            condition: () => window.appConfig && window.appConfig.isFeatureEnabled('portfolios') && window.appConfig.isFeatureEnabled('cloudSync')
        },
        'portfolioFormModal': {
            title: 'Формирование portfolioя',
            description: 'Автоматическое формирование portfolioя на основе математической модели',
            bodyComponent: 'portfolio-form-modal-body',
            centered: true,
            autoRegister: false // Requires props (allCoins, onSave)
        },
        'portfolioViewModal': {
            title: 'Просмотр portfolioя',
            description: 'Детальный просмотр состава portfolioя и metrics',
            bodyComponent: 'portfolio-view-modal-body',
            centered: true,
            autoRegister: false // Requires props (portfolio, onDelete)
        },
        'authModal': {
            title: 'Авторизация',
            icon: 'fas fa-sign-in-alt',
            description: 'Авторизация через Google OAuth',
            bodyComponent: 'auth-modal-body',
            centered: true,
            autoRegister: false, // Requires props (on-login-success, on-logout-success)
            condition: () => window.appConfig && window.appConfig.isFeatureEnabled('auth')
        },
        'storageResetModal': {
            title: 'Сброс кэша',
            icon: 'fas fa-trash-alt',
            description: 'Выборочное удаление данных из кэша',
            bodyComponent: 'storage-reset-modal-body',
            centered: true,
            autoRegister: true // Does not require props
        },
        'portfoliosImportModal': {
            title: 'Импорт portfolios',
            icon: 'fas fa-file-import',
            description: 'Выборочный импорт portfolios из JSON',
            bodyComponent: 'portfolios-import-modal-body',
            centered: true,
            autoRegister: true
        },
        'coinSetSaveModal': {
            title: 'Сохранить набор монет',
            icon: 'fas fa-save',
            description: 'Создание нового набора монет из выбранных',
            bodyComponent: 'coin-set-save-modal-body',
            centered: true,
            autoRegister: false // Requires props (selectedCoinIds, onSave, onCancel)
        },
        'coinSetLoadModal': {
            title: 'Загрузить набор монет',
            icon: 'fas fa-folder-open',
            description: 'Выбор сохраненного набора монет for загрузки',
            bodyComponent: 'coin-set-load-modal-body',
            centered: true,
            autoRegister: false // Requires props (onLoad, onCancel)
        },
        'iconManagerModal': {
            title: 'Управление иконкой',
            icon: 'fas fa-image',
            description: 'Замена иконки монеты на качественную версию в GitHub CDN',
            bodyComponent: 'icon-manager-modal-body',
            centered: true,
            autoRegister: false // Requires props (coinData)
        },
        'sessionLogModal': {
            title: 'Session Log',
            icon: 'fas fa-terminal',
            description: 'Логи сессии for отладки',
            bodyComponent: 'session-log-modal-body',
            centered: true,
            autoRegister: true // Does not require props
        },
        'coingeckoCronHistoryModal': {
            title: 'История забора CoinGecko',
            icon: 'fas fa-database',
            description: 'Последние циклы обновления монет в облачной БД',
            bodyComponent: 'coingecko-cron-history-modal-body',
            centered: true,
            autoRegister: true
        }
    };

    /**
     * Get modal window configuration
     * @param {string} modalId - Modal window ID
     * @returns {Object|null} - Config or null
     */
    function getModalConfig(modalId) {
        return MODALS_CONFIG[modalId] || null;
    }

    /**
     * Get modal window title
     * @param {string} modalId - Modal window ID
     * @returns {string|null} - Title or null
     */
    function getModalTitle(modalId) {
        const config = getModalConfig(modalId);
        return config ? config.title : null;
    }

    /**
     * Get modal window icon
     * @param {string} modalId - Modal window ID
     * @returns {string|null} - Icon or null
     */
    function getModalIcon(modalId) {
        const config = getModalConfig(modalId);
        return config ? config.icon : null;
    }

    /**
     * Get list of modals for automatic registration (with conditions applied)
     * Returns only modals with autoRegister: true
     * @returns {Array} - Array of modal configurations
     */
    function getRegisteredModals() {
        const modals = [];
        for (const [modalId, config] of Object.entries(MODALS_CONFIG)) {
            // Skip modals without autoRegister or with autoRegister: false
            if (!config.autoRegister) {
                continue;
            }

            // Check display condition
            if (config.condition && typeof config.condition === 'function') {
                try {
                    if (!config.condition()) {
                        continue; // Skip modal if condition not met
                    }
                } catch (error) {
                    console.error(`modals-config: ошибка в condition for модального окна "${modalId}":`, error);
                    continue;
                }
            }
            modals.push({
                id: modalId,
                ref: modalId,
                ...config
            });
        }
        return modals;
    }

    // Export to global scope
    window.modalsConfig = {
        MODALS_CONFIG,
        getModalConfig,
        getModalTitle,
        getModalIcon,
        getRegisteredModals
    };

    console.log('modals-config.js: initialized');
})();

