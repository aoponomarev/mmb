/**
 * ================================================================================================
 * CACHE MIGRATIONS - Cache data versioning and migrations
 * ================================================================================================
 *
 * PURPOSE: Ensure compatibility when user data structure in cache changes.
 * Automatic migrations apply when reading data from old version.
 * Skill: core/skills/cache-layer
 *
 * PRINCIPLES:
 * - Each cache entry contains version field (data schema version)
 * - Migrations defined in MIGRATIONS object per key
 * - Migrations applied sequentially from current to target version
 * - Backward compatibility: old data auto-converted to new format
 *
 * PRINCIPLES:
 * - App versioning (v:{hash}:{key}) — for data from external APIs, auto invalidation
 * - Schema migrations (version in data) — for user data, preserve data when structure changes
 *
 * EXAMPLE:
 * 1. Add version in cache-config.js → VERSIONS.{key}
 * 2. Create migration function in MIGRATIONS.{key}[version]
 * 3. Migration must be idempotent (safe to apply repeatedly)
 * 4. Migration must handle all possible old version formats
 *
 * EXAMPLE:
 * If portfolios changed structure from v1.0.0 to v1.1.0:
 * 1. Update VERSIONS.portfolios = '1.1.0'
 * 2. Add migration: MIGRATIONS.portfolios['1.1.0'] = (data) => { return data; }
 *
 * REFERENCE: General caching principles: core/skills/cache-layer
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
