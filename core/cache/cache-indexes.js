/**
 * ================================================================================================
 * CACHE INDEXES - Indexes for IndexedDB
 * ================================================================================================
 *
 * PURPOSE: Define IndexedDB indexes for fast data lookup.
 * Skill: id:sk-3c832d
 *
 * INDEX CONFIGURATION:
 * - time-series: coinId, timestamp, coinId_timestamp (composite)
 *   Reason: frequent queries "all points for coin X" and "points for period Y", composite index speeds both
 * - portfolios: userId, createdAt, userId_createdAt (composite)
 *   Reason: filter by user and sort by creation date, composite index for combined queries
 * - strategies: type, isActive, type_isActive (composite)
 *   Reason: filter by strategy type and active/inactive, composite index for combined queries
 * - history: timestamp, type
 *   Reason: filter by operation type and search by date
 *
 * INDEX CONFIGURATION:
 * - Index fields used in WHERE and ORDER BY queries
 * - Composite indexes for queries with multiple conditions
 * - unique: false (one record can have one index value)
 *
 * NOTE: Index implementation will be added when IndexedDB is implemented. File contains config only for now.
 *
 * REFERENCE: General caching principles: id:sk-3c832d
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

