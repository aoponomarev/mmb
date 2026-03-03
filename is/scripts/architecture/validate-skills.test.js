/**
 * @skill is/skills/arch-testing-ci
 * Tests for validate-skills.js (path existence in Implementation Status)
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..", "..");

test("validate-skills: passes on real project", () => {
  const result = execSync("node is/scripts/architecture/validate-skills.js", {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert.ok(result.includes("OK") || result.includes("skills"));
});

test("validate-skills: path existence fails on broken path in Implementation Status", () => {
  const skillPath = path.join(ROOT, "is", "skills", "tmp-test-path-existence.md");
  fs.writeFileSync(
    skillPath,
    `---
title: "Test"
reasoning_confidence: 1
reasoning_audited_at: "2026-01-01"
reasoning_checksum: "00000000"
---
# Test
> **Context**: Test
## Reasoning
- #for-test
## Implementation Status in Target App
- \`nonexistent-file-xyz-12345.js\`
`
  );
  try {
    execSync("node is/scripts/architecture/validate-skills.js", {
      cwd: ROOT,
      encoding: "utf8",
    });
    assert.fail("Expected validate-skills to fail");
  } catch (e) {
    const output = String(e.stdout ?? "") + String(e.stderr ?? "") + String(e.message ?? "");
    assert.ok(output.includes("nonexistent-file-xyz-12345") || e.status === 1, `Expected failure, got: ${output.slice(0, 300)}`);
  } finally {
    if (fs.existsSync(skillPath)) fs.unlinkSync(skillPath);
  }
});
