/**
 * @description Deploys coins-db-gateway with live env readback and mandatory post-deploy snapshot archiving.
 */
"use strict";

const { spawnSync } = require("child_process");
const path = require("path");

const FUNCTION_NAME = "coins-db-gateway";
const API_GATEWAY_NAME = "mbb-api-gw";
const DOWNSTREAM_FUNCTION_NAME = "coingecko-fetcher";
const FUNCTION_DIR = __dirname;
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..", "..");

function fail(message) {
  console.error(`[deploy:api-gateway] FAILED: ${message}`);
  process.exit(1);
}

function run(args, options = {}) {
  const cwd = options.cwd || REPO_ROOT;
  if (options.runAsNode) {
    const nodeResult = spawnSync("node", args, {
      cwd,
      encoding: "utf8",
      stdio: "inherit",
    });
    if (nodeResult.status !== 0) {
      fail(`node ${args.join(" ")} failed`);
    }
    return nodeResult;
  }

  const result = spawnSync("yc", args, {
    cwd,
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });

  if (result.status !== 0) {
    const stderr = (result.stderr || "").trim();
    fail(`yc ${args.join(" ")}\n${stderr}`);
  }
  return result;
}

function runJson(args, cwd = REPO_ROOT) {
  const result = run([...args, "--format", "json"], { cwd, capture: true });
  try {
    return JSON.parse(result.stdout || "{}");
  } catch (error) {
    fail(`Cannot parse JSON from yc ${args.join(" ")}: ${error.message}`);
  }
}

function bytesToMiB(memoryBytes) {
  const asNumber = Number.parseInt(memoryBytes || "268435456", 10);
  if (!Number.isFinite(asNumber) || asNumber <= 0) return "256m";
  const mib = Math.max(1, Math.round(asNumber / (1024 * 1024)));
  return `${mib}m`;
}

function buildEnvironmentArg(envObject) {
  const entries = Object.entries(envObject || {}).filter(([, value]) => value !== undefined && value !== null && String(value) !== "");
  if (entries.length === 0) fail("Live environment is empty; deployment would break runtime contract.");
  return entries.map(([k, v]) => `${k}=${String(v)}`).join(",");
}

function main() {
  console.log("[deploy:api-gateway] Reading live function settings...");
  const latestVersions = runJson([
    "serverless",
    "function",
    "version",
    "list",
    "--function-name",
    FUNCTION_NAME,
    "--limit",
    "1",
  ]);

  if (!Array.isArray(latestVersions) || latestVersions.length === 0) {
    fail(`No versions found for ${FUNCTION_NAME}`);
  }

  const latestVersion = runJson([
    "serverless",
    "function",
    "version",
    "get",
    latestVersions[0].id,
  ]);

  const downstreamFunction = runJson([
    "serverless",
    "function",
    "get",
    DOWNSTREAM_FUNCTION_NAME,
  ]);

  const environment = { ...(latestVersion.environment || {}) };
  if (!environment.COINGECKO_FETCHER_URL) {
    environment.COINGECKO_FETCHER_URL = downstreamFunction.http_invoke_url;
  }

  const runtime = latestVersion.runtime || "nodejs18";
  const entrypoint = latestVersion.entrypoint || "index.handler";
  const memory = bytesToMiB(latestVersion?.resources?.memory);
  const timeout = latestVersion.execution_timeout || "30s";
  const envArg = buildEnvironmentArg(environment);

  console.log("[deploy:api-gateway] Publishing new coins-db-gateway version...");
  run(
    [
      "serverless",
      "function",
      "version",
      "create",
      "--function-name",
      FUNCTION_NAME,
      "--runtime",
      runtime,
      "--entrypoint",
      entrypoint,
      "--memory",
      memory,
      "--execution-timeout",
      timeout,
      "--source-path",
      ".",
      "--environment",
      envArg,
    ],
    { cwd: FUNCTION_DIR },
  );

  console.log("[deploy:api-gateway] Updating API Gateway spec...");
  run(
    [
      "serverless",
      "api-gateway",
      "update",
      "--name",
      API_GATEWAY_NAME,
      "--spec",
      "spec.yaml",
    ],
    { cwd: FUNCTION_DIR },
  );

  console.log("[deploy:api-gateway] Creating mandatory deployment snapshot...");
  // @causality #for-ais-rollout-gap-marking
  // Transitional deviation from AIS target lifecycle: this wrapper still archives
  // immediately after deploy. The target state is verify-before-archive once the
  // health/smoke gate is wired into all deploy wrappers.
  run(["is/scripts/infrastructure/archive-deployment-snapshot.js", "--target", "yandex-api-gateway"], {
    cwd: REPO_ROOT,
    capture: false,
    // Reuse node runtime for deterministic script execution.
    runAsNode: true,
  });

  console.log("[deploy:api-gateway] DONE");
}

main();
