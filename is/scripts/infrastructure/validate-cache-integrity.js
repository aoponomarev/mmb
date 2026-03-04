/**
 * @skill id:sk-483943
 * @description Validates cache integrity and secret resilience
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..", "..");

const scriptPath = path.join(ROOT, "is/scripts/secrets/secret-resilience.js");

const run = spawnSync(process.execPath, [scriptPath, "--check"], {
  stdio: "inherit",
  shell: false,
});

if (run.status !== 0) {
  process.exit(run.status ?? 1);
}

console.log("[cache-integrity] OK");
