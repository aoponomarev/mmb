/**
 * #JS-yx22mAv8
 * @description Vue app root: init, module loader, theme/version/markup; components from core/module-loader.js.
 * @skill id:sk-483943
 *
 * APP INIT: data-bs-theme, app-version-{hash}, clearOldVersions, autoMarkup.
 */

(function() {
    'use strict';

    /**
     * Initialize Vue app
     * Called after all modules loaded via module system
     */
    function initVueApp() {
        // Check Vue and components presence
        if (typeof Vue === 'undefined') {
            console.error('app-ui-root: Vue.js not loaded');
            return;
        }

        // Base components (must always be loaded)
        if (!window.cmpDropdownMenuItem || !window.cmpButton || !window.cmpDropdown || !window.cmpCombobox || !window.cmpButtonGroup || !window.appHeader || !window.appFooter || !window.cmpModal || !window.cmpModalButtons || !window.cmpTimezoneSelector || !window.modalExampleBody || !window.aiApiSettings || !window.timezoneModalBody || !window.cmpSystemMessage || !window.cmpSystemMessages) {
            console.error('app-ui-root: not all base components loaded');
            console.log('Loaded components:', {
                cmpDropdownMenuItem: !!window.cmpDropdownMenuItem,
                cmpButton: !!window.cmpButton,
                cmpDropdown: !!window.cmpDropdown,
                cmpCombobox: !!window.cmpCombobox,
                cmpButtonGroup: !!window.cmpButtonGroup,
                appHeader: !!window.appHeader,
                appFooter: !!window.appFooter,
                cmpModal: !!window.cmpModal,
                cmpModalButtons: !!window.cmpModalButtons,
                cmpTimezoneSelector: !!window.cmpTimezoneSelector,
                modalExampleBody: !!window.modalExampleBody,
                aiApiSettings: !!window.aiApiSettings,
                timezoneModalBody: !!window.timezoneModalBody,
                cmpSystemMessage: !!window.cmpSystemMessage,
                cmpSystemMessages: !!window.cmpSystemMessages
            });
            return;
        }

        // Check feature flags for conditional component loading
        const authEnabled = window.appConfig && window.appConfig.isFeatureEnabled('auth');
        const portfoliosEnabled = window.appConfig && window.appConfig.isFeatureEnabled('portfolios') && window.appConfig.isFeatureEnabled('cloudSync');

        // auth-button no longer used in header, auth via modal.

        if (portfoliosEnabled && !window.portfoliosManager) {
            console.warn('app-ui-root: portfolios-manager not loaded, though portfolios and cloudSync flags enabled');
        }

        const { createApp } = Vue;

        const app = createApp({
              mixins: [window.columnVisibilityMixin],
            components: {
                'coin-block': window.cmpCoinBlock,
                'cell-num': window.cmpCellNum,
                'sortable-header': window.cmpSortableHeader,
                'dropdown-menu-item': window.cmpDropdownMenuItem,
                'cmp-button': window.cmpButton,
                'cmp-dropdown': window.cmpDropdown,
                'cmp-combobox': window.cmpCombobox,
                'cmp-button-group': window.cmpButtonGroup,
                'cmp-modal': window.cmpModal,
                'cmp-modal-buttons': window.cmpModalButtons,
                'cmp-timezone-selector': window.cmpTimezoneSelector,
                'timezone-modal-body': window.timezoneModalBody,
                'modal-example-body': window.modalExampleBody,
                'ai-api-settings': window.aiApiSettings,
                'postgres-settings': window.postgresSettings,
                'storage-reset-modal-body': window.storageResetModalBody,
                'portfolios-import-modal-body': window.portfoliosImportModalBody,
                ...(window.sessionLogModalBody ? { 'session-log-modal-body': window.sessionLogModalBody } : {}),
                // Conditional registration of auth and portfolio components
                ...(window.authModalBody ? { 'auth-modal-body': window.authModalBody } : {}),
                ...(window.portfolioModalBody ? { 'portfolio-modal-body': window.portfolioModalBody } : {}),
                ...(window.portfoliosManager ? { 'portfolios-manager': window.portfoliosManager } : {}),
                ...(window.coinSetSaveModalBody ? { 'coin-set-save-modal-body': window.coinSetSaveModalBody } : {}),
                ...(window.portfolioFormModalBody ? { 'portfolio-form-modal-body': window.portfolioFormModalBody } : {}),
                ...(window.portfolioViewModalBody ? { 'portfolio-view-modal-body': window.portfolioViewModalBody } : {}),
                ...(window.coinSetLoadModalBody ? { 'coin-set-load-modal-body': window.coinSetLoadModalBody } : {}),
                ...(window.cmpIconManagerModalBody ? { 'icon-manager-modal-body': window.cmpIconManagerModalBody } : {}),
                ...(window.coingeckoCronHistoryModalBody ? { 'coingecko-cron-history-modal-body': window.coingeckoCronHistoryModalBody } : {}),
                'app-header': window.appHeader,
                'app-footer': window.appFooter,
                // System message components
                'cmp-system-message': window.cmpSystemMessage,
                'cmp-system-messages': window.cmpSystemMessages
            },
            data() {
                // Check feature flags
                const authEnabled = window.appConfig && window.appConfig.isFeatureEnabled('auth');
                const portfoliosEnabled = window.appConfig && window.appConfig.isFeatureEnabled('portfolios') && window.appConfig.isFeatureEnabled('cloudSync');

                // Sync theme init (read directly from localStorage to avoid flicker)
                let initialTheme = 'light';
                try {
                    const savedTheme = localStorage.getItem('theme');
                    if (savedTheme === 'dark' || savedTheme === 'light') {
                        initialTheme = savedTheme;
                    }
                } catch (e) {
                    // Ignore errors
                }

                // Apply theme immediately at init
                if (initialTheme === 'dark') {
                    document.body.setAttribute('data-bs-theme', 'dark');
                } else {
                    document.body.removeAttribute('data-bs-theme');
                }

                // Sync translation language init (read directly from localStorage)
                // IMPORTANT: use same source as mounted() to avoid desync
                let initialLanguage = 'ru';
                try {
                    // Try cacheManager first (if sync available), then localStorage
                    if (window.cacheManager && typeof window.cacheManager.get === 'function') {
                        // cacheManager is async, so use localStorage for sync init
                        const savedLanguage = localStorage.getItem('translation-language');
                        if (savedLanguage && typeof savedLanguage === 'string') {
                            initialLanguage = savedLanguage;
                        }
                    } else {
                        const savedLanguage = localStorage.getItem('translation-language');
                        if (savedLanguage && typeof savedLanguage === 'string') {
                            initialLanguage = savedLanguage;
                        }
                    }
                } catch (e) {
                    // Ignore errors
                }

                const defaultModelId = (window.modelsConfig && typeof window.modelsConfig.getDefaultModelId === 'function')
                    ? window.modelsConfig.getDefaultModelId()
                    : 'Median/AIR/260101';
                const defaultWorkspace = (window.workspaceConfig && typeof window.workspaceConfig.getDefaultWorkspace === 'function')
                    ? window.workspaceConfig.getDefaultWorkspace()
                    : {
                        activeModelId: defaultModelId,
                        activeCoinSetIds: [],
                        metrics: { horizonDays: 2, mdnHours: 4, activeTabId: 'percent' }
                    };
                const defaultMetrics = defaultWorkspace.metrics || {};
                let defaultActiveTabId = defaultMetrics.activeTabId || 'percent';
                // Migrate old tabs to new "Result" tab
                if (['max', 'min', 'balance-delta'].includes(defaultActiveTabId)) {
                    defaultActiveTabId = 'result';
                }
                const defaultActiveCoinSetIds = Array.isArray(defaultWorkspace.activeCoinSetIds) ? defaultWorkspace.activeCoinSetIds : [];

                return {
                    // Feature flags for conditional component display
                    isAuthEnabled: authEnabled,
                    isPortfoliosEnabled: portfoliosEnabled,
                    // Centralized auth state (SSOT)
                    authState: window.authState ? window.authState.getState() : null,
                    // Modal config (for template access)
                    modalsConfig: window.modalsConfig || null,
                    // Portfolio form state
                    currentViewingPortfolio: null,
                    portfolioFormKey: 0,
                    userPortfolios: [],
                    // Tooltip config (for template access)
                    tooltipsConfig: window.tooltipsConfig || null,
                    // Current app theme
                    currentTheme: initialTheme,
                    // Main menu level (0 - main, 1 - math models)
                    menuLevel: 0,
                    // Reactive tooltips (update on language change)
                    tooltips: {
                        'button.save.icon': '',
                        'button.save.text': '',
                        'button.delete.icon': '',
                        'button.delete.text': '',
                        'button.load.icon': '',
                        'button.load.text': '',
                        'button.notifications.icon': '',
                        'button.notifications.text': '',
                        'button.notifications.suffix.badge': '',
                        'button.export.icon': '',
                        'button.export.text': '',
                        'button.export.suffix.icon': '',
                        'button.help.icon': '',
                        'button.help.text': '',
                        'button.help.suffix.info': ''
                    },
                    // Dropdown data
                    dropdownItems: [
                        { id: 1, name: 'Элемент 1', description: 'Описание элемента 1', icon: 'fas fa-home', labelShort: 'Эл. 1' },
                        { id: 2, name: 'Элемент 2', description: 'Описание элемента 2', icon: 'fas fa-user', labelShort: 'Эл. 2' },
                        { id: 3, name: 'Элемент 3', description: 'Описание элемента 3', icon: 'fas fa-cog', labelShort: 'Эл. 3' },
                        { id: 4, name: 'Элемент 4', description: 'Описание элемента 4', icon: 'fas fa-file', labelShort: 'Эл. 4' },
                        { id: 5, name: 'Элемент 5', description: 'Описание элемента 5', icon: 'fas fa-folder', labelShort: 'Эл. 5' }
                    ],
                    // Select mode data (separate vars per dropdown)
                    selectedDropdownItem1: null, // Icon only
                    selectedDropdownItem2: null, // Icon + full text
                    selectedDropdownItem3: null, // Icon + short text
                    selectedDropdownItem4: null, // Full text only
                    selectedDropdownItem5: null, // Value only
                    selectedDropdownItem6: null, // All together
                    longList: Array.from({ length: 50 }, (_, i) => ({
                        id: i + 1,
                        name: `Элемент ${i + 1}`,
                        description: `Описание элемента ${i + 1}`
                    })),
                    isMenuExpanded: false,
                    // Combobox data
                    comboboxValue1: '',
                    comboboxValue2: '',
                    comboboxValue3: '',
                    comboboxValue4: '',
                    comboboxValue5: '',
                    comboboxValue6: '',
                    comboboxValue7: '',
                    comboboxItems: [
                        { id: 1, label: 'Москва', value: 'moscow' },
                        { id: 2, label: 'Санкт-Петербург', value: 'spb' },
                        { id: 3, label: 'Новосибирск', value: 'novosibirsk' },
                        { id: 4, label: 'Екатеринбург', value: 'ekaterinburg' },
                        { id: 5, label: 'Казань', value: 'kazan' },
                        { id: 6, label: 'Нижний Новгород', value: 'nn' },
                        { id: 7, label: 'Челябинск', value: 'chelyabinsk' },
                        { id: 8, label: 'Самара', value: 'samara' }
                    ],
                    comboboxLongList: Array.from({ length: 100 }, (_, i) => ({
                        id: i + 1,
                        label: `Город ${i + 1}`,
                        value: `city-${i + 1}`
                    })),
                    // Timezone
                    selectedTimezone: 'Europe/Moscow',
                    initialTimezone: 'Europe/Moscow', // Initial timezone when modal opens
                    selectedTranslationLanguage: 'ru',
                    initialTranslationLanguage: 'ru', // Initial translation language when modal opens
                    // Yandex API testing
                    yandexTestQuery: '',
                    yandexTestInputQuery: '',
                    yandexTestResponse: '',
                    yandexTestLoading: false,
                    yandexTestError: '', // Empty string instead of null for better Vue reactivity
                    // Google-Cloudflare integration testing
                    testStep1Result: null,
                    testStep2Result: null,
                    testStep3Result: null,
                    testStep4Result: null,
                    testStep5Result: null,
                    testStep6Result: null,
                    // Message system testing
                    testMessagesStep1Result: null,
                    testMessagesStep2Result: null,
                    testMessagesStep3Result: null,
                    testMessagesStep4Result: null,
                    testMessagesStep5Result: null,
                    // DEBUG: Data Provider testing
                    testLoading: false,
                    testError: null,
                    testResults: [],
                    // DEBUG: Coin Sets testing
                    testCoinSets: [],
                    // Coin table (index.html)
                    coins: [],
                    coinsLoading: false,
                    coinsError: null,
                    headerActionHover: null, // Hover state for header action buttons (load/save, refresh, favorites)
                    coinsCacheCheckTimer: null, // Timer for top-coins cache expiry check
                    selectedCoinIds: [], // Selected coins (stub)
                    favoriteCoinIds: [], // Favorite coin IDs (for reactivity)
                    favoriteCoinsMeta: [], // Full favorite coin data from favoritesManager (id, symbol)
                    favoriteActionHoverId: null, // Coin ID hovered in favorites list action icon
                    coinsDataCache: new Map(), // Coin data cache (id -> coin data) to preserve icons after table removal
                    horizonDays: Number.isFinite(Number(defaultMetrics.horizonDays)) && Number(defaultMetrics.horizonDays) > 0 ? Number(defaultMetrics.horizonDays) : 2, // Forecast horizon (days) for metrics
                    mdnHours: Number.isFinite(Number(defaultMetrics.mdnHours)) && Number(defaultMetrics.mdnHours) > 0 ? Number(defaultMetrics.mdnHours) : 4, // MDN horizon (hours)
                    mdnValue: null, // Current MDN (Market Direction Now) for selected horizon
                    agrMethod: defaultMetrics.agrMethod || 'mp', // AGR calculation method (dcs, tsi, mp)
                    // Cloud DB (PostgreSQL) status indicator
                    dbStatus: { count: null, loading: false, error: false },
                    // Data for Info-box in header
                    infoBoxMedians: { cdh: 0, cgr: 0, agr: 0 },
                    infoBoxBreadth: { bullishPercent: 0, adRatio: '—' },
                    infoBoxDirection: { trend: 'Neutral' },
                    infoBoxPortfolio: { pl: 0, count: 0 },
                    activeTabId: defaultActiveTabId, // Active display tab (%, Gradients, etc.)
                    displayTabs: [
                        { type: 'radio', id: 'percent', label: '%', labelShort: '%', active: defaultActiveTabId === 'percent' },
                        { type: 'radio', id: 'complex-deltas', label: 'Компл. дельты', labelShort: 'CD', active: defaultActiveTabId === 'complex-deltas' },
                        { type: 'radio', id: 'gradients', label: 'Градиенты', labelShort: 'GR', active: defaultActiveTabId === 'gradients' },
                        { type: 'radio', id: 'result', label: 'Результат', labelShort: 'RES', active: defaultActiveTabId === 'result' }
                    ],
                    activeModelId: defaultWorkspace.activeModelId || defaultModelId, // Current math model
                    recommendedAgrMethod: null,
                    activeCoinSetIds: defaultActiveCoinSetIds, // Coin IDs from loaded set (empty = default list, array = active set)
                      // Column visibility config (for mixin columnVisibilityMixin)
                      columnVisibilityConfig: {
                        'percent': { hide: ['col-cd', 'col-cgr', 'col-max', 'col-min', 'col-balance', 'col-stability'] },
                        'complex-deltas': { hide: ['col-percent', 'col-cgr', 'col-max', 'col-min', 'col-balance', 'col-stability'] },
                        'gradients': { hide: ['col-percent', 'col-cd', 'col-max', 'col-min', 'col-balance', 'col-stability'] },
                        'result': { hide: ['col-percent', 'col-cd', 'col-cgr'] }
                      },
                      missingCoins: [], // Missing coins when loading set
                      currentIconEditingCoin: null, // Coin whose icon is currently being edited
                      pendingCoinSetContext: null, // Context of loading sets for subsequent sync
                    searchQuery: '',
                    searchResults: [],
                    searchExactResults: [],
                    searchSimilarResults: [],
                    searchInTableTickers: [],
                    searchLoading: false,
                    searchError: null,
                    searchDebounceTimer: null,
                    searchLock: false,
                    searchTokenNormalized: '',
                    sortBy: null, // Current sort field
                    sortOrder: null, // Current sort order (null | 'asc' | 'desc')
                    coinSortType: null, // Coin sort type (alphabet, market_cap, total_volume, favorite, selected) - loaded from table settings
                    showCoinSortDropdown: false, // Show coin sort dropdown
                    showPriceColumn: true // Price column visibility
                };
            },
            computed: {
                uiState() {
                    return window.uiState ? window.uiState.getState() : null;
                },
                currentTranslationLanguage: {
                    get() {
                        return this.uiState?.tooltips?.currentLanguage || 'ru';
                    },
                    set(value) {
                        if (window.uiState && typeof window.uiState.setTooltipsLanguage === 'function') {
                            window.uiState.setTooltipsLanguage(value);
                        }
                    }
                },
                /**
                 * Top-coins cache stale (for dual-mode refresh)
                 */
                isCoinsCacheStale() {
                    const timestamp = this.uiState?.cache?.coinsCacheMeta?.timestamp;
                    if (!timestamp || typeof timestamp !== 'number') {
                        return true;
                    }
                    const threshold = window.ssot?.getTopCoinsUiStaleThresholdMs?.() || 2 * 60 * 60 * 1000;
                    return Date.now() - timestamp >= threshold;
                },
                /**
                 * Tooltip for refresh button
                 */
                getRefreshTitle() {
                    const base = this.isCoinsCacheStale ? 'Update данные из API' : 'Данные актуальны';
                    const timestamp = this.uiState?.cache?.coinsCacheMeta?.timestamp;

                    if (!timestamp) return base;

                    const diffMs = Date.now() - timestamp;
                    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
                    const diffMinutes = Math.floor((diffMs % (60 * 60 * 1000)) / 60000);

                    let ageText = '';
                    if (diffHours > 0) {
                        ageText = `${diffHours} ч. ${diffMinutes} мин. назад`;
                    } else {
                        ageText = `${diffMinutes} мин. назад`;
                    }

                    return `${base}\nДанные обновлены ${ageText}`;
                },
                /**
                 * Check if all coins are selected (for "select all" checkbox)
                 */
                allCoinsSelected() {
                    const visibleCoins = this.sortedCoins;
                    if (!visibleCoins || visibleCoins.length === 0) {
                        return false;
                    }
                    return this.selectedCoinIds.length === visibleCoins.length && visibleCoins.length > 0;
                },
                /**
                 * Count of selected coins (for counter)
                 */
                selectedCoinsCount() {
                    return this.selectedCoinIds.length;
                },
                /**
                 * Total coin count (for counter)
                 * Shows count of visible coins (from active set or default list)
                 */
                totalCoinsCount() {
                    const visibleCoins = this.sortedCoins;
                    return visibleCoins ? visibleCoins.length : 0;
                },
                /**
                 * Percentage of selected coins (for pie chart)
                 */
                selectedCoinsPercentage() {
                    const visibleCoins = this.sortedCoins || [];
                    if (visibleCoins.length === 0) {
                        return 0;
                    }
                    return this.selectedCoinIds.length / visibleCoins.length;
                },
                /**
                 * List of favorite coins with full data (for dropdown)
                 */
                favoriteCoinsList() {
                    if (!this.favoriteCoinsMeta || this.favoriteCoinsMeta.length === 0) {
                        return [];
                    }

                    // Use coinsDataCache to get full data (including icons)
                    // and sortedCoins to determine inTable (accounts for active sets)
                    const visibleCoinsMap = new Map((this.sortedCoins || []).map(coin => [coin.id, coin]));

                    return this.favoriteCoinsMeta.map(fav => {
                        // First check cache, then current coins in table
                        let fullCoinData = this.coinsDataCache.get(fav.id);
                        if (!fullCoinData) {
                            const currentCoin = (this.coins || []).find(c => c.id === fav.id);
                            if (currentCoin) {
                                fullCoinData = currentCoin;
                                // Update cache
                                this.coinsDataCache.set(fav.id, currentCoin);
                            }
                        }
                        const isInVisibleTable = visibleCoinsMap.has(fav.id);

                        // Get original URL (from cache or directly)
                        let coingeckoImageUrl = fullCoinData?.image;

                        // If no data in cache, try to get from window.coinsDataCache
                        if (!coingeckoImageUrl && window.coinsDataCache && window.coinsDataCache[fav.id]) {
                            coingeckoImageUrl = window.coinsDataCache[fav.id].image;
                        }

                        // Normalize URL (extract string if object)
                        if (coingeckoImageUrl && typeof coingeckoImageUrl === 'object') {
                            coingeckoImageUrl = coingeckoImageUrl.large || coingeckoImageUrl.small || coingeckoImageUrl.thumb || null;
                        }

                        // Primary URL is CDN, fallback is original Coingecko
                        const image = window.iconManager && coingeckoImageUrl ? window.iconManager.getIconUrl(fav.id, coingeckoImageUrl) : (coingeckoImageUrl || null);

                        return {
                            id: fav.id,
                            symbol: (fullCoinData?.symbol || fav.symbol || fav.id || '').toUpperCase(),
                            name: fullCoinData?.name || '',
                            image: image,
                            fallbackIcon: coingeckoImageUrl,
                            inTable: isInVisibleTable
                        };
                        });
                },

                /**
                 * Sorted array of coins
                 */
                sortedCoins() {
                    if (!this.coins || this.coins.length === 0) {
                        return [];
                    }

                    // Filter coins: if set is active, show only coins from set
                    let coinsToSort = this.coins;
                    if (this.activeCoinSetIds && Array.isArray(this.activeCoinSetIds) && this.activeCoinSetIds.length > 0) {
                        const activeSetIds = new Set(this.activeCoinSetIds);
                        coinsToSort = this.coins.filter(coin => activeSetIds.has(coin.id));
                    }

                    // PRIORITY: First check standard column sort (sortBy/sortOrder)
                    // If set, use it, ignoring coinSortType
                    if (this.sortBy && this.sortOrder) {
                        const sorted = [...coinsToSort].sort((a, b) => {
                            // Use getCellValue for nested field support (e.g. metrics.cdWeighted.0)
                            const aVal = this.getCellValue(a, this.sortBy);
                            const bVal = this.getCellValue(b, this.sortBy);

                            // Handle null/undefined
                            if (aVal == null && bVal == null) return 0;
                            if (aVal == null) return 1;
                            if (bVal == null) return -1;

                            // Numeric comparison
                            if (typeof aVal === 'number' && typeof bVal === 'number') {
                                return this.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
                            }

                            // String comparison
                            const aStr = String(aVal);
                            const bStr = String(bVal);
                            if (this.sortOrder === 'asc') {
                                return aStr.localeCompare(bStr);
                            } else {
                                return bStr.localeCompare(aStr);
                            }
                        });

                        return sorted;
                    }

                    // If standard sort not set, use coin type sort
                    if (this.coinSortType) {
                        return this.sortCoinsByType(coinsToSort);
                    }

                    // If nothing set, return original order
                    return coinsToSort;
                },
                /**
                 * Style for Price column in colgroup
                 */
                priceColumnStyle() {
                    return this.showPriceColumn ? '' : 'display: none;';
                },
                /**
                 * Coin sort menu items (from single source of truth)
                 */
                coinSortMenuItems() {
                    if (!window.menusConfig) {
                        return [];
                    }
                    // Create reactive dependency on coin list for condition
                    if (this.coins) { /* trigger */ }
                    return window.menusConfig.getCoinSortMenuItems().map(item => ({
                        ...item,
                        title: this.getCoinSortTypeTitle(item.sortType)
                    }));
                },
                coinActionMenuItems() {
                    if (!window.menusConfig) {
                        return [];
                    }
                    // Create reactive dependency on coin list for condition
                    if (this.coins) { /* trigger */ }
                    return window.menusConfig.getCoinActionMenuItems();
                },
                settingsMenuItems() {
                    if (!window.menusConfig) {
                        return [];
                    }
                    const excludedIds = new Set([
                        'export-portfolios-light',
                        'export-portfolios-full',
                        'import-portfolios'
                    ]);
                    return window.menusConfig.getSettingsMenuItems().filter(item => !excludedIds.has(item.id));
                },
                portfolioActionMenuItems() {
                    if (!window.menusConfig) {
                        return [];
                    }
                    const actionIds = new Set([
                        'export-portfolios-light',
                        'export-portfolios-full',
                        'import-portfolios'
                    ]);
                    return window.menusConfig.getSettingsMenuItems()
                        .filter(item => actionIds.has(item.id))
                        .map(item => ({
                            ...item,
                            icon: item.id === 'export-portfolios-light'
                                ? 'fas fa-save'
                                : item.id === 'export-portfolios-full'
                                    ? 'fas fa-database'
                                    : 'fas fa-briefcase'
                        }));
                },
                mainMenuItems() {
                    if (!window.menusConfig) {
                        return [];
                    }
                    if (this.menuLevel === 1) {
                        const items = window.menusConfig.getMathModelsMenuItems ? window.menusConfig.getMathModelsMenuItems() : [];
                        // Dynamically replace "back up" button header with parent section name
                        return this.prepareSubMenu(items, 'math-models');
                    }
                    return window.menusConfig.getMainMenuItems();
                },
                menusConfig() {
                    return window.menusConfig || null;
                },
                /**
                 * List of modal windows for auto-registration
                 * From modalsConfig with conditions applied
                 */
                registeredModals() {
                    if (!window.modalsConfig || typeof window.modalsConfig.getRegisteredModals !== 'function') {
                        return [];
                    }
                    const modals = window.modalsConfig.getRegisteredModals();

                    // Ensure array stability for v-for to avoid extra re-renders
                    const currentIds = modals.map(m => m.id).join(',');
                    if (this._lastModalIds === currentIds && this._lastModals) {
                        return this._lastModals;
                    }
                    this._lastModalIds = currentIds;
                    this._lastModals = modals;

                    return modals;
                },
                /**
                 * Aliases for convenient access to centralized auth state
                 */
                isAuthenticated() {
                    return this.authState ? this.authState.isAuthenticated : false;
                },
                user() {
                    return this.authState ? this.authState.user : null;
                },
                /**
                 * Validate presence of global system messages for splash display
                 */
                hasGlobalSystemMessages() {
                    if (!window.AppMessages || !window.AppMessages.state) {
                        return false;
                    }
                    const messages = window.AppMessages.state.messages || [];
                    return messages.some(m => m.scope === 'global' || !m.scope);
                }
            },
            watch: {
                // Reactive tooltip update on language change
                currentTranslationLanguage: {
                    async handler(newLanguage, oldLanguage) {
                        if (newLanguage && newLanguage !== oldLanguage) {
                            // Update tooltips for new language
                            if (window.tooltipsConfig && typeof window.tooltipsConfig.init === 'function') {
                                try {
                                    // If this language init already in progress, do not run again
                                    if (this._tooltipsInitializing === newLanguage) return;
                                    this._tooltipsInitializing = newLanguage;

                                    await window.tooltipsConfig.init(newLanguage);

                                    this._tooltipsInitializing = null;

                                    // Update reactive tooltips after init
                                    this.updateTooltips();
                                } catch (error) {
                                    this._tooltipsInitializing = null;
                                    console.error('app-ui-root: ошибка update tooltips при смене языка (watch):', error);
                                }
                            }
                        }
                    },
                    immediate: false
                },
                // Watcher for syncing active model (E.1)
                activeModelId: {
                    handler(newId) {
                        if (window.modelManager) {
                            window.modelManager.setActiveModel(newId);
                            this.recalculateAllMetrics();
                        }
                    },
                    immediate: true
                },
                // Reactive update of coin indicator in DB when table changes
                coins: {
                    handler(newCoins) {
                        if (!Array.isArray(newCoins) || newCoins.length === 0) return;
                        // Update only if data came from PostgreSQL
                        const hasDbSource = newCoins.some(c => c._source === 'yandex-cache');
                        if (!hasDbSource) return;
                        // Debounce: max once per 10 seconds
                        if (this._dbStatusRefreshTimer) clearTimeout(this._dbStatusRefreshTimer);
                        this._dbStatusRefreshTimer = setTimeout(() => {
                            this._dbStatusRefreshTimer = null;
                            this.fetchDbStatus();
                        }, 2000);
                    },
                    immediate: false
                },
                yandexTestError: {
                    handler(newVal, oldVal) {
                    },
                    immediate: false // Skip immediate to avoid flicker at init
                },
                // Watcher for tracking successful auth via testStep4Result change
                'testStep4Result.isAuthenticated': {
                    handler(newVal, oldVal) {
                        // If user successfully authenticated but testStep5Result not yet updated via handleAuthLogin
                        if (newVal === true && oldVal === false && this.testStep4Result && this.testStep4Result.userData) {
                            // Update testStep5Result to show successful auth
                            if (!this.testStep5Result || !this.testStep5Result.success) {
                                const userEmail = this.testStep4Result.userData.email || 'неизвестен';
                                const userName = this.testStep4Result.userData.name || userEmail;
                                this.testStep5Result = {
                                    success: true,
                                    message: `✓ Авторизация успешна! Пользователь ${userName} (${userEmail}) авторизован.`
                                };
                            }
                        }
                    },
                    immediate: false
                },
                /**
                 * Track active tab change for column visibility
                 */
                activeTabId() {
                    // Trigger re-render when activeTabId changes
                },
                /**
                 * Recalc metrics on forecast horizon change
                 */
                horizonDays() {
                    this.recalculateAllMetrics();
                },
                /**
                 * Recalc metrics on MDN horizon change
                 */
                mdnHours() {
                    this.recalculateAllMetrics();
                },
                /**
                 * Recalc metrics on AGR method change
                 */
                agrMethod() {
                    this.recalculateAllMetrics();
                },
                /**
                 * Update selected coin count in info-box on selection change
                 */
                selectedCoinIds: {
                    handler() {
                        if (this.infoBoxPortfolio) {
                            // Find selected coins for L/S segment calc (D.2)
                            const selected = this.coins.filter(c => this.selectedCoinIds.includes(c.id));
                            const longCount = selected.filter(c => (c.metrics?.agr || 0) >= 0).length;
                            const shortCount = selected.filter(c => (c.metrics?.agr || 0) < 0).length;

                            this.infoBoxPortfolio.count = this.selectedCoinIds.length;
                            this.infoBoxPortfolio.longCount = longCount;
                            this.infoBoxPortfolio.shortCount = shortCount;
                        }
                    },
                    deep: true
                },
                /**
                 * Recalc metrics on active tab change (some may depend on context)
                 */
                activeTabId() {
                    // Can add tab-specific logic if needed
                    this.recalculateAllMetrics();
                }
            },
            methods: {
                /**
                 * Menu item click handler
                 * Calls matching method from menu config
                 * @param {Object} item - Menu item from config
                 */
                handleMenuClick(item) {
                    if (!item || !item.handler) {
                        // Fallback for items without handler
                        this.handleClick();
                        return;
                    }

                    // Call method by name from config
                    if (typeof this[item.handler] === 'function') {
                        // If params (e.g. portfolioId), pass them
                        if (item.params !== undefined) {
                            this[item.handler](item.params);
                        } else {
                        this[item.handler]();
                        }
                    } else {
                        console.warn(`app-ui-root: method "${item.handler}" not found for menu item "${item.id}"`);
                        // Fallback
                        this.handleClick();
                    }
                },
                /**
                 * Submenu prep (replace "back up" button header)
                 */
                prepareSubMenu(items, parentId) {
                    if (!Array.isArray(items)) {
                        return [];
                    }
                    return items.map(item => {
                        if (item.id === 'back-to-main') {
                            const mainMenu = window.menusConfig.getMainMenuItems();
                            const parent = mainMenu.find(m => m.id === parentId);
                            const parentTitle = parent ? (window.menusConfig.getMenuItemTitle(parent.title) || parent.title) : '..';

                            return {
                                ...item,
                                title: parentTitle,
                                classesAdd: {
                                    ...(item.classesAdd || {}),
                                    title: 'opacity-50'
                                }
                            };
                        }
                        return item;
                    });
                },
                /**
                 * Update reactive tooltips from tooltipsConfig
                 * Called at init and language change
                 */
                updateTooltips() {
                    if (!window.tooltipsConfig || typeof window.tooltipsConfig.getTooltip !== 'function') {
                        return;
                    }

                    // Sync currentTranslationLanguage with currentLanguage from tooltipsConfig
                    if (typeof window.tooltipsConfig.getCurrentLanguage === 'function') {
                        const tooltipsLanguage = window.tooltipsConfig.getCurrentLanguage();
                        if (tooltipsLanguage && tooltipsLanguage !== this.currentTranslationLanguage) {
                            this.currentTranslationLanguage = tooltipsLanguage;
                        }
                    }

                    // Update all tooltips from config
                    const keys = Object.keys(this.tooltips);
                    keys.forEach(key => {
                        const value = window.tooltipsConfig.getTooltip(key);
                        this.tooltips[key] = value || '';
                    });
                },
                /**
                 * Get tooltip for metrics (table headers)
                 * @param {string} metricKey - metric key ('agr', 'din', 'cdh', etc.)
                 * @returns {string} - tooltip text
                 */
                getMetricTooltip(metricKey) {
                    if (!window.tooltipInterpreter) return '';
                    const lang = this.currentTranslationLanguage || 'ru';
                    return window.tooltipInterpreter.getTooltip(metricKey, { lang });
                },
                async toggleTheme() {
                    // Switch theme
                    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';

                    // Save via cacheManager (async)
                    if (window.cacheManager) {
                        await window.cacheManager.set('theme', this.currentTheme);
                    } else {
                        // Fallback to direct localStorage if cacheManager not yet loaded
                        localStorage.setItem('theme', this.currentTheme);
                    }

                    // Apply theme to body via data-bs-theme (Bootstrap 5)
                    if (this.currentTheme === 'dark') {
                        document.body.setAttribute('data-bs-theme', 'dark');
                    } else {
                        document.body.removeAttribute('data-bs-theme');
                    }
                },
                handleClick(event) {
                },
                /**
                 * Switch to math models menu (level 1)
                 */
                switchToMathModelsMenu() {
                    this.menuLevel = 1;
                },
                /**
                 * Switch to main menu (level 0)
                 */
                switchToMainMenu() {
                    this.menuLevel = 0;
                },
                /**
                 * Switch to portfolios menu (D.6)
                 */
                /**
                 * Handle Median 26.01.01 model selection
                 */
                handleMedian260101Click() {
                    console.log('app-ui-root: выбрана модель Медиана 26.01.01');
                    this.activeModelId = 'Median/AIR/260101';
                    // Close menu after final action choice (by default closes via autoCloseParent=true)
                },
                /**
                 * Handle Median 26.01.15 model selection (WIP)
                 */
                handleMedian260115Click() {
                    this.activeModelId = 'Median/AIR/260115';
                },
                handleExportPortfoliosLight() {
                    this.handleExportPortfolios('light');
                },
                handleExportPortfoliosFull() {
                    this.handleExportPortfolios('full');
                },
                handleExportPortfolios(mode = 'light') {
                    if (!window.portfolioConfig || typeof window.portfolioConfig.exportPortfolios !== 'function') {
                        console.warn('app-ui-root: exportPortfolios недоступен');
                        return;
                    }
                    const payload = window.portfolioConfig.exportPortfolios(mode);
                    const json = JSON.stringify(payload, null, 2);
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                    link.download = `app-portfolios-${mode}-${timestamp}.json`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                },
                handleImportPortfoliosMerge() {
                    this.handleImportPortfolios('merge');
                },
                handleImportPortfoliosReplace() {
                    this.handleImportPortfolios('replace');
                },
                handleImportPortfolios(mode = 'merge') {
                    if (!window.portfolioConfig || typeof window.portfolioConfig.importPortfolios !== 'function') {
                        console.warn('app-ui-root: importPortfolios недоступен');
                        return;
                    }
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'application/json,.json';
                    input.addEventListener('change', () => {
                        const file = input.files && input.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                            try {
                                const payload = JSON.parse(String(reader.result || ''));
                                const ok = window.portfolioConfig.importPortfolios(payload, { mode });
                                if (!ok) {
                                    console.warn('app-ui-root: importPortfolios завершился с ошибкой');
                                } else {
                                    this.userPortfolios = window.portfolioConfig.getLocalPortfolios();
                                }
                            } catch (error) {
                                console.error('app-ui-root: ошибка импорта portfolios', error);
                            }
                        };
                        reader.readAsText(file);
                    });
                    input.click();
                },
                /**
                 * Display tab switch handler
                 * @param {Object} data - Data from cmp-button-group
                 */
                handleTabToggle({ button, index, active }) {
                    if (active) {
                        this.activeTabId = button.id;

                        // Update active state in displayTabs array for reactivity (if needed)
                        this.displayTabs.forEach(tab => {
                            tab.active = (tab.id === button.id);
                        });
                        this.saveTableSettings();
                    }
                },
                /**
                 * Forecast horizon (days) change handler from combobox
                 * @param {string|number} value - New horizon value
                 */
                handleHorizonChange(value) {
                    let num = Number(value);
                    if (Number.isFinite(num)) {
                        // Limit range to 1-90 days
                        num = Math.max(1, Math.min(90, Math.floor(num)));
                        this.horizonDays = num;
                        this.saveTableSettings();
                    } else {
                        console.warn('app-ui-root: invalid horizonDays', value);
                    }
                },
                /**
                 * mdnHours switch handler (radio buttons)
                 * @param {number} hours - New MDN horizon value (hours)
                 */
                handleMdnHoursChange(hours) {
                    const num = Number(hours);
                    if (Number.isFinite(num) && num > 0) {
                        this.mdnHours = num;
                        this.saveTableSettings();
                    } else {
                        console.warn('app-ui-root: некорректный mdnHours', hours);
                    }
                },
                /**
                 * AGR calculation method change handler
                 * @param {string} method - dcs | tsi | mp
                 */
                handleAgrMethodChange(method) {
                    if (['dcs', 'tsi', 'mp'].includes(method)) {
                        this.agrMethod = method;
                        this.saveTableSettings();
                    }
                },
                /**
                 * Open portfolio form modal handler (D.2)
                 */
                handleCreatePortfolio() {
                    this.currentViewingPortfolio = null; // Reset to avoid entering edit mode
                    this.portfolioFormKey++;
                    if (this.$refs.portfolioFormModal) {
                        this.$refs.portfolioFormModal.show();
                    }
                },
                /**
                 * View existing portfolio (D.6)
                 */
                handleViewPortfolio(portfolioId) {
                    const portfolio = this.userPortfolios.find(p => p.id === portfolioId);
                    if (portfolio) {
                        this.currentViewingPortfolio = portfolio;
                        this.$nextTick(() => {
                            if (this.$refs.portfolioViewModal) {
                                this.$refs.portfolioViewModal.show();
                            }
                        });
                    }
                },
                /**
                 * Enter rebalance mode (D.4)
                 */
                handleRebalancePortfolio(portfolio) {
                    console.log('app-ui-root: ребалансировка portfolioя', portfolio.id);

                    // Ensure rebalance opens form with prepared/normalized portfolio snapshot.
                    this.currentViewingPortfolio = portfolio;

                    // 1. Close view window
                    if (this.$refs.portfolioViewModal) {
                        this.$refs.portfolioViewModal.hide();
                    }

                    // 2. Open form window in edit mode
                    this.portfolioFormKey++; // Reset component
                    this.$nextTick(() => {
                        if (this.$refs.portfolioFormModal) {
                            this.$refs.portfolioFormModal.show();
                        }
                    });
                },
                /**
                 * Save formed portfolio
                 */
                async handleSaveCreatedPortfolio(portfolio) {
                    console.log('app-ui-root: сохранение portfolioя', portfolio);
                    const existingIndex = this.userPortfolios.findIndex(p => p.id === portfolio.id);
                    const previousPortfolio = existingIndex !== -1 ? this.userPortfolios[existingIndex] : null;

                    // 1. First close form window (D.3)
                    if (this.$refs.portfolioFormModal) {
                        this.$refs.portfolioFormModal.hide();
                    }

                    // 2. Save/update in local storage (D.4, D.5)
                    if (existingIndex !== -1) {
                        // Update existing (D.4)
                        this.userPortfolios.splice(existingIndex, 1, portfolio);
                    } else {
                        // Add new (D.2)
                        this.userPortfolios.unshift(portfolio);
                    }
                    window.portfolioConfig.saveLocalPortfolios(this.userPortfolios);

                    // 2.5 Cloudflare - primary online persistence (best effort).
                    await this.syncPortfolioToCloudflare(portfolio, previousPortfolio);

                    // 2.6 PostgreSQL - optional secondary sync (best effort).
                    if (window.postgresSyncManager) {
                        window.postgresSyncManager.savePortfolio(portfolio).catch(err => {
                            console.warn('app-ui-root: фоновая синхронизация portfolioя не удалась', err);
                        });
                    }

                    // 3. Set current portfolio for viewing
                    this.currentViewingPortfolio = portfolio;

                    // 4. Show message
                    if (window.messagesStore) {
                        window.messagesStore.addMessage({
                            type: 'success',
                            text: existingIndex !== -1 ? `Портфель "${portfolio.name}" обновлен` : `Портфель "${portfolio.name}" создан`,
                            duration: 3000
                        });
                    }

                    // 5. Open view window (updated)
                    this.$nextTick(() => {
                        if (this.$refs.portfolioViewModal) {
                            this.$refs.portfolioViewModal.show();
                        }
                    });

                    // Emit event
                    if (window.eventBus) {
                        window.eventBus.emit('portfolio-saved', portfolio);
                    }
                },
                /**
                 * Delete portfolio
                 */
                async handleDeletePortfolio(portfolioId) {
                    console.log('app-ui-root: delete portfolio', portfolioId);
                    const removed = this.userPortfolios.find(p => p.id === portfolioId) || null;

                    // 1. Remove from local list (D.5)
                    this.userPortfolios = this.userPortfolios.filter(p => p.id !== portfolioId);
                    window.portfolioConfig.saveLocalPortfolios(this.userPortfolios);

                    // 1.5 Try to delete online record in Cloudflare (if was linked).
                    if (removed?.cloudflareId && window.portfoliosClient?.deletePortfolio) {
                        try {
                            await window.portfoliosClient.deletePortfolio(removed.cloudflareId);
                        } catch (error) {
                            console.warn('app-ui-root: удаление Cloudflare-portfolioя failed to', error);
                        }
                    }

                    // 2. Clear current view if needed
                    if (this.currentViewingPortfolio?.id === portfolioId) {
                        this.currentViewingPortfolio = null;
                    }

                    if (window.messagesStore) {
                        window.messagesStore.addMessage({
                            type: 'info',
                            text: 'Портфель удален',
                            duration: 2000
                        });
                    }
                },
                /**
                 * Sync portfolio to Cloudflare (primary online persistence).
                 * Does not interrupt UX on network/Auth unavailable.
                 */
                async syncPortfolioToCloudflare(portfolio, previousPortfolio) {
                    if (!window.portfoliosClient || !window.authClient) return;
                    const cloudSyncEnabled = window.appConfig?.isFeatureEnabled?.('cloudSync') !== false;
                    if (!cloudSyncEnabled) return;

                    let authenticated = false;
                    try {
                        authenticated = await window.authClient.isAuthenticated();
                    } catch (error) {
                        console.warn('app-ui-root: failed to проверить auth for Cloudflare sync', error);
                        return;
                    }
                    if (!authenticated) return;

                    const cloudflareId = portfolio.cloudflareId || previousPortfolio?.cloudflareId || null;
                    const assets = Array.isArray(portfolio.coins)
                        ? portfolio.coins.map((coin, index) => ({
                            coinId: coin.coinId || coin.id || `${coin.symbol || 'coin'}-${index}`,
                            ticker: (coin.ticker || coin.symbol || '').toUpperCase(),
                            weight: Number.isFinite(Number(coin.portfolioPercent)) ? Number(coin.portfolioPercent) : 0,
                            side: (coin.metrics?.agr || 0) >= 0 ? 'long' : 'short',
                            delegatedBy: {
                                modelId: coin.delegatedBy?.modelId || portfolio?.settings?.modelId || 'unknown',
                                modelName: coin.delegatedBy?.modelName || ''
                            },
                            agr: Number(coin.metrics?.agr || 0)
                        }))
                        : [];

                    const payload = {
                        name: portfolio.name || 'Portfolio',
                        description: portfolio.description || null,
                        assets
                    };

                    try {
                        const saved = cloudflareId
                            ? await window.portfoliosClient.updatePortfolio(cloudflareId, payload)
                            : await window.portfoliosClient.createPortfolio(payload);
                        const savedId = saved?.id ?? cloudflareId;
                        if (savedId) {
                            portfolio.cloudflareId = savedId;
                            window.portfolioConfig.saveLocalPortfolios(this.userPortfolios);
                        }
                    } catch (error) {
                        console.warn('app-ui-root: Cloudflare sync skipped (local save kept)', error);
                        if (window.messagesStore) {
                            window.messagesStore.addMessage({
                                type: 'warning',
                                text: 'Cloudflare sync пропущен: локальное сохранение выполнено.',
                                scope: 'global',
                                duration: 2500
                            });
                        }
                    }
                },
                /**
                 * Handle successful login via Google OAuth
                 * @param {Object} tokenData - Token and user data
                 */
                handleAuthLogin(tokenData) {
                    console.log('app-ui-root: пользователь успешно авторизован', tokenData);

                    // Update testStep5Result to show successful auth on test card
                    if (tokenData && tokenData.access_token) {
                        const userEmail = tokenData.user?.email || 'неизвестен';
                        const userName = tokenData.user?.name || userEmail;
                        this.testStep5Result = {
                            success: true,
                            message: `✓ Авторизация успешна! Пользователь ${userName} (${userEmail}) авторизован. Токен сохранен.`
                        };

                        // Auto-update testStep4Result to show user info
                        this.$nextTick(async () => {
                            await this.testStep4_CheckAuthStatus();
                        });
                    }

                    // Can add extra logic on login
                    // e.g. load user portfolios
                },
                /**
                 * Handle logout
                 */
                handleAuthLogout() {
                    console.log('app-ui-root: пользователь вышел из системы');
                    // Can add extra logic on logout
                    // e.g. clear user data
                },
                /**
                 * Logout from system for test button Step 5
                 */
                async testStep5_Logout() {
                    if (!window.authClient) {
                        this.testStep5Result = {
                            success: false,
                            message: '✗ auth-client not loaded'
                        };
                        return;
                    }
                    try {
                        await window.authClient.logout();
                        this.testStep5Result = {
                            success: true,
                            message: '✓ Logout выполнен успешно. Страница будет переloadedа.'
                        };
                        // Update auth status
                        await this.testStep4_CheckAuthStatus();
                    } catch (error) {
                        this.testStep5Result = {
                            success: false,
                            message: `✗ Ошибка logoutа: ${error.message}`
                        };
                    }
                },
                handleSuffixClick(event, item) {
                },
                handleInfoClick(event) {
                    alert('Открыть справку');
                },
                toggleMenu() {
                    this.isMenuExpanded = !this.isMenuExpanded;
                },
                handleSelect(item) {
                    alert(`Выбран: ${item.name}`);
                },
                handleComboboxSelect(event) {
                },
                handleComboboxInput(value) {
                },
                /**
                 * Test Yandex API: send request (from input or random)
                 */
                async testYandexAPI(useRandom = false) {
                    if (!window.aiProviderManager) {
                        this.yandexTestError = 'AI Provider Manager not loaded';
                        return;
                    }

                    let query = '';

                    if (useRandom || !this.yandexTestInputQuery.trim()) {
                        // Random requests list for testing
                        const randomQueries = [
                            'Что такое искусственный интеллект?',
                            'Расскажи про криптовалюты',
                            'Какая погода сегодня?',
                            'Что такое блокчейн?',
                            'Объясни квантовую физику простыми словами',
                            'Какие преимущества у Vue.js?',
                            'Что такое машинное обучение?',
                            'Расскажи про историю программирования',
                            'Какие есть типы data в JavaScript?',
                            'Что такое REST API?'
                        ];
                        query = randomQueries[Math.floor(Math.random() * randomQueries.length)];
                    } else {
                        query = this.yandexTestInputQuery.trim();
                    }

                    this.yandexTestQuery = query;
                    this.yandexTestResponse = '';
                    this.yandexTestError = ''; // Use empty string instead of null
                    this.yandexTestLoading = true;

                    try {
                        const providerName = await window.aiProviderManager.getCurrentProviderName();
                        const apiKey = await window.aiProviderManager.getApiKey(providerName);

                        if (!apiKey) {
                            throw new Error(`API ключ for ${providerName} not configured. Откройте настройки "API-ключи" for настройки.`);
                        }

                        const model = await window.aiProviderManager.getModel(providerName);

                        // Send request via aiProviderManager
                        const response = await window.aiProviderManager.sendRequest(
                            [{ role: 'user', content: query }]
                        );

                        this.yandexTestResponse = response;
                    } catch (error) {
                        console.error('testYandexAPI: ошибка запроса:', error);
                        const errorMessage = error.message || 'Unknown error';
                        // Use Vue.nextTick to ensure DOM update
                        this.$nextTick(() => {
                            this.yandexTestError = errorMessage;
                        });
                        this.yandexTestResponse = '';
                    } finally {
                        this.yandexTestLoading = false;
                    }
                },
                customFilterFunction(items, query) {
                    // Custom filter: search by label and value
                    const lowerQuery = query.toLowerCase();
                    return items.filter(item => {
                        const label = (item.label || '').toLowerCase();
                        const value = (item.value || '').toLowerCase();
                        return label.includes(lowerQuery) || value.includes(lowerQuery);
                    });
                },
                handleButtonGroupClick(event, data) {
                    console.log('Button click:', data);
                    // Can add click handling logic for button in group
                },
                openExampleModalNew() {
                    if (this.$refs.exampleModalNew) {
                        this.$refs.exampleModalNew.show();
                    }
                },
                async openTimezoneModal() {
                    // Load current timezone and translation language from cache
                    try {
                        if (window.cacheManager) {
                            const savedTimezone = await window.cacheManager.get('timezone');
                            if (savedTimezone && typeof savedTimezone === 'string') {
                                this.selectedTimezone = savedTimezone;
                                this.initialTimezone = savedTimezone;
                            } else {
                                this.initialTimezone = this.selectedTimezone;
                            }

                            const savedLanguage = await window.cacheManager.get('translation-language');
                            if (savedLanguage && typeof savedLanguage === 'string') {
                                this.selectedTranslationLanguage = savedLanguage;
                                this.initialTranslationLanguage = savedLanguage;
                                this.currentTranslationLanguage = savedLanguage;
                            } else {
                                this.initialTranslationLanguage = this.selectedTranslationLanguage;
                                this.currentTranslationLanguage = this.selectedTranslationLanguage;
                            }
                        } else {
                            const savedTimezone = localStorage.getItem('timezone');
                            if (savedTimezone) {
                                this.selectedTimezone = savedTimezone;
                                this.initialTimezone = savedTimezone;
                            } else {
                                this.initialTimezone = this.selectedTimezone;
                            }

                            const savedLanguage = localStorage.getItem('translation-language');
                            if (savedLanguage) {
                                this.selectedTranslationLanguage = savedLanguage;
                                this.initialTranslationLanguage = savedLanguage;
                                this.currentTranslationLanguage = savedLanguage;
                            } else {
                                this.initialTranslationLanguage = this.selectedTranslationLanguage;
                                this.currentTranslationLanguage = this.selectedTranslationLanguage;
                            }
                        }
                    } catch (error) {
                        console.error('Failed to load timezone/language:', error);
                        this.initialTimezone = this.selectedTimezone;
                        this.initialTranslationLanguage = this.selectedTranslationLanguage;
                    }

                    if (this.$refs.timezoneModal) {
                        this.$refs.timezoneModal.show();
                    }
                },
                cancelTimezone() {
                    // If timezone or language changed - restore original values
                    if (this.selectedTimezone !== this.initialTimezone ||
                        this.selectedTranslationLanguage !== this.initialTranslationLanguage) {
                        this.selectedTimezone = this.initialTimezone;
                        this.selectedTranslationLanguage = this.initialTranslationLanguage;
                    } else {
                        // If nothing changed - close modal
                        if (this.$refs.timezoneModal) {
                            this.$refs.timezoneModal.hide();
                        }
                    }
                },
                async saveTimezone(timezone, translationLanguage) {
                    try {
                        const timezoneToSave = timezone || this.selectedTimezone;
                        const languageToSave = translationLanguage || this.selectedTranslationLanguage;

                        // @skill-anchor id:sk-502074 #for-reactive-translations
                        if (window.cacheManager) {
                            await window.cacheManager.set('timezone', timezoneToSave);
                            await window.cacheManager.set('translation-language', languageToSave);
                        } else {
                            localStorage.setItem('timezone', timezoneToSave);
                            localStorage.setItem('translation-language', languageToSave);
                        }

                        // Update original values
                        this.selectedTimezone = timezoneToSave;
                        this.initialTimezone = timezoneToSave;
                        this.selectedTranslationLanguage = languageToSave;
                        this.initialTranslationLanguage = languageToSave;
                        this.currentTranslationLanguage = languageToSave;

                        // Update timezone in footer
                        if (this.$refs.appFooter) {
                            await this.$refs.appFooter.saveTimezone(timezoneToSave);
                            // Update translation language in footer
                            if (this.$refs.appFooter.updateTranslationLanguage) {
                                this.$refs.appFooter.updateTranslationLanguage(languageToSave);
                            }
                        }

                        // Update tooltips for new language
                        if (window.tooltipsConfig && typeof window.tooltipsConfig.init === 'function') {
                            try {
                                await window.tooltipsConfig.init(languageToSave);
                                // Update reactive tooltips after init
                                this.updateTooltips();
                            } catch (error) {
                                console.error('app-ui-root: ошибка update tooltips при смене языка:', error);
                            }
                        }

                        // Update message translations
                        if (window.messagesTranslator && typeof window.messagesTranslator.updateLanguage === 'function') {
                            try {
                                await window.messagesTranslator.updateLanguage(languageToSave);
                            } catch (error) {
                                console.error('app-ui-root: ошибка update переводов messages:', error);
                            }
                        }

                        // Modal closes via X or click outside
                        // Save button must not close modal
                    } catch (error) {
                        console.error('Failed to save timezone/language:', error);
                    }
                },
                openAiApiModal() {
                    // Support both array (v-for) and single ref
                    const modalRef = Array.isArray(this.$refs.aiApiModal)
                        ? this.$refs.aiApiModal[0]
                        : this.$refs.aiApiModal;
                    if (modalRef) {
                        modalRef.show();
                    } else {
                        console.warn('app-ui-root: aiApiModal ref не найден');
                    }
                },
                openPostgresModal() {
                    const modalRef = Array.isArray(this.$refs.postgresModal)
                        ? this.$refs.postgresModal[0]
                        : this.$refs.postgresModal;
                    if (modalRef) {
                        modalRef.show();
                    } else {
                        console.warn('app-ui-root: postgresModal ref не найден');
                    }
                },
                openStorageResetModal() {
                    // Support both array (v-for) and single ref
                    const modalRef = Array.isArray(this.$refs.storageResetModal)
                        ? this.$refs.storageResetModal[0]
                        : this.$refs.storageResetModal;
                    if (modalRef) {
                        modalRef.show();
                    } else {
                        console.warn('app-ui-root: storageResetModal ref не найден');
                    }
                },
                openPortfoliosImportModal() {
                    const modalRef = Array.isArray(this.$refs.portfoliosImportModal)
                        ? this.$refs.portfoliosImportModal[0]
                        : this.$refs.portfoliosImportModal;
                    if (modalRef) {
                        modalRef.show();
                    } else {
                        console.warn('app-ui-root: portfoliosImportModal ref не найден');
                    }
                },
                openSessionLogModal() {
                    // Support both array (v-for) and single ref
                    const modalRef = Array.isArray(this.$refs.sessionLogModal)
                        ? this.$refs.sessionLogModal[0]
                        : this.$refs.sessionLogModal;
                    if (modalRef) {
                        modalRef.show();
                    } else {
                        console.warn('app-ui-root: sessionLogModal ref не найден');
                    }
                },
                openCoinGeckoCronHistoryModal() {
                    // Support both array (v-for) and single ref
                    const modalRef = Array.isArray(this.$refs.coingeckoCronHistoryModal)
                        ? this.$refs.coingeckoCronHistoryModal[0]
                        : this.$refs.coingeckoCronHistoryModal;
                    if (modalRef) {
                        modalRef.show();
                    } else {
                        console.warn('app-ui-root: coingeckoCronHistoryModal ref не найден');
                    }
                },
                openAuthModal() {
                    if (this.$refs.authModal) {
                        this.$refs.authModal.show();
                    }
                },
                handleAuthLoginSuccess(tokenData) {
                    console.log('app-ui-root: успешная авторизация', tokenData);
                    // State updates automatically via centralized auth-state store
                    // No manual update of this.isAuthenticated and this.user needed
                },
                handleAuthLogoutSuccess() {
                    console.log('app-ui-root: успешный logout');
                    // State updates automatically via centralized auth-state store
                    // No manual update of this.isAuthenticated and this.user needed
                },
                /**
                 * Handle portfolio create
                 * @param {Object} portfolio - Created portfolio
                 */
                handlePortfolioCreated(portfolio) {
                    console.log('app-ui-root: portfolioь создан', portfolio);
                    // Can add extra logic on portfolio create
                },
                /**
                 * Handle portfolio update
                 * @param {Object} portfolio - Updated portfolio
                 */
                handlePortfolioUpdated(portfolio) {
                    console.log('app-ui-root: portfolioь обновлён', portfolio);
                    // Can add extra logic on portfolio update
                },
                /**
                 * Handle portfolio delete
                 * @param {string|number} portfolioId - ID of deleted portfolio
                 */
                handlePortfolioDeleted(portfolioId) {
                    console.log('app-ui-root: portfolioь удалён', portfolioId);
                    // Can add extra logic on portfolio delete
                },

                /**
                 * Step 1: Check module loading
                 */
                testStep1_CheckModules() {
                    const checks = [];
                    if (window.authClient) checks.push('✓ auth-client loaded');
                    else checks.push('✗ auth-client НЕ loaded');
                    if (window.portfoliosClient) checks.push('✓ portfolios-client loaded');
                    else checks.push('✗ portfolios-client НЕ loaded');
                    if (window.portfoliosManager) checks.push('✓ portfolios-manager loaded');
                    else checks.push('✗ portfolios-manager НЕ loaded');

                    const allLoaded = window.authClient && window.portfoliosClient && window.portfoliosManager;
                    this.testStep1Result = {
                        success: allLoaded,
                        message: checks.join(' | ')
                    };
                },

                /**
                 * Step 2: Check feature flags
                 */
                testStep2_CheckFeatureFlags() {
                    if (!window.appConfig) {
                        this.testStep2Result = {
                            success: false,
                            message: '✗ appConfig not loaded'
                        };
                        return;
                    }
                    const authEnabled = window.appConfig.isFeatureEnabled('auth');
                    const cloudSyncEnabled = window.appConfig.isFeatureEnabled('cloudSync');
                    const portfoliosEnabled = window.appConfig.isFeatureEnabled('portfolios');

                    const checks = [];
                    checks.push(authEnabled ? '✓ auth: включен' : '✗ auth: выключен');
                    checks.push(cloudSyncEnabled ? '✓ cloudSync: включен' : '✗ cloudSync: выключен');
                    checks.push(portfoliosEnabled ? '✓ portfolios: включен' : '✗ portfolios: выключен');

                    const allEnabled = authEnabled && cloudSyncEnabled && portfoliosEnabled;
                    this.testStep2Result = {
                        success: allEnabled,
                        message: checks.join(' | ')
                    };
                },

                /**
                 * Step 3: Check auth-modal-body component (auth via modal)
                 */
                testStep3_CheckAuthButton() {
                    if (!window.authModalBody) {
                        this.testStep3Result = {
                            success: false,
                            hasAuthButton: false,
                            message: '✗ auth-modal-body not loaded. Проверьте консоль на наличие ошибок loading модулей.'
                        };
                        return;
                    }
                    if (!window.authClient) {
                        this.testStep3Result = {
                            success: false,
                            hasAuthButton: true,
                            message: '⚠ auth-modal-body loaded, но auth-client отсутствует'
                        };
                        return;
                    }
                    this.testStep3Result = {
                        success: true,
                        hasAuthButton: true,
                        message: '✓ auth-modal-body loaded и доступен. Авторизация доступна через модальное окно.'
                    };
                },

                /**
                 * Step 4: Check authorization state
                 */
                async testStep4_CheckAuthStatus() {
                    if (!window.authClient) {
                        this.testStep4Result = {
                            success: false,
                            message: '✗ auth-client not loaded'
                        };
                        return;
                    }
                    try {
                        const isAuthenticated = await window.authClient.isAuthenticated();
                        let userData = null;
                        if (isAuthenticated) {
                            userData = await window.authClient.getCurrentUser();
                        }
                        this.testStep4Result = {
                            success: true,
                            isAuthenticated: isAuthenticated,
                            userData: userData,
                            message: isAuthenticated
                                ? `✓ Авторизован${userData ? ` как ${userData.email || userData.name || 'пользователь'}` : ' (но user === null)'}`
                                : '○ Не авторизован'
                        };
                    } catch (error) {
                        this.testStep4Result = {
                            success: false,
                            message: `✗ Ошибка проверки авторизации: ${error.message}`
                        };
                    }
                },

                /**
                 * Step 5: Initiate login via Google
                 */
                testStep5_InitiateLogin() {
                    if (!window.authClient) {
                        this.testStep5Result = {
                            success: false,
                            message: '✗ auth-client not loaded'
                        };
                        return;
                    }
                    try {
                        window.authClient.initiateGoogleAuth();
                        this.testStep5Result = {
                            success: true,
                            message: '✓ Редирект на Google OAuth инициирован. Вы будете перенаправлены на страницу авторизации Google.'
                        };
                    } catch (error) {
                        this.testStep5Result = {
                            success: false,
                            message: `✗ Ошибка инициации входа: ${error.message}`
                        };
                    }
                },

                /**
                 * Step 6: Check portfolios-manager component
                 */
                testStep6_CheckPortfoliosManager() {
                    if (!window.portfoliosManager) {
                        this.testStep6Result = {
                            success: false,
                            message: '✗ portfolios-manager not loaded. Проверьте консоль на наличие ошибок loading модулей.'
                        };
                        return;
                    }
                    if (!window.portfoliosClient) {
                        this.testStep6Result = {
                            success: false,
                            message: '⚠ portfolios-manager loaded, но portfolios-client отсутствует'
                        };
                        return;
                    }
                    if (!this.isPortfoliosEnabled) {
                        this.testStep6Result = {
                            success: false,
                            message: '⚠ portfolios-manager loaded, но feature flags не включены или пользователь not authenticated'
                        };
                        return;
                    }
                    this.testStep6Result = {
                        success: true,
                        message: '✓ portfolios-manager loaded и доступен. Компонент должен отображаться ниже.'
                    };
                },

                /**
                 * Show all messages in stream (splash from bottom)
                 */
                showMessagesInStream() {
                    if (!window.AppMessages || !window.messagesConfig) {
                        console.error('app-ui-root: AppMessages или messagesConfig not loaded');
                        return;
                    }

                    // Clear previous global messages
                    window.AppMessages.clear('global');

                    // Danger message
                    const dangerMsg = window.messagesConfig.getMessage('error.api.network');
                    window.AppMessages.push({
                        text: dangerMsg.text,
                        details: dangerMsg.details,
                        type: dangerMsg.type || 'danger',
                        priority: dangerMsg.priority || 4,
                        key: 'error.api.network', // Store key for subsequent translation
                        scope: 'global'
                    });

                    // Warning message (use short key e.rate with params)
                    // Use numbers instead of text for universality
                    const warningParams = { time: '3 min' };
                    const warningMsg = window.messagesConfig.get('e.rate', warningParams);
                    window.AppMessages.push({
                        text: warningMsg.text,
                        details: warningMsg.details,
                        type: warningMsg.type,
                        key: warningMsg.key,
                        params: warningParams, // Store params for subsequent translation
                        scope: 'global'
                    });

                    // Info message (use short key i.switch with params)
                    const infoParams = { provider: 'Perplexity AI', previous: 'OpenAI' };
                    const infoMsg = window.messagesConfig.get('i.switch', infoParams);
                    window.AppMessages.push({
                        text: infoMsg.text,
                        details: infoMsg.details,
                        type: infoMsg.type,
                        key: infoMsg.key,
                        params: infoParams, // Store params for subsequent translation
                        scope: 'global'
                    });

                    // Success message
                    const successMsg = window.messagesConfig.getMessage('health.proxy.restored');
                    window.AppMessages.push({
                        text: successMsg.text,
                        details: successMsg.details,
                        type: successMsg.type || 'success',
                        priority: successMsg.priority || 1,
                        key: 'health.proxy.restored', // Store key for subsequent translation
                        scope: 'global'
                    });
                },

                /**
                 * Test step 1: Check Worker endpoint
                 */
                async testMessagesStep1_Version() {
                    this.testMessagesStep1Result = null;
                    try {
                        if (!window.messagesApi) {
                            this.testMessagesStep1Result = {
                                success: false,
                                message: '✗ messagesApi not loaded'
                            };
                            return;
                        }
                        const version = await window.messagesApi.getVersion();
                        this.testMessagesStep1Result = {
                            success: true,
                            message: `✓ Версия датасета: ${version}`
                        };
                    } catch (error) {
                        this.testMessagesStep1Result = {
                            success: false,
                            message: `✗ Error: ${error.message}`
                        };
                    }
                },
                async testMessagesStep1_ListModules() {
                    this.testMessagesStep1Result = null;
                    try {
                        if (!window.messagesApi) {
                            this.testMessagesStep1Result = {
                                success: false,
                                message: '✗ messagesApi not loaded'
                            };
                            return;
                        }
                        const modules = await window.messagesApi.listModules();
                        this.testMessagesStep1Result = {
                            success: true,
                            message: `✓ Доступно модулей: ${modules.length} (${modules.join(', ')})`
                        };
                    } catch (error) {
                        this.testMessagesStep1Result = {
                            success: false,
                            message: `✗ Error: ${error.message}`
                        };
                    }
                },

                /**
                 * Test step 2: Load modules from KV
                 */
                async testMessagesStep2_LoadModule(module) {
                    this.testMessagesStep2Result = null;
                    try {
                        if (!window.messagesApi) {
                            this.testMessagesStep2Result = {
                                success: false,
                                message: '✗ messagesApi not loaded'
                            };
                            return;
                        }
                        const data = await window.messagesApi.loadModule(module);
                        if (data) {
                            const messageCount = data.messages ? Object.keys(data.messages).length : 0;
                            const source = data.version ? 'KV' : 'fallback (хардкод)';
                            this.testMessagesStep2Result = {
                                success: true,
                                message: `✓ Модуль "${module}" loaded из ${source}. Сообщений: ${messageCount}`
                            };
                        } else {
                            this.testMessagesStep2Result = {
                                success: false,
                                message: `✗ Модуль "${module}" не найден ни в KV, ни в хардкоде`
                            };
                        }
                    } catch (error) {
                        this.testMessagesStep2Result = {
                            success: false,
                            message: `✗ Error: ${error.message}`
                        };
                    }
                },
                async testMessagesStep2_LoadAllModules() {
                    this.testMessagesStep2Result = null;
                    try {
                        if (!window.messagesApi) {
                            this.testMessagesStep2Result = {
                                success: false,
                                message: '✗ messagesApi not loaded'
                            };
                            return;
                        }
                        const modules = await window.messagesApi.loadAllModules();
                        const moduleNames = Object.keys(modules);
                        const totalMessages = Object.values(modules).reduce((sum, m) => {
                            return sum + (m.messages ? Object.keys(m.messages).length : 0);
                        }, 0);
                        this.testMessagesStep2Result = {
                            success: true,
                            message: `✓ Загружено модулей: ${moduleNames.length} (${moduleNames.join(', ')}). Всего messages: ${totalMessages}`
                        };
                    } catch (error) {
                        this.testMessagesStep2Result = {
                            success: false,
                            message: `✗ Error: ${error.message}`
                        };
                    }
                },

                /**
                 * Test step 3: Integration with messages-config
                 */
                async testMessagesStep3_InitConfig() {
                    this.testMessagesStep3Result = null;
                    try {
                        if (!window.messagesConfig) {
                            this.testMessagesStep3Result = {
                                success: false,
                                message: '✗ messagesConfig not loaded'
                            };
                            return;
                        }
                        const messageCount = window.messagesConfig.MESSAGES ? Object.keys(window.messagesConfig.MESSAGES).length : 0;
                        this.testMessagesStep3Result = {
                            success: true,
                            message: `✓ messages-config initialized. Сообщений: ${messageCount}`
                        };
                    } catch (error) {
                        this.testMessagesStep3Result = {
                            success: false,
                            message: `✗ Error: ${error.message}`
                        };
                    }
                },
                testMessagesStep3_GetMessage() {
                    this.testMessagesStep3Result = null;
                    try {
                        if (!window.messagesConfig) {
                            this.testMessagesStep3Result = {
                                success: false,
                                message: '✗ messagesConfig not loaded'
                            };
                            return;
                        }
                        const msg = window.messagesConfig.getMessage('error.api.network');
                        if (msg && msg.text) {
                            this.testMessagesStep3Result = {
                                success: true,
                                message: `✓ Сообщение получено: "${msg.text}" (тип: ${msg.type}, приоритет: ${msg.priority})`
                            };
                        } else {
                            this.testMessagesStep3Result = {
                                success: false,
                                message: '✗ Сообщение не найдено'
                            };
                        }
                    } catch (error) {
                        this.testMessagesStep3Result = {
                            success: false,
                            message: `✗ Error: ${error.message}`
                        };
                    }
                },
                testMessagesStep3_TestActions() {
                    this.testMessagesStep3Result = null;
                    try {
                        if (!window.messagesConfig) {
                            this.testMessagesStep3Result = {
                                success: false,
                                message: '✗ messagesConfig not loaded'
                            };
                            return;
                        }
                        const openSettingsAction = window.messagesConfig.getAction('open-settings');
                        const openAiSettingsAction = window.messagesConfig.getAction('open-ai-settings');

                        if (openSettingsAction && openSettingsAction.handler && openAiSettingsAction && openAiSettingsAction.handler) {
                            this.testMessagesStep3Result = {
                                success: true,
                                message: '✓ Действия настроены. Нажмите кнопки ниже for проверки открытия модальных окон.'
                            };
                        } else {
                            this.testMessagesStep3Result = {
                                success: false,
                                message: '✗ Действия not configuredы или handlers отсутствуют'
                            };
                        }
                    } catch (error) {
                        this.testMessagesStep3Result = {
                            success: false,
                            message: `✗ Error: ${error.message}`
                        };
                    }
                },
                testMessagesStep3_OpenSettings() {
                    try {
                        const action = window.messagesConfig.getAction('open-settings');
                        if (action && action.handler) {
                            action.handler();
                            // Message shown via modal, result not checked
                        }
                    } catch (error) {
                        console.error('testMessagesStep3_OpenSettings:', error);
                    }
                },
                testMessagesStep3_OpenAiSettings() {
                    try {
                        const action = window.messagesConfig.getAction('open-ai-settings');
                        if (action && action.handler) {
                            action.handler();
                            // Message shown via modal, result not checked
                        }
                    } catch (error) {
                        console.error('testMessagesStep3_OpenAiSettings:', error);
                    }
                },
                async testMessagesStep3_TranslateMessages() {
                    this.testMessagesStep3Result = {
                        success: false,
                        message: '✗ Функция временно отключена. Перевод будет восстановлен после рефакторинга системы.'
                    };
                },

                /**
                 * Test step 4: Migrations and versioning
                 */
                async testMessagesStep4_CheckVersion() {
                    this.testMessagesStep4Result = null;
                    try {
                        if (!window.messagesApi) {
                            this.testMessagesStep4Result = {
                                success: false,
                                message: '✗ messagesApi not loaded'
                            };
                            return;
                        }
                        const version = await window.messagesApi.getVersion();
                        const hasMigrations = window.messagesMigrations && typeof window.messagesMigrations.migrate === 'function';
                        this.testMessagesStep4Result = {
                            success: true,
                            message: `✓ Версия датасета: ${version}. Миграции: ${hasMigrations ? 'доступны' : 'не доступны'}`
                        };
                    } catch (error) {
                        this.testMessagesStep4Result = {
                            success: false,
                            message: `✗ Error: ${error.message}`
                        };
                    }
                },
                async testMessagesStep4_TestMigration() {
                    this.testMessagesStep4Result = null;
                    try {
                        if (!window.messagesMigrations) {
                            this.testMessagesStep4Result = {
                                success: false,
                                message: '✗ messagesMigrations not loaded'
                            };
                            return;
                        }
                        // Test migration from v1 to v1 (should return data unchanged)
                        const testData = { __version__: 1, messages: { 'test.key': { text: 'Test' } } };
                        const migrated = await window.messagesMigrations.migrate(testData, 1, 1);
                        if (migrated && migrated.messages) {
                            this.testMessagesStep4Result = {
                                success: true,
                                message: '✓ Миграция работает. Тестовые данные мигрированы успешно.'
                            };
                        } else {
                            this.testMessagesStep4Result = {
                                success: false,
                                message: '✗ Миграция вернула некорректные данные'
                            };
                        }
                    } catch (error) {
                        this.testMessagesStep4Result = {
                            success: false,
                            message: `✗ Error: ${error.message}`
                        };
                    }
                },

                /**
                 * Test step 5: Module structure
                 */
                async testMessagesStep5_ShowModules() {
                    this.testMessagesStep5Result = null;
                    try {
                        if (!window.messagesApi) {
                            this.testMessagesStep5Result = {
                                success: false,
                                message: '✗ messagesApi not loaded'
                            };
                            return;
                        }
                        const modules = await window.messagesApi.listModules();
                        const baseModules = window.messagesApi.BASE_MODULES || [];
                        this.testMessagesStep5Result = {
                            success: true,
                            message: `✓ Всего модулей: ${modules.length}. Базовые: ${baseModules.join(', ')}. Все: ${modules.join(', ')}`
                        };
                    } catch (error) {
                        this.testMessagesStep5Result = {
                            success: false,
                            message: `✗ Error: ${error.message}`
                        };
                    }
                },
                async testMessagesStep5_LoadSpecificModule() {
                    this.testMessagesStep5Result = null;
                    try {
                        if (!window.messagesApi) {
                            this.testMessagesStep5Result = {
                                success: false,
                                message: '✗ messagesApi not loaded'
                            };
                            return;
                        }
                        // Load 'api' module
                        const data = await window.messagesApi.loadModule('api');
                        if (data) {
                            const messageKeys = data.messages ? Object.keys(data.messages) : [];
                            this.testMessagesStep5Result = {
                                success: true,
                                message: `✓ Модуль 'api' loaded. Ключи messages: ${messageKeys.slice(0, 5).join(', ')}${messageKeys.length > 5 ? '...' : ''} (всего: ${messageKeys.length})`
                            };
                        } else {
                            this.testMessagesStep5Result = {
                                success: false,
                                message: '⚠ Модуль "api" не найден в KV, using fallback'
                            };
                        }
                    } catch (error) {
                        this.testMessagesStep5Result = {
                            success: false,
                            message: `✗ Error: ${error.message}`
                        };
                    }
                },

                /**
                 * Initialize test messages
                 * Uses new short keys (e.net, e.rate, i.switch, h.proxy.up)
                 */
                initTestMessages() {
                    if (!window.AppMessages) {
                        console.warn('app-ui-root: AppMessages not loaded');
                        return;
                    }

                    // Danger message (e.net = error.api.network)
                    const msg1Data = window.messagesConfig.get('e.net');
                    window.AppMessages.push({
                        text: msg1Data.text,
                        details: msg1Data.details,
                        type: msg1Data.type,
                        key: msg1Data.key,
                        scope: 'test-messages'
                    });

                    // Warning message (e.rate = error.api.rate-limit)
                    // Use numbers or abbreviations instead of Russian text
                    const msg2Params = { time: '5 min' };
                    const msg2Data = window.messagesConfig.get('e.rate', msg2Params);
                    window.AppMessages.push({
                        text: msg2Data.text,
                        details: msg2Data.details,
                        type: msg2Data.type,
                        key: msg2Data.key,
                        params: msg2Params,
                        scope: 'test-messages'
                    });

                    // Info message (i.switch = integration.provider.switched)
                    const msg3Params = { provider: 'YandexGPT', previous: 'Perplexity' };
                    const msg3Data = window.messagesConfig.get('i.switch', msg3Params);
                    window.AppMessages.push({
                        text: msg3Data.text,
                        details: msg3Data.details,
                        type: msg3Data.type,
                        key: msg3Data.key,
                        params: msg3Params,
                        scope: 'test-messages'
                    });

                    // Success message (h.proxy.up = health.proxy.restored)
                    const msg4Data = window.messagesConfig.get('h.proxy.up');
                    window.AppMessages.push({
                        text: msg4Data.text,
                        details: msg4Data.details,
                        type: msg4Data.type,
                        key: msg4Data.key,
                        scope: 'test-messages'
                    });

                    console.log('app-ui-root: созданы тестовые сообщения');
                },

                /**
                 * DEBUG: Test loading top 10 coins via DataProviderManager
                 */
                async testLoadTopCoins() {
                    this.testLoading = true;
                    this.testError = null;
                    this.testResults = [];

                    try {
                        if (!window.dataProviderManager) {
                            throw new Error('dataProviderManager not loaded');
                        }

                        // Check cache
                        const cacheKey = 'top-coins';
                        let coins = null;

                        if (window.cacheManager) {
                            coins = await window.cacheManager.get(cacheKey);
                            if (coins) {
                                console.log('✅ Топ coins loadedы из кэша');
                            }
                        }

                        // If not in cache - load via API
                        if (!coins) {
                            coins = await window.dataProviderManager.getTopCoins(10, 'market_cap');

                            // Save to cache
                            if (window.cacheManager) {
                                await window.cacheManager.set(cacheKey, coins);
                                console.log('✅ Топ coins сохранены в кэш');
                            }
                        }

                        this.testResults = coins;
                    } catch (error) {
                        this.testError = error.message || 'Unknown error';
                        console.error('testLoadTopCoins error:', error);
                    } finally {
                        this.testLoading = false;
                    }
                },

                /**
                 * DEBUG: Test coin search
                 */
                async testSearchCoins() {
                    this.testLoading = true;
                    this.testError = null;
                    this.testResults = [];

                    try {
                        if (!window.dataProviderManager) {
                            throw new Error('dataProviderManager not loaded');
                        }

                        const results = await window.dataProviderManager.searchCoins('bitcoin');
                        this.testResults = results;
                    } catch (error) {
                        this.testError = error.message || 'Unknown error';
                        console.error('testSearchCoins error:', error);
                    } finally {
                        this.testLoading = false;
                    }
                },

                /**
                 * DEBUG: Clear test results
                 */
                clearTestResults() {
                    this.testResults = [];
                    this.testError = null;
                    this.testLoading = false;
                },

                /**
                 * Check if coin is selected (stub)
                 */
                isCoinSelected(coinId) {
                    return this.selectedCoinIds.includes(coinId);
                },

                /**
                 * Coin checkbox toggle handler (stub)
                 */
                handleToggleCoin(coinId, event) {
                    const isChecked = event.target.checked;
                    if (isChecked) {
                        if (!this.selectedCoinIds.includes(coinId)) {
                            this.selectedCoinIds.push(coinId);
                        }
                    } else {
                        const index = this.selectedCoinIds.indexOf(coinId);
                        if (index > -1) {
                            this.selectedCoinIds.splice(index, 1);
                        }
                    }
                    this.saveTableSettings();
                },

                /**
                 * Toggle coin selection by id (without checkbox)
                 */
                toggleCoinSelectionById(coinId) {
                    if (!coinId) return;
                    const index = this.selectedCoinIds.indexOf(coinId);
                    if (index > -1) {
                        this.selectedCoinIds.splice(index, 1);
                    } else {
                        this.selectedCoinIds.push(coinId);
                    }
                    this.saveTableSettings();
                },

                /**
                 * Select favorite coins (deselect all and select marked coins / favorites)
                 */
                handleSelectFavorites() {
                    const visibleCoins = this.sortedCoins;
                    if (!visibleCoins) return;

                    // Deselect all and select only favorites
                    this.selectedCoinIds = visibleCoins
                        .filter(coin => this.favoriteCoinIds.includes(coin.id))
                        .map(coin => coin.id);
                    this.saveTableSettings();
                },

                /**
                 * Select stablecoins (deselect all and select stablecoins)
                 */
                handleSelectStablecoins() {
                    const visibleCoins = this.sortedCoins;
                    if (!visibleCoins) return;

                    // Load stablecoins on-demand when menu selected
                    const loadStablecoins = async () => {
                        if (window.coingeckoStablecoinsLoader && typeof window.coingeckoStablecoinsLoader.load === 'function') {
                            try {
                                await window.coingeckoStablecoinsLoader.load({ forceRefresh: true, ttl: 24 * 60 * 60 * 1000 });
                            } catch (error) {
                                console.warn('handleSelectStablecoins: ошибка loading стейблкоинов по запросу', error);
                            }
                        }
                    };

                    // Load synchronously before selection
                    // eslint-disable-next-line consistent-return
                    return loadStablecoins().then(() => {
                        // Stablecoins list from single source of truth
                        const stablecoins = window.coinsConfig && typeof window.coinsConfig.getStablecoinSymbolsSet === 'function'
                            ? window.coinsConfig.getStablecoinSymbolsSet()
                            : new Set();


                    // Deselect all and select only stablecoins
                    this.selectedCoinIds = visibleCoins
                            .filter(coin => {
                                const symbol = coin.symbol ? coin.symbol.toLowerCase() : '';
                                return stablecoins.has(symbol);
                            })
                        .map(coin => coin.id);
                        this.saveTableSettings();


                        if (this.selectedCoinIds.length === 0 && window.messagesStore) {
                            window.messagesStore.addMessage({
                                type: 'warning',
                                text: 'Список стейблкоинов пуст или not loaded',
                                scope: 'global',
                                duration: 3000
                            });
                        }
                    });
                },

                /**
                 * Select wrapped (deselect all and select wrapped)
                 */
                handleSelectWrapped() {
                    const visibleCoins = this.sortedCoins;
                    if (!visibleCoins) return;

                    // Load metadata on-demand when menu selected
                    const loadMetadata = async () => {
                        if (window.coinsMetadataLoader && typeof window.coinsMetadataLoader.load === 'function') {
                            try {
                                await window.coinsMetadataLoader.load({ forceRefresh: true, ttl: 24 * 60 * 60 * 1000 });
                            } catch (error) {
                                console.warn('handleSelectWrapped: ошибка loading метаdata по запросу', error);
                            }
                        }
                    };

                    // Load synchronously before selection
                    return loadMetadata().then(() => {
                        const wrappedIds = window.coinsConfig && typeof window.coinsConfig.getWrappedCoins === 'function'
                            ? new Set(window.coinsConfig.getWrappedCoins())
                            : new Set();

                        // Deselect all and select only wrappers
                        this.selectedCoinIds = visibleCoins
                            .filter(coin => wrappedIds.has(coin.id))
                            .map(coin => coin.id);

                        this.saveTableSettings();

                        if (this.selectedCoinIds.length === 0 && window.messagesStore) {
                            window.messagesStore.addMessage({
                                type: 'warning',
                                text: 'Обертки не найдены в текущем списке',
                                scope: 'global',
                                duration: 3000
                            });
                        }
                    });
                },

                /**
                 * Select LST (deselect all and select LST)
                 */
                handleSelectLst() {
                    const visibleCoins = this.sortedCoins;
                    if (!visibleCoins) return;

                    const loadMetadata = async () => {
                        if (window.coinsMetadataLoader && typeof window.coinsMetadataLoader.load === 'function') {
                            try {
                                await window.coinsMetadataLoader.load({ forceRefresh: true, ttl: 24 * 60 * 60 * 1000 });
                            } catch (error) {
                                console.warn('handleSelectLst: ошибка loading метаdata по запросу', error);
                            }
                        }
                    };

                    return loadMetadata().then(() => {
                        const lstIds = window.coinsConfig && typeof window.coinsConfig.getLstCoins === 'function'
                            ? new Set(window.coinsConfig.getLstCoins())
                            : new Set();

                        this.selectedCoinIds = visibleCoins
                            .filter(coin => lstIds.has(coin.id))
                            .map(coin => coin.id);

                        this.saveTableSettings();

                        if (this.selectedCoinIds.length === 0 && window.messagesStore) {
                            window.messagesStore.addMessage({
                                type: 'warning',
                                text: 'LST не найдены в текущем списке',
                                scope: 'global',
                                duration: 3000
                            });
                        }
                    });
                },

                /**
                 * Update coin metadata (generate coins.json on GitHub)
                 */
                async handleUpdateCoinsMetadata() {
                    if (window.coinsMetadataGenerator) {
                        await window.coinsMetadataGenerator.generateAndUpload();
                    } else {
                        console.error('coinsMetadataGenerator not loaded');
                    }
                },

                /**
                 * Delete marked coins from table
                 */
                async handleDeleteSelected() {
                    if (this.selectedCoinIds.length === 0) {
                        return;
                    }

                    // Remove selected coins from coins array
                    const selectedSet = new Set(this.selectedCoinIds);
                    this.coins = this.coins.filter(coin => !selectedSet.has(coin.id));

                    // If using active set, remove coins from there too
                    if (this.activeCoinSetIds && Array.isArray(this.activeCoinSetIds)) {
                        const updatedActive = this.activeCoinSetIds.filter(id => !selectedSet.has(id));
                        await this.saveActiveCoinSetIds(updatedActive);
                    }

                    // Clear selection
                    this.selectedCoinIds = [];

                    // Show success message
                    if (window.messagesStore) {
                        window.messagesStore.addMessage({
                            type: 'success',
                            text: `Удалено coins: ${selectedSet.size}`,
                            scope: 'global',
                            duration: 2000
                        });
                    }

                    // If table empty — show set load modal
                    if (this.coins.length === 0) {
                        this.$nextTick(() => {
                            if (this.$refs.coinSetLoadModal) {
                                this.$refs.coinSetLoadModal.show();
                            }
                        });
                    }
                },

                /**
                 * Check if coin is in favorites
                 */
                isCoinFavorite(coinId) {
                    return this.favoriteCoinIds.includes(coinId);
                },

                /**
                 * Check if coin is in current table
                 */
                isCoinInTable(coinId) {
                    return this.coins.some(coin => coin.id === coinId);
                },

                /**
                 * Toggle favorites
                 */
                async handleToggleFavorite(coin) {
                    if (window.favoritesManager) {
                        await window.favoritesManager.toggleFavorite(coin);
                        // favoriteCoinIds update via favorites-updated subscription
                    }
                },

                /**
                 * Handle icon manager modal opening
                 */
                handleReplaceIcon(coinData) {
                    this.currentIconEditingCoin = coinData;
                    this.$nextTick(() => {
                        if (this.$refs.iconManagerModal) {
                            this.$refs.iconManagerModal.show();
                        }
                    });
                },

                /**
                 * Open icon manager modal (generic)
                 */
                openIconManagerModal() {
                    if (this.$refs.iconManagerModal) {
                        this.$refs.iconManagerModal.show();
                    }
                },

                /**
                 * Select coin from favorites dropdown (scroll to it and select by checkbox)
                 */
                async handleSelectFavoriteCoin(coinId) {
                    // If coin already in table - select checkbox and scroll
                    const existingCoin = this.sortedCoins.find(coin => coin.id === coinId);
                    if (existingCoin) {
                        // Select checkbox if not yet selected
                        if (!this.selectedCoinIds.includes(coinId)) {
                            this.selectedCoinIds.push(coinId);
                            this.saveTableSettings();
                        }
                        this.scrollToCoinRow(coinId);
                        return;
                    }

                    // If coin not in table - try to load and add
                    if (!window.dataProviderManager || typeof window.dataProviderManager.getCoinData !== 'function') {
                        console.warn('app-ui-root: dataProviderManager недоступен for добавления coinsы из избранного');
                        return;
                    }

                    try {
                        const result = await window.dataProviderManager.getCoinData([coinId]);
                        const coinData = Array.isArray(result) ? result[0] : null;
                        if (coinData) {
                            this.coins.push(coinData);
                            // Update coin data cache for icon saving
                            this.coinsDataCache.set(coinId, coinData);
                            this.scrollToCoinRow(coinId);
                        } else {
                            console.warn(`app-ui-root: coinsа ${coinId} не найдена в провайдере data`);
                        }
                    } catch (error) {
                        console.error(`app-ui-root: ошибка loading coinsы ${coinId} из избранного:`, error);
                        if (window.messagesStore) {
                            window.messagesStore.addMessage({
                                type: 'danger',
                                text: `Не удалось добавить coinsу ${coinId}`,
                                scope: 'global',
                                duration: 2500
                            });
                        }
                    }
                },

                /**
                 * Delete coin from table
                 */
                async handleDeleteCoin(coinId) {
                    if (!coinId) return;

                    // Remove coin from coins array
                    const coinIndex = this.coins.findIndex(c => c.id === coinId);
                    if (coinIndex > -1) {
                        this.coins.splice(coinIndex, 1);
                    }

                    // Remove from selected coins if present
                    const selectedIndex = this.selectedCoinIds.indexOf(coinId);
                    if (selectedIndex > -1) {
                        this.selectedCoinIds.splice(selectedIndex, 1);
                        await this.saveTableSettings();
                    }

                    // If using active set, remove coin from there too
                    if (this.activeCoinSetIds && Array.isArray(this.activeCoinSetIds)) {
                        const activeIndex = this.activeCoinSetIds.indexOf(coinId);
                        if (activeIndex > -1) {
                            this.activeCoinSetIds.splice(activeIndex, 1);
                            await this.saveActiveCoinSetIds(this.activeCoinSetIds);
                        }
                    }

                    // Show success message
                    if (window.messagesStore) {
                        window.messagesStore.addMessage({
                            type: 'success',
                            text: 'Монета удалена из table',
                            scope: 'global',
                            duration: 2000
                        });
                    }

                    // If table empty — show set load modal
                    if (this.coins.length === 0) {
                        this.$nextTick(() => {
                            if (this.$refs.coinSetLoadModal) {
                                this.$refs.coinSetLoadModal.show();
                            }
                        });
                    }
                },

                /**
                 * Scroll to coin row in table (if it exists)
                 */
                scrollToCoinRow(coinId) {
                    this.$nextTick(() => {
                        const checkbox = document.querySelector(`input[type="checkbox"][data-coin-id="${coinId}"]`);
                        if (checkbox) {
                            checkbox.closest('tr')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    });
                },

                /**
                 * Delete coin from table or favorites (depending on status inTable)
                 */
                async handleFavoriteRemoveFromTableOrFavorites(coinId) {
                    this.favoriteActionHoverId = null;

                    // If coin in table - remove from table
                    if (this.isCoinInTable(coinId)) {
                        this.handleDeleteCoin(coinId);
                        return;
                    }

                    // If coin not in table - remove from Favorites
                    if (window.favoritesManager && typeof window.favoritesManager.removeFavorite === 'function') {
                        await window.favoritesManager.removeFavorite(coinId);
                    }
                },

                /**
                 * Coin status icon in favorites list
                 */
                getFavoriteIndicatorIcon(coin) {
                    // On hover show cross for any state
                    if (this.favoriteActionHoverId === coin.id) {
                        return 'fas fa-times';
                    }
                    // If coin not in table - show "ban"
                    if (!coin.inTable) {
                        return 'fas fa-ban';
                    }
                    // If coin in table - show checkmark
                    return 'fas fa-check';
                },

                /**
                 * Helper to get icon URL in search (index.html)
                 * Needed for safe access to window.iconManager from template
                 */
                getIconUrlForSearch(res) {
                    if (!res) return null;
                    const url = (window.iconManager && typeof window.iconManager.getIconUrl === 'function')
                        ? window.iconManager.getIconUrl(res.id, res.image)
                        : (res.image || null);

                    // #region agent log
                    if (res.symbol && (res.symbol.toLowerCase() === 'trx' || res.symbol.toLowerCase() === 'ada')) {
                        fetch('http://127.0.0.1:7244/ingest/ee7cf80d-cf8e-4904-b24e-e46063c280ee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app-ui-root.js:getIconUrlForSearch',message:'Search icon debug',data:{id:res.id,symbol:res.symbol,image:res.image,generatedUrl:url},timestamp:Date.now(),sessionId:'debug-search-icons-v2',hypothesisId:'H17,H18'})}).catch(()=>{});
                    }
                    // #endregion

                    return url;
                },

                /**
                 * Select-all toggle handler
                 */
                handleToggleAllCoins(event) {
                    const isChecked = event.target.checked;
                    // IMPORTANT: use sortedCoins, not coins, to match counter and allCoinsSelected
                    const visibleCoins = this.sortedCoins || [];
                    if (isChecked) {
                        this.selectedCoinIds = visibleCoins.map(coin => coin.id);
                    } else {
                        this.selectedCoinIds = [];
                    }
                    this.saveTableSettings();
                },

                /**
                 * Column sort handler
                 */
                handleSort(field) {
                    if (this.sortBy === field) {
                        // Order toggle: null -> asc -> desc -> null
                        if (this.sortOrder === null) {
                            this.sortOrder = 'asc';
                        } else if (this.sortOrder === 'asc') {
                            this.sortOrder = 'desc';
                        } else {
                            this.sortBy = null;
                            this.sortOrder = null;
                        }
                    } else {
                        // New field - start with asc
                        this.sortBy = field;
                        this.sortOrder = 'asc';
                    }

                    // Reset coinSortType when setting column sort
                    // (so default sort has priority)
                    if (this.sortBy && this.sortOrder) {
                        this.coinSortType = null;
                        localStorage.removeItem('cgCoinSortType');
                    }

                    this.saveTableSettings();

                },

                /**
                 * Coin sort type set handler
                 */
                handleSetCoinSortType(sortType) {
                    this.coinSortType = sortType;
                    // Reset default sort when selecting coin sort
                    this.sortBy = null;
                    this.sortOrder = null;
                    // Save sort state via tablesConfig (SSOT)
                    // Also save to localStorage for backward compatibility (if used elsewhere)
                    if (sortType) {
                        localStorage.setItem('cgCoinSortType', sortType);
                    } else {
                        localStorage.removeItem('cgCoinSortType');
                    }
                    localStorage.removeItem('cgSortBy');
                    localStorage.removeItem('cgSortOrder');
                    this.showCoinSortDropdown = false;
                    this.saveTableSettings();
                },

                /**
                 * Sort coins by type (desc only for numeric, asc for alpha)
                 */
                sortCoinsByType(coins) {
                    if (!this.coinSortType || !coins || coins.length === 0) {
                        return coins.slice();
                    }

                    const sorted = coins.slice();

                    switch (this.coinSortType) {
                        case 'market_cap':
                            // Sort by market cap (descending)
                            sorted.sort((a, b) => {
                                const aVal = a.market_cap || 0;
                                const bVal = b.market_cap || 0;
                                return bVal - aVal; // По убыванию
                            });
                            break;

                        case 'total_volume':
                            // Sort by daily volume (descending)
                            sorted.sort((a, b) => {
                                const aVal = a.total_volume || 0;
                                const bVal = b.total_volume || 0;
                                return bVal - aVal; // По убыванию
                            });
                            break;

                        case 'alphabet':
                            // Sort alphabetically (ascending - A to Z)
                            sorted.sort((a, b) => {
                                const aSymbol = (a.symbol || '').toUpperCase();
                                const bSymbol = (b.symbol || '').toUpperCase();
                                return aSymbol.localeCompare(bSymbol); // Ascending (A-Z)
                            });
                            break;

                        case 'favorite':
                            // Sort favorite coins up (stub - favorites not yet implemented)
                            // Can add favorites logic in future
                            break;

                        case 'selected':
                            // Sort marked coins up
                            sorted.sort((a, b) => {
                                const aSelected = this.isCoinSelected(a.id);
                                const bSelected = this.isCoinSelected(b.id);
                                if (aSelected && !bSelected) return -1; // a first
                                if (!aSelected && bSelected) return 1;  // b first
                                return 0; // Same status - preserve order
                            });
                            break;

                        default:
                            // Unknown sort type - return unchanged
                            break;
                    }

                    return sorted;
                },

                /**
                 * Recalculate all metrics for current coin list
                 */
                recalculateAllMetrics() {
                    if (!this.coins || !this.coins.length) return;
                    const sanitizedCoins = this.applyBanFilterToCoins(this.coins);
                    if (sanitizedCoins.length !== this.coins.length) {
                        const sanitizedIds = new Set(sanitizedCoins.map(c => c.id));
                        this.selectedCoinIds = this.selectedCoinIds.filter(id => sanitizedIds.has(id));
                        this.coins = sanitizedCoins;
                    }
                    const metricsEngine = window.modelManager;
                    if (!metricsEngine || typeof metricsEngine.calculateMetrics !== 'function') return;
                    const normalizedAgrMethod = ['dcs', 'tsi', 'mp'].includes(this.agrMethod)
                        ? this.agrMethod
                        : 'mp';
                    const marketIndicators = {
                        fgi: window.fgiVal,
                        vix: window.vixVal,
                        btcDom: window.btcDomVal,
                        oi: window.oiVal,
                        fr: window.frVal,
                        lsr: window.lsrVal
                    };

                    const params = {
                        horizonDays: this.horizonDays,
                        mdnHours: this.mdnHours,
                        agrMethod: normalizedAgrMethod,
                        marketIndicators
                    };

                    // 1. Calculate metrics (active model version when available)
                    const metricsResult = metricsEngine.calculateMetrics(this.coins, params);
                    const finalCoins = Array.isArray(metricsResult)
                        ? metricsResult
                        : (metricsResult?.coins || []);
                    const finalCoinsFiltered = this.applyBanFilterToCoins(finalCoins);
                    let cmd = metricsResult?.marketData?.cmd || null;

                    // Recommended AGR method
                    if (window.modelManager && typeof window.modelManager.getRecommendedAgrMethod === 'function') {
                        this.recommendedAgrMethod = window.modelManager.getRecommendedAgrMethod(params);
                    } else {
                        this.recommendedAgrMethod = null;
                    }

                    if (!cmd && metricsEngine.calculateMarketMedians && metricsEngine.calculatePrcWeights && metricsEngine.calculateCMD) {
                        const marketMedians = metricsEngine.calculateMarketMedians(this.coins);
                        const prcWeights = metricsEngine.calculatePrcWeights(this.horizonDays);
                        cmd = metricsEngine.calculateCMD(marketMedians, prcWeights, this.horizonDays);
                    }

                    // 2. MDN (Market Direction Now) for different horizons
                    const mdnCalculator = metricsEngine.calculateMDN;
                    this.mdnValue = typeof mdnCalculator === 'function'
                        ? mdnCalculator.call(metricsEngine, this.mdnHours, finalCoinsFiltered, marketIndicators)
                        : 0;
                    const mdn4h = typeof mdnCalculator === 'function' ? mdnCalculator.call(metricsEngine, 4, finalCoinsFiltered, marketIndicators) : 0;
                    const mdn8h = typeof mdnCalculator === 'function' ? mdnCalculator.call(metricsEngine, 8, finalCoinsFiltered, marketIndicators) : 0;
                    const mdn12h = typeof mdnCalculator === 'function' ? mdnCalculator.call(metricsEngine, 12, finalCoinsFiltered, marketIndicators) : 0;

                    // 3. Calculate Info-box data
                    // 3.1 Medians
                    const cgrValues = finalCoinsFiltered.map(c => c.metrics.cgr).filter(v => Number.isFinite(v));
                    const agrValues = finalCoinsFiltered.map(c => c.metrics.agr).filter(v => Number.isFinite(v));
                    const medianFn = metricsEngine.median;

                    this.infoBoxMedians = {
                        cdh: cmd?.cdh || 0,
                        cgr: medianFn ? medianFn.call(metricsEngine, cgrValues) : 0,
                        agr: medianFn ? medianFn.call(metricsEngine, agrValues) : 0
                    };

                    // 3.2 Market breadth (Long/Short)
                    const breadthFn = metricsEngine.calculateSegmentedMedians;
                    const cdhBreadth = breadthFn ? breadthFn.call(metricsEngine, finalCoinsFiltered, c => c.metrics.cdh) : {};
                    const cgrBreadth = breadthFn ? breadthFn.call(metricsEngine, finalCoinsFiltered, c => c.metrics.cgr) : {};
                    const agrBreadth = breadthFn ? breadthFn.call(metricsEngine, finalCoinsFiltered, c => c.metrics.agr) : {};

                    this.infoBoxBreadth = {
                        bullishPercent: cdhBreadth.bullishPercent,
                        cdhRatio: cdhBreadth.ratio,
                        cgrRatio: cgrBreadth.ratio,
                        agrRatio: agrBreadth.ratio
                    };

                    // 5.3 Direction (Market Direction)
                    let trendText = 'Neutral';
                    if (this.mdnValue > 15) trendText = 'Strong Bullish';
                    else if (this.mdnValue > 5) trendText = 'Bullish';
                    else if (this.mdnValue < -15) trendText = 'Strong Bearish';
                    else if (this.mdnValue < -5) trendText = 'Bearish';

                    this.infoBoxDirection = {
                        trend: trendText,
                        mdn4h, mdn8h, mdn12h
                    };

                    // 5.4 Portfolio (D.2: L/S segment calc for selected coins)
                    const selected = finalCoinsFiltered.filter(c => this.selectedCoinIds.includes(c.id));
                    const longCount = selected.filter(c => (c.metrics?.agr || 0) >= 0).length;
                    const shortCount = selected.filter(c => (c.metrics?.agr || 0) < 0).length;

                    this.infoBoxPortfolio = {
                        pl: 0,
                        count: this.selectedCoinIds.length,
                        longCount,
                        shortCount
                    };

                    // Update coins array (Vue 3 tracks changes inside objects)
                    this.coins = [...finalCoinsFiltered];

                    if (window.eventBus) {
                        window.eventBus.emit('metrics-recalculated', { count: this.coins.length, mdn: this.mdnValue });
                    }
                },

                /**
                 * Save workspace settings (main table) via workspaceConfig (SSOT)
                 *
     * Main table settings saved:
     * - selectedCoinIds: selected rows (checkboxes)
     * - sortBy, sortOrder: column sort
     * - coinSortType: coin sort type (alphabet, market_cap, total_volume, favorite, selected)
     * - showPriceColumn: Price column visibility
                 */
                async saveTableSettings() {
                    if (!window.workspaceConfig) {
                        console.warn('app-ui-root: workspaceConfig not loaded');
                        return;
                    }

                    const mainTable = {
                        selectedCoinIds: this.selectedCoinIds,
                        sortBy: this.sortBy,
                        sortOrder: this.sortOrder,
                        coinSortType: this.coinSortType,
                        showPriceColumn: this.showPriceColumn
                    };

                    try {
                        await window.workspaceConfig.saveWorkspace({
                            activeModelId: this.activeModelId,
                            mainTable,
                            metrics: {
                                horizonDays: this.horizonDays,
                                mdnHours: this.mdnHours,
                                agrMethod: this.agrMethod,
                                activeTabId: this.activeTabId
                            }
                        });
                    } catch (error) {
                        console.error('app-ui-root: ошибка saving настроек workspace:', error);
                    }
                },

                /**
                 * Load workspace settings (main table) via workspaceConfig (SSOT)
                 * Validation: selectedCoinIds filtered - only IDs present in current table are saved
                 */
                async loadTableSettings() {
                    if (!window.workspaceConfig) {
                        console.warn('app-ui-root: workspaceConfig not loaded');
                        return;
                    }

                    try {
                        const workspace = await window.workspaceConfig.loadWorkspace();
                        const settings = workspace?.mainTable || {};

                        if (Array.isArray(settings.selectedCoinIds)) {
                            const validCoinIds = new Set((this.coins || []).map(coin => coin.id));
                            this.selectedCoinIds = settings.selectedCoinIds.filter(id => validCoinIds.has(id));
                        }
                        if (settings.sortBy !== undefined) {
                            this.sortBy = settings.sortBy;
                        }
                        if (settings.sortOrder !== undefined) {
                            this.sortOrder = settings.sortOrder;
                        }
                        if (settings.coinSortType !== undefined) {
                            this.coinSortType = settings.coinSortType;
                            if (settings.coinSortType) {
                                localStorage.setItem('cgCoinSortType', settings.coinSortType);
                            } else {
                                localStorage.removeItem('cgCoinSortType');
                            }
                        }
                        if (settings.showPriceColumn !== undefined) {
                            this.showPriceColumn = settings.showPriceColumn;
                        }
                        if (workspace.activeModelId) {
                            this.activeModelId = workspace.activeModelId;
                        }
                        if (Array.isArray(workspace.activeCoinSetIds)) {
                            this.activeCoinSetIds = workspace.activeCoinSetIds;
                        }
                        if (workspace.metrics && typeof workspace.metrics === 'object') {
                            if (workspace.metrics.horizonDays !== undefined) {
                                const h = Number(workspace.metrics.horizonDays);
                                if (Number.isFinite(h) && h > 0) {
                                    this.horizonDays = h;
                                }
                            }
                            if (workspace.metrics.mdnHours !== undefined) {
                                const m = Number(workspace.metrics.mdnHours);
                                if (Number.isFinite(m) && m > 0) {
                                    this.mdnHours = m;
                                }
                            }
                            if (workspace.metrics.agrMethod && typeof workspace.metrics.agrMethod === 'string') {
                                this.agrMethod = workspace.metrics.agrMethod;
                            }
                            if (workspace.metrics.activeTabId && typeof workspace.metrics.activeTabId === 'string') {
                                this.activeTabId = workspace.metrics.activeTabId;
                                this.displayTabs.forEach(tab => {
                                    tab.active = (tab.id === this.activeTabId);
                                });
                            }
                        }
                    } catch (error) {
                        console.error('app-ui-root: ошибка loading настроек workspace:', error);
                    }
                },

                /**
                 * Save active coin set to workspace (activeCoinSetIds)
                 * @param {Array<string>} ids
                 */
                async saveActiveCoinSetIds(ids) {
                    const normalizedIds = Array.isArray(ids) ? ids : [];
                    this.activeCoinSetIds = normalizedIds;
                    if (!window.workspaceConfig) {
                        console.warn('app-ui-root: workspaceConfig not loaded, activeCoinSetIds не сохранены');
                        return;
                    }

                    try {
                        await window.workspaceConfig.saveWorkspace({ activeCoinSetIds: normalizedIds });
                    } catch (error) {
                        console.error('app-ui-root: ошибка saving activeCoinSetIds в workspace:', error);
                    }
                },

                getBanContext() {
                    if (window.banCoinSet && typeof window.banCoinSet.getContext === 'function') {
                        return window.banCoinSet.getContext();
                    }
                    return { bannedIds: new Set(), bannedTickers: new Set() };
                },

                isCoinBanned(coin) {
                    const { bannedIds, bannedTickers } = this.getBanContext();
                    const coinId = String(coin?.id || coin?.coinId || '').trim();
                    const ticker = String(coin?.symbol || coin?.ticker || '').trim().toLowerCase();
                    return (coinId && bannedIds.has(coinId)) || (ticker && bannedTickers.has(ticker));
                },

                applyBanFilterToCoins(coins) {
                    if (!Array.isArray(coins) || coins.length === 0) return [];
                    return coins.filter(coin => !this.isCoinBanned(coin));
                },

                /**
                 * Load coin data by ID list
                 * @param {Array<string>} coinIds
                 * @returns {Promise<{ coins: Array<Object>, unresolved: Array<string> }>}
                 */
                async loadCoinsByIds(coinIds, options = {}) {
                    if (!Array.isArray(coinIds) || coinIds.length === 0) {
                        return { coins: [], unresolved: [] };
                    }

                    const { bannedIds } = this.getBanContext();
                    const uniqueIds = Array.from(new Set(coinIds)).filter(id => !bannedIds.has(id));
                    if (uniqueIds.length === 0) {
                        return { coins: [], unresolved: [] };
                    }
                    const coinsMap = new Map();
                    let missing = new Set(uniqueIds);

                    // Skip coins already in coinsDataCache and newer than 2 hours
                    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
                    for (const id of missing) {
                        const cached = this.coinsDataCache.get(id);
                        if (cached && cached._cachedAt && (Date.now() - cached._cachedAt) < TWO_HOURS_MS) {
                            coinsMap.set(id, cached);
                        }
                    }
                    coinsMap.forEach((_, id) => missing.delete(id));

                    // Read active set cache (persists F5, TTL 2 hours)
                    if (missing.size > 0 && window.cacheManager) {
                        try {
                            const activeCached = await window.cacheManager.get('active-coin-set-data');
                            if (activeCached && Array.isArray(activeCached)) {
                                activeCached.forEach(coin => {
                                    if (coin && coin.id && missing.has(coin.id)) {
                                        coinsMap.set(coin.id, coin);
                                        missing.delete(coin.id);
                                        this.coinsDataCache.set(coin.id, coin);
                                    }
                                });
                            }
                        } catch (e) {
                            console.warn('app-ui-root: read error active-coin-set-data', e);
                        }
                    }

                    const cacheKeys = ['top-coins-by-market-cap', 'top-coins-by-volume'];

                    for (const key of cacheKeys) {
                        if (missing.size === 0) break;
                        let cached = null;
                        try {
                            if (window.cacheManager) {
                                cached = await window.cacheManager.get(key);
                            } else {
                                const saved = localStorage.getItem(key);
                                cached = saved ? JSON.parse(saved) : null;
                            }
                        } catch (error) {
                            console.warn(`app-ui-root: read error кэша ${key}`, error);
                        }

                        if (cached && Array.isArray(cached)) {
                            cached.forEach(coin => {
                                if (coin && coin.id && missing.has(coin.id)) {
                                    coinsMap.set(coin.id, coin);
                                    missing.delete(coin.id);
                                }
                            });
                        }
                    }

                    if (missing.size > 0 && window.dataProviderManager) {
                        try {
                            const callerOnProgress = options.onProgress;
                            const useDualChannel = typeof window.dataProviderManager.getCoinDataDualChannel === 'function';

                            const progressHandler = (payload) => {
                                if ((payload.phase === 'chunk-success' || payload.type === 'chunk-success') && Array.isArray(payload.chunkCoins) && payload.chunkCoins.length > 0) {
                                    payload.chunkCoins.forEach(coin => {
                                        if (coin && coin.id && missing.has(coin.id)) {
                                            coinsMap.set(coin.id, coin);
                                            missing.delete(coin.id);
                                            if (!this.coinsDataCache.has(coin.id)) {
                                                this.coinsDataCache.set(coin.id, coin);
                                            }
                                            if (!this.coins.some(c => c.id === coin.id)) {
                                                this.coins.push(coin);
                                            }
                                        }
                                    });
                                    if (typeof this.recalculateAllMetrics === 'function') {
                                        this.recalculateAllMetrics();
                                    }
                                }
                                if (typeof callerOnProgress === 'function') {
                                    callerOnProgress(payload);
                                }
                            };

                            const fetchOpts = {
                                forceChunking: options.forceChunking ?? true,
                                signal: options.signal,
                                chunkDelayMs: options.chunkDelayMs ?? 21000,
                                useDualChannel: options.useDualChannel !== false,
                                allowCoinGeckoFallback: options.allowCoinGeckoFallback !== false,
                                onProgress: progressHandler
                            };

                            const fetched = useDualChannel
                                ? await window.dataProviderManager.getCoinDataDualChannel([...missing], fetchOpts)
                                : await window.dataProviderManager.getCoinData([...missing], fetchOpts);

                            if (Array.isArray(fetched)) {
                                fetched.forEach(coin => {
                                    if (coin && coin.id && missing.has(coin.id)) {
                                        coinsMap.set(coin.id, coin);
                                        missing.delete(coin.id);
                                    }
                                });
                            }
                        } catch (error) {
                            if (error && error.name === 'AbortError') {
                                console.log('app-ui-root: coin loading aborted by user');
                            } else {
                                console.warn('app-ui-root: error loading coins by ID', error);
                            }
                        }
                    }

                    const unresolved = [...missing];
                    const resolvedCoins = uniqueIds.map(id => coinsMap.get(id)).filter(Boolean);

                    // Save full coin data to cache (persists F5, TTL 2 hours)
                    if (resolvedCoins.length > 0 && window.cacheManager) {
                        try {
                            await window.cacheManager.set('active-coin-set-data', resolvedCoins);
                        } catch (e) {
                            console.warn('app-ui-root: ошибка saving active-coin-set-data', e);
                        }
                    }

                    return {
                        coins: this.applyBanFilterToCoins(resolvedCoins),
                        unresolved
                    };
                },

                /**
                 * Load coins from active set (activeCoinSetIds) or default list
                 */
                async loadCoinsForActiveSet() {
                    const ids = Array.isArray(this.activeCoinSetIds) ? this.activeCoinSetIds : [];

                    if (!ids.length) {
                        await this.saveActiveCoinSetIds([]);
                        await this.loadTopCoins();
                        return;
                    }

                    const { coins, unresolved } = await this.loadCoinsByIds(ids);

                    if (coins && coins.length > 0) {
                        this.coins = this.applyBanFilterToCoins(coins);
                        coins.forEach(coin => this.coinsDataCache.set(coin.id, coin));

                        // Classify loaded coins for auto-sets
                        if (window.autoCoinSets) {
                            window.autoCoinSets.classifyAndUpdateAutoSets(coins);
                        }

                        this.recalculateAllMetrics(); // Пересчет metrics после loading
                        return;
                    }

                    if (Array.isArray(unresolved) && unresolved.length > 0) {
                        this.missingCoins = unresolved.map(id => ({ id, symbol: id, name: '' }));
                        this.pendingCoinSetContext = { coinSets: null, originalIds: ids };
                        if (this.$refs.missingCoinsModal && typeof this.$refs.missingCoinsModal.show === 'function') {
                            this.$refs.missingCoinsModal.show();
                        }
                        return;
                    }

                    // Fallback to default list if failed to load active set coins
                    await this.saveActiveCoinSetIds([]);
                    await this.loadTopCoins();
                },

                /**
                 * Toggle Price column visibility
                 */
                togglePriceColumn() {
                    this.showPriceColumn = !this.showPriceColumn;
                    this.showCoinSortDropdown = false;
                    this.saveTableSettings();
                },

                /**
                 * Get value for table cell (nested type support metrics.agr)
                 * @param {Object} coin
                 * @param {string} field
                 */
                getCellValue(coin, field) {
                    if (!coin || !field) return null;
                    const parts = field.split('.');
                    let val = coin;
                    for (const part of parts) {
                        if (val === null || val === undefined) return null;
                        val = val[part];
                    }

                    return val;
                },

                /**
                 * Return list of all column CSS classes for columnVisibilityMixin
                 */
                getColumnClasses() {
                    return [
                        'col-percent-1h',
                        'col-percent-24h',
                        'col-percent-7d',
                        'col-percent-14d',
                        'col-percent-30d',
                        'col-percent-200d',
                        'col-cd-1w',
                        'col-cd-2w',
                        'col-cd-3w',
                        'col-cd-4w',
                        'col-cd-5w',
                        'col-cd-6w',
                        'col-cd-h',
                        'col-cgr-2',
                        'col-cgr-3',
                        'col-cgr-4',
                        'col-cgr-5',
                        'col-cgr-6',
                        'col-cgr-sum',
                        'col-max-pv',
                        'col-min-pv',
                        'col-stability-dcs',
                        'col-stability-tsi',
                        'col-stability-mp',
                        'col-balance-cpt',
                        'col-balance-din',
                        'col-balance-agr'
                    ];
                },

                formatMarketCap(val) {
                    if (val === null || val === undefined) return '—';
                    return Number(val).toLocaleString('en-US', { maximumFractionDigits: 0 });
                },

                handleSearchDropdownShow() {
                    // On dropdown open, move focus to input field
                    this.$nextTick(() => {
                        if (this.$refs.searchInputAdd) {
                            this.$refs.searchInputAdd.focus();
                        }
                    });
                },

                parseTokens(input) {
                    if (!input) return [];
                    const match = input.match(/[A-Za-z0-9-]+/);
                    return match ? [match[0].toLowerCase()] : [];
                },

                handleSearchInput() {
                    if (this.searchDebounceTimer) {
                        clearTimeout(this.searchDebounceTimer);
                        this.searchDebounceTimer = null;
                    }
                    const q = this.searchQuery || '';
                    const tokens = this.parseTokens(q);
                    const first = tokens[0] || '';

                    this.searchTokenNormalized = first;

                    // Already in table - show immediately
                    const inTable = [];
                    const upperToken = first.toUpperCase();
                    if (upperToken.length >= 2) {
                        (this.coins || []).forEach(c => {
                            const sym = (c.symbol || '').toUpperCase();
                            if (sym === upperToken || c.id === first) {
                                const displaySymbol = sym || (c.id || '').toUpperCase();
                                inTable.push({ id: c.id, symbol: displaySymbol });
                            }
                        });
                    }
                    this.searchInTableTickers = inTable;

                    if (first.length < 2) {
                        this.searchResults = [];
                        this.searchExactResults = [];
                        this.searchSimilarResults = [];
                        this.searchLoading = false;
                        return;
                    }

                    this.searchDebounceTimer = setTimeout(() => {
                        this.runSearch(first);
                    }, 250);
                },

                async runSearch(query) {
                    if (this.searchLock) return;
                    this.searchLock = true;
                    this.searchLoading = true;
                    this.searchError = null;
                    try {
                        if (!window.dataProviderManager || typeof window.dataProviderManager.searchCoins !== 'function') {
                            throw new Error('searchCoins недоступен');
                        }
                        const token = (query || '').toLowerCase();
                        // Caching via cacheManager
                        const cacheKey = `search:${token}`;
                        let cached = null;
                        try {
                            if (window.cacheManager) {
                                cached = await window.cacheManager.get(cacheKey, { useVersioning: false });
                            }
                        } catch (e) {
                            // ignore cache errors
                        }

                        let results = cached;
                        if (!results) {
                            results = await window.dataProviderManager.searchCoins(query, { limit: 10 });
                            if (results && window.cacheManager) {
                                await window.cacheManager.set(cacheKey, results, { useVersioning: false, ttl: 3600 });
                            }
                        }

                        const normalized = Array.isArray(results)
                            ? results.map(r => ({
                                id: r.id,
                                symbol: (r.symbol || r.id || '').toUpperCase(),
                                name: r.name || '',
                                image: r.image || null
                            }))
                            : [];

                        const exact = normalized.filter(r =>
                            (r.symbol || '').toUpperCase() === token.toUpperCase() ||
                            (r.id || '').toLowerCase() === token
                        );

                        const similar = normalized
                            .filter(r => !exact.includes(r))
                            .slice(0, 5);

                        // Already in table - move to inTable
                        const inTable = [];
                        const coinsMap = new Map((this.coins || []).map(c => [c.id, c]));
                        const exactFiltered = [];
                        exact.forEach(r => {
                            if (coinsMap.has(r.id)) {
                                const displaySymbol = (r.symbol || r.id || '').toUpperCase();
                                inTable.push({ id: r.id, symbol: displaySymbol });
                            } else {
                                exactFiltered.push(r);
                            }
                        });

                        const similarFiltered = [];
                        similar.forEach(r => {
                            if (coinsMap.has(r.id)) {
                                const displaySymbol = (r.symbol || r.id || '').toUpperCase();
                                inTable.push({ id: r.id, symbol: displaySymbol });
                            } else {
                                similarFiltered.push(r);
                            }
                        });

                        this.searchInTableTickers = inTable;
                        this.searchExactResults = exactFiltered;
                        this.searchSimilarResults = similarFiltered;
                        this.searchResults = [...exactFiltered, ...similarFiltered];
                    } catch (error) {
                        console.error('app-ui-root: ошибка поиска coins', error);
                        this.searchError = error.message || 'Ошибка поиска';
                        this.searchResults = [];
                        this.searchExactResults = [];
                        this.searchSimilarResults = [];
                    } finally {
                        this.searchLoading = false;
                        this.searchLock = false;
                    }
                },

                async handleSearchSubmit() {
                    const tokens = this.parseTokens(this.searchQuery);
                    const first = tokens[0];
                    if (!first) return;
                    await this.resolveTokenAndAdd(first);
                    this.searchQuery = '';
                    this.searchResults = [];
                    this.searchExactResults = [];
                    this.searchSimilarResults = [];
                    this.searchInTableTickers = [];
                },

                async handleSearchSelect(item) {
                    if (!item || !item.id) return;
                    await this.resolveTokenAndAdd(item.id);

                    // Update result lists locally (move added coins to inTable)
                    const sym = (item.symbol || item.id || '').toUpperCase();
                    const exists = this.searchInTableTickers.some(entry => entry.id === item.id);
                    if (!exists) {
                        this.searchInTableTickers.push({ id: item.id, symbol: sym });
                    }

                    this.searchExactResults = this.searchExactResults.filter(r => r.id !== item.id);
                    this.searchSimilarResults = this.searchSimilarResults.filter(r => r.id !== item.id);
                    this.searchResults = this.searchResults.filter(r => r.id !== item.id);
                },

                async resolveTokenAndAdd(token) {
                    const lower = (token || '').toLowerCase();
                    if (!lower) return;

                    // Already in table
                    const exists = (this.coins || []).find(c => c.id === lower || (c.symbol || '').toLowerCase() === lower);
                    if (exists) {
                        return;
                    }

                    // Try exact load by id
                    let coinId = lower;
                    let coinData = null;

                    const tryGetCoinData = async (id) => {
                        try {
                            if (!window.dataProviderManager || typeof window.dataProviderManager.getCoinData !== 'function') return null;
                            const data = await window.dataProviderManager.getCoinData([id]);
                            if (Array.isArray(data) && data[0]) {
                                return data[0];
                            }
                        } catch (e) {
                            console.warn('app-ui-root: getCoinData error', e);
                        }
                        return null;
                    };

                    coinData = await tryGetCoinData(coinId);

                    if (!coinData) {
                        // fuzzy search
                        try {
                            const results = await window.dataProviderManager.searchCoins(lower, { limit: 5 });
                            if (Array.isArray(results) && results.length > 0) {
                                const first = results[0];
                                coinId = first.id;
                                coinData = await tryGetCoinData(coinId);
                                if (!coinData) {
                                    // fallback: take normalized object from search
                                    coinData = {
                                        id: first.id,
                                        symbol: first.symbol,
                                        name: first.name,
                                        market_cap: first.market_cap || first.marketCap || null
                                    };
                                }
                            }
                        } catch (e) {
                            console.warn('app-ui-root: searchCoins error', e);
                        }
                    }

                    if (!coinData || !coinData.id) {
                        if (window.messagesStore) {
                            window.messagesStore.addMessage({
                                type: 'warning',
                                text: `Не найдено: ${token}`,
                                scope: 'global',
                                duration: 3000
                            });
                        }
                        return;
                    }

                    // Add coin
                    const existingIds = new Set((this.coins || []).map(c => c.id));
                    if (!existingIds.has(coinData.id)) {
                        this.coins.push(coinData);
                        this.coinsDataCache.set(coinData.id, coinData);
                        const updatedActive = Array.from(new Set([...(this.activeCoinSetIds || []), coinData.id]));
                        await this.saveActiveCoinSetIds(updatedActive);
                        if (window.workspaceConfig) {
                            await window.workspaceConfig.saveWorkspace({ activeCoinSetIds: updatedActive });
                        }
                        if (window.eventBus) {
                            window.eventBus.emit('coins-added-from-search', { ids: [coinData.id], source: 'search-input' });
                        }
                        if (window.messagesStore) {
                            window.messagesStore.addMessage({
                                type: 'success',
                                text: `Добавлена coinsа: ${coinData.symbol || coinData.id}`,
                                scope: 'global',
                                duration: 2500
                            });
                        }
                    }
                },

                /**
                 * Document click handler (to close dropdown)
                 */
                handleDocumentClick(event) {
                    // Close dropdown if click was outside
                    if (this.showCoinSortDropdown) {
                        const target = event.target;
                        const dropdown = target.closest('.dropdown-menu');
                        const trigger = target.closest('th');

                        if (!dropdown && !trigger) {
                            this.showCoinSortDropdown = false;
                        }
                    }
                },

                /**
                 * Get sort type name for tooltip
                 */
                getCoinSortTypeTitle(sortType) {
                    const keyMap = {
                        alphabet: 'ui.coinSort.alphabet',
                        market_cap: 'ui.coinSort.marketCap',
                        total_volume: 'ui.coinSort.volume',
                        favorite: 'ui.coinSort.favorite',
                        selected: 'ui.coinSort.selected'
                    };
                    const key = keyMap[sortType];
                    const fallback = (() => {
                        if (!window.menusConfig) return '';
                        const items = window.menusConfig.getCoinSortMenuItems();
                        const item = items.find(i => i.sortType === sortType);
                        return item ? item.title : '';
                    })();
                    const title = window.tooltipsConfig ? (window.tooltipsConfig.getTooltip(key) || fallback) : fallback;
                    return title;
                },
                /**
                 * Tooltip for coin set load/save button
                 */
                getCoinSetActionTitle() {
                    if (!window.tooltipsConfig) {
                        return this.selectedCoinIds.length === 0 ? 'Загрузить набор coins' : 'Сохранить набор coins';
                    }
                    return this.selectedCoinIds.length === 0
                        ? window.tooltipsConfig.getTooltip('ui.coinSet.load')
                        : window.tooltipsConfig.getTooltip('ui.coinSet.save');
                },
                /**
                 * Tooltip for Price show/hide button
                 */
                getPriceColumnTitle() {
                    if (!window.tooltipsConfig) {
                        return this.showPriceColumn ? 'Скрыть Price' : 'Показать Price';
                    }
                    return this.showPriceColumn
                        ? window.tooltipsConfig.getTooltip('ui.coinTable.hidePrice')
                        : window.tooltipsConfig.getTooltip('ui.coinTable.showPrice');
                },

                /**
                 * Get icon for Coin sort type
                 */
                getCoinSortTypeIcon(sortType) {
                    const iconMap = {
                        'alphabet': 'sort_by_alpha',
                        'market_cap': 'trending_up',
                        'total_volume': 'bar_chart',
                        'favorite': 'star',
                        'selected': 'check_circle'
                    };
                    return iconMap[sortType] || 'check_circle';
                },

                /**
                 * Open coin set save modal
                 */
                openCoinSetSaveModal() {
                    if (this.selectedCoinIds.length === 0) {
                        return;
                    }

                    if (this.$refs.coinSetSaveModal) {
                        this.$refs.coinSetSaveModal.show();
                    }
                },

                /**
                 * Open coin set load modal
                 */
                openCoinSetLoadModal() {
                    if (this.$refs.coinSetLoadModal) {
                        this.$refs.coinSetLoadModal.show();
                    }
                },

                /**
                 * Save coin set to local "Draft"
                 * Add coins to existing Draft set (does not replace)
                 * No auth required, stored only in localStorage
                 * @param {Object} data - Data for saving { coin_ids, coins } (optional, if omitted - use current set)
                 */
                saveToDraft(data = null) {
                    if (!window.draftCoinSet) {
                        console.error('draftCoinSet not loaded');
                        if (window.messagesStore) {
                            window.messagesStore.addMessage({
                                type: 'warning',
                                text: 'Draft набор недоступен',
                                scope: 'global',
                                duration: 3000
                            });
                        }
                        return;
                    }

                    // Get current Draft set from localStorage
                    const draftSet = window.draftCoinSet ? window.draftCoinSet.get() : null;
                    const existingCoinIds = draftSet && draftSet.coin_ids ? new Set(draftSet.coin_ids) : new Set();
                    const existingCoinsMap = new Map();

                    if (draftSet && draftSet.coins && Array.isArray(draftSet.coins)) {
                        draftSet.coins.forEach(coin => {
                            existingCoinsMap.set(coin.id, coin);
                        });
                    }

                    let newCoinIds = [];
                    let newCoinsData = [];

                    if (data && data.coin_ids) {
                        // Use data from param (from save modal)
                        // Filter only new coins (not yet in Draft)
                        newCoinIds = data.coin_ids.filter(id => !existingCoinIds.has(id));
                        newCoinsData = (data.coins || []).filter(coin => !existingCoinIds.has(coin.id));

                    } else {
                        // Use current coin set
                        if (!this.coins || this.coins.length === 0) {
                            if (window.messagesStore) {
                                window.messagesStore.addMessage({
                                    type: 'warning',
                                    text: 'Нет coins for saving в Draft',
                                    scope: 'global',
                                    duration: 3000
                                });
                            }
                            return;
                        }
                        const currentCoinIds = this.coins.map(coin => coin.id);
                        newCoinIds = currentCoinIds.filter(id => !existingCoinIds.has(id));
                        newCoinsData = this.coins.filter(coin => !existingCoinIds.has(coin.id));

                    }

                    if (newCoinIds.length === 0) {
                        if (window.messagesStore) {
                            window.messagesStore.addMessage({
                                type: 'info',
                                text: 'Все coinsы уже есть в Draft',
                                scope: 'global',
                                duration: 3000
                            });
                        }
                        return;
                    }

                    try {
                        // Merge existing and new coins (ID)
                        const allCoinIds = Array.from(new Set([...Array.from(existingCoinIds), ...newCoinIds]));

                        // Collect full coin data from ALL available sources (SSOT)
                        const allCoinsData = [];
                        const coinsDataMap = new Map();

                        // 1. Add existing coins from Draft
                        existingCoinsMap.forEach(coin => {
                            coinsDataMap.set(coin.id, coin);
                        });

                        // 2. Add new coins from data.coins (if any)
                        if (data && data.coins && Array.isArray(data.coins)) {
                            data.coins.forEach(coin => {
                                coinsDataMap.set(coin.id, coin);
                            });
                        }

                        // 3. Add coins from current set this.coins (to fill gaps)
                        if (this.coins && Array.isArray(this.coins)) {
                            this.coins.forEach(coin => {
                                if (allCoinIds.includes(coin.id) && !coinsDataMap.has(coin.id)) {
                                    coinsDataMap.set(coin.id, coin);
                                }
                            });
                        }

                        // Build final array of full coin data
                        allCoinIds.forEach(coinId => {
                            if (coinsDataMap.has(coinId)) {
                                allCoinsData.push(coinsDataMap.get(coinId));
                            }
                        });

                        window.draftCoinSet.save(allCoinIds, allCoinsData);

                        if (window.messagesStore) {
                            window.messagesStore.addMessage({
                                type: 'success',
                                text: `Добавлено ${newCoinIds.length} coins в Draft (всего: ${allCoinIds.length})`,
                                scope: 'global',
                                duration: 3000
                            });
                        }

                        // Update Draft set in load modal (if open)
                        if (window.eventBus) {
                            window.eventBus.emit('draft-set-updated');
                        }
                    } catch (error) {
                        console.error('app-ui-root: ошибка saving в Draft:', error);
                        if (window.messagesStore) {
                            window.messagesStore.addMessage({
                                type: 'danger',
                                text: `Ошибка saving в Draft: ${error.message || 'Unknown error'}`,
                                scope: 'global',
                                duration: 5000
                            });
                        }
                    }
                },

                /**
                 * Coin set save handler
                 */
                async handleSaveCoinSet(data) {
                    if (!window.coinSetsClient) {
                        console.error('coin-sets-client not loaded');
                        return;
                    }

                    // Check auth before save
                    if (!this.isAuthenticated) {
                        const error = new Error('Для saving set coins необходимо авторизоваться');
                        // Show error message via message system
                        if (window.messagesStore) {
                            window.messagesStore.addMessage({
                                type: 'warning',
                                text: 'Для saving set coins необходимо авторизоваться. Откройте настройки и выполните авторизацию через Google.',
                                scope: 'global',
                                duration: 5000
                            });
                        }
                        throw error;
                    }

                    try {
                        const result = await window.coinSetsClient.createCoinSet({
                            name: data.name,
                            description: data.description,
                            coin_ids: data.coin_ids,
                            is_active: 1,
                            provider: 'coingecko'
                        });

                        if (result) {
                            console.log('Набор coins сохранен:', result);

                            // Add full coin data to result (if passed)
                            if (data.coins && Array.isArray(data.coins)) {
                                result.coins = data.coins;
                            }

                            // Show success message via message system
                            if (window.messagesStore) {
                                window.messagesStore.addMessage({
                                    type: 'success',
                                    text: `Набор coins "${result.name}" успешно сохранен`,
                                    scope: 'global',
                                    duration: 3000
                                });
                            }

                            // Update set list in load modal (if open)
                            // Use event via eventBus for list update
                            if (window.eventBus) {
                                window.eventBus.emit('coin-set-saved', { coinSet: result });
                            }
                        }
                    } catch (error) {
                        console.error('Ошибка saving set coins:', error);
                        // Show error message via message system
                        if (window.messagesStore) {
                            window.messagesStore.addMessage({
                                type: 'danger',
                                text: `Ошибка saving set coins: ${error.message || 'Unknown error'}`,
                                scope: 'global',
                                duration: 5000
                            });
                        }
                        throw error; // Пробрасываем ошибку, чтобы модальное окно могло обработать
                    }
                },

                /**
                 * Coin set save cancel handler
                 */
                handleCancelCoinSetSave() {
                    // Just close modal
                    if (this.$refs.coinSetSaveModal) {
                        this.$refs.coinSetSaveModal.hide();
                    }
                },

                /**
                 * Coin sets load handler
                 * Merge coins from selected sets and replace current list or add to it
                 * @param {Array} coinSets - array of coin sets for loading
                 * @param {Object} options - load options
                 * @param {boolean} options.merge - if true, coins added to current; if false, replace (default false)
                 */
                async handleLoadCoinSet(coinSets, options = {}) {
                    const { merge = false } = options;

                    if (!coinSets || !Array.isArray(coinSets) || coinSets.length === 0) {
                        console.warn('coin-set-load-modal-body: нет sets for loading');
                        return;
                    }

                    // Merge coins from all selected sets
                    const allCoinIds = new Set();
                    const allCoinsData = new Map(); // Для хранения полных data coins
                    const setNames = [];

                    coinSets.forEach(coinSet => {
                        if (coinSet.coin_ids && Array.isArray(coinSet.coin_ids)) {
                            coinSet.coin_ids.forEach(id => allCoinIds.add(id));
                            setNames.push(coinSet.name);

                            // If set contains full coin data (e.g. default set)
                            if (coinSet.coins && Array.isArray(coinSet.coins)) {
                                coinSet.coins.forEach(coin => {
                                    allCoinsData.set(coin.id, coin);
                                });
                            }
                        }
                    });

                    const { bannedIds } = this.getBanContext();
                    const coinIdsArray = Array.from(allCoinIds).filter(id => !bannedIds.has(id));

                    // First use already passed full coin data from selected sets,
                    // then load only missing IDs via loadCoinsByIds.
                    // Skill anchor: do not re-fetch what already came in coinSet.coins (typical source of extra API cycles).
                    // See id:sk-bb7c8e
                    const resolvedCoinsMap = new Map();
                    coinIdsArray.forEach(coinId => {
                        const coinData = allCoinsData.get(coinId);
                        if (coinData) {
                            resolvedCoinsMap.set(coinId, coinData);
                        }
                    });

                    let unresolved = [];
                    if (resolvedCoinsMap.size < coinIdsArray.length) {
                        const missingIds = coinIdsArray.filter(id => !resolvedCoinsMap.has(id));

                        const loadedMissing = await this.loadCoinsByIds(missingIds, {
                            onProgress: options.onProgress,
                            forceChunking: true,
                            useDualChannel: true,
                            allowCoinGeckoFallback: true
                        });

                        if (loadedMissing && Array.isArray(loadedMissing.coins)) {
                            loadedMissing.coins.forEach(coin => {
                                if (coin && coin.id && !resolvedCoinsMap.has(coin.id)) {
                                    resolvedCoinsMap.set(coin.id, coin);
                                }
                            });
                        }

                        unresolved = loadedMissing && Array.isArray(loadedMissing.unresolved)
                            ? loadedMissing.unresolved
                            : [];
                    }

                    // Save order according to ID set
                    const coins = this.applyBanFilterToCoins(coinIdsArray.map(id => resolvedCoinsMap.get(id)).filter(Boolean));
                    coins.forEach(coin => this.coinsDataCache.set(coin.id, coin));

                    // Apply merge or replace
                    if (merge) {
                        // MERGE: combine with current coins, remove duplicates by ID
                        const existingIds = new Set(this.coins.map(c => c.id));
                        const uniqueNewCoins = coins.filter(c => !existingIds.has(c.id));
                        this.coins = [...this.coins, ...uniqueNewCoins];
                    } else {
                        // REPLACE: current behavior
                        this.coins = coins;
                    }

                    // Classify loaded coins for auto-sets
                    if (window.autoCoinSets) {
                        window.autoCoinSets.classifyAndUpdateAutoSets(coins);
                    }

                    if (unresolved.length > 0) {
                        // Collect metadata for missing coins from source sets
                        const missingWithMeta = unresolved.map(id => {
                            let symbol = id;
                            let name = '';
                            coinSets.forEach(set => {
                                if (set.coins && Array.isArray(set.coins)) {
                                    const found = set.coins.find(c => c.id === id);
                                    if (found) {
                                        symbol = found.symbol || symbol;
                                        name = found.name || name;
                                    }
                                }
                            });
                            return { id, symbol, name };
                        });
                        this.missingCoins = missingWithMeta;
                        this.pendingCoinSetContext = { coinSets, originalIds: coinIdsArray };
                        if (this.$refs.coinSetLoadModal) {
                            this.$refs.coinSetLoadModal.hide();
                        }
                        if (this.$refs.missingCoinsModal && typeof this.$refs.missingCoinsModal.show === 'function') {
                            this.$refs.missingCoinsModal.show();
                            }
                        return;
                    } else {
                        // Skill anchor: after merge activeCoinSetIds must be union of this.coins, else table counter "sticks".
                        // See id:sk-bb7c8e
                        const nextActiveCoinSetIds = merge
                            ? Array.from(new Set(this.coins.map(coin => coin.id)))
                            : coinIdsArray;

                        // Set active coin set (system understands we work with set, not default list)
                        await this.saveActiveCoinSetIds(nextActiveCoinSetIds);
                        // Clear selected coins (user starts work with new set)
                        this.selectedCoinIds = [];
                        // Close modal
                        if (this.$refs.coinSetLoadModal) {
                            this.$refs.coinSetLoadModal.hide();
                        }
                        if (window.messagesStore) {
                            window.messagesStore.addMessage({
                                type: 'success',
                                text: `Загружено ${this.coins.length} coins из sets (${coinSets.length})`,
                                scope: 'global',
                                duration: 3000
                            });
                        }
                    }

                    // Show success message
                    if (window.messagesStore) {
                        const namesText = setNames.length === 1
                            ? `"${setNames[0]}"`
                            : `${setNames.length} sets`;
                        const loadedCount = coins.length;
                        const requestedCount = coinIdsArray.length;
                        const actionText = merge ? 'добавлены' : 'loadedы';
                        const tableText = merge
                            ? 'Таблица обновлена.'
                            : 'Таблица показывает только coinsы из set.';
                        const messageText = loadedCount === requestedCount
                            ? `Наборы coins ${namesText} ${actionText} (${loadedCount} coins). ${tableText}`
                            : `Наборы coins ${namesText} ${actionText} (${loadedCount} из ${requestedCount} coins). ${tableText}`;
                        window.messagesStore.addMessage({
                            type: loadedCount === requestedCount ? 'success' : 'warning',
                            text: messageText,
                            scope: 'global',
                            duration: 5000
                        });
                            }
                },

                /**
                 * Missing coins resolution handler (exclude/replace)
                 * @param {Object} payload
                 * @param {Array<string>} payload.excludes
                 * @param {Array<{oldId: string, newId: string, coin: Object}>} payload.replacements
                 */
                async handleResolveMissingCoins(payload) {
                    const excludes = (payload && Array.isArray(payload.excludes)) ? payload.excludes : [];
                    const replacements = (payload && Array.isArray(payload.replacements)) ? payload.replacements : [];
                    const replaceMap = new Map();
                    replacements.forEach(r => {
                        if (r.oldId && r.newId) {
                            replaceMap.set(r.oldId, r.newId);
                            }
                    });
                    const excludeSet = new Set(excludes);

                    const ctx = this.pendingCoinSetContext || { originalIds: this.activeCoinSetIds || [], coinSets: null };
                    const baseIds = Array.isArray(ctx.originalIds) ? ctx.originalIds : [];

                    let updatedIds = [];
                    baseIds.forEach(id => {
                        if (excludeSet.has(id)) {
                            return;
                        }
                        if (replaceMap.has(id)) {
                            updatedIds.push(replaceMap.get(id));
                                } else {
                            updatedIds.push(id);
                                }
                            });
                    updatedIds = Array.from(new Set(updatedIds));

                    // Load coin data for updated list
                    const { coins, unresolved } = await this.loadCoinsByIds(updatedIds);
                    this.coins = coins;
                    coins.forEach(c => this.coinsDataCache.set(c.id, c));

                    // Filter selected coins
                    const validIds = new Set(updatedIds);
                    this.selectedCoinIds = this.selectedCoinIds.filter(id => validIds.has(id));

                    // Save active set
                    await this.saveActiveCoinSetIds(updatedIds);

                    // Sync sets in cloud (if saved sets were selected)
                    await this.syncCoinSetsAfterResolve(ctx.coinSets, excludeSet, replaceMap);

                    if (unresolved && unresolved.length > 0 && window.messagesStore) {
                                    window.messagesStore.addMessage({
                                        type: 'warning',
                            text: `После замены не найдены данные for ${unresolved.length} coins: ${unresolved.slice(0, 3).join(', ')}`,
                                        scope: 'global',
                            duration: 6000
                                    });
                    } else if (window.messagesStore) {
                                window.messagesStore.addMessage({
                            type: 'success',
                            text: 'Набор обновлен: отсутствующие coinsы обработаны',
                                    scope: 'global',
                            duration: 4000
                                });
                            }

                    // Close modal if needed
                    if (this.$refs.missingCoinsModal) {
                        this.$refs.missingCoinsModal.hide();
                    }

                    // Reset context
                    this.missingCoins = [];
                    this.pendingCoinSetContext = null;
                },

                /**
                 * Sync changed sets in cloud and locally
                 * @param {Array<Object>|null} coinSets
                 * @param {Set<string>} excludeSet
                 * @param {Map<string,string>} replaceMap
                 */
                async syncCoinSetsAfterResolve(coinSets, excludeSet, replaceMap) {
                    if (!coinSets || !Array.isArray(coinSets) || coinSets.length === 0) {
                        return;
                    }

                    for (const set of coinSets) {
                        if (!set || !Array.isArray(set.coin_ids)) {
                            continue;
                        }

                        // Skip default and local drafts
                        if (set.id === 'default' || set.id === 'draft' || set.is_local) {
                            continue;
                        }

                        const updatedIds = [];
                        set.coin_ids.forEach(id => {
                            if (excludeSet.has(id)) {
                                return;
                            }
                            if (replaceMap.has(id)) {
                                updatedIds.push(replaceMap.get(id));
                            } else {
                                updatedIds.push(id);
                            }
                        });

                        const uniqueUpdated = Array.from(new Set(updatedIds));

                        if (window.coinSetsClient && this.isAuthenticated) {
                            try {
                                await window.coinSetsClient.updateCoinSet(set.id, { coin_ids: uniqueUpdated, provider: 'coingecko' });
                            } catch (error) {
                                console.warn('Ошибка update set в облаке', set.id, error);
                    if (window.messagesStore) {
                        window.messagesStore.addMessage({
                                        type: 'warning',
                                        text: `Не удалось обновить набор "${set.name || set.id}" в облаке: ${error.message || 'ошибка'}`,
                            scope: 'global',
                                        duration: 6000
                        });
                                }
                            }
                        }
                    }
                },

                /**
                 * Coin sets delete handler
                 */
                async handleDeleteCoinSets(coinSetIds) {
                    if (!coinSetIds || !Array.isArray(coinSetIds) || coinSetIds.length === 0) {
                        return;
                    }

                    if (!window.coinSetsClient) {
                        console.error('coin-sets-client not loaded');
                        return;
                    }

                    // Check auth before delete
                    if (!this.isAuthenticated) {
                        const error = new Error('Для deletion sets coins необходимо авторизоваться');
                        if (window.messagesStore) {
                            window.messagesStore.addMessage({
                                type: 'warning',
                                text: 'Для deletion sets coins необходимо авторизоваться. Откройте настройки и выполните авторизацию через Google.',
                                scope: 'global',
                                duration: 5000
                            });
                        }
                        throw error;
                    }

                    try {
                        // Delete each set
                        const deletePromises = coinSetIds.map(id =>
                            window.coinSetsClient.deleteCoinSet(id)
                        );
                        await Promise.all(deletePromises);

                        // Show success message
                        if (window.messagesStore) {
                            window.messagesStore.addMessage({
                                type: 'success',
                                text: `Удалено sets coins: ${coinSetIds.length}`,
                                scope: 'global',
                                duration: 3000
                            });
                        }
                    } catch (error) {
                        console.error('Ошибка deletion sets coins:', error);
                        if (window.messagesStore) {
                            window.messagesStore.addMessage({
                                type: 'danger',
                                text: `Ошибка deletion sets coins: ${error.message || 'Unknown error'}`,
                                scope: 'global',
                                duration: 5000
                            });
                        }
                        throw error;
                    }
                },

                /**
                 * Coin set load cancel handler
                 */
                handleCancelCoinSetLoad() {
                    // Just close modal
                    if (this.$refs.coinSetLoadModal) {
                        this.$refs.coinSetLoadModal.hide();
                    }
                },

                /**
                 * Initialize local Draft set
                 * Called at app start if set does not exist yet
                 * Initialized with empty set
                 */
                initializeDraftSet() {
                    if (!window.draftCoinSet) {
                        console.warn('app-ui-root: draftCoinSet not loaded, инициализация пропущена');
                        return;
                    }

                    try {
                        // Check if Draft set already exists in localStorage
                        const existing = window.draftCoinSet.get();
                        if (!existing || existing.coin_ids.length === 0) {
                            // Initialize with empty set
                            window.draftCoinSet.initialize([]);
                            console.log('✅ Draft набор initialized (пустой)');
                        } else {
                            console.log(`✅ Draft набор уже существует (${existing.coin_ids.length} coins)`);
                        }
                    } catch (error) {
                        console.error('app-ui-root: ошибка инициализации Draft set:', error);
                    }
                },

                /**
                 * Preload max coin sets (250 by market cap and by volume)
                 * Called at app start for cache fill
                 */
                async preloadMaxCoinsData() {
                    if (!window.dataProviderManager || !window.cacheManager) {
                        console.warn('app-ui-root: dataProviderManager или cacheManager not loadedы, предзагрузка пропущена');
                        return;
                    }

                    /**
                     * Load coin set with cache priority and freshness check (4 hours).
                     * @returns {'ok'|'rate-limited'|'skipped'|null}
                     */
                    const loadWithPriority = async (cacheKey, sortBy, label) => {
                        const cached = await window.cacheManager.get(cacheKey);
                        const threshold = window.ssot?.getTopCoinsTimingWindowMs?.() || 2 * 60 * 60 * 1000;

                        if (cached && Array.isArray(cached) && cached.length > 0) {
                            const metaKey = `${cacheKey}-meta`;
                            const meta = await window.cacheManager.get(metaKey);
                            const age = meta ? Date.now() - meta.timestamp : 0;

                            if (age < threshold) {
                                console.log(`${label} fresh (${Math.round(age / 60000)} min ago). Skip.`);
                                return 'skipped';
                            }
                        }

                        if (window.requestRegistry) {
                            const minInterval = window.ssot?.getTopCoinsRequestIntervalMs?.() || 2 * 60 * 60 * 1000;
                            const allowed = window.requestRegistry.isAllowed('coingecko', 'getTopCoins', { count: 250, sortBy }, minInterval);
                            if (!allowed) {
                                const wait = window.requestRegistry.getTimeUntilNext('coingecko', 'getTopCoins', { count: 250, sortBy }, minInterval);
                                console.log(`app-ui-root: предзагрузка ${label} пропущена — registry заблокирован ещё ${Math.ceil(wait / 60000)} мин.`);
                                return 'rate-limited';
                            }
                        }

                        // If cache empty or stale - try to load
                        try {
                            console.log(`app-ui-root: кэш ${label} пуст или устарел, загружаем...`);
                            const coins = await window.dataProviderManager.getTopCoins(250, sortBy);
                            if (coins && coins.length > 0) {
                                await window.cacheManager.set(cacheKey, coins);
                                await window.cacheManager.set(`${cacheKey}-meta`, { timestamp: Date.now() });
                                return 'ok';
                            }
                        } catch (error) {
                            const isRateLimit = /rate limit|429/i.test(String(error.message || ''));
                            console.warn(`app-ui-root: failed to предзагрузить ${label}:`, error.message);
                            if (isRateLimit) return 'rate-limited';
                        }
                        return null;
                    };

                    // If we just loaded main data for table,
                    // delay preload of full sets by 5-10 min.
                    // On cold start (empty cache) give 60 sec to avoid hitting rate limiter
                    // immediately after initial coin load.
                    const delay = (this.coins && this.coins.length > 0) ? 5 * 60 * 1000 : 60 * 1000;

                    setTimeout(async () => {
                        const resultMarketCap = await loadWithPriority('top-coins-by-market-cap', 'market_cap', 'топ-250 по капитализации');
                        // Skill anchor: if market_cap got 429 - do not retry load volume,
                        // this would worsen the block. Abort entire preload chain.
                        if (resultMarketCap === 'rate-limited') {
                            console.log('app-ui-root: предзагрузка по объёму пропущена из-за rate limit на капитализации.');
                            return;
                        }
                        await new Promise(r => setTimeout(r, 10000)); // Pause between heavy requests
                        await loadWithPriority('top-coins-by-volume', 'volume', 'топ-250 по объему');
                    }, delay);
                },

                /**
                 * Update coin and market metrics cache (force load from API)
                 * Called on Refresh button
                 * On file:// uses Cloudflare Worker proxy for CORS bypass
                 */
                async refreshCoinsCache() {
                    if (!window.dataProviderManager || !window.cacheManager) {
                        console.error('app-ui-root: dataProviderManager или cacheManager not loadedы');
                        return;
                    }

                    // Show message about update start
                    if (window.messagesStore) {
                        window.messagesStore.addMessage({
                            type: 'info',
                            text: 'Принудительное обновление data coins и metrics рынка...',
                            scope: 'global',
                            duration: 3000
                        });
                    }

                    try {
                        // Skill anchor: on force refresh cache delete ok; on normal load—no (stale-while-revalidate).
                        // See id:sk-3c832d
                        // 1. Remove old coin data from cache
                        await window.cacheManager.delete('top-coins-by-market-cap');
                        await window.cacheManager.delete('top-coins-by-market-cap-meta');
                        await window.cacheManager.delete('top-coins-by-volume');
                        await window.cacheManager.delete('top-coins-by-volume-meta');
                        await window.cacheManager.delete('stablecoins-list');

                        console.log('app-ui-root: кэш coins очищен, загружаем новые данные...');

                        // 2. Load fresh coin data
                        const coinsMarketCap = await window.dataProviderManager.getTopCoins(250, 'market_cap');
                        await window.cacheManager.set('top-coins-by-market-cap', coinsMarketCap);
                        await window.cacheManager.set('top-coins-by-market-cap-meta', { timestamp: Date.now() });
                        console.log(`✅ Топ-250 по капитализации обновлены (${coinsMarketCap.length} coins)`);

                        const coinsVolume = await window.dataProviderManager.getTopCoins(250, 'volume');
                        await window.cacheManager.set('top-coins-by-volume', coinsVolume);
                        await window.cacheManager.set('top-coins-by-volume-meta', { timestamp: Date.now() });
                        console.log(`✅ Топ-250 по объему обновлены (${coinsVolume.length} coins)`);

                        // 3. Update CoinGecko stablecoins list (forceRefresh)
                        if (window.coingeckoStablecoinsLoader && typeof window.coingeckoStablecoinsLoader.load === 'function') {
                            await window.coingeckoStablecoinsLoader.load({ forceRefresh: true, ttl: 24 * 60 * 60 * 1000 });
                            console.log('✅ Список стейблкоинов обновлен');
                        }

                        // 4. Remove market metrics cache (VIX, FGI, Dom, OI, FR, LSR)
                        await window.cacheManager.delete('vix-index');
                        await window.cacheManager.delete('fear-greed-index');

                        console.log('app-ui-root: кэш metrics очищен, загружаем свежие данные...');

                        // 5. Load fresh market metrics via footer
                        if (this.$refs.appFooter && typeof this.$refs.appFooter.fetchMarketIndices === 'function') {
                            await this.$refs.appFooter.fetchMarketIndices({ forceRefresh: true });
                            console.log('✅ Метрики рынка обновлены');
                        } else if (window.marketMetrics && typeof window.marketMetrics.fetchAll === 'function') {
                            // Fallback: direct module call
                            await window.marketMetrics.fetchAll({ forceRefresh: true });
                            console.log('✅ Метрики рынка обновлены (через модуль)');
                        }

                        // 6. Show success message
                        if (window.messagesStore) {
                            window.messagesStore.addMessage({
                                type: 'success',
                                text: 'Данные успешно обновлены (coinsы + metrics рынка + стейблкоины)',
                                scope: 'global',
                                duration: 4000
                            });
                        }

                        // 7. Update coin table reactively
                        await this.loadTopCoins();
                        await this.updateCoinsCacheMeta();
                    } catch (error) {
                        console.error('app-ui-root: ошибка update кэша:', error);
                        if (window.messagesStore) {
                            window.messagesStore.addMessage({
                                type: 'danger',
                                text: `Ошибка update data: ${error.message || 'Unknown error'}`,
                                scope: 'global',
                                duration: 5000
                            });
                        }
                    }
                },

                /**
                 * Update top-coins cache metadata (expiresAt/timestamp)
                 */
                /**
                 * Request coin count in cloud PostgreSQL DB
                 * Uses checkCacheStatus() from yandex-cache-provider
                 */
                async fetchDbStatus() {
                    if (!window.dataProviderManager) return;
                    this.dbStatus = { count: null, loading: true, error: false };
                    try {
                        const provider = window.dataProviderManager.providers?.['yandex-cache'];
                        if (!provider || typeof provider.checkCacheStatus !== 'function') {
                            this.dbStatus = { count: null, loading: false, error: false };
                            return;
                        }
                        const status = await provider.checkCacheStatus();
                        this.dbStatus = {
                            count: status.available ? (status.count ?? null) : null,
                            loading: false,
                            error: !status.available,
                            fetchedAt: status.fetchedAt || null
                        };
                    } catch (e) {
                        this.dbStatus = { count: null, loading: false, error: true, fetchedAt: null };
                    }
                },

                /**
                 * Fallback sync: send coins from local cache to PostgreSQL,
                 * if newer than DB data. Runs at start/refresh with page.
                 * Covers cases when reactivity failed (search, direct load etc.)
                 */
                async syncCacheToDb() {
                    try {
                        const API_GATEWAY = 'https://d5dl2ia43kck6aqb1el5.k1mxzkh0.apigw.yandexcloud.net';

                        // Coins from yandex-cache already in DB - skip.
                        // Send only coins from CoinGecko (_source absent or !== 'yandex-cache').
                        const isFromCoinGecko = (coin) => coin._source !== 'yandex-cache';

                        const coinMap = new Map(); // id -> coin (deduplication)

                        // 1. Current coins in table
                        for (const coin of (this.coins || [])) {
                            if (coin.id && isFromCoinGecko(coin)) {
                                coinMap.set(coin.id, coin);
                            }
                        }

                        // 2. Top-coins caches (may contain CoinGecko-fallback)
                        if (window.cacheManager) {
                            for (const key of ['top-coins-by-market-cap', 'top-coins-by-volume']) {
                                const cached = await window.cacheManager.get(key);
                                if (Array.isArray(cached)) {
                                    for (const coin of cached) {
                                        if (coin.id && isFromCoinGecko(coin)) {
                                            coinMap.set(coin.id, coin);
                                        }
                                    }
                                }
                            }
                        }

                        if (coinMap.size === 0) {
                            console.log('app-ui-root: syncCacheToDb — нет coins из CoinGecko for синхронизации');
                            return;
                        }

                        const coins = Array.from(coinMap.values());
                        console.log(`app-ui-root: syncCacheToDb — отправляем ${coins.length} coins из CoinGecko в БД`);

                        const resp = await fetch(`${API_GATEWAY}/api/coins/market-cache`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ coins })
                        });
                        if (resp.ok) {
                            const data = await resp.json();
                            console.log(`app-ui-root: syncCacheToDb — upserted=${data.upserted}`);
                            if (data.upserted > 0) {
                                await this.fetchDbStatus();
                                console.log(`app-ui-root: syncCacheToDb — счётчик обновлён: ${this.dbStatus.count}`);
                            }
                        } else {
                            console.warn(`app-ui-root: syncCacheToDb — HTTP ${resp.status}`);
                        }
                    } catch (e) {
                        console.warn('app-ui-root: syncCacheToDb ошибка:', e.message);
                    }
                },

                async updateCoinsCacheMeta() {
                    try {
                        if (!window.cacheManager) {
                            if (window.uiState) {
                                window.uiState.setCoinsCacheMeta({ expiresAt: null, timestamp: null });
                            }
                            return;
                        }

                        const cacheKey = 'top-coins-by-market-cap';
                        const metaKey = `${cacheKey}-meta`;

                        const meta = await window.cacheManager.get(metaKey);

                        if (meta && meta.timestamp) {
                            if (window.uiState) {
                                window.uiState.setCoinsCacheMeta({
                                    expiresAt: meta.timestamp + (window.ssot?.getTopCoinsTimingWindowMs?.() || 2 * 60 * 60 * 1000),
                                    timestamp: meta.timestamp
                                });
                            }
                        } else {
                            if (window.uiState) {
                                window.uiState.setCoinsCacheMeta({ expiresAt: null, timestamp: null });
                            }
                        }
                    } catch (error) {
                        console.warn('app-ui-root: updateCoinsCacheMeta error:', error);
                        if (window.uiState) {
                            window.uiState.setCoinsCacheMeta({ expiresAt: null, timestamp: null });
                        }
                    }
                },

                /**
                 * Soft refresh of coin table without network requests
                 */
                async softRefreshCoinsTable() {
                    if (!window.cacheManager) {
                        console.warn('app-ui-root: cacheManager not loaded, мягкий рефреш пропущен');
                        return;
                    }

                    try {
                        const cacheKey = 'top-coins-by-market-cap';
                        const coinsFullSet = await window.cacheManager.get(cacheKey);
                        if (!coinsFullSet || !Array.isArray(coinsFullSet)) {
                            if (window.messagesStore) {
                                window.messagesStore.addMessage({
                                    type: 'warning',
                                    text: 'Кэш coins недоступен. Для update нужен новый запрос.',
                                    scope: 'global',
                                    duration: 3000
                                });
                            }
                            return;
                        }

                        this.coins = this.applyBanFilterToCoins(coinsFullSet).slice(0, 50);
                        this.coins.forEach(coin => {
                            this.coinsDataCache.set(coin.id, coin);
                        });
                        this.recalculateAllMetrics();
                    } catch (error) {
                        console.warn('app-ui-root: softRefreshCoinsTable error:', error);
                    }
                },

                /**
                 * Load top coins for table (index.html)
                 * Takes data from preloaded max sets cache
                 */
                async loadTopCoins() {
                    this.coinsLoading = true;
                    this.coinsError = null;

                    const cacheKey = 'top-coins-by-market-cap';
                    let coinsFullSet = null;
                    try {
                        if (!window.dataProviderManager) {
                            throw new Error('dataProviderManager not loaded');
                        }

                        // ALWAYS try cache first for instant render
                        if (window.cacheManager) {
                            coinsFullSet = await window.cacheManager.get(cacheKey);
                        }

                        // Fallback: old IndexedDB stub format (localStorage idb_warm_*)
                        if ((!coinsFullSet || !coinsFullSet.length) && typeof localStorage !== 'undefined') {
                            try {
                                const legacyKey = `idb_warm_${cacheKey}`;
                                const legacyRaw = localStorage.getItem(legacyKey);
                                if (legacyRaw) {
                                    const legacyParsed = JSON.parse(legacyRaw);
                                    const legacyData = legacyParsed?.data ?? legacyParsed;
                                    if (Array.isArray(legacyData) && legacyData.length > 0) {
                                        coinsFullSet = legacyData;
                                        if (window.cacheManager) {
                                            await window.cacheManager.set(cacheKey, legacyData);
                                            await window.cacheManager.set(`${cacheKey}-meta`, { timestamp: Date.now() });
                                        }
                                    }
                                }
                            } catch (legacyError) {
                                console.warn('app-ui-root: read error legacy cache', legacyError);
                            }
                        }

                        // If cache has data - show immediately!
                        if (coinsFullSet && coinsFullSet.length > 0) {
                            this.coins = this.applyBanFilterToCoins(coinsFullSet).slice(0, 50);
                            this.coins.forEach(coin => this.coinsDataCache.set(coin.id, coin));
                            if (window.autoCoinSets) window.autoCoinSets.classifyAndUpdateAutoSets(this.coins);
                            this.recalculateAllMetrics();
                            console.log(`✅ Топ coins (из кэша): ${this.coins.length}`);

                            const threshold = window.ssot?.getTopCoinsTimingWindowMs?.() || 2 * 60 * 60 * 1000;
                            const meta = await window.cacheManager.get(`${cacheKey}-meta`);
                            const age = meta ? Date.now() - meta.timestamp : threshold + 1;

                            if (age > threshold) {
                                // Start background update in 15 sec only if data stale
                                setTimeout(async () => {
                                    try {
                                        console.log('app-ui-root: фоновое обновление топа coins (data stale)...');
                                        const fresh = await window.dataProviderManager.getTopCoins(250, 'market_cap', {
                                            preferYandexFirst: true,
                                            allowCoinGeckoFallback: false
                                        });
                                        if (fresh && fresh.length > 0) {
                                            await window.cacheManager.set(cacheKey, fresh);
                                            await window.cacheManager.set(`${cacheKey}-meta`, { timestamp: Date.now() });
                                            console.log('✅ Топ coins обновлен в кэше');
                                        }
                                    } catch (e) {
                                        console.warn('app-ui-root: фоновое обновление failed to, остаемся на кэше');
                                    }
                                }, 15000);
                            } else {
                                console.log(`✅ Данные в кэше еще свежие (${Math.round(age / 60000)} мин. назад). Фоновое обновление пропущено.`);
                            }

                            return;
                        }

                        // Only if cache completely empty - go to API and wait
                        console.log('app-ui-root: кэш пуст, загружаем топ из PostgreSQL...');
                        coinsFullSet = await window.dataProviderManager.getTopCoins(250, 'market_cap', {
                            preferYandexFirst: true,
                            allowCoinGeckoFallback: false
                        });
                        if (window.cacheManager && coinsFullSet) {
                            await window.cacheManager.set(cacheKey, coinsFullSet);
                        }

                        this.coins = this.applyBanFilterToCoins(coinsFullSet).slice(0, 50);
                        this.coins.forEach(coin => this.coinsDataCache.set(coin.id, coin));
                        if (window.autoCoinSets) window.autoCoinSets.classifyAndUpdateAutoSets(this.coins);
                        this.recalculateAllMetrics();

                    } catch (error) {
                        // this.coinsError = error.message || 'Unknown error';
                        console.warn('loadTopCoins non-fatal error (hidden from UI):', error);

                        // Fallback: try local cache (localStorage) so UI is not empty
                        if (!this.coins || this.coins.length === 0) {
                            try {
                                const saved = localStorage.getItem(cacheKey);
                                const fallback = saved ? JSON.parse(saved) : null;
                                if (Array.isArray(fallback) && fallback.length > 0) {
                                    this.coins = this.applyBanFilterToCoins(fallback).slice(0, 50);
                                    this.coins.forEach(coin => this.coinsDataCache.set(coin.id, coin));
                                    if (window.autoCoinSets) window.autoCoinSets.classifyAndUpdateAutoSets(this.coins);
                                    this.recalculateAllMetrics();
                                }
                            } catch (fallbackError) {
                                console.warn('loadTopCoins: fallback cache read failed', fallbackError);
                            }
                        }
                    } finally {
                        this.coinsLoading = false;
                    }
                },

                /**
                 * DEBUG: Coin context menu handling
                 */
                handleCoinContextMenu(event, coinId) {
                    console.log('Coin context menu:', coinId, event);
                    // Stub for future functionality
                },

                /**
                 * DEBUG: Create test coin set
                 */
                async testCreateCoinSet() {
                    this.testLoading = true;
                    this.testError = null;

                    try {
                        if (!window.coinSetsClient) {
                            throw new Error('coinSetsClient not loaded');
                        }

                        const coinSet = await window.coinSetsClient.createCoinSet({
                            name: `Test Set ${Date.now()}`,
                            description: 'Тестовый набор coins',
                            coin_ids: ['bitcoin', 'ethereum', 'cardano'],
                            is_active: 1,
                            provider: 'coingecko'
                        });

                        console.log('✅ Набор создан:', coinSet);
                        await this.testGetCoinSets(); // Обновляем список
                    } catch (error) {
                        this.testError = error.message || 'Ошибка создания set';
                        console.error('testCreateCoinSet error:', error);
                    } finally {
                        this.testLoading = false;
                    }
                },

                /**
                 * DEBUG: Get coin sets list
                 */
                async testGetCoinSets() {
                    this.testLoading = true;
                    this.testError = null;

                    try {
                        if (!window.coinSetsClient) {
                            throw new Error('coinSetsClient not loaded');
                        }

                        const coinSets = await window.coinSetsClient.getCoinSets();
                        this.testCoinSets = coinSets;
                        console.log('✅ Наборы получены:', coinSets);
                    } catch (error) {
                        this.testError = error.message || 'Ошибка retrieval sets';
                        console.error('testGetCoinSets error:', error);
                    } finally {
                        this.testLoading = false;
                    }
                },

                /**
                 * DEBUG: Delete last created set
                 */
                async testDeleteLastCoinSet() {
                    this.testLoading = true;
                    this.testError = null;

                    try {
                        if (!window.coinSetsClient) {
                            throw new Error('coinSetsClient not loaded');
                        }

                        if (this.testCoinSets.length === 0) {
                            throw new Error('Нет sets for deletion. Сначала получите список.');
                        }

                        const lastSet = this.testCoinSets[0]; // Первый в списке (newest)
                        await window.coinSetsClient.deleteCoinSet(lastSet.id);
                        console.log('✅ Набор удален:', lastSet.id);
                        await this.testGetCoinSets(); // Обновляем список
                    } catch (error) {
                        this.testError = error.message || 'Ошибка deletion set';
                        console.error('testDeleteLastCoinSet error:', error);
                    } finally {
                        this.testLoading = false;
                    }
                }
            },

            async mounted() {
                // Load saved portfolios (D.5)
                if (window.portfolioConfig && typeof window.portfolioConfig.getLocalPortfolios === 'function') {
                    this.userPortfolios = window.portfolioConfig.getLocalPortfolios();
                }

                if (window.eventBus) {
                    window.eventBus.on('portfolios-imported', () => {
                        if (window.portfolioConfig && typeof window.portfolioConfig.getLocalPortfolios === 'function') {
                            this.userPortfolios = window.portfolioConfig.getLocalPortfolios();
                        }
                    });
                }

                // Load timezone and translation language from cache at init
                // Keeps sync with footer and static examples
                try {
                    let savedLanguage = 'ru';
                    if (window.cacheManager) {
                        const savedTimezone = await window.cacheManager.get('timezone');
                        if (savedTimezone && typeof savedTimezone === 'string') {
                            this.selectedTimezone = savedTimezone;
                            this.initialTimezone = savedTimezone;
                        }

                        const lang = await window.cacheManager.get('translation-language');
                        if (lang && typeof lang === 'string') {
                            savedLanguage = lang;
                            this.selectedTranslationLanguage = lang;
                            this.initialTranslationLanguage = lang;
                            this.currentTranslationLanguage = lang;
                        }
                    } else {
                        const savedTimezone = localStorage.getItem('timezone');
                        if (savedTimezone) {
                            this.selectedTimezone = savedTimezone;
                            this.initialTimezone = savedTimezone;
                        }

                        const lang = localStorage.getItem('translation-language');
                        if (lang) {
                            savedLanguage = lang;
                            this.selectedTranslationLanguage = lang;
                            this.initialTranslationLanguage = lang;
                            this.currentTranslationLanguage = lang;
                        }
                    }

                    // Init tooltips for loaded language
                    // Wait for init before updating reactive tooltips
                    if (window.tooltipsConfig && typeof window.tooltipsConfig.init === 'function') {
                        try {
                            await window.tooltipsConfig.init(savedLanguage);

                            // Load coin metadata (stablecoins, wrapped, LST)
                            if (window.coinsMetadataLoader && typeof window.coinsMetadataLoader.load === 'function') {
                                // Do not wait for full load to avoid blocking UI, but start
                                window.coinsMetadataLoader.load().catch(err => {
                                    console.warn('app-ui-root: ошибка loading метаdata coins при старте', err);
                                });
                            }

                            // Update reactive tooltips after init
                            // Sync currentTranslationLanguage with currentLanguage from tooltipsConfig
                            if (window.tooltipsConfig && typeof window.tooltipsConfig.getCurrentLanguage === 'function') {
                                const tooltipsLanguage = window.tooltipsConfig.getCurrentLanguage();
                                if (tooltipsLanguage !== this.currentTranslationLanguage) {
                                    this.currentTranslationLanguage = tooltipsLanguage;
                                }
                            }
                            this.updateTooltips();
                        } catch (error) {
                            console.error('app-ui-root: ошибка инициализации tooltips при монтировании:', error);
                        }
                    }

                    // Init message translator
                    if (window.messagesTranslator && typeof window.messagesTranslator.init === 'function') {
                        try {
                            await window.messagesTranslator.init(savedLanguage);
                        } catch (error) {
                            console.error('app-ui-root: ошибка инициализации messagesTranslator:', error);
                        }
                    }

                    // Check initial auth state via centralized store
                    if (window.authState) {
                        try {
                            await window.authState.checkAuthStatus();
                        } catch (error) {
                            console.error('app-ui-root: ошибка проверки авторизации при монтировании:', error);
                        }
                    }

                    // Init test messages
                    this.initTestMessages();

                    // Init top-coins cache metadata and start periodic check
                    await this.updateCoinsCacheMeta();
                    if (this.coinsCacheCheckTimer) {
                        clearInterval(this.coinsCacheCheckTimer);
                    }
                    this.coinsCacheCheckTimer = setInterval(() => {
                        this.updateCoinsCacheMeta();
                    }, 60 * 1000);

                    if (window.eventBus) {
                        this._cacheResetSubId = window.eventBus.on('cache-reset', () => {
                            this.updateCoinsCacheMeta();
                        });
                        // Update DB counter after CoinGecko chunk write
                        window.eventBus.on('db-coins-upserted', () => {
                            if (this._dbStatusRefreshTimer) clearTimeout(this._dbStatusRefreshTimer);
                            this._dbStatusRefreshTimer = setTimeout(() => {
                                this._dbStatusRefreshTimer = null;
                                this.fetchDbStatus();
                            }, 1500);
                        });
                        this._banSetUpdatedSubId = window.eventBus.on('ban-set-updated', async () => {
                            const { bannedIds } = this.getBanContext();
                            const nextActiveIds = (this.activeCoinSetIds || []).filter(id => !bannedIds.has(id));
                            if (nextActiveIds.length !== (this.activeCoinSetIds || []).length) {
                                await this.saveActiveCoinSetIds(nextActiveIds);
                            }
                            const filtered = this.applyBanFilterToCoins(this.coins || []);
                            if (filtered.length !== (this.coins || []).length) {
                                this.coins = filtered;
                                this.selectedCoinIds = this.selectedCoinIds.filter(id => filtered.some(c => c.id === id));
                                this.recalculateAllMetrics();
                            }
                        });
                    }

                    // Init local "Draft" set from 77.json (if not yet exists)
                    this.initializeDraftSet();

                    // Init favorites manager
                    if (window.favoritesManager) {
                        await window.favoritesManager.init();
                        // Load initial list
                        const favorites = window.favoritesManager.getFavorites();
                        this.favoriteCoinsMeta = favorites;
                        this.favoriteCoinIds = favorites.map(f => f.id);

                        // Subscribe to updates
                        if (window.eventBus) {
                            window.eventBus.on('favorites-updated', (favorites) => {
                                // Use $nextTick for Vue reactivity guarantee
                                this.$nextTick(() => {
                                    this.favoriteCoinsMeta = [...favorites]; // Создаем новый массив for реактивности
                                this.favoriteCoinIds = favorites.map(f => f.id);
                                });
                            });
                        }
                    }

                    // Load stablecoins list from CoinGecko (once, no UI)
                    // No 5s delay, do not await - let it load fully in background
                    if (window.coingeckoStablecoinsLoader && typeof window.coingeckoStablecoinsLoader.load === 'function') {
                        // Start without await 15 sec after start
                        setTimeout(() => {
                            window.coingeckoStablecoinsLoader.load({ forceRefresh: false, ttl: 24 * 60 * 60 * 1000 }).catch(err => {
                                console.warn('app-ui-root: фоновая загрузка стейблкоинов не удалась (rate limit)', err.message);
                            });
                        }, 15000);
                    }

                    // Load workspace (active model, active coin set)
                    let workspace = null;
                    if (window.workspaceConfig) {
                        workspace = await window.workspaceConfig.loadWorkspace();
                    } else {
                        const defaultModelId = window.modelsConfig?.getDefaultModelId?.() || 'Median/AIR/260101';
                        workspace = { activeModelId: defaultModelId, activeCoinSetIds: [] };
                    }
                    if (workspace.activeModelId) {
                        this.activeModelId = workspace.activeModelId;
                    }
                    if (Array.isArray(workspace.activeCoinSetIds)) {
                        this.activeCoinSetIds = workspace.activeCoinSetIds;
                    }
                    if (window.workspaceConfig && window.modelsConfig?.getModel) {
                        const resolved = window.modelsConfig.getModel(workspace.activeModelId);
                        const resolvedId = resolved?.id;
                        if (resolvedId && resolvedId !== workspace.activeModelId) {
                            await window.workspaceConfig.saveWorkspace({ activeModelId: resolvedId });
                        }
                    }

                    // Init PostgreSQL sync manager
                    if (window.postgresSyncManager && typeof window.postgresSyncManager.init === 'function') {
                        window.postgresSyncManager.init();
                    }

                    // Load coin count in cloud DB (background, non-blocking)
                    await this.fetchDbStatus();

                    // Clear stale localStorage keys (old format)
                    localStorage.removeItem('activeCoinSetIds');
                    localStorage.removeItem('activeCoinSetCoinsData');

                    // Load coins per workspace (active set or default list)
                    await this.loadCoinsForActiveSet();

                    // Preload max coin sets (250 by market cap and by volume)
                    // Now done lazily (see preloadMaxCoinsData)
                    this.preloadMaxCoinsData();

                    // Safety sync cache → DB (background, non-blocking)
                    // Sends coins from local cache if newer than DB data
                    setTimeout(() => { this.syncCacheToDb(); }, 3000);

                    // Load table settings (after coin load)
                    await this.loadTableSettings();

                    // Initial metrics calculation
                    this.recalculateAllMetrics();

                    // Close coin sort dropdown on outside click
                    document.addEventListener('click', this.handleDocumentClick);

                    // Tab tooltips init automatically via Bootstrap from title attribute
                    // No manual init needed - Bootstrap Tab auto-creates tooltip
                } catch (error) {
                    console.error('Failed to load timezone/language in app-ui-root:', error);
                }
            },
            beforeUnmount() {
                // Remove click handler on unmount
                document.removeEventListener('click', this.handleDocumentClick);
                if (window.eventBus && this._cacheResetSubId) {
                    window.eventBus.off('cache-reset', this._cacheResetSubId);
                }
                if (window.eventBus && this._banSetUpdatedSubId) {
                    window.eventBus.off('ban-set-updated', this._banSetUpdatedSubId);
                }
            },
        });

        const appInstance = app.mount('#app');

        // Export Vue instance to window.appRoot for access from other modules
        window.appRoot = appInstance;

        // Init theme on load (if not applied in data())
        // Extra check if theme was changed before Vue mount
        try {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'dark') {
                document.body.setAttribute('data-bs-theme', 'dark');
            } else {
                document.body.removeAttribute('data-bs-theme');
            }
        } catch (e) {
            // Ignore errors
        }

        // Init app version CSS class on body
        // Used for version styling and cache-version binding
        try {
            if (window.appConfig) {
                const versionClass = window.appConfig.getVersionClass();
                document.body.classList.add(versionClass);
                console.log(`app-ui-root: версия приложения ${window.appConfig.CONFIG.version}, класс ${versionClass}`);
            }
        } catch (e) {
            console.error('app-ui-root: ошибка установки класса версии:', e);
        }

        // Clear old app version cache
        // Runs async, does not block init
        if (window.cacheManager && typeof window.cacheManager.clearOldVersions === 'function') {
            window.cacheManager.clearOldVersions().catch(error => {
                console.error('app-ui-root: ошибка очистки старых версий кэша:', error);
            });
        }

        // Tooltip init now in component mounted()
        // Removed duplicate call to avoid race condition

        // Init auto-markup of elements after Vue mount
        // Wait for Vue to mount all components
        setTimeout(() => {
            if (window.autoMarkup) {
                window.autoMarkup.init();
            }
        }, 200);
    }

    // Vue app init after all modules loaded
    // Module system calls this after successful load of all modules
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            // Wait for module load completion
            // Module system will call initVueApp via window.appInit
            window.appInit = initVueApp;
        });
    } else {
        // If DOM already loaded, set init function
        window.appInit = initVueApp;
    }
})();

