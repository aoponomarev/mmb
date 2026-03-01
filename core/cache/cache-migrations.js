/**
 * ================================================================================================
 * CACHE MIGRATIONS - Версионирование и миграции данных кэша
 * ================================================================================================
 *
 * PURPOSE: Обеспечить совместимость при изменении структуры пользовательских данных в кэше.
 * Автоматические миграции применяются при чтении данных старой версии.
 * Skill: core/skills/cache-layer
 *
 * PRINCIPLES:
 * - Каждая запись в кэше содержит поле version (версия схемы данных)
 * - Миграции определяются в объекте MIGRATIONS for каждого ключа
 * - Миграции применяются последовательно от текущей версии к целевой
 * - Обратная совместимость: старые данные автоматически преобразуются в новый формат
 *
 * PRINCIPLES:
 * - Версионирование приложения (v:{hash}:{key}) — for данных из внешних API, автоматическая инвалидация
 * - Миграции схем (version в данных) — for пользовательских данных, сохранение данных при изменении структуры
 *
 * ПРИМЕР:
 * 1. Добавить версию в cache-config.js → VERSIONS.{key}
 * 2. Создать функцию миграции в MIGRATIONS.{key}[version]
 * 3. Миграция должна быть идемпотентной (безопасно применять повторно)
 * 4. Миграция должна обрабатывать все возможные форматы старой версии
 *
 * ПРИМЕР:
 * Если portfolios изменили структуру с v1.0.0 на v1.1.0:
 * 1. Update VERSIONS.portfolios = '1.1.0'
 * 2. Добавить миграцию: MIGRATIONS.portfolios['1.1.0'] = (data) => { return data; }
 *
 * ССЫЛКА: General principles кэширования: core/skills/cache-layer
 */

(function() {
    'use strict';

    const CURRENT_VERSION = '1.0.0';

    /**
     * Миграции for каждого ключа
     * Формат: { key: { '1.0.0': (data) => data, '1.1.0': (data) => migratedData } }
     */
    const MIGRATIONS = {
        // Пример миграции for archivedCoins (если понадобится)
        // 'archived-coins': {
        //     '1.0.0': (data) => data, // Начальная версия
        //     '1.1.0': (data) => {
        //         // Миграция: массив строк → массив объектов
        //         if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'string') {
        //             return data.map(id => ({ id, symbol: '', name: '' }));
        //         }
        //         return data;
        //     }
        // }
    };

    /**
     * Сравнить версии (semver)
     * @param {string} v1 - версия 1
     * @param {string} v2 - версия 2
     * @returns {number} - -1 если v1 < v2, 0 если равны, 1 если v1 > v2
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
     * Применить миграции к данным
     * @param {string} key - ключ кэша
     * @param {Object} cached - объект из кэша { data, version, timestamp, expiresAt }
     * @returns {Object} - мигрированный объект
     */
    async function migrate(key, cached) {
        if (!cached || !cached.version) {
            // Нет версии - считаем текущей
            return { ...cached, version: CURRENT_VERSION };
        }

        if (cached.version === CURRENT_VERSION) {
            // Уже актуальная версия
            return cached;
        }

        const version = cached.version;
        const keyMigrations = MIGRATIONS[key];

        // Если есть специфичные миграции for ключа
        if (keyMigrations) {
            let migratedData = cached.data;
            let currentVersion = version;

            // Применить все миграции от текущей версии до актуальной
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

        // Общая миграция: обновить версию до текущей
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
