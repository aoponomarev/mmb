import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(".");
const REGISTRY_PATH = path.join(ROOT, "is", "contracts", "docs", "id-registry.json");
const EXCLUDE_DIRS = new Set(["node_modules", ".git", ".cursor"]);

function walkMarkdown(dir, result = []) {
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      walkMarkdown(full, result);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      result.push(full);
    }
  }
  return result;
}

function getRelativeLinkPath(fromFilePath, targetFilePath) {
    const fromDir = path.dirname(fromFilePath);
    let rel = path.relative(fromDir, targetFilePath).replace(/\\/g, "/");
    // Ensure it doesn't just start with the file name if it's in the same dir,
    // actually path.relative handles this, but let's make sure it doesn't have leading ./
    // wait, standard markdown allows `file.md` or `./file.md` or `../dir/file.md`
    // Let's just use path.relative
    return rel;
}

function main() {
  const parsed = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
  const registry = parsed.markdown && typeof parsed.markdown === "object" ? parsed.markdown : {};
  let totalFixed = 0;

  for (const file of walkMarkdown(ROOT)) {
    let text = fs.readFileSync(file, "utf8");
    let changed = false;

    // Regex to match [text containing id:xxx](path)
    // We capture:
    // 1: The full link [text...id:xxx...](path)
    // 2: The id:xxx
    // 3: The path inside ()
    const regex = /\[([^\]]*\bid:([a-z0-9-]+)[^\]]*)\]\(([^)]+)\)/g;
    
    text = text.replace(regex, (match, linkText, id, oldPath) => {
      const targetAbsRelPath = registry[id];
      if (!targetAbsRelPath) {
        return match; // id not found, ignore
      }
      
      const targetAbsPath = path.join(ROOT, targetAbsRelPath);
      const expectedRelPath = getRelativeLinkPath(file, targetAbsPath);
      
      // We also handle cases where the oldPath has an anchor: `path.md#anchor`
      let oldPathNoAnchor = oldPath;
      let anchor = "";
      const anchorIdx = oldPath.indexOf("#");
      if (anchorIdx !== -1) {
        oldPathNoAnchor = oldPath.substring(0, anchorIdx);
        anchor = oldPath.substring(anchorIdx);
      }

      // If the path doesn't match the expected relative path, update it.
      // E.g. expected: `../ais/ais-file.md`, old: `ais-file.md`
      
      // Let's normalize both to check if they are effectively the same
      // e.g. ./file.md == file.md
      const oldResolved = path.resolve(path.dirname(file), oldPathNoAnchor);
      const expectedResolved = targetAbsPath;
      
      if (oldResolved !== expectedResolved) {
        console.log(`Fixing link in ${path.relative(ROOT, file)}:`);
        console.log(`  ID: ${id}`);
        console.log(`  Old path: ${oldPathNoAnchor}`);
        console.log(`  New path: ${expectedRelPath}`);
        changed = true;
        return `[${linkText}](${expectedRelPath}${anchor})`;
      }
      
      return match;
    });

    if (changed) {
      fs.writeFileSync(file, text, "utf8");
      totalFixed++;
    }
  }

  console.log(`\nFixed links in ${totalFixed} files.`);
}

main();