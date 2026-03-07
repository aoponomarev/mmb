import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(".");
const ID_REG_PATH = path.join(ROOT, "is", "contracts", "docs", "id-registry.json");
const CODE_REG_PATH = path.join(ROOT, "is", "contracts", "docs", "code-file-registry.json");
const EXCLUDE_DIRS = new Set(["node_modules", ".git", ".cursor"]);

function walkFiles(dir, result = []) {
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      walkFiles(full, result);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (ext === ".md" || ext === ".js" || ext === ".ts" || ext === ".jsonc" || ext === ".json") {
        result.push(full);
      }
    }
  }
  return result;
}

function main() {
  const idRegistry = JSON.parse(fs.readFileSync(ID_REG_PATH, "utf8")).markdown || {};
  const codeRegistry = JSON.parse(fs.readFileSync(CODE_REG_PATH, "utf8"));
  
  // Create a combined lookup: hash -> absolute path
  const hashToAbsPath = {};
  for (const [id, relPath] of Object.entries(idRegistry)) {
    hashToAbsPath[`id:${id}`] = path.join(ROOT, relPath);
  }
  for (const [hash, fileObj] of Object.entries(codeRegistry)) {
    hashToAbsPath[hash] = path.join(ROOT, fileObj.path);
  }

  let totalFixed = 0;

  for (const file of walkFiles(ROOT)) {
    let text = fs.readFileSync(file, "utf8");
    let changed = false;

    // We need to find patterns where a path is mentioned near a hash.
    // 1. Markdown link with hash in text: [something id:xxx](path) or [something #JS-xxx](path)
    // 2. Markdown link with hash in URL: [something](path#JS-xxx) -> Wait, usually it's [id:xxx](path)
    
    // Pattern A: [Text with id:some-id](some-path) or [Text with #JS-some-id](some-path)
    // Actually, any Markdown link: \[([^\]]*)\)\]\(([^)]+)\) Wait, regex: \[([^\]]+)\]\(([^)]+)\)
    const mdLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    
    text = text.replace(mdLinkRegex, (match, linkText, linkUrl) => {
      // Find all hashes in the link text OR the link URL
      let hashes = [];
      const idMatch = linkText.match(/\bid:([a-z0-9-]+)\b/g);
      if (idMatch) hashes.push(...idMatch);
      const jsMatch = linkText.match(/#JS-[a-f0-9]{8}\b|#JS-[A-Za-z0-9]+\b/g);
      if (jsMatch) hashes.push(...jsMatch);
      
      const urlIdMatch = linkUrl.match(/\bid:([a-z0-9-]+)\b/g);
      if (urlIdMatch) hashes.push(...urlIdMatch);
      const urlJsMatch = linkUrl.match(/#JS-[a-f0-9]{8}\b|#JS-[A-Za-z0-9]+\b/g);
      if (urlJsMatch) hashes.push(...urlJsMatch);

      if (hashes.length === 0) return match;

      // We only care if there's exactly one hash we can resolve, or if they all point to the same file.
      // Let's take the first resolving hash.
      let targetAbsPath = null;
      let usedHash = null;
      for (const hash of hashes) {
        if (hashToAbsPath[hash]) {
          targetAbsPath = hashToAbsPath[hash];
          usedHash = hash;
          break;
        }
      }

      if (!targetAbsPath) return match;

      // Parse linkUrl (could have anchor)
      let linkPath = linkUrl;
      let anchor = "";
      const hashIdx = linkUrl.indexOf("#");
      // If the # is part of #JS-, we need to be careful. But usually paths don't contain #JS- unless it's the anchor.
      if (hashIdx !== -1 && !linkUrl.substring(hashIdx).startsWith("#JS-")) {
        linkPath = linkUrl.substring(0, hashIdx);
        anchor = linkUrl.substring(hashIdx);
      } else if (hashIdx !== -1 && linkUrl.substring(hashIdx).startsWith("#JS-")) {
          linkPath = linkUrl.substring(0, hashIdx);
          anchor = linkUrl.substring(hashIdx);
      }

      if (!linkPath) return match; // just an anchor link like `[foo](#JS-123)`
      
      // If it's an external link, ignore
      if (linkPath.startsWith("http://") || linkPath.startsWith("https://")) return match;

      const fileDir = path.dirname(file);
      const resolvedLinkAbs = path.resolve(fileDir, linkPath);
      
      if (resolvedLinkAbs !== targetAbsPath) {
        // Mismatch!
        // Calculate new relative path
        let newRelPath = path.relative(fileDir, targetAbsPath).replace(/\\/g, "/");
        if (!newRelPath.startsWith(".") && !newRelPath.startsWith("/")) {
          newRelPath = "./" + newRelPath; // typical convention, though not strict. Let's just use what path.relative gives.
          // actually standard markdown links don't strictly need ./
          if (newRelPath.includes("/")) {
            // it's fine
          } else {
            newRelPath = "./" + newRelPath; // e.g. ./sibling.md
          }
        }
        // Actually path.relative from same dir gives "sibling.md". Let's prefer "./sibling.md" if it was local.
        if (!newRelPath.startsWith(".")) newRelPath = "./" + newRelPath;

        // Clean up "./../" -> "../"
        newRelPath = newRelPath.replace(/^\.\/\.\.\//, "../");

        console.log(`\n[Markdown Link Fix] in ${path.relative(ROOT, file)}`);
        console.log(`  Hash: ${usedHash}`);
        console.log(`  Old link: ${linkUrl}`);
        console.log(`  New link: ${newRelPath}${anchor}`);
        changed = true;
        return `[${linkText}](${newRelPath}${anchor})`;
      }

      return match;
    });

    // Pattern B: Code comments or text mentioning a file path AND a hash nearby
    // Let's use a simpler check: look for any valid hash in the line, 
    // and if there's a file path in that same line that ends with .md or .js, verify it.
    // This is risky to regex replace blindly, but we can do it if it's very clearly a path.
    const lines = text.split('\n');
    let lineChanged = false;
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      // find hashes
      let hashes = [];
      const idMatch = line.match(/\bid:([a-z0-9-]+)\b/g);
      if (idMatch) hashes.push(...idMatch);
      const jsMatch = line.match(/#JS-[a-f0-9]{8}\b|#JS-[A-Za-z0-9]+\b/g);
      if (jsMatch) hashes.push(...jsMatch);

      if (hashes.length === 0) continue;

      let targetAbsPath = null;
      let usedHash = null;
      for (const hash of hashes) {
        if (hashToAbsPath[hash]) {
          targetAbsPath = hashToAbsPath[hash];
          usedHash = hash;
          break;
        }
      }
      
      if (!targetAbsPath) continue;

      // Extract what looks like paths: e.g., something/something.md or something/something.js
      // We look for sequences of characters containing at least one slash and ending with an extension.
      // E.g. `docs/ais/some-file.md` or `is/contracts/rules.js`
      const pathRegex = /([a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)+\.(?:md|js|ts|jsonc|json))/g;
      
      // If the path is already in a markdown link, we already processed it above.
      // Let's avoid double-replacing. 
      // But we can just check if any path in this line differs from targetAbsPath, and replace it.
      
      let newline = line.replace(pathRegex, (potentialPath) => {
        // Is this path pointing to the hash?
        // We only replace if the filename of potentialPath matches the filename of targetAbsPath
        // OR if it's obviously a mismatch of the same document (e.g. it's the old path).
        // Since we know this line contains `usedHash`, does this `potentialPath` refer to it?
        // Let's calculate the expected absolute path of potentialPath.
        // If it's a relative path starting with ./ or ../, resolve it relative to current file.
        // Otherwise, assume it's relative to ROOT (e.g. `docs/ais/...`).
        let testAbsPath;
        if (potentialPath.startsWith("./") || potentialPath.startsWith("../")) {
          testAbsPath = path.resolve(path.dirname(file), potentialPath);
        } else {
          testAbsPath = path.resolve(ROOT, potentialPath);
        }

        if (testAbsPath !== targetAbsPath) {
            // Wait, what if the line contains MULTIPLE hashes and MULTIPLE paths?
            // To be safe, check if the basename of the potential path is similar to the basename of the target path,
            // OR if the potential path matches an OLD path (e.g. `docs/ais/ais-mcp-data-contour.md`).
            // It's safer to just replace it if we are confident.
            // A good heuristic: if potentialPath starts with the same root folder (e.g. 'docs/' or 'is/')
            // and we know it's a mismatch.
            const targetRelToRoot = path.relative(ROOT, targetAbsPath).replace(/\\/g, "/");
            
            // If the potential path is a known old name or just a wrong path,
            // Let's just output it to console first.
            // Actually, we can replace it with targetRelToRoot.
            
            // Wait, we don't want to replace *every* path if there are multiple hashes/paths.
            // If the line only has 1 hash and 1 path, it's very safe.
            const pathMatches = line.match(pathRegex);
            if (pathMatches && pathMatches.length === 1 && hashes.length === 1) {
                console.log(`\n[Line Path Fix] in ${path.relative(ROOT, file)}`);
                console.log(`  Hash: ${usedHash}`);
                console.log(`  Old path: ${potentialPath}`);
                
                // If the old path was relative (./ or ../), replace with relative.
                // If it was absolute-ish (docs/...), replace with absolute-ish.
                let newPathStr;
                if (potentialPath.startsWith("./") || potentialPath.startsWith("../")) {
                    newPathStr = path.relative(path.dirname(file), targetAbsPath).replace(/\\/g, "/");
                    if (!newPathStr.startsWith(".")) newPathStr = "./" + newPathStr;
                    newPathStr = newPathStr.replace(/^\.\/\.\.\//, "../");
                } else {
                    newPathStr = targetRelToRoot;
                }
                console.log(`  New path: ${newPathStr}`);
                return newPathStr;
            }
        }
        return potentialPath;
      });

      if (newline !== line) {
        lines[i] = newline;
        changed = true;
      }
    }

    if (changed) {
      // Re-stitch text only if we changed via lines array (meaning Pattern B worked)
      // Actually we need to be careful: Pattern A replaced `text` string, Pattern B worked on `lines`.
      // We should do Pattern A, then split, then Pattern B.
      
    }
  }

}
main();