import test from "node:test";
import assert from "node:assert/strict";
import {
    isValidSkillPrefix,
    shouldValidateSkillPrefix,
    SKILL_ALLOWED,
    SKILL_PRIMARY,
    SKILL_TYPE_TO_PREFIX,
} from "./prefixes.js";

test("isValidSkillPrefix: accepts primary prefixes", () => {
    assert.equal(isValidSkillPrefix("a-foundation.md"), true);
    assert.equal(isValidSkillPrefix("ai-collaboration.md"), true);
    assert.equal(isValidSkillPrefix("ais-control-plane.md"), true);
    assert.equal(isValidSkillPrefix("is-env-sync.md"), true);
});

test("isValidSkillPrefix: accepts concept, vendor, tech, doc prefixes", () => {
    assert.equal(isValidSkillPrefix("ssot-paths.md"), true);
    assert.equal(isValidSkillPrefix("yc-functions.md"), true);
    assert.equal(isValidSkillPrefix("cf-workers.md"), true);
    assert.equal(isValidSkillPrefix("db-sqlite.md"), true);
    assert.equal(isValidSkillPrefix("mcp-ecosystem.md"), true);
    assert.equal(isValidSkillPrefix("n8n-workflows.md"), true);
    assert.equal(isValidSkillPrefix("docker-compose.md"), true);
    assert.equal(isValidSkillPrefix("runbook-rollback.md"), true);
    assert.equal(isValidSkillPrefix("plan-migration.md"), true);
});

test("isValidSkillPrefix: accepts legacy prefixes", () => {
    assert.equal(isValidSkillPrefix("arch-foundation.md"), true);
    assert.equal(isValidSkillPrefix("process-env-sync.md"), true);
});

test("isValidSkillPrefix: rejects invalid prefix", () => {
    assert.equal(isValidSkillPrefix("foo-bar.md"), false);
    assert.equal(isValidSkillPrefix("unknown-skill.md"), false);
});

test("shouldValidateSkillPrefix: validates is/skills files", () => {
    assert.equal(shouldValidateSkillPrefix("is/skills/arch-foundation.md"), true);
    assert.equal(shouldValidateSkillPrefix("is/skills/a-foundation.md"), true);
});

test("shouldValidateSkillPrefix: exempts README and causality-registry", () => {
    assert.equal(shouldValidateSkillPrefix("is/skills/README.md"), false);
    assert.equal(shouldValidateSkillPrefix("is/skills/causality-registry.md"), false);
});

test("shouldValidateSkillPrefix: exempts references subfolder", () => {
    assert.equal(shouldValidateSkillPrefix("is/skills/references/commands.md"), false);
});

test("SKILL_TYPE_TO_PREFIX: maps all types", () => {
    assert.equal(SKILL_TYPE_TO_PREFIX.a, "a-");
    assert.equal(SKILL_TYPE_TO_PREFIX.ai, "ai-");
    assert.equal(SKILL_TYPE_TO_PREFIX.arch, "arch-");
});
