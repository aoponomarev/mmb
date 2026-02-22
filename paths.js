/**
 * Skill: architecture/architecture-ssot
 *
 * SSOT всех путей проекта MMB.
 *
 * Принцип работы:
 * - Группа A (корни) читается из .env — единственное что меняется при смене ПК
 * - Группа B (проектные) вычисляется из MMB_ROOT автоматически
 * - Группа C (глобальные AI) вычисляется из AI_ROOT
 * - Группа D (Docker) — фиксированные пути внутри контейнеров
 * - Группа E (MBB legacy) — только на период миграции, потом удалить
 *
 * Использование:
 *   import { paths } from './paths.js';
 *   import { paths } from '../paths.js';
 */

import path from "path";
import { fileURLToPath } from "url";
import * as fsSync from "fs";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем .env вручную (без dotenv-зависимости) — только для корней группы A
function loadEnv() {
  const envPath = path.resolve(__dirname, ".env");
  if (!fsSync.existsSync(envPath)) return {};
  const result = {};
  const lines = fsSync.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    result[key] = value;
  }
  return result;
}

const env = loadEnv();

// Определяем среду выполнения
// Skill anchor: Docker detection via /.dockerenv — never trust /workspace on Windows host.
const isDocker = process.platform !== "win32" && fsSync.existsSync("/.dockerenv");

// =============================================================================
// ГРУППА A — КОРНИ (из .env или fallback через __dirname)
// =============================================================================

const MMB_ROOT = isDocker
  ? "/workspace/mmb"
  : path.resolve(__dirname); // paths.js лежит в корне MMB

const AI_ROOT = isDocker
  ? "/workspace/global/.."  // в Docker нет прямого AI_ROOT
  : (env.AI_ROOT || path.resolve(MMB_ROOT, "../.."));

const PRO_ROOT = isDocker
  ? "/workspace"
  : (env.PRO_ROOT || path.resolve(MMB_ROOT, ".."));

// Runtime Zod Validation for Critical Roots (Fail Fast)
if (!isDocker) {
  const RootSchema = z.object({
    MMB_ROOT: z.string().refine((val) => fsSync.existsSync(val), { message: "MMB_ROOT directory does not exist!" }),
    AI_ROOT: z.string().refine((val) => fsSync.existsSync(val), { message: "AI_ROOT directory does not exist! Check .env" }),
    PRO_ROOT: z.string().refine((val) => fsSync.existsSync(val), { message: "PRO_ROOT directory does not exist! Check .env" }),
  });
  
  try {
    RootSchema.parse({ MMB_ROOT, AI_ROOT, PRO_ROOT });
  } catch (error) {
    console.error("[SSOT Error] Failed to validate root paths during startup:");
    error.errors.forEach((err) => console.error(` - ${err.message}`));
    process.exit(1);
  }
}

// =============================================================================
// ГРУППА B — ПРОЕКТНЫЕ ПУТИ (вычисляются из MMB_ROOT)
// =============================================================================

const SKILLS_ROOT   = isDocker ? "/workspace/skills"   : path.resolve(MMB_ROOT, "skills");
const DRAFTS_ROOT   = isDocker ? "/workspace/skills/drafts" : path.resolve(MMB_ROOT, "skills", "drafts");
const LOGS_ROOT     = isDocker ? "/workspace/mmb/logs"  : path.resolve(MMB_ROOT, "logs");
const DATA_ROOT     = isDocker ? "/workspace/mmb/data"  : path.resolve(MMB_ROOT, "data");
const DATASETS_ROOT = isDocker
  ? "/workspace/datasets"
  : (env.DATASETS_ROOT || path.resolve(AI_ROOT, "Projects", "MMB", "datasets"));

// =============================================================================
// ГРУППА C — ГЛОБАЛЬНЫЕ AI-ПУТИ (для sync-скриптов)
// =============================================================================

const GLOBAL_ROOT   = isDocker ? "/workspace/global" : path.resolve(AI_ROOT, "Global");
const CURSOR_SSOT   = path.resolve(GLOBAL_ROOT, "Cursor");
const CONTINUE_SSOT = path.resolve(GLOBAL_ROOT, "AO", ".continue");
const VAULT_ROOT    = path.resolve(AI_ROOT, "_VAULT");

// =============================================================================
// ГРУППА F — СМЕЖНЫЕ РЕПОЗИТОРИИ (Repo "a")
// =============================================================================

const REPO_A_ROOT   = isDocker ? "/workspace/a" : path.resolve(PRO_ROOT, "a");
const A_LIBS_ROOT   = path.resolve(REPO_A_ROOT, "libs");
const A_COINS_ROOT  = path.resolve(REPO_A_ROOT, "coins");
const A_DATA_ROOT   = path.resolve(REPO_A_ROOT, "data");

// =============================================================================
// ГРУППА D — DOCKER INTERNAL (фиксированные, не меняются)
// =============================================================================

const DOCKER = {
  mmb:      "/workspace/mmb",
  skills:   "/workspace/skills",
  datasets: "/workspace/datasets",
  global:   "/workspace/global",
};

// =============================================================================
// ГРУППА E — MBB LEGACY (только на период миграции, потом удалить)
// =============================================================================
// Раскомментировать MBB_SKILLS_ALL и MBB_SKILLS_MBB в .env для активации.

const MBB_SKILLS_ALL = env.MBB_SKILLS_ALL || null;
const MBB_SKILLS_MBB = env.MBB_SKILLS_MBB || null;

// =============================================================================
// ГРУППА G — СИМЛИНКИ (РЕЕСТР)
// =============================================================================
// Формат: Путь симлинка (в ОС) -> Целевой файл (SSOT внутри проекта/системы).
// Симлинки проверяются командой `npm run symlinks:check`.

const APPDATA = process.env.APPDATA || (process.platform === 'win32' ? path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming') : '');
const CURSOR_USER = path.join(APPDATA, 'Cursor', 'User');
const GLOBAL_CURSOR_USER = path.resolve(GLOBAL_ROOT, "AO", "AppData", "Roaming", "Cursor", "User");

const SYMLINKS_REGISTRY = {
  [path.join(CURSOR_USER, "workspaceStorage")]: path.join(GLOBAL_CURSOR_USER, "workspaceStorage"),
  [path.join(CURSOR_USER, "snippets")]: path.join(GLOBAL_CURSOR_USER, "snippets"),
  [path.join(CURSOR_USER, "settings.json")]: path.join(GLOBAL_CURSOR_USER, "settings.json"),
  [path.join(CURSOR_USER, "keybindings.json")]: path.join(GLOBAL_CURSOR_USER, "keybindings.json")
};

// =============================================================================
// ЭКСПОРТ
// =============================================================================

export const paths = {
  // Группа A
  mmb:      MMB_ROOT,
  ai:       AI_ROOT,
  pro:      PRO_ROOT,

  // Группа B
  skills:   SKILLS_ROOT,
  drafts:   DRAFTS_ROOT,
  logs:     LOGS_ROOT,
  data:     DATA_ROOT,
  datasets: DATASETS_ROOT,

  // Группа C
  global:   GLOBAL_ROOT,
  cursorSsot:   CURSOR_SSOT,
  continueSsot: CONTINUE_SSOT,
  vault:    VAULT_ROOT,

  // Группа F (Смежные репозитории)
  repoA:    REPO_A_ROOT,
  aLibs:    A_LIBS_ROOT,
  aCoins:   A_COINS_ROOT,
  aData:    A_DATA_ROOT,

  // Группа D
  docker:   DOCKER,

  // Группа E (legacy, null если не заданы в .env)
  mbbSkillsAll: MBB_SKILLS_ALL,
  mbbSkillsMbb: MBB_SKILLS_MBB,

  // Группа G (Симлинки)
  symlinksRegistry: SYMLINKS_REGISTRY,

  // Хелперы
  /** Путь внутри MMB: paths.project('logs', 'server.log') */
  project: (...args) => path.resolve(MMB_ROOT, ...args),
  /** Путь внутри skills: paths.skill('process', 'my-skill.md') */
  skill: (...args) => path.resolve(SKILLS_ROOT, ...args),
};

export default paths;