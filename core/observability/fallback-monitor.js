(function() {
    'use strict';

    const events = [];
    const MAX_EVENTS = 50;

    function normalizePayload(payload) {
        const source = payload && payload.source ? String(payload.source) : 'unknown';
        const phase = payload && payload.phase ? String(payload.phase) : 'fallback';
        const details = payload && payload.details ? String(payload.details) : '';
        return {
            source,
            phase,
            details,
            timestamp: Date.now()
        };
    }

    function pushEvent(event) {
        events.unshift(event);
        if (events.length > MAX_EVENTS) {
            events.length = MAX_EVENTS;
        }
    }

    function notify(payload = {}) {
        const event = normalizePayload(payload);
        pushEvent(event);

        if (window.eventBus && typeof window.eventBus.emit === 'function') {
            window.eventBus.emit('fallback:used', event);
        }

        if (window.messagesStore && typeof window.messagesStore.addMessage === 'function') {
            window.messagesStore.addMessage({
                type: 'warning',
                scope: 'global',
                text: `Fallback: ${event.source} (${event.phase})`,
                details: event.details || null
            });
        }

        return event;
    }

    function getRecent(limit = 10) {
        const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 10;
        return events.slice(0, safeLimit);
    }

    function getCount() {
        return events.length;
    }

    function clear() {
        events.length = 0;
        if (window.eventBus && typeof window.eventBus.emit === 'function') {
            window.eventBus.emit('fallback:cleared', { timestamp: Date.now() });
        }
    }

    window.fallbackMonitor = {
        notify,
        getRecent,
        getCount,
        clear
    };
})();
