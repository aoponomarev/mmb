-- ================================================================================================
-- Migration 005: Add CHECK constraints for JSON columns (portfolios)
-- ================================================================================================
--
-- SQLite does not support ALTER TABLE ADD CONSTRAINT CHECK. Recreate table with CHECK.
-- Requires migration 003 (archived column) and 004 (description JSON envelope) to have run first.
--
-- Execute: wrangler d1 execute app-database --file=./migrations/005_portfolios_json_check_constraints.sql
--
-- Prerequisite: migrations 003 (archived) and 004 (description envelope) must be applied.
--

CREATE TABLE portfolios_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT CHECK (json_valid(description) = 1 OR description IS NULL),
  assets TEXT NOT NULL CHECK (json_valid(assets) = 1),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO portfolios_new SELECT * FROM portfolios;

DROP TABLE portfolios;

ALTER TABLE portfolios_new RENAME TO portfolios;

CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_created_at ON portfolios(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portfolios_user_archived_created_at ON portfolios(user_id, archived, created_at DESC);
