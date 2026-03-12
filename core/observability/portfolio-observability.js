/**
 * #JS-Vw45KZS7
 * @description Optional typed observability hooks for portfolio runtime: normalized event envelope, in-memory buffer, EventBus publication.
 * @causality #for-typed-observability-events
 */
(function() {
    'use strict';

    const EVENT_NAME = 'portfolio-observed';
    const MAX_EVENTS = 100;
    const ACTIONS = Object.freeze(['save', 'delete', 'import', 'sync', 'hydrate']);
    const STAGES = Object.freeze(['local', 'cloud']);
    const STATUSES = Object.freeze(['succeeded', 'failed', 'skipped']);
    const SYNC_STATES = Object.freeze(['local-only', 'synced', 'error', 'stale', 'conflict']);
    const SYNC_MODES = Object.freeze(['auto', 'explicit']);
    const COUNT_KEYS = Object.freeze(['total', 'imported', 'detached', 'hydrated', 'rebound', 'stale', 'shadowed', 'conflicted', 'refreshed', 'forked']);
    const events = [];

    /**
     * @typedef {'save' | 'delete' | 'import' | 'sync' | 'hydrate'} PortfolioObservabilityAction
     * @typedef {'local' | 'cloud'} PortfolioObservabilityStage
     * @typedef {'succeeded' | 'failed' | 'skipped'} PortfolioObservabilityStatus
     * @typedef {'local-only' | 'synced' | 'error' | 'stale'} PortfolioSyncState
     * @typedef {'auto' | 'explicit'} PortfolioCloudSyncMode
     * @typedef {{
     *   total?: number|null,
     *   imported?: number|null,
     *   detached?: number|null,
     *   hydrated?: number|null,
     *   rebound?: number|null,
     *   stale?: number|null,
     *   shadowed?: number|null,
     *   conflicted?: number|null,
     *   refreshed?: number|null,
     *   forked?: number|null
     * }} PortfolioObservabilityCounts
     * @typedef {{
     *   source: string,
     *   action: PortfolioObservabilityAction,
     *   stage: PortfolioObservabilityStage,
     *   status: PortfolioObservabilityStatus,
     *   timestamp: number,
     *   portfolioId: string|null,
     *   cloudflareId: string|null,
     *   syncState: PortfolioSyncState|null,
     *   cloudSyncMode: PortfolioCloudSyncMode|null,
     *   scope: string,
     *   mode: string|null,
     *   reason: string|null,
     *   details: string|null,
     *   counts: PortfolioObservabilityCounts|null
     * }} PortfolioObservabilityEvent
     */

    function normalizeEnum(value, allowedValues, fallback) {
        const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
        return allowedValues.includes(normalized) ? normalized : fallback;
    }

    function normalizeNullableString(value) {
        if (value === undefined || value === null) {
            return null;
        }
        const normalized = String(value).trim();
        return normalized || null;
    }

    function normalizeCount(value) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric < 0) {
            return null;
        }
        return Math.floor(numeric);
    }

    function normalizeCounts(counts) {
        if (!counts || typeof counts !== 'object') {
            return null;
        }
        const normalized = {};
        let hasValues = false;
        COUNT_KEYS.forEach(key => {
            const value = normalizeCount(counts[key]);
            if (value !== null) {
                normalized[key] = value;
                hasValues = true;
            }
        });
        return hasValues ? normalized : null;
    }

    /**
     * @param {Partial<PortfolioObservabilityEvent>} payload
     * @returns {PortfolioObservabilityEvent}
     */
    function normalizePayload(payload = {}) {
        return {
            source: normalizeNullableString(payload.source) || 'unknown',
            action: normalizeEnum(payload.action, ACTIONS, 'save'),
            stage: normalizeEnum(payload.stage, STAGES, 'local'),
            status: normalizeEnum(payload.status, STATUSES, 'succeeded'),
            timestamp: Number.isFinite(Number(payload.timestamp)) ? Number(payload.timestamp) : Date.now(),
            portfolioId: normalizeNullableString(payload.portfolioId),
            cloudflareId: normalizeNullableString(payload.cloudflareId),
            syncState: payload.syncState === undefined || payload.syncState === null
                ? null
                : normalizeEnum(payload.syncState, SYNC_STATES, null),
            cloudSyncMode: payload.cloudSyncMode === undefined || payload.cloudSyncMode === null
                ? null
                : normalizeEnum(payload.cloudSyncMode, SYNC_MODES, null),
            scope: normalizeNullableString(payload.scope)?.toLowerCase() || 'guest',
            mode: normalizeNullableString(payload.mode),
            reason: normalizeNullableString(payload.reason),
            details: normalizeNullableString(payload.details),
            counts: normalizeCounts(payload.counts)
        };
    }

    function pushEvent(event) {
        events.unshift(event);
        if (events.length > MAX_EVENTS) {
            events.length = MAX_EVENTS;
        }
    }

    /**
     * @param {Partial<PortfolioObservabilityEvent>} payload
     * @returns {PortfolioObservabilityEvent}
     */
    function notify(payload = {}) {
        const event = normalizePayload(payload);
        pushEvent(event);

        if (window.eventBus && typeof window.eventBus.emit === 'function') {
            window.eventBus.emit(EVENT_NAME, event);
        }

        return event;
    }

    function getRecent(limit = 20) {
        const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 20;
        return events.slice(0, safeLimit);
    }

    function clear() {
        events.length = 0;
    }

    window.portfolioObservability = {
        EVENT_NAME,
        SCHEMA: Object.freeze({
            action: [...ACTIONS],
            stage: [...STAGES],
            status: [...STATUSES],
            syncState: [...SYNC_STATES],
            cloudSyncMode: [...SYNC_MODES],
            countKeys: [...COUNT_KEYS]
        }),
        normalizePayload,
        notify,
        getRecent,
        clear
    };
})();
