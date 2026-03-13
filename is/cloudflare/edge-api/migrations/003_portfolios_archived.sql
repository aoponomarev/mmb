-- ================================================================================================
-- Миграция 003: Portfolios archived flag
-- ================================================================================================
--
-- Добавляет атрибут archived для скрытия портфеля из UI списков без удаления из БД.
--
-- ИСПОЛЬЗОВАНИЕ:
-- wrangler d1 execute app-database --file=./migrations/003_portfolios_archived.sql
--

ALTER TABLE portfolios ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_portfolios_user_archived_created_at
  ON portfolios(user_id, archived, created_at DESC);

