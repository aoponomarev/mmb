#!/usr/bin/env node
/**
 * @description Deploys Cloudflare edge-api worker and creates mandatory post-deploy deployment snapshot.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

function fail(message) {
  console.error(`[deploy:cloudflare-edge-api] FAILED: ${message}`);
  process.exit(1);
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    fail(`${command} ${args.join(" ")} exited with code ${result.status}`);
  }
}

function main() {
  console.log("[deploy:cloudflare-edge-api] Deploying worker...");
  run("npx", ["wrangler", "deploy"], __dirname);

  console.log("[deploy:cloudflare-edge-api] Creating mandatory deployment snapshot...");
  run(
    "node",
    ["is/scripts/infrastructure/archive-deployment-snapshot.js", "--target", "cloudflare-edge-api"],
    REPO_ROOT,
  );

  console.log("[deploy:cloudflare-edge-api] DONE");
}

main();
