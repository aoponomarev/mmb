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

/** Lifecycle: migration, rollback, deploy */
export const SKILL_LIFECYCLE = ["migrate-", "rollback-", "deploy-"];

/** Domain: security, testing, CI */
export const SKILL_DOMAIN = ["sec-", "test-", "ci-"];

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

/** Semantic mapping (for AI agents and docs) */
export const SKILL_SEMANTICS = {
    "a-": "architecture",
    "ai-": "artificial intelligence, agent behavior",
    "ais-": "architecture & infrastructure",
    "is-": "infrastructure",
    "ssot-": "single source of truth, canonical contract",
    "protocol-": "protocol, handshake, interaction contract",
    "contract-": "contract, schema, invariant",
    "yc-": "Yandex Cloud",
    "cf-": "Cloudflare",
    "gh-": "GitHub",
    "migrate-": "migration",
    "rollback-": "rollback, recovery",
    "deploy-": "deployment",
    "sec-": "security",
    "test-": "testing",
    "ci-": "CI/CD",
    "db-": "databases (SQLite, PostgreSQL)",
    "mcp-": "MCP servers, tools",
    "n8n-": "n8n workflows",
    "docker-": "Docker",
    "runbook-": "runbooks",
    "plan-": "plans",
    "vue-": "Vue.js (app/skills)",
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
];
export const APP_RECOMMENDED = ["component-", "guard-", "ui-", "ux-", "vue-"];

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
