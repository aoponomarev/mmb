/**
 * @skill id:sk-d6777d
 * Tests for validate-causality-exceptions-stale.js
 */
import test from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..", "..");

test("validate-causality-exceptions-stale: --json output has correct structure", () => {
  const result = execSync(
    "node is/scripts/architecture/validate-causality-exceptions-stale.js --json",
    { cwd: ROOT, encoding: "utf8" }
  );
  const data = JSON.parse(result);
  assert.ok(Array.isArray(data.stale_exceptions));
  data.stale_exceptions.forEach((s) => {
    assert.ok(s.hash);
    assert.ok(s.removed_from !== undefined);
  });
});
