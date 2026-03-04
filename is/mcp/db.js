/**
 * #JS-YD283xUP
 * @description SQLite DB for MCP telemetry (events, fragility_stats); WAL journal mode; schema init.
 */
import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');
const DB_PATH = path.join(DATA_DIR, 'telemetry.sqlite');

// Ensure data dir exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize DB
const db = new Database(DB_PATH);
// @causality We use WAL journal mode because MCP servers run concurrently with VSCode/Cursor processes reading the DB, preventing database lock issues.
db.pragma('journal_mode = WAL');

// Define Schema
function initSchema() {
    db.exec(`
        -- 1. Events (Telemetry of MCP usages)
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            event_type TEXT NOT NULL,
            target_id TEXT,
            agent_id TEXT,
            context TEXT
        );

        -- 2. Fragility Stats (Preflight failures, etc.)
        CREATE TABLE IF NOT EXISTS fragility_stats (
            file_path TEXT PRIMARY KEY,
            failures_count INTEGER DEFAULT 0,
            last_failure_at DATETIME
        );

        -- 3. Raw Causalities (Harvester backlog)
        CREATE TABLE IF NOT EXISTS raw_causalities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_path TEXT NOT NULL,
            line_number INTEGER,
            comment_text TEXT NOT NULL,
            hash_proposal TEXT,
            status TEXT DEFAULT 'pending' -- 'pending', 'harvested', 'ignored'
        );

        -- 4. Dependency Graph Cache
        CREATE TABLE IF NOT EXISTS dependency_graph (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_hash TEXT NOT NULL,
            target_file TEXT NOT NULL,
            anchor_type TEXT NOT NULL,
            UNIQUE(source_hash, target_file)
        );

        -- 5. Confidence Audits (History of reviews)
        CREATE TABLE IF NOT EXISTS confidence_audits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            skill_id TEXT NOT NULL,
            old_confidence REAL,
            new_confidence REAL NOT NULL,
            audit_date DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
}

initSchema();

// console.log(`Database initialized successfully at ${DB_PATH}`); // Commented out to prevent breaking MCP JSON-RPC stdout

export { db };