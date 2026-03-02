/**
 * @skill is/skills/arch-backend-core
 * @skill is/skills/process-env-sync
 *
 * Market Snapshot server entrypoint — env-driven host/port, graceful shutdown.
 */
import { createBackendMarketRuntime } from "../../../core/api/backend-market-runtime.js";
import { createMarketSnapshotNodeServer } from "../../../core/api/market-snapshot-node-server.js";

function toInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.floor(parsed);
}

const host = process.env.TARGET_MARKET_HTTP_HOST || "127.0.0.1";
const port = Math.max(0, toInt(process.env.TARGET_MARKET_HTTP_PORT, 18082));
const shutdownTimeoutMs = Math.max(100, toInt(process.env.TARGET_MARKET_HTTP_SHUTDOWN_TIMEOUT_MS, 5000));

const runtime = createBackendMarketRuntime({
  timeoutMs: 10_000,
  marketTtlMs: 60 * 60 * 1000,
});

const server = createMarketSnapshotNodeServer({
  handler: runtime.marketSnapshotHttpHandler,
  host,
  port,
  shutdownTimeoutMs,
  requestLogger: ({ method, url, status }) => {
    console.log(`[market-http:req] ${method} ${url} -> ${status}`);
  },
});

async function main() {
  const bound = await server.start();
  console.log(`[market-http] running at http://${bound.host}:${bound.port}/api/market-snapshot`);
  const stop = async () => {
    await server.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((error) => {
  console.error("[market-http] FAILED");
  console.error(error?.message || error);
  process.exit(1);
});
