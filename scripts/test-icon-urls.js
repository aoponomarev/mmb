/**
 * Console test: verify icon URL generation and CDN availability.
 * Run: node scripts/test-icon-urls.js
 */

const CDN_BASE = 'https://aoponomarev.github.io/a/coins/';
const ALIAS_MAP = { tether: 'usdt', 'usd-coin': 'usdc', 'binance-usd': 'busd' };

function getIconUrl(coinId, fallbackUrl = '') {
    if (!coinId) return fallbackUrl;
    const filename = ALIAS_MAP[coinId] || coinId;
    return `${CDN_BASE}${filename}.png?v=test`;
}

async function checkUrl(url) {
    try {
        const res = await fetch(url, { method: 'HEAD' });
        return res.status;
    } catch (e) {
        return `ERR: ${e.message}`;
    }
}

async function main() {
    const testCoins = [
        { id: 'bittensor', symbol: 'TAO' },
        { id: 'bitcoin', symbol: 'BTC' },
        { id: 'ethereum', symbol: 'ETH' },
        { id: 'tether', symbol: 'USDT' },
        { id: 'nonexistent-coin-xyz', symbol: 'XYZ' }
    ];

    console.log('Icon URL generation test:\n');
    for (const coin of testCoins) {
        const url = getIconUrl(coin.id, 'https://example.com/fallback.png');
        const status = await checkUrl(url);
        const ok = status === 200 ? '✓' : status === 404 ? '(404 fallback)' : '✗';
        console.log(`${coin.id} (${coin.symbol}): ${status} ${ok}`);
        console.log(`  URL: ${url}`);
    }

    console.log('\nCDN base check:');
    const baseStatus = await checkUrl(CDN_BASE.replace(/\/$/, '/bittensor.png'));
    console.log(`  ${CDN_BASE}bittensor.png → ${baseStatus}`);
}

main().catch(console.error);
