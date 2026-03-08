/**
 * #JS-ka3MqSgk
 * @description Blocking contract: only one active writer via DATA_PLANE_ACTIVE_APP.
 * @skill id:sk-73dcca
 * @skill id:sk-483943
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../../contracts/path-contracts.js";

function readText(filePath) {
    return fs.readFileSync(filePath, "utf8");
}

function hasEnvDeclaration(text, key) {
    const re = new RegExp(`^\\s*#?\\s*${key}=`, "m");
    return re.test(text);
}

function getEnvValue(text, key) {
    const re = new RegExp(`^\\s*${key}\\s*=\\s*(.+)\\s*$`, "m");
    const match = text.match(re);
    if (!match) return "";
    return match[1].trim().replace(/^['"]|['"]$/g, "");
}

function main() {
    const envExamplePath = path.join(ROOT, ".env.example");
    const envPath = path.join(ROOT, ".env");

    if (!fs.existsSync(envExamplePath)) {
        throw new Error(".env.example not found");
    }
    const exampleText = readText(envExamplePath);
    if (!hasEnvDeclaration(exampleText, "DATA_PLANE_ACTIVE_APP")) {
        throw new Error(".env.example missing DATA_PLANE_ACTIVE_APP template");
    }

    if (!fs.existsSync(envPath)) {
        throw new Error(".env not found; single-writer contract cannot be validated");
    }
    const envText = readText(envPath);
    if (!hasEnvDeclaration(envText, "DATA_PLANE_ACTIVE_APP")) {
        throw new Error(".env missing DATA_PLANE_ACTIVE_APP");
    }
    
    const activeWriter = getEnvValue(envText, "DATA_PLANE_ACTIVE_APP");
    
    const validWriters = ['TARGET', 'LEGACY'];
    if (!validWriters.includes(activeWriter)) {
        throw new Error(`DATA_PLANE_ACTIVE_APP must be one of [${validWriters.join(', ')}], got "${activeWriter || "<empty>"}"`);
    }

    console.log(`[single-writer-guard] OK: Active data plane writer = ${activeWriter}`);
}

try {
    main();
} catch (error) {
    console.error(`[single-writer-guard] FAILED: ${error.message}`);
    process.exit(1);
}
