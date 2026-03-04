/**
 * #JS-FWhpDFTW
 * @description Schema migrations for cache user data; auto-apply when reading old-version data.
 * @skill id:sk-3c832d
 *
 * PURPOSE: Keep cache compatible when user data structure changes; app versioning (v:{hash}:) is separate.
 *
 * PRINCIPLES:
 * - Version field in cache entry; MIGRATIONS per key; apply sequentially; idempotent migrations
 * - App versioning: external API data, auto invalidation. Schema migrations: user data, preserve on structure change
 *
 * HOW TO ADD MIGRATION:
 * 1. Set VERSIONS.{key} in cache-config.js
 * 2. Add MIGRATIONS.{key}[version] = (data) => migratedData; handle all old formats
 *
 * EXAMPLE: If portfolios change structure from v1.0.0 to v1.1.0 — update VERSIONS.portfolios = '1.1.0', add MIGRATIONS.portfolios['1.1.0'] = (data) => { ... }.
 *
 * REFERENCES:
 * - cache-config.js for VERSIONS; General caching: id:sk-3c832d
 */

(function() {
    'use strict';

    const CURRENT_VERSION = '1.0.0';

    /**
     * Migrations per key
     * Format: { key: { '1.0.0': (data) => data, '1.1.0': (data) => migratedData } }
     */
    const MIGRATIONS = {
        // Example migration for archivedCoins (if needed)
        // 'archived-coins': {
        //     '1.0.0': (data) => data, // Initial version
        //     '1.1.0': (data) => {
        //         // Migration: string array → object array
        //         if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'string') {
        //             return data.map(id => ({ id, symbol: '', name: '' }));
        //         }
        //         return data;
        //     }
        // }
    };

    /**
     * Compare versions (semver)
     * @param {string} v1 - version 1
     * @param {string} v2 - version 2
     * @returns {number} - -1 if v1 < v2, 0 if equal, 1 if v1 > v2
     */
    function compareVersions(v1, v2) {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);

        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const part1 = parts1[i] || 0;
            const part2 = parts2[i] || 0;

            if (part1 < part2) return -1;
            if (part1 > part2) return 1;
        }

        return 0;
    }

    /**
     * Apply migrations to data
     * @param {string} key - cache key
     * @param {Object} cached - cache object { data, version, timestamp, expiresAt }
     * @returns {Object} - migrated object
     */
    async function migrate(key, cached) {
        if (!cached || !cached.version) {
            // No version - treat as current
            return { ...cached, version: CURRENT_VERSION };
        }

        if (cached.version === CURRENT_VERSION) {
            // Already current version
            return cached;
        }

        const version = cached.version;
        const keyMigrations = MIGRATIONS[key];

        // If key has specific migrations
        if (keyMigrations) {
            let migratedData = cached.data;
            let currentVersion = version;

            // Apply all migrations from current to target version
            const versions = Object.keys(keyMigrations).sort(compareVersions);
            for (const targetVersion of versions) {
                if (compareVersions(currentVersion, targetVersion) < 0) {
                    const migrationFn = keyMigrations[targetVersion];
                    if (migrationFn) {
                        migratedData = migrationFn(migratedData);
                        currentVersion = targetVersion;
                    }
                }
            }

            return {
                ...cached,
                data: migratedData,
                version: CURRENT_VERSION
            };
        }

        // General migration: update version to current
        if (compareVersions(version, CURRENT_VERSION) < 0) {
            return {
                ...cached,
                version: CURRENT_VERSION
            };
        }

        return cached;
    }

    // Export to global scope
    window.cacheMigrations = {
        CURRENT_VERSION,
        MIGRATIONS,
        migrate,
        compareVersions
    };

    console.log('cache-migrations.js: initialized');
})();
