/**
 * ================================================================================================
 * COINS CONFIG - Конфигурация справочников по монетам
 * ================================================================================================
 * Skill: a/skills/app/skills/components/components-ssot.md
 *
 * ЦЕЛЬ: Единый источник правды для справочных списков, связанных с монетами
 * (стейблкоины и др.). Используется в UI для выборок и фильтров без дублирования
 * хардкода в компонентах.
 *
 * ПРИНЦИПЫ:
 * - Все справочные списки по монетам определяются здесь
 * - Возвращаемые структуры иммутабельны для вызывающего кода (копии массивов/Set)
 * - Расширяемость: при добавлении новых списков используем геттеры
 *
 * ССЫЛКИ:
 * - ЕИП: `a/skills/app/skills/components/components-ssot.md` (раздел "Единый источник правды")
 */

(function() {
    'use strict';

    let stablecoins = []; // [{ id, symbol, name, baseCurrency, source, updatedAt }]
    let wrappedCoins = []; // [id1, id2, ...]
    let lstCoins = []; // [id1, id2, ...]

    function setStablecoins(list) {
        if (!Array.isArray(list)) return;
        stablecoins = list.map(item => ({
            id: item.id,
            symbol: (item.symbol || '').toLowerCase(),
            name: item.name || '',
            baseCurrency: item.baseCurrency || 'unknown',
            source: item.source || 'coingecko',
            updatedAt: item.updatedAt || Date.now()
        }));
    }

    function setWrappedCoins(list) {
        if (!Array.isArray(list)) return;
        wrappedCoins = list.map(id => String(id).toLowerCase());
    }

    function setLstCoins(list) {
        if (!Array.isArray(list)) return;
        lstCoins = list.map(id => String(id).toLowerCase());
    }

    function getStablecoins() {
        return [...stablecoins];
    }

    function getWrappedCoins() {
        return [...wrappedCoins];
    }

    function getLstCoins() {
        return [...lstCoins];
    }

    function getStablecoinSymbolsSet() {
        return new Set(stablecoins.map(s => s.symbol));
    }

    function isStablecoinSymbol(symbol) {
        if (!symbol) return false;
        return getStablecoinSymbolsSet().has(String(symbol).toLowerCase());
    }

    function isStablecoinId(id) {
        if (!id) return false;
        const lower = String(id).toLowerCase();
        return stablecoins.some(s => s.id === lower || s.symbol === lower);
    }

    /**
     * Проверить, является ли монета оберткой (Wrapped) или LST
     * @param {string} id - ID монеты
     * @param {string} symbol - Символ монеты (опционально)
     * @param {string} name - Название монеты (опционально)
     * @returns {boolean}
     */
    function isWrappedOrLst(id, symbol = '', name = '') {
        const lowerId = String(id || '').toLowerCase();
        const lowerSymbol = String(symbol || '').toLowerCase();
        const lowerName = String(name || '').toLowerCase();

        // 1. Проверка по заранее собранным спискам (высокий приоритет)
        if (wrappedCoins.includes(lowerId) || lstCoins.includes(lowerId)) {
            return true;
        }

        // 2. Эвристический поиск по подстроке "wrap"
        if (lowerId.includes('wrapped') || lowerName.includes('wrapped')) {
            return true;
        }

        // Проверка символа
        if (lowerSymbol.startsWith('w') && lowerSymbol.length > 1) {
            return true;
        }

        return false;
    }

    /**
     * Получить тип монеты (для UI-индикаторов)
     * @param {string} id - ID монеты
     * @param {string} symbol - Символ монеты (опционально)
     * @param {string} name - Название монеты (опционально)
     * @returns {'stable'|'wrapped'|'lst'|null}
     */
    function getCoinType(id, symbol = '', name = '') {
        if (!id) return null;
        const lowerId = String(id).toLowerCase();

        if (isStablecoinId(lowerId)) {
            return 'stable';
        }

        if (wrappedCoins.includes(lowerId)) {
            return 'wrapped';
        }

        if (lstCoins.includes(lowerId)) {
            return 'lst';
        }

        // Если не в списках, но похоже на wrapped/LST — считаем wrapped
        if (isWrappedOrLst(lowerId, symbol, name)) {
            return 'wrapped';
        }

        return null;
    }

    /**
     * Иконка типа монеты (ЕИП для UI)
     * @param {'stable'|'wrapped'|'lst'|null} type
     * @returns {string|null}
     */
    function getCoinTypeIcon(type) {
        if (type === 'stable') return '🪙';
        if (type === 'wrapped') return '🔁';
        if (type === 'lst') return '🔥';
        return null;
    }

    /**
     * Подсказка для типа монеты (ЕИП для UI)
     * @param {'stable'|'wrapped'|'lst'|null} type
     * @returns {string|null}
     */
    function getCoinTypeTitle(type) {
        if (type === 'stable') return 'Стейблкоин';
        if (type === 'wrapped') return 'Обертка';
        if (type === 'lst') return 'LST';
        return null;
    }

    // Экспорт в глобальную область
    window.coinsConfig = {
        setStablecoins,
        setWrappedCoins,
        setLstCoins,
        getStablecoins,
        getWrappedCoins,
        getLstCoins,
        getStablecoinSymbolsSet,
        isStablecoinSymbol,
        isStablecoinId,
        isWrappedOrLst,
        getCoinType,
        getCoinTypeIcon,
        getCoinTypeTitle
    };

    console.log('coins-config.js: инициализирован');
})();
