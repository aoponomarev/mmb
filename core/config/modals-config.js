/**
 * ================================================================================================
 * MODALS CONFIG - Конфигурация модальных окон
 * ================================================================================================
 * Skill: a/skills/app/skills/components/components-modal-buttons.md
 *
 * ЦЕЛЬ: Единый источник правды для заголовков, иконок и метаданных модальных окон.
 *
 * ПРИНЦИПЫ:
 * - Заголовок модального окна определяется здесь и используется везде
 * - Пункты меню, кнопки и ссылки получают заголовок из этой конфигурации
 * - Изменение заголовка в одном месте автоматически синхронизируется везде
 * - Обязательное требование: заголовок модального окна должен совпадать с текстом пункта меню/кнопки
 *
 * ПРИНЦИПЫ:
 * {
 *   modalId: {
 *     title: 'Заголовок модального окна',
 *     icon: 'fas fa-icon-class', // Опционально
 *     description: 'Описание', // Опционально
 *     bodyComponent: 'component-name', // Имя Vue-компонента для body (опционально)
 *     centered: true, // Центрирование по вертикали (опционально, default: false)
 *     condition: () => true // Функция для условного отображения (опционально)
 *   }
 * }
 *
 * ССЫЛКИ:
 * - Принципы единого источника правды: `a/skills/app/skills/components/components-ssot.md`
 * - Компонент модального окна: shared/components/modal.js
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
            autoRegister: false // Требует props (v-model, on-save, on-cancel)
        },
        'aiApiModal': {
            title: 'API-ключи',
            icon: 'fas fa-robot',
            description: 'Настройки API-ключей (GitHub, Yandex, PostgreSQL)',
            bodyComponent: 'ai-api-settings',
            centered: true,
            autoRegister: true // Не требует props
        },
        'portfolioModal': {
            title: 'Портфель',
            icon: 'fas fa-briefcase',
            description: 'Создание или редактирование портфеля',
            bodyComponent: 'portfolio-modal-body',
            centered: true,
            autoRegister: false, // Требует props
            condition: () => window.appConfig && window.appConfig.isFeatureEnabled('portfolios') && window.appConfig.isFeatureEnabled('cloudSync')
        },
        'portfolioFormModal': {
            title: 'Формирование портфеля',
            description: 'Автоматическое формирование портфеля на основе математической модели',
            bodyComponent: 'portfolio-form-modal-body',
            centered: true,
            autoRegister: false // Требует props (allCoins, onSave)
        },
        'portfolioViewModal': {
            title: 'Просмотр портфеля',
            description: 'Детальный просмотр состава портфеля и метрик',
            bodyComponent: 'portfolio-view-modal-body',
            centered: true,
            autoRegister: false // Требует props (portfolio, onDelete)
        },
        'authModal': {
            title: 'Авторизация',
            icon: 'fas fa-sign-in-alt',
            description: 'Авторизация через Google OAuth',
            bodyComponent: 'auth-modal-body',
            centered: true,
            autoRegister: false, // Требует props (on-login-success, on-logout-success)
            condition: () => window.appConfig && window.appConfig.isFeatureEnabled('auth')
        },
        'storageResetModal': {
            title: 'Сброс кэша',
            icon: 'fas fa-trash-alt',
            description: 'Выборочное удаление данных из кэша',
            bodyComponent: 'storage-reset-modal-body',
            centered: true,
            autoRegister: true // Не требует props
        },
        'portfoliosImportModal': {
            title: 'Импорт портфелей',
            icon: 'fas fa-file-import',
            description: 'Выборочный импорт портфелей из JSON',
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
            autoRegister: false // Требует props (selectedCoinIds, onSave, onCancel)
        },
        'coinSetLoadModal': {
            title: 'Загрузить набор монет',
            icon: 'fas fa-folder-open',
            description: 'Выбор сохраненного набора монет для загрузки',
            bodyComponent: 'coin-set-load-modal-body',
            centered: true,
            autoRegister: false // Требует props (onLoad, onCancel)
        },
        'iconManagerModal': {
            title: 'Управление иконкой',
            icon: 'fas fa-image',
            description: 'Замена иконки монеты на качественную версию в GitHub CDN',
            bodyComponent: 'icon-manager-modal-body',
            centered: true,
            autoRegister: false // Требует props (coinData)
        },
        'sessionLogModal': {
            title: 'Session Log',
            icon: 'fas fa-terminal',
            description: 'Логи сессии для отладки',
            bodyComponent: 'session-log-modal-body',
            centered: true,
            autoRegister: true // Не требует props
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
     * Получить конфигурацию модального окна
     * @param {string} modalId - ID модального окна
     * @returns {Object|null} - Конфигурация или null
     */
    function getModalConfig(modalId) {
        return MODALS_CONFIG[modalId] || null;
    }

    /**
     * Получить заголовок модального окна
     * @param {string} modalId - ID модального окна
     * @returns {string|null} - Заголовок или null
     */
    function getModalTitle(modalId) {
        const config = getModalConfig(modalId);
        return config ? config.title : null;
    }

    /**
     * Получить иконку модального окна
     * @param {string} modalId - ID модального окна
     * @returns {string|null} - Иконка или null
     */
    function getModalIcon(modalId) {
        const config = getModalConfig(modalId);
        return config ? config.icon : null;
    }

    /**
     * Получить список модальных окон для автоматической регистрации (с применением условий)
     * Возвращает только модальные окна с autoRegister: true
     * @returns {Array} - Массив конфигураций модальных окон
     */
    function getRegisteredModals() {
        const modals = [];
        for (const [modalId, config] of Object.entries(MODALS_CONFIG)) {
            // Пропускаем модальные окна без autoRegister или с autoRegister: false
            if (!config.autoRegister) {
                continue;
            }

            // Проверяем условие отображения
            if (config.condition && typeof config.condition === 'function') {
                try {
                    if (!config.condition()) {
                        continue; // Пропускаем модальное окно, если условие не выполнено
                    }
                } catch (error) {
                    console.error(`modals-config: ошибка в condition для модального окна "${modalId}":`, error);
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

    // Экспорт в глобальную область
    window.modalsConfig = {
        MODALS_CONFIG,
        getModalConfig,
        getModalTitle,
        getModalIcon,
        getRegisteredModals
    };

    console.log('modals-config.js: инициализирован');
})();

