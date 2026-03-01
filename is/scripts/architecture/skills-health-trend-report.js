#!/usr/bin/env node
/**
 * Generate concise summary from skills health trend log.
 *
 * Usage: node is/scripts/architecture/skills-health-trend-report.js --last 30
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..", "..");
const TREND_FILE = join(ROOT, "logs", "skills-health-trend.jsonl");

function parseArgs() {
  const args = process.argv.slice(2);
  const idx = args.findIndex(v => v === "--last");
  const last = Number.parseInt(idx >= 0 ? args[idx + 1] : "30", 10);
  return { last: Number.isInteger(last) && last > 0 ? last : 30 };
}

function readSamples() {
  if (!existsSync(TREND_FILE)) return [];
  return readFileSync(TREND_FILE, "utf8")
    .split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    .map(l => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

function stats(samples) {
  if (!samples.length) return null;
  const ordered = samples.sort((a, b) => String(a.ts).localeCompare(String(b.ts)));
  const scores = ordered.map(x => x.score ?? 0);
  const total = scores.length;
  const avg = Number((scores.reduce((s, n) => s + n, 0) / total).toFixed(2));
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const delta = Number((scores[total - 1] - scores[0]).toFixed(2));
  return { totalSamples: total, avgScore: avg, minScore: min, maxScore: max, scoreDelta: delta, latest: ordered[total - 1] };
}

function main() {
  const { last } = parseArgs();
  const samples = readSamples().slice(-last);
  const summary = stats(samples);
  if (!summary) { console.log("No data yet: run `npm run skills:health:trend` first."); return; }
  console.log(`# Skills health trend (last ${summary.totalSamples} samples)`);
  console.log(`- avgScore: ${summary.avgScore}`);
  console.log(`- minScore: ${summary.minScore}`);
  console.log(`- maxScore: ${summary.maxScore}`);
  console.log(`- scoreDelta: ${summary.scoreDelta}`);
  console.log(`- latest.score: ${summary.latest.score}`);
  console.log(`- latest.warnings: ${summary.latest.warnings}`);
  console.log(`- latest.orphan_count: ${summary.latest.orphan_count}`);
  console.log(`- latest.stale_count: ${summary.latest.stale_count}`);
  if (summary.scoreDelta < -10) {
    console.warn(`[skills-health:trend-report] ALERT: score decreased by ${summary.scoreDelta}`);
  }
}

main();
