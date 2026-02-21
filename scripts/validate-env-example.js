/**
 * Skill: process/process-env-sync-governance
 */
import fs from "fs";
import { paths } from "../paths.js";

function parseEnvKeys(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => line.slice(0, line.indexOf("=")).trim())
    .filter(Boolean);
}

function unique(list) {
  return [...new Set(list)];
}

function main() {
  const envPath = paths.project(".env");
  const envExamplePath = paths.project(".env.example");

  if (!fs.existsSync(envPath)) {
    console.error("[env-check] Missing .env (it is required locally).");
    process.exit(1);
  }
  if (!fs.existsSync(envExamplePath)) {
    console.error("[env-check] Missing .env.example");
    process.exit(1);
  }

  const envKeys = unique(parseEnvKeys(fs.readFileSync(envPath, "utf8")));
  const exampleKeys = unique(parseEnvKeys(fs.readFileSync(envExamplePath, "utf8")));

  const missingInExample = envKeys.filter((key) => !exampleKeys.includes(key));
  const extraInExample = exampleKeys.filter((key) => !envKeys.includes(key));

  if (missingInExample.length || extraInExample.length) {
    console.error("[env-check] .env.example is out of sync with .env");
    if (missingInExample.length) {
      console.error(`[env-check] Missing in .env.example (${missingInExample.length}):`);
      for (const key of missingInExample) console.error(`  - ${key}`);
    }
    if (extraInExample.length) {
      console.error(`[env-check] Extra in .env.example (${extraInExample.length}):`);
      for (const key of extraInExample) console.error(`  - ${key}`);
    }
    process.exit(1);
  }

  console.log(`[env-check] OK: ${envKeys.length} keys are synchronized.`);
}

main();
