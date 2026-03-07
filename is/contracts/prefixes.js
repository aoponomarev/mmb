/**
 * #JS-Q6dEzQ3S
 * @description SSOT: Global prefix registry for skills and modules. Single source of truth.
 * @skill id:sk-d763e7
 * @see id:sk-d763e7
 *
 * AGENT OBLIGATION: When creating or naming a skill file with a prefix, the AI agent MUST:
 * 1. Check this registry for an existing prefix that fits the skill's domain.
 * 2. If no similar prefix exists — register the new prefix here (add to appropriate
 *    category, SKILL_SEMANTICS, SKILL_TYPE_TO_PREFIX, SKILL_ALLOWED).
 * 3. Do NOT invent ad-hoc prefixes without registering them. Unregistered prefixes
 *    will fail the validate-skills gate.
 */

// === SKILL PREFIXES (is/skills/) ===

/** Primary: layer/domain */
export const SKILL_PRIMARY = ["a-", "ai-", "ais-", "is-"];

/** Concept: canonical contracts, protocols */
export const SKILL_CONCEPT = ["ssot-", "protocol-", "contract-"];

/** Vendor: cloud providers, external services */
export const SKILL_VENDOR = ["yc-", "cf-", "gh-"];

/** Lifecycle: migration, rollback, deploy, lifecycle management */
export const SKILL_LIFECYCLE = ["migrate-", "rollback-", "deploy-", "lifecycle-"];

/** Domain: security, testing, CI, gates, pipelines */
export const SKILL_DOMAIN = ["sec-", "test-", "ci-", "gate-", "pipeline-"];

/** Tech: databases, MCP, n8n, Docker */
export const SKILL_TECH = ["db-", "mcp-", "n8n-", "docker-"];

/** Doc: runbooks, plans */
export const SKILL_DOC = ["runbook-", "plan-"];

/** Legacy (supported during migration from arch-/process-) */
export const SKILL_LEGACY = ["arch-", "process-"];

/** All allowed prefixes for is/skills/ (gate validates against this) */
export const SKILL_ALLOWED = [
    ...SKILL_PRIMARY,
    ...SKILL_CONCEPT,
    ...SKILL_VENDOR,
    ...SKILL_LIFECYCLE,
    ...SKILL_DOMAIN,
    ...SKILL_TECH,
    ...SKILL_DOC,
    ...SKILL_LEGACY,
];

/** Semantic mapping (for AI agents and docs). Terms align with docs/glossary.md */
export const SKILL_SEMANTICS = {
    "a-": "architecture (Layer topology, Boundary decisions)",
    "ai-": "artificial intelligence, agent behavior (Bridge to AI)",
    "ais-": "architecture & infrastructure specification",
    "is-": "infrastructure (Infrastructure Layer)",
    "ssot-": "single source of truth, canonical Contract",
    "protocol-": "protocol, handshake, interaction Contract",
    "contract-": "Contract, Schema, invariant",
    "yc-": "Yandex Cloud (Provider / Adapter)",
    "cf-": "Cloudflare (Provider / Adapter)",
    "gh-": "GitHub (Provider / Adapter)",
    "migrate-": "migration (Lifecycle transition)",
    "rollback-": "rollback, recovery (Lifecycle transition)",
    "deploy-": "deployment (Lifecycle transition)",
    "sec-": "security (Policy, Gate)",
    "test-": "testing (Gate, validation)",
    "ci-": "CI/CD (Pipeline, Gate)",
    "db-": "databases — SQLite, PostgreSQL (Persistence Layer)",
    "mcp-": "MCP servers, tools (Bridge)",
    "n8n-": "n8n workflows (Pipeline, Orchestrator)",
    "docker-": "Docker (Infrastructure Layer)",
    "runbook-": "runbooks (operational procedure)",
    "plan-": "plans (Lifecycle roadmap)",
    "vue-": "Vue.js (Presentation Layer, app/skills)",
    "lifecycle-": "Lifecycle management, state transitions",
    "gate-": "Gate definition and enforcement rules",
    "pipeline-": "Pipeline / data flow patterns",
};

/** Map create-skill type to prefix */
export const SKILL_TYPE_TO_PREFIX = {
    a: "a-",
    ai: "ai-",
    ais: "ais-",
    is: "is-",
    ssot: "ssot-",
    protocol: "protocol-",
    contract: "contract-",
    yc: "yc-",
    cf: "cf-",
    gh: "gh-",
    migrate: "migrate-",
    rollback: "rollback-",
    deploy: "deploy-",
    sec: "sec-",
    test: "test-",
    ci: "ci-",
    db: "db-",
    mcp: "mcp-",
    n8n: "n8n-",
    docker: "docker-",
    runbook: "runbook-",
    plan: "plan-",
    lifecycle: "lifecycle-",
    gate: "gate-",
    pipeline: "pipeline-",
    arch: "arch-",
    process: "process-",
};

/** Files in is/skills/ exempt from prefix validation */
export const SKILL_EXEMPT_FILES = ["README.md", "causality-registry.md"];

/** Subfolder exempt from prefix validation */
export const SKILL_EXEMPT_SUBFOLDER = "references";

// === MODULE PREFIXES (code files) ===

/** Allowed prefixes for module names (naming-rules.js) */
export const MODULE_PREFIXES = ["app-", "sys-", "is-", "core-", "cmp-", "index-"];

// === RECOMMENDED (core/skills, app/skills — no mandatory) ===

export const CORE_RECOMMENDED = [
    "api-", "cache-", "config-", "domain-", "state-", "async-", "messages-", "metrics-",
    "provider-", "service-", "pipeline-",
];
export const APP_RECOMMENDED = ["component-", "guard-", "ui-", "ux-", "vue-", "facade-", "lifecycle-"];

// === HELPERS ===

/**
 * @param {string} baseName - Filename (e.g. "arch-foundation.md")
 * @returns {boolean}
 */
export function isValidSkillPrefix(baseName) {
    const name = baseName.replace(/\.md$/, "");
    return SKILL_ALLOWED.some((p) => name.startsWith(p));
}

/**
 * @param {string} relPath - Relative path (e.g. "is/skills/arch-foundation.md")
 * @returns {boolean}
 */
export function shouldValidateSkillPrefix(relPath) {
    const normalized = relPath.replace(/\\/g, "/");
    if (!normalized.startsWith("is/skills/")) return false;
    const base = relPath.split(/[/\\]/).pop();
    if (SKILL_EXEMPT_FILES.includes(base)) return false;
    if (normalized.includes(`/${SKILL_EXEMPT_SUBFOLDER}/`)) return false;
    return true;
}
