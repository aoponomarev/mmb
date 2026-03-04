#!/usr/bin/env node
/**
 * #JS-YCGwWY95
 * @description Collect and append a compact monitoring snapshot for Target App.
 */
import { appendFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..", ".."); // adjusted to is/scripts/infrastructure/

const SNAPSHOT_PATH = join(REPO_ROOT, "logs", "monitoring-health.jsonl");

function fail(message) {
  console.error(`[monitoring:snapshot] FAILED: ${message}`);
  process.exit(1);
}

function main() {
  const raw = execSync("node is/scripts/infrastructure/health-check.js --json", {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: "pipe",
  });

  const payload = JSON.parse(raw);
  payload.target_app_snapshot_version = "1";
  payload.generated_at = new Date().toISOString();

  const entry = JSON.stringify(payload);
  mkdirSync(join(REPO_ROOT, "logs"), { recursive: true });
  appendFileSync(SNAPSHOT_PATH, `${entry}\n`);

  console.log(`[monitoring:snapshot] ok -> ${SNAPSHOT_PATH}`);
}

try {
  main();
} catch (error) {
  fail(error?.message || String(error));
}
