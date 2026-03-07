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

function normalizePath(p) {
  return p.replace(/\\/g, "/");
}

function main() {
  const idRegistry = JSON.parse(fs.readFileSync(ID_REG_PATH, "utf8")).markdown || {};
  let codeRegistry = {};
  if (fs.existsSync(CODE_REG_PATH)) {
      codeRegistry = JSON.parse(fs.readFileSync(CODE_REG_PATH, "utf8"));
  }
  
  // Create a combined lookup: hash -> absolute path
  const hashToAbsPath = {};
  for (const [id, relPath] of Object.entries(idRegistry)) {
    hashToAbsPath[`id:${id}`] = path.join(ROOT, relPath);
  }
  for (const [hash, filePath] of Object.entries(codeRegistry)) {
    hashToAbsPath[hash] = path.join(ROOT, filePath);
  }

  for (const file of walkFiles(ROOT)) {
    let text = fs.readFileSync(file, "utf8");
    const lines = text.split('\n');
    const fileDir = path.dirname(file);

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      let lineHashes = [];
      const idMatch = line.match(/\bid:([a-z0-9-]+)\b/g);
      if (idMatch) lineHashes.push(...idMatch);
      const jsMatch = line.match(/#JS-[a-f0-9]{8}\b|#JS-[A-Za-z0-9]+\b/g);
      if (jsMatch) lineHashes.push(...jsMatch);

      if (lineHashes.length === 0) continue;

      // Check if there are Markdown links in this line
      const mdLinkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
      let mdMatch;
      while ((mdMatch = mdLinkRegex.exec(line)) !== null) {
        const linkText = mdMatch[1];
        let linkUrl = mdMatch[2];
        
        let linkHashes = [];
        const lidMatch = linkText.match(/\bid:([a-z0-9-]+)\b/g) || [];
        const ljsMatch = linkText.match(/#JS-[a-f0-9]{8}\b|#JS-[A-Za-z0-9]+\b/g) || [];
        const uidMatch = linkUrl.match(/\bid:([a-z0-9-]+)\b/g) || [];
        const ujsMatch = linkUrl.match(/#JS-[a-f0-9]{8}\b|#JS-[A-Za-z0-9]+\b/g) || [];
        linkHashes.push(...lidMatch, ...ljsMatch, ...uidMatch, ...ujsMatch);

        for (const hash of linkHashes) {
          if (hashToAbsPath[hash]) {
            const targetAbs = hashToAbsPath[hash];
            
            let linkPath = linkUrl.split('#')[0]; // simple split for anchor
            if (!linkPath) continue; // anchor only
            if (linkPath.startsWith("http")) continue;

            const resolvedLinkAbs = path.resolve(fileDir, linkPath);
            if (resolvedLinkAbs !== targetAbs) {
              console.log(`[MD LINK] File: ${normalizePath(path.relative(ROOT, file))}:${i+1}`);
              console.log(`  Hash: ${hash}`);
              console.log(`  Expected: ${normalizePath(path.relative(ROOT, targetAbs))}`);
              console.log(`  Found in URL: ${linkPath}`);
            }
          }
        }
      }

      // Check plain paths in the line near hashes
      const pathRegex = /(?:\.\/|\.\.\/|[a-zA-Z0-9_.-]+\/)+[a-zA-Z0-9_.-]+\.(?:md|js|ts|jsonc|json)/g;
      let pathMatch;
      while ((pathMatch = pathRegex.exec(line)) !== null) {
        const potentialPath = pathMatch[0];
        
        // Skip if this path is part of a markdown link we just checked
        // Simple heuristic: if the line contains `](` and the path is right after it, skip.
        // But let's just do a blanket check.
        
        let testAbsPath;
        if (potentialPath.startsWith("./") || potentialPath.startsWith("../")) {
          testAbsPath = path.resolve(fileDir, potentialPath);
        } else {
          testAbsPath = path.resolve(ROOT, potentialPath);
        }

        // Check if testAbsPath matches ANY hash target in the line
        // Wait, if it DOESN'T match, it's a mismatch. But only if there is only 1 hash and 1 path?
        for (const hash of lineHashes) {
          if (hashToAbsPath[hash]) {
            const targetAbs = hashToAbsPath[hash];
            if (testAbsPath !== targetAbs) {
              // Only report if it's the SAME document name but different path, 
              // or if we have high confidence it's meant to be the same file.
              const testBase = path.basename(testAbsPath);
              const targetBase = path.basename(targetAbs);
              if (testBase === targetBase || lineHashes.length === 1) {
                  // Only report if the path ACTUALLY EXISTS as a file previously, or looks like the old path.
                  // E.g., it was renamed.
                  console.log(`[PLAIN PATH] File: ${normalizePath(path.relative(ROOT, file))}:${i+1}`);
                  console.log(`  Hash: ${hash}`);
                  console.log(`  Expected: ${normalizePath(path.relative(ROOT, targetAbs))}`);
                  console.log(`  Found: ${potentialPath}`);
              }
            }
          }
        }
      }
    }
  }
}

main();