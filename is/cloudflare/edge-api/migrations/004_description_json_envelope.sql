-- ================================================================================================
-- Migration 004: Convert plain-text description to JSON envelope
-- ================================================================================================
--
-- Converts legacy plain-text description to minimal JSON envelope so CHECK constraints can apply.
-- Run BEFORE 005. Condition: only rows where description is NOT valid JSON.
--
-- Execute: wrangler d1 execute app-database --file=./migrations/004_description_json_envelope.sql
--

UPDATE portfolios
SET description = json_object('userDescription', description, '__appPortfolioMeta', 1)
WHERE description IS NOT NULL
  AND (json_valid(description) IS NULL OR json_valid(description) = 0);
