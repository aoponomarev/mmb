/**
 * #JS-TL3oPpPW
 * @description Tests for validate-dead-links.js.
 * @skill id:sk-d6777d
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..", "..");

test("validate-dead-links: --json output has correct structure", () => {
  const result = execSync("node is/scripts/architecture/validate-dead-links.js --json", {
    cwd: ROOT,
    encoding: "utf8",
  });
  const data = JSON.parse(result);
  assert.ok(Array.isArray(data.dead_links));
  data.dead_links.forEach((d) => {
    assert.ok(d.source_file);
    assert.ok(typeof d.line === "number");
    assert.ok(d.link);
    assert.strictEqual(d.exists, false);
  });
});
