/**
 * @skill core/skills/api-layer
 * @description Native file cache for backend data flow.
 * - TTL-based freshness
 * - no secret storage
 * - deterministic key hashing
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getAbsolutePath } from "../../is/contracts/paths/paths.js";
import { BACKEND_ERROR_CODES, BackendCoreError } from "../api/providers/errors.js";

const CACHE_ROOT = getAbsolutePath("data/cache");

function normalizePayload(payload) {
  if (payload === null || typeof payload !== "object") return JSON.stringify(payload);
  if (Array.isArray(payload)) return `[${payload.map((v) => normalizePayload(v)).join(",")}]`;
  const keys = Object.keys(payload).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${normalizePayload(payload[k])}`).join(",")}}`;
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function safeReadJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export class DataCacheManager {
  constructor(params = {}) {
    this.namespace = params.namespace || "market-data";
    this.defaultTtlMs = Number.isFinite(params.defaultTtlMs) ? Math.max(1, Math.floor(params.defaultTtlMs)) : 60 * 60 * 1000;
    this.cacheDir = path.join(CACHE_ROOT, this.namespace);
    ensureDir(this.cacheDir);
  }

  createKey(resource, params = {}) {
    const hash = crypto.createHash("sha256").update(`${resource}:${normalizePayload(params)}`).digest("hex");
    return hash;
  }

  getFilePath(resource, params = {}) {
    return path.join(this.cacheDir, `${this.createKey(resource, params)}.json`);
  }

  get(resource, params = {}, ttlMs = this.defaultTtlMs) {
    const filePath = this.getFilePath(resource, params);
    const payload = safeReadJson(filePath);
    if (!payload) return { hit: false, stale: false, value: null };

    const createdAt = Number(payload.createdAt || 0);
    const ageMs = Date.now() - createdAt;
    const stale = !Number.isFinite(createdAt) || ageMs > ttlMs;
    if (stale) return { hit: false, stale: true, value: null };
    return { hit: true, stale: false, value: payload.value };
  }

  set(resource, params = {}, value) {
    if (value === undefined) {
      throw new BackendCoreError(BACKEND_ERROR_CODES.InvalidInput, "CACHE_SET_UNDEFINED_VALUE", { resource });
    }
    const filePath = this.getFilePath(resource, params);
    ensureDir(path.dirname(filePath));
    const payload = {
      createdAt: Date.now(),
      resource,
      params,
      value,
    };
    fs.writeFileSync(filePath, JSON.stringify(payload), "utf8");
  }

  clearAll() {
    if (!fs.existsSync(this.cacheDir)) return;
    for (const entry of fs.readdirSync(this.cacheDir)) {
      const filePath = path.join(this.cacheDir, entry);
      if (fs.statSync(filePath).isFile()) fs.unlinkSync(filePath);
    }
  }
}

export function createDataCacheManager(params = {}) {
  return new DataCacheManager(params);
}
