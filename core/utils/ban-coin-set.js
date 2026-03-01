/**
 * ================================================================================================
 * BAN COIN SET - Утилита для работы с локальным набором "Ban"
 * ================================================================================================
 *
 * ЦЕЛЬ: Управление служебным набором исключенных монет "Ban" в localStorage.
 * Используется как технический список тикеров/монет для быстрых исключений.
 */

(function() {
    'use strict';

    const STORAGE_KEY = 'ban-coin-set';

    function normalizeTicker(value) {
        return String(value || '').trim().toLowerCase();
    }

    function normalizeTickersString(value) {
        const tickers = String(value || '')
            .split(',')
            .map(normalizeTicker)
            .filter(Boolean);
        return Array.from(new Set(tickers))
            .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
            .join(', ');
    }

    function extractTickers(coinsData, coinIds = []) {
        if (coinsData && Array.isArray(coinsData) && coinsData.length > 0) {
            return Array.from(new Set(
                coinsData
                    .map(coin => normalizeTicker(coin.symbol || coin.id))
                    .filter(Boolean)
            ))
                .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
                .join(', ');
        }
        if (coinIds && coinIds.length > 0) {
            return Array.from(new Set(
                coinIds
                    .map(normalizeTicker)
                    .filter(Boolean)
            ))
                .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
                .join(', ');
        }
        return '';
    }

    function getBanSet() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return null;

            const parsed = JSON.parse(stored);
            const coinIds = Array.isArray(parsed.coin_ids) ? parsed.coin_ids : [];
            const coinsData = Array.isArray(parsed.coins) ? parsed.coins : null;
            const tickers = parsed.tickers
                ? normalizeTickersString(parsed.tickers)
                : extractTickers(coinsData, coinIds);

            return {
                id: 'ban',
                name: 'Ban (служебный)',
                description: 'Локальный список исключений (только на этом устройстве)',
                coin_ids: coinIds,
                coins: coinsData,
                tickers,
                is_ban: true,
                is_local: true
            };
        } catch (error) {
            console.error('ban-coin-set.get error:', error);
            return null;
        }
    }

    function saveBanSet(coinIds, coinsData = null, tickersString = '') {
        try {
            const normalizedIds = Array.from(new Set((coinIds || []).filter(Boolean)));
            const tickers = tickersString
                ? normalizeTickersString(tickersString)
                : extractTickers(coinsData, normalizedIds);

            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                coin_ids: normalizedIds,
                coins: coinsData || null,
                tickers,
                updated_at: new Date().toISOString()
            }));
        } catch (error) {
            console.error('ban-coin-set.save error:', error);
        }
    }

    function addCoin(coin) {
        const current = getBanSet() || { coin_ids: [], coins: [] };
        const nextIds = Array.from(new Set([...(current.coin_ids || []), coin.id || coin.coinId].filter(Boolean)));
        const nextCoinsMap = new Map((current.coins || []).map(item => [item.id || item.coinId, item]));
        const coinId = coin.id || coin.coinId;
        if (coinId) {
            nextCoinsMap.set(coinId, {
                id: coinId,
                symbol: normalizeTicker(coin.ticker || coin.symbol),
                name: coin.name || ''
            });
        }
        saveBanSet(nextIds, Array.from(nextCoinsMap.values()));
    }

    function clearBanSet() {
        localStorage.removeItem(STORAGE_KEY);
    }

    function getContext() {
        const set = getBanSet();
        const bannedIds = new Set(Array.isArray(set?.coin_ids) ? set.coin_ids.filter(Boolean) : []);
        const bannedTickers = new Set(
            String(set?.tickers || '')
                .split(',')
                .map(normalizeTicker)
                .filter(Boolean)
        );
        return { bannedIds, bannedTickers };
    }

    window.banCoinSet = {
        get: getBanSet,
        save: saveBanSet,
        addCoin,
        clear: clearBanSet,
        getContext
    };
})();

