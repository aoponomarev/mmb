/**
 * ВАЛИДАТОР СИМЛИНКОВ (ЕИП - Единый Источник Правды)
 * Проверяет реестр paths.symlinksRegistry на наличие сломанных симлинков.
 */
import fs from "fs";
import path from "path";
import { paths } from "../../paths.js";

let hasErrors = false;

function reportError(msg) {
  console.error(`[symlinks-check] FAILED: ${msg}`);
  hasErrors = true;
}

function checkSymlinks() {
  const registry = paths.symlinksRegistry || {};
  const entries = Object.entries(registry);

  if (entries.length === 0) {
    console.log("[symlinks-check] No symlinks registered in paths.symlinksRegistry. (0 checked)");
    return;
  }

  let linkCount = 0;

  for (const [linkPath, targetPath] of entries) {
    linkCount++;

    if (!fs.existsSync(linkPath)) {
      reportError(`Link path does not exist: ${linkPath}`);
      continue;
    }

    try {
      const stats = fs.lstatSync(linkPath);
      if (stats.isSymbolicLink()) {
        const actualTarget = fs.readlinkSync(linkPath);
        const resolvedActualTarget = path.resolve(path.dirname(linkPath), actualTarget);
        if (resolvedActualTarget.toLowerCase() !== targetPath.toLowerCase()) {
          reportError(`Symlink target mismatch.\n  Expected: ${targetPath}\n  Actual:   ${resolvedActualTarget}`);
        }
      } else {
        // Warning instead of error, as some Windows setups copy files instead of linking them due to permissions
        console.warn(`[symlinks-check] WARNING: Path is a regular file/dir, not a symlink: ${linkPath}. Target SSOT is ${targetPath}. Ensure they are synced.`);
      }
    } catch (err) {
      reportError(`Error inspecting ${linkPath}: ${err.message}`);
    }
  }

  if (!hasErrors) {
    console.log(`[symlinks-check] OK: ${linkCount} symlink(s) checked successfully.`);
  }
}

function main() {
  console.log("[symlinks-check] Validating symlinks registry from paths.js...");
  checkSymlinks();

  if (hasErrors) {
    process.exit(1);
  }
}

main();
