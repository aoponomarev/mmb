#!/usr/bin/env node
/**
 * Skills health trend tracker.
 * Collects health snapshot metrics and appends to logs/skills-health-trend.jsonl.
 *
 * @skill is/skills/arch-foundation
 */
import { appendFileSync, existsSync, readFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..", "..");
const TREND_FILE = join(ROOT, "logs", "skills-health-trend.jsonl");
const CHECK_CMD = "node is/scripts/architecture/validate-skills.js --json";
const MAX_ENTRIES = 30;

function readTrendFile() {
  if (!existsSync(TREND_FILE)) return [];
  return readFileSync(TREND_FILE, "utf8")
    .split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    .map(l => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

function runHealthCheck() {
  try {
    return JSON.parse(execSync(CHECK_CMD, { encoding: "utf8", cwd: ROOT }).trim());
  } catch (err) {
    const out = (err.stdout || err.message || "").toString();
    try { return JSON.parse(out.trim()); } catch { throw err; }
  }
}

function calcTrend(entries) {
  if (entries.length === 0) return {};
  const first = entries[0]; const last = entries[entries.length - 1];
  const avg = entries.reduce((a, e) => a + (e.score ?? 0), 0) / entries.length;
  return { score_delta: Number(((last.score ?? 0) - (first.score ?? 0)).toFixed(2)), moving_avg: Number(avg.toFixed(2)) };
}

function main() {
  const current = runHealthCheck();
  const history = readTrendFile();
  const window = [...history.slice(-MAX_ENTRIES), current];
  const trend = calcTrend(window);
  const snapshot = {
    ts: new Date().toISOString(),
    total_skills: current.total_skills ?? 0,
    errors: current.errors ?? 0,
    warnings: current.warnings ?? 0,
    score: current.score ?? 100,
    stale_count: current.stale_count ?? 0,
    orphan_count: current.orphan_count ?? 0,
    score_delta_window: trend.score_delta ?? null,
  };
  mkdirSync(join(ROOT, "logs"), { recursive: true });
  appendFileSync(TREND_FILE, `${JSON.stringify(snapshot)}\n`, "utf8");
  if (trend.score_delta !== undefined && trend.score_delta <= -15) {
    console.warn(`[skills-health:trend] ALERT: score degraded by ${trend.score_delta}`);
  }
  console.log(`[skills-health:trend] appended -> score=${snapshot.score}, warnings=${snapshot.warnings}, stale=${snapshot.stale_count}, orphan=${snapshot.orphan_count}`);
}

main();
