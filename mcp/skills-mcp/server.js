/**
 * Skill: architecture/architecture-ssot
 * Skill: integrations/integrations-continue-mcp-setup
 *
 * MMB Skills MCP Server v0.1.0
 * Адаптирован из MBB mcp/skills-mcp/server.js v0.2.0
 *
 * Отличия от MBB:
 * - Один репозиторий скилов вместо двух (skills + skills-mbb)
 * - Все пути импортируются из paths.js — ноль хардкода
 * - Поддержка MBB legacy путей для чтения скилов MBB во время миграции
 */

import fs from "fs/promises";
import * as fsSync from "fs";
import path from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { paths } from "../../paths.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const skillsRoot   = paths.skills;
const draftsRoot   = paths.drafts;
const mmbRoot      = paths.mmb;
const logsDir      = paths.logs;

// MBB legacy пути (null если не заданы в .env — миграция не активна)
const mbbSkillsAll = paths.mbbSkillsAll;
const mbbSkillsMbb = paths.mbbSkillsMbb;

const SKIP_DIRS = new Set(["drafts", "archive"]);

// Директории кода для audit_skill_coverage (появятся по мере развития MMB)
const CODE_DIRS = ["src", "core", "app"].map(d => path.join(mmbRoot, d));
const ANCHOR_PATTERN = /\/\/\s*Skill\s+anchor:/i;
const HEADER_SKILL_PATTERN = /\*\s*Skill:\s*(.+)/i;

const server = new McpServer({
  name: "skills-mmb",
  version: "0.1.0",
});

// =============================================================================
// УТИЛИТЫ
// =============================================================================

function logDebug(message, data = {}) {
  const timestamp = new Date().toISOString();
  const logFile = path.join(logsDir, "mcp-debug.log");
  const logLine = `[skills-mmb] ${timestamp} ${message} ${JSON.stringify(data)}\n`;
  try {
    fsSync.mkdirSync(logsDir, { recursive: true });
    fsSync.appendFileSync(logFile, logLine);
  } catch { /* ignore */ }
  console.error(`[skills-mmb] ${timestamp} ${message} ${JSON.stringify(data)}`);
}

function normalizePath(inputPath) {
  return inputPath.split(path.sep).join("/");
}

function slugifyTitle(input) {
  const slug = String(input || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `skill-${Date.now()}`;
}

function formatTagList(tags = []) {
  const normalized = tags
    .map(tag => String(tag).trim())
    .filter(Boolean)
    .map(tag => (tag.startsWith("#") ? tag : `#${tag}`));
  return `[${normalized.join(", ")}]`;
}

function yamlEscape(value) {
  return String(value ?? "").replace(/"/g, '\\"');
}

async function readMatterFile(filePath) {
  const rawText = await fs.readFile(filePath, "utf8");
  let normalized = rawText;
  normalized = normalized.replace(
    /^(title:\s*)([^"'\n].+)$/m,
    (match, prefix, value) => value.includes(":") ? `${prefix}"${value.replace(/"/g, '\\"')}"` : match
  );
  normalized = normalized.replace(/^tags:\s*\[(.+?)\]\s*$/m, (match, tagsValue) => {
    const tags = tagsValue.split(",").map(t => t.trim()).filter(Boolean)
      .map(t => (t.startsWith('"') ? t : `"${t}"`));
    return `tags: [${tags.join(", ")}]`;
  });
  return matter(normalized);
}

async function walkMarkdownFiles(rootDir) {
  const results = [];
  async function walk(currentDir) {
    let entries;
    try { entries = await fs.readdir(currentDir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        await walk(entryPath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        results.push(entryPath);
      }
    }
  }
  await walk(rootDir);
  return results;
}

async function buildSkillRecord(filePath, repo) {
  const raw = await readMatterFile(filePath);
  const id = path.basename(filePath, ".md");
  const relativePath = normalizePath(path.relative(mmbRoot, filePath));
  return {
    id,
    title: raw.data?.title ?? id,
    repo,
    path: relativePath,
    tags: raw.data?.tags ?? [],
    dependencies: raw.data?.dependencies ?? [],
    updated_at: raw.data?.updated_at ?? null,
    short_description: raw.content?.trim().slice(0, 200) ?? "",
  };
}

// =============================================================================
// ЛОГИКА ИНСТРУМЕНТОВ
// =============================================================================

async function listSkills({ query, tags, limit, offset }) {
  logDebug("list_skills:start", { query, tags, limit, offset });

  const roots = [{ dir: skillsRoot, repo: "skills" }];
  // Skill anchor: MBB legacy roots добавляются только если заданы в .env
  if (mbbSkillsAll) roots.push({ dir: path.join(mbbSkillsAll, "skills"), repo: "mbb-all" });
  if (mbbSkillsMbb) roots.push({ dir: path.join(mbbSkillsMbb, "skills"), repo: "mbb-mbb" });

  const allFiles = await Promise.all(
    roots.map(async ({ dir, repo }) => {
      const files = await walkMarkdownFiles(dir);
      return Promise.all(files.map(f => buildSkillRecord(f, repo)));
    })
  );

  let records = allFiles.flat();

  if (query) {
    const parts = query.toLowerCase().split(/\s+/).filter(Boolean);
    records = records.filter(r => {
      const s = `${r.id} ${r.title}`.toLowerCase();
      return parts.every(p => s.includes(p));
    });
  }

  if (tags?.length) {
    records = records.filter(r => tags.every(t => (r.tags || []).includes(t)));
  }

  const start = offset ?? 0;
  const sliced = records.slice(start, start + (limit ?? 50));
  logDebug("list_skills:done", { total: records.length, returned: sliced.length });
  return sliced;
}

async function readSkill({ id, format }) {
  logDebug("read_skill:start", { id, format });

  const roots = [skillsRoot];
  if (mbbSkillsAll) roots.push(path.join(mbbSkillsAll, "skills"));
  if (mbbSkillsMbb) roots.push(path.join(mbbSkillsMbb, "skills"));

  for (const root of roots) {
    const files = await walkMarkdownFiles(root);
    const match = files.find(f => path.basename(f, ".md") === id);
    if (match) {
      const raw = await readMatterFile(match);
      logDebug("read_skill:found", { id, path: match });
      if (format === "json") {
        return { id, title: raw.data?.title ?? id, content: raw.content, metadata: raw.data ?? {} };
      }
      return { id, title: raw.data?.title ?? id, content: raw.content };
    }
  }

  logDebug("read_skill:not_found", { id });
  throw new Error("SKILL_NOT_FOUND");
}

async function searchSkillsFullText({ query, limit }) {
  const maxResults = limit ?? 10;
  const queryParts = query.toLowerCase().split(/\s+/).filter(Boolean);

  const roots = [skillsRoot];
  if (mbbSkillsAll) roots.push(path.join(mbbSkillsAll, "skills"));
  if (mbbSkillsMbb) roots.push(path.join(mbbSkillsMbb, "skills"));

  const allFiles = (await Promise.all(roots.map(walkMarkdownFiles))).flat();

  const results = [];
  for (const sf of allFiles) {
    const raw = await fs.readFile(sf, "utf8");
    const matchCount = queryParts.reduce((count, part) => {
      const regex = new RegExp(part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      return count + (raw.match(regex) || []).length;
    }, 0);
    if (matchCount > 0) {
      let title = path.basename(sf, ".md");
      try {
        const parsed = matter(raw.replace(/^tags:\s*\[(.+?)\]\s*$/m, (m, tv) => {
          const tags = tv.split(",").map(t => t.trim()).filter(Boolean).map(t => t.startsWith('"') ? t : `"${t}"`);
          return `tags: [${tags.join(", ")}]`;
        }));
        title = parsed.data?.title ?? title;
      } catch { /* use filename */ }
      results.push({
        id: path.basename(sf, ".md"),
        title,
        path: normalizePath(path.relative(mmbRoot, sf)),
        relevance: matchCount,
        snippet: raw.substring(0, 300).replace(/---[\s\S]*?---/, "").trim().slice(0, 200),
      });
    }
  }

  results.sort((a, b) => b.relevance - a.relevance);
  return { query, total_matches: results.length, results: results.slice(0, maxResults) };
}

async function findSkillsForFile(filePath) {
  const absPath = path.isAbsolute(filePath) ? filePath : path.resolve(mmbRoot, filePath);
  let content;
  try { content = await fs.readFile(absPath, "utf8"); } catch {
    return { file: filePath, headerSkills: [], inlineAnchors: [], relatedSkills: [] };
  }

  const headerSkills = [];
  const inlineAnchors = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headerMatch = line.match(HEADER_SKILL_PATTERN);
    if (headerMatch) headerSkills.push({ line: i + 1, ref: headerMatch[1].trim() });
    const anchorMatch = line.match(ANCHOR_PATTERN);
    if (anchorMatch) {
      const nextLine = lines[i + 1] || "";
      const seeMatch = nextLine.match(/\/\/\s*See\s+(.+)/i);
      inlineAnchors.push({ line: i + 1, text: line.trim(), skillRef: seeMatch ? seeMatch[1].trim() : null });
    }
  }

  const relPath = normalizePath(path.relative(mmbRoot, absPath));
  const basename = path.basename(absPath);
  const allSkillFiles = await walkMarkdownFiles(skillsRoot);
  const relatedSkills = [];
  for (const sf of allSkillFiles) {
    const raw = await fs.readFile(sf, "utf8");
    if (raw.includes(basename) || raw.includes(relPath)) {
      relatedSkills.push({ id: path.basename(sf, ".md"), path: normalizePath(path.relative(mmbRoot, sf)) });
    }
  }

  return { file: relPath, headerSkills, inlineAnchors, relatedSkills };
}

async function walkJsFiles(dir) {
  const results = [];
  async function walk(currentDir) {
    let entries;
    try { entries = await fs.readdir(currentDir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".git") continue;
        await walk(entryPath);
      } else if (entry.isFile() && entry.name.endsWith(".js")) {
        results.push(entryPath);
      }
    }
  }
  await walk(dir);
  return results;
}

async function auditSkillCoverage() {
  const allFiles = [];
  for (const dir of CODE_DIRS) {
    const files = await walkJsFiles(dir);
    allFiles.push(...files);
  }

  if (allFiles.length === 0) {
    return {
      total: 0,
      covered: 0,
      uncovered: 0,
      coverage_percent: 100,
      note: "No code directories found yet (src/, core/, app/). Add code to MMB first.",
      uncovered_files: [],
    };
  }

  const covered = [];
  const uncovered = [];
  for (const filePath of allFiles) {
    const content = await fs.readFile(filePath, "utf8");
    const relPath = normalizePath(path.relative(mmbRoot, filePath));
    const hasHeader = HEADER_SKILL_PATTERN.test(content);
    const hasAnchor = ANCHOR_PATTERN.test(content);
    if (hasHeader || hasAnchor) {
      covered.push({ file: relPath, hasHeader, hasAnchor });
    } else {
      uncovered.push({ file: relPath });
    }
  }

  return {
    total: allFiles.length,
    covered: covered.length,
    uncovered: uncovered.length,
    coverage_percent: Math.round((covered.length / allFiles.length) * 100),
    uncovered_files: uncovered,
  };
}

// =============================================================================
// РЕГИСТРАЦИЯ ИНСТРУМЕНТОВ
// =============================================================================

function successResponse(data) {
  return { content: [{ type: "text", text: JSON.stringify(data) }] };
}

function errorResponse(errorCode, message) {
  return { content: [{ type: "text", text: JSON.stringify({ errorCode, message }) }] };
}

server.registerTool("list_skills", {
  description: "List MMB skills with optional filtering by query and tags. Also searches MBB legacy skills if MBB_SKILLS_ALL/MBB_SKILLS_MBB are set in .env.",
  inputSchema: z.object({
    query: z.string().optional(),
    tags: z.array(z.string()).optional(),
    limit: z.number().int().positive().optional(),
    offset: z.number().int().nonnegative().optional(),
  }),
}, async (input) => {
  try { return successResponse(await listSkills(input)); }
  catch (e) { return errorResponse("SKILL_LIST_ERROR", e?.message ?? "Unknown error"); }
});

server.registerTool("read_skill", {
  description: "Read a skill by ID. Searches MMB skills first, then MBB legacy if available.",
  inputSchema: z.object({
    id: z.string(),
    format: z.enum(["markdown", "json"]).optional(),
  }),
}, async (input) => {
  try { return successResponse(await readSkill(input)); }
  catch (e) {
    if (e?.message === "SKILL_NOT_FOUND") return errorResponse("SKILL_NOT_FOUND", "Skill not found");
    return errorResponse("SKILL_READ_ERROR", e?.message ?? "Unknown error");
  }
});

server.registerTool("search_skills", {
  description: "Full-text search across all skill content (title, body, tags). More powerful than list_skills.",
  inputSchema: z.object({
    query: z.string().describe("Search query (e.g. 'retry', 'CORS', 'path resolver')"),
    limit: z.number().int().positive().optional().describe("Max results (default 10)"),
  }),
}, async (input) => {
  try { return successResponse(await searchSkillsFullText(input)); }
  catch (e) { return errorResponse("SEARCH_ERROR", e?.message ?? "Unknown error"); }
});

server.registerTool("find_skills_for_file", {
  description: "Find all skill references (header + inline anchors) in a code file. Use when editing a file to understand which skills govern its behavior.",
  inputSchema: z.object({
    file_path: z.string().describe("Relative path from MMB root (e.g. 'src/api/server.js') or absolute path"),
  }),
}, async (input) => {
  try { return successResponse(await findSkillsForFile(input.file_path)); }
  catch (e) { return errorResponse("FIND_SKILLS_ERROR", e?.message ?? "Unknown error"); }
});

server.registerTool("audit_skill_coverage", {
  description: "Audit MMB codebase for skill reference coverage. Returns files without any skill header or inline anchor. Returns a note if no code directories exist yet.",
  inputSchema: z.object({}),
}, async () => {
  try { return successResponse(await auditSkillCoverage()); }
  catch (e) { return errorResponse("AUDIT_ERROR", e?.message ?? "Unknown error"); }
});

// =============================================================================
// ЗАПУСК
// =============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal MCP server error:", error);
  process.exit(1);
});
