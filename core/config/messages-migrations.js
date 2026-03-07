/**
 * #JS-YC3DocUN
 * @description Version and migration for messages dataset when structure changes; data compatibility between app versions.
 * @skill id:sk-02d3ea
 *
 * PURPOSE: Run migrations sequentially; apply only when key structure or data format changes; changing texts does not require migration.
 *
 * PRINCIPLES:
 * - Each migration has unique version (v1, v2, v3...); run from current to target
 * - When needed: key rename, structure change (required fields), splitting/merging messages, action structure change
 * - When not needed: changing texts (update messages-config.js), adding new messages, changing priorities/types
 *
 * USAGE:
 * const migratedData = await window.messagesMigrations.migrate(cacheData, fromVersion, toVersion);
 *
 * REFERENCES:
 * - Messages config: #JS-2Z2J49xj (messages-config.js)
 * - Cache manager: #JS-XsMewXpA (cache-manager.js)
 * - Cache analogue: #JS-FWhpDFTW (cache-migrations.js)
 */

(function() {
    'use strict';

    /**
     * Current version of messages dataset structure
     */
    const CURRENT_VERSION = 1;

    /**
     * Migration registry
     * Each migration transforms data from version N to N+1
     */
    const MIGRATIONS = {
        // Example migration v1 → v2
        // v1_to_v2: function(data) {
        //     // Key rename: error.api → error.api.error
        //     const newData = { ...data };
        //     if (newData['error.api']) {
        //         newData['error.api.error'] = newData['error.api'];
        //         delete newData['error.api'];
        //     }
        //     return newData;
        // }
    };

    /**
     * Get dataset version from cache
     * @param {Object} cacheData - data from cache
     * @returns {number} - dataset version (default 1)
     */
    function getVersion(cacheData) {
        if (!cacheData || typeof cacheData !== 'object') {
            return 1;
        }
        return cacheData.__version__ || 1;
    }

    /**
     * Set dataset version
     * @param {Object} data - data
     * @param {number} version - version
     * @returns {Object} - data with version
     */
    function setVersion(data, version) {
        return {
            ...data,
            __version__: version
        };
    }

    /**
     * Run migration from one version to another
     * @param {Object} data - data for migration
     * @param {number} fromVersion - source version
     * @param {number} toVersion - target version
     * @returns {Promise<Object>} - migrated data
     */
    async function migrate(data, fromVersion, toVersion) {
        if (!data || typeof data !== 'object') {
            console.warn('messages-migrations.migrate: некорректные данные for миграции');
            return data;
        }

        if (fromVersion === toVersion) {
            return data; // No migration needed
        }

        if (fromVersion > toVersion) {
            console.warn(`messages-migrations.migrate: даунгрейд не поддерживается (${fromVersion} → ${toVersion})`);
            return data;
        }

        let currentData = { ...data };
        let currentVersion = fromVersion;

        // Sequential application of migrations
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

        // Set new version
        return setVersion(currentData, toVersion);
    }

    /**
     * Migrate data to current version
     * @param {Object} cacheData - data from cache
     * @returns {Promise<Object>} - migrated data
     */
    async function migrateToLatest(cacheData) {
        const fromVersion = getVersion(cacheData);
        return migrate(cacheData, fromVersion, CURRENT_VERSION);
    }

    /**
     * Check if migration is required
     * @param {Object} cacheData - data from cache
     * @returns {boolean} - true if migration required
     */
    function needsMigration(cacheData) {
        const version = getVersion(cacheData);
        return version < CURRENT_VERSION;
    }

    /**
     * Strip migration metadata (version) from data
     * @param {Object} data - data
     * @returns {Object} - data without metadata
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
