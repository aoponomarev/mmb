/**
 * #JS-mi2ffpht
 * @description Auto-generate and upload coins.json to GitHub: collect stablecoins from market-cache, preserve curated wrapped/lst, upload via API (app_github_token).
 * @skill id:sk-bb7c8e
 * @skill-anchor id:sk-bb7c8e #for-layer-separation
 * @skill-anchor id:sk-224210 #for-data-provider-interface
 *
 * HOW: 1) dataProviderManager.getTopCoins (cap+vol) 2) stablecoinFilter.extractFromCoins 3) preserve curated wrapped/lst from existing metadata 4) upload to GitHub.
 */

(function() {
    'use strict';

    const CONFIG = {
        repo: 'aoponomarev/a',
        path: 'data/coins.json',
        branch: 'main'
    };

    const COMMODITY_PEGS = new Set(['gold', 'silver', 'platinum', 'palladium', 'oil']);

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
            // The generator derives its base list from market-cache so runtime and published metadata follow the same source.
            console.log('📡 Загрузка монет из market-cache (cap|vol 250)...');
            const coinsMarketCap = await getTopCoinsFromMarket(500, 'market_cap');
            const coinsVolume = await getTopCoinsFromMarket(250, 'volume');
            const byId = new Map(coinsMarketCap.map(c => [c.id, c]));
            coinsVolume.forEach(c => { if (!byId.has(c.id)) byId.set(c.id, c); });
            const topCoins = Array.from(byId.values());

            // Stablecoin grouping must be derived from peg detection, not from a hand-maintained id mapping.
            console.log('📡 Сбор стейблкоинов из market-cache...');
            let stableList = [];
            if (window.stablecoinFilter && typeof window.stablecoinFilter.extractFromCoins === 'function') {
                stableList = window.stablecoinFilter.extractFromCoins(topCoins);
            }

            const existingMetadata = await loadCurrentMetadata(token);

            // @causality #for-curated-wrapped-lst-preservation
            // Wrapped and LST: preserve curated registry (SSOT). No heuristics — manual curation only.
            const wrappedIds = existingMetadata?.wrapped && Array.isArray(existingMetadata.wrapped)
                ? [...existingMetadata.wrapped].map(id => String(id).toLowerCase()).sort()
                : [];
            const lstIds = existingMetadata?.lst && Array.isArray(existingMetadata.lst)
                ? [...existingMetadata.lst].map(id => String(id).toLowerCase()).sort()
                : [];

            const stable = buildStableMetadata(stableList, existingMetadata?.stable);

            const result = {
                stable,
                wrapped: wrappedIds,
                lst: lstIds,
                updatedAt: Date.now()
            };

            const totalStable = [
                ...Object.values(stable.fiat),
                ...Object.values(stable.commodity)
            ].reduce((sum, ids) => sum + ids.length, 0);
            const pegSummary = [
                ...Object.entries(stable.fiat).map(([k, v]) => `fiat.${k}:${v.length}`),
                ...Object.entries(stable.commodity).map(([k, v]) => `commodity.${k}:${v.length}`)
            ].join(', ');
            console.log(`✅ Сформировано: ${totalStable} стейблов (${pegSummary}), ${result.wrapped.length} wrapped (curated), ${result.lst.length} LST (curated)`);

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

    function buildStableMetadata(stableList, currentStable) {
        const detectedIds = new Set();
        const stable = {
            fiat: {},
            commodity: {}
        };

        stableList.forEach(item => {
            const id = String(item?.id || '').toLowerCase();
            const peg = normalizePeg(item?.baseCurrency);
            if (!id || !peg) return;

            detectedIds.add(id);
            addStableId(stable, peg, id);
        });

        // Preserve curated ids that the price detector cannot reliably regenerate from market-cache alone.
        if (currentStable && typeof currentStable === 'object') {
            ['fiat', 'commodity'].forEach(section => {
                const groups = currentStable[section];
                if (!groups || typeof groups !== 'object' || Array.isArray(groups)) return;

                Object.entries(groups).forEach(([peg, ids]) => {
                    if (!Array.isArray(ids)) return;

                    ids.forEach(rawId => {
                        const id = String(rawId || '').toLowerCase();
                        if (!id || detectedIds.has(id)) return;
                        addStableId(stable, normalizePeg(peg), id);
                    });
                });
            });
        }

        return {
            fiat: sortStableGroups(stable.fiat),
            commodity: sortStableGroups(stable.commodity)
        };
    }

    function addStableId(stable, peg, id) {
        const section = isCommodityPeg(peg) ? 'commodity' : 'fiat';
        if (!stable[section][peg]) {
            stable[section][peg] = [];
        }
        if (!stable[section][peg].includes(id)) {
            stable[section][peg].push(id);
        }
    }

    function isCommodityPeg(peg) {
        return COMMODITY_PEGS.has(normalizePeg(peg));
    }

    function normalizePeg(peg) {
        const normalized = String(peg || '').toLowerCase();
        if (!normalized) return '';
        return normalized === 'gold_small' ? 'gold' : normalized;
    }

    function sortStableGroups(groups) {
        return Object.fromEntries(
            Object.entries(groups)
                .sort(([left], [right]) => left.localeCompare(right))
                .map(([peg, ids]) => [peg, [...ids].sort()])
        );
    }

    async function loadCurrentMetadata(token) {
        try {
            const response = await fetch(getGithubContentsUrl(), {
                headers: { 'Authorization': `token ${token}` }
            });

            if (!response.ok) {
                return null;
            }

            const fileData = await response.json();
            if (!fileData.content) {
                return null;
            }

            try {
                return JSON.parse(atob(String(fileData.content).replace(/\n/g, '')));
            } catch (error) {
                console.warn('coinsMetadataGenerator: current metadata parse failed', error);
                return null;
            }
        } catch (error) {
            console.warn('coinsMetadataGenerator: current metadata fetch failed', error);
            return null;
        }
    }

    /**
     * Upload to GitHub API
     */
    async function uploadToGithub(data, token) {
        const url = getGithubContentsUrl();
        const content = btoa(JSON.stringify(data, null, 2));

        console.log(`📤 Загрузка в GitHub: ${CONFIG.repo}/${CONFIG.path}...`);

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

    function getGithubContentsUrl() {
        return `https://api.github.com/repos/${CONFIG.repo}/contents/${CONFIG.path}`;
    }

    window.coinsMetadataGenerator = {
        generateAndUpload
    };

    console.log('coins-metadata-generator.js: initialized. Вызовите coinsMetadataGenerator.generateAndUpload() for обновления.');
})();
