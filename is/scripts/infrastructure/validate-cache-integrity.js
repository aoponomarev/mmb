/**
 * #JS-JZ7rgJVv
 * @description Validates cache integrity and secret resilience.
 * @skill id:sk-483943
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { ROOT } from "../../contracts/path-contracts.js";

const scriptPath = path.join(ROOT, "is/scripts/secrets/secret-resilience.js");

const run = spawnSync(process.execPath, [scriptPath, "--check"], {
  stdio: "inherit",
  shell: false,
});

if (run.status !== 0) {
  process.exit(run.status ?? 1);
}

console.log("[cache-integrity] OK");
