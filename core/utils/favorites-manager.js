/**
 * #JS-Rxw81Ruk
 * @description Centralized management of user favorite coins.
 * @skill id:sk-e0b8f3
 *
 * PRINCIPLES:
 * - SSOT: Cloudflare D1 (user_coin_sets table with type='favorite') - primary SSOT.
 * - Caching: localStorage - fast local cache for UI responsiveness.
 * - Storage: Store only { id, symbol } per coin. Other data is fetched from CoinGecko cache.
 *
 * USAGE:
 * window.favoritesManager.getFavorites();
 * window.favoritesManager.toggleFavorite(coin);
 *
 * REFERENCES:
 * - API client: core/api/cloudflare/coin-sets-client.js
 */

(function() {
    'use strict';

    const STORAGE_KEY = 'favorite_coins';
    const CACHE_TTL = 1000 * 60 * 60; // 1 hour
    let favorites = [];
    let lastSync = 0;
    let isInitialized = false;

    /**
     * Load from localStorage
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
     * Save to localStorage
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
     * Manager initialization
     */
    async function init() {
        if (isInitialized) return;

        loadFromCache();

        // If much time passed since last sync, try to update from D1
        if (Date.now() - lastSync > CACHE_TTL) {
            await sync();
        }

        isInitialized = true;
        console.log(`✅ FavoritesManager: initialized (${favorites.length} монет)`);
    }

    /**
     * Sync with D1
     */
    async function sync() {
        if (!window.coinSetsClient || !window.authState || !window.authState.isAuthenticated) {
            return;
        }

        try {
            const sets = await window.coinSetsClient.getCoinSets({ type: 'favorite' });

            // Find the single favorite set (for now)
            // Create if none exists
            let favoriteSet = sets.find(s => s.type === 'favorite');

            if (favoriteSet) {
                // If D1 data differs from local, update local
                // In this implementation D1 is the master
                favorites = favoriteSet.coin_ids || [];
                lastSync = Date.now();
                saveToCache();

                // Notify UI of update
                if (window.eventBus) {
                    window.eventBus.emit('favorites-updated', favorites);
                }
            }
        } catch (error) {
            console.error('FavoritesManager: ошибка синхронизации с D1', error);
        }
    }

    /**
     * Get list of favorite coins
     */
    function getFavorites() {
        return [...favorites];
    }

    /**
     * Check if coin is in favorites
     */
    function isFavorite(coinId) {
        return favorites.some(f => f.id === coinId);
    }

    /**
     * Add/remove coin from favorites
     */
    async function toggleFavorite(coin) {
        const index = favorites.findIndex(f => f.id === coin.id);

        if (index === -1) {
            // Add
            favorites.push({ id: coin.id, symbol: coin.symbol });
        } else {
            // Remove
            favorites.splice(index, 1);
        }

        saveToCache();

        // Notify UI immediately for responsiveness
        if (window.eventBus) {
            window.eventBus.emit('favorites-updated', favorites);
        }

        // Update D1 asynchronously
        await updateD1();
    }

    /**
     * Remove coin from favorites
     */
    async function removeFavorite(coinId) {
        const index = favorites.findIndex(f => f.id === coinId);

        if (index !== -1) {
            favorites.splice(index, 1);
            saveToCache();

            // Notify UI immediately for responsiveness
            if (window.eventBus) {
                window.eventBus.emit('favorites-updated', favorites);
            }

            // Update D1 asynchronously
            await updateD1();
        }
    }

    /**
     * Update data in D1
     */
    async function updateD1() {
        if (!window.coinSetsClient || !window.authState || !window.authState.isAuthenticated) {
            return;
        }

        try {
            const sets = await window.coinSetsClient.getCoinSets({ type: 'favorite' });
            let favoriteSet = sets.find(s => s.type === 'favorite');

            if (favoriteSet) {
                // Update existing
                await window.coinSetsClient.updateCoinSet(favoriteSet.id, {
                    coin_ids: favorites
                });
            } else {
                // Create new
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

    // Export to global scope
    window.favoritesManager = {
        init,
        sync,
        getFavorites,
        isFavorite,
        toggleFavorite,
        removeFavorite
    };

    // Listen for auth state changes for sync
    if (window.eventBus) {
        window.eventBus.on('auth-state-changed', (state) => {
            if (state.isAuthenticated) {
                sync();
            } else {
                // On logout clear favorites (or keep as local?)
                // For now keep local; on login it will be overwritten from D1
            }
        });
    }

})();
