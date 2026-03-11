#!/usr/bin/env node
/**
 * @description Verifies deployed infrastructure targets before snapshot archiving; runs target-specific health and smoke checks.
 * @skill-anchor id:sk-e8f2a1 #for-post-deploy-auto-archive
 * @skill-anchor id:sk-5cd3c9 #for-transport-shape-verification
 */

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..", "..", "..");

const CLOUDFLARE_EDGE_API_HEALTH_URL = "https://app-api.ponomarev-ux.workers.dev/health";
const YANDEX_API_GATEWAY_NAME = "mbb-api-gw";
const YANDEX_MARKET_FETCHER_NAME = "coingecko-fetcher";
const FETCH_TIMEOUT_MS = 15000;
const FETCHER_VERIFY_TIMEOUT_MS = 180000;
const FRESH_FETCHER_RESULT_MAX_AGE_MS = 15 * 60 * 1000;

function fail(message) {
    console.error(`[verify-deployment-target] FAILED: ${message}`);
    process.exit(1);
}

function assert(condition, message) {
    if (!condition) {
        fail(message);
    }
}

function getArgValue(flag) {
    const index = process.argv.indexOf(flag);
    if (index === -1) return null;
    return process.argv[index + 1] || null;
}

function runJson(command, args, cwd = REPO_ROOT) {
    const result = spawnSync(command, [...args, "--format", "json"], {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"]
    });
    if (result.status !== 0) {
        fail(`${command} ${args.join(" ")}\n${(result.stderr || "").trim()}`);
    }
    try {
        return JSON.parse(result.stdout || "{}");
    } catch (error) {
        fail(`Cannot parse JSON from ${command} ${args.join(" ")}: ${error.message}`);
    }
}

async function request(url, init = {}, options = {}) {
    if (typeof fetch !== "function") {
        fail("Global fetch is unavailable in this Node runtime");
    }

    const label = options.label || url;
    const timeoutMs = options.timeoutMs || FETCH_TIMEOUT_MS;
    const response = await fetch(url, {
        ...init,
        signal: init.signal || AbortSignal.timeout(timeoutMs)
    });

    const text = await response.text();
    let data = null;
    if (text) {
        try {
            data = JSON.parse(text);
        } catch (_) {
            data = null;
        }
    }

    return { response, text, data, label };
}

async function requestJson(url, init = {}, options = {}) {
    const result = await request(url, init, options);
    if (!result.response.ok) {
        fail(`${result.label} returned ${result.response.status}${result.text ? `: ${result.text}` : ""}`);
    }
    if (!result.data || typeof result.data !== "object") {
        fail(`${result.label} did not return JSON`);
    }
    return result.data;
}

async function requestStatus(url, expectedStatus, init = {}, options = {}) {
    const result = await request(url, init, options);
    if (result.response.status !== expectedStatus) {
        fail(`${result.label} returned ${result.response.status}, expected ${expectedStatus}${result.text ? `: ${result.text}` : ""}`);
    }
    return result;
}

function getYandexApiGatewayBaseUrl() {
    const gateway = runJson("yc", ["serverless", "api-gateway", "get", YANDEX_API_GATEWAY_NAME]);
    const domain = String(gateway?.domain || "").trim();
    assert(domain, `API Gateway ${YANDEX_API_GATEWAY_NAME} has no domain`);
    return domain.startsWith("http://") || domain.startsWith("https://")
        ? domain
        : `https://${domain}`;
}

async function verifyCloudflareEdgeApi() {
    const data = await requestJson(CLOUDFLARE_EDGE_API_HEALTH_URL, { method: "GET" }, {
        label: "Cloudflare Edge API health"
    });
    assert(data.status === "ok", `Cloudflare Edge API health returned unexpected status: ${JSON.stringify(data)}`);
    console.log("[verify-deployment-target] OK: cloudflare-edge-api");
}

async function verifyYandexApiGateway() {
    const baseUrl = getYandexApiGatewayBaseUrl();
    const health = await requestJson(`${baseUrl}/health`, { method: "GET" }, {
        label: "Yandex API Gateway /health"
    });
    assert(String(health.status || "").toUpperCase() === "OK", `Yandex API Gateway /health returned unexpected payload: ${JSON.stringify(health)}`);

    const countInfo = await requestJson(`${baseUrl}/api/coins/market-cache?count_only=true`, { method: "GET" }, {
        label: "Yandex API Gateway count_only"
    });
    assert(Number.isFinite(Number(countInfo.count)), `Yandex API Gateway count_only returned invalid count: ${JSON.stringify(countInfo)}`);

    await requestStatus(`${baseUrl}/api/coins/market-cache`, 403, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coins: [] })
    }, {
        label: "Yandex API Gateway forbidden browser write probe"
    });

    console.log("[verify-deployment-target] OK: yandex-api-gateway");
}

async function verifyYandexMarketFetcher() {
    const fetcher = runJson("yc", ["serverless", "function", "get", YANDEX_MARKET_FETCHER_NAME]);
    const invokeUrl = String(fetcher?.http_invoke_url || "").trim();
    assert(invokeUrl, `${YANDEX_MARKET_FETCHER_NAME} has no http_invoke_url`);

    const invokeResult = await requestJson(invokeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            order: "market_cap",
            deploy_verification: true,
            bypass_window: true
        })
    }, {
        label: "Yandex market-fetcher verification invoke",
        timeoutMs: FETCHER_VERIFY_TIMEOUT_MS
    });

    assert(String(invokeResult.status || "").toUpperCase() === "OK", `Market fetcher verification did not complete successfully: ${JSON.stringify(invokeResult)}`);
    assert(Number(invokeResult.coins_fetched) === 250, `Market fetcher verification returned unexpected coins_fetched: ${JSON.stringify(invokeResult)}`);
    assert(invokeResult.order_fetched === "market_cap", `Market fetcher verification returned unexpected order: ${JSON.stringify(invokeResult)}`);

    const baseUrl = getYandexApiGatewayBaseUrl();
    const countInfo = await requestJson(`${baseUrl}/api/coins/market-cache?count_only=true`, { method: "GET" }, {
        label: "Yandex market-cache freshness probe"
    });

    const fetchedAtMs = Date.parse(String(countInfo.fetched_at || ""));
    assert(!Number.isNaN(fetchedAtMs), `Market cache freshness probe returned invalid fetched_at: ${JSON.stringify(countInfo)}`);
    assert(Date.now() - fetchedAtMs <= FRESH_FETCHER_RESULT_MAX_AGE_MS, `Market cache fetched_at is not fresh enough after verification invoke: ${JSON.stringify(countInfo)}`);

    console.log("[verify-deployment-target] OK: yandex-market-fetcher");
}

async function main() {
    const target = getArgValue("--target");
    if (!target) {
        fail("Missing --target <cloudflare-edge-api|yandex-api-gateway|yandex-market-fetcher>");
    }

    if (target === "cloudflare-edge-api") {
        await verifyCloudflareEdgeApi();
        return;
    }
    if (target === "yandex-api-gateway") {
        await verifyYandexApiGateway();
        return;
    }
    if (target === "yandex-market-fetcher") {
        await verifyYandexMarketFetcher();
        return;
    }

    fail(`Unsupported target: ${target}`);
}

main().catch((error) => {
    fail(error?.stack || error?.message || String(error));
});
