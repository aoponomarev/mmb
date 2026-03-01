/**
 * ================================================================================================
 * STORAGE LAYERS - Разделение данных по слоям хранения
 * ================================================================================================
 *
 * ЦЕЛЬ: Распределение ключей кэша по хранилищам (localStorage/IndexedDB) в зависимости от объема и частоты доступа.
 * Skill: core/skills/cache-layer
 *
 * HOT (localStorage, ≤5MB) — синхронный доступ, быстрый:
 * - settings, theme, timezone, favorites, ui-state, active-tab — настройки и UI-состояние
 *   Причина: маленький объем (<10KB), частый доступ при каждом рендере/действии, синхронность важна
 * - icons-cache — объект {coinId: url}
 *   Причина: объем ~100-500KB, доступ при каждом отображении монеты, синхронность критична для рендеринга
 *
 * WARM (IndexedDB, ≤50MB) — асинхронный доступ, средний объем:
 * - coins-list — список всех монет из CoinGecko API
 *   Причина: объем 1-5MB (JSON), частый доступ для поиска/фильтрации, структурированные данные
 * - market-metrics — метрики рынка
 *   Причина: объем 100KB-2MB, частый доступ, обновляется регулярно
 * - api-cache — кэш API-ответов
 *   Причина: объем зависит от количества запросов, частый доступ, структурированные данные
 *
 * COLD (IndexedDB, ≤500MB) — асинхронный доступ, большие объемы:
 * - time-series — временные ряды цен
 *   Причина: объем 10-100MB+ (тысячи точек), редкий доступ (по требованию), нужны индексы для поиска
 * - history — история операций
 *   Причина: объем растет со временем, редкий доступ, нужны индексы
 * - portfolios, strategies — портфели и стратегии
 *   Причина: объем зависит от пользователя (может быть большим), редкий доступ, структурированные данные
 * - correlations — корреляции между активами
 *   Причина: объем может быть большим (матрицы), редкий доступ, вычисляемые данные
 *
 * ДОБАВЛЕНИЕ НОВОГО КЛЮЧА:
 * - localStorage: синхронный доступ, лимит ~5MB, простые структуры
 * - IndexedDB: асинхронный доступ, большие объемы, структурированные данные, индексы
 * - Лимиты: защита от переполнения, приоритетная очистка (cold → warm → hot)
 *
 * ДОБАВЛЕНИЕ НОВОГО КЛЮЧА:
 * 1. Оценить объем (<100KB → hot, 100KB-10MB → warm, >10MB → cold)
 * 2. Оценить частоту доступа (при каждом рендере → hot/warm, по требованию → cold)
 * 3. Оценить тип данных (простые объекты → localStorage, массивы/структуры → IndexedDB)
 * 4. Добавить ключ в массив LAYERS.{layer}.keys
 *
 * ССЫЛКА: Общие принципы кэширования: core/skills/cache-layer
 */

(function() {
    'use strict';

    const LAYERS = {
        hot: {
            type: 'localStorage',
            maxSize: 5 * 1024 * 1024, // 5MB
            keys: [
                'settings',
                'favorites',
                'ui-state',
                'active-tab',
                'theme',
                'icons-cache' // Иконки монет (объект {coinId: url})
            ]
        },
        warm: {
            type: 'indexedDB',
            maxSize: 50 * 1024 * 1024, // 50MB
            keys: [
                'coins-list',
                'market-metrics',
                'api-cache' // Кэш API-ответов
            ]
        },
        cold: {
            type: 'indexedDB',
            maxSize: 500 * 1024 * 1024, // 500MB
            keys: [
                'time-series',
                'history',
                'portfolios',
                'strategies',
                'correlations'
            ]
        }
    };

    /**
     * Получить конфигурацию слоя для ключа
     * @param {string} key - ключ кэша
     * @returns {Object|null} - конфигурация слоя или null
     */
    function getLayerForKey(key) {
        for (const [layerName, config] of Object.entries(LAYERS)) {
            if (config.keys.includes(key)) {
                return { layer: layerName, ...config };
            }
        }
        // По умолчанию hot для неизвестных ключей
        return { layer: 'hot', ...LAYERS.hot };
    }

    /**
     * Получить объект хранилища для слоя
     * @param {string} layer - 'hot', 'warm' или 'cold'
     * @returns {Object|null} - объект хранилища с методами get/set/has/delete/clear
     */
    function getStorage(layer) {
        const config = LAYERS[layer];
        if (!config) {
            return null;
        }

        if (config.type === 'localStorage') {
            return {
                get: async (key) => {
                    try {
                        const item = localStorage.getItem(key);
                        if (!item) return null;

                        // Пытаемся распарсить как JSON
                        try {
                            const parsed = JSON.parse(item);
                            // Если это объект с полями data/version/timestamp - это новый формат cacheManager
                            // Если это строка или примитив - это старое значение, нужно обернуть
                            if (parsed && typeof parsed === 'object' && (parsed.data !== undefined || parsed.version !== undefined)) {
                                return parsed;
                            }
                            // Старое значение (строка или примитив) - оборачиваем в новый формат
                            return {
                                data: parsed,
                                version: '1.0.0',
                                timestamp: Date.now(),
                                expiresAt: null
                            };
                        } catch (parseError) {
                            // Если не JSON - это старая строка, оборачиваем
                            return {
                                data: item,
                                version: '1.0.0',
                                timestamp: Date.now(),
                                expiresAt: null
                            };
                        }
                    } catch (error) {
                        console.error(`localStorage.get(${key}):`, error);
                        return null;
                    }
                },
                set: async (key, value) => {
                    try {
                        localStorage.setItem(key, JSON.stringify(value));
                        return true;
                    } catch (error) {
                        // Переполнение localStorage
                        console.error(`localStorage.set(${key}):`, error);
                        return false;
                    }
                },
                has: async (key) => {
                    return localStorage.getItem(key) !== null;
                },
                delete: async (key) => {
                    localStorage.removeItem(key);
                    return true;
                },
                clear: async () => {
                    // Очистить только ключи этого слоя
                    for (const key of config.keys) {
                        localStorage.removeItem(key);
                    }
                    return true;
                },
                keys: async () => {
                    // Получить все ключи из localStorage
                    const allKeys = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key) {
                            allKeys.push(key);
                        }
                    }
                    return allKeys;
                }
            };
        } else if (config.type === 'indexedDB') {
            // IndexedDB будет реализован позже
            // Пока возвращаем заглушку
            return {
                get: async (key) => {
                    console.warn(`IndexedDB для ${layer} ещё не реализован, используем localStorage`);
                    try {
                        const item = localStorage.getItem(`idb_${layer}_${key}`);
                        return item ? JSON.parse(item) : null;
                    } catch (error) {
                        return null;
                    }
                },
                set: async (key, value) => {
                    console.warn(`IndexedDB для ${layer} ещё не реализован, используем localStorage`);
                    try {
                        localStorage.setItem(`idb_${layer}_${key}`, JSON.stringify(value));
                        return true;
                    } catch (error) {
                        return false;
                    }
                },
                has: async (key) => {
                    return localStorage.getItem(`idb_${layer}_${key}`) !== null;
                },
                delete: async (key) => {
                    localStorage.removeItem(`idb_${layer}_${key}`);
                    return true;
                },
                clear: async () => {
                    for (const key of config.keys) {
                        localStorage.removeItem(`idb_${layer}_${key}`);
                    }
                    return true;
                },
                keys: async () => {
                    // Получить все ключи для этого слоя из localStorage (fallback для IndexedDB)
                    const prefix = `idb_${layer}_`;
                    const allKeys = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key && key.startsWith(prefix)) {
                            // Убираем префикс
                            allKeys.push(key.substring(prefix.length));
                        }
                    }
                    return allKeys;
                }
            };
        }

        return null;
    }

    // Экспорт в глобальную область
    window.storageLayers = {
        LAYERS,
        getLayerForKey,
        getStorage
    };

    console.log('storage-layers.js: инициализирован');
})();

