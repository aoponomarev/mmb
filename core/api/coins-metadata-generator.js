/**
 * #JS-mi2ffpht
 * @description Auto-generate and upload coins.json to GitHub: collect stablecoins from market-cache, detect Wrapped/LST, build JSON, upload via API (app_github_token).
 * @skill id:sk-bb7c8e
 * @skill-anchor id:sk-bb7c8e #for-layer-separation
 * @skill-anchor id:sk-224210 #for-data-provider-interface
 *
 * HOW: 1) dataProviderManager.getTopCoins (cap+vol) 2) stablecoinFilter.extractFromCoins 3) detect Wrapped/LST (heuristics) 4) upload to GitHub.
 */

(function() {
    'use strict';

    const CONFIG = {
        repo: 'aoponomarev/a',
        path: 'data/coins.json',
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
            // 1. Fetch top coins from market-cache (cap + vol 250)
            console.log('📡 Загрузка монет из market-cache (cap|vol 250)...');
            const coinsMarketCap = await getTopCoinsFromMarket(500, 'market_cap');
            const coinsVolume = await getTopCoinsFromMarket(250, 'volume');
            const byId = new Map(coinsMarketCap.map(c => [c.id, c]));
            coinsVolume.forEach(c => { if (!byId.has(c.id)) byId.set(c.id, c); });
            const topCoins = Array.from(byId.values());

            // 2. Extract stablecoins by price peg
            console.log('📡 Сбор стейблкоинов из market-cache...');
            let stableList = [];
            if (window.stablecoinFilter && typeof window.stablecoinFilter.extractFromCoins === 'function') {
                stableList = window.stablecoinFilter.extractFromCoins(topCoins);
            }

            // 3. Detect Wrapped/LST (heuristics)
            console.log('📡 Поиск Wrapped и LST монет...');
            const wrappedIds = [];
            const lstIds = [];

            topCoins.forEach(coin => {
                const id = coin.id.toLowerCase();
                const name = (coin.name || '').toLowerCase();
                const symbol = (coin.symbol || '').toLowerCase();

                if (stableList.some(s => s.id === id)) return;

                if (id.includes('wrapped-') || name.includes('wrapped ') || (symbol.startsWith('w') && symbol.length > 2 && id !== 'waves')) {
                    wrappedIds.push(id);
                } else if (id.includes('staked-') || name.includes('staked ') || name.includes('liquid staking') || id.endsWith('-steth')) {
                    lstIds.push(id);
                }
            });

            // 4. Build stable by peg (usd, eur, gold, silver, oil, etc.)
            const stableByPeg = {};
            stableList.forEach(s => {
                const peg = s.baseCurrency || 'other';
                if (!stableByPeg[peg]) stableByPeg[peg] = [];
                stableByPeg[peg].push(s.id);
            });
            Object.keys(stableByPeg).forEach(k => stableByPeg[k].sort());

            const result = {
                stable: stableByPeg,
                wrapped: Array.from(new Set(wrappedIds)).sort(),
                lst: Array.from(new Set(lstIds)).sort(),
                updatedAt: Date.now()
            };

            const totalStable = stableList.length;
            const pegSummary = Object.entries(stableByPeg).map(([k, v]) => `${k}:${v.length}`).join(', ');
            console.log(`✅ Сформировано: ${totalStable} стейблов (${pegSummary}), ${result.wrapped.length} оберток, ${result.lst.length} LST`);

            await uploadToGithub(result, token);

        } catch (error) {
            console.error('❌ CoinsMetadataGenerator: ошибка:', error);
            if (window.messagesStore) {
                window.messagesStore.addMessage({ type: 'danger', text: 'Ошибка генерации метаданных: ' + error.message, scope: 'global' });
            }
        }
    }

    /**
     * Fetch top coins from market-cache (dataProviderManager → Yandex when available)
     */
    async function getTopCoinsFromMarket(count, sortBy) {
        if (window.dataProviderManager && typeof window.dataProviderManager.getTopCoins === 'function') {
            return await window.dataProviderManager.getTopCoins(count, sortBy);
        }
        throw new Error('dataProviderManager недоступен');
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
