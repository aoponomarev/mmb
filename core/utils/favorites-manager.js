/**
 * ================================================================================================
 * FAVORITES MANAGER - Менеджер избранных монет
 * ================================================================================================
 *
 * ЦЕЛЬ: Централизованное управление избранными монетами пользователя.
 * Skill: app/skills/ux-principles
 *
 * ПРИНЦИПЫ:
 * - ЕИП: Cloudflare D1 (таблица user_coin_sets с type='favorite') - основной источник правды.
 * - Кэширование: localStorage - быстрый локальный кэш для отзывчивости интерфейса.
 * - Хранение: Сохраняем только { id, symbol } для каждой монеты. Остальные данные подтягиваются из кэша CoinGecko.
 *
 * ИСПОЛЬЗОВАНИЕ:
 * window.favoritesManager.getFavorites();
 * window.favoritesManager.toggleFavorite(coin);
 *
 * ССЫЛКИ:
 * - API клиент: core/api/cloudflare/coin-sets-client.js
 */

(function() {
    'use strict';

    const STORAGE_KEY = 'favorite_coins';
    const CACHE_TTL = 1000 * 60 * 60; // 1 час
    let favorites = [];
    let lastSync = 0;
    let isInitialized = false;

    /**
     * Загрузить из localStorage
     */
    function loadFromCache() {
        try {
            const cached = localStorage.getItem(STORAGE_KEY);
            if (cached) {
                const data = JSON.parse(cached);
                favorites = data.items || [];
                lastSync = data.timestamp || 0;
            }
        } catch (e) {
            console.error('FavoritesManager: ошибка загрузки кэша', e);
        }
    }

    /**
     * Сохранить в localStorage
     */
    function saveToCache() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                items: favorites,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.error('FavoritesManager: ошибка сохранения кэша', e);
        }
    }

    /**
     * Инициализация менеджера
     */
    async function init() {
        if (isInitialized) return;

        loadFromCache();

        // Если прошло много времени с последней синхронизации, пробуем обновить из D1
        if (Date.now() - lastSync > CACHE_TTL) {
            await sync();
        }

        isInitialized = true;
        console.log(`✅ FavoritesManager: инициализирован (${favorites.length} монет)`);
    }

    /**
     * Синхронизация с D1
     */
    async function sync() {
        if (!window.coinSetsClient || !window.authState || !window.authState.isAuthenticated) {
            return;
        }

        try {
            const sets = await window.coinSetsClient.getCoinSets({ type: 'favorite' });

            // Находим единственный на данный момент набора типа 'favorite'
            // Если его нет - создаем
            let favoriteSet = sets.find(s => s.type === 'favorite');

            if (favoriteSet) {
                // Если данные в D1 отличаются от локальных, обновляем локальные
                // В данной реализации D1 - мастер
                favorites = favoriteSet.coin_ids || [];
                lastSync = Date.now();
                saveToCache();

                // Оповещаем UI об обновлении
                if (window.eventBus) {
                    window.eventBus.emit('favorites-updated', favorites);
                }
            }
        } catch (error) {
            console.error('FavoritesManager: ошибка синхронизации с D1', error);
        }
    }

    /**
     * Получить список избранных монет
     */
    function getFavorites() {
        return [...favorites];
    }

    /**
     * Проверить, находится ли монета в избранном
     */
    function isFavorite(coinId) {
        return favorites.some(f => f.id === coinId);
    }

    /**
     * Добавить/удалить монету из избранного
     */
    async function toggleFavorite(coin) {
        const index = favorites.findIndex(f => f.id === coin.id);

        if (index === -1) {
            // Добавляем
            favorites.push({ id: coin.id, symbol: coin.symbol });
        } else {
            // Удаляем
            favorites.splice(index, 1);
        }

        saveToCache();

        // Оповещаем UI немедленно для отзывчивости
        if (window.eventBus) {
            window.eventBus.emit('favorites-updated', favorites);
        }

        // Асинхронно обновляем D1
        await updateD1();
    }

    /**
     * Удалить монету из избранного
     */
    async function removeFavorite(coinId) {
        const index = favorites.findIndex(f => f.id === coinId);

        if (index !== -1) {
            favorites.splice(index, 1);
            saveToCache();

            // Оповещаем UI немедленно для отзывчивости
            if (window.eventBus) {
                window.eventBus.emit('favorites-updated', favorites);
            }

            // Асинхронно обновляем D1
            await updateD1();
        }
    }

    /**
     * Обновить данные в D1
     */
    async function updateD1() {
        if (!window.coinSetsClient || !window.authState || !window.authState.isAuthenticated) {
            return;
        }

        try {
            const sets = await window.coinSetsClient.getCoinSets({ type: 'favorite' });
            let favoriteSet = sets.find(s => s.type === 'favorite');

            if (favoriteSet) {
                // Обновляем существующий
                await window.coinSetsClient.updateCoinSet(favoriteSet.id, {
                    coin_ids: favorites
                });
            } else {
                // Создаем новый
                await window.coinSetsClient.createCoinSet({
                    name: 'Favorites',
                    description: 'Избранные монеты',
                    coin_ids: favorites,
                    type: 'favorite',
                    is_active: 1,
                    provider: 'coingecko'
                });
            }
            lastSync = Date.now();
            saveToCache();
        } catch (error) {
            console.error('FavoritesManager: ошибка обновления D1', error);
        }
    }

    // Экспорт в глобальную область
    window.favoritesManager = {
        init,
        sync,
        getFavorites,
        isFavorite,
        toggleFavorite,
        removeFavorite
    };

    // Слушаем изменение состояния авторизации для синхронизации
    if (window.eventBus) {
        window.eventBus.on('auth-state-changed', (state) => {
            if (state.isAuthenticated) {
                sync();
            } else {
                // При логауте очищаем избранное (или оставляем как локальное?)
                // Пока оставляем локальное, но при логине оно будет перезаписано из D1
            }
        });
    }

})();
