/**
 * @skill is/skills/arch-testing-ci
 * Tests for validate-affected-skills.js
 */
import test from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..", "..");

test("validate-affected-skills: --no-git with stdin finds @skill in file", () => {
  const input = "is/scripts/preflight.js\n";
  const result = execSync(
    "node is/scripts/architecture/validate-affected-skills.js --no-git --json",
    {
      cwd: ROOT,
      encoding: "utf8",
      input,
    }
  );
  const data = JSON.parse(result);
  assert.ok(Array.isArray(data.affected_skills));
  assert.ok(Array.isArray(data.affected_hashes));
  assert.ok(Array.isArray(data.changed_files));
  assert.ok(data.changed_files.includes("is/scripts/preflight.js"));
});

test("validate-affected-skills: --json output has correct structure", () => {
  const input = "core/api/some-nonexistent-for-test.js\n";
  const result = execSync(
    "node is/scripts/architecture/validate-affected-skills.js --no-git --json",
    {
      cwd: ROOT,
      encoding: "utf8",
      input,
    }
  );
  const data = JSON.parse(result);
  assert.strictEqual(typeof data.changed_files, "object");
  assert.strictEqual(typeof data.affected_skills, "object");
  assert.strictEqual(typeof data.affected_hashes, "object");
  assert.strictEqual(process.exitCode ?? 0, 0);
});
