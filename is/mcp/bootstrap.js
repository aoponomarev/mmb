/**
 * #JS-fs25a5c3
 * @description Automatically detects environment mismatch (Node ABI version diff, missing modules) and auto-heals before starting the MCP server.
 */
import { execSync } from 'node:child_process';

async function bootstrap() {
    try {
        await import('./index.js');
    } catch (error) {
        if (error.code === 'ERR_DLOPEN_FAILED' && error.message.includes('NODE_MODULE_VERSION')) {
            console.error("[MCP Auto-Setup] Node environment changed (ABI mismatch). Auto-rebuilding native dependencies...");
            try {
                // Ignore stdout to avoid breaking JSON-RPC, pipe stderr to Cursor logs
                execSync('npm rebuild better-sqlite3', { stdio: ['ignore', 'ignore', 'inherit'] });
                console.error("[MCP Auto-Setup] Rebuild complete. Exiting to allow Cursor to restart the MCP server.");
                process.exit(1); 
            } catch (rebuildError) {
                console.error("[MCP Auto-Setup] Failed to rebuild:", rebuildError.message);
                process.exit(1);
            }
        } else if (error.code === 'ERR_MODULE_NOT_FOUND') {
            console.error(`[MCP Auto-Setup] Missing dependency (${error.message}). Running npm install...`);
            try {
                execSync('npm install', { stdio: ['ignore', 'ignore', 'inherit'] });
                console.error("[MCP Auto-Setup] Install complete. Exiting to allow Cursor to restart the MCP server.");
                process.exit(1);
            } catch (installError) {
                console.error("[MCP Auto-Setup] Failed to install:", installError.message);
                process.exit(1);
            }
        } else {
            console.error("[MCP Auto-Setup] Fatal error:", error);
            process.exit(1);
        }
    }
}

bootstrap();
