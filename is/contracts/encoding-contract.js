/**
 * #JS-mg3dvJhr
 * @description SSOT for encoding policy: UTF-8 without BOM + LF.
 * @skill id:sk-8f3a2e
 * @causality #for-utf8-no-bom-lf
 */
export const ENCODING_POLICY = "utf8";
export const LINE_ENDING = "lf";
export const BOM_FORBIDDEN = true;

/** Text file extensions subject to encoding validation and normalization */
export const TEXT_EXT = new Set([
  ".md",
  ".mdc",
  ".js",
  ".ts",
  ".json",
  ".yml",
  ".yaml",
  ".ps1",
  ".css",
  ".html",
]);

/** Directories excluded from encoding walk */
export const EXCLUDE_DIRS = new Set(["node_modules", ".git", ".cursor"]);
