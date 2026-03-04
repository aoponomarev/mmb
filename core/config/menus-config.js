/**
 * ================================================================================================
 * MENUS CONFIG - Dropdown menus configuration
 * ================================================================================================
 * Skill: id:sk-e0b8f3
 *
 * PURPOSE: SSOT for all dropdown menu items in the application.
 * Used in index.html, test.html and other places for consistency.
 *
 * PRINCIPLES:
 * - All menu items are defined here
 * - Item order is determined by array order
 * - Conditional display via condition (optional)
 * - Titles are obtained from modalsConfig for modal windows
 * - Menu changes in one place automatically sync everywhere
 *
 * PRINCIPLES:
 * {
 *   id: 'unique-id',              // Unique item ID
 *   title: 'Title' | { modalId: 'modalId' }, // Title directly or via modalId
 *   handler: 'methodName',         // Method name in app-ui-root
 *   condition: () => true          // Optional function for conditional display
 * }
 *
 * REFERENCES:
 * - SSOT principles: id:sk-e0b8f3
 * - Modal windows configuration: core/config/modals-config.js
 */

(function() {
    'use strict';

    /**
     * Settings menu items (Settings)
     */
    const SETTINGS_MENU_ITEMS = [
        {
            id: 'theme-toggle',
            title: 'Light | Dark Theme',
            handler: 'toggleTheme'
        },
        {
            id: 'export-portfolios-light',
            title: 'Экспорт portfolios',
            handler: 'handleExportPortfoliosLight'
        },
        {
            id: 'export-portfolios-full',
            title: 'Полный архив',
            handler: 'handleExportPortfoliosFull'
        },
        {
            id: 'import-portfolios',
            title: 'Импорт portfolios',
            handler: 'openPortfoliosImportModal'
        },
        {
            id: 'auth',
            title: { modalId: 'authModal' },
            handler: 'openAuthModal',
            condition: () => window.appConfig && window.appConfig.isFeatureEnabled('auth')
        },
        {
            id: 'timezone',
            title: { modalId: 'timezoneModal' },
            handler: 'openTimezoneModal'
        },
        {
            id: 'ai-api',
            title: { modalId: 'aiApiModal' },
            handler: 'openAiApiModal'
        },
        {
            id: 'storage-reset',
            title: { modalId: 'storageResetModal' },
            handler: 'openStorageResetModal'
        },
        {
            id: 'session-log',
            title: { modalId: 'sessionLogModal' },
            handler: 'openSessionLogModal'
        }
    ];

    /**
     * Main menu items (Menu)
     * Used for demo purposes in test.html
     */
    const MAIN_MENU_ITEMS = [
        {
            id: 'math-models',
            title: 'Матем. модели',
            handler: 'switchToMathModelsMenu'
        },
        {
            id: 'user-mm',
            title: 'Пользовательские ММ',
            handler: 'handleClick'
        },
        {
            id: 'add-mm',
            title: 'Добавить ММ',
            handler: 'handleClick'
        }
    ];

    /**
     * Math models menu items (2nd level)
     */
    const MATH_MODELS_MENU_ITEMS = [
        {
            id: 'back-to-main',
            title: '..',
            icon: 'fas fa-level-up-alt',
            handler: 'switchToMainMenu'
        },
        {
            id: 'median-260101',
            title: 'Медиана (A.I.R.) 26.01.01',
            handler: 'handleMedian260101Click'
        },
        {
            id: 'median-260115',
            title: 'Медиана (A.I.R.) 26.01.15 (в разработке)',
            handler: 'handleMedian260115Click'
        },
        {
            id: 'news',
            title: 'Новости',
            handler: 'handleClick'
        }
    ];

    /**
     * Coin sort menu items (Coin column dropdown)
     * SSOT for Coin column header dropdown menu
     */
    const COIN_SORT_MENU_ITEMS = [
        {
            id: 'alphabet',
            title: 'По алфавиту',
            sortType: 'alphabet'
        },
        {
            id: 'market_cap',
            title: 'По капитализации',
            sortType: 'market_cap'
        },
        {
            id: 'total_volume',
            title: 'По объему',
            sortType: 'total_volume'
        },
        {
            id: 'favorite',
            title: 'Избранное',
            sortType: 'favorite'
        },
        {
            id: 'selected',
            title: 'Отмеченное',
            sortType: 'selected'
        }
    ];

    /**
     * Coin action menu items (dropdown in table header)
     * SSOT for dropdown menu with actions on selected/visible coins
     */
    const COIN_ACTION_MENU_ITEMS = [
        {
            id: 'select-favorites',
            title: 'Выбрать избранное',
            handler: 'handleSelectFavorites',
            icon: 'fas fa-star'
        },
        {
            id: 'select-stablecoins',
            title: 'Стейблкоины',
            handler: 'handleSelectStablecoins',
            icon: window.coinsConfig.getCoinTypeIcon('stable')
        },
        {
            id: 'select-wrapped',
            title: 'Обертки',
            handler: 'handleSelectWrapped',
            icon: window.coinsConfig.getCoinTypeIcon('wrapped'),
            condition: () => {
                const coins = window.appRoot ? (window.appRoot.coins || []) : [];
                return coins.some(coin => window.coinsConfig && window.coinsConfig.getWrappedCoins && window.coinsConfig.getWrappedCoins().includes(coin.id));
            }
        },
        {
            id: 'select-lst',
            title: 'Liquid Staking',
            handler: 'handleSelectLst',
            icon: window.coinsConfig.getCoinTypeIcon('lst'),
            condition: () => {
                const coins = window.appRoot ? (window.appRoot.coins || []) : [];
                return coins.some(coin => window.coinsConfig && window.coinsConfig.getLstCoins && window.coinsConfig.getLstCoins().includes(coin.id));
            }
        },
        {
            id: 'divider-coin-actions-1',
            type: 'divider'
        },
        {
            id: 'delete-selected',
            title: 'Delete отмеченные',
            handler: 'handleDeleteSelected',
            icon: 'fas fa-trash'
        },
        {
            id: 'update-coins-metadata',
            title: 'Update метаданные',
            handler: 'handleUpdateCoinsMetadata',
            icon: 'fas fa-sync-alt'
        }
    ];

    /**
     * Get menu item title
     * @param {string|Object} titleConfig - Title directly or object with modalId
     * @returns {string} - Menu item title
     */
    function getMenuItemTitle(titleConfig) {
        if (typeof titleConfig === 'string') {
            return titleConfig;
        }
        if (titleConfig && titleConfig.modalId) {
            return window.modalsConfig ? (window.modalsConfig.getModalTitle(titleConfig.modalId) || titleConfig.modalId) : titleConfig.modalId;
        }
        return '';
    }

    /**
     * Get filtered settings menu items
     * @returns {Array} - Array of menu items with conditions applied
     */
    function getSettingsMenuItems() {
        return SETTINGS_MENU_ITEMS.filter(item => {
            if (item.condition && typeof item.condition === 'function') {
                try {
                    return item.condition();
                } catch (error) {
                    console.error(`menus-config: ошибка в condition for пункта "${item.id}":`, error);
                    return false;
                }
            }
            return true;
        });
    }

    /**
     * Get filtered main menu items
     * @returns {Array} - Array of menu items with conditions applied
     */
    function getMainMenuItems() {
        return MAIN_MENU_ITEMS.filter(item => {
            if (item.condition && typeof item.condition === 'function') {
                try {
                    return item.condition();
                } catch (error) {
                    console.error(`menus-config: ошибка в condition for пункта "${item.id}":`, error);
                    return false;
                }
            }
            return true;
        });
    }

    /**
     * Get coin sort menu items
     * @returns {Array} - Array of coin sort menu items
     */
    function getCoinSortMenuItems() {
        return COIN_SORT_MENU_ITEMS.filter(item => {
            if (item.condition && typeof item.condition === 'function') {
                try {
                    return item.condition();
                } catch (error) {
                    console.error(`menus-config: ошибка в condition for пункта "${item.id}":`, error);
                    return false;
                }
            }
            return true;
        });
    }

    /**
     * Get coin action menu items (for table dropdown)
     * @returns {Array}
     */
    function getCoinActionMenuItems() {
        return COIN_ACTION_MENU_ITEMS.filter(item => {
            if (item.condition && typeof item.condition === 'function') {
                try {
                    return item.condition();
                } catch (error) {
                    console.error(`menus-config: ошибка в condition for пункта "${item.id}":`, error);
                    return false;
                }
            }
            return true;
        });
    }

    /**
     * Get math models menu items
     * @returns {Array}
     */
    function getMathModelsMenuItems() {
        return MATH_MODELS_MENU_ITEMS.filter(item => {
            if (item.condition && typeof item.condition === 'function') {
                try {
                    return item.condition();
                } catch (error) {
                    console.error(`menus-config: ошибка в condition for пункта "${item.id}":`, error);
                    return false;
                }
            }
            return true;
        });
    }

    // Export to global scope
    window.menusConfig = {
        SETTINGS_MENU_ITEMS,
        MAIN_MENU_ITEMS,
        MATH_MODELS_MENU_ITEMS,
        COIN_SORT_MENU_ITEMS,
        COIN_ACTION_MENU_ITEMS,
        getMenuItemTitle,
        getSettingsMenuItems,
        getMainMenuItems,
        getMathModelsMenuItems,
        getCoinSortMenuItems,
        getCoinActionMenuItems
    };

    console.log('menus-config.js: initialized');
})();
