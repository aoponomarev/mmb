import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..', '..');

const REQUIRED_READMES = [
    'app/README.md',
    'app/skills/README.md',
    'core/README.md',
    'core/skills/README.md',
    'is/README.md',
    'docs/README.md',
    'is/scripts/README.md',
    'is/skills/README.md',
    'is/contracts/README.md',
    'data/README.md'
];

function main() {
    let hasErrors = false;
    const missing = [];

    // Ensure data directory exists before checking its README
    const dataDir = path.join(ROOT, 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    for (const relPath of REQUIRED_READMES) {
        const fullPath = path.join(ROOT, relPath);
        if (!fs.existsSync(fullPath)) {
            missing.push(relPath);
            hasErrors = true;
        } else {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.trim().length < 20) {
                missing.push(`${relPath} (exists but content is too short)`);
                hasErrors = true;
            }
        }
    }

    if (hasErrors) {
        console.error(`[readmes:check] FAILED: Missing or invalid required README files:`);
        missing.forEach(m => console.error(`  - ${m}`));
        process.exit(1);
    }

    console.log(`[readmes:check] OK: All ${REQUIRED_READMES.length} mandatory folder contracts (README.md) are present.`);
}

main();
