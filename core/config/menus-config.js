/**
 * ================================================================================================
 * MENUS CONFIG - Конфигурация выпадающих меню
 * ================================================================================================
 * Skill: app/skills/ux-principles
 *
 * ЦЕЛЬ: Единый источник правды для всех пунктов выпадающих меню в приложении.
 * Используется в index.html, test.html и других местах для единообразия.
 *
 * ПРИНЦИПЫ:
 * - Все пункты меню определяются здесь
 * - Порядок пунктов определяется порядком в массивах
 * - Условное отображение через condition (опционально)
 * - Заголовки получаются из modalsConfig для модальных окон
 * - Изменение меню в одном месте автоматически синхронизируется везде
 *
 * ПРИНЦИПЫ:
 * {
 *   id: 'unique-id',              // Уникальный ID пункта
 *   title: 'Заголовок' | { modalId: 'modalId' }, // Заголовок напрямую или через modalId
 *   handler: 'methodName',         // Название метода в app-ui-root
 *   condition: () => true          // Опциональная функция для условного отображения
 * }
 *
 * ССЫЛКИ:
 * - Принципы единого источника правды: `app/skills/ux-principles`
 * - Конфигурация модальных окон: core/config/modals-config.js
 */

(function() {
    'use strict';

    /**
     * Пункты меню настроек (Settings)
     */
    const SETTINGS_MENU_ITEMS = [
        {
            id: 'theme-toggle',
            title: 'Light | Dark Theme',
            handler: 'toggleTheme'
        },
        {
            id: 'export-portfolios-light',
            title: 'Экспорт портфелей',
            handler: 'handleExportPortfoliosLight'
        },
        {
            id: 'export-portfolios-full',
            title: 'Полный архив',
            handler: 'handleExportPortfoliosFull'
        },
        {
            id: 'import-portfolios',
            title: 'Импорт портфелей',
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
     * Пункты основного меню (Menu)
     * Используется для демонстрационных целей в test.html
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
     * Пункты меню математических моделей (2 уровень)
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
     * Пункты меню сортировки монет (Coin column dropdown)
     * Единый источник правды для выпадающего меню заголовка колонки "Coin"
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
     * Пункты меню действий над списком монет (dropdown в header таблицы)
     * Единый источник правды для выпадающего меню с действиями над выбранными/видимыми монетами.
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
            title: 'Удалить отмеченные',
            handler: 'handleDeleteSelected',
            icon: 'fas fa-trash'
        },
        {
            id: 'update-coins-metadata',
            title: 'Обновить метаданные',
            handler: 'handleUpdateCoinsMetadata',
            icon: 'fas fa-sync-alt'
        }
    ];

    /**
     * Получить заголовок пункта меню
     * @param {string|Object} titleConfig - Заголовок напрямую или объект с modalId
     * @returns {string} - Заголовок пункта меню
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
     * Получить отфильтрованные пункты меню настроек
     * @returns {Array} - Массив пунктов меню с примененными условиями
     */
    function getSettingsMenuItems() {
        return SETTINGS_MENU_ITEMS.filter(item => {
            if (item.condition && typeof item.condition === 'function') {
                try {
                    return item.condition();
                } catch (error) {
                    console.error(`menus-config: ошибка в condition для пункта "${item.id}":`, error);
                    return false;
                }
            }
            return true;
        });
    }

    /**
     * Получить отфильтрованные пункты основного меню
     * @returns {Array} - Массив пунктов меню с примененными условиями
     */
    function getMainMenuItems() {
        return MAIN_MENU_ITEMS.filter(item => {
            if (item.condition && typeof item.condition === 'function') {
                try {
                    return item.condition();
                } catch (error) {
                    console.error(`menus-config: ошибка в condition для пункта "${item.id}":`, error);
                    return false;
                }
            }
            return true;
        });
    }

    /**
     * Получить пункты меню сортировки монет
     * @returns {Array} - Массив пунктов меню сортировки монет
     */
    function getCoinSortMenuItems() {
        return COIN_SORT_MENU_ITEMS.filter(item => {
            if (item.condition && typeof item.condition === 'function') {
                try {
                    return item.condition();
                } catch (error) {
                    console.error(`menus-config: ошибка в condition для пункта "${item.id}":`, error);
                    return false;
                }
            }
            return true;
        });
    }

    /**
     * Получить пункты меню действий над монетами (для dropdown в таблице)
     * @returns {Array}
     */
    function getCoinActionMenuItems() {
        return COIN_ACTION_MENU_ITEMS.filter(item => {
            if (item.condition && typeof item.condition === 'function') {
                try {
                    return item.condition();
                } catch (error) {
                    console.error(`menus-config: ошибка в condition для пункта "${item.id}":`, error);
                    return false;
                }
            }
            return true;
        });
    }

    /**
     * Получить пункты меню математических моделей
     * @returns {Array}
     */
    function getMathModelsMenuItems() {
        return MATH_MODELS_MENU_ITEMS.filter(item => {
            if (item.condition && typeof item.condition === 'function') {
                try {
                    return item.condition();
                } catch (error) {
                    console.error(`menus-config: ошибка в condition для пункта "${item.id}":`, error);
                    return false;
                }
            }
            return true;
        });
    }

    // Экспорт в глобальную область
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

    console.log('menus-config.js: инициализирован');
})();
