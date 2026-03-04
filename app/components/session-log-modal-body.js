/**
 * ================================================================================================
 * SESSION LOG MODAL BODY COMPONENT - Session Log modal body
 * ================================================================================================
 *
 * PURPOSE: Display session logs in modal for debugging.
 *
 * @skill-anchor id:sk-add9a6 #for-classes-add-remove
 * @skill-anchor id:sk-eeb23d #for-bootstrap-event-proxying
 * @skill-anchor id:sk-cb75ec #for-utility-availability-check
 * Skill: id:sk-483943
 *
 * FEATURES:
 * - Auto-collect all console.log/warn/error/info
 * - Integration with logger.js
 * - Filter by level (log/warn/error/info)
 * - "Clear log" button (bottom left)
 * - "Copy to clipboard" button (bottom right)
 * - Auto-scroll to new messages
 *
 * COMPONENT API:
 *
 * Inject:
 * - modalApi — API for managing buttons (provided by cmp-modal)
 *
*/

window.sessionLogModalBody = {
    template: `
        <div class="container-fluid">
            <div class="mb-3">
                <div class="d-flex align-items-center justify-content-between mb-2">
                    <div class="form-check form-switch ms-auto">
                        <input type="checkbox" class="form-check-input" id="suppress-browser-console" v-model="suppressBrowserConsole" @change="handleSuppressToggle">
                        <label class="form-check-label small" for="suppress-browser-console">
                            Скрыть некритичные логи в браузерной консоли
                        </label>
                    </div>
                    <div class="btn-group btn-group-sm" role="group">
                        <input type="radio" class="btn-check" id="filter-all" value="all" v-model="logFilter" @change="updateFilter">
                        <label class="btn btn-outline-secondary" for="filter-all">Все</label>

                        <input type="radio" class="btn-check" id="filter-log" value="log" v-model="logFilter" @change="updateFilter">
                        <label class="btn btn-outline-secondary" for="filter-log">Log</label>

                        <input type="radio" class="btn-check" id="filter-warn" value="warn" v-model="logFilter" @change="updateFilter">
                        <label class="btn btn-outline-warning" for="filter-warn">Warn</label>

                        <input type="radio" class="btn-check" id="filter-error" value="error" v-model="logFilter" @change="updateFilter">
                        <label class="btn btn-outline-danger" for="filter-error">Error</label>

                        <input type="radio" class="btn-check" id="filter-info" value="info" v-model="logFilter" @change="updateFilter">
                        <label class="btn btn-outline-info" for="filter-info">Info</label>
                    </div>
                </div>
                <small class="text-muted">Всего: {{ sessionLogs.length }}, Показано: {{ filteredLogs.length }}</small>
            </div>

            <div
                ref="logContainer"
                class="p-2 bg-dark text-light"
                style="height: 400px; overflow-y: auto; font-family: 'Courier New', monospace; font-size: 0.85rem; line-height: 1.4; white-space: pre-wrap; word-wrap: break-word;">
                <div v-if="filteredLogs.length === 0" class="text-muted text-center py-4">
                    Нет логов for отображения
                </div>
                <div
                    v-for="(log, index) in filteredLogs"
                    :key="index"
                    :class="getLogClass(log.level)"
                    class="mb-1">
                    <span class="text-muted">[{{ formatTime(log.timestamp) }}]</span>
                    <span :class="getLevelClass(log.level)" class="ms-1">[{{ log.level.toUpperCase() }}]</span>
                    <span v-if="log.source" class="text-info ms-1">{{ log.source }}:</span>
                    <span class="ms-1">{{ log.message }}</span>
                </div>
            </div>
        </div>
    `,

    inject: ['modalApi'],

    data() {
        return {
            logFilter: 'all',
            sessionLogs: [],
            autoScroll: true,
            suppressBrowserConsole: false
        };
    },

    computed: {
        filteredLogs() {
            if (this.logFilter === 'all') {
                return this.sessionLogs;
            }
            return this.sessionLogs.filter(log => log.level === this.logFilter);
        }
    },

        mounted() {
        // Load logs from global store
        if (window.sessionLogStore) {
            this.sessionLogs = window.sessionLogStore.getLogs();

            // Subscribe to new logs
            if (window.eventBus) {
                this.logSubscription = window.eventBus.on('session-log', (logData) => {
                    this.sessionLogs.push(logData);
                    // Limit logs in component (for performance)
                    if (this.sessionLogs.length > 1000) {
                        this.sessionLogs.shift();
                    }
                    this.$nextTick(() => {
                        this.scrollToBottom();
                    });
                });
            } else {
            }
        } else {
        }

        // Load browser console suppress toggle state
        if (window.consoleInterceptor) {
            this.suppressBrowserConsole = window.consoleInterceptor.getSuppressBrowserConsole();
        }

        // Register buttons
        this.registerButtons();

        // Scroll to end on mount
        this.$nextTick(() => {
            this.scrollToBottom();
        });
    },

    beforeUnmount() {
        // Unsubscribe from events
        if (this.logSubscription && window.eventBus) {
            window.eventBus.off('session-log', this.logSubscription);
        }
    },

    methods: {
        registerButtons() {
            if (!this.modalApi) return;

            // "Clear log" button (bottom left)
            this.modalApi.registerButton('clear', {
                label: 'Очистить лог',
                variant: 'secondary',
                locations: ['footer'],
                disabled: false,
                classesAdd: { root: 'me-auto' },
                onClick: () => this.handleClear()
            });

            // "Copy to clipboard" button (bottom right)
            this.modalApi.registerButton('copy', {
                label: 'Копировать в буфер',
                variant: 'primary',
                locations: ['footer'],
                disabled: false,
                onClick: () => this.handleCopy()
            });
        },

        handleClear() {
            if (window.sessionLogStore) {
                window.sessionLogStore.clear();
            }
            this.sessionLogs = [];

            if (window.messagesStore) {
                window.messagesStore.addMessage({
                    type: 'success',
                    text: 'Лог очищен',
                    scope: 'global',
                    duration: 2000
                });
            }
        },

        async handleCopy() {
            try {
                const logText = this.filteredLogs.map(log => {
                    const time = this.formatTime(log.timestamp);
                    const source = log.source ? `${log.source}: ` : '';
                    return `[${time}] [${log.level.toUpperCase()}] ${source}${log.message}`;
                }).join('\n');

                // Fallback for older browsers
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(logText);
                } else {
                    // Fallback: create temp textarea
                    const textarea = document.createElement('textarea');
                    textarea.value = logText;
                    textarea.style.position = 'fixed';
                    textarea.style.opacity = '0';
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                }

                if (window.messagesStore) {
                    window.messagesStore.addMessage({
                        type: 'success',
                        text: `Скопировано ${this.filteredLogs.length} записей в буфер обмена`,
                        scope: 'global',
                        duration: 3000
                    });
                }
            } catch (error) {
                console.error('session-log-modal-body: copy to clipboard error:', error);
                if (window.messagesStore) {
                    window.messagesStore.addMessage({
                        type: 'danger',
                        text: 'Ошибка копирования в буфер обмена',
                        scope: 'global',
                        duration: 3000
                    });
                }
            }
        },

        updateFilter() {
            // Filter update happens automatically via computed
            this.$nextTick(() => {
                this.scrollToBottom();
            });
        },

        scrollToBottom() {
            if (this.$refs.logContainer && this.autoScroll) {
                this.$refs.logContainer.scrollTop = this.$refs.logContainer.scrollHeight;
            }
        },

        formatTime(timestamp) {
            const date = new Date(timestamp);
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
            return `${hours}:${minutes}:${seconds}.${milliseconds}`;
        },

        getLogClass(level) {
            const baseClass = 'log-entry';
            switch (level) {
                case 'error':
                    return `${baseClass} text-danger`;
                case 'warn':
                    return `${baseClass} text-warning`;
                case 'info':
                    return `${baseClass} text-info`;
                default:
                    return baseClass;
            }
        },

        getLevelClass(level) {
            switch (level) {
                case 'error':
                    return 'text-danger fw-bold';
                case 'warn':
                    return 'text-warning fw-bold';
                case 'info':
                    return 'text-info fw-bold';
                default:
                    return 'text-light';
            }
        },

        handleSuppressToggle() {
            if (window.consoleInterceptor) {
                window.consoleInterceptor.setSuppressBrowserConsole(this.suppressBrowserConsole);
                if (window.messagesStore) {
                    window.messagesStore.addMessage({
                        type: 'info',
                        text: this.suppressBrowserConsole
                            ? 'Логи скрыты в браузерной консоли (только в Session Log)'
                            : 'Логи отображаются в браузерной консоли и Session Log',
                        scope: 'global',
                        duration: 3000
                    });
                }
            }
        }
    }
};
