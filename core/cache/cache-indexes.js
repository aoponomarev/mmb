/**
 * ================================================================================================
 * CACHE INDEXES - Индексы для IndexedDB
 * ================================================================================================
 *
 * ЦЕЛЬ: Определить индексы IndexedDB для быстрого поиска данных.
 * Skill: core/skills/cache-layer
 *
 * КОНФИГУРАЦИЯ ИНДЕКСОВ:
 * - time-series: coinId, timestamp, coinId_timestamp (составной)
 *   Причина: частые запросы "все точки для монеты X" и "точки за период Y", составной индекс ускоряет оба случая
 * - portfolios: userId, createdAt, userId_createdAt (составной)
 *   Причина: фильтрация по пользователю и сортировка по дате создания, составной индекс для комбинированных запросов
 * - strategies: type, isActive, type_isActive (составной)
 *   Причина: фильтрация по типу стратегии и активным/неактивным, составной индекс для комбинированных запросов
 * - history: timestamp, type
 *   Причина: фильтрация по типу операции и поиск по дате
 *
 * КОНФИГУРАЦИЯ ИНДЕКСОВ:
 * - Индексировать поля, используемые в WHERE и ORDER BY запросах
 * - Составные индексы для запросов с несколькими условиями
 * - unique: false (одна запись может иметь одно значение индекса)
 *
 * ПРИМЕЧАНИЕ: Реализация индексов будет добавлена при реализации IndexedDB. Пока файл содержит только конфигурацию.
 *
 * ССЫЛКА: Общие принципы кэширования: core/skills/cache-layer
 */

(function() {
    'use strict';

    /**
     * Конфигурация индексов для каждой таблицы IndexedDB
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
     * Получить индексы для таблицы
     * @param {string} tableName - имя таблицы
     * @returns {Array} - массив конфигураций индексов
     */
    function getIndexes(tableName) {
        return INDEXES[tableName] || [];
    }

    // Экспорт в глобальную область
    window.cacheIndexes = {
        INDEXES,
        getIndexes
    };

    console.log('cache-indexes.js: инициализирован');
})();

