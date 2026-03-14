/**
 * @description MCP tools: get_causality_files, get_causality_reverse, resolve_causality_context — structured graph queries.
 * @skill id:sk-8991cd
 */
import { db } from "../db.js";
import { parseCausalityRegistry } from "../../contracts/docs/parse-causality-registry.js";

const DEFAULT_LIMIT = 50;

// ── shared queries ──────────────────────────────────────────────────

export function queryFilesByHash(hash, limit) {
  const stmt = db.prepare(
    "SELECT target_file, anchor_type, line_number FROM dependency_graph WHERE source_hash = ? ORDER BY target_file LIMIT ?",
  );
  return stmt.all(hash, limit ?? DEFAULT_LIMIT);
}

export function queryHashesByFile(filePath, anchorTypes, limit) {
  let sql =
    "SELECT source_hash, anchor_type, line_number FROM dependency_graph WHERE target_file = ?";
  const params = [filePath];
  if (anchorTypes && anchorTypes.length > 0) {
    sql += ` AND anchor_type IN (${anchorTypes.map(() => "?").join(",")})`;
    params.push(...anchorTypes);
  }
  sql += " ORDER BY source_hash LIMIT ?";
  params.push(limit ?? DEFAULT_LIMIT);
  return db.prepare(sql).all(...params);
}

function queryCoOccurring(hash, limit) {
  const stmt = db.prepare(`
    SELECT DISTINCT dg2.source_hash
    FROM dependency_graph dg1
    JOIN dependency_graph dg2 ON dg1.target_file = dg2.target_file
    WHERE dg1.source_hash = ? AND dg2.source_hash != ?
    ORDER BY dg2.source_hash
    LIMIT ?
  `);
  return stmt.all(hash, hash, limit ?? DEFAULT_LIMIT).map((r) => r.source_hash);
}

function anchorCount(hash) {
  const row = db
    .prepare(
      "SELECT COUNT(*) as cnt FROM dependency_graph WHERE source_hash = ?",
    )
    .get(hash);
  return row ? row.cnt : 0;
}

function reverseCount(filePath, anchorTypes) {
  let sql = "SELECT COUNT(DISTINCT source_hash) as cnt FROM dependency_graph WHERE target_file = ?";
  const params = [filePath];
  if (anchorTypes && anchorTypes.length > 0) {
    sql += ` AND anchor_type IN (${anchorTypes.map(() => "?").join(",")})`;
    params.push(...anchorTypes);
  }
  const row = db.prepare(sql).get(...params);
  return row ? row.cnt : 0;
}

// ── tool definitions ────────────────────────────────────────────────

export const getCausalityFilesToolDef = {
  name: "get_causality_files",
  description:
    "Given a causality hash (e.g. #for-fail-fast), return all files anchored to it with anchor_type and line_number. Optionally include registry formulation.",
  inputSchema: {
    type: "object",
    properties: {
      hash: {
        type: "string",
        description: 'Causality hash, e.g. "#for-fail-fast"',
      },
      limit: {
        type: "number",
        description: `Max results (default ${DEFAULT_LIMIT})`,
      },
      include_formulation: {
        type: "boolean",
        description: "Include registry formulation in response (default false)",
      },
    },
    required: ["hash"],
  },
};

export const getCausalityReverseToolDef = {
  name: "get_causality_reverse",
  description:
    "Given a file path, return all causality hashes that reference it, with anchor_type and line_number.",
  inputSchema: {
    type: "object",
    properties: {
      file: {
        type: "string",
        description: "Relative file path, e.g. core/api/exchange-service.js",
      },
      limit: {
        type: "number",
        description: `Max results (default ${DEFAULT_LIMIT})`,
      },
      anchor_types: {
        type: "array",
        items: { type: "string" },
        description:
          'Filter by anchor types, e.g. ["anchor","skill"]. Omit for all.',
      },
    },
    required: ["file"],
  },
};

export const resolveCausalityContextToolDef = {
  name: "resolve_causality_context",
  description:
    "Full context for a hash: files, registry formulation, enforcement level, and co-occurring hashes. Use before modifying or removing a causality anchor.",
  inputSchema: {
    type: "object",
    properties: {
      hash: {
        type: "string",
        description: 'Causality hash, e.g. "#for-fail-fast"',
      },
      include_formulation: {
        type: "boolean",
        description: "Include registry formulation (default true)",
      },
      include_cooccurring: {
        type: "boolean",
        description: "Include co-occurring hashes (default true)",
      },
      limit: {
        type: "number",
        description: `Max files/co-occurring results (default ${DEFAULT_LIMIT})`,
      },
    },
    required: ["hash"],
  },
};

// ── handlers ────────────────────────────────────────────────────────

export async function getCausalityFilesHandler(args) {
  const hash = normalizeHash(args.hash);
  const limit = args.limit ?? DEFAULT_LIMIT;
  const rows = queryFilesByHash(hash, limit);
  const registry = parseCausalityRegistry();
  const entry = registry.get(hash);

  const result = {
    hash,
    files: rows,
    meta: {
      hash_in_registry: registry.has(hash),
      anchor_count: anchorCount(hash),
    },
  };
  if (args.include_formulation && entry) {
    result.formulation = entry.formulation;
    result.enforcement = entry.enforcement;
  }

  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
}

export async function getCausalityReverseHandler(args) {
  const file = args.file.replace(/\\/g, "/");
  const limit = args.limit ?? DEFAULT_LIMIT;
  const rows = queryHashesByFile(file, args.anchor_types, limit);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            file,
            hashes: rows,
            meta: { anchor_count: reverseCount(file, args.anchor_types) },
          },
          null,
          2,
        ),
      },
    ],
  };
}

export async function resolveCausalityContextHandler(args) {
  const hash = normalizeHash(args.hash);
  const limit = args.limit ?? DEFAULT_LIMIT;
  const includeFormulation = args.include_formulation !== false;
  const includeCooccurring = args.include_cooccurring !== false;

  const files = queryFilesByHash(hash, limit);
  const registry = parseCausalityRegistry();
  const entry = registry.get(hash);

  const result = {
    hash,
    files,
    meta: {
      hash_in_registry: registry.has(hash),
      anchor_count: anchorCount(hash),
    },
  };
  if (includeFormulation && entry) {
    result.formulation = entry.formulation;
    result.enforcement = entry.enforcement;
  }
  if (includeCooccurring) {
    result.co_occurring_hashes = queryCoOccurring(hash, limit);
  }

  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
}

function normalizeHash(h) {
  return h.startsWith("#") ? h : `#${h}`;
}
