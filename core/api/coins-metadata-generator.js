/**
 * #JS-mi2ffpht
 * @description Auto-generate and upload coins.json to GitHub: collect stablecoins, detect Wrapped/LST, build JSON, upload via API (app_github_token).
 * @skill id:sk-bb7c8e
 * @skill-anchor id:sk-bb7c8e #for-layer-separation
 * @skill-anchor id:sk-224210 #for-data-provider-interface
 *
 * HOW: 1) coingecko-stablecoins-loader 2) detect Wrapped/LST (heuristics + API) 3) build JSON 4) upload to GitHub.
 */

(function() {
    'use strict';

    const CONFIG = {
        repo: 'aoponomarev/libs',
        path: 'assets/data/coins.json',
        branch: 'main'
    };

    /**
     * Run generation and update process
     */
    async function generateAndUpload() {
        console.log('🚀 CoinsMetadataGenerator: запуск генерации...');

        const token = localStorage.getItem('app_github_token');
        if (!token) {
            const msg = 'GitHub Token не найден в localStorage. Настройте его в менеджере иконок.';
            console.error('❌ ' + msg);
            if (window.messagesStore) {
                window.messagesStore.addMessage({ type: 'danger', text: msg, scope: 'global' });
            }
            return;
        }

        try {
            // 1. Collect stablecoins
            console.log('📡 Сбор стейблкоинов...');
            let stableList = [];
            if (window.coingeckoStablecoinsLoader) {
                stableList = await window.coingeckoStablecoinsLoader.load({ forceRefresh: true });
            }

            // 2. Fetch top-250 coins for wrapped/lst detection (heuristics)
            console.log('📡 Поиск Wrapped и LST монет...');
            const topCoins = await fetchTopCoins();
            const wrappedIds = [];
            const lstIds = [];

            topCoins.forEach(coin => {
                const id = coin.id.toLowerCase();
                const name = (coin.name || '').toLowerCase();
                const symbol = (coin.symbol || '').toLowerCase();

                // Exclude stablecoins from wrapped search
                if (stableList.some(s => s.id === id)) return;

                // Heuristic for Wrapped
                if (id.includes('wrapped-') || name.includes('wrapped ') || (symbol.startsWith('w') && symbol.length > 2 && id !== 'waves')) {
                    wrappedIds.push(id);
                }
                // Heuristic for LST (Liquid Staking Tokens)
                else if (id.includes('staked-') || name.includes('staked ') || name.includes('liquid staking') || id.endsWith('-steth')) {
                    lstIds.push(id);
                }
            });

            // 3. Build final object
            const result = {
                stable: stableList.map(s => s.id),
                wrapped: Array.from(new Set(wrappedIds)).sort(),
                lst: Array.from(new Set(lstIds)).sort(),
                updatedAt: Date.now()
            };

            console.log(`✅ Сформировано: ${result.stable.length} стейблов, ${result.wrapped.length} оберток, ${result.lst.length} LST`);

            // 4. Upload to GitHub
            await uploadToGithub(result, token);

        } catch (error) {
            console.error('❌ CoinsMetadataGenerator: ошибка:', error);
            if (window.messagesStore) {
                window.messagesStore.addMessage({ type: 'danger', text: 'Ошибка генерации метаданных: ' + error.message, scope: 'global' });
            }
        }
    }

    /**
     * Fetch top-250 coins list for analysis
     */
    async function fetchTopCoins() {
        const url = window.cloudflareConfig?.getApiProxyEndpoint('coingecko', '/coins/markets', {
            vs_currency: 'usd',
            order: 'market_cap_desc',
            per_page: 250,
            page: 1,
            sparkline: false,
            include_rehypothecated: true
        }) || 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&include_rehypothecated=true';

        const response = await fetch(url);
        if (!response.ok) throw new Error('Ошибка загрузки топ монет');
        return await response.json();
    }

    /**
     * Upload to GitHub API
     */
    async function uploadToGithub(data, token) {
        const url = `https://api.github.com/repos/${CONFIG.repo}/contents/${CONFIG.path}`;
        const content = btoa(JSON.stringify(data, null, 2));

        console.log(`📤 Загрузка в GitHub: ${CONFIG.repo}/${CONFIG.path}...`);

        // 1. Get current file SHA
        let sha = null;
        try {
            const checkRes = await fetch(url, {
                headers: { 'Authorization': `token ${token}` }
            });
            if (checkRes.ok) {
                const fileData = await checkRes.json();
                sha = fileData.sha;
            }
        } catch (e) {}

        // 2. PUT request
        const res = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Update coins.json metadata (automated generator)',
                content: content,
                sha: sha,
                branch: CONFIG.branch
            })
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || 'Ошибка API GitHub');
        }

        console.log('🎉 Метаданные успешно обновлены на GitHub!');
        if (window.messagesStore) {
            window.messagesStore.addMessage({
                type: 'success',
                text: 'Файл coins.json успешно обновлен на GitHub CDN!',
                scope: 'global'
            });
        }
    }

    window.coinsMetadataGenerator = {
        generateAndUpload
    };

    console.log('coins-metadata-generator.js: initialized. Вызовите coinsMetadataGenerator.generateAndUpload() for обновления.');
})();
