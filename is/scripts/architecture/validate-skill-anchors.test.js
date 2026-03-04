/**
 * @skill id:sk-d6777d
 * Tests for validate-skill-anchors.js
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..", "..");

test("validate-skill-anchors: passes on real project", () => {
  const result = execSync("node is/scripts/architecture/validate-skill-anchors.js", {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert.ok(result.includes("OK"));
});

test("validate-skill-anchors: fails when @skill references non-existent skill file", () => {
  const testFile = path.join(ROOT, "core", "api", "tmp-anchor-test.js");
  fs.writeFileSync(
    testFile,
    `/**
 * @skill is/skills/nonexistent-skill-xyz-12345
 */
export default {};
`
  );
  try {
    execSync("node is/scripts/architecture/validate-skill-anchors.js", {
      cwd: ROOT,
      encoding: "utf8",
    });
    assert.fail("Expected validate-skill-anchors to fail");
  } catch (e) {
    const output = String(e.stdout ?? "") + String(e.stderr ?? "") + String(e.message ?? "");
    assert.ok(output.includes("nonexistent-skill-xyz-12345") || e.status === 1);
  } finally {
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
  }
});
