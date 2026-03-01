(function() {
    'use strict';

    /**
     * ================================================================================================
     * WORKSPACE CONFIG - Централизованное хранилище настроек рабочей зоны
     * ================================================================================================
     * Skill: a/skills/app/skills/core-systems/workspace-config.md
     *
     * ЦЕЛЬ: Единый источник правды (ЕИП) для настроек рабочей зоны, включая основную таблицу.
     * Хранит одну структуру workspace и сохраняет её в cacheManager (EI) с fallback на localStorage.
     *
     * WORKSPACE CONFIG - Централизованное хранилище настроек рабочей зоны
     * {
     *   activeModelId: 'Median/AIR/260101',     // Текущая математическая модель
     *   activeCoinSetIds: [],          // ID монет активной выборки (пусто = дефолтный список)
     *   mainTable: {                   // Настройки основной таблицы
     *     selectedCoinIds: [],
     *     sortBy: null,
     *     sortOrder: null,             // 'asc' | 'desc' | null
     *     coinSortType: null,          // 'alphabet' | 'market_cap' | 'total_volume' | 'favorite' | 'selected'
     *     showPriceColumn: true
     *   }
     * }
     *
     * ПРИНЦИПЫ:
     * - ЕИП: все настройки workspace читаются/записываются только через workspaceConfig.
     * - EI: cacheManager с fallback на localStorage. Без версионирования (пользовательские данные).
     * - Мерж: частичные обновления не затирают остальные поля.
     */

    const CACHE_KEY = 'workspaceConfig';

    function resolveDefaultModelId() {
        if (window.modelsConfig && typeof window.modelsConfig.getDefaultModelId === 'function') {
            const modelId = window.modelsConfig.getDefaultModelId();
            if (modelId) {
                return modelId;
            }
        }
        return 'Median/AIR/260101';
    }

    function resolveDefaultParams() {
        if (window.modelsConfig && typeof window.modelsConfig.getDefaultParams === 'function') {
            const params = window.modelsConfig.getDefaultParams();
            if (params && typeof params === 'object') {
                const h = Number(params.horizonDays);
                const m = Number(params.mdnHours);
                return {
                    horizonDays: Number.isFinite(h) && h > 0 ? h : 2,
                    mdnHours: Number.isFinite(m) && m > 0 ? m : 4,
                    agrMethod: params.agrMethod || 'mp'
                };
            }
        }
        return { horizonDays: 2, mdnHours: 4, agrMethod: 'mp' };
    }

    const DEFAULT_MODEL_ID = resolveDefaultModelId();
    const DEFAULT_MODEL_PARAMS = resolveDefaultParams();

    const DEFAULT_WORKSPACE = Object.freeze({
        activeModelId: DEFAULT_MODEL_ID,
        activeCoinSetIds: [],
        mainTable: {
            selectedCoinIds: [],
            sortBy: null,
            sortOrder: null,
            coinSortType: null,
            showPriceColumn: true
        },
        metrics: {
            horizonDays: DEFAULT_MODEL_PARAMS.horizonDays, // Горизонт прогноза по умолчанию (дни)
            mdnHours: DEFAULT_MODEL_PARAMS.mdnHours,       // Горизонт MDN по умолчанию (часы)
            activeTabId: 'percent' // Активная вкладка отображения метрик
        }
    });

    function clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    function validateArray(value, fallback) {
        return Array.isArray(value) ? value : fallback;
    }

    function normalizeAgrMethod(value, fallback) {
        return ['dcs', 'tsi', 'mp'].includes(value) ? value : fallback;
    }

    function mergeWorkspace(base, partial) {
        const result = clone(base);

        if (!partial || typeof partial !== 'object') {
            return result;
        }

        if (partial.activeModelId !== undefined) {
            result.activeModelId = typeof partial.activeModelId === 'string' && partial.activeModelId.trim()
                ? partial.activeModelId.trim()
                : result.activeModelId;
        }

        if (partial.activeCoinSetIds !== undefined) {
            result.activeCoinSetIds = validateArray(partial.activeCoinSetIds, result.activeCoinSetIds);
        }

        if (partial.mainTable && typeof partial.mainTable === 'object') {
            result.mainTable = {
                ...result.mainTable,
                ...partial.mainTable
            };
            if (partial.mainTable.selectedCoinIds !== undefined) {
                result.mainTable.selectedCoinIds = validateArray(partial.mainTable.selectedCoinIds, result.mainTable.selectedCoinIds);
            }
        }

        if (partial.metrics && typeof partial.metrics === 'object') {
            result.metrics = {
                ...result.metrics,
                ...partial.metrics
            };
            if (partial.metrics.horizonDays !== undefined) {
                const h = Number(partial.metrics.horizonDays);
                result.metrics.horizonDays = Number.isFinite(h) && h > 0 ? h : result.metrics.horizonDays;
            }
            if (partial.metrics.mdnHours !== undefined) {
                const m = Number(partial.metrics.mdnHours);
                result.metrics.mdnHours = Number.isFinite(m) && m > 0 ? m : result.metrics.mdnHours;
            }
            if (partial.metrics.activeTabId !== undefined && typeof partial.metrics.activeTabId === 'string') {
                result.metrics.activeTabId = partial.metrics.activeTabId;
            }
            if (partial.metrics.agrMethod !== undefined) {
                result.metrics.agrMethod = normalizeAgrMethod(partial.metrics.agrMethod, result.metrics.agrMethod);
            }
        }

        return result;
    }

    async function saveWorkspace(partialWorkspace) {
        const existing = await loadWorkspace();
        const merged = mergeWorkspace(existing, partialWorkspace);

        try {
            await window.cacheManager.set(CACHE_KEY, merged, { useVersioning: false });
        } catch (error) {
            console.error('workspace-config: ошибка сохранения workspace', error);
            // Skill anchor: fallback в localStorage защищает активный набор монет от потери при сбое cacheManager/IndexedDB.
            try {
                localStorage.setItem(CACHE_KEY, JSON.stringify(merged));
                if (window.fallbackMonitor && typeof window.fallbackMonitor.notify === 'function') {
                    window.fallbackMonitor.notify({
                        source: 'workspaceConfig.save',
                        phase: 'localStorage-write-fallback',
                        details: 'workspace saved to localStorage'
                    });
                }
            } catch (storageError) {
                console.error('workspace-config: fallback сохранение в localStorage не удалось', storageError);
                if (window.fallbackMonitor && typeof window.fallbackMonitor.notify === 'function') {
                    window.fallbackMonitor.notify({
                        source: 'workspaceConfig.save',
                        phase: 'localStorage-write-failed',
                        details: storageError && storageError.message ? storageError.message : 'unknown error'
                    });
                }
            }
        }
    }

    async function loadWorkspace() {
        try {
            const stored = await window.cacheManager.get(CACHE_KEY, { useVersioning: false });
            if (stored && typeof stored === 'object') {
                const merged = mergeWorkspace(DEFAULT_WORKSPACE, stored);
                const modelId = merged.activeModelId;
                if (window.modelsConfig && typeof window.modelsConfig.getModel === 'function') {
                    const resolved = window.modelsConfig.getModel(modelId);
                    if (resolved && resolved.id) {
                        merged.activeModelId = resolved.id;
                    } else {
                        merged.activeModelId = DEFAULT_MODEL_ID;
                    }
                }
                return merged;
            }
        } catch (error) {
            console.error('workspace-config: ошибка загрузки workspace из cacheManager, пробую localStorage fallback', error);
            if (window.fallbackMonitor && typeof window.fallbackMonitor.notify === 'function') {
                window.fallbackMonitor.notify({
                    source: 'workspaceConfig.load',
                    phase: 'localStorage-read-fallback',
                    details: error && error.message ? error.message : 'cacheManager load error'
                });
            }
        }

        try {
            const saved = localStorage.getItem(CACHE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed === 'object') {
                    if (window.fallbackMonitor && typeof window.fallbackMonitor.notify === 'function') {
                        window.fallbackMonitor.notify({
                            source: 'workspaceConfig.load',
                            phase: 'localStorage-read-success',
                            details: 'workspace restored from localStorage'
                        });
                    }
                    const merged = mergeWorkspace(DEFAULT_WORKSPACE, parsed);
                    const modelId = merged.activeModelId;
                    if (window.modelsConfig && typeof window.modelsConfig.getModel === 'function') {
                        const resolved = window.modelsConfig.getModel(modelId);
                        if (resolved && resolved.id) {
                            merged.activeModelId = resolved.id;
                        } else {
                            merged.activeModelId = DEFAULT_MODEL_ID;
                        }
                    }
                    return merged;
                }
            }
        } catch (error) {
            console.error('workspace-config: ошибка fallback загрузки из localStorage, возвращаю значения по умолчанию', error);
        }

        return clone(DEFAULT_WORKSPACE);
    }

    function getDefaultWorkspace() {
        return clone(DEFAULT_WORKSPACE);
    }

    window.workspaceConfig = {
        loadWorkspace,
        saveWorkspace,
        getDefaultWorkspace
    };

})();
