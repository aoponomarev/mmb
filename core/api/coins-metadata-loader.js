/**
 * ================================================================================================
 * COINS METADATA LOADER
 * ================================================================================================
 * Skill: core/skills/api-layer
 *
 * ЦЕЛЬ: Загружать централизованные метаданные монет (стейблкоины, обертки, LST)
 * из внешнего JSON-файла на GitHub CDN.
 *
 * ФАЙЛ: libs/assets/data/coins.json
 *
 * АРХИТЕКТУРА:
 * - Подгружает данные при старте или по требованию
 * - Кэширует через cacheManager (TTL: 24ч)
 * - Наполняет window.coinsConfig (ЕИП)
 */

(function() {
    'use strict';

    const CONFIG = {
        baseUrl: 'https://aoponomarev.github.io/libs/assets/data/',
        filename: 'coins.json',
        cacheKey: 'coins-metadata',
        defaultTtl: 24 * 60 * 60 * 1000 // 24 часа
    };

    /**
     * Построить URL для загрузки (с учетом кэш-бастинга через версию приложения)
     */
    function buildUrl() {
        const salt = window.appConfig ? window.appConfig.getVersionHash() : Date.now();
        return `${CONFIG.baseUrl}${CONFIG.filename}?v=${salt}`;
    }

    /**
     * Загрузить метаданные
     */
    async function load({ forceRefresh = false, ttl = CONFIG.defaultTtl } = {}) {
        if (!window.cacheManager || !window.coinsConfig) {
            console.warn('coinsMetadataLoader: cacheManager или coinsConfig не загружены');
            return null;
        }

        // 1. Попытка загрузки из кэша
        if (!forceRefresh) {
            const cached = await window.cacheManager.get(CONFIG.cacheKey, { useVersioning: true });
            if (cached && cached.data && cached.expiresAt && cached.expiresAt > Date.now()) {
                applyMetadata(cached.data);
                console.log('coinsMetadataLoader: метаданные загружены из кэша');
                return cached.data;
            }
        }

        // 2. Загрузка из сети
        try {
            const url = buildUrl();
            const response = await fetch(url);

            if (!response.ok) {
                // Если файл не найден (404), это не ошибка, а допустимое состояние (используем эвристику)
                if (response.status === 404) {
                    console.info(`coinsMetadataLoader: файл ${CONFIG.filename} не найден на сервере. Используется встроенная эвристика.`);
                    return null;
                }
                throw new Error(`HTTP ${response.status} при загрузке ${url}`);
            }

            const data = await response.json();

            // Сохраняем в кэш
            const payload = {
                data: data,
                expiresAt: Date.now() + ttl,
                updatedAt: Date.now()
            };
            await window.cacheManager.set(CONFIG.cacheKey, payload, { useVersioning: true, ttl });

            // Применяем данные
            applyMetadata(data);
            console.log('coinsMetadataLoader: метаданные успешно загружены из сети');

            return data;
        } catch (error) {
            console.error('coinsMetadataLoader: ошибка загрузки метаданных:', error);

            // Fallback на старый кэш если есть
            const cached = await window.cacheManager.get(CONFIG.cacheKey, { useVersioning: true });
            if (cached && cached.data) {
                applyMetadata(cached.data);
                console.warn('coinsMetadataLoader: использованы устаревшие метаданные из кэша');
                return cached.data;
            }

            return null;
        }
    }

    /**
     * Передать данные в coinsConfig
     */
    function applyMetadata(data) {
        if (!data || !window.coinsConfig) return;

        // data structure: { stable: [...], wrapped: [...], lst: [...] }
        if (data.stable) {
            // Форматируем для setStablecoins (он ожидает объекты с id)
            const stableList = data.stable.map(id => ({ id: id, symbol: '', name: '' }));
            window.coinsConfig.setStablecoins(stableList);
        }

        if (data.wrapped) {
            window.coinsConfig.setWrappedCoins(data.wrapped);
        }

        if (data.lst) {
            window.coinsConfig.setLstCoins(data.lst);
        }
    }

    window.coinsMetadataLoader = {
        load
    };

    console.log('coins-metadata-loader.js: инициализирован');
})();
