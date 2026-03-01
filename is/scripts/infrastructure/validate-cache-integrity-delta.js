/**
 * @skill arch-foundation
 * @description Delta-fast gate:
 * - validates only staged changes related to secret/cache/infra contracts
 * - runs in milliseconds and fails early before full integrity checks
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..", "..");

const SENSITIVE_PATH_PATTERNS = [
  /^\.env\.example$/,
  /^is\/contracts\/paths\/paths\.js$/,
  /^is\/scripts\/(secrets|infrastructure)\/.*\.js$/,
  /^is\/scripts\/preflight\.js$/,
  /^docs\/plans\/.*\.md$/,
];

const SECRET_DIFF_PATTERNS = [
  /ghp_[A-Za-z0-9]{20,}/,
  /AIza[0-9A-Za-z\-_]{20,}/,
  /sk-[A-Za-z0-9]{20,}/,
  /Bearer\s+[A-Za-z0-9\-._=]{20,}/,
  /jwt[_-]?secret\s*[:=]\s*["'][A-Za-z0-9\-_]{8,}["']/i,
  /api[_-]?key\s*[:=]\s*["'][A-Za-z0-9\-_]{12,}["']/i,
];

function runGit(args) {
  return spawnSync("git", args, { encoding: "utf8", shell: false });
}

function getStagedFiles() {
  const res = runGit(["diff", "--cached", "--name-only"]);
  if (res.status !== 0) {
    throw new Error(res.stderr || "git diff --cached --name-only failed");
  }
  return res.stdout
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function getStagedDiff() {
  const res = runGit(["diff", "--cached"]);
  if (res.status !== 0) {
    throw new Error(res.stderr || "git diff --cached failed");
  }
  return res.stdout || "";
}

function matchesSensitive(paths) {
  return paths.some((p) => SENSITIVE_PATH_PATTERNS.some((re) => re.test(p)));
}

function checkSecretLeaks(diff) {
  const found = SECRET_DIFF_PATTERNS.find((re) => re.test(diff));
  if (found) {
    throw new Error(`Secret-like token detected in staged diff: ${found}`);
  }
}

function checkEnvExampleContractIfStaged(stagedFiles) {
  if (!stagedFiles.includes(".env.example")) return;
  const envExamplePath = path.join(ROOT, ".env.example");
  if (!fs.existsSync(envExamplePath)) {
    throw new Error("Staged .env.example but file not found on disk");
  }
  const content = fs.readFileSync(envExamplePath, "utf8");
  const required = ["DATA_PLANE_ACTIVE_APP=", "SYS_SECRET_ARCHIVE_KEY="];
  for (const marker of required) {
    if (!content.includes(marker)) {
      throw new Error(`.env.example is missing required contract key: ${marker.slice(0, -1)}`);
    }
  }
}

function checkNoLocalEnvInStaged(stagedFiles) {
  if (stagedFiles.includes(".env")) {
    throw new Error("Local .env is staged. Remove it from commit immediately.");
  }
}

function main() {
  const stagedFiles = getStagedFiles();
  if (stagedFiles.length === 0) {
    console.log("[cache-integrity:delta] no staged files");
    return;
  }

  if (!matchesSensitive(stagedFiles)) {
    console.log("[cache-integrity:delta] skipped: no sensitive infra/cache files in staged set");
    return;
  }

  checkNoLocalEnvInStaged(stagedFiles);
  const diff = getStagedDiff();
  checkSecretLeaks(diff);
  checkEnvExampleContractIfStaged(stagedFiles);

  console.log("[cache-integrity:delta] OK");
}

try {
  main();
} catch (err) {
  console.error(`[cache-integrity:delta] FAILED: ${err.message}`);
  process.exit(1);
}
