/**
 * ================================================================================================
 * MESSAGES MIGRATIONS - Миграции for датасета сообщений
 * ================================================================================================
 *
 * PURPOSE: Управление версиями и миграциями датасета сообщений при изменении структуры.
 * Обеспечивает совместимость данных между версиями приложения.
 * Skill: core/skills/config-contracts
 *
 * PRINCIPLES:
 * - Миграции применяются только при изменении структуры ключей или формата данных
 * - Изменение текстов сообщений не требует миграции
 * - Каждая миграция имеет уникальную версию (v1, v2, v3...)
 * - Миграции выполняются последовательно от текущей версии до целевой
 *
 * КОГДА НУЖНЫ МИГРАЦИИ:
 * - Переименование ключей сообщений (старый ключ → новый ключ)
 * - Изменение структуры данных сообщений (добавление обязательных полей)
 * - Разделение/объединение сообщений
 * - Изменение структуры actions (добавление обязательных параметров)
 *
 * КОГДА НЕ НУЖНЫ МИГРАЦИИ:
 * - Изменение текстов сообщений (просто обновить в messages-config.js)
 * - Добавление новых сообщений (обратная совместимость сохранена)
 * - Изменение приоритетов или типов сообщений
 *
 * USAGE:
 * const migratedData = await window.messagesMigrations.migrate(cacheData, fromVersion, toVersion);
 *
 * REFERENCES:
 * - Конфигурация сообщений: core/config/messages-config.js
 * - Кэш-менеджер: core/cache/cache-manager.js
 * - Аналог for кэша: core/cache/cache-migrations.js
 */

(function() {
    'use strict';

    /**
     * Текущая версия структуры датасета сообщений
     */
    const CURRENT_VERSION = 1;

    /**
     * Реестр миграций
     * Каждая миграция преобразует данные из версии N в версию N+1
     */
    const MIGRATIONS = {
        // Пример миграции v1 → v2
        // v1_to_v2: function(data) {
        //     // Переименование ключа: error.api → error.api.error
        //     const newData = { ...data };
        //     if (newData['error.api']) {
        //         newData['error.api.error'] = newData['error.api'];
        //         delete newData['error.api'];
        //     }
        //     return newData;
        // }
    };

    /**
     * Get версию датасета из кэша
     * @param {Object} cacheData - данные из кэша
     * @returns {number} - версия датасета (по умолчанию 1)
     */
    function getVersion(cacheData) {
        if (!cacheData || typeof cacheData !== 'object') {
            return 1;
        }
        return cacheData.__version__ || 1;
    }

    /**
     * Set версию датасета
     * @param {Object} data - данные
     * @param {number} version - версия
     * @returns {Object} - данные с версией
     */
    function setVersion(data, version) {
        return {
            ...data,
            __version__: version
        };
    }

    /**
     * Выполнить миграцию данных из одной версии в другую
     * @param {Object} data - данные for миграции
     * @param {number} fromVersion - исходная версия
     * @param {number} toVersion - целевая версия
     * @returns {Promise<Object>} - мигрированные данные
     */
    async function migrate(data, fromVersion, toVersion) {
        if (!data || typeof data !== 'object') {
            console.warn('messages-migrations.migrate: некорректные данные for миграции');
            return data;
        }

        if (fromVersion === toVersion) {
            return data; // Миграция не требуется
        }

        if (fromVersion > toVersion) {
            console.warn(`messages-migrations.migrate: даунгрейд не поддерживается (${fromVersion} → ${toVersion})`);
            return data;
        }

        let currentData = { ...data };
        let currentVersion = fromVersion;

        // Последовательное применение миграций
        while (currentVersion < toVersion) {
            const migrationKey = `v${currentVersion}_to_v${currentVersion + 1}`;
            const migration = MIGRATIONS[migrationKey];

            if (!migration) {
                console.warn(`messages-migrations.migrate: миграция ${migrationKey} не найдена, пропускаем`);
                currentVersion++;
                continue;
            }

            try {
                currentData = migration(currentData);
                currentVersion++;
                console.log(`messages-migrations.migrate: применена миграция ${migrationKey}`);
            } catch (error) {
                console.error(`messages-migrations.migrate: ошибка при применении миграции ${migrationKey}:`, error);
                throw error;
            }
        }

        // Устанавливаем новую версию
        return setVersion(currentData, toVersion);
    }

    /**
     * Мигрировать данные к текущей версии
     * @param {Object} cacheData - данные из кэша
     * @returns {Promise<Object>} - мигрированные данные
     */
    async function migrateToLatest(cacheData) {
        const fromVersion = getVersion(cacheData);
        return migrate(cacheData, fromVersion, CURRENT_VERSION);
    }

    /**
     * Проверить, требуется ли миграция
     * @param {Object} cacheData - данные из кэша
     * @returns {boolean} - true если требуется миграция
     */
    function needsMigration(cacheData) {
        const version = getVersion(cacheData);
        return version < CURRENT_VERSION;
    }

    /**
     * Очистить метаданные миграции (версия) из данных
     * @param {Object} data - данные
     * @returns {Object} - данные без метаданных
     */
    function stripMetadata(data) {
        if (!data || typeof data !== 'object') {
            return data;
        }
        const { __version__, ...cleanData } = data;
        return cleanData;
    }

    // Export to global scope
    window.messagesMigrations = {
        CURRENT_VERSION,
        getVersion,
        setVersion,
        migrate,
        migrateToLatest,
        needsMigration,
        stripMetadata
    };

    console.log('messages-migrations.js: initialized');
})();
