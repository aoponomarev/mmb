/**
 * #JS-V931HiRK
 * @description Migrates plan files from donor docs dir to target docs/plans (filter by plan filename pattern).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const donorDocsDir = 'D:/Clouds/AO/OneDrive/AI/PRO/mmb/docs';
const targetDocsDir = path.join(__dirname, '../docs/plans');

if (!fs.existsSync(targetDocsDir)) {
    fs.mkdirSync(targetDocsDir, { recursive: true });
}

const files = fs.readdirSync(donorDocsDir).filter(f => f.startsWith('План_') && f.endsWith('.md'));

for (const file of files) {
    // Skip already ported master plan and testing strategy
    if (file === 'План_MBB_to_MMB.md' || file === 'План_Testing_Strategy.md') continue;
    
    let content = fs.readFileSync(path.join(donorDocsDir, file), 'utf8');
    
    // Replace terms
    content = content.replace(/\bMBB\b/g, 'Legacy PF')
                     .replace(/\bMMB\b/g, 'PF');
                     
    // Reset checkboxes
    content = content.replace(/\[x\]/g, '[ ]').replace(/\[~\]/g, '[ ]');
    
    // Create new name: Plan_Frontend_UI.md -> plan-frontend-ui.md
    const newName = file.replace('План_', 'plan-').toLowerCase().replace(/_/g, '-');
    
    fs.writeFileSync(path.join(targetDocsDir, newName), content, 'utf8');
    console.log(`Ported ${file} -> ${newName}`);
}
