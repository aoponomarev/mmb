/**
 * Корневой компонент приложения
 *
 * ЦЕЛЬ: Инициализация Vue приложения и настройка корневого компонента
 * Skill: is/skills/arch-foundation
 *
 * ПРОБЛЕМА: Логика инициализации Vue раздувала index.html
 *
 * РЕШЕНИЕ: Вынос всей логики инициализации в отдельный модуль
 * - Компоненты загружаются через модульную систему (core/module-loader.js)
 * - Инициализация Vue приложения после загрузки всех модулей
 * - Настройка корневого компонента с данными и методами
 *
 * КАК ДОСТИГАЕТСЯ:
 * - Модульная система загружает все компоненты в правильном порядке
 * - После загрузки всех модулей создаётся Vue app через createApp()
 * - Компоненты регистрируются в app через components
 * - App монтируется на #app элемент
 *
 * ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ:
 * - Установка темы на body (data-bs-theme)
 * - Установка CSS-класса версии на body (app-version-{hash})
 * - Очистка кэша старых версий (clearOldVersions)
 * - Инициализация автоматической маркировки элементов (autoMarkup)
 *
 * ПРЕИМУЩЕСТВА:
 * - index.html остаётся компактным
 * - Логика инициализации изолирована
 * - Легко добавлять новые компоненты
 * - Централизованное управление данными приложения
 * - Автоматическое разрешение зависимостей через модульную систему
 *
 * ССЫЛКА: Модульная система описана в core/module-loader.js и core/modules-config.js
 */

(function() {
    'use strict';

    /**
     * Инициализирует Vue приложение
     * Вызывается после загрузки всех модулей через модульную систему
     */
    function initVueApp() {
        // Проверяем наличие Vue и компонентов
        if (typeof Vue === 'undefined') {
            console.error('app-ui-root: Vue.js не загружен');
            return;
        }

        // Базовые компоненты (всегда должны быть загружены)
        if (!window.cmpDropdownMenuItem || !window.cmpButton || !window.cmpDropdown || !window.cmpCombobox || !window.cmpButtonGroup || !window.appHeader || !window.appFooter || !window.cmpModal || !window.cmpModalButtons || !window.cmpTimezoneSelector || !window.modalExampleBody || !window.aiApiSettings || !window.timezoneModalBody || !window.cmpSystemMessage || !window.cmpSystemMessages) {
            console.error('app-ui-root: не все базовые компоненты загружены');
            console.log('Загруженные компоненты:', {
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

        // Проверка feature flags для условной загрузки компонентов
        const authEnabled = window.appConfig && window.appConfig.isFeatureEnabled('auth');
        const portfoliosEnabled = window.appConfig && window.appConfig.isFeatureEnabled('portfolios') && window.appConfig.isFeatureEnabled('cloudSync');

        // auth-button больше не используется в header, авторизация через модальное окно.

        if (portfoliosEnabled && !window.portfoliosManager) {
            console.warn('app-ui-root: portfolios-manager не загружен, хотя feature flags portfolios и cloudSync включены');
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
                // Условная регистрация компонентов авторизации и портфелей
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
                // Компоненты системных сообщений
                'cmp-system-message': window.cmpSystemMessage,
                'cmp-system-messages': window.cmpSystemMessages
            },
            data() {
                // Проверка feature flags
                const authEnabled = window.appConfig && window.appConfig.isFeatureEnabled('auth');
                const portfoliosEnabled = window.appConfig && window.appConfig.isFeatureEnabled('portfolios') && window.appConfig.isFeatureEnabled('cloudSync');

                // Синхронная инициализация темы (читаем напрямую из localStorage для избежания мерцания)
                let initialTheme = 'light';
                try {
                    const savedTheme = localStorage.getItem('theme');
                    if (savedTheme === 'dark' || savedTheme === 'light') {
                        initialTheme = savedTheme;
                    }
                } catch (e) {
                    // Игнорируем ошибки
                }

                // Применяем тему сразу при инициализации
                if (initialTheme === 'dark') {
                    document.body.setAttribute('data-bs-theme', 'dark');
                } else {
                    document.body.removeAttribute('data-bs-theme');
                }

                // Синхронная инициализация языка перевода (читаем напрямую из localStorage)
                // ВАЖНО: используем тот же источник, что и в mounted(), чтобы избежать рассинхронизации
                let initialLanguage = 'ru';
                try {
                    // Пробуем сначала cacheManager (если доступен синхронно), потом localStorage
                    if (window.cacheManager && typeof window.cacheManager.get === 'function') {
                        // cacheManager асинхронный, поэтому для синхронной инициализации используем localStorage
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
                    // Игнорируем ошибки
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
                // Миграция старых вкладок в новую вкладку "Результат"
                if (['max', 'min', 'balance-delta'].includes(defaultActiveTabId)) {
                    defaultActiveTabId = 'result';
                }
                const defaultActiveCoinSetIds = Array.isArray(defaultWorkspace.activeCoinSetIds) ? defaultWorkspace.activeCoinSetIds : [];

                return {
                    // Feature flags для условного отображения компонентов
                    isAuthEnabled: authEnabled,
                    isPortfoliosEnabled: portfoliosEnabled,
                    // Централизованное состояние авторизации (единый источник правды)
                    authState: window.authState ? window.authState.getState() : null,
                    // Конфигурация модальных окон (для доступа в шаблоне)
                    modalsConfig: window.modalsConfig || null,
                    // Состояние формирования портфеля
                    currentViewingPortfolio: null,
                    portfolioFormKey: 0,
                    userPortfolios: [],
                    // Конфигурация tooltips (для доступа в шаблоне)
                    tooltipsConfig: window.tooltipsConfig || null,
                    // Текущая тема приложения
                    currentTheme: initialTheme,
                    // Управление уровнем основного меню (0 - главное, 1 - матем. модели)
                    menuLevel: 0,
                    // Реактивные tooltips (обновляются при смене языка)
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
                    // Данные для dropdown
                    dropdownItems: [
                        { id: 1, name: 'Элемент 1', description: 'Описание элемента 1', icon: 'fas fa-home', labelShort: 'Эл. 1' },
                        { id: 2, name: 'Элемент 2', description: 'Описание элемента 2', icon: 'fas fa-user', labelShort: 'Эл. 2' },
                        { id: 3, name: 'Элемент 3', description: 'Описание элемента 3', icon: 'fas fa-cog', labelShort: 'Эл. 3' },
                        { id: 4, name: 'Элемент 4', description: 'Описание элемента 4', icon: 'fas fa-file', labelShort: 'Эл. 4' },
                        { id: 5, name: 'Элемент 5', description: 'Описание элемента 5', icon: 'fas fa-folder', labelShort: 'Эл. 5' }
                    ],
                    // Данные для режима select (отдельные переменные для каждого dropdown)
                    selectedDropdownItem1: null, // Только иконка
                    selectedDropdownItem2: null, // Иконка + полный текст
                    selectedDropdownItem3: null, // Иконка + укороченный текст
                    selectedDropdownItem4: null, // Только полный текст
                    selectedDropdownItem5: null, // Только value
                    selectedDropdownItem6: null, // Все вместе
                    longList: Array.from({ length: 50 }, (_, i) => ({
                        id: i + 1,
                        name: `Элемент ${i + 1}`,
                        description: `Описание элемента ${i + 1}`
                    })),
                    isMenuExpanded: false,
                    // Данные для combobox
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
                    // Таймзона
                    selectedTimezone: 'Europe/Moscow',
                    initialTimezone: 'Europe/Moscow', // Исходное значение таймзоны при открытии модального окна
                    selectedTranslationLanguage: 'ru',
                    initialTranslationLanguage: 'ru', // Исходное значение языка перевода при открытии модального окна
                    // Тестирование Yandex API
                    yandexTestQuery: '',
                    yandexTestInputQuery: '',
                    yandexTestResponse: '',
                    yandexTestLoading: false,
                    yandexTestError: '', // Используем пустую строку вместо null для лучшей реактивности Vue
                    // Тестирование Google-Cloudflare интеграции
                    testStep1Result: null,
                    testStep2Result: null,
                    testStep3Result: null,
                    testStep4Result: null,
                    testStep5Result: null,
                    testStep6Result: null,
                    // Тестирование системы сообщений
                    testMessagesStep1Result: null,
                    testMessagesStep2Result: null,
                    testMessagesStep3Result: null,
                    testMessagesStep4Result: null,
                    testMessagesStep5Result: null,
                    // DEBUG: Тестирование Data Provider
                    testLoading: false,
                    testError: null,
                    testResults: [],
                    // DEBUG: Тестирование Coin Sets
                    testCoinSets: [],
                    // Таблица монет (index.html)
                    coins: [],
                    coinsLoading: false,
                    coinsError: null,
                    headerActionHover: null, // Hover state for header action buttons (load/save, refresh, favorites)
                    coinsCacheCheckTimer: null, // Таймер проверки устаревания кэша топ-монет
                    selectedCoinIds: [], // Выбранные монеты (заглушка)
                    favoriteCoinIds: [], // ID монет в избранном (для реактивности)
                    favoriteCoinsMeta: [], // Полные данные избранных монет из favoritesManager (id, symbol)
                    favoriteActionHoverId: null, // ID монеты, по которой наведена иконка действия в списке избранного
                    coinsDataCache: new Map(), // Кэш данных монет (id -> coin data) для сохранения иконок после удаления из таблицы
                    horizonDays: Number.isFinite(Number(defaultMetrics.horizonDays)) && Number(defaultMetrics.horizonDays) > 0 ? Number(defaultMetrics.horizonDays) : 2, // Горизонт прогноза (дни) для расчета метрик
                    mdnHours: Number.isFinite(Number(defaultMetrics.mdnHours)) && Number(defaultMetrics.mdnHours) > 0 ? Number(defaultMetrics.mdnHours) : 4, // Горизонт MDN (часы)
                    mdnValue: null, // Текущий MDN (Market Direction Now) для выбранного горизонта
                    agrMethod: defaultMetrics.agrMethod || 'mp', // Способ расчета AGR (dcs, tsi, mp)
                    // Индикатор состояния облачной БД (PostgreSQL)
                    dbStatus: { count: null, loading: false, error: false },
                    // Данные для Info-box в хедере
                    infoBoxMedians: { cdh: 0, cgr: 0, agr: 0 },
                    infoBoxBreadth: { bullishPercent: 0, adRatio: '—' },
                    infoBoxDirection: { trend: 'Neutral' },
                    infoBoxPortfolio: { pl: 0, count: 0 },
                    activeTabId: defaultActiveTabId, // Активная вкладка отображения (%, Градиенты и т.д.)
                    displayTabs: [
                        { type: 'radio', id: 'percent', label: '%', labelShort: '%', active: defaultActiveTabId === 'percent' },
                        { type: 'radio', id: 'complex-deltas', label: 'Компл. дельты', labelShort: 'CD', active: defaultActiveTabId === 'complex-deltas' },
                        { type: 'radio', id: 'gradients', label: 'Градиенты', labelShort: 'GR', active: defaultActiveTabId === 'gradients' },
                        { type: 'radio', id: 'result', label: 'Результат', labelShort: 'RES', active: defaultActiveTabId === 'result' }
                    ],
                    activeModelId: defaultWorkspace.activeModelId || defaultModelId, // Текущая математическая модель
                    recommendedAgrMethod: null,
                    activeCoinSetIds: defaultActiveCoinSetIds, // ID монет из загруженного набора (пусто = дефолтный список, массив = активный набор)
                      // Конфигурация видимости колонок (для mixin columnVisibilityMixin)
                      columnVisibilityConfig: {
                        'percent': { hide: ['col-cd', 'col-cgr', 'col-max', 'col-min', 'col-balance', 'col-stability'] },
                        'complex-deltas': { hide: ['col-percent', 'col-cgr', 'col-max', 'col-min', 'col-balance', 'col-stability'] },
                        'gradients': { hide: ['col-percent', 'col-cd', 'col-max', 'col-min', 'col-balance', 'col-stability'] },
                        'result': { hide: ['col-percent', 'col-cd', 'col-cgr'] }
                      },
                      missingCoins: [], // Отсутствующие монеты при загрузке набора
                      currentIconEditingCoin: null, // Монета, иконка которой редактируется в данный момент
                      pendingCoinSetContext: null, // Контекст загружаемых наборов для последующей синхронизации
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
                    sortBy: null, // Текущее поле сортировки
                    sortOrder: null, // Текущий порядок сортировки (null | 'asc' | 'desc')
                    coinSortType: null, // Тип сортировки монет (alphabet, market_cap, total_volume, favorite, selected) - загружается из настроек таблицы
                    showCoinSortDropdown: false, // Показать дропдаун сортировки монет
                    showPriceColumn: true // Видимость колонки Price
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
                 * Кэш топ-монет устарел (для двухрежимного refresh)
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
                 * Тултип для кнопки обновления
                 */
                getRefreshTitle() {
                    const base = this.isCoinsCacheStale ? 'Обновить данные из API' : 'Данные актуальны';
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
                 * Проверка, выбраны ли все монеты (для чекбокса "выбрать все")
                 */
                allCoinsSelected() {
                    const visibleCoins = this.sortedCoins;
                    if (!visibleCoins || visibleCoins.length === 0) {
                        return false;
                    }
                    return this.selectedCoinIds.length === visibleCoins.length && visibleCoins.length > 0;
                },
                /**
                 * Количество выбранных монет (для счетчика)
                 */
                selectedCoinsCount() {
                    return this.selectedCoinIds.length;
                },
                /**
                 * Общее количество монет (для счетчика)
                 * Показывает количество видимых монет (из активного набора или дефолтного списка)
                 */
                totalCoinsCount() {
                    const visibleCoins = this.sortedCoins;
                    return visibleCoins ? visibleCoins.length : 0;
                },
                /**
                 * Процент выбранных монет (для круговой диаграммы)
                 */
                selectedCoinsPercentage() {
                    const visibleCoins = this.sortedCoins || [];
                    if (visibleCoins.length === 0) {
                        return 0;
                    }
                    return this.selectedCoinIds.length / visibleCoins.length;
                },
                /**
                 * Список избранных монет с полными данными (для дропдауна)
                 */
                favoriteCoinsList() {
                    if (!this.favoriteCoinsMeta || this.favoriteCoinsMeta.length === 0) {
                        return [];
                    }

                    // Используем coinsDataCache для получения полных данных (включая иконки)
                    // и sortedCoins для определения inTable (учитывает активные наборы)
                    const visibleCoinsMap = new Map((this.sortedCoins || []).map(coin => [coin.id, coin]));

                    return this.favoriteCoinsMeta.map(fav => {
                        // Сначала проверяем кэш, потом текущие монеты в таблице
                        let fullCoinData = this.coinsDataCache.get(fav.id);
                        if (!fullCoinData) {
                            const currentCoin = (this.coins || []).find(c => c.id === fav.id);
                            if (currentCoin) {
                                fullCoinData = currentCoin;
                                // Обновляем кэш
                                this.coinsDataCache.set(fav.id, currentCoin);
                            }
                        }
                        const isInVisibleTable = visibleCoinsMap.has(fav.id);

                        // Получаем оригинальный URL (из кэша или напрямую)
                        let coingeckoImageUrl = fullCoinData?.image;

                        // Если данных в кэше нет, пробуем получить их из window.coinsDataCache
                        if (!coingeckoImageUrl && window.coinsDataCache && window.coinsDataCache[fav.id]) {
                            coingeckoImageUrl = window.coinsDataCache[fav.id].image;
                        }

                        // Нормализуем URL (извлекаем строку, если это объект)
                        if (coingeckoImageUrl && typeof coingeckoImageUrl === 'object') {
                            coingeckoImageUrl = coingeckoImageUrl.large || coingeckoImageUrl.small || coingeckoImageUrl.thumb || null;
                        }

                        // Основной URL — это CDN, фолбек — оригинал Coingecko
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
                 * Отсортированный массив монет
                 */
                sortedCoins() {
                    if (!this.coins || this.coins.length === 0) {
                        return [];
                    }

                    // Фильтруем монеты: если активен набор - показываем только монеты из набора
                    let coinsToSort = this.coins;
                    if (this.activeCoinSetIds && Array.isArray(this.activeCoinSetIds) && this.activeCoinSetIds.length > 0) {
                        const activeSetIds = new Set(this.activeCoinSetIds);
                        coinsToSort = this.coins.filter(coin => activeSetIds.has(coin.id));
                    }

                    // ПРИОРИТЕТ: Сначала проверяем стандартную сортировку по колонкам (sortBy/sortOrder)
                    // Если она установлена - используем её, игнорируя coinSortType
                    if (this.sortBy && this.sortOrder) {
                        const sorted = [...coinsToSort].sort((a, b) => {
                            // Используем getCellValue для поддержки вложенных полей (например, metrics.cdWeighted.0)
                            const aVal = this.getCellValue(a, this.sortBy);
                            const bVal = this.getCellValue(b, this.sortBy);

                            // Обработка null/undefined
                            if (aVal == null && bVal == null) return 0;
                            if (aVal == null) return 1;
                            if (bVal == null) return -1;

                            // Числовое сравнение
                            if (typeof aVal === 'number' && typeof bVal === 'number') {
                                return this.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
                            }

                            // Строковое сравнение
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

                    // Если стандартная сортировка не установлена - используем сортировку по типу монет
                    if (this.coinSortType) {
                        return this.sortCoinsByType(coinsToSort);
                    }

                    // Если ничего не установлено - возвращаем исходный порядок
                    return coinsToSort;
                },
                /**
                 * Стиль для колонки Price в colgroup
                 */
                priceColumnStyle() {
                    return this.showPriceColumn ? '' : 'display: none;';
                },
                /**
                 * Пункты меню сортировки монет (из единого источника правды)
                 */
                coinSortMenuItems() {
                    if (!window.menusConfig) {
                        return [];
                    }
                    // Создаем реактивную зависимость от списка монет для работы condition
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
                    // Создаем реактивную зависимость от списка монет для работы condition
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
                        // Динамически заменяем заголовок кнопки "наверх" на название родительского раздела
                        return this.prepareSubMenu(items, 'math-models');
                    }
                    return window.menusConfig.getMainMenuItems();
                },
                menusConfig() {
                    return window.menusConfig || null;
                },
                /**
                 * Список модальных окон для автоматической регистрации
                 * Получается из modalsConfig с применением условий
                 */
                registeredModals() {
                    if (!window.modalsConfig || typeof window.modalsConfig.getRegisteredModals !== 'function') {
                        return [];
                    }
                    const modals = window.modalsConfig.getRegisteredModals();

                    // Обеспечиваем стабильность массива для v-for, чтобы избежать лишних перерисовок
                    const currentIds = modals.map(m => m.id).join(',');
                    if (this._lastModalIds === currentIds && this._lastModals) {
                        return this._lastModals;
                    }
                    this._lastModalIds = currentIds;
                    this._lastModals = modals;

                    return modals;
                },
                /**
                 * Алиасы для удобного доступа к централизованному состоянию авторизации
                 */
                isAuthenticated() {
                    return this.authState ? this.authState.isAuthenticated : false;
                },
                user() {
                    return this.authState ? this.authState.user : null;
                },
                /**
                 * Проверка наличия глобальных системных сообщений для отображения сплэша
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
                // Реактивное обновление tooltips при изменении языка
                currentTranslationLanguage: {
                    async handler(newLanguage, oldLanguage) {
                        if (newLanguage && newLanguage !== oldLanguage) {
                            // Обновляем tooltips для нового языка
                            if (window.tooltipsConfig && typeof window.tooltipsConfig.init === 'function') {
                                try {
                                    // Если уже идет инициализация этого языка, не запускаем повторно
                                    if (this._tooltipsInitializing === newLanguage) return;
                                    this._tooltipsInitializing = newLanguage;

                                    await window.tooltipsConfig.init(newLanguage);

                                    this._tooltipsInitializing = null;

                                    // Обновляем реактивные tooltips после инициализации
                                    this.updateTooltips();
                                } catch (error) {
                                    this._tooltipsInitializing = null;
                                    console.error('app-ui-root: ошибка обновления tooltips при смене языка (watch):', error);
                                }
                            }
                        }
                    },
                    immediate: false
                },
                // Watcher для синхронизации активной модели (E.1)
                activeModelId: {
                    handler(newId) {
                        if (window.modelManager) {
                            window.modelManager.setActiveModel(newId);
                            this.recalculateAllMetrics();
                        }
                    },
                    immediate: true
                },
                // Реактивное обновление индикатора монет в БД при изменении таблицы
                coins: {
                    handler(newCoins) {
                        if (!Array.isArray(newCoins) || newCoins.length === 0) return;
                        // Обновляем только если данные пришли из PostgreSQL
                        const hasDbSource = newCoins.some(c => c._source === 'yandex-cache');
                        if (!hasDbSource) return;
                        // Дебаунс: не чаще раза в 10 секунд
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
                    immediate: false // Убираем immediate, чтобы избежать мелькания при инициализации
                },
                // Watcher для отслеживания успешной авторизации через изменение testStep4Result
                'testStep4Result.isAuthenticated': {
                    handler(newVal, oldVal) {
                        // Если пользователь успешно авторизован, но testStep5Result еще не обновлен через handleAuthLogin
                        if (newVal === true && oldVal === false && this.testStep4Result && this.testStep4Result.userData) {
                            // Обновляем testStep5Result для отображения успешной авторизации
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
                 * Отслеживание изменения активной вкладки для видимости колонок
                 */
                activeTabId() {
                    // Trigger re-render when activeTabId changes
                },
                /**
                 * Пересчитывать метрики при изменении горизонта прогноза
                 */
                horizonDays() {
                    this.recalculateAllMetrics();
                },
                /**
                 * Пересчитывать метрики при изменении MDN горизонта
                 */
                mdnHours() {
                    this.recalculateAllMetrics();
                },
                /**
                 * Пересчитывать метрики при изменении метода AGR
                 */
                agrMethod() {
                    this.recalculateAllMetrics();
                },
                /**
                 * Обновлять количество выбранных монет в инфо-боксе при изменении выделения
                 */
                selectedCoinIds: {
                    handler() {
                        if (this.infoBoxPortfolio) {
                            // Находим выбранные монеты для расчета L/S сегментов (D.2)
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
                 * Пересчитывать метрики при изменении активной вкладки (некоторые метрики могут зависеть от контекста)
                 */
                activeTabId() {
                    // Можно добавить специфичную логику для вкладок, если нужно
                    this.recalculateAllMetrics();
                }
            },
            methods: {
                /**
                 * Обработчик клика по пункту меню
                 * Вызывает соответствующий метод из конфигурации меню
                 * @param {Object} item - Пункт меню из конфигурации
                 */
                handleMenuClick(item) {
                    if (!item || !item.handler) {
                        // Fallback для пунктов без обработчика
                        this.handleClick();
                        return;
                    }

                    // Вызываем метод по имени из конфигурации
                    if (typeof this[item.handler] === 'function') {
                        // Если есть параметры (например, portfolioId), передаем их
                        if (item.params !== undefined) {
                            this[item.handler](item.params);
                        } else {
                        this[item.handler]();
                        }
                    } else {
                        console.warn(`app-ui-root: метод "${item.handler}" не найден для пункта меню "${item.id}"`);
                        // Fallback
                        this.handleClick();
                    }
                },
                /**
                 * Подготовка подменю (замена заголовка кнопки "наверх")
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
                 * Обновить реактивные tooltips из tooltipsConfig
                 * Вызывается при инициализации и смене языка
                 */
                updateTooltips() {
                    if (!window.tooltipsConfig || typeof window.tooltipsConfig.getTooltip !== 'function') {
                        return;
                    }

                    // Синхронизируем currentTranslationLanguage с currentLanguage из tooltipsConfig
                    if (typeof window.tooltipsConfig.getCurrentLanguage === 'function') {
                        const tooltipsLanguage = window.tooltipsConfig.getCurrentLanguage();
                        if (tooltipsLanguage && tooltipsLanguage !== this.currentTranslationLanguage) {
                            this.currentTranslationLanguage = tooltipsLanguage;
                        }
                    }

                    // Обновляем все tooltips из конфига
                    const keys = Object.keys(this.tooltips);
                    keys.forEach(key => {
                        const value = window.tooltipsConfig.getTooltip(key);
                        this.tooltips[key] = value || '';
                    });
                },
                /**
                 * Получить tooltip для метрики (для заголовков таблицы)
                 * @param {string} metricKey - ключ метрики ('agr', 'din', 'cdh', и т.д.)
                 * @returns {string} - текст tooltip
                 */
                getMetricTooltip(metricKey) {
                    if (!window.tooltipInterpreter) return '';
                    const lang = this.currentTranslationLanguage || 'ru';
                    return window.tooltipInterpreter.getTooltip(metricKey, { lang });
                },
                async toggleTheme() {
                    // Переключаем тему
                    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';

                    // Сохраняем через cacheManager (асинхронно)
                    if (window.cacheManager) {
                        await window.cacheManager.set('theme', this.currentTheme);
                    } else {
                        // Fallback на прямое localStorage, если cacheManager ещё не загружен
                        localStorage.setItem('theme', this.currentTheme);
                    }

                    // Применяем тему к body через data-bs-theme (Bootstrap 5)
                    if (this.currentTheme === 'dark') {
                        document.body.setAttribute('data-bs-theme', 'dark');
                    } else {
                        document.body.removeAttribute('data-bs-theme');
                    }
                },
                handleClick(event) {
                },
                /**
                 * Переключение на меню математических моделей (уровень 1)
                 */
                switchToMathModelsMenu() {
                    this.menuLevel = 1;
                },
                /**
                 * Переключение на основное меню (уровень 0)
                 */
                switchToMainMenu() {
                    this.menuLevel = 0;
                },
                /**
                 * Переключение на меню портфелей (D.6)
                 */
                /**
                 * Обработка выбора модели Медиана 26.01.01
                 */
                handleMedian260101Click() {
                    console.log('app-ui-root: выбрана модель Медиана 26.01.01');
                    this.activeModelId = 'Median/AIR/260101';
                    // Закрываем меню после выбора конечного действия (по умолчанию закроется само через autoCloseParent=true)
                },
                /**
                 * Обработка выбора модели Медиана 26.01.15 (в разработке)
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
                                console.error('app-ui-root: ошибка импорта портфелей', error);
                            }
                        };
                        reader.readAsText(file);
                    });
                    input.click();
                },
                /**
                 * Обработчик переключения вкладок отображения
                 * @param {Object} data - Данные от компонента cmp-button-group
                 */
                handleTabToggle({ button, index, active }) {
                    if (active) {
                        this.activeTabId = button.id;

                        // Обновляем состояние active в массиве displayTabs для реактивности (если нужно)
                        this.displayTabs.forEach(tab => {
                            tab.active = (tab.id === button.id);
                        });
                        this.saveTableSettings();
                    }
                },
                /**
                 * Обработчик изменения горизонта прогнозирования (дни) из combobox
                 * @param {string|number} value - Новое значение горизонта
                 */
                handleHorizonChange(value) {
                    let num = Number(value);
                    if (Number.isFinite(num)) {
                        // Ограничиваем диапазон от 1 до 90 дней
                        num = Math.max(1, Math.min(90, Math.floor(num)));
                        this.horizonDays = num;
                        this.saveTableSettings();
                    } else {
                        console.warn('app-ui-root: некорректный horizonDays', value);
                    }
                },
                /**
                 * Обработчик переключения mdnHours (радиокнопки)
                 * @param {number} hours - Новое значение горизонта MDN (часы)
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
                 * Обработчик изменения метода расчета AGR
                 * @param {string} method - dcs | tsi | mp
                 */
                handleAgrMethodChange(method) {
                    if (['dcs', 'tsi', 'mp'].includes(method)) {
                        this.agrMethod = method;
                        this.saveTableSettings();
                    }
                },
                /**
                 * Обработчик открытия модального окна формирования портфеля (D.2)
                 */
                handleCreatePortfolio() {
                    this.currentViewingPortfolio = null; // Сбрасываем, чтобы не зайти в режим редактирования
                    this.portfolioFormKey++;
                    if (this.$refs.portfolioFormModal) {
                        this.$refs.portfolioFormModal.show();
                    }
                },
                /**
                 * Просмотр существующего портфеля (D.6)
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
                 * Переход в режим ребалансировки (D.4)
                 */
                handleRebalancePortfolio(portfolio) {
                    console.log('app-ui-root: ребалансировка портфеля', portfolio.id);

                    // Ensure rebalance opens form with prepared/normalized portfolio snapshot.
                    this.currentViewingPortfolio = portfolio;

                    // 1. Закрываем окно просмотра
                    if (this.$refs.portfolioViewModal) {
                        this.$refs.portfolioViewModal.hide();
                    }

                    // 2. Открываем окно формирования в режиме редактирования
                    this.portfolioFormKey++; // Сбрасываем компонент
                    this.$nextTick(() => {
                        if (this.$refs.portfolioFormModal) {
                            this.$refs.portfolioFormModal.show();
                        }
                    });
                },
                /**
                 * Сохранение сформированного портфеля
                 */
                async handleSaveCreatedPortfolio(portfolio) {
                    console.log('app-ui-root: сохранение портфеля', portfolio);
                    const existingIndex = this.userPortfolios.findIndex(p => p.id === portfolio.id);
                    const previousPortfolio = existingIndex !== -1 ? this.userPortfolios[existingIndex] : null;

                    // 1. Сначала закрываем окно формирования (D.3)
                    if (this.$refs.portfolioFormModal) {
                        this.$refs.portfolioFormModal.hide();
                    }

                    // 2. Сохраняем/обновляем в локальном хранилище (D.4, D.5)
                    if (existingIndex !== -1) {
                        // Обновляем существующий (D.4)
                        this.userPortfolios.splice(existingIndex, 1, portfolio);
                    } else {
                        // Добавляем новый (D.2)
                        this.userPortfolios.unshift(portfolio);
                    }
                    window.portfolioConfig.saveLocalPortfolios(this.userPortfolios);

                    // 2.5 Cloudflare - primary online persistence (best effort).
                    await this.syncPortfolioToCloudflare(portfolio, previousPortfolio);

                    // 2.6 PostgreSQL - optional secondary sync (best effort).
                    if (window.postgresSyncManager) {
                        window.postgresSyncManager.savePortfolio(portfolio).catch(err => {
                            console.warn('app-ui-root: фоновая синхронизация портфеля не удалась', err);
                        });
                    }

                    // 3. Устанавливаем текущий портфель для просмотра
                    this.currentViewingPortfolio = portfolio;

                    // 4. Показ сообщения
                    if (window.messagesStore) {
                        window.messagesStore.addMessage({
                            type: 'success',
                            text: existingIndex !== -1 ? `Портфель "${portfolio.name}" обновлен` : `Портфель "${portfolio.name}" создан`,
                            duration: 3000
                        });
                    }

                    // 5. Открываем окно просмотра (обновленное)
                    this.$nextTick(() => {
                        if (this.$refs.portfolioViewModal) {
                            this.$refs.portfolioViewModal.show();
                        }
                    });

                    // Эмит события
                    if (window.eventBus) {
                        window.eventBus.emit('portfolio-saved', portfolio);
                    }
                },
                /**
                 * Удаление портфеля
                 */
                async handleDeletePortfolio(portfolioId) {
                    console.log('app-ui-root: удаление портфеля', portfolioId);
                    const removed = this.userPortfolios.find(p => p.id === portfolioId) || null;

                    // 1. Удаляем из локального списка (D.5)
                    this.userPortfolios = this.userPortfolios.filter(p => p.id !== portfolioId);
                    window.portfolioConfig.saveLocalPortfolios(this.userPortfolios);

                    // 1.5 Пытаемся удалить online-запись в Cloudflare (если была привязка).
                    if (removed?.cloudflareId && window.portfoliosClient?.deletePortfolio) {
                        try {
                            await window.portfoliosClient.deletePortfolio(removed.cloudflareId);
                        } catch (error) {
                            console.warn('app-ui-root: удаление Cloudflare-портфеля не удалось', error);
                        }
                    }

                    // 2. Очищаем текущий просмотр если нужно
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
                 * Синхронизация портфеля в Cloudflare (primary online persistence).
                 * Не прерывает UX при недоступной сети/Auth.
                 */
                async syncPortfolioToCloudflare(portfolio, previousPortfolio) {
                    if (!window.portfoliosClient || !window.authClient) return;
                    const cloudSyncEnabled = window.appConfig?.isFeatureEnabled?.('cloudSync') !== false;
                    if (!cloudSyncEnabled) return;

                    let authenticated = false;
                    try {
                        authenticated = await window.authClient.isAuthenticated();
                    } catch (error) {
                        console.warn('app-ui-root: не удалось проверить auth для Cloudflare sync', error);
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
                 * Обработка успешного входа через Google OAuth
                 * @param {Object} tokenData - Данные токена и пользователя
                 */
                handleAuthLogin(tokenData) {
                    console.log('app-ui-root: пользователь успешно авторизован', tokenData);

                    // Обновляем testStep5Result для отображения успешной авторизации на тестовой карточке
                    if (tokenData && tokenData.access_token) {
                        const userEmail = tokenData.user?.email || 'неизвестен';
                        const userName = tokenData.user?.name || userEmail;
                        this.testStep5Result = {
                            success: true,
                            message: `✓ Авторизация успешна! Пользователь ${userName} (${userEmail}) авторизован. Токен сохранен.`
                        };

                        // Автоматически обновляем testStep4Result, чтобы отобразить информацию о пользователе
                        this.$nextTick(async () => {
                            await this.testStep4_CheckAuthStatus();
                        });
                    }

                    // Можно добавить дополнительную логику при входе
                    // Например, загрузку портфелей пользователя
                },
                /**
                 * Обработка выхода из системы
                 */
                handleAuthLogout() {
                    console.log('app-ui-root: пользователь вышел из системы');
                    // Можно добавить дополнительную логику при выходе
                    // Например, очистку данных пользователя
                },
                /**
                 * Выход из системы для тестовой кнопки Шаг 5
                 */
                async testStep5_Logout() {
                    if (!window.authClient) {
                        this.testStep5Result = {
                            success: false,
                            message: '✗ auth-client не загружен'
                        };
                        return;
                    }
                    try {
                        await window.authClient.logout();
                        this.testStep5Result = {
                            success: true,
                            message: '✓ Выход выполнен успешно. Страница будет перезагружена.'
                        };
                        // Обновляем статус авторизации
                        await this.testStep4_CheckAuthStatus();
                    } catch (error) {
                        this.testStep5Result = {
                            success: false,
                            message: `✗ Ошибка выхода: ${error.message}`
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
                 * Тестирование Yandex API: отправка запроса (из поля ввода или случайный)
                 */
                async testYandexAPI(useRandom = false) {
                    if (!window.aiProviderManager) {
                        this.yandexTestError = 'AI Provider Manager не загружен';
                        return;
                    }

                    let query = '';

                    if (useRandom || !this.yandexTestInputQuery.trim()) {
                        // Список случайных запросов для тестирования
                        const randomQueries = [
                            'Что такое искусственный интеллект?',
                            'Расскажи про криптовалюты',
                            'Какая погода сегодня?',
                            'Что такое блокчейн?',
                            'Объясни квантовую физику простыми словами',
                            'Какие преимущества у Vue.js?',
                            'Что такое машинное обучение?',
                            'Расскажи про историю программирования',
                            'Какие есть типы данных в JavaScript?',
                            'Что такое REST API?'
                        ];
                        query = randomQueries[Math.floor(Math.random() * randomQueries.length)];
                    } else {
                        query = this.yandexTestInputQuery.trim();
                    }

                    this.yandexTestQuery = query;
                    this.yandexTestResponse = '';
                    this.yandexTestError = ''; // Используем пустую строку вместо null
                    this.yandexTestLoading = true;

                    try {
                        const providerName = await window.aiProviderManager.getCurrentProviderName();
                        const apiKey = await window.aiProviderManager.getApiKey(providerName);

                        if (!apiKey) {
                            throw new Error(`API ключ для ${providerName} не настроен. Откройте настройки "API-ключи" для настройки.`);
                        }

                        const model = await window.aiProviderManager.getModel(providerName);

                        // Отправляем запрос через aiProviderManager
                        const response = await window.aiProviderManager.sendRequest(
                            [{ role: 'user', content: query }]
                        );

                        this.yandexTestResponse = response;
                    } catch (error) {
                        console.error('testYandexAPI: ошибка запроса:', error);
                        const errorMessage = error.message || 'Неизвестная ошибка';
                        // Используем Vue.nextTick для гарантии обновления DOM
                        this.$nextTick(() => {
                            this.yandexTestError = errorMessage;
                        });
                        this.yandexTestResponse = '';
                    } finally {
                        this.yandexTestLoading = false;
                    }
                },
                customFilterFunction(items, query) {
                    // Кастомная фильтрация: ищем по label и value
                    const lowerQuery = query.toLowerCase();
                    return items.filter(item => {
                        const label = (item.label || '').toLowerCase();
                        const value = (item.value || '').toLowerCase();
                        return label.includes(lowerQuery) || value.includes(lowerQuery);
                    });
                },
                handleButtonGroupClick(event, data) {
                    console.log('Button click:', data);
                    // Здесь можно добавить логику обработки клика по кнопке в группе
                },
                openExampleModalNew() {
                    if (this.$refs.exampleModalNew) {
                        this.$refs.exampleModalNew.show();
                    }
                },
                async openTimezoneModal() {
                    // Загружаем текущую таймзону и язык перевода из кэша
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
                    // Если таймзона или язык изменены - восстанавливаем исходные значения
                    if (this.selectedTimezone !== this.initialTimezone ||
                        this.selectedTranslationLanguage !== this.initialTranslationLanguage) {
                        this.selectedTimezone = this.initialTimezone;
                        this.selectedTranslationLanguage = this.initialTranslationLanguage;
                    } else {
                        // Если ничего не изменено - закрываем модальное окно
                        if (this.$refs.timezoneModal) {
                            this.$refs.timezoneModal.hide();
                        }
                    }
                },
                async saveTimezone(timezone, translationLanguage) {
                    try {
                        const timezoneToSave = timezone || this.selectedTimezone;
                        const languageToSave = translationLanguage || this.selectedTranslationLanguage;

                        if (window.cacheManager) {
                            await window.cacheManager.set('timezone', timezoneToSave);
                            await window.cacheManager.set('translation-language', languageToSave);
                        } else {
                            localStorage.setItem('timezone', timezoneToSave);
                            localStorage.setItem('translation-language', languageToSave);
                        }

                        // Обновляем исходные значения
                        this.selectedTimezone = timezoneToSave;
                        this.initialTimezone = timezoneToSave;
                        this.selectedTranslationLanguage = languageToSave;
                        this.initialTranslationLanguage = languageToSave;
                        this.currentTranslationLanguage = languageToSave;

                        // Обновляем таймзону в футере
                        if (this.$refs.appFooter) {
                            await this.$refs.appFooter.saveTimezone(timezoneToSave);
                            // Обновляем язык перевода в футере
                            if (this.$refs.appFooter.updateTranslationLanguage) {
                                this.$refs.appFooter.updateTranslationLanguage(languageToSave);
                            }
                        }

                        // Обновляем tooltips для нового языка
                        if (window.tooltipsConfig && typeof window.tooltipsConfig.init === 'function') {
                            try {
                                await window.tooltipsConfig.init(languageToSave);
                                // Обновляем реактивные tooltips после инициализации
                                this.updateTooltips();
                            } catch (error) {
                                console.error('app-ui-root: ошибка обновления tooltips при смене языка:', error);
                            }
                        }

                        // Обновляем переводы сообщений
                        if (window.messagesTranslator && typeof window.messagesTranslator.updateLanguage === 'function') {
                            try {
                                await window.messagesTranslator.updateLanguage(languageToSave);
                            } catch (error) {
                                console.error('app-ui-root: ошибка обновления переводов сообщений:', error);
                            }
                        }

                        // Модальное окно закрывается через крестик или клик вне модального окна
                        // Кнопка "Сохранить" не должна закрывать модальное окно
                    } catch (error) {
                        console.error('Failed to save timezone/language:', error);
                    }
                },
                openAiApiModal() {
                    // Поддержка как массива (v-for), так и одиночного ref
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
                    // Поддержка как массива (v-for), так и одиночного ref
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
                    // Поддержка как массива (v-for), так и одиночного ref
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
                    // Поддержка как массива (v-for), так и одиночного ref
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
                    // Состояние обновляется автоматически через централизованное хранилище auth-state
                    // Не требуется ручное обновление this.isAuthenticated и this.user
                },
                handleAuthLogoutSuccess() {
                    console.log('app-ui-root: успешный выход');
                    // Состояние обновляется автоматически через централизованное хранилище auth-state
                    // Не требуется ручное обновление this.isAuthenticated и this.user
                },
                /**
                 * Обработка создания портфеля
                 * @param {Object} portfolio - Созданный портфель
                 */
                handlePortfolioCreated(portfolio) {
                    console.log('app-ui-root: портфель создан', portfolio);
                    // Можно добавить дополнительную логику при создании портфеля
                },
                /**
                 * Обработка обновления портфеля
                 * @param {Object} portfolio - Обновлённый портфель
                 */
                handlePortfolioUpdated(portfolio) {
                    console.log('app-ui-root: портфель обновлён', portfolio);
                    // Можно добавить дополнительную логику при обновлении портфеля
                },
                /**
                 * Обработка удаления портфеля
                 * @param {string|number} portfolioId - ID удалённого портфеля
                 */
                handlePortfolioDeleted(portfolioId) {
                    console.log('app-ui-root: портфель удалён', portfolioId);
                    // Можно добавить дополнительную логику при удалении портфеля
                },

                /**
                 * Шаг 1: Проверка загрузки модулей
                 */
                testStep1_CheckModules() {
                    const checks = [];
                    if (window.authClient) checks.push('✓ auth-client загружен');
                    else checks.push('✗ auth-client НЕ загружен');
                    if (window.portfoliosClient) checks.push('✓ portfolios-client загружен');
                    else checks.push('✗ portfolios-client НЕ загружен');
                    if (window.portfoliosManager) checks.push('✓ portfolios-manager загружен');
                    else checks.push('✗ portfolios-manager НЕ загружен');

                    const allLoaded = window.authClient && window.portfoliosClient && window.portfoliosManager;
                    this.testStep1Result = {
                        success: allLoaded,
                        message: checks.join(' | ')
                    };
                },

                /**
                 * Шаг 2: Проверка feature flags
                 */
                testStep2_CheckFeatureFlags() {
                    if (!window.appConfig) {
                        this.testStep2Result = {
                            success: false,
                            message: '✗ appConfig не загружен'
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
                 * Шаг 3: Проверка компонента auth-modal-body (авторизация через модальное окно)
                 */
                testStep3_CheckAuthButton() {
                    if (!window.authModalBody) {
                        this.testStep3Result = {
                            success: false,
                            hasAuthButton: false,
                            message: '✗ auth-modal-body не загружен. Проверьте консоль на наличие ошибок загрузки модулей.'
                        };
                        return;
                    }
                    if (!window.authClient) {
                        this.testStep3Result = {
                            success: false,
                            hasAuthButton: true,
                            message: '⚠ auth-modal-body загружен, но auth-client отсутствует'
                        };
                        return;
                    }
                    this.testStep3Result = {
                        success: true,
                        hasAuthButton: true,
                        message: '✓ auth-modal-body загружен и доступен. Авторизация доступна через модальное окно.'
                    };
                },

                /**
                 * Шаг 4: Проверка состояния авторизации
                 */
                async testStep4_CheckAuthStatus() {
                    if (!window.authClient) {
                        this.testStep4Result = {
                            success: false,
                            message: '✗ auth-client не загружен'
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
                 * Шаг 5: Инициация входа через Google
                 */
                testStep5_InitiateLogin() {
                    if (!window.authClient) {
                        this.testStep5Result = {
                            success: false,
                            message: '✗ auth-client не загружен'
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
                 * Шаг 6: Проверка компонента portfolios-manager
                 */
                testStep6_CheckPortfoliosManager() {
                    if (!window.portfoliosManager) {
                        this.testStep6Result = {
                            success: false,
                            message: '✗ portfolios-manager не загружен. Проверьте консоль на наличие ошибок загрузки модулей.'
                        };
                        return;
                    }
                    if (!window.portfoliosClient) {
                        this.testStep6Result = {
                            success: false,
                            message: '⚠ portfolios-manager загружен, но portfolios-client отсутствует'
                        };
                        return;
                    }
                    if (!this.isPortfoliosEnabled) {
                        this.testStep6Result = {
                            success: false,
                            message: '⚠ portfolios-manager загружен, но feature flags не включены или пользователь не авторизован'
                        };
                        return;
                    }
                    this.testStep6Result = {
                        success: true,
                        message: '✓ portfolios-manager загружен и доступен. Компонент должен отображаться ниже.'
                    };
                },

                /**
                 * Показать все сообщения в потоке (сплэш снизу)
                 */
                showMessagesInStream() {
                    if (!window.AppMessages || !window.messagesConfig) {
                        console.error('app-ui-root: AppMessages или messagesConfig не загружен');
                        return;
                    }

                    // Очищаем предыдущие глобальные сообщения
                    window.AppMessages.clear('global');

                    // Danger сообщение
                    const dangerMsg = window.messagesConfig.getMessage('error.api.network');
                    window.AppMessages.push({
                        text: dangerMsg.text,
                        details: dangerMsg.details,
                        type: dangerMsg.type || 'danger',
                        priority: dangerMsg.priority || 4,
                        key: 'error.api.network', // Сохраняем ключ для последующего перевода
                        scope: 'global'
                    });

                    // Warning сообщение (используем короткий ключ e.rate с параметрами)
                    // Используем числа вместо текста для универсальности
                    const warningParams = { time: '3 min' };
                    const warningMsg = window.messagesConfig.get('e.rate', warningParams);
                    window.AppMessages.push({
                        text: warningMsg.text,
                        details: warningMsg.details,
                        type: warningMsg.type,
                        key: warningMsg.key,
                        params: warningParams, // Сохраняем параметры для последующего перевода
                        scope: 'global'
                    });

                    // Info сообщение (используем короткий ключ i.switch с параметрами)
                    const infoParams = { provider: 'Perplexity AI', previous: 'OpenAI' };
                    const infoMsg = window.messagesConfig.get('i.switch', infoParams);
                    window.AppMessages.push({
                        text: infoMsg.text,
                        details: infoMsg.details,
                        type: infoMsg.type,
                        key: infoMsg.key,
                        params: infoParams, // Сохраняем параметры для последующего перевода
                        scope: 'global'
                    });

                    // Success сообщение
                    const successMsg = window.messagesConfig.getMessage('health.proxy.restored');
                    window.AppMessages.push({
                        text: successMsg.text,
                        details: successMsg.details,
                        type: successMsg.type || 'success',
                        priority: successMsg.priority || 1,
                        key: 'health.proxy.restored', // Сохраняем ключ для последующего перевода
                        scope: 'global'
                    });
                },

                /**
                 * Тестирование шага 1: Проверка Worker endpoint
                 */
                async testMessagesStep1_Version() {
                    this.testMessagesStep1Result = null;
                    try {
                        if (!window.messagesApi) {
                            this.testMessagesStep1Result = {
                                success: false,
                                message: '✗ messagesApi не загружен'
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
                            message: `✗ Ошибка: ${error.message}`
                        };
                    }
                },
                async testMessagesStep1_ListModules() {
                    this.testMessagesStep1Result = null;
                    try {
                        if (!window.messagesApi) {
                            this.testMessagesStep1Result = {
                                success: false,
                                message: '✗ messagesApi не загружен'
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
                            message: `✗ Ошибка: ${error.message}`
                        };
                    }
                },

                /**
                 * Тестирование шага 2: Загрузка модулей из KV
                 */
                async testMessagesStep2_LoadModule(module) {
                    this.testMessagesStep2Result = null;
                    try {
                        if (!window.messagesApi) {
                            this.testMessagesStep2Result = {
                                success: false,
                                message: '✗ messagesApi не загружен'
                            };
                            return;
                        }
                        const data = await window.messagesApi.loadModule(module);
                        if (data) {
                            const messageCount = data.messages ? Object.keys(data.messages).length : 0;
                            const source = data.version ? 'KV' : 'fallback (хардкод)';
                            this.testMessagesStep2Result = {
                                success: true,
                                message: `✓ Модуль "${module}" загружен из ${source}. Сообщений: ${messageCount}`
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
                            message: `✗ Ошибка: ${error.message}`
                        };
                    }
                },
                async testMessagesStep2_LoadAllModules() {
                    this.testMessagesStep2Result = null;
                    try {
                        if (!window.messagesApi) {
                            this.testMessagesStep2Result = {
                                success: false,
                                message: '✗ messagesApi не загружен'
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
                            message: `✓ Загружено модулей: ${moduleNames.length} (${moduleNames.join(', ')}). Всего сообщений: ${totalMessages}`
                        };
                    } catch (error) {
                        this.testMessagesStep2Result = {
                            success: false,
                            message: `✗ Ошибка: ${error.message}`
                        };
                    }
                },

                /**
                 * Тестирование шага 3: Интеграция с messages-config
                 */
                async testMessagesStep3_InitConfig() {
                    this.testMessagesStep3Result = null;
                    try {
                        if (!window.messagesConfig) {
                            this.testMessagesStep3Result = {
                                success: false,
                                message: '✗ messagesConfig не загружен'
                            };
                            return;
                        }
                        const messageCount = window.messagesConfig.MESSAGES ? Object.keys(window.messagesConfig.MESSAGES).length : 0;
                        this.testMessagesStep3Result = {
                            success: true,
                            message: `✓ messages-config инициализирован. Сообщений: ${messageCount}`
                        };
                    } catch (error) {
                        this.testMessagesStep3Result = {
                            success: false,
                            message: `✗ Ошибка: ${error.message}`
                        };
                    }
                },
                testMessagesStep3_GetMessage() {
                    this.testMessagesStep3Result = null;
                    try {
                        if (!window.messagesConfig) {
                            this.testMessagesStep3Result = {
                                success: false,
                                message: '✗ messagesConfig не загружен'
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
                            message: `✗ Ошибка: ${error.message}`
                        };
                    }
                },
                testMessagesStep3_TestActions() {
                    this.testMessagesStep3Result = null;
                    try {
                        if (!window.messagesConfig) {
                            this.testMessagesStep3Result = {
                                success: false,
                                message: '✗ messagesConfig не загружен'
                            };
                            return;
                        }
                        const openSettingsAction = window.messagesConfig.getAction('open-settings');
                        const openAiSettingsAction = window.messagesConfig.getAction('open-ai-settings');

                        if (openSettingsAction && openSettingsAction.handler && openAiSettingsAction && openAiSettingsAction.handler) {
                            this.testMessagesStep3Result = {
                                success: true,
                                message: '✓ Действия настроены. Нажмите кнопки ниже для проверки открытия модальных окон.'
                            };
                        } else {
                            this.testMessagesStep3Result = {
                                success: false,
                                message: '✗ Действия не настроены или handlers отсутствуют'
                            };
                        }
                    } catch (error) {
                        this.testMessagesStep3Result = {
                            success: false,
                            message: `✗ Ошибка: ${error.message}`
                        };
                    }
                },
                testMessagesStep3_OpenSettings() {
                    try {
                        const action = window.messagesConfig.getAction('open-settings');
                        if (action && action.handler) {
                            action.handler();
                            // Сообщение показывается через модальное окно, результат не проверяем
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
                            // Сообщение показывается через модальное окно, результат не проверяем
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
                 * Тестирование шага 4: Миграции и версионирование
                 */
                async testMessagesStep4_CheckVersion() {
                    this.testMessagesStep4Result = null;
                    try {
                        if (!window.messagesApi) {
                            this.testMessagesStep4Result = {
                                success: false,
                                message: '✗ messagesApi не загружен'
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
                            message: `✗ Ошибка: ${error.message}`
                        };
                    }
                },
                async testMessagesStep4_TestMigration() {
                    this.testMessagesStep4Result = null;
                    try {
                        if (!window.messagesMigrations) {
                            this.testMessagesStep4Result = {
                                success: false,
                                message: '✗ messagesMigrations не загружен'
                            };
                            return;
                        }
                        // Тест миграции с версии 1 на версию 1 (должна вернуть данные без изменений)
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
                            message: `✗ Ошибка: ${error.message}`
                        };
                    }
                },

                /**
                 * Тестирование шага 5: Модульная структура
                 */
                async testMessagesStep5_ShowModules() {
                    this.testMessagesStep5Result = null;
                    try {
                        if (!window.messagesApi) {
                            this.testMessagesStep5Result = {
                                success: false,
                                message: '✗ messagesApi не загружен'
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
                            message: `✗ Ошибка: ${error.message}`
                        };
                    }
                },
                async testMessagesStep5_LoadSpecificModule() {
                    this.testMessagesStep5Result = null;
                    try {
                        if (!window.messagesApi) {
                            this.testMessagesStep5Result = {
                                success: false,
                                message: '✗ messagesApi не загружен'
                            };
                            return;
                        }
                        // Загружаем модуль 'api'
                        const data = await window.messagesApi.loadModule('api');
                        if (data) {
                            const messageKeys = data.messages ? Object.keys(data.messages) : [];
                            this.testMessagesStep5Result = {
                                success: true,
                                message: `✓ Модуль 'api' загружен. Ключи сообщений: ${messageKeys.slice(0, 5).join(', ')}${messageKeys.length > 5 ? '...' : ''} (всего: ${messageKeys.length})`
                            };
                        } else {
                            this.testMessagesStep5Result = {
                                success: false,
                                message: '⚠ Модуль "api" не найден в KV, используется fallback'
                            };
                        }
                    } catch (error) {
                        this.testMessagesStep5Result = {
                            success: false,
                            message: `✗ Ошибка: ${error.message}`
                        };
                    }
                },

                /**
                 * Инициализировать тестовые сообщения
                 * Использует новые короткие ключи (e.net, e.rate, i.switch, h.proxy.up)
                 */
                initTestMessages() {
                    if (!window.AppMessages) {
                        console.warn('app-ui-root: AppMessages не загружен');
                        return;
                    }

                    // Danger сообщение (e.net = error.api.network)
                    const msg1Data = window.messagesConfig.get('e.net');
                    window.AppMessages.push({
                        text: msg1Data.text,
                        details: msg1Data.details,
                        type: msg1Data.type,
                        key: msg1Data.key,
                        scope: 'test-messages'
                    });

                    // Warning сообщение (e.rate = error.api.rate-limit)
                    // Используем числа или сокращения вместо текста на русском
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

                    // Info сообщение (i.switch = integration.provider.switched)
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

                    // Success сообщение (h.proxy.up = health.proxy.restored)
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
                 * DEBUG: Тест загрузки топ 10 монет через DataProviderManager
                 */
                async testLoadTopCoins() {
                    this.testLoading = true;
                    this.testError = null;
                    this.testResults = [];

                    try {
                        if (!window.dataProviderManager) {
                            throw new Error('dataProviderManager не загружен');
                        }

                        // Проверяем кэш
                        const cacheKey = 'top-coins';
                        let coins = null;

                        if (window.cacheManager) {
                            coins = await window.cacheManager.get(cacheKey);
                            if (coins) {
                                console.log('✅ Топ монет загружены из кэша');
                            }
                        }

                        // Если нет в кэше - загружаем через API
                        if (!coins) {
                            coins = await window.dataProviderManager.getTopCoins(10, 'market_cap');

                            // Сохраняем в кэш
                            if (window.cacheManager) {
                                await window.cacheManager.set(cacheKey, coins);
                                console.log('✅ Топ монет сохранены в кэш');
                            }
                        }

                        this.testResults = coins;
                    } catch (error) {
                        this.testError = error.message || 'Неизвестная ошибка';
                        console.error('testLoadTopCoins error:', error);
                    } finally {
                        this.testLoading = false;
                    }
                },

                /**
                 * DEBUG: Тест поиска монет
                 */
                async testSearchCoins() {
                    this.testLoading = true;
                    this.testError = null;
                    this.testResults = [];

                    try {
                        if (!window.dataProviderManager) {
                            throw new Error('dataProviderManager не загружен');
                        }

                        const results = await window.dataProviderManager.searchCoins('bitcoin');
                        this.testResults = results;
                    } catch (error) {
                        this.testError = error.message || 'Неизвестная ошибка';
                        console.error('testSearchCoins error:', error);
                    } finally {
                        this.testLoading = false;
                    }
                },

                /**
                 * DEBUG: Очистить результаты тестов
                 */
                clearTestResults() {
                    this.testResults = [];
                    this.testError = null;
                    this.testLoading = false;
                },

                /**
                 * Проверить, выбрана ли монета (заглушка)
                 */
                isCoinSelected(coinId) {
                    return this.selectedCoinIds.includes(coinId);
                },

                /**
                 * Обработчик переключения чекбокса монеты (заглушка)
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
                 * Переключить выбор монеты по id (без чекбокса)
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
                 * Выбрать избранные монеты (отменить все и выбрать отмеченные как избранные)
                 */
                handleSelectFavorites() {
                    const visibleCoins = this.sortedCoins;
                    if (!visibleCoins) return;

                    // Отменяем все и выбираем только избранные
                    this.selectedCoinIds = visibleCoins
                        .filter(coin => this.favoriteCoinIds.includes(coin.id))
                        .map(coin => coin.id);
                    this.saveTableSettings();
                },

                /**
                 * Выбрать стейблкоины (отменить все и выбрать стейблкоины)
                 */
                handleSelectStablecoins() {
                    const visibleCoins = this.sortedCoins;
                    if (!visibleCoins) return;

                    // Загружаем стейблкоины на-demand при выборе меню
                    const loadStablecoins = async () => {
                        if (window.coingeckoStablecoinsLoader && typeof window.coingeckoStablecoinsLoader.load === 'function') {
                            try {
                                await window.coingeckoStablecoinsLoader.load({ forceRefresh: true, ttl: 24 * 60 * 60 * 1000 });
                            } catch (error) {
                                console.warn('handleSelectStablecoins: ошибка загрузки стейблкоинов по запросу', error);
                            }
                        }
                    };

                    // Выполняем загрузку синхронно перед выбором
                    // eslint-disable-next-line consistent-return
                    return loadStablecoins().then(() => {
                        // Список стейблкоинов из единого источника правды
                        const stablecoins = window.coinsConfig && typeof window.coinsConfig.getStablecoinSymbolsSet === 'function'
                            ? window.coinsConfig.getStablecoinSymbolsSet()
                            : new Set();


                    // Отменяем все и выбираем только стейблкоины
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
                                text: 'Список стейблкоинов пуст или не загружен',
                                scope: 'global',
                                duration: 3000
                            });
                        }
                    });
                },

                /**
                 * Выбрать обертки (отменить все и выбрать обертки)
                 */
                handleSelectWrapped() {
                    const visibleCoins = this.sortedCoins;
                    if (!visibleCoins) return;

                    // Загружаем метаданные на-demand при выборе меню
                    const loadMetadata = async () => {
                        if (window.coinsMetadataLoader && typeof window.coinsMetadataLoader.load === 'function') {
                            try {
                                await window.coinsMetadataLoader.load({ forceRefresh: true, ttl: 24 * 60 * 60 * 1000 });
                            } catch (error) {
                                console.warn('handleSelectWrapped: ошибка загрузки метаданных по запросу', error);
                            }
                        }
                    };

                    // Выполняем загрузку синхронно перед выбором
                    return loadMetadata().then(() => {
                        const wrappedIds = window.coinsConfig && typeof window.coinsConfig.getWrappedCoins === 'function'
                            ? new Set(window.coinsConfig.getWrappedCoins())
                            : new Set();

                        // Отменяем все и выбираем только обертки
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
                 * Выбрать LST (отменить все и выбрать LST)
                 */
                handleSelectLst() {
                    const visibleCoins = this.sortedCoins;
                    if (!visibleCoins) return;

                    const loadMetadata = async () => {
                        if (window.coinsMetadataLoader && typeof window.coinsMetadataLoader.load === 'function') {
                            try {
                                await window.coinsMetadataLoader.load({ forceRefresh: true, ttl: 24 * 60 * 60 * 1000 });
                            } catch (error) {
                                console.warn('handleSelectLst: ошибка загрузки метаданных по запросу', error);
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
                 * Обновить метаданные монет (генерация coins.json на GitHub)
                 */
                async handleUpdateCoinsMetadata() {
                    if (window.coinsMetadataGenerator) {
                        await window.coinsMetadataGenerator.generateAndUpload();
                    } else {
                        console.error('coinsMetadataGenerator не загружен');
                    }
                },

                /**
                 * Удалить отмеченные монеты из таблицы
                 */
                async handleDeleteSelected() {
                    if (this.selectedCoinIds.length === 0) {
                        return;
                    }

                    // Удаляем выбранные монеты из массива coins
                    const selectedSet = new Set(this.selectedCoinIds);
                    this.coins = this.coins.filter(coin => !selectedSet.has(coin.id));

                    // Если используется активный набор, удаляем монеты и оттуда
                    if (this.activeCoinSetIds && Array.isArray(this.activeCoinSetIds)) {
                        const updatedActive = this.activeCoinSetIds.filter(id => !selectedSet.has(id));
                        await this.saveActiveCoinSetIds(updatedActive);
                    }

                    // Очищаем выбор
                    this.selectedCoinIds = [];

                    // Показываем сообщение об успехе
                    if (window.messagesStore) {
                        window.messagesStore.addMessage({
                            type: 'success',
                            text: `Удалено монет: ${selectedSet.size}`,
                            scope: 'global',
                            duration: 2000
                        });
                    }

                    // Если таблица пуста — показываем модалку загрузки набора
                    if (this.coins.length === 0) {
                        this.$nextTick(() => {
                            if (this.$refs.coinSetLoadModal) {
                                this.$refs.coinSetLoadModal.show();
                            }
                        });
                    }
                },

                /**
                 * Проверить, находится ли монета в избранном
                 */
                isCoinFavorite(coinId) {
                    return this.favoriteCoinIds.includes(coinId);
                },

                /**
                 * Проверить, находится ли монета в текущей таблице
                 */
                isCoinInTable(coinId) {
                    return this.coins.some(coin => coin.id === coinId);
                },

                /**
                 * Переключить избранное
                 */
                async handleToggleFavorite(coin) {
                    if (window.favoritesManager) {
                        await window.favoritesManager.toggleFavorite(coin);
                        // Обновление массива favoriteCoinIds произойдет через подписку на favorites-updated
                    }
                },

                /**
                 * Обработка открытия модального окна управления иконкой
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
                 * Открыть модальное окно управления иконкой (generic)
                 */
                openIconManagerModal() {
                    if (this.$refs.iconManagerModal) {
                        this.$refs.iconManagerModal.show();
                    }
                },

                /**
                 * Выбрать монету из дропдауна избранного (прокрутить к ней и выбрать чекбоксом)
                 */
                async handleSelectFavoriteCoin(coinId) {
                    // Если монета уже в таблице - выбираем чекбокс и прокручиваем
                    const existingCoin = this.sortedCoins.find(coin => coin.id === coinId);
                    if (existingCoin) {
                        // Выбираем чекбокс, если еще не выбран
                        if (!this.selectedCoinIds.includes(coinId)) {
                            this.selectedCoinIds.push(coinId);
                            this.saveTableSettings();
                        }
                        this.scrollToCoinRow(coinId);
                        return;
                    }

                    // Если монеты нет в таблице - пытаемся подгрузить и добавить
                    if (!window.dataProviderManager || typeof window.dataProviderManager.getCoinData !== 'function') {
                        console.warn('app-ui-root: dataProviderManager недоступен для добавления монеты из избранного');
                        return;
                    }

                    try {
                        const result = await window.dataProviderManager.getCoinData([coinId]);
                        const coinData = Array.isArray(result) ? result[0] : null;
                        if (coinData) {
                            this.coins.push(coinData);
                            // Обновляем кэш данных монеты для сохранения иконки
                            this.coinsDataCache.set(coinId, coinData);
                            this.scrollToCoinRow(coinId);
                        } else {
                            console.warn(`app-ui-root: монета ${coinId} не найдена в провайдере данных`);
                        }
                    } catch (error) {
                        console.error(`app-ui-root: ошибка загрузки монеты ${coinId} из избранного:`, error);
                        if (window.messagesStore) {
                            window.messagesStore.addMessage({
                                type: 'danger',
                                text: `Не удалось добавить монету ${coinId}`,
                                scope: 'global',
                                duration: 2500
                            });
                        }
                    }
                },

                /**
                 * Удалить монету из таблицы
                 */
                async handleDeleteCoin(coinId) {
                    if (!coinId) return;

                    // Удаляем монету из массива coins
                    const coinIndex = this.coins.findIndex(c => c.id === coinId);
                    if (coinIndex > -1) {
                        this.coins.splice(coinIndex, 1);
                    }

                    // Удаляем из выбранных монет, если она там есть
                    const selectedIndex = this.selectedCoinIds.indexOf(coinId);
                    if (selectedIndex > -1) {
                        this.selectedCoinIds.splice(selectedIndex, 1);
                        await this.saveTableSettings();
                    }

                    // Если используется активный набор, удаляем монету и оттуда
                    if (this.activeCoinSetIds && Array.isArray(this.activeCoinSetIds)) {
                        const activeIndex = this.activeCoinSetIds.indexOf(coinId);
                        if (activeIndex > -1) {
                            this.activeCoinSetIds.splice(activeIndex, 1);
                            await this.saveActiveCoinSetIds(this.activeCoinSetIds);
                        }
                    }

                    // Показываем сообщение об успехе
                    if (window.messagesStore) {
                        window.messagesStore.addMessage({
                            type: 'success',
                            text: 'Монета удалена из таблицы',
                            scope: 'global',
                            duration: 2000
                        });
                    }

                    // Если таблица пуста — показываем модалку загрузки набора
                    if (this.coins.length === 0) {
                        this.$nextTick(() => {
                            if (this.$refs.coinSetLoadModal) {
                                this.$refs.coinSetLoadModal.show();
                            }
                        });
                    }
                },

                /**
                 * Прокрутить к строке монеты в таблице (если она существует)
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
                 * Удалить монету из таблицы или из избранного (в зависимости от статуса inTable)
                 */
                async handleFavoriteRemoveFromTableOrFavorites(coinId) {
                    this.favoriteActionHoverId = null;

                    // Если монета в таблице - удаляем из таблицы
                    if (this.isCoinInTable(coinId)) {
                        this.handleDeleteCoin(coinId);
                        return;
                    }

                    // Если монеты нет в таблице - удаляем из Избранного
                    if (window.favoritesManager && typeof window.favoritesManager.removeFavorite === 'function') {
                        await window.favoritesManager.removeFavorite(coinId);
                    }
                },

                /**
                 * Иконка статуса монеты в списке избранного
                 */
                getFavoriteIndicatorIcon(coin) {
                    // При hover показываем крестик для любого состояния
                    if (this.favoriteActionHoverId === coin.id) {
                        return 'fas fa-times';
                    }
                    // Если монета не в таблице - показываем "бан"
                    if (!coin.inTable) {
                        return 'fas fa-ban';
                    }
                    // Если монета в таблице - показываем галочку
                    return 'fas fa-check';
                },

                /**
                 * Вспомогательный метод для получения URL иконки в поиске (index.html)
                 * Нужен для безопасного доступа к window.iconManager из шаблона
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
                 * Обработчик переключения "выбрать все"
                 */
                handleToggleAllCoins(event) {
                    const isChecked = event.target.checked;
                    // ВАЖНО: используем sortedCoins, а не coins, чтобы соответствовать счетчику и allCoinsSelected
                    const visibleCoins = this.sortedCoins || [];
                    if (isChecked) {
                        this.selectedCoinIds = visibleCoins.map(coin => coin.id);
                    } else {
                        this.selectedCoinIds = [];
                    }
                    this.saveTableSettings();
                },

                /**
                 * Обработчик сортировки колонок
                 */
                handleSort(field) {
                    if (this.sortBy === field) {
                        // Переключение порядка: null -> asc -> desc -> null
                        if (this.sortOrder === null) {
                            this.sortOrder = 'asc';
                        } else if (this.sortOrder === 'asc') {
                            this.sortOrder = 'desc';
                        } else {
                            this.sortBy = null;
                            this.sortOrder = null;
                        }
                    } else {
                        // Новое поле - начинаем с asc
                        this.sortBy = field;
                        this.sortOrder = 'asc';
                    }

                    // Сбрасываем coinSortType при установке сортировки по колонке
                    // (чтобы стандартная сортировка имела приоритет)
                    if (this.sortBy && this.sortOrder) {
                        this.coinSortType = null;
                        localStorage.removeItem('cgCoinSortType');
                    }

                    this.saveTableSettings();

                },

                /**
                 * Обработчик установки типа сортировки монет
                 */
                handleSetCoinSortType(sortType) {
                    this.coinSortType = sortType;
                    // Сбрасываем стандартную сортировку при выборе сортировки монет
                    this.sortBy = null;
                    this.sortOrder = null;
                    // Сохраняем состояние сортировки через tablesConfig (ЕИП)
                    // Также сохраняем в localStorage для обратной совместимости (если используется где-то еще)
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
                 * Сортировка монет по типу (только по убыванию для числовых, по возрастанию для алфавита)
                 */
                sortCoinsByType(coins) {
                    if (!this.coinSortType || !coins || coins.length === 0) {
                        return coins.slice();
                    }

                    const sorted = coins.slice();

                    switch (this.coinSortType) {
                        case 'market_cap':
                            // Сортировка по капитализации (по убыванию)
                            sorted.sort((a, b) => {
                                const aVal = a.market_cap || 0;
                                const bVal = b.market_cap || 0;
                                return bVal - aVal; // По убыванию
                            });
                            break;

                        case 'total_volume':
                            // Сортировка по дневному объему (по убыванию)
                            sorted.sort((a, b) => {
                                const aVal = a.total_volume || 0;
                                const bVal = b.total_volume || 0;
                                return bVal - aVal; // По убыванию
                            });
                            break;

                        case 'alphabet':
                            // Сортировка по алфавиту (по возрастанию - от A к Z)
                            sorted.sort((a, b) => {
                                const aSymbol = (a.symbol || '').toUpperCase();
                                const bSymbol = (b.symbol || '').toUpperCase();
                                return aSymbol.localeCompare(bSymbol); // По возрастанию (A-Z)
                            });
                            break;

                        case 'favorite':
                            // Сортировка избранных монет вверх (заглушка - пока нет избранного)
                            // В будущем можно добавить логику для избранных монет
                            break;

                        case 'selected':
                            // Сортировка отмеченных монет вверх
                            sorted.sort((a, b) => {
                                const aSelected = this.isCoinSelected(a.id);
                                const bSelected = this.isCoinSelected(b.id);
                                if (aSelected && !bSelected) return -1; // a выше
                                if (!aSelected && bSelected) return 1;  // b выше
                                return 0; // Одинаковый статус - сохраняем порядок
                            });
                            break;

                        default:
                            // Неизвестный тип сортировки - возвращаем без изменений
                            break;
                    }

                    return sorted;
                },

                /**
                 * Пересчитать все метрики для текущего списка монет
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

                    // 1. Расчет метрик (активная версия модели при наличии)
                    const metricsResult = metricsEngine.calculateMetrics(this.coins, params);
                    const finalCoins = Array.isArray(metricsResult)
                        ? metricsResult
                        : (metricsResult?.coins || []);
                    const finalCoinsFiltered = this.applyBanFilterToCoins(finalCoins);
                    let cmd = metricsResult?.marketData?.cmd || null;

                    // Рекомендованный метод AGR
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

                    // 2. MDN (Market Direction Now) для разных горизонтов
                    const mdnCalculator = metricsEngine.calculateMDN;
                    this.mdnValue = typeof mdnCalculator === 'function'
                        ? mdnCalculator.call(metricsEngine, this.mdnHours, finalCoinsFiltered, marketIndicators)
                        : 0;
                    const mdn4h = typeof mdnCalculator === 'function' ? mdnCalculator.call(metricsEngine, 4, finalCoinsFiltered, marketIndicators) : 0;
                    const mdn8h = typeof mdnCalculator === 'function' ? mdnCalculator.call(metricsEngine, 8, finalCoinsFiltered, marketIndicators) : 0;
                    const mdn12h = typeof mdnCalculator === 'function' ? mdnCalculator.call(metricsEngine, 12, finalCoinsFiltered, marketIndicators) : 0;

                    // 3. Расчет данных для Info-box
                    // 3.1 Медианы
                    const cgrValues = finalCoinsFiltered.map(c => c.metrics.cgr).filter(v => Number.isFinite(v));
                    const agrValues = finalCoinsFiltered.map(c => c.metrics.agr).filter(v => Number.isFinite(v));
                    const medianFn = metricsEngine.median;

                    this.infoBoxMedians = {
                        cdh: cmd?.cdh || 0,
                        cgr: medianFn ? medianFn.call(metricsEngine, cgrValues) : 0,
                        agr: medianFn ? medianFn.call(metricsEngine, agrValues) : 0
                    };

                    // 3.2 Широта рынка (Long/Short)
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

                    // 5.3 Направление (Market Direction)
                    let trendText = 'Neutral';
                    if (this.mdnValue > 15) trendText = 'Strong Bullish';
                    else if (this.mdnValue > 5) trendText = 'Bullish';
                    else if (this.mdnValue < -15) trendText = 'Strong Bearish';
                    else if (this.mdnValue < -5) trendText = 'Bearish';

                    this.infoBoxDirection = {
                        trend: trendText,
                        mdn4h, mdn8h, mdn12h
                    };

                    // 5.4 Портфель (D.2: расчет L/S сегментов для выбранных монет)
                    const selected = finalCoinsFiltered.filter(c => this.selectedCoinIds.includes(c.id));
                    const longCount = selected.filter(c => (c.metrics?.agr || 0) >= 0).length;
                    const shortCount = selected.filter(c => (c.metrics?.agr || 0) < 0).length;

                    this.infoBoxPortfolio = {
                        pl: 0,
                        count: this.selectedCoinIds.length,
                        longCount,
                        shortCount
                    };

                    // Обновляем массив монет (Vue 3 отследит изменения внутри объектов)
                    this.coins = [...finalCoinsFiltered];

                    if (window.eventBus) {
                        window.eventBus.emit('metrics-recalculated', { count: this.coins.length, mdn: this.mdnValue });
                    }
                },

                /**
                 * Сохранение настроек workspace (основная таблица) через workspaceConfig (ЕИП)
                 *
                 * Сохраняемые настройки mainTable:
                 * - selectedCoinIds: выбранные строки (чекбоксы)
                 * - sortBy, sortOrder: сортировка по колонкам
                 * - coinSortType: тип сортировки Coin (alphabet, market_cap, total_volume, favorite, selected)
                 * - showPriceColumn: видимость колонки Price
                 */
                async saveTableSettings() {
                    if (!window.workspaceConfig) {
                        console.warn('app-ui-root: workspaceConfig не загружен');
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
                        console.error('app-ui-root: ошибка сохранения настроек workspace:', error);
                    }
                },

                /**
                 * Загрузка настроек workspace (основная таблица) через workspaceConfig (ЕИП)
                 * Валидация: selectedCoinIds фильтруются - сохраняются только ID монет, присутствующих в текущей таблице
                 */
                async loadTableSettings() {
                    if (!window.workspaceConfig) {
                        console.warn('app-ui-root: workspaceConfig не загружен');
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
                        console.error('app-ui-root: ошибка загрузки настроек workspace:', error);
                    }
                },

                /**
                 * Сохранить активный набор монет в workspace (activeCoinSetIds)
                 * @param {Array<string>} ids
                 */
                async saveActiveCoinSetIds(ids) {
                    const normalizedIds = Array.isArray(ids) ? ids : [];
                    this.activeCoinSetIds = normalizedIds;
                    if (!window.workspaceConfig) {
                        console.warn('app-ui-root: workspaceConfig не загружен, activeCoinSetIds не сохранены');
                        return;
                    }

                    try {
                        await window.workspaceConfig.saveWorkspace({ activeCoinSetIds: normalizedIds });
                    } catch (error) {
                        console.error('app-ui-root: ошибка сохранения activeCoinSetIds в workspace:', error);
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
                 * Загрузить данные монет по списку ID
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

                    // Пропускаем монеты, которые уже есть в coinsDataCache и свежее 2 часов
                    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
                    for (const id of missing) {
                        const cached = this.coinsDataCache.get(id);
                        if (cached && cached._cachedAt && (Date.now() - cached._cachedAt) < TWO_HOURS_MS) {
                            coinsMap.set(id, cached);
                        }
                    }
                    coinsMap.forEach((_, id) => missing.delete(id));

                    // Читаем кэш активного набора (переживает F5, TTL 2 часа)
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
                            console.warn('app-ui-root: ошибка чтения active-coin-set-data', e);
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
                            console.warn(`app-ui-root: ошибка чтения кэша ${key}`, error);
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

                    // Сохраняем полные данные монет в кэш (переживает F5, TTL 2 часа)
                    if (resolvedCoins.length > 0 && window.cacheManager) {
                        try {
                            await window.cacheManager.set('active-coin-set-data', resolvedCoins);
                        } catch (e) {
                            console.warn('app-ui-root: ошибка сохранения active-coin-set-data', e);
                        }
                    }

                    return {
                        coins: this.applyBanFilterToCoins(resolvedCoins),
                        unresolved
                    };
                },

                /**
                 * Загрузить монеты исходя из активного набора (activeCoinSetIds) или дефолтного списка
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

                        // Классифицируем загруженные монеты для автонаборов
                        if (window.autoCoinSets) {
                            window.autoCoinSets.classifyAndUpdateAutoSets(coins);
                        }

                        this.recalculateAllMetrics(); // Пересчет метрик после загрузки
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

                    // Фолбэк на дефолтный список, если не смогли загрузить монеты активного набора
                    await this.saveActiveCoinSetIds([]);
                    await this.loadTopCoins();
                },

                /**
                 * Переключение видимости колонки Price
                 */
                togglePriceColumn() {
                    this.showPriceColumn = !this.showPriceColumn;
                    this.showCoinSortDropdown = false;
                    this.saveTableSettings();
                },

                /**
                 * Получить значение для ячейки таблицы (поддержка вложенности типа metrics.agr)
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
                 * Возвращает список всех CSS-классов колонок для columnVisibilityMixin
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
                    // При открытии дропдауна переносим фокус в поле ввода
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

                    // Уже в таблице — показываем сразу
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
                        // кэширование через cacheManager
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

                        // Уже в таблице — переносим в inTable
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
                        console.error('app-ui-root: ошибка поиска монет', error);
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

                    // Обновляем списки результатов локально (переносим добавленную монету в inTable)
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

                    // Уже в таблице
                    const exists = (this.coins || []).find(c => c.id === lower || (c.symbol || '').toLowerCase() === lower);
                    if (exists) {
                        return;
                    }

                    // Попытка exact load по id
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
                                    // fallback: взять нормализованный объект из search
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

                    // Добавляем монету
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
                                text: `Добавлена монета: ${coinData.symbol || coinData.id}`,
                                scope: 'global',
                                duration: 2500
                            });
                        }
                    }
                },

                /**
                 * Обработчик клика по документу (для закрытия дропдауна)
                 */
                handleDocumentClick(event) {
                    // Закрываем дропдаун, если клик был вне его
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
                 * Получить название типа сортировки для tooltip
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
                 * Tooltip для кнопки загрузки/сохранения набора монет
                 */
                getCoinSetActionTitle() {
                    if (!window.tooltipsConfig) {
                        return this.selectedCoinIds.length === 0 ? 'Загрузить набор монет' : 'Сохранить набор монет';
                    }
                    return this.selectedCoinIds.length === 0
                        ? window.tooltipsConfig.getTooltip('ui.coinSet.load')
                        : window.tooltipsConfig.getTooltip('ui.coinSet.save');
                },
                /**
                 * Tooltip для кнопки показа/скрытия Price
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
                 * Получить иконку для типа сортировки Coin
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
                 * Открыть модальное окно сохранения набора монет
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
                 * Открыть модальное окно загрузки набора монет
                 */
                openCoinSetLoadModal() {
                    if (this.$refs.coinSetLoadModal) {
                        this.$refs.coinSetLoadModal.show();
                    }
                },

                /**
                 * Сохранить набор монет в локальный "Draft"
                 * Добавляет монеты к существующему Draft набору (не заменяет)
                 * Не требует авторизации, сохраняется только в localStorage
                 * @param {Object} data - Данные для сохранения { coin_ids, coins } (опционально, если не указано - используется текущий набор)
                 */
                saveToDraft(data = null) {
                    if (!window.draftCoinSet) {
                        console.error('draftCoinSet не загружен');
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

                    // Получаем текущий Draft набор из localStorage
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
                        // Используем данные из параметра (из модального окна сохранения)
                        // Фильтруем только новые монеты (которые еще не в Draft)
                        newCoinIds = data.coin_ids.filter(id => !existingCoinIds.has(id));
                        newCoinsData = (data.coins || []).filter(coin => !existingCoinIds.has(coin.id));

                    } else {
                        // Используем текущий набор монет
                        if (!this.coins || this.coins.length === 0) {
                            if (window.messagesStore) {
                                window.messagesStore.addMessage({
                                    type: 'warning',
                                    text: 'Нет монет для сохранения в Draft',
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
                                text: 'Все монеты уже есть в Draft',
                                scope: 'global',
                                duration: 3000
                            });
                        }
                        return;
                    }

                    try {
                        // Объединяем существующие и новые монеты (ID)
                        const allCoinIds = Array.from(new Set([...Array.from(existingCoinIds), ...newCoinIds]));

                        // Собираем полные данные монет из ВСЕХ доступных источников (ЕИП)
                        const allCoinsData = [];
                        const coinsDataMap = new Map();

                        // 1. Добавляем существующие монеты из Draft
                        existingCoinsMap.forEach(coin => {
                            coinsDataMap.set(coin.id, coin);
                        });

                        // 2. Добавляем новые монеты из data.coins (если есть)
                        if (data && data.coins && Array.isArray(data.coins)) {
                            data.coins.forEach(coin => {
                                coinsDataMap.set(coin.id, coin);
                            });
                        }

                        // 3. Добавляем монеты из текущего набора this.coins (для заполнения пробелов)
                        if (this.coins && Array.isArray(this.coins)) {
                            this.coins.forEach(coin => {
                                if (allCoinIds.includes(coin.id) && !coinsDataMap.has(coin.id)) {
                                    coinsDataMap.set(coin.id, coin);
                                }
                            });
                        }

                        // Формируем итоговый массив полных данных монет
                        allCoinIds.forEach(coinId => {
                            if (coinsDataMap.has(coinId)) {
                                allCoinsData.push(coinsDataMap.get(coinId));
                            }
                        });

                        window.draftCoinSet.save(allCoinIds, allCoinsData);

                        if (window.messagesStore) {
                            window.messagesStore.addMessage({
                                type: 'success',
                                text: `Добавлено ${newCoinIds.length} монет в Draft (всего: ${allCoinIds.length})`,
                                scope: 'global',
                                duration: 3000
                            });
                        }

                        // Обновляем набор "Draft" в модальном окне загрузки (если оно открыто)
                        if (window.eventBus) {
                            window.eventBus.emit('draft-set-updated');
                        }
                    } catch (error) {
                        console.error('app-ui-root: ошибка сохранения в Draft:', error);
                        if (window.messagesStore) {
                            window.messagesStore.addMessage({
                                type: 'danger',
                                text: `Ошибка сохранения в Draft: ${error.message || 'Неизвестная ошибка'}`,
                                scope: 'global',
                                duration: 5000
                            });
                        }
                    }
                },

                /**
                 * Обработчик сохранения набора монет
                 */
                async handleSaveCoinSet(data) {
                    if (!window.coinSetsClient) {
                        console.error('coin-sets-client не загружен');
                        return;
                    }

                    // Проверяем авторизацию перед сохранением
                    if (!this.isAuthenticated) {
                        const error = new Error('Для сохранения набора монет необходимо авторизоваться');
                        // Показываем сообщение об ошибке через систему сообщений
                        if (window.messagesStore) {
                            window.messagesStore.addMessage({
                                type: 'warning',
                                text: 'Для сохранения набора монет необходимо авторизоваться. Откройте настройки и выполните авторизацию через Google.',
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
                            console.log('Набор монет сохранен:', result);

                            // Добавляем полные данные монет к результату (если они были переданы)
                            if (data.coins && Array.isArray(data.coins)) {
                                result.coins = data.coins;
                            }

                            // Показываем сообщение об успехе через систему сообщений
                            if (window.messagesStore) {
                                window.messagesStore.addMessage({
                                    type: 'success',
                                    text: `Набор монет "${result.name}" успешно сохранен`,
                                    scope: 'global',
                                    duration: 3000
                                });
                            }

                            // Обновляем список наборов в модальном окне загрузки (если оно открыто)
                            // Используем событие через eventBus для обновления списка
                            if (window.eventBus) {
                                window.eventBus.emit('coin-set-saved', { coinSet: result });
                            }
                        }
                    } catch (error) {
                        console.error('Ошибка сохранения набора монет:', error);
                        // Показываем сообщение об ошибке через систему сообщений
                        if (window.messagesStore) {
                            window.messagesStore.addMessage({
                                type: 'danger',
                                text: `Ошибка сохранения набора монет: ${error.message || 'Неизвестная ошибка'}`,
                                scope: 'global',
                                duration: 5000
                            });
                        }
                        throw error; // Пробрасываем ошибку, чтобы модальное окно могло обработать
                    }
                },

                /**
                 * Обработчик отмены сохранения набора монет
                 */
                handleCancelCoinSetSave() {
                    // Просто закрываем модальное окно
                    if (this.$refs.coinSetSaveModal) {
                        this.$refs.coinSetSaveModal.hide();
                    }
                },

                /**
                 * Обработчик загрузки наборов монет
                 * Объединяет монеты из выбранных наборов и заменяет текущий список или добавляет к нему
                 * @param {Array} coinSets - массив наборов монет для загрузки
                 * @param {Object} options - опции загрузки
                 * @param {boolean} options.merge - если true, монеты добавляются к текущим, если false - заменяют (по умолчанию false)
                 */
                async handleLoadCoinSet(coinSets, options = {}) {
                    const { merge = false } = options;

                    if (!coinSets || !Array.isArray(coinSets) || coinSets.length === 0) {
                        console.warn('coin-set-load-modal-body: нет наборов для загрузки');
                        return;
                    }

                    // Объединяем монеты из всех выбранных наборов
                    const allCoinIds = new Set();
                    const allCoinsData = new Map(); // Для хранения полных данных монет
                    const setNames = [];

                    coinSets.forEach(coinSet => {
                        if (coinSet.coin_ids && Array.isArray(coinSet.coin_ids)) {
                            coinSet.coin_ids.forEach(id => allCoinIds.add(id));
                            setNames.push(coinSet.name);

                            // Если набор содержит полные данные монет (например, дефолтный набор)
                            if (coinSet.coins && Array.isArray(coinSet.coins)) {
                                coinSet.coins.forEach(coin => {
                                    allCoinsData.set(coin.id, coin);
                                });
                            }
                        }
                    });

                    const { bannedIds } = this.getBanContext();
                    const coinIdsArray = Array.from(allCoinIds).filter(id => !bannedIds.has(id));

                    // Сначала используем уже переданные полные данные монет из выбранных наборов,
                    // затем догружаем только недостающие ID через loadCoinsByIds.
                    // Skill anchor: не пере-fetch'ить то, что уже пришло в coinSet.coins (типичная точка лишних API циклов).
                    // See core/skills/api-layer
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

                    // Сохраняем порядок согласно набору ID
                    const coins = this.applyBanFilterToCoins(coinIdsArray.map(id => resolvedCoinsMap.get(id)).filter(Boolean));
                    coins.forEach(coin => this.coinsDataCache.set(coin.id, coin));

                    // Применяем merge или замену
                    if (merge) {
                        // МЕРДЖ: объединяем с текущими монетами, убираем дубликаты по ID
                        const existingIds = new Set(this.coins.map(c => c.id));
                        const uniqueNewCoins = coins.filter(c => !existingIds.has(c.id));
                        this.coins = [...this.coins, ...uniqueNewCoins];
                    } else {
                        // ЗАМЕНА: текущее поведение
                        this.coins = coins;
                    }

                    // Классифицируем загруженные монеты для автонаборов
                    if (window.autoCoinSets) {
                        window.autoCoinSets.classifyAndUpdateAutoSets(coins);
                    }

                    if (unresolved.length > 0) {
                        // Собираем метаданные по отсутствующим монетам из исходных наборов
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
                        // Skill anchor: после merge activeCoinSetIds должны быть union от this.coins, иначе счетчик таблицы "залипает".
                        // See core/skills/api-layer
                        const nextActiveCoinSetIds = merge
                            ? Array.from(new Set(this.coins.map(coin => coin.id)))
                            : coinIdsArray;

                        // Устанавливаем активный набор монет (система понимает, что работаем с набором, а не с дефолтным списком)
                        await this.saveActiveCoinSetIds(nextActiveCoinSetIds);
                        // Очищаем выбранные монеты (пользователь начинает работу с новым набором)
                        this.selectedCoinIds = [];
                        // Закрываем модальное окно
                        if (this.$refs.coinSetLoadModal) {
                            this.$refs.coinSetLoadModal.hide();
                        }
                        if (window.messagesStore) {
                            window.messagesStore.addMessage({
                                type: 'success',
                                text: `Загружено ${this.coins.length} монет из наборов (${coinSets.length})`,
                                scope: 'global',
                                duration: 3000
                            });
                        }
                    }

                    // Показываем сообщение об успехе
                    if (window.messagesStore) {
                        const namesText = setNames.length === 1
                            ? `"${setNames[0]}"`
                            : `${setNames.length} наборов`;
                        const loadedCount = coins.length;
                        const requestedCount = coinIdsArray.length;
                        const actionText = merge ? 'добавлены' : 'загружены';
                        const tableText = merge
                            ? 'Таблица обновлена.'
                            : 'Таблица показывает только монеты из набора.';
                        const messageText = loadedCount === requestedCount
                            ? `Наборы монет ${namesText} ${actionText} (${loadedCount} монет). ${tableText}`
                            : `Наборы монет ${namesText} ${actionText} (${loadedCount} из ${requestedCount} монет). ${tableText}`;
                        window.messagesStore.addMessage({
                            type: loadedCount === requestedCount ? 'success' : 'warning',
                            text: messageText,
                            scope: 'global',
                            duration: 5000
                        });
                            }
                },

                /**
                 * Обработчик разрешения отсутствующих монет (исключение/замена)
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

                    // Загружаем данные монет для обновленного списка
                    const { coins, unresolved } = await this.loadCoinsByIds(updatedIds);
                    this.coins = coins;
                    coins.forEach(c => this.coinsDataCache.set(c.id, c));

                    // Фильтруем выбранные монеты
                    const validIds = new Set(updatedIds);
                    this.selectedCoinIds = this.selectedCoinIds.filter(id => validIds.has(id));

                    // Сохраняем активный набор
                    await this.saveActiveCoinSetIds(updatedIds);

                    // Синхронизируем наборы в облаке (если были выбраны сохраненные наборы)
                    await this.syncCoinSetsAfterResolve(ctx.coinSets, excludeSet, replaceMap);

                    if (unresolved && unresolved.length > 0 && window.messagesStore) {
                                    window.messagesStore.addMessage({
                                        type: 'warning',
                            text: `После замены не найдены данные для ${unresolved.length} монет: ${unresolved.slice(0, 3).join(', ')}`,
                                        scope: 'global',
                            duration: 6000
                                    });
                    } else if (window.messagesStore) {
                                window.messagesStore.addMessage({
                            type: 'success',
                            text: 'Набор обновлен: отсутствующие монеты обработаны',
                                    scope: 'global',
                            duration: 4000
                                });
                            }

                    // Закрываем модалку при необходимости
                    if (this.$refs.missingCoinsModal) {
                        this.$refs.missingCoinsModal.hide();
                    }

                    // Сбрасываем контекст
                    this.missingCoins = [];
                    this.pendingCoinSetContext = null;
                },

                /**
                 * Синхронизация измененных наборов в облаке и локально
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

                        // Пропускаем дефолт и локальные черновики
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
                                console.warn('Ошибка обновления набора в облаке', set.id, error);
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
                 * Обработчик удаления наборов монет
                 */
                async handleDeleteCoinSets(coinSetIds) {
                    if (!coinSetIds || !Array.isArray(coinSetIds) || coinSetIds.length === 0) {
                        return;
                    }

                    if (!window.coinSetsClient) {
                        console.error('coin-sets-client не загружен');
                        return;
                    }

                    // Проверяем авторизацию перед удалением
                    if (!this.isAuthenticated) {
                        const error = new Error('Для удаления наборов монет необходимо авторизоваться');
                        if (window.messagesStore) {
                            window.messagesStore.addMessage({
                                type: 'warning',
                                text: 'Для удаления наборов монет необходимо авторизоваться. Откройте настройки и выполните авторизацию через Google.',
                                scope: 'global',
                                duration: 5000
                            });
                        }
                        throw error;
                    }

                    try {
                        // Удаляем каждый набор
                        const deletePromises = coinSetIds.map(id =>
                            window.coinSetsClient.deleteCoinSet(id)
                        );
                        await Promise.all(deletePromises);

                        // Показываем сообщение об успехе
                        if (window.messagesStore) {
                            window.messagesStore.addMessage({
                                type: 'success',
                                text: `Удалено наборов монет: ${coinSetIds.length}`,
                                scope: 'global',
                                duration: 3000
                            });
                        }
                    } catch (error) {
                        console.error('Ошибка удаления наборов монет:', error);
                        if (window.messagesStore) {
                            window.messagesStore.addMessage({
                                type: 'danger',
                                text: `Ошибка удаления наборов монет: ${error.message || 'Неизвестная ошибка'}`,
                                scope: 'global',
                                duration: 5000
                            });
                        }
                        throw error;
                    }
                },

                /**
                 * Обработчик отмены загрузки набора монет
                 */
                handleCancelCoinSetLoad() {
                    // Просто закрываем модальное окно
                    if (this.$refs.coinSetLoadModal) {
                        this.$refs.coinSetLoadModal.hide();
                    }
                },

                /**
                 * Инициализировать локальный набор "Draft"
                 * Вызывается при старте приложения, если набор еще не существует
                 * Инициализируется пустым набором
                 */
                initializeDraftSet() {
                    if (!window.draftCoinSet) {
                        console.warn('app-ui-root: draftCoinSet не загружен, инициализация пропущена');
                        return;
                    }

                    try {
                        // Проверяем, существует ли уже набор "Draft" в localStorage
                        const existing = window.draftCoinSet.get();
                        if (!existing || existing.coin_ids.length === 0) {
                            // Инициализируем пустым набором
                            window.draftCoinSet.initialize([]);
                            console.log('✅ Draft набор инициализирован (пустой)');
                        } else {
                            console.log(`✅ Draft набор уже существует (${existing.coin_ids.length} монет)`);
                        }
                    } catch (error) {
                        console.error('app-ui-root: ошибка инициализации Draft набора:', error);
                    }
                },

                /**
                 * Предзагрузить максимальные наборы монет (250 по капитализации и по объему)
                 * Вызывается при старте приложения для заполнения кэша
                 */
                async preloadMaxCoinsData() {
                    if (!window.dataProviderManager || !window.cacheManager) {
                        console.warn('app-ui-root: dataProviderManager или cacheManager не загружены, предзагрузка пропущена');
                        return;
                    }

                    /**
                     * Загрузить набор монет с приоритетом кэша и проверкой свежести (4 часа).
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

                        // Если кэш пуст или устарел — пробуем загрузить
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
                            console.warn(`app-ui-root: не удалось предзагрузить ${label}:`, error.message);
                            if (isRateLimit) return 'rate-limited';
                        }
                        return null;
                    };

                    // Если мы только что загрузили основные данные для таблицы,
                    // откладываем предзагрузку полных наборов на 5-10 минут.
                    // На холодном старте (кэш пуст) даём 60 секунд, чтобы не давить на rate limiter
                    // сразу после первичной загрузки монет.
                    const delay = (this.coins && this.coins.length > 0) ? 5 * 60 * 1000 : 60 * 1000;

                    setTimeout(async () => {
                        const resultMarketCap = await loadWithPriority('top-coins-by-market-cap', 'market_cap', 'топ-250 по капитализации');
                        // Skill anchor: если market_cap получил 429 — не пытаться грузить volume,
                        // это только усугубит блокировку. Прерываем всю цепочку предзагрузки.
                        if (resultMarketCap === 'rate-limited') {
                            console.log('app-ui-root: предзагрузка по объёму пропущена из-за rate limit на капитализации.');
                            return;
                        }
                        await new Promise(r => setTimeout(r, 10000)); // Пауза между тяжёлыми запросами
                        await loadWithPriority('top-coins-by-volume', 'volume', 'топ-250 по объему');
                    }, delay);
                },

                /**
                 * Обновить кэш монет и метрик рынка (принудительная загрузка из API)
                 * Вызывается по кнопке Refresh
                 * На file:// использует Cloudflare Worker proxy для обхода CORS
                 */
                async refreshCoinsCache() {
                    if (!window.dataProviderManager || !window.cacheManager) {
                        console.error('app-ui-root: dataProviderManager или cacheManager не загружены');
                        return;
                    }

                    // Показываем сообщение о начале обновления
                    if (window.messagesStore) {
                        window.messagesStore.addMessage({
                            type: 'info',
                            text: 'Принудительное обновление данных монет и метрик рынка...',
                            scope: 'global',
                            duration: 3000
                        });
                    }

                    try {
                        // Skill anchor: при force refresh допустимо удалять кэш; при обычной загрузке — нет (stale-while-revalidate).
                        // See core/skills/cache-layer
                        // 1. Удаляем старые данные монет из кэша
                        await window.cacheManager.delete('top-coins-by-market-cap');
                        await window.cacheManager.delete('top-coins-by-market-cap-meta');
                        await window.cacheManager.delete('top-coins-by-volume');
                        await window.cacheManager.delete('top-coins-by-volume-meta');
                        await window.cacheManager.delete('stablecoins-list');

                        console.log('app-ui-root: кэш монет очищен, загружаем новые данные...');

                        // 2. Загружаем свежие данные монет
                        const coinsMarketCap = await window.dataProviderManager.getTopCoins(250, 'market_cap');
                        await window.cacheManager.set('top-coins-by-market-cap', coinsMarketCap);
                        await window.cacheManager.set('top-coins-by-market-cap-meta', { timestamp: Date.now() });
                        console.log(`✅ Топ-250 по капитализации обновлены (${coinsMarketCap.length} монет)`);

                        const coinsVolume = await window.dataProviderManager.getTopCoins(250, 'volume');
                        await window.cacheManager.set('top-coins-by-volume', coinsVolume);
                        await window.cacheManager.set('top-coins-by-volume-meta', { timestamp: Date.now() });
                        console.log(`✅ Топ-250 по объему обновлены (${coinsVolume.length} монет)`);

                        // 3. Обновляем список стейблкоинов из CoinGecko (forceRefresh)
                        if (window.coingeckoStablecoinsLoader && typeof window.coingeckoStablecoinsLoader.load === 'function') {
                            await window.coingeckoStablecoinsLoader.load({ forceRefresh: true, ttl: 24 * 60 * 60 * 1000 });
                            console.log('✅ Список стейблкоинов обновлен');
                        }

                        // 4. Удаляем кэш метрик рынка (VIX, FGI, BTC Dom, OI, FR, LSR)
                        await window.cacheManager.delete('vix-index');
                        await window.cacheManager.delete('fear-greed-index');

                        console.log('app-ui-root: кэш метрик очищен, загружаем свежие данные...');

                        // 5. Загружаем свежие метрики рынка через футер
                        if (this.$refs.appFooter && typeof this.$refs.appFooter.fetchMarketIndices === 'function') {
                            await this.$refs.appFooter.fetchMarketIndices({ forceRefresh: true });
                            console.log('✅ Метрики рынка обновлены');
                        } else if (window.marketMetrics && typeof window.marketMetrics.fetchAll === 'function') {
                            // Fallback: прямой вызов модуля
                            await window.marketMetrics.fetchAll({ forceRefresh: true });
                            console.log('✅ Метрики рынка обновлены (через модуль)');
                        }

                        // 6. Показываем сообщение об успехе
                        if (window.messagesStore) {
                            window.messagesStore.addMessage({
                                type: 'success',
                                text: 'Данные успешно обновлены (монеты + метрики рынка + стейблкоины)',
                                scope: 'global',
                                duration: 4000
                            });
                        }

                        // 7. Обновляем таблицу монет реактивно
                        await this.loadTopCoins();
                        await this.updateCoinsCacheMeta();
                    } catch (error) {
                        console.error('app-ui-root: ошибка обновления кэша:', error);
                        if (window.messagesStore) {
                            window.messagesStore.addMessage({
                                type: 'danger',
                                text: `Ошибка обновления данных: ${error.message || 'Неизвестная ошибка'}`,
                                scope: 'global',
                                duration: 5000
                            });
                        }
                    }
                },

                /**
                 * Обновить метаданные кэша топ-монет (expiresAt/timestamp)
                 */
                /**
                 * Запрашивает количество монет в облачной PostgreSQL БД
                 * Использует checkCacheStatus() из yandex-cache-provider
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
                 * Страховочная синхронизация: отправляет монеты из локального кэша в PostgreSQL,
                 * если они новее данных в БД. Запускается при старте/рефреше страницы.
                 * Покрывает случаи когда реактивность не сработала (поиск, прямая загрузка и т.д.)
                 */
                async syncCacheToDb() {
                    try {
                        const API_GATEWAY = 'https://d5dl2ia43kck6aqb1el5.k1mxzkh0.apigw.yandexcloud.net';

                        // Монеты из yandex-cache уже есть в БД — их не отправляем.
                        // Отправляем только монеты из CoinGecko (_source отсутствует или !== 'yandex-cache').
                        const isFromCoinGecko = (coin) => coin._source !== 'yandex-cache';

                        const coinMap = new Map(); // id -> coin (дедупликация)

                        // 1. Текущие монеты в таблице
                        for (const coin of (this.coins || [])) {
                            if (coin.id && isFromCoinGecko(coin)) {
                                coinMap.set(coin.id, coin);
                            }
                        }

                        // 2. Кэши top-coins (могут содержать монеты из CoinGecko-fallback)
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
                            console.log('app-ui-root: syncCacheToDb — нет монет из CoinGecko для синхронизации');
                            return;
                        }

                        const coins = Array.from(coinMap.values());
                        console.log(`app-ui-root: syncCacheToDb — отправляем ${coins.length} монет из CoinGecko в БД`);

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
                 * Мягкий рефреш таблицы монет без сетевых запросов
                 */
                async softRefreshCoinsTable() {
                    if (!window.cacheManager) {
                        console.warn('app-ui-root: cacheManager не загружен, мягкий рефреш пропущен');
                        return;
                    }

                    try {
                        const cacheKey = 'top-coins-by-market-cap';
                        const coinsFullSet = await window.cacheManager.get(cacheKey);
                        if (!coinsFullSet || !Array.isArray(coinsFullSet)) {
                            if (window.messagesStore) {
                                window.messagesStore.addMessage({
                                    type: 'warning',
                                    text: 'Кэш монет недоступен. Для обновления нужен новый запрос.',
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
                 * Загрузить топ монет для таблицы (index.html)
                 * Берет данные из предзагруженного кэша максимальных наборов
                 */
                async loadTopCoins() {
                    this.coinsLoading = true;
                    this.coinsError = null;

                    const cacheKey = 'top-coins-by-market-cap';
                    let coinsFullSet = null;
                    try {
                        if (!window.dataProviderManager) {
                            throw new Error('dataProviderManager не загружен');
                        }

                        // ВСЕГДА сначала пробуем кэш, чтобы мгновенно отрендерниться
                        if (window.cacheManager) {
                            coinsFullSet = await window.cacheManager.get(cacheKey);
                        }

                        // Фолбэк: старый формат IndexedDB-заглушки (localStorage idb_warm_*)
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
                                console.warn('app-ui-root: ошибка чтения legacy cache', legacyError);
                            }
                        }

                        // Если в кэше есть данные — показываем их сразу!
                        if (coinsFullSet && coinsFullSet.length > 0) {
                            this.coins = this.applyBanFilterToCoins(coinsFullSet).slice(0, 50);
                            this.coins.forEach(coin => this.coinsDataCache.set(coin.id, coin));
                            if (window.autoCoinSets) window.autoCoinSets.classifyAndUpdateAutoSets(this.coins);
                            this.recalculateAllMetrics();
                            console.log(`✅ Топ монет (из кэша): ${this.coins.length}`);

                            const threshold = window.ssot?.getTopCoinsTimingWindowMs?.() || 2 * 60 * 60 * 1000;
                            const meta = await window.cacheManager.get(`${cacheKey}-meta`);
                            const age = meta ? Date.now() - meta.timestamp : threshold + 1;

                            if (age > threshold) {
                                // Запускаем обновление в фоне через 15 секунд, только если данные устарели
                                setTimeout(async () => {
                                    try {
                                        console.log('app-ui-root: фоновое обновление топа монет (данные устарели)...');
                                        const fresh = await window.dataProviderManager.getTopCoins(250, 'market_cap', {
                                            preferYandexFirst: true,
                                            allowCoinGeckoFallback: false
                                        });
                                        if (fresh && fresh.length > 0) {
                                            await window.cacheManager.set(cacheKey, fresh);
                                            await window.cacheManager.set(`${cacheKey}-meta`, { timestamp: Date.now() });
                                            console.log('✅ Топ монет обновлен в кэше');
                                        }
                                    } catch (e) {
                                        console.warn('app-ui-root: фоновое обновление не удалось, остаемся на кэше');
                                    }
                                }, 15000);
                            } else {
                                console.log(`✅ Данные в кэше еще свежие (${Math.round(age / 60000)} мин. назад). Фоновое обновление пропущено.`);
                            }

                            return;
                        }

                        // Только если кэш совсем пустой — идем в API и ждем
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
                        // this.coinsError = error.message || 'Неизвестная ошибка';
                        console.warn('loadTopCoins non-fatal error (hidden from UI):', error);

                        // Фолбэк: пробуем локальный кэш (localStorage), чтобы UI не был пустым
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
                 * DEBUG: Обработка контекстного меню монеты
                 */
                handleCoinContextMenu(event, coinId) {
                    console.log('Coin context menu:', coinId, event);
                    // Заглушка для будущего функционала
                },

                /**
                 * DEBUG: Создание тестового набора монет
                 */
                async testCreateCoinSet() {
                    this.testLoading = true;
                    this.testError = null;

                    try {
                        if (!window.coinSetsClient) {
                            throw new Error('coinSetsClient не загружен');
                        }

                        const coinSet = await window.coinSetsClient.createCoinSet({
                            name: `Test Set ${Date.now()}`,
                            description: 'Тестовый набор монет',
                            coin_ids: ['bitcoin', 'ethereum', 'cardano'],
                            is_active: 1,
                            provider: 'coingecko'
                        });

                        console.log('✅ Набор создан:', coinSet);
                        await this.testGetCoinSets(); // Обновляем список
                    } catch (error) {
                        this.testError = error.message || 'Ошибка создания набора';
                        console.error('testCreateCoinSet error:', error);
                    } finally {
                        this.testLoading = false;
                    }
                },

                /**
                 * DEBUG: Получение списка наборов монет
                 */
                async testGetCoinSets() {
                    this.testLoading = true;
                    this.testError = null;

                    try {
                        if (!window.coinSetsClient) {
                            throw new Error('coinSetsClient не загружен');
                        }

                        const coinSets = await window.coinSetsClient.getCoinSets();
                        this.testCoinSets = coinSets;
                        console.log('✅ Наборы получены:', coinSets);
                    } catch (error) {
                        this.testError = error.message || 'Ошибка получения наборов';
                        console.error('testGetCoinSets error:', error);
                    } finally {
                        this.testLoading = false;
                    }
                },

                /**
                 * DEBUG: Удаление последнего созданного набора
                 */
                async testDeleteLastCoinSet() {
                    this.testLoading = true;
                    this.testError = null;

                    try {
                        if (!window.coinSetsClient) {
                            throw new Error('coinSetsClient не загружен');
                        }

                        if (this.testCoinSets.length === 0) {
                            throw new Error('Нет наборов для удаления. Сначала получите список.');
                        }

                        const lastSet = this.testCoinSets[0]; // Первый в списке (newest)
                        await window.coinSetsClient.deleteCoinSet(lastSet.id);
                        console.log('✅ Набор удален:', lastSet.id);
                        await this.testGetCoinSets(); // Обновляем список
                    } catch (error) {
                        this.testError = error.message || 'Ошибка удаления набора';
                        console.error('testDeleteLastCoinSet error:', error);
                    } finally {
                        this.testLoading = false;
                    }
                }
            },

            async mounted() {
                // Загружаем сохраненные портфели (D.5)
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

                // Загружаем таймзону и язык перевода из кэша при инициализации
                // Это обеспечивает синхронизацию с футером и статическими примерами
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

                    // Инициализируем tooltips для загруженного языка
                    // Ждём завершения инициализации перед обновлением реактивных tooltips
                    if (window.tooltipsConfig && typeof window.tooltipsConfig.init === 'function') {
                        try {
                            await window.tooltipsConfig.init(savedLanguage);

                            // Загружаем метаданные монет (стейблкоины, обертки, LST)
                            if (window.coinsMetadataLoader && typeof window.coinsMetadataLoader.load === 'function') {
                                // Не ждем полной загрузки, чтобы не блокировать UI, но запускаем
                                window.coinsMetadataLoader.load().catch(err => {
                                    console.warn('app-ui-root: ошибка загрузки метаданных монет при старте', err);
                                });
                            }

                            // Обновляем реактивные tooltips после инициализации
                            // Синхронизируем currentTranslationLanguage с currentLanguage из tooltipsConfig
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

                    // Инициализируем переводчик сообщений
                    if (window.messagesTranslator && typeof window.messagesTranslator.init === 'function') {
                        try {
                            await window.messagesTranslator.init(savedLanguage);
                        } catch (error) {
                            console.error('app-ui-root: ошибка инициализации messagesTranslator:', error);
                        }
                    }

                    // Проверяем начальное состояние авторизации через централизованное хранилище
                    if (window.authState) {
                        try {
                            await window.authState.checkAuthStatus();
                        } catch (error) {
                            console.error('app-ui-root: ошибка проверки авторизации при монтировании:', error);
                        }
                    }

                    // Инициализируем тестовые сообщения
                    this.initTestMessages();

                    // Инициализируем метаданные кэша топ-монет и запускаем периодическую проверку
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
                        // Обновляем счётчик БД после записи чанка из CoinGecko
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

                    // Инициализируем локальный набор "Draft" из файла 77.json (если еще не существует)
                    this.initializeDraftSet();

                    // Инициализируем менеджер избранных монет
                    if (window.favoritesManager) {
                        await window.favoritesManager.init();
                        // Загружаем начальный список
                        const favorites = window.favoritesManager.getFavorites();
                        this.favoriteCoinsMeta = favorites;
                        this.favoriteCoinIds = favorites.map(f => f.id);

                        // Подписываемся на обновления
                        if (window.eventBus) {
                            window.eventBus.on('favorites-updated', (favorites) => {
                                // Используем $nextTick для гарантии реактивности Vue
                                this.$nextTick(() => {
                                    this.favoriteCoinsMeta = [...favorites]; // Создаем новый массив для реактивности
                                this.favoriteCoinIds = favorites.map(f => f.id);
                                });
                            });
                        }
                    }

                    // Загружаем список стейблкоинов из CoinGecko (один раз, без UI)
                    // Убираем задержку в 5с и не ждем завершения - пусть грузится полностью в фоне
                    if (window.coingeckoStablecoinsLoader && typeof window.coingeckoStablecoinsLoader.load === 'function') {
                        // Запускаем без await через 15 секунд после старта
                        setTimeout(() => {
                            window.coingeckoStablecoinsLoader.load({ forceRefresh: false, ttl: 24 * 60 * 60 * 1000 }).catch(err => {
                                console.warn('app-ui-root: фоновая загрузка стейблкоинов не удалась (rate limit)', err.message);
                            });
                        }, 15000);
                    }

                    // Загружаем workspace (активная модель, активный набор монет)
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

                    // Инициализируем менеджер синхронизации с PostgreSQL
                    if (window.postgresSyncManager && typeof window.postgresSyncManager.init === 'function') {
                        window.postgresSyncManager.init();
                    }

                    // Загружаем количество монет в облачной БД (фоново, не блокируем UI)
                    await this.fetchDbStatus();

                    // Очищаем устаревшие ключи localStorage (старый формат)
                    localStorage.removeItem('activeCoinSetIds');
                    localStorage.removeItem('activeCoinSetCoinsData');

                    // Загружаем монеты в соответствии с workspace (активный набор или дефолтный список)
                    await this.loadCoinsForActiveSet();

                    // Предзагружаем максимальные наборы монет (250 по капитализации и по объему)
                    // Теперь это делается лениво (см. preloadMaxCoinsData)
                    this.preloadMaxCoinsData();

                    // Страховочная синхронизация кэша → БД (фоново, не блокирует UI)
                    // Отправляет монеты из локального кэша если они новее данных в БД
                    setTimeout(() => { this.syncCacheToDb(); }, 3000);

                    // Загружаем настройки таблицы (после загрузки монет)
                    await this.loadTableSettings();

                    // Первичный расчет метрик
                    this.recalculateAllMetrics();

                    // Закрытие дропдауна сортировки монет при клике вне
                    document.addEventListener('click', this.handleDocumentClick);

                    // Tooltips для вкладок инициализируются автоматически Bootstrap из атрибута title
                    // Не требуется ручная инициализация - Bootstrap Tab автоматически создает tooltip
                } catch (error) {
                    console.error('Failed to load timezone/language in app-ui-root:', error);
                }
            },
            beforeUnmount() {
                // Удаляем обработчик клика при размонтировании
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

        // Экспортируем Vue instance в window.appRoot для доступа из других модулей
        window.appRoot = appInstance;

        // Инициализация темы при загрузке (если не была применена в data())
        // Дополнительная проверка на случай, если тема была изменена до монтирования Vue
        try {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'dark') {
                document.body.setAttribute('data-bs-theme', 'dark');
            } else {
                document.body.removeAttribute('data-bs-theme');
            }
        } catch (e) {
            // Игнорируем ошибки
        }

        // Инициализация CSS-класса версии приложения на body
        // Используется для версионной стилизации и привязки кэша к версии
        try {
            if (window.appConfig) {
                const versionClass = window.appConfig.getVersionClass();
                document.body.classList.add(versionClass);
                console.log(`app-ui-root: версия приложения ${window.appConfig.CONFIG.version}, класс ${versionClass}`);
            }
        } catch (e) {
            console.error('app-ui-root: ошибка установки класса версии:', e);
        }

        // Очистка кэша старых версий приложения
        // Выполняется асинхронно, не блокирует инициализацию
        if (window.cacheManager && typeof window.cacheManager.clearOldVersions === 'function') {
            window.cacheManager.clearOldVersions().catch(error => {
                console.error('app-ui-root: ошибка очистки старых версий кэша:', error);
            });
        }

        // Инициализация tooltips теперь происходит в mounted() компонента
        // Убрали дублирующий вызов отсюда, чтобы избежать гонки условий

        // Инициализация автоматической маркировки элементов после монтирования Vue
        // Ждем, чтобы Vue успел смонтировать все компоненты
        setTimeout(() => {
            if (window.autoMarkup) {
                window.autoMarkup.init();
            }
        }, 200);
    }

    // Инициализация Vue приложения после загрузки всех модулей
    // Модульная система вызывает эту функцию после успешной загрузки всех модулей
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            // Ждём завершения загрузки модулей
            // Модульная система вызовет initVueApp через window.appInit
            window.appInit = initVueApp;
        });
    } else {
        // Если DOM уже загружен, устанавливаем функцию инициализации
        window.appInit = initVueApp;
    }
})();

