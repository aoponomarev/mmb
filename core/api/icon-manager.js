/**
 * ================================================================================================
 * ICON MANAGER - Coin icon manager
 * ================================================================================================
 * Skill: id:sk-318305
 *
 * PURPOSE: SSOT for coin icon URLs.
 *
 * @skill-anchor id:sk-bb7c8e #for-layer-separation
 * @skill-anchor id:sk-224210 #for-data-provider-interface
 * Prioritizes our GitHub CDN over external sources (CoinGecko).
 *
*/

(function() {
    'use strict';

    /**
     * IconManager config
     */
    const CONFIG = {
        // Base URL of our GitHub CDN
        cdnBaseUrl: 'https://aoponomarev.github.io/libs/assets/coins/',

        // Alias map (if CoinGecko ID differs from CDN filename)
        // Format: { 'coingecko-id': 'cdn-filename' }
        aliasMap: {
            'tether': 'usdt',
            'usd-coin': 'usdc',
            'binance-usd': 'busd'
        }
    };

    /**
     * Get icon URL for coin
     * @param {string} coinId - Coin ID (usually from CoinGecko)
     * @param {string} fallbackUrl - Provider icon URL (if not found on CDN)
     * @returns {string} - Icon URL
     */
    function getIconUrl(coinId, fallbackUrl = '') {
        if (!coinId) return fallbackUrl;

        // 1. Check alias map
        const filename = CONFIG.aliasMap[coinId] || coinId;

        // 2. Build our CDN URL
        // Add salt (app version) for GitHub Pages cache busting
        const salt = window.appConfig ? window.appConfig.getVersionHash() : Date.now();
        const cdnUrl = `${CONFIG.cdnBaseUrl}${filename}.png?v=${salt}`;

        // Return CDN URL. If 404, component should handle via onerror
        return cdnUrl;
    }

    /**
     * Check if user has icon edit rights (Dev-only)
     * @returns {boolean}
     */
    function canEditIcons() {
        // Check for GitHub Token in localStorage (or via authClient in future)
        return !!localStorage.getItem('app_github_token');
    }

    // Export to global scope
    window.iconManager = {
        getIconUrl,
        canEditIcons,
        CONFIG
    };

    console.log('icon-manager.js: initialized');
})();
