/**
 * ================================================================================================
 * DRAFT COIN SET - Утилита для работы с локальным набором "Draft"
 * ================================================================================================
 * Skill: core/skills/config-contracts
 *
 * ЦЕЛЬ: Управление локальным набором монет "Draft", который хранится только в localStorage
 * и позволяет перебрасывать наборы между аккаунтами пользователей на одном устройстве.
 *
 * ПРИНЦИПЫ:
 * - Хранится только в localStorage (не синхронизируется с D1)
 * - Доступен всем пользователям на устройстве
 * - Автоматически загружается при старте приложения
 * - Может быть обновлен из любого аккаунта
 *
 * ИСПОЛЬЗОВАНИЕ:
 * const draftSet = window.draftCoinSet.get();
 * window.draftCoinSet.save(coinIds, coinsData);
 * window.draftCoinSet.clear();
 *
 * ССЫЛКИ:
 * - Coin Sets: app/components/coin-set-load-modal-body.js
 */

(function() {
    'use strict';

    const STORAGE_KEY = 'draft-coin-set';

    /**
     * Извлечь тикеры из данных монет
     * @param {Array<Object>|null} coinsData - Полные данные монет
     * @param {Array<string>} coinIds - Массив ID монет (fallback)
     * @returns {string} Строка с тикерами через запятую (отсортированная по алфавиту)
     */
    function extractTickers(coinsData, coinIds = []) {
        if (coinsData && Array.isArray(coinsData) && coinsData.length > 0) {
            // Извлекаем тикеры из полных данных монет и сортируем по алфавиту
            return coinsData
                .map(coin => coin.symbol || coin.id)
                .filter(Boolean)
                .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
                .join(', ');
        }
        // Если полных данных нет, но есть coinIds - используем их как fallback (тоже сортируем)
        if (coinIds && coinIds.length > 0) {
            return coinIds
                .filter(Boolean)
                .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
                .join(', ');
        }
        // Если полных данных нет, возвращаем пустую строку
        return '';
    }

    /**
     * Получить набор "Draft" из localStorage
     * @returns {Object|null} Набор монет или null
     */
    function getDraftSet() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) {
                return null;
            }
            const parsed = JSON.parse(stored);
            const coinIds = parsed.coin_ids || [];
            const coinsData = parsed.coins || null;

            // Извлекаем тикеры: сначала из сохраненных, потом из полных данных монет, потом из coin_ids
            let tickers = parsed.tickers || '';
            if (!tickers || tickers.trim().length === 0) {
                tickers = extractTickers(coinsData, coinIds);
            } else {
                // Если тикеры есть, но они не отсортированы - пересортируем их по алфавиту
                const tickersArray = tickers
                    .split(',')
                    .map(t => t.trim())
                    .filter(t => t.length > 0);
                if (tickersArray.length > 0) {
                    tickers = tickersArray
                        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
                        .join(', ');
                }
            }

            const result = {
                id: 'draft',
                name: 'Draft (черновик)',
                description: 'Локальный набор (только на этом устройстве)',
                coin_ids: coinIds,
                coins: coinsData,
                tickers: tickers, // Строка с тикерами через запятую
                is_draft: true,
                is_local: true
            };

            return result;
        } catch (error) {
            console.error('draft-coin-set.getDraftSet error:', error);
            return null;
        }
    }

    /**
     * Сохранить набор "Draft" в localStorage
     * @param {Array<string>} coinIds - Массив ID монет
     * @param {Array<Object>|null} coinsData - Полные данные монет (опционально)
     */
    function saveDraftSet(coinIds, coinsData = null) {
        try {
            // Извлекаем тикеры из данных монет
            const tickers = extractTickers(coinsData, coinIds);

            const data = {
                coin_ids: coinIds || [],
                coins: coinsData || null,
                tickers: tickers, // Строка с тикерами через запятую
                updated_at: new Date().toISOString()
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            console.log('✅ Draft набор сохранен:', coinIds.length, 'монет', tickers ? `(${tickers})` : '');
        } catch (error) {
            console.error('draft-coin-set.saveDraftSet error:', error);
        }
    }

    /**
     * Инициализировать набор "Draft" (если еще не существует)
     * @param {Array<string>} defaultCoinIds - Массив ID монет по умолчанию (опционально, по умолчанию пустой массив)
     */
    function initializeDraftSet(defaultCoinIds = []) {
        const existing = getDraftSet();
        if (!existing || existing.coin_ids.length === 0) {
            saveDraftSet(defaultCoinIds || []);
            console.log('✅ Draft набор инициализирован:', defaultCoinIds.length || 0, 'монет');
        }
    }

    /**
     * Очистить набор "Draft"
     */
    function clearDraftSet() {
        try {
            localStorage.removeItem(STORAGE_KEY);
            console.log('✅ Draft набор очищен');
        } catch (error) {
            console.error('draft-coin-set.clearDraftSet error:', error);
        }
    }

    // Экспорт в глобальную область
    window.draftCoinSet = {
        get: getDraftSet,
        save: saveDraftSet,
        clear: clearDraftSet,
        initialize: initializeDraftSet
    };

    console.log('✅ draft-coin-set utility loaded');
})();
