#!/usr/bin/env node
/**
 * #JS-qavGBqXj
 * @description Consolidated gate: id-contract-links, mixed-reference-mode, path-centric audits. Use --profile=id|mixed|path|full.
 * @skill id:sk-0e193a
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { ROOT } from "../../contracts/path-contracts.js";

const PROFILES = {
  id: ["validate-id-contract-links.js"],
  mixed: ["validate-mixed-reference-mode.js"],
  path: ["audit-path-centric-doc-links.js", "audit-path-centric-skill-links.js"],
  full: [
    "validate-id-contract-links.js",
    "audit-path-centric-doc-links.js",
    "audit-path-centric-skill-links.js",
    "validate-mixed-reference-mode.js",
  ],
};

function main() {
  const profileArg = process.argv.find((a) => a.startsWith("--profile="));
  const profile = profileArg ? profileArg.split("=")[1] : "full";
  const scripts = PROFILES[profile];
  if (!scripts) {
    console.error(`[validate-id-gate] Unknown profile: ${profile}. Use: id, mixed, path, full`);
    process.exit(1);
  }
  const base = path.join(ROOT, "is", "scripts", "architecture");
  for (const script of scripts) {
    execSync(`node ${path.join(base, script)}`, { stdio: "inherit", cwd: ROOT });
  }
}

main();
