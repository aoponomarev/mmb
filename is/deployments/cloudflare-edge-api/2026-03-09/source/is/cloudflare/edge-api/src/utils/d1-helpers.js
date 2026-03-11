/**
 * #JS-GHghtGEV
 * @description D1 helpers: users, portfolios, rebalances; Promise-based; transactions, validation.
 * @skill id:sk-02d3ea
 *
 * PRINCIPLES:
 * - All functions return Promise; SQL error handling; transactions for atomic ops; validate before save
 *
 * USAGE: createUser(env.DB, { google_id, email }); createPortfolio(env.DB, user_id, data); getPortfolio(env.DB, id);
 */

/**
 * Create user in database
 * @param {D1Database} db - D1 database
 * @param {Object} userData - User data { google_id, email, name, picture }
 * @returns {Promise<Object|null>} Created user or null on error
 */
export async function createUser(db, userData) {
  try {
    const { google_id, email, name = null, picture = null } = userData;

    if (!google_id || !email) {
      throw new Error('google_id и email обязательны for создания пользователя');
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
 * Get user by ID
 * @param {D1Database} db - D1 database
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} User or null
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
 * Get user by Google ID
 * @param {D1Database} db - D1 database
 * @param {string} googleId - User Google ID
 * @returns {Promise<Object|null>} User or null
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
 * Update user
 * @param {D1Database} db - D1 database
 * @param {number} userId - User ID
 * @param {Object} updates - Fields to update { email, name, picture }
 * @returns {Promise<Object|null>} Updated user or null
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
 * Create portfolio
 * @param {D1Database} db - D1 database
 * @param {number} userId - User ID
 * @param {Object} portfolioData - Portfolio data { name, description, assets }
 * @returns {Promise<Object|null>} Created portfolio or null
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
 * Get portfolio by ID
 * @param {D1Database} db - D1 database
 * @param {number} portfolioId - Portfolio ID
 * @returns {Promise<Object|null>} Portfolio or null
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

    // Parse JSON fields
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
 * Get user's list of portfolios
 * @param {D1Database} db - D1 database
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Portfolios array
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

    // Parse JSON fields for each portfolio
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
 * Update portfolio
 * @param {D1Database} db - D1 database
 * @param {number} portfolioId - Portfolio ID
 * @param {number} userId - User ID (for access check)
 * @param {Object} updates - Fields to update { name, description, assets }
 * @returns {Promise<Object|null>} Updated portfolio or null
 */
export async function updatePortfolio(db, portfolioId, userId, updates) {
  try {
    // Access check
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
 * Delete portfolio
 * @param {D1Database} db - D1 database
 * @param {number} portfolioId - Portfolio ID
 * @param {number} userId - User ID (for access check)
 * @returns {Promise<boolean>} Success
 */
export async function deletePortfolio(db, portfolioId, userId) {
  try {
    // Access check
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
// USER COIN SETS - Helpers for user coin sets
// ================================================================================================

/**
 * Create coin set
 * @param {D1Database} db - D1 database
 * @param {number} userId - User ID
 * @param {Object} coinSetData - Coin set data { name, description, coin_ids, is_active, provider }
 * @returns {Promise<Object|null>} Created set or null
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
 * Get coin set by ID
 * @param {D1Database} db - D1 database
 * @param {number} coinSetId - Coin set ID
 * @returns {Promise<Object|null>} Coin set or null
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

    // Parse JSON fields
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
 * Get user's list of coin sets
 * @param {D1Database} db - D1 database
 * @param {number} userId - User ID
 * @param {boolean} activeOnly - Get only active sets (default all)
 * @returns {Promise<Array>} Coin sets array
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

    // Parse JSON fields for each set
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
 * Update coin set
 * @param {D1Database} db - D1 database
 * @param {number} coinSetId - Coin set ID
 * @param {number} userId - User ID (for access check)
 * @param {Object} updates - Fields to update { name, description, coin_ids, is_active, provider }
 * @returns {Promise<Object|null>} Updated set or null
 */
export async function updateCoinSet(db, coinSetId, userId, updates) {
  try {
    // Access check
    const coinSet = await getCoinSet(db, coinSetId);
    if (!coinSet || coinSet.user_id !== userId) {
      throw new Error('Coin set not found or access denied');
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
 * Delete coin set
 * @param {D1Database} db - D1 database
 * @param {number} coinSetId - Coin set ID
 * @param {number} userId - User ID (for access check)
 * @returns {Promise<boolean>} Success
 */
export async function deleteCoinSet(db, coinSetId, userId) {
  try {
    // Access check
    const coinSet = await getCoinSet(db, coinSetId);
    if (!coinSet || coinSet.user_id !== userId) {
      throw new Error('Coin set not found or access denied');
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
 * Archive/unarchive coin set
 * @param {D1Database} db - D1 database
 * @param {number} coinSetId - Coin set ID
 * @param {number} userId - User ID (for access check)
 * @param {boolean} isActive - true = unarchive, false = archive
 * @returns {Promise<Object|null>} Updated set or null
 */
export async function toggleCoinSetActive(db, coinSetId, userId, isActive) {
  return await updateCoinSet(db, coinSetId, userId, { is_active: isActive });
}
