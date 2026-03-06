/**
 * #JS-713nTs3B
 * @description Canonical frontmatter order for skills. id always first.
 * @skill id:sk-d7bf67
 */

/** Canonical order for skill frontmatter. id must be first. */
export const SKILL_FRONTMATTER_ORDER = [
    "id",
    "title",
    "tags",
    "status",
    "reasoning_confidence",
    "reasoning_audited_at",
    "reasoning_checksum",
    "last_change",
    "related_skills",
    "related_ais",
    "dependencies",
    "updated_at",
];

/** Canonical order for docs (AIS, plans). id must be first. */
export const DOC_FRONTMATTER_ORDER = [
    "id",
    "status",
    "last_updated",
    "related_skills",
    "related_ais",
];

/**
 * Parse frontmatter block into key-value map. Handles simple values and YAML arrays.
 * @param {string} block - Content between --- delimiters
 * @returns {{ [key: string]: string | string[] }}
 */
export function parseFrontmatterBlock(block) {
    const out = {};
    const lines = block.split(/\r?\n/);
    let i = 0;
    while (i < lines.length) {
        const m = lines[i].match(/^([\w-]+):\s*(.*)$/);
        if (m) {
            const key = m[1];
            const rest = m[2].trim();
            const stripped = rest.replace(/^["']|["']$/g, "");
            if (rest && !rest.startsWith("[") && !stripped.startsWith("[")) {
                out[key] = stripped;
            } else if (rest.startsWith("[") || stripped.startsWith("[")) {
                try {
                    out[key] = JSON.parse(stripped.startsWith("[") ? stripped : rest);
                } catch {
                    out[key] = stripped || rest;
                }
            } else {
                const arr = [];
                i++;
                while (i < lines.length && /^\s+-\s+/.test(lines[i])) {
                    arr.push(lines[i].replace(/^\s+-\s+/, "").trim().replace(/^["']|["']$/g, ""));
                    i++;
                }
                out[key] = arr;
                i--;
            }
        }
        i++;
    }
    return out;
}

/**
 * Build frontmatter block from object in canonical order.
 * One blank line before closing ---. Trailing newline included.
 * @param {{ [key: string]: string | string[] }} obj
 * @param {string[]} order - Field order (id first)
 * @returns {string}
 */
export function buildFrontmatterBlock(obj, order) {
    const known = new Set(order);
    const knownOrdered = order.filter((k) => obj[k] !== undefined);
    const unknown = Object.keys(obj).filter((k) => !known.has(k)).sort();
    const keys = [...knownOrdered, ...unknown];

    const lines = [];
    for (const k of keys) {
        const v = obj[k];
        if (Array.isArray(v)) {
            lines.push(`${k}:`);
            for (const item of v) {
                const s = String(item);
                const quoted = /[#:\s\[\]{}|>]/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s;
                lines.push(`  - ${quoted}`);
            }
        } else if (typeof v === "string") {
            if (v === "") {
                lines.push(`${k}: ""`);
            } else {
                const needsQuotes = /[:\s#\[\]{}|>]/.test(v) || v === "true" || v === "false";
                lines.push(needsQuotes ? `${k}: "${v}"` : `${k}: ${v}`);
            }
        }
    }
    return lines.length ? lines.join("\n") + "\n\n" : "";
}
