/**
 * ================================================================================================
 * MODULES CONFIG - Конфигурация модулей for модульной системы загрузки
 * ================================================================================================
 * Skill: core/skills/state-events
 *
 * PURPOSE: Централизованное описание всех модулей приложения с их зависимостями.
 * Используется модульным загрузчиком (core/module-loader.js) for автоматической
 * загрузки модулей в правильном порядке.
 *
 * PRINCIPLES:
 * - Модули группируются по категориям: utilities, core, templates, components, app
 * - Каждый модуль описывает свои зависимости через массив deps
 * - Загрузчик автоматически разрешает зависимости и загружает модули в правильном порядке
 * - Поддержка внешних модулей (type: 'external') и локальных (type: 'local')
 *
 * PRINCIPLES:
 * {
 *   id: 'unique-id',           // Уникальный идентификатор модуля
 *   src: 'path/to/module.js',   // Path к модулю
 *   type: 'local' | 'external', // Тип модуля
 *   deps: ['dep-id-1', 'dep-id-2'], // Массив ID зависимостей
 *   category: 'utilities' | 'core' | 'templates' | 'libraries' | 'components' | 'app', // Категория
 *   condition: function() { return true; } // Опциональная функция for условной загрузки (feature flag)
 * }
 *
 * ШАБЛОНЫ КОМПОНЕНТОВ (двухуровневая система):
 * - Компоненты с большим HTML используют отдельные *-template.js файлы (категория templates).
 *   Шаблон вставляется в DOM как <script type="text/x-template"> и ссылается через template: '#id'.
 * - Компоненты с компактным HTML хранят шаблон inline в строке template: `...`.
 *   Отдельный файл шаблона for них НЕ нужен.
 *
 * ВАЖНО:
 * - Порядок модулей в массивах не важен - загрузчик сам определит правильный порядок
 * - Зависимости указываются через ID модулей
 * - Циклические зависимости будут обнаружены и вызовут ошибку
 *
 * ССЫЛКА: Принципы модульной системы описаны в `is/skills/arch-foundation`
 */

(function() {
    'use strict';

    /**
     * Конфигурация всех модулей приложения
     */
    window.modulesConfig = {
        // Утилиты (загружаются первыми, до Vue.js)
        utilities: [
            {
                id: 'hash-generator',
                src: 'shared/utils/hash-generator.js',
                type: 'local',
                deps: [],
                category: 'utilities'
            },
            {
                id: 'auto-markup',
                src: 'shared/utils/auto-markup.js',
                type: 'local',
                deps: ['hash-generator'],
                category: 'utilities'
            },
            {
                id: 'pluralize',
                src: 'shared/utils/pluralize.js',
                type: 'local',
                deps: [],
                category: 'utilities'
            },
            {
                id: 'class-manager',
                src: 'shared/utils/class-manager.js',
                type: 'local',
                deps: [],
                category: 'utilities'
            },
            {
                id: 'column-visibility-mixin',
                src: 'shared/utils/column-visibility-mixin.js',
                type: 'local',
                deps: [],
                category: 'utilities'
            },
            {
                id: 'layout-sync',
                src: 'shared/utils/layout-sync.js',
                type: 'local',
                deps: [],
                category: 'utilities'
            },
            {
                id: 'draft-coin-set',
                src: 'core/utils/draft-coin-set.js',
                type: 'local',
                deps: [],
                category: 'utilities'
            },
            {
                id: 'ban-coin-set',
                src: 'core/utils/ban-coin-set.js',
                type: 'local',
                deps: [],
                category: 'utilities'
            },
            // session-log-store и console-interceptor загружаются синхронно в index.html ДО модульной системы
            // for перехвата всех логов с самого начала загрузки страницы
            // Поэтому они не включены в модульную систему, чтобы избежать повторной загрузки
            {
                id: 'favorites-manager',
                src: 'core/utils/favorites-manager.js',
                type: 'local',
                deps: ['coin-sets-client', 'auth-state', 'event-bus'],
                category: 'utilities'
            }
        ],

        // Core модули (бизнес-логика, кэш, валидация)
        core: [
            // I18n конфигурация (загружается первой, т.к. using в tooltips и messages)
            {
                id: 'i18n-config',
                src: 'core/config/i18n-config.js',
                type: 'local',
                deps: [],
                category: 'core'
            },
            // Cache модули
            {
                id: 'storage-layers',
                src: 'core/cache/storage-layers.js',
                type: 'local',
                deps: [],
                category: 'core'
            },
            {
                id: 'ssot-policies',
                src: 'core/ssot/policies.js',
                type: 'local',
                deps: [],
                category: 'core'
            },
            {
                id: 'cache-config',
                src: 'core/cache/cache-config.js',
                type: 'local',
                deps: ['ssot-policies'],
                category: 'core'
            },
            {
                id: 'cache-migrations',
                src: 'core/cache/cache-migrations.js',
                type: 'local',
                deps: [],
                category: 'core'
            },
            {
                id: 'cache-manager',
                src: 'core/cache/cache-manager.js',
                type: 'local',
                deps: ['storage-layers', 'cache-config', 'cache-migrations'],
                category: 'core'
            },
            {
                id: 'cache-cleanup',
                src: 'core/cache/cache-cleanup.js',
                type: 'local',
                deps: ['cache-manager'],
                category: 'core'
            },
            {
                id: 'cache-indexes',
                src: 'core/cache/cache-indexes.js',
                type: 'local',
                deps: ['cache-manager'],
                category: 'core'
            },
            // Validation модули
            {
                id: 'validation-schemas',
                src: 'core/validation/schemas.js',
                type: 'local',
                deps: [],
                category: 'core'
            },
            {
                id: 'validator',
                src: 'core/validation/validator.js',
                type: 'local',
                deps: ['validation-schemas'],
                category: 'core'
            },
            {
                id: 'normalizer',
                src: 'core/validation/normalizer.js',
                type: 'local',
                deps: [],
                category: 'core'
            },
            {
                id: 'math-validation',
                src: 'core/validation/math-validation.js',
                type: 'local',
                deps: [],
                category: 'core'
            },
            // Error handling
            {
                id: 'error-types',
                src: 'core/errors/error-types.js',
                type: 'local',
                deps: [],
                category: 'core'
            },
            {
                id: 'error-handler',
                src: 'core/errors/error-handler.js',
                type: 'local',
                deps: ['error-types'],
                category: 'core'
            },
            {
                id: 'icon-manager',
                src: 'core/api/icon-manager.js',
                type: 'local',
                deps: ['app-config'],
                category: 'core'
            },
            // API
            {
                id: 'rate-limiter',
                src: 'core/api/rate-limiter.js',
                type: 'local',
                deps: [],
                category: 'core'
            },
            {
                id: 'market-metrics',
                src: 'core/api/market-metrics.js',
                type: 'local',
                deps: [],
                category: 'core'
            },
            {
                id: 'base-model-calculator',
                src: 'mm/base-model-calculator.js',
                type: 'local',
                deps: [],
                category: 'core'
            },
            {
                id: 'median-air-260101-calculator',
                src: 'mm/median/air/260101/median-air-260101-calculator.js',
                type: 'local',
                deps: ['base-model-calculator'],
                category: 'core'
            },
            {
                id: 'median-air-260115-calculator',
                src: 'mm/median/air/260115/median-air-260115-calculator.js',
                type: 'local',
                deps: ['base-model-calculator'],
                category: 'core'
            },
            {
                id: 'model-manager',
                src: 'mm/model-manager.js',
                type: 'local',
                deps: ['median-air-260101-calculator', 'median-air-260115-calculator'],
                category: 'core'
            },
            // AI Providers
            {
                id: 'base-provider',
                src: 'core/api/ai-providers/base-provider.js',
                type: 'local',
                deps: [],
                category: 'core'
            },
            {
                id: 'yandex-provider',
                src: 'core/api/ai-providers/yandex-provider.js',
                type: 'local',
                deps: ['base-provider'],
                category: 'core'
            },
            {
                id: 'ai-provider-manager',
                src: 'core/api/ai-provider-manager.js',
                type: 'local',
                deps: ['yandex-provider'],
                category: 'core'
            },
            {
                id: 'tooltip-interpreter',
                src: 'core/api/tooltip-interpreter.js',
                type: 'local',
                deps: ['tooltips-config', 'i18n-config'],
                category: 'core'
            },
            // Data Providers (for работы с внешними источниками данных о монетах)
            {
                id: 'base-data-provider',
                src: 'core/api/data-providers/base-provider.js',
                type: 'local',
                deps: [],
                category: 'core'
            },
            {
                id: 'coingecko-provider',
                src: 'core/api/data-providers/coingecko-provider.js',
                type: 'local',
                deps: ['base-data-provider', 'data-providers-config', 'rate-limiter', 'icon-manager'],
                category: 'core'
            },
            {
                id: 'yandex-cache-provider',
                src: 'core/api/data-providers/yandex-cache-provider.js',
                type: 'local',
                deps: ['base-data-provider'],
                category: 'core'
            },
            {
                id: 'request-registry',
                src: 'core/api/request-registry.js',
                type: 'local',
                deps: [],
                category: 'core'
            },
            {
                id: 'data-provider-manager',
                src: 'core/api/data-provider-manager.js',
                type: 'local',
                deps: ['coingecko-provider', 'yandex-cache-provider', 'cache-manager', 'request-registry'],
                category: 'core'
            },
            // Config
            {
                id: 'data-providers-config',
                src: 'core/config/data-providers-config.js',
                type: 'local',
                deps: [],
                category: 'core'
            },
            {
                id: 'api-config',
                src: 'core/config/api-config.js',
                type: 'local',
                deps: [],
                category: 'core'
            },
            {
                id: 'app-config',
                src: 'core/config/app-config.js',
                type: 'local',
                deps: [],
                category: 'core'
            },
            {
                id: 'models-config',
                src: 'core/config/models-config.js',
                type: 'local',
                deps: [],
                category: 'core'
            },
            {
                id: 'portfolio-config',
                src: 'core/config/portfolio-config.js',
                type: 'local',
                deps: ['models-config', 'portfolio-engine', 'portfolio-validation', 'portfolio-adapters'],
                category: 'core'
            },
            {
                id: 'portfolio-engine',
                src: 'core/domain/portfolio-engine.js',
                type: 'local',
                deps: [],
                category: 'core'
            },
            {
                id: 'portfolio-validation',
                src: 'core/domain/portfolio-validation.js',
                type: 'local',
                deps: ['portfolio-engine'],
                category: 'core'
            },
            {
                id: 'portfolio-adapters',
                src: 'core/domain/portfolio-adapters.js',
                type: 'local',
                deps: ['portfolio-engine'],
                category: 'core'
            },
            {
                id: 'auth-config',
                src: 'core/config/auth-config.js',
                type: 'local',
                deps: [],
                category: 'core',
                condition: () => window.appConfig && window.appConfig.isFeatureEnabled('auth')
            },
            {
                id: 'cloudflare-config',
                src: 'core/config/cloudflare-config.js',
                type: 'local',
                deps: [],
                category: 'core'
                // Условие удалено - config нужен for auth и cloudSync
            },
            {
                id: 'postgres-config',
                src: 'core/config/postgres-config.js',
                type: 'local',
                deps: [],
                category: 'core'
            },
            {
                id: 'postgres-client',
                src: 'core/api/postgres-client.js',
                type: 'local',
                deps: ['postgres-config'],
                category: 'core'
            },
            {
                id: 'auth-client',
                src: 'core/api/cloudflare/auth-client.js',
                type: 'local',
                deps: ['auth-config', 'cloudflare-config', 'cache-manager', 'error-handler'],
                category: 'core',
                condition: () => window.appConfig && window.appConfig.isFeatureEnabled('auth')
            },
            {
                id: 'portfolios-client',
                src: 'core/api/cloudflare/portfolios-client.js',
                type: 'local',
                deps: ['cloudflare-config', 'auth-client', 'error-handler'],
                category: 'core',
                condition: () => window.appConfig && window.appConfig.isFeatureEnabled('cloudSync') && window.appConfig.isFeatureEnabled('portfolios')
            },
            {
                id: 'coin-sets-client',
                src: 'core/api/cloudflare/coin-sets-client.js',
                type: 'local',
                deps: ['cloudflare-config', 'auth-client'],
                category: 'core',
                condition: () => window.appConfig && window.appConfig.isFeatureEnabled('auth')
            },
            {
                id: 'datasets-client',
                src: 'core/api/cloudflare/datasets-client.js',
                type: 'local',
                deps: ['cloudflare-config', 'auth-client', 'error-handler'],
                category: 'core',
                condition: () => window.appConfig && window.appConfig.isFeatureEnabled('cloudSync')
            },
            // Proxy utilities
            {
                id: 'proxy-health-check',
                src: 'core/utils/proxy-health-check.js',
                type: 'local',
                deps: [],
                category: 'core'
            },
            {
                id: 'modals-config',
                src: 'core/config/modals-config.js',
                type: 'local',
                deps: [],
                category: 'core'
            },
            {
                id: 'tooltips-config',
                src: 'core/config/tooltips-config.js',
                type: 'local',
                deps: ['i18n-config'],
                category: 'core'
            },
            {
                id: 'menus-config',
                src: 'core/config/menus-config.js',
                type: 'local',
                deps: ['modals-config'],
                category: 'core'
            },
            {
                id: 'workspace-config',
                src: 'core/config/workspace-config.js',
                type: 'local',
                deps: ['cache-manager', 'models-config'],
                category: 'core'
            },
            {
                id: 'coins-config',
                src: 'core/config/coins-config.js',
                type: 'local',
                deps: [],
                category: 'core'
            },
            {
                id: 'auto-coin-sets',
                src: 'core/utils/auto-coin-sets.js',
                type: 'local',
                deps: ['coins-config'],
                category: 'core'
            },
            {
                id: 'coingecko-stablecoins-loader',
                src: 'core/api/coingecko-stablecoins-loader.js',
                type: 'local',
                deps: ['coins-config', 'cache-manager'],
                category: 'core'
            },
            {
                id: 'coins-metadata-loader',
                src: 'core/api/coins-metadata-loader.js',
                type: 'local',
                deps: ['coins-config', 'cache-manager', 'app-config'],
                category: 'core'
            },
            {
                id: 'coins-metadata-generator',
                src: 'core/api/coins-metadata-generator.js',
                type: 'local',
                deps: ['coingecko-stablecoins-loader', 'cloudflare-config'],
                category: 'core'
            },
            {
                id: 'messages-config',
                src: 'core/config/messages-config.js',
                type: 'local',
                deps: ['app-config', 'cache-manager', 'i18n-config'],
                category: 'core'
            },
            {
                id: 'messages-translator',
                src: 'core/api/messages-translator.js',
                type: 'local',
                deps: ['messages-config', 'i18n-config', 'ai-provider-manager'],
                category: 'core'
            },
            {
                id: 'messages-migrations',
                src: 'core/config/messages-migrations.js',
                type: 'local',
                deps: [],
                category: 'core'
            },
            // Events
            {
                id: 'event-bus',
                src: 'core/events/event-bus.js',
                type: 'local',
                deps: [],
                category: 'core'
            },
            {
                id: 'fallback-monitor',
                src: 'core/observability/fallback-monitor.js',
                type: 'local',
                deps: ['event-bus'],
                category: 'core'
            },
            // State
            {
                id: 'loading-state',
                src: 'core/state/loading-state.js',
                type: 'local',
                deps: [],
                category: 'core'
            },
            {
                id: 'auth-state',
                src: 'core/state/auth-state.js',
                type: 'local',
                deps: ['vue', 'event-bus', 'ui-state'],
                category: 'core'
            },
            {
                id: 'ui-state',
                src: 'core/state/ui-state.js',
                type: 'local',
                deps: ['vue', 'event-bus'],
                category: 'core'
            },
            // Logging
            {
                id: 'logger',
                src: 'core/logging/logger.js',
                type: 'local',
                deps: [],
                category: 'core'
            }
        ],

        // Шаблоны (загружаются до Vue.js)
        templates: [
            {
                id: 'sortable-header-template',
                src: 'shared/templates/sortable-header-template.js',
                type: 'local',
                deps: [],
                category: 'templates'
            },
            {
                id: 'cell-num-template',
                src: 'shared/templates/cell-num-template.js',
                type: 'local',
                deps: [],
                category: 'templates'
            },
            {
                id: 'coin-block-template',
                src: 'shared/templates/coin-block-template.js',
                type: 'local',
                deps: [],
                category: 'templates'
            },
            {
                id: 'button-template',
                src: 'shared/templates/button-template.js',
                type: 'local',
                deps: [],
                category: 'templates'
            },
            {
                id: 'dropdown-menu-item-template',
                src: 'shared/templates/dropdown-menu-item-template.js',
                type: 'local',
                deps: [],
                category: 'templates'
            },
            {
                id: 'dropdown-template',
                src: 'shared/templates/dropdown-template.js',
                type: 'local',
                deps: [],
                category: 'templates'
            },
            {
                id: 'combobox-template',
                src: 'shared/templates/combobox-template.js',
                type: 'local',
                deps: [],
                category: 'templates'
            },
            {
                id: 'button-group-template',
                src: 'shared/templates/button-group-template.js',
                type: 'local',
                deps: [],
                category: 'templates'
            },
            {
                id: 'modal-template',
                src: 'shared/templates/modal-template.js',
                type: 'local',
                deps: [],
                category: 'templates'
            },
            {
                id: 'modal-buttons-template',
                src: 'shared/templates/modal-buttons-template.js',
                type: 'local',
                deps: [],
                category: 'templates'
            },
            {
                id: 'timezone-selector-template',
                src: 'shared/templates/timezone-selector-template.js',
                type: 'local',
                deps: [],
                category: 'templates'
            },
            {
                id: 'ai-api-settings-template',
                src: 'app/templates/ai-api-settings-template.js',
                type: 'local',
                deps: [],
                category: 'templates'
            },
            {
                id: 'postgres-settings-template',
                src: 'app/templates/postgres-settings-template.js',
                type: 'local',
                deps: [],
                category: 'templates'
            },
            {
                id: 'auth-modal-body-template',
                src: 'app/templates/auth-modal-body-template.js',
                type: 'local',
                deps: [],
                category: 'templates'
            },
            {
                id: 'app-header-template',
                src: 'app/templates/app-header-template.js',
                type: 'local',
                deps: [],
                category: 'templates'
            },
            {
                id: 'auth-button-template',
                src: 'app/templates/auth-button-template.js',
                type: 'local',
                deps: [],
                category: 'templates',
                condition: () => window.appConfig && window.appConfig.isFeatureEnabled('auth')
            },
            {
                id: 'portfolios-manager-template',
                src: 'app/templates/portfolios-manager-template.js',
                type: 'local',
                deps: [],
                category: 'templates',
                condition: () => window.appConfig && window.appConfig.isFeatureEnabled('portfolios') && window.appConfig.isFeatureEnabled('cloudSync')
            },
            {
                id: 'auth-footer-template', // Placeholder for missing template if any, wait
                src: 'app/templates/app-footer-template.js',
                type: 'local',
                deps: [],
                category: 'templates'
            },
            {
                id: 'icon-manager-modal-body-template',
                src: 'app/templates/icon-manager-modal-body-template.js',
                type: 'local',
                deps: [],
                category: 'templates'
            }
        ],

        // Внешние библиотеки (загружаются после шаблонов, до компонентов)
        libraries: [
            {
                id: 'vue',
                src: 'https://unpkg.com/vue@3/dist/vue.global.prod.js',
                type: 'external',
                deps: ['button-template', 'dropdown-menu-item-template', 'dropdown-template', 'combobox-template', 'button-group-template', 'modal-template', 'timezone-selector-template'],
                category: 'libraries'
            }
        ],

        // Vue компоненты (загружаются после Vue.js)
        components: [
            // Утилиты for компонентов
            {
                id: 'messages-store',
                src: 'shared/utils/messages-store.js',
                type: 'local',
                deps: ['vue'],
                category: 'components'
            },
            // Shared компоненты
            {
                id: 'coin-block',
                src: 'shared/components/coin-block.js',
                type: 'local',
                deps: ['vue', 'hash-generator', 'dropdown', 'dropdown-menu-item'],
                category: 'components'
            },
            {
                id: 'cell-num',
                src: 'shared/components/cell-num.js',
                type: 'local',
                deps: ['vue'],
                category: 'components'
            },
            {
                id: 'sortable-header',
                src: 'shared/components/sortable-header.js',
                type: 'local',
                deps: ['vue'],
                category: 'components'
            },
            {
                id: 'dropdown-menu-item',
                src: 'shared/components/dropdown-menu-item.js',
                type: 'local',
                deps: ['vue'],
                category: 'components'
            },
            {
                id: 'button',
                src: 'shared/components/button.js',
                type: 'local',
                deps: ['vue', 'hash-generator', 'auto-markup'],
                category: 'components'
            },
            {
                id: 'dropdown',
                src: 'shared/components/dropdown.js',
                type: 'local',
                deps: ['vue', 'button', 'hash-generator', 'auto-markup'],
                category: 'components'
            },
            {
                id: 'combobox',
                src: 'shared/components/combobox.js',
                type: 'local',
                deps: ['vue', 'dropdown', 'button'],
                category: 'components'
            },
            {
                id: 'button-group',
                src: 'shared/components/button-group.js',
                type: 'local',
                deps: ['vue', 'button', 'dropdown', 'dropdown-menu-item', 'hash-generator', 'auto-markup'],
                category: 'components'
            },
            {
                id: 'app-header',
                src: 'app/components/app-header.js',
                type: 'local',
                deps: ['vue', 'dropdown'],
                category: 'components'
            },
            {
                id: 'app-footer',
                src: 'app/components/app-footer.js',
                type: 'local',
                deps: ['vue', 'market-metrics'],
                category: 'components'
            },
            {
                id: 'modal',
                src: 'shared/components/modal.js',
                type: 'local',
                deps: ['vue', 'modal-buttons-template', 'modal-buttons', 'modals-config'],
                category: 'components'
            },
            {
                id: 'modal-buttons',
                src: 'shared/components/modal-buttons.js',
                type: 'local',
                deps: ['vue', 'button', 'modal-buttons-template'],
                category: 'components'
            },
            {
                id: 'system-message',
                src: 'shared/components/system-message.js',
                type: 'local',
                deps: ['vue', 'messages-store'],
                category: 'components'
            },
            {
                id: 'system-messages',
                src: 'shared/components/system-messages.js',
                type: 'local',
                deps: ['vue', 'system-message', 'messages-store', 'messages-config'],
                category: 'components'
            },
            {
                id: 'timezone-selector',
                src: 'shared/components/timezone-selector.js',
                type: 'local',
                deps: ['vue', 'timezone-selector-template'],
                category: 'components'
            },
            {
                id: 'modal-example-body',
                src: 'app/components/modal-example-body.js',
                type: 'local',
                deps: ['vue', 'modal'],
                category: 'components'
            },
            {
                id: 'ai-api-settings',
                src: 'app/components/ai-api-settings.js',
                type: 'local',
                deps: ['vue', 'modal', 'ai-api-settings-template', 'ai-provider-manager'],
                category: 'components'
            },
            {
                id: 'postgres-settings',
                src: 'app/components/postgres-settings.js',
                type: 'local',
                deps: ['vue', 'modal', 'postgres-settings-template', 'postgres-config', 'postgres-client', 'ui-state'],
                category: 'components'
            },
            {
                id: 'timezone-modal-body',
                src: 'app/components/timezone-modal-body.js',
                type: 'local',
                deps: ['vue', 'modal', 'timezone-selector'],
                category: 'components'
            },
            {
                id: 'storage-reset-modal-body',
                src: 'app/components/storage-reset-modal-body.js',
                type: 'local',
                deps: ['vue', 'modal', 'cache-manager'],
                category: 'components'
            },
            {
                id: 'portfolios-import-modal-body',
                src: 'app/components/portfolios-import-modal-body.js',
                type: 'local',
                deps: ['vue', 'modal', 'portfolio-config', 'event-bus'],
                category: 'components'
            },
            {
                id: 'auth-modal-body',
                src: 'app/components/auth-modal-body.js',
                type: 'local',
                deps: ['vue', 'modal', 'auth-modal-body-template', 'auth-client', 'auth-state'],
                category: 'components',
                condition: () => window.appConfig && window.appConfig.isFeatureEnabled('auth')
            },
            {
                id: 'auth-button',
                src: 'app/components/auth-button.js',
                type: 'local',
                deps: ['vue', 'button', 'dropdown', 'dropdown-menu-item', 'auth-client'],
                category: 'components',
                condition: () => window.appConfig && window.appConfig.isFeatureEnabled('auth')
            },
            {
                id: 'portfolio-modal-body',
                src: 'app/components/portfolio-modal-body.js',
                type: 'local',
                deps: ['vue', 'button'],
                category: 'components',
                condition: () => window.appConfig && window.appConfig.isFeatureEnabled('portfolios') && window.appConfig.isFeatureEnabled('cloudSync')
            },
            {
                id: 'portfolios-manager',
                src: 'app/components/portfolios-manager.js',
                type: 'local',
                deps: ['vue', 'button', 'modal', 'portfolio-modal-body', 'portfolios-client'],
                category: 'components',
                condition: () => window.appConfig && window.appConfig.isFeatureEnabled('portfolios') && window.appConfig.isFeatureEnabled('cloudSync')
            },
            {
                id: 'coin-set-save-modal-body',
                src: 'app/components/coin-set-save-modal-body.js',
                type: 'local',
                deps: ['vue', 'modal'],
                category: 'components'
            },
            {
                id: 'portfolio-form-modal-body',
                src: 'app/components/portfolio-form-modal-body.js',
                type: 'local',
                deps: ['vue', 'modal', 'portfolio-config', 'cell-num'],
                category: 'components'
            },
            {
                id: 'portfolio-view-modal-body',
                src: 'app/components/portfolio-view-modal-body.js',
                type: 'local',
                deps: ['vue', 'modal', 'portfolio-config', 'cell-num'],
                category: 'components'
            },
            {
                id: 'coin-set-load-modal-body',
                src: 'app/components/coin-set-load-modal-body.js',
                type: 'local',
                deps: ['vue', 'modal', 'dropdown', 'button', 'event-bus', 'auth-state', 'coin-sets-client', 'cache-manager', 'data-provider-manager'],
                category: 'components'
            },
            {
                id: 'missing-coins-modal-body',
                src: 'app/components/missing-coins-modal-body.js',
                type: 'local',
                deps: ['vue', 'modal', 'button', 'dropdown', 'data-provider-manager'],
                category: 'components'
            },
            {
                id: 'session-log-modal-body',
                src: 'app/components/session-log-modal-body.js',
                type: 'local',
                deps: ['vue', 'modal', 'event-bus'],
                // session-log-store загружается синхронно в index.html ДО модульной системы,
                // поэтому не указываем его как зависимость (он уже доступен глобально)
                category: 'components'
            },
            {
                id: 'icon-manager-modal-body',
                src: 'app/components/icon-manager-modal-body.js',
                type: 'local',
                deps: ['vue', 'modal', 'icon-manager-modal-body-template', 'icon-manager'],
                category: 'components'
            },
            {
                id: 'coingecko-cron-history-modal-body',
                src: 'app/components/coingecko-cron-history-modal-body.js',
                type: 'local',
                deps: ['vue', 'modal'],
                category: 'components'
            }
        ],

        // Приложение (загружается последним)
        app: [
            {
                id: 'app-ui-root',
                src: 'app/app-ui-root.js',
                type: 'local',
                deps: ['dropdown-menu-item', 'button', 'dropdown', 'combobox', 'button-group', 'app-header', 'app-footer', 'modal', 'modal-buttons', 'modal-example-body', 'ai-api-settings', 'postgres-settings', 'timezone-modal-body', 'auth-modal-body', 'storage-reset-modal-body', 'portfolios-import-modal-body', 'icon-manager-modal-body', 'coin-set-save-modal-body', 'coin-set-load-modal-body', 'missing-coins-modal-body', 'session-log-modal-body', 'coingecko-cron-history-modal-body', 'menus-config', 'workspace-config', 'models-config', 'portfolio-config', 'portfolio-form-modal-body', 'portfolio-view-modal-body', 'coins-config', 'coingecko-stablecoins-loader', 'coins-metadata-loader', 'coins-metadata-generator', 'cloudflare-config', 'column-visibility-mixin', 'ui-state'],
                category: 'app'
            }
        ]
    };
})();

