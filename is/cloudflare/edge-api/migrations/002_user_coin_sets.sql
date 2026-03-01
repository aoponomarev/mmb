-- ================================================================================================
-- Миграция 002: User Coin Sets
-- ================================================================================================
--
-- Создание таблицы для пользовательских наборов монет (user_coin_sets).
-- Эти наборы позволяют пользователям создавать и управлять коллекциями монет
-- для различных целей (спекулятивные портфели, долгосрочные инвестиции и т.д.).
--
-- ОТЛИЧИЕ ОТ PORTFOLIOS:
-- - portfolios: полноценные портфели с балансами, стоимостью активов, историей транзакций
-- - user_coin_sets: простые списки монет для отслеживания без финансовой информации
--
-- СТРУКТУРА:
-- - id: автоинкремент PK
-- - user_id: FK на users.id
-- - name: название набора (например, "Top DeFi", "My Watchlist")
-- - description: опциональное описание
-- - coin_ids: JSON массив ID монет из провайдера данных (например, ["bitcoin", "ethereum"])
-- - is_active: флаг "в обороте" (1) или "в архиве" (0)
-- - provider: имя провайдера данных ('coingecko', 'coinmarketcap' и т.д.)
-- - created_at, updated_at: временные метки
--
-- ИСПОЛЬЗОВАНИЕ:
-- wrangler d1 execute app-database --file=./migrations/002_user_coin_sets.sql
--

-- Таблица пользовательских наборов монет
CREATE TABLE IF NOT EXISTS user_coin_sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  coin_ids TEXT NOT NULL, -- JSON массив: ["bitcoin", "ethereum", "cardano"]
  is_active INTEGER NOT NULL DEFAULT 1, -- 1 = в обороте, 0 = в архиве
  provider TEXT NOT NULL DEFAULT 'coingecko', -- Провайдер данных
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_user_coin_sets_user_id ON user_coin_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_coin_sets_is_active ON user_coin_sets(is_active);
CREATE INDEX IF NOT EXISTS idx_user_coin_sets_provider ON user_coin_sets(provider);
CREATE INDEX IF NOT EXISTS idx_user_coin_sets_created_at ON user_coin_sets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_coin_sets_user_active ON user_coin_sets(user_id, is_active);
