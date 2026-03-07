import fs from "node:fs";
import path from "node:path";

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

  let totalMismatches = 0;

  for (const file of walkFiles(ROOT)) {
    let text = fs.readFileSync(file, "utf8");
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      
      // Look for pattern: id:xxx (some/path.md) or #JS-xxx (some/path.js)
      const regex = /(id:[a-z0-9-]+|#[A-Z]+-[a-zA-Z0-9]+)\s*\(([^)]+\.(?:md|js|ts|jsonc|json|css))\)/g;
      let match;
      while ((match = regex.exec(line)) !== null) {
        const hash = match[1];
        const rawPath = match[2];
        
        if (hashToAbsPath[hash]) {
            const expectedAbs = hashToAbsPath[hash];
            
            // The written path might be relative to the current file, or relative to ROOT.
            // Usually, standard is relative to ROOT (e.g., `docs/ais/...` or `is/scripts/...`).
            // Let's resolve both ways and see if ANY match.
            const fileDir = path.dirname(file);
            const resolvedRelFile = path.resolve(fileDir, rawPath);
            const resolvedRelRoot = path.resolve(ROOT, rawPath);
            
            if (resolvedRelFile !== expectedAbs && resolvedRelRoot !== expectedAbs) {
                const expectedRelRoot = normalizePath(path.relative(ROOT, expectedAbs));
                console.log(`Mismatch in ${normalizePath(path.relative(ROOT, file))}:${i+1}`);
                console.log(`  Found: ${hash} (${rawPath})`);
                console.log(`  Expected path: ${expectedRelRoot}`);
                totalMismatches++;
                
                // Fix the line
                line = line.replace(`${hash} (${rawPath})`, `${hash} (${expectedRelRoot})`);
            }
        }
      }
      lines[i] = line;
    }
    
    const newText = lines.join('\n');
    if (newText !== text) {
        fs.writeFileSync(file, newText, "utf8");
    }
  }
  if (totalMismatches === 0) {
      console.log("No mismatches found for 'hash (path)' pattern.");
  }
}

main();