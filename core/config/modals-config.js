/**
 * #JS-w33hCfsD
 * @description SSOT for modal titles, icons, metadata; menu/buttons get title from here.
 * @skill id:sk-e0b8f3
 *
 * PURPOSE: One place for modal config; title change syncs everywhere; modal title must match menu/button text.
 *
 * STRUCTURE:
 * - modalId: { title, icon?, description?, helpText?, bodyComponent?, centered?, condition? }
 *
 * REFERENCES:
 * - Modal component: #JS-HF48eDDR (modal.js)
 * - Menus config: #JS-1gU5y1dH (menus-config.js)
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
        'portfolioFormModal': {
            title: 'Формирование портфеля',
            description: 'Автоматическое формирование портфеля на основе математической модели',
            helpText: 'Соберите новый портфель из текущего набора выбранных монет, проверьте ключевые метрики и сохраните новый снимок.',
            bodyComponent: 'portfolio-form-modal-body',
            centered: true,
            autoRegister: false // Requires props (allCoins, onSave)
        },
        'portfolioRebalanceModal': {
            title: 'Ребалансировка портфеля',
            description: 'Корректировка существующего портфеля на основе актуального снимка',
            helpText: 'Проверьте текущий состав, скорректируйте веса и сохраните обновление уже существующего портфеля.',
            bodyComponent: 'portfolio-form-modal-body',
            centered: true,
            autoRegister: false // Uses the same body component as portfolioFormModal
        },
        'portfolioViewModal': {
            title: 'Просмотр портфеля',
            description: 'Детальный просмотр состава портфеля и метрик',
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
            title: 'Импорт портфелей',
            icon: 'fas fa-file-import',
            description: 'Выборочный импорт локальных копий портфелей из JSON',
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
        },
        'candlesModal': {
            title: 'Свечи (Bybit)',
            icon: 'fas fa-chart-line',
            description: 'Просмотр последних свечей (OHLC) с биржи Bybit',
            bodyComponent: 'candles-modal-body',
            centered: true,
            autoRegister: false, // Requires props (coinId, symbol)
            size: 'lg'
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
     * Get modal window description
     * @param {string} modalId - Modal window ID
     * @returns {string|null} - Description or null
     */
    function getModalDescription(modalId) {
        const config = getModalConfig(modalId);
        return config ? (config.description || null) : null;
    }

    /**
     * Get modal window help text
     * @param {string} modalId - Modal window ID
     * @returns {string|null} - Help text or null
     */
    function getModalHelpText(modalId) {
        const config = getModalConfig(modalId);
        return config ? (config.helpText || null) : null;
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
        getModalDescription,
        getModalHelpText,
        getModalIcon,
        getRegisteredModals
    };

    console.log('modals-config.js: initialized');
})();

