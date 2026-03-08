/**
 * #JS-vK2EcYrV
 * @description Tests validation of frontend UI configs against frontendUiConfigSchema.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { ROOT } from '../../contracts/path-contracts.js';
import { frontendUiConfigSchema } from '../../../core/contracts/ui-contracts.js';

const projectRoot = ROOT;

function loadConfig(relPath) {
    const fullPath = path.resolve(projectRoot, relPath);
    const code = fs.readFileSync(fullPath, 'utf8');
    
    // Create a mock browser environment
    const sandbox = {
        window: {},
        console: { log: () => {}, warn: () => {}, error: () => {} },
        document: {},
        navigator: {}
    };
    
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox);
    
    return sandbox.window;
}

test('Frontend UI Configs Validation (Zod SSOT)', () => {
    // Load IIFEs into mock window
    const tooltipsWindow = loadConfig('core/config/tooltips-config.js');
    const modalsWindow = loadConfig('core/config/modals-config.js');
    
    // Extract actual config dictionaries
    const tooltips = tooltipsWindow.tooltipsConfig.TOOLTIPS;
    const modals = modalsWindow.modalsConfig.MODALS_CONFIG;
    
    // Validate against Zod schema
    const result = frontendUiConfigSchema.safeParse({
        tooltips,
        modals
    });
    
    if (!result.success) {
        console.error(JSON.stringify(result.error.format(), null, 2));
    }
    
    assert.ok(result.success, 'UI Configs failed Zod validation');
});
