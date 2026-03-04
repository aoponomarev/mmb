/**
 * #JS-UbWXkUYK
 * @description IndexedDB index definitions for fast lookup; config only (implementation when IndexedDB added).
 * @skill id:sk-3c832d
 *
 * PURPOSE: Define indexes per table; index fields for WHERE/ORDER BY; composite indexes for multi-condition queries.
 *
 * INDEX CONFIGURATION:
 * - time-series: coinId, timestamp, coinId_timestamp (composite) — queries by coin and period
 * - portfolios: userId, createdAt, userId_createdAt (composite) — filter by user, sort by date
 * - strategies: type, isActive, type_isActive (composite) — filter by type and active/inactive
 * - history: timestamp, type — filter by operation type and date
 * - unique: false
 *
 * REFERENCES:
 * - General caching principles: id:sk-3c832d
 */

(function() {
    'use strict';

    /**
     * Index configuration for each IndexedDB table
     */
    const INDEXES = {
        'time-series': [
            { name: 'coinId', keyPath: 'coinId', unique: false },
            { name: 'timestamp', keyPath: 'timestamp', unique: false },
            { name: 'coinId_timestamp', keyPath: ['coinId', 'timestamp'], unique: false }
        ],
        'portfolios': [
            { name: 'userId', keyPath: 'userId', unique: false },
            { name: 'createdAt', keyPath: 'createdAt', unique: false },
            { name: 'userId_createdAt', keyPath: ['userId', 'createdAt'], unique: false }
        ],
        'strategies': [
            { name: 'type', keyPath: 'type', unique: false },
            { name: 'isActive', keyPath: 'isActive', unique: false },
            { name: 'type_isActive', keyPath: ['type', 'isActive'], unique: false }
        ],
        'history': [
            { name: 'timestamp', keyPath: 'timestamp', unique: false },
            { name: 'type', keyPath: 'type', unique: false }
        ]
    };

    /**
     * Get indexes for table
     * @param {string} tableName - table name
     * @returns {Array} - array of index configs
     */
    function getIndexes(tableName) {
        return INDEXES[tableName] || [];
    }

    // Export to global scope
    window.cacheIndexes = {
        INDEXES,
        getIndexes
    };

    console.log('cache-indexes.js: initialized');
})();

