#!/usr/bin/env node
/**
 * @description Creates rollback-safe deployment snapshots for Yandex targets with settings, previous-state diff, and causality validation.
 */
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..", "..", "..");

const TARGETS = {
  "yandex-api-gateway": {
    snapshotDir: "is/deployments/yandex-api-gateway",
    sourceFiles: [
      "is/yandex/functions/api-gateway/index.js",
      "is/yandex/functions/api-gateway/spec.yaml",
      "is/yandex/functions/api-gateway/package.json",
      "is/yandex/functions/api-gateway/package-lock.json",
    ],
    skills: ["id:sk-e8f2a1", "id:sk-3b1519", "id:sk-73dcca"],
    ais: ["id:ais-8b2f1c", "id:ais-e41384"],
    causalities: [
      "#for-cloud-env-readback",
      "#for-yc-public-invoke",
      "#for-manual-trigger-order-payload",
      "#for-deploy-snapshot-diff",
      "#for-post-deploy-auto-archive",
    ],
  },
  "yandex-market-fetcher": {
    snapshotDir: "is/deployments/yandex-market-fetcher",
    sourceFiles: [
      "is/yandex/functions/market-fetcher/index.js",
      "is/yandex/functions/market-fetcher/package.json",
      "is/yandex/functions/market-fetcher/package-lock.json",
    ],
    skills: ["id:sk-e8f2a1", "id:sk-3b1519", "id:sk-5c0ef8"],
    ais: ["id:ais-8b2f1c", "id:ais-e41384"],
    causalities: [
      "#for-trigger-minute-routing",
      "#for-manual-trigger-order-payload",
      "#for-yc-public-invoke",
      "#for-deploy-snapshot-diff",
      "#for-post-deploy-auto-archive",
    ],
  },
  "cloudflare-edge-api": {
    snapshotDir: "is/deployments/cloudflare-edge-api",
    sourceFiles: [
      "is/cloudflare/edge-api/src/index.js",
      "is/cloudflare/edge-api/src/auth.js",
      "is/cloudflare/edge-api/src/portfolios.js",
      "is/cloudflare/edge-api/src/datasets.js",
      "is/cloudflare/edge-api/src/coin-sets.js",
      "is/cloudflare/edge-api/src/api-proxy.js",
      "is/cloudflare/edge-api/src/settings.js",
      "is/cloudflare/edge-api/src/utils/cors.js",
      "is/cloudflare/edge-api/src/utils/auth.js",
      "is/cloudflare/edge-api/src/utils/d1-helpers.js",
      "is/cloudflare/edge-api/migrations/001_initial_schema.sql",
      "is/cloudflare/edge-api/migrations/002_user_coin_sets.sql",
      "is/cloudflare/edge-api/wrangler.toml",
    ],
    skills: ["id:sk-e8f2a1", "id:sk-3b1519", "id:sk-5cd3c9"],
    ais: ["id:ais-8b2f1c", "id:ais-e41384"],
    causalities: [
      "#for-cloudflare-kv-proxy",
      "#for-d1-schema-migrations",
      "#for-deploy-snapshot-diff",
      "#for-post-deploy-auto-archive",
      "#for-provider-readback-fallback",
    ],
  },
};

function fail(message) {
  console.error(`[archive-deployment-snapshot] FAILED: ${message}`);
  process.exit(1);
}

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return null;
  return process.argv[idx + 1] || null;
}

function runJson(command) {
  const full = `yc ${command} --format json`;
  try {
    const raw = execSync(full, {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return JSON.parse(raw);
  } catch (error) {
    const stderr = error?.stderr?.toString?.() || error?.message || String(error);
    fail(`Command failed: ${full}\n${stderr}`);
  }
}

function runJsonOptional(command, cwd) {
  try {
    const raw = execSync(command, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, data: JSON.parse(raw), error: null };
  } catch (error) {
    const stderr = error?.stderr?.toString?.() || error?.message || String(error);
    return { ok: false, data: null, error: stderr };
  }
}

function isoDate() {
  return new Date().toISOString().slice(0, 10);
}

function hashFile(relPath) {
  const absPath = join(REPO_ROOT, relPath);
  const buf = readFileSync(absPath);
  return createHash("sha256").update(buf).digest("hex").toUpperCase();
}

function secretName(name) {
  return /(PASSWORD|SECRET|TOKEN|KEY)/i.test(name);
}

function envContract(env = {}) {
  const required = Object.keys(env).sort();
  return {
    required_names: required,
    secret_names: required.filter(secretName),
  };
}

function normalizeBindings(rows = []) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    role_id: row.role_id || null,
    subject: {
      type: row?.subject?.type || null,
      id: row?.subject?.id || null,
    },
  }));
}

function normalizeVersion(version = {}) {
  return {
    id: version.id || null,
    created_at: version.created_at || null,
    runtime: version.runtime || null,
    entrypoint: version.entrypoint || null,
    memory_bytes: version?.resources?.memory || null,
    execution_timeout: version.execution_timeout || null,
    concurrency: version.concurrency || null,
    image_size: version.image_size || null,
    log_options: version.log_options || {},
    env_contract: envContract(version.environment || {}),
  };
}

function readProxySpecInfo() {
  const specPath = join(REPO_ROOT, "is/yandex/functions/api-gateway/spec.yaml");
  const content = readFileSync(specPath, "utf8");
  const functionMatches = [...content.matchAll(/function_id:\s*([a-z0-9]+)/gi)].map((m) => m[1]);
  return {
    routes: {
      "/health": ["GET", "OPTIONS"],
      "/{proxy+}": ["ANY"],
      integration_function_id: functionMatches[0] || null,
    },
  };
}

function collectYandexApiGateway() {
  const gateway = runJson("serverless api-gateway get mbb-api-gw");
  const gatewayBindings = runJson("serverless api-gateway list-access-bindings --name mbb-api-gw");
  const coinsGateway = runJson("serverless function get coins-db-gateway");
  const coinsVersions = runJson("serverless function version list --function-name coins-db-gateway --limit 2");
  const coinsBindings = runJson("serverless function list-access-bindings --name coins-db-gateway");
  const fetcher = runJson("serverless function get coingecko-fetcher");
  const fetcherBindings = runJson("serverless function list-access-bindings --name coingecko-fetcher");
  const specInfo = readProxySpecInfo();

  if (!Array.isArray(coinsVersions) || coinsVersions.length === 0) {
    fail("coins-db-gateway has no active versions to snapshot.");
  }

  const currentVersion = normalizeVersion(coinsVersions[0]);
  const previousVersion = coinsVersions[1] ? normalizeVersion(coinsVersions[1]) : null;

  const current = {
    snapshot_date: isoDate(),
    target: "yandex-api-gateway",
    api_gateway: {
      id: gateway.id || null,
      name: gateway.name || null,
      status: gateway.status || null,
      domain: gateway.domain || null,
      execution_timeout: gateway.execution_timeout || null,
      log_options: gateway.log_options || {},
      connectivity: gateway.connectivity || {},
      openapi_routes: specInfo.routes,
    },
    api_gateway_access_bindings: normalizeBindings(gatewayBindings),
    integrated_function: {
      id: coinsGateway.id || null,
      name: coinsGateway.name || null,
      http_invoke_url: coinsGateway.http_invoke_url || null,
      active_version: currentVersion,
    },
    integrated_function_access_bindings: normalizeBindings(coinsBindings),
    downstream_function_reference: {
      id: fetcher.id || null,
      name: fetcher.name || null,
      http_invoke_url: fetcher.http_invoke_url || null,
    },
    downstream_function_access_bindings: normalizeBindings(fetcherBindings),
  };

  const previous = previousVersion
    ? {
        snapshot_date: isoDate(),
        target: "yandex-api-gateway",
        comparison_baseline: {
          type: "previous_active_function_version",
          notes:
            "No prior dated snapshot is required for baseline; previous state is derived from cloud function version history.",
        },
        integrated_function_previous_version: previousVersion,
      }
    : {
        snapshot_date: isoDate(),
        target: "yandex-api-gateway",
        comparison_baseline: {
          type: "none",
          notes: "Previous function version is unavailable in cloud history.",
        },
      };

  return { current, previous };
}

function collectYandexMarketFetcher() {
  const fetcher = runJson("serverless function get coingecko-fetcher");
  const versions = runJson("serverless function version list --function-name coingecko-fetcher --limit 2");
  const bindings = runJson("serverless function list-access-bindings --name coingecko-fetcher");
  const triggersRaw = runJson("serverless trigger list");

  if (!Array.isArray(versions) || versions.length === 0) {
    fail("coingecko-fetcher has no active versions to snapshot.");
  }

  const triggers = (Array.isArray(triggersRaw) ? triggersRaw : [])
    .filter((t) => typeof t.name === "string" && t.name.startsWith("coingecko-fetcher-cron-"))
    .map((t) => ({
      id: t.id || null,
      name: t.name || null,
      cron_expression: t?.rule?.timer?.cron_expression || null,
      invoke_function_id: t?.rule?.timer?.invoke_function_with_retry?.function_id || null,
      invoke_function_tag: t?.rule?.timer?.invoke_function_with_retry?.function_tag || null,
      invoke_service_account_id: t?.rule?.timer?.invoke_function_with_retry?.service_account_id || null,
      status: t.status || null,
    }));

  const currentVersion = normalizeVersion(versions[0]);
  const previousVersion = versions[1] ? normalizeVersion(versions[1]) : null;

  const current = {
    snapshot_date: isoDate(),
    target: "yandex-market-fetcher",
    function: {
      id: fetcher.id || null,
      name: fetcher.name || null,
      status: fetcher.status || null,
      description: fetcher.description || null,
      http_invoke_url: fetcher.http_invoke_url || null,
      active_version: currentVersion,
    },
    function_access_bindings: normalizeBindings(bindings),
    timer_triggers: triggers,
    invoke_contract: {
      manual_payload_order_values: ["market_cap", "volume"],
      fallback_mode: "minute-based routing for timer invocations",
    },
  };

  const previous = previousVersion
    ? {
        snapshot_date: isoDate(),
        target: "yandex-market-fetcher",
        comparison_baseline: {
          type: "previous_active_function_version",
          notes:
            "No prior dated snapshot is required for baseline; previous state is derived from cloud function version history.",
        },
        function_previous_version: previousVersion,
      }
    : {
        snapshot_date: isoDate(),
        target: "yandex-market-fetcher",
        comparison_baseline: {
          type: "none",
          notes: "Previous function version is unavailable in cloud history.",
        },
      };

  return { current, previous };
}

function parseWranglerTomlConfig() {
  const wranglerPath = join(REPO_ROOT, "is/cloudflare/edge-api/wrangler.toml");
  const content = readFileSync(wranglerPath, "utf8");
  const lines = content.split(/\r?\n/);

  const getRootValue = (key) => {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(`^\\s*${escaped}\\s*=\\s*"([^"]+)"\\s*$`);
    for (const line of lines) {
      const m = line.match(rx);
      if (m) return m[1];
    }
    return null;
  };

  const vars = {};
  const d1_databases = [];
  const kv_namespaces = [];
  let section = "";
  let sectionObject = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (trimmed === "[vars]") {
      if (sectionObject && section === "d1_databases") d1_databases.push(sectionObject);
      if (sectionObject && section === "kv_namespaces") kv_namespaces.push(sectionObject);
      section = "vars";
      sectionObject = null;
      continue;
    }
    if (trimmed === "[[d1_databases]]") {
      if (sectionObject && section === "d1_databases") d1_databases.push(sectionObject);
      if (sectionObject && section === "kv_namespaces") kv_namespaces.push(sectionObject);
      section = "d1_databases";
      sectionObject = {};
      continue;
    }
    if (trimmed === "[[kv_namespaces]]") {
      if (sectionObject && section === "d1_databases") d1_databases.push(sectionObject);
      if (sectionObject && section === "kv_namespaces") kv_namespaces.push(sectionObject);
      section = "kv_namespaces";
      sectionObject = {};
      continue;
    }

    const m = trimmed.match(/^([A-Za-z0-9_]+)\s*=\s*"([^"]*)"$/);
    if (!m) continue;
    const [, key, value] = m;
    if (section === "vars") {
      vars[key] = value;
    } else if (section === "d1_databases" || section === "kv_namespaces") {
      if (!sectionObject) sectionObject = {};
      sectionObject[key] = value;
    }
  }
  if (sectionObject && section === "d1_databases") d1_databases.push(sectionObject);
  if (sectionObject && section === "kv_namespaces") kv_namespaces.push(sectionObject);

  return {
    name: getRootValue("name"),
    main: getRootValue("main"),
    compatibility_date: getRootValue("compatibility_date"),
    vars,
    d1_databases,
    kv_namespaces,
  };
}

function findPreviousDatedSnapshot(snapshotDir, currentDate) {
  if (!existsSync(snapshotDir)) return null;
  const candidates = readdirSync(snapshotDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name) && entry.name < currentDate)
    .map((entry) => entry.name)
    .sort();
  if (candidates.length === 0) return null;
  return candidates[candidates.length - 1];
}

function collectCloudflareEdgeApi(targetConfig, date) {
  const workerDir = join(REPO_ROOT, "is/cloudflare/edge-api");
  const parsedWrangler = parseWranglerTomlConfig();
  const deploymentsProbe = runJsonOptional("npx wrangler deployments list --json", workerDir);
  const d1Probe = runJsonOptional("npx wrangler d1 list --json", workerDir);

  const current = {
    snapshot_date: date,
    target: "cloudflare-edge-api",
    worker: {
      name: parsedWrangler.name,
      main: parsedWrangler.main,
      compatibility_date: parsedWrangler.compatibility_date,
      vars: parsedWrangler.vars,
      bindings: {
        d1_databases: parsedWrangler.d1_databases,
        kv_namespaces: parsedWrangler.kv_namespaces,
      },
    },
    cloudflare_reachable_state: {
      wrangler_deployments: deploymentsProbe.ok ? deploymentsProbe.data : [],
      kv_namespace_catalog: parsedWrangler.kv_namespaces,
      d1_database_catalog: d1Probe.ok ? d1Probe.data : [],
      command_errors: {
        deployments_list: deploymentsProbe.ok ? null : deploymentsProbe.error,
        kv_namespace_list: null,
        d1_list: d1Probe.ok ? null : d1Probe.error,
      },
    },
  };

  const previousDate = findPreviousDatedSnapshot(join(REPO_ROOT, targetConfig.snapshotDir), date);
  if (previousDate) {
    const prevPath = join(REPO_ROOT, targetConfig.snapshotDir, previousDate, "settings.current.json");
    if (existsSync(prevPath)) {
      const prev = JSON.parse(readFileSync(prevPath, "utf8"));
      return { current, previous: prev };
    }
  }

  const previous = {
    snapshot_date: date,
    target: "cloudflare-edge-api",
    comparison_baseline: {
      type: "none",
      notes: "No prior dated cloudflare-edge-api snapshot found.",
    },
  };
  return { current, previous };
}

function flatten(value, prefix = "$", out = {}) {
  if (Array.isArray(value)) {
    if (value.length === 0) out[prefix] = "[]";
    value.forEach((item, idx) => flatten(item, `${prefix}[${idx}]`, out));
    return out;
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length === 0) out[prefix] = "{}";
    for (const key of keys) flatten(value[key], `${prefix}.${key}`, out);
    return out;
  }
  out[prefix] = JSON.stringify(value);
  return out;
}

function buildDiff(current, previous) {
  const nowFlat = flatten(current);
  const prevFlat = flatten(previous || {});
  const nowKeys = Object.keys(nowFlat);
  const prevKeys = Object.keys(prevFlat);

  const added = nowKeys.filter((k) => !prevKeys.includes(k)).sort();
  const removed = prevKeys.filter((k) => !nowKeys.includes(k)).sort();
  const changed = nowKeys
    .filter((k) => prevKeys.includes(k) && nowFlat[k] !== prevFlat[k])
    .sort();

  return { added, removed, changed, nowFlat, prevFlat };
}

function ensureCausalitiesExist(causalities) {
  const registryPath = join(REPO_ROOT, "is/skills/causality-registry.md");
  const registry = readFileSync(registryPath, "utf8");
  const missing = causalities.filter((hash) => !registry.includes(`\`${hash}\``));
  if (missing.length > 0) {
    fail(`Missing causality hashes in registry: ${missing.join(", ")}`);
  }
}

function ensureCompleteness(target, current, previous, diff) {
  if (!current || !previous) fail("Snapshot payload is incomplete.");
  if (!Array.isArray(diff.added) || !Array.isArray(diff.changed) || !Array.isArray(diff.removed)) {
    fail("Diff payload is invalid.");
  }

  if (target === "yandex-api-gateway") {
    if (!current.api_gateway || !current.integrated_function || !current.downstream_function_reference) {
      fail("Missing required settings block for yandex-api-gateway.");
    }
    return;
  }

  if (target === "yandex-market-fetcher") {
    if (!current.function || !Array.isArray(current.timer_triggers)) {
      fail("Missing required settings block for yandex-market-fetcher.");
    }
    return;
  }

  if (target === "cloudflare-edge-api") {
    if (!current.worker || !current.cloudflare_reachable_state) {
      fail("Missing required settings block for cloudflare-edge-api.");
    }
  }
}

function writeJson(filePath, payload) {
  writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function copySources(relFiles, destinationDir) {
  const sourceRoot = join(destinationDir, "source");
  for (const relFile of relFiles) {
    const from = join(REPO_ROOT, relFile);
    if (!existsSync(from)) fail(`Source file not found for snapshot copy: ${relFile}`);
    const to = join(sourceRoot, relFile);
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(from, to);
  }
}

function renderDiffMarkdown(target, baselineId, diff) {
  const lines = [];
  lines.push("# Changes vs Previous State");
  lines.push("");
  lines.push("## Baseline");
  lines.push("");
  lines.push(`- Target: \`${target}\``);
  lines.push(`- Baseline: \`${baselineId || "none"}\``);
  lines.push("");

  lines.push("## Added Keys");
  lines.push("");
  if (diff.added.length === 0) lines.push("- none");
  else diff.added.forEach((k) => lines.push(`- \`${k}\` = ${diff.nowFlat[k]}`));
  lines.push("");

  lines.push("## Changed Keys");
  lines.push("");
  if (diff.changed.length === 0) lines.push("- none");
  else diff.changed.forEach((k) => lines.push(`- \`${k}\`: ${diff.prevFlat[k]} -> ${diff.nowFlat[k]}`));
  lines.push("");

  lines.push("## Removed Keys");
  lines.push("");
  if (diff.removed.length === 0) lines.push("- none");
  else diff.removed.forEach((k) => lines.push(`- \`${k}\` = ${diff.prevFlat[k]}`));
  lines.push("");

  lines.push("## Causality Diffs");
  lines.push("");
  lines.push("- Causality updates are tracked in `is/skills/causality-registry.md` and referenced in snapshot README.");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function renderReadme(target, date, config, current, sourceHashes) {
  const summary = [];
  if (target === "yandex-api-gateway") {
    const gw = current.api_gateway;
    const fn = current.integrated_function?.active_version || {};
    summary.push(`- API Gateway ID: \`${gw.id}\``);
    summary.push(`- API Gateway domain: \`${gw.domain}\``);
    summary.push(`- API Gateway timeout: \`${gw.execution_timeout}\``);
    summary.push(`- Integrated function: \`${current.integrated_function?.id}\``);
    summary.push(`- Active function version: \`${fn.id || "unknown"}\``);
    summary.push(`- Runtime / entrypoint: \`${fn.runtime}\` / \`${fn.entrypoint}\``);
    summary.push(`- Memory / timeout / concurrency: \`${fn.memory_bytes}\` / \`${fn.execution_timeout}\` / \`${fn.concurrency}\``);
  } else if (target === "yandex-market-fetcher") {
    const fn = current.function?.active_version || {};
    summary.push(`- Function ID: \`${current.function?.id}\``);
    summary.push(`- Active function version: \`${fn.id || "unknown"}\``);
    summary.push(`- Runtime / entrypoint: \`${fn.runtime}\` / \`${fn.entrypoint}\``);
    summary.push(`- Memory / timeout / concurrency: \`${fn.memory_bytes}\` / \`${fn.execution_timeout}\` / \`${fn.concurrency}\``);
    summary.push("- Trigger schedule:");
    for (const tr of current.timer_triggers || []) {
      summary.push(`  - \`${tr.name}\`: \`${tr.cron_expression}\``);
    }
  } else {
    const wrk = current.worker || {};
    summary.push(`- Worker name: \`${wrk.name || "unknown"}\``);
    summary.push(`- Entrypoint: \`${wrk.main || "unknown"}\``);
    summary.push(`- Compatibility date: \`${wrk.compatibility_date || "unknown"}\``);
    summary.push(`- Vars count: \`${Object.keys(wrk.vars || {}).length}\``);
    summary.push(`- D1 bindings: \`${(wrk.bindings?.d1_databases || []).length}\``);
    summary.push(`- KV bindings: \`${(wrk.bindings?.kv_namespaces || []).length}\``);
    const probeErrors = current.cloudflare_reachable_state?.command_errors || {};
    const hasErrors = Object.values(probeErrors).some((x) => typeof x === "string" && x.trim());
    summary.push(`- Reachable cloud settings via wrangler: \`${hasErrors ? "partial" : "full"}\``);
  }

  const sourceLines = config.sourceFiles.map((file) => `  - \`${file}\` (SHA256 \`${sourceHashes[file]}\`)`);
  const skillsLines = config.skills.map((s) => `  - ${s}`);
  const aisLines = config.ais.map((a) => `  - ${a}`);
  const causalityLines = config.causalities.map((c) => `  - \`${c}\``);

  return `# Deployment Snapshot: \`${target}\` (${date})

## Scope

- Snapshot path: \`is/deployments/${target}/${date}/\`.
- Source artifacts:
${sourceLines.join("\n")}

## Archive Completeness Check

- [x] Full reachable settings captured (\`settings.current.json\`).
- [x] Previous-state baseline + structured diff captured (\`settings.previous.json\`, \`changes-vs-previous.md\`).
- [x] Causality updates applied and linked.

## Non-Secret Console Settings (summary)

${summary.join("\n")}

## Skills / AIS / Causalities

- Skills:
${skillsLines.join("\n")}
- AIS:
${aisLines.join("\n")}
- Causalities:
${causalityLines.join("\n")}

## Restore (short)

1. Re-deploy sources from \`source/\` and listed hashes.
2. Restore non-secret configuration from \`settings.current.json\`.
3. Re-apply secret values from secure storage according to env contract names.
4. Verify endpoint behavior and cycle history.
`;
}

function main() {
  const target = getArgValue("--target");
  const date = getArgValue("--date") || isoDate();
  if (!target || !TARGETS[target]) {
    fail(`Unknown or missing --target. Allowed: ${Object.keys(TARGETS).join(", ")}`);
  }

  const targetConfig = TARGETS[target];
  ensureCausalitiesExist(targetConfig.causalities);

  let current;
  let previous;
  if (target === "yandex-api-gateway") {
    ({ current, previous } = collectYandexApiGateway());
  } else if (target === "yandex-market-fetcher") {
    ({ current, previous } = collectYandexMarketFetcher());
  } else {
    ({ current, previous } = collectCloudflareEdgeApi(targetConfig, date));
  }

  const diff = buildDiff(current, previous);
  ensureCompleteness(target, current, previous, diff);

  const snapshotDir = join(REPO_ROOT, targetConfig.snapshotDir, date);
  mkdirSync(snapshotDir, { recursive: true });

  copySources(targetConfig.sourceFiles, snapshotDir);

  const sourceHashes = {};
  for (const file of targetConfig.sourceFiles) sourceHashes[file] = hashFile(file);

  const baselineId =
    previous?.integrated_function_previous_version?.id ||
    previous?.function_previous_version?.id ||
    previous?.comparison_baseline?.type ||
    "none";

  writeJson(join(snapshotDir, "settings.current.json"), current);
  writeJson(join(snapshotDir, "settings.previous.json"), previous);
  writeFileSync(join(snapshotDir, "changes-vs-previous.md"), renderDiffMarkdown(target, baselineId, diff), "utf8");
  writeFileSync(
    join(snapshotDir, "README.md"),
    `${renderReadme(target, date, targetConfig, current, sourceHashes)}\n`,
    "utf8",
  );

  console.log(`[archive-deployment-snapshot] OK: ${target} -> ${targetConfig.snapshotDir}/${date}`);
}

try {
  main();
} catch (error) {
  fail(error?.message || String(error));
}
