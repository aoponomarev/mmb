/**
 * #JS-kMzbwkJo
 * @description Orchestrates batch validation: validate-skills, validate-dead-links, validate-causality-exceptions-stale.
 * @skill id:sk-7d810a
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..", "..");

const JSON_MODE = process.argv.includes("--json");

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: "utf8", cwd: ROOT, ...opts });
  } catch (e) {
    return e.stdout || e.stderr || String(e.message || "");
  }
}

function main() {
  console.log("[skills-batch-review] Running validate-skills...");
  const skillsOut = run("node is/scripts/architecture/validate-skills.js --json", {
    maxBuffer: 1024 * 1024,
  });
  let skillsResult = null;
  try {
    skillsResult = JSON.parse(skillsOut.trim());
  } catch {
    skillsResult = { ok: false, raw: skillsOut.slice(0, 500) };
  }

  console.log("[skills-batch-review] Running validate-dead-links...");
  const deadOut = run("node is/scripts/architecture/validate-dead-links.js --json");
  let deadResult = { dead_links: [] };
  try {
    deadResult = JSON.parse(deadOut.trim());
  } catch {
    // keep default
  }

  console.log("[skills-batch-review] Running validate-causality-exceptions-stale...");
  const staleOut = run("node is/scripts/architecture/validate-causality-exceptions-stale.js --json");
  let staleResult = { stale_exceptions: [] };
  try {
    staleResult = JSON.parse(staleOut.trim());
  } catch {
    // keep default
  }

  const report = {
    skills: skillsResult,
    dead_links: deadResult.dead_links || [],
    stale_exceptions: staleResult.stale_exceptions || [],
    summary: {
      skills_ok: (skillsResult?.errors ?? 1) === 0,
      dead_links_count: (deadResult.dead_links || []).length,
      stale_exceptions_count: (staleResult.stale_exceptions || []).length,
    },
  };

  if (JSON_MODE) {
    process.stdout.write(JSON.stringify(report, null, 2));
    process.exit(0);
  }

  console.log("\n--- Batch Review Summary ---");
  console.log(`Skills: ${report.summary.skills_ok ? "OK" : "FAILED"}`);
  console.log(`Dead links: ${report.summary.dead_links_count}`);
  console.log(`Stale causality exceptions: ${report.summary.stale_exceptions_count}`);

  if (report.dead_links.length > 0) {
    console.log("\nDead links (first 10):");
    report.dead_links.slice(0, 10).forEach((d) => {
      console.log(`  ${d.source_file}:${d.line} — ${d.link}`);
    });
  }
  if (report.stale_exceptions.length > 0) {
    console.log("\nStale exceptions:");
    report.stale_exceptions.forEach((s) => {
      console.log(`  ${s.hash} (was: ${s.removed_from})`);
    });
  }

  process.exit(0);
}

main();
