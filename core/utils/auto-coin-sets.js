/**
 * ================================================================================================
 * AUTO COIN SETS - Автоматическая классификация и управление coin sets
 * ================================================================================================
 * Skill: core/skills/config-contracts
 *
 * PURPOSE: Автоматическое формирование и пополнение sets монет по типам
 * (стейблкоины, обертки, LST) на основе loadedных монет.
 *
 * PRINCIPLES:
 * - Автонаборы формируются при каждой загрузке монет (из рейтингов или прямого поиска)
 * - Монеты добавляются в автонаборы без дубликатов
 * - Автонаборы хранятся в localStorage и никогда не очищаются автоматически
 * - Классификация использует coinsConfig как единый источник правды (ЕИП)
 *
 * ХРАНИЛИЩЕ:
 * - `auto-set-stablecoins` - автонабор стейблкоинов
 * - `auto-set-wrapped` - автонабор оберток (wrapped tokens)
 * - `auto-set-lst` - автонабор LST (liquid staking tokens)
 *
 * ОБОСНОВАНИЕ:
 * - Автоматический сборщик избавляет пользователя от ручной работы по составлению
 *   sets однотипных монет
 * - Наборы пополняются органически по мере работы с приложением
 * - Использование localStorage обеспечивает персистентность между сессиями
 * - Разделение на три типа соответствует актуальной классификации рынка
 *
 * REFERENCES:
 * - ЕИП: app/skills/ux-principles
 * - Классификатор: core/config/coins-config.js
 */

(function() {
    'use strict';

    // Ключи for хранения автоsets в localStorage
    const AUTO_SET_KEYS = {
        stablecoins: 'auto-set-stablecoins',
        wrapped: 'auto-set-wrapped',
        lst: 'auto-set-lst'
    };

    /**
     * Get автонабор из localStorage
     * @param {string} type - Тип автонабора ('stablecoins' | 'wrapped' | 'lst')
     * @returns {Array} Массив объектов монет { id, symbol, name }
     */
    function getAutoSet(type) {
        const key = AUTO_SET_KEYS[type];
        if (!key) {
            console.warn(`auto-coin-sets: unknown type автонабора "${type}"`);
            return [];
        }

        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error(`auto-coin-sets: ошибка чтения автонабора "${type}":`, error);
            return [];
        }
    }

    /**
     * Добавить монеты в автонабор (без дубликатов)
     * @param {string} type - Тип автонабора ('stablecoins' | 'wrapped' | 'lst')
     * @param {Array} newCoins - Массив монет for добавления
     */
    function addToAutoSet(type, newCoins) {
        const key = AUTO_SET_KEYS[type];
        if (!key) {
            console.warn(`auto-coin-sets: unknown type автонабора "${type}"`);
            return;
        }

        if (!Array.isArray(newCoins) || newCoins.length === 0) {
            return;
        }

        try {
            const existing = getAutoSet(type);
            const existingIds = new Set(existing.map(c => c.id));

            // Фильтруем только новые монеты
            const uniqueNewCoins = newCoins.filter(coin => {
                return coin && coin.id && !existingIds.has(coin.id);
            });

            if (uniqueNewCoins.length === 0) {
                return; // Нет новых монет for добавления
            }

            // Сохраняем только необходимые поля
            const coinsToAdd = uniqueNewCoins.map(coin => ({
                id: coin.id,
                symbol: coin.symbol || '',
                name: coin.name || ''
            }));

            const updated = [...existing, ...coinsToAdd];
            localStorage.setItem(key, JSON.stringify(updated));

            console.log(`auto-coin-sets: добавлено ${coinsToAdd.length} монет в "${type}"`);
        } catch (error) {
            console.error(`auto-coin-sets: ошибка добавления в автонабор "${type}":`, error);
        }
    }

    /**
     * Классифицировать монеты и обновить автонаборы
     * @param {Array} coins - Массив монет for классификации
     */
    function classifyAndUpdateAutoSets(coins) {
        if (!coins || !Array.isArray(coins) || coins.length === 0) {
            return;
        }

        if (!window.coinsConfig) {
            console.warn('auto-coin-sets: coinsConfig not loaded, классификация невозможна');
            return;
        }

        const stablecoins = [];
        const wrapped = [];
        const lst = [];

        // Получаем списки for проверки принадлежности
        const wrappedIds = new Set(window.coinsConfig.getWrappedCoins());
        const lstIds = new Set(window.coinsConfig.getLstCoins());

        // Классифицируем каждую монету
        coins.forEach(coin => {
            if (!coin || !coin.id) return;

            const coinId = String(coin.id).toLowerCase();

            // 1. Стейблкоины
            if (window.coinsConfig.isStablecoinId(coin.id)) {
                stablecoins.push(coin);
                return; // Стейблкоин не can be одновременно wrapped/lst
            }

            // 2. Wrapped или LST
            if (window.coinsConfig.isWrappedOrLst(coin.id, coin.symbol, coin.name)) {
                // Определяем точный тип по спискам из coins.json
                if (wrappedIds.has(coinId)) {
                    wrapped.push(coin);
                } else if (lstIds.has(coinId)) {
                    lst.push(coin);
                } else {
                    // Попала по эвристике (например, символ начинается с 'w')
                    // Консервативно относим к wrapped
                    wrapped.push(coin);
                }
            }
        });

        // Обновляем автонаборы
        if (stablecoins.length > 0) {
            addToAutoSet('stablecoins', stablecoins);
        }
        if (wrapped.length > 0) {
            addToAutoSet('wrapped', wrapped);
        }
        if (lst.length > 0) {
            addToAutoSet('lst', lst);
        }

        // Логируем итоги классификации
        const total = stablecoins.length + wrapped.length + lst.length;
        if (total > 0) {
            console.log(`auto-coin-sets: классифицировано ${total} монет (стейблы: ${stablecoins.length}, wrapped: ${wrapped.length}, LST: ${lst.length})`);
        }
    }

    /**
     * Get все автонаборы
     * @returns {Object} Объект с тремя массивами: { stablecoins, wrapped, lst }
     */
    function getAllAutoSets() {
        const result = {
            stablecoins: getAutoSet('stablecoins'),
            wrapped: getAutoSet('wrapped'),
            lst: getAutoSet('lst')
        };
        return result;
    }

    /**
     * Очистить автонабор (только for отладки/ручного управления)
     * @param {string} type - Тип автонабора for очистки
     */
    function clearAutoSet(type) {
        const key = AUTO_SET_KEYS[type];
        if (!key) {
            console.warn(`auto-coin-sets: unknown type автонабора "${type}"`);
            return;
        }

        try {
            localStorage.removeItem(key);
            console.log(`auto-coin-sets: автонабор "${type}" очищен`);
        } catch (error) {
            console.error(`auto-coin-sets: ошибка очистки автонабора "${type}":`, error);
        }
    }

    /**
     * Get количество монет в автонаборе
     * @param {string} type - Тип автонабора
     * @returns {number}
     */
    function getAutoSetCount(type) {
        return getAutoSet(type).length;
    }

    // Export to global scope
    window.autoCoinSets = {
        classifyAndUpdateAutoSets,
        getAutoSet,
        getAllAutoSets,
        getAutoSetCount,
        clearAutoSet, // Для отладки
        AUTO_SET_KEYS // Для использования в других модулях
    };

    console.log('auto-coin-sets.js: initialized');
})();
