import fs from "node:fs/promises";
import * as fsSync from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { PATHS, PROJECT_ROOT } from "../../contracts/paths/paths.js";

const logsDir = PATHS.logs;
const skillsRoots = [PATHS.skills, PATHS.coreSkills];

const SKIP_DIRS = new Set(["drafts", "archive", "meta", "causality"]);
const CODE_DIRS = [PATHS.is, PATHS.core, PATHS.app];
const ANCHOR_PATTERN = /\/\/\s*@skill-anchor\s+([^:]+):/i;
const HEADER_SKILL_PATTERN = /\*\s*@skill\s+(.+)/i;

const server = new McpServer({
  name: "skills-server",
  version: "0.1.0",
});

// =============================================================================
// UTILS
// =============================================================================

function logDebug(message, data = {}) {
  const timestamp = new Date().toISOString();
  const logFile = path.join(logsDir, "mcp-debug.log");
  const logLine = `[skills-mcp] ${timestamp} ${message} ${JSON.stringify(data)}\n`;
  try {
    fsSync.mkdirSync(logsDir, { recursive: true });
    fsSync.appendFileSync(logFile, logLine);
  } catch { /* ignore */ }
  console.error(`[skills-mcp] ${timestamp} ${message} ${JSON.stringify(data)}`);
}

function normalizePath(inputPath) {
  return inputPath.split(path.sep).join("/");
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
  const relativePath = normalizePath(path.relative(PROJECT_ROOT, filePath));
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
// TOOLS
// =============================================================================

async function listSkills({ query, tags, limit, offset }) {
  logDebug("list_skills:start", { query, tags, limit, offset });

  const allFiles = await Promise.all(
    skillsRoots.map(async (dir) => {
      const files = await walkMarkdownFiles(dir);
      return Promise.all(files.map(f => buildSkillRecord(f, "local")));
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

  for (const root of skillsRoots) {
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

  const allFiles = (await Promise.all(skillsRoots.map(walkMarkdownFiles))).flat();

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
        path: normalizePath(path.relative(PROJECT_ROOT, sf)),
        relevance: matchCount,
        snippet: raw.substring(0, 300).replace(/---[\s\S]*?---/, "").trim().slice(0, 200),
      });
    }
  }

  results.sort((a, b) => b.relevance - a.relevance);
  return { query, total_matches: results.length, results: results.slice(0, maxResults) };
}

async function findSkillsForFile(filePath) {
  const absPath = path.isAbsolute(filePath) ? filePath : path.resolve(PROJECT_ROOT, filePath);
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
      inlineAnchors.push({ line: i + 1, text: line.trim(), skillRef: anchorMatch[1].trim() });
    }
  }

  const relPath = normalizePath(path.relative(PROJECT_ROOT, absPath));
  const basename = path.basename(absPath);
  const allSkillFiles = (await Promise.all(skillsRoots.map(walkMarkdownFiles))).flat();
  
  const relatedSkills = [];
  for (const sf of allSkillFiles) {
    const raw = await fs.readFile(sf, "utf8");
    if (raw.includes(basename) || raw.includes(relPath)) {
      relatedSkills.push({ id: path.basename(sf, ".md"), path: normalizePath(path.relative(PROJECT_ROOT, sf)) });
    }
  }

  return { file: relPath, headerSkills, inlineAnchors, relatedSkills };
}

function successResponse(data) {
  return { content: [{ type: "text", text: JSON.stringify(data) }] };
}

function errorResponse(errorCode, message) {
  return { content: [{ type: "text", text: JSON.stringify({ errorCode, message }) }] };
}

server.registerTool("list_skills", {
  description: "List skills with optional filtering by query and tags.",
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
  description: "Read a skill by ID from the local knowledge base.",
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
  description: "Full-text search across all skill content (title, body, tags).",
  inputSchema: z.object({
    query: z.string().describe("Search query (e.g. 'zod', 'paths')"),
    limit: z.number().int().positive().optional(),
  }),
}, async (input) => {
  try { return successResponse(await searchSkillsFullText(input)); }
  catch (e) { return errorResponse("SEARCH_ERROR", e?.message ?? "Unknown error"); }
});

server.registerTool("find_skills_for_file", {
  description: "Find all skill references (header + inline anchors) in a code file.",
  inputSchema: z.object({
    file_path: z.string(),
  }),
}, async (input) => {
  try { return successResponse(await findSkillsForFile(input.file_path)); }
  catch (e) { return errorResponse("FIND_SKILLS_ERROR", e?.message ?? "Unknown error"); }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal MCP server error:", error);
  process.exit(1);
});
