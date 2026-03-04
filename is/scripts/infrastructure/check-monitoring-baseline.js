#!/usr/bin/env node
/**
 * #JS-FJ2YpGBU
 * @description Monitoring baseline: health contract, runbook sections, snapshot path.
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, accessSync, constants, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..", ".."); // adjusted because script is in is/scripts/infrastructure/

const RUNBOOK_PATH = join(REPO_ROOT, "docs", "runbooks", "monitoring-baseline.md");
const LOG_DIR = join(REPO_ROOT, "logs");
const SNAPSHOT_FILE = join(LOG_DIR, "monitoring-health.jsonl");

const REQUIRED_RUNBOOK_PHRASES = [
  "baseline",
  "redaction",
  "health snapshot",
  "incident",
  "alert",
  "severity",
  "rollback",
];

function fail(message) {
  console.error(`[monitoring:baseline] FAILED: ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function assertHasText(path, phrase) {
  assert(existsSync(path), `required file missing: ${path}`);
  const lower = readFileSync(path, "utf8").toLowerCase();
  assert(lower.includes(phrase), `monitoring runbook missing required phrase: ${phrase}`);
}

function hasWritableDir(dirPath) {
  mkdirSync(dirPath, { recursive: true });
  accessSync(dirPath, constants.W_OK);
  const stat = statSync(dirPath);
  return stat.isDirectory();
}

function runHealthJson() {
  const raw = execSync("node is/scripts/infrastructure/health-check.js --json", {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: "pipe",
  });
  const payload = JSON.parse(raw);
  assert(payload && typeof payload === "object", "health payload is invalid");
  assert(typeof payload.timestamp === "string", "health payload missing timestamp");
  assert(payload.planes && typeof payload.planes === "object", "health payload missing planes");
  assert(typeof payload.overall === "string", "health payload missing overall status");
  return payload;
}

function main() {
  const healthPayload = runHealthJson();
  assertHasText(RUNBOOK_PATH, "monitoring baseline");
  for (const phrase of REQUIRED_RUNBOOK_PHRASES) {
    assertHasText(RUNBOOK_PATH, phrase);
  }

  assert(hasWritableDir(LOG_DIR), `cannot write to logs directory: ${LOG_DIR}`);

  if (healthPayload.overall !== "healthy" && healthPayload.overall !== "degraded" && healthPayload.overall !== "unhealthy") {
    fail(`unexpected control-plane status: ${healthPayload.overall}`);
  }

  console.log("[monitoring:baseline] OK");
}

main();
