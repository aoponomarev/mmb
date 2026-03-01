/**
 * ================================================================================================
 * D1 HELPERS - Утилиты для работы с D1 базой данных
 * ================================================================================================
 *
 * ЦЕЛЬ: Хелперы для работы с D1 (users, portfolios, rebalances).
 * Абстракция над SQL запросами для упрощения работы с базой данных.
 * Skill: core/skills/config-contracts
 *
 * ПРИНЦИПЫ:
 * - Все функции возвращают Promise
 * - Обработка ошибок SQL запросов
 * - Транзакции для атомарных операций
 * - Валидация данных перед сохранением
 *
 * ИСПОЛЬЗОВАНИЕ:
 * import { createUser, getUser, createPortfolio, getPortfolio } from './utils/d1-helpers.js';
 *
 * const user = await createUser(env.DB, { google_id: '...', email: '...' });
 * const portfolio = await createPortfolio(env.DB, user_id, portfolioData);
 */

/**
 * Создание пользователя в базе данных
 * @param {D1Database} db - D1 база данных
 * @param {Object} userData - Данные пользователя { google_id, email, name, picture }
 * @returns {Promise<Object|null>} Созданный пользователь или null при ошибке
 */
export async function createUser(db, userData) {
  try {
    const { google_id, email, name = null, picture = null } = userData;

    if (!google_id || !email) {
      throw new Error('google_id и email обязательны для создания пользователя');
    }

    const result = await db
      .prepare(
        `INSERT INTO users (google_id, email, name, picture, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(google_id, email, name, picture, new Date().toISOString(), new Date().toISOString())
      .run();

    if (!result.success) {
      throw new Error('Ошибка при создании пользователя');
    }

    return await getUserByGoogleId(db, google_id);
  } catch (error) {
    console.error('d1-helpers.createUser error:', error);
    return null;
  }
}

/**
 * Получение пользователя по ID
 * @param {D1Database} db - D1 база данных
 * @param {number} userId - ID пользователя
 * @returns {Promise<Object|null>} Пользователь или null
 */
export async function getUser(db, userId) {
  try {
    const result = await db
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(userId)
      .first();

    return result || null;
  } catch (error) {
    console.error('d1-helpers.getUser error:', error);
    return null;
  }
}

/**
 * Получение пользователя по Google ID
 * @param {D1Database} db - D1 база данных
 * @param {string} googleId - Google ID пользователя
 * @returns {Promise<Object|null>} Пользователь или null
 */
export async function getUserByGoogleId(db, googleId) {
  try {
    const result = await db
      .prepare('SELECT * FROM users WHERE google_id = ?')
      .bind(googleId)
      .first();

    return result || null;
  } catch (error) {
    console.error('d1-helpers.getUserByGoogleId error:', error);
    return null;
  }
}

/**
 * Обновление пользователя
 * @param {D1Database} db - D1 база данных
 * @param {number} userId - ID пользователя
 * @param {Object} updates - Обновляемые поля { email, name, picture }
 * @returns {Promise<Object|null>} Обновлённый пользователь или null
 */
export async function updateUser(db, userId, updates) {
  try {
    const fields = [];
    const values = [];

    if (updates.email !== undefined) {
      fields.push('email = ?');
      values.push(updates.email);
    }
    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.picture !== undefined) {
      fields.push('picture = ?');
      values.push(updates.picture);
    }

    if (fields.length === 0) {
      return await getUser(db, userId);
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(userId);

    const result = await db
      .prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    if (!result.success) {
      throw new Error('Ошибка при обновлении пользователя');
    }

    return await getUser(db, userId);
  } catch (error) {
    console.error('d1-helpers.updateUser error:', error);
    return null;
  }
}

/**
 * Создание портфеля
 * @param {D1Database} db - D1 база данных
 * @param {number} userId - ID пользователя
 * @param {Object} portfolioData - Данные портфеля { name, description, assets }
 * @returns {Promise<Object|null>} Созданный портфель или null
 */
export async function createPortfolio(db, userId, portfolioData) {
  try {
    const { name, description = null, assets = [] } = portfolioData;

    if (!name) {
      throw new Error('Название портфеля обязательно');
    }

    const result = await db
      .prepare(
        `INSERT INTO portfolios (user_id, name, description, assets, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        userId,
        name,
        description,
        JSON.stringify(assets),
        new Date().toISOString(),
        new Date().toISOString()
      )
      .run();

    if (!result.success) {
      throw new Error('Ошибка при создании портфеля');
    }

    return await getPortfolio(db, result.meta.last_row_id);
  } catch (error) {
    console.error('d1-helpers.createPortfolio error:', error);
    return null;
  }
}

/**
 * Получение портфеля по ID
 * @param {D1Database} db - D1 база данных
 * @param {number} portfolioId - ID портфеля
 * @returns {Promise<Object|null>} Портфель или null
 */
export async function getPortfolio(db, portfolioId) {
  try {
    const result = await db
      .prepare('SELECT * FROM portfolios WHERE id = ?')
      .bind(portfolioId)
      .first();

    if (!result) {
      return null;
    }

    // Парсинг JSON полей
    if (result.assets) {
      result.assets = JSON.parse(result.assets);
    }

    return result;
  } catch (error) {
    console.error('d1-helpers.getPortfolio error:', error);
    return null;
  }
}

/**
 * Получение списка портфелей пользователя
 * @param {D1Database} db - D1 база данных
 * @param {number} userId - ID пользователя
 * @returns {Promise<Array>} Массив портфелей
 */
export async function getUserPortfolios(db, userId) {
  try {
    const result = await db
      .prepare('SELECT * FROM portfolios WHERE user_id = ? ORDER BY created_at DESC')
      .bind(userId)
      .all();

    if (!result.results) {
      return [];
    }

    // Парсинг JSON полей для каждого портфеля
    return result.results.map(portfolio => {
      if (portfolio.assets) {
        portfolio.assets = JSON.parse(portfolio.assets);
      }
      return portfolio;
    });
  } catch (error) {
    console.error('d1-helpers.getUserPortfolios error:', error);
    return [];
  }
}

/**
 * Обновление портфеля
 * @param {D1Database} db - D1 база данных
 * @param {number} portfolioId - ID портфеля
 * @param {number} userId - ID пользователя (для проверки прав доступа)
 * @param {Object} updates - Обновляемые поля { name, description, assets }
 * @returns {Promise<Object|null>} Обновлённый портфель или null
 */
export async function updatePortfolio(db, portfolioId, userId, updates) {
  try {
    // Проверка прав доступа
    const portfolio = await getPortfolio(db, portfolioId);
    if (!portfolio || portfolio.user_id !== userId) {
      throw new Error('Портфель не найден или нет прав доступа');
    }

    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.assets !== undefined) {
      fields.push('assets = ?');
      values.push(JSON.stringify(updates.assets));
    }

    if (fields.length === 0) {
      return portfolio;
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(portfolioId);

    const result = await db
      .prepare(`UPDATE portfolios SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    if (!result.success) {
      throw new Error('Ошибка при обновлении портфеля');
    }

    return await getPortfolio(db, portfolioId);
  } catch (error) {
    console.error('d1-helpers.updatePortfolio error:', error);
    return null;
  }
}

/**
 * Удаление портфеля
 * @param {D1Database} db - D1 база данных
 * @param {number} portfolioId - ID портфеля
 * @param {number} userId - ID пользователя (для проверки прав доступа)
 * @returns {Promise<boolean>} Успех операции
 */
export async function deletePortfolio(db, portfolioId, userId) {
  try {
    // Проверка прав доступа
    const portfolio = await getPortfolio(db, portfolioId);
    if (!portfolio || portfolio.user_id !== userId) {
      throw new Error('Портфель не найден или нет прав доступа');
    }

    const result = await db
      .prepare('DELETE FROM portfolios WHERE id = ?')
      .bind(portfolioId)
      .run();

    return result.success;
  } catch (error) {
    console.error('d1-helpers.deletePortfolio error:', error);
    return false;
  }
}

// ================================================================================================
// USER COIN SETS - Хелперы для работы с пользовательскими наборами монет
// ================================================================================================

/**
 * Создание набора монет
 * @param {D1Database} db - D1 база данных
 * @param {number} userId - ID пользователя
 * @param {Object} coinSetData - Данные набора { name, description, coin_ids, is_active, provider }
 * @returns {Promise<Object|null>} Созданный набор или null
 */
export async function createCoinSet(db, userId, coinSetData) {
  try {
    const {
      name,
      description = null,
      coin_ids = [],
      is_active = 1,
      provider = 'coingecko'
    } = coinSetData;

    if (!name) {
      throw new Error('Название набора обязательно');
    }

    if (!Array.isArray(coin_ids)) {
      throw new Error('coin_ids должен быть массивом');
    }

    const result = await db
      .prepare(
        `INSERT INTO user_coin_sets (user_id, name, description, coin_ids, is_active, provider, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        userId,
        name,
        description,
        JSON.stringify(coin_ids),
        is_active,
        provider,
        new Date().toISOString(),
        new Date().toISOString()
      )
      .run();

    if (!result.success) {
      throw new Error('Ошибка при создании набора монет');
    }

    return await getCoinSet(db, result.meta.last_row_id);
  } catch (error) {
    console.error('d1-helpers.createCoinSet error:', error);
    return null;
  }
}

/**
 * Получение набора монет по ID
 * @param {D1Database} db - D1 база данных
 * @param {number} coinSetId - ID набора монет
 * @returns {Promise<Object|null>} Набор монет или null
 */
export async function getCoinSet(db, coinSetId) {
  try {
    const result = await db
      .prepare('SELECT * FROM user_coin_sets WHERE id = ?')
      .bind(coinSetId)
      .first();

    if (!result) {
      return null;
    }

    // Парсинг JSON полей
    if (result.coin_ids) {
      result.coin_ids = JSON.parse(result.coin_ids);
    }

    return result;
  } catch (error) {
    console.error('d1-helpers.getCoinSet error:', error);
    return null;
  }
}

/**
 * Получение списка наборов монет пользователя
 * @param {D1Database} db - D1 база данных
 * @param {number} userId - ID пользователя
 * @param {boolean} activeOnly - Получить только активные наборы (по умолчанию все)
 * @returns {Promise<Array>} Массив наборов монет
 */
export async function getUserCoinSets(db, userId, activeOnly = false) {
  try {
    let query = 'SELECT * FROM user_coin_sets WHERE user_id = ?';
    const bindings = [userId];

    if (activeOnly) {
      query += ' AND is_active = 1';
    }

    query += ' ORDER BY created_at DESC';

    const result = await db
      .prepare(query)
      .bind(...bindings)
      .all();

    if (!result.results) {
      return [];
    }

    // Парсинг JSON полей для каждого набора
    return result.results.map(coinSet => {
      if (coinSet.coin_ids) {
        coinSet.coin_ids = JSON.parse(coinSet.coin_ids);
      }
      return coinSet;
    });
  } catch (error) {
    console.error('d1-helpers.getUserCoinSets error:', error);
    return [];
  }
}

/**
 * Обновление набора монет
 * @param {D1Database} db - D1 база данных
 * @param {number} coinSetId - ID набора монет
 * @param {number} userId - ID пользователя (для проверки прав доступа)
 * @param {Object} updates - Обновляемые поля { name, description, coin_ids, is_active, provider }
 * @returns {Promise<Object|null>} Обновлённый набор или null
 */
export async function updateCoinSet(db, coinSetId, userId, updates) {
  try {
    // Проверка прав доступа
    const coinSet = await getCoinSet(db, coinSetId);
    if (!coinSet || coinSet.user_id !== userId) {
      throw new Error('Набор монет не найден или нет прав доступа');
    }

    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.coin_ids !== undefined) {
      if (!Array.isArray(updates.coin_ids)) {
        throw new Error('coin_ids должен быть массивом');
      }
      fields.push('coin_ids = ?');
      values.push(JSON.stringify(updates.coin_ids));
    }
    if (updates.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(updates.is_active ? 1 : 0);
    }
    if (updates.provider !== undefined) {
      fields.push('provider = ?');
      values.push(updates.provider);
    }

    if (fields.length === 0) {
      return coinSet;
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(coinSetId);

    const result = await db
      .prepare(`UPDATE user_coin_sets SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    if (!result.success) {
      throw new Error('Ошибка при обновлении набора монет');
    }

    return await getCoinSet(db, coinSetId);
  } catch (error) {
    console.error('d1-helpers.updateCoinSet error:', error);
    return null;
  }
}

/**
 * Удаление набора монет
 * @param {D1Database} db - D1 база данных
 * @param {number} coinSetId - ID набора монет
 * @param {number} userId - ID пользователя (для проверки прав доступа)
 * @returns {Promise<boolean>} Успех операции
 */
export async function deleteCoinSet(db, coinSetId, userId) {
  try {
    // Проверка прав доступа
    const coinSet = await getCoinSet(db, coinSetId);
    if (!coinSet || coinSet.user_id !== userId) {
      throw new Error('Набор монет не найден или нет прав доступа');
    }

    const result = await db
      .prepare('DELETE FROM user_coin_sets WHERE id = ?')
      .bind(coinSetId)
      .run();

    return result.success;
  } catch (error) {
    console.error('d1-helpers.deleteCoinSet error:', error);
    return false;
  }
}

/**
 * Архивирование/разархивирование набора монет
 * @param {D1Database} db - D1 база данных
 * @param {number} coinSetId - ID набора монет
 * @param {number} userId - ID пользователя (для проверки прав доступа)
 * @param {boolean} isActive - true = разархивировать, false = архивировать
 * @returns {Promise<Object|null>} Обновлённый набор или null
 */
export async function toggleCoinSetActive(db, coinSetId, userId, isActive) {
  return await updateCoinSet(db, coinSetId, userId, { is_active: isActive });
}
