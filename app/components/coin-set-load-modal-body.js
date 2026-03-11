/**
 * #JS-W23K9iSC
 * @description Load saved coin sets (Cloudflare D1 via coin-sets-client); multi-select, merge, delete; Draft from localStorage; Load/Delete via modalApi.
 * @skill-anchor id:sk-add9a6 #for-classes-add-remove
 * @skill-anchor id:sk-eeb23d #for-bootstrap-event-proxying
 * @skill-anchor id:sk-cb75ec #for-utility-availability-check
 *
 * Props: onLoad, onDelete, onCancel. Inject: modalApi.
 */

window.coinSetLoadModalBody = {
    template: `
        <div>
            <div v-if="loading" class="text-center py-4">
                <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                Загрузка sets монет...
            </div>
            <div v-else-if="error" class="alert alert-danger">
                {{ error }}
            </div>
            <div v-else>
                <!-- Top section: Default set and Draft (with border) -->
                <div class="list-group mb-3">
                    <!-- Default set (first, non-deletable) -->
                    <div class="list-group-item d-flex align-items-start">
                        <div class="form-check">
                            <input
                                class="form-check-input"
                                type="checkbox"
                                id="coin-set-default"
                                value="default"
                                v-model="selectedSetIds"
                                @change="updateButtonsState">
                        </div>
                        <div class="flex-grow-1">
                            <div class="fw-semibold d-flex align-items-center">
                                <span class="material-symbols-sharp me-2" style="font-size: 1rem; opacity: 0.7;">trending_up</span>
                                Актуальные рейтинги рынка
                            </div>
                            <div class="mt-2 d-flex align-items-center gap-3">
                                <div class="d-flex align-items-center">
                                    <label for="default-count" class="form-label me-2 mb-0 small">Монет:</label>
                                    <input
                                        type="number"
                                        class="form-control form-control-sm"
                                        id="default-count"
                                        v-model.number="defaultCount"
                                        min="1"
                                        max="250"
                                        style="width: 70px;"
                                        @change="updateDefaultSet"
                                        @input="handleCountInput">
                                </div>
                                <div class="d-flex align-items-center flex-grow-1">
                                    <select
                                        class="form-select form-select-sm"
                                        id="default-sort"
                                        v-model="defaultSortBy"
                                        style="width: 100%;"
                                        @change="updateDefaultSet">
                                        <option value="market_cap">По капитализации</option>
                                        <option value="volume">По дневному объему</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <span class="badge bg-secondary rounded-pill ms-2 opacity-75">~{{ defaultCount }}</span>
                    </div>
                    <!-- Local "Draft" set (localStorage only) -->
                    <div class="list-group-item">
                        <div class="d-flex align-items-start">
                            <div class="form-check">
                                <input
                                    class="form-check-input"
                                    type="checkbox"
                                    id="coin-set-draft"
                                    value="draft"
                                    v-model="selectedSetIds"
                                    :disabled="!draftSet || !draftSet.coin_ids || draftSet.coin_ids.length === 0"
                                    @change="updateButtonsState">
                            </div>
                        <div class="flex-grow-1">
                            <div class="fw-semibold d-flex align-items-center mb-2">
                                <span class="material-symbols-sharp me-2" style="font-size: 1rem; opacity: 0.7;">edit</span>
                                Draft (черновик)
                                <!-- Coin count indicator (blue pill badge with white digits) -->
                                <span v-if="draftSet?.coin_ids?.length > 0" class="badge bg-primary text-white rounded-pill ms-auto opacity-75">
                                    {{ draftSet.coin_ids.length }}
                                </span>
                            </div>
                                <div class="d-flex align-items-center gap-2">
                                    <input
                                        type="text"
                                        class="form-control form-control-sm"
                                        id="draft-tickers-input"
                                        v-model="draftTickersInput"
                                        placeholder="Введите тикеры через запятую (например: btc, eth, bnb)"
                                        @input="handleDraftTickersInput"
                                        @keyup.enter="loadDraftFromTickers">
                                    <button
                                        type="button"
                                        class="btn btn-sm"
                                        :class="canSaveDraft ? 'btn-primary' : 'btn-secondary'"
                                        :disabled="!canSaveDraft || draftLoading"
                                        @click="loadDraftFromTickers"
                                        :title="saveDraftTitle">
                                        <i v-if="!draftLoading" :class="canSaveDraft ? 'fa-solid fa-clipboard-check' : 'fa-regular fa-clipboard'"></i>
                                        <span v-else class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                    </button>
                                </div>
                                <small class="text-muted d-block mt-1" v-if="!draftSet || !draftSet.coin_ids || draftSet.coin_ids.length === 0">
                                    Нет сохраненных монет
                                </small>
                            </div>
                        </div>
                    </div>
                    <!-- Local "Ban" set (exclusion list) -->
                    <div class="list-group-item">
                        <div class="d-flex align-items-start">
                            <div class="form-check">
                                <input
                                    class="form-check-input"
                                    type="checkbox"
                                    disabled
                                    title="Служебный список: for managing тикерами, не for загрузки"
                                    id="coin-set-ban-disabled">
                            </div>
                            <div class="flex-grow-1">
                                <div class="fw-semibold d-flex align-items-center mb-2">
                                    <span class="material-symbols-sharp me-2" style="font-size: 1rem; opacity: 0.7;">block</span>
                                    Ban (служебный список)
                                    <span v-if="banSet?.coin_ids?.length > 0" class="badge bg-danger text-white rounded-pill ms-auto opacity-75">
                                        {{ banSet.coin_ids.length }}
                                    </span>
                                </div>
                                <div class="d-flex align-items-center gap-2">
                                    <input
                                        type="text"
                                        class="form-control form-control-sm"
                                        id="ban-tickers-input"
                                        v-model="banTickersInput"
                                        placeholder="Тикеры через запятую (пример: luna, ftt)"
                                        @input="handleBanTickersInput"
                                        @keyup.enter="loadBanFromTickers">
                                    <button
                                        type="button"
                                        class="btn btn-sm"
                                        :class="banTickersInput && banTickersInput.trim().length > 0 ? 'btn-danger' : 'btn-secondary'"
                                        :disabled="!banTickersInput || banTickersInput.trim().length === 0 || banLoading"
                                        @click="loadBanFromTickers"
                                        title="Сохранить Ban список">
                                        <i v-if="!banLoading" class="fa-solid fa-ban"></i>
                                        <span v-else class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                    </button>
                                </div>
                                <small class="text-muted d-block mt-1" v-if="!banSet || !banSet.coin_ids || banSet.coin_ids.length === 0">
                                    Список Ban пуст
                                </small>
                            </div>
                        </div>
                    </div>
                    <!-- Auto-sets (Stablecoins, Wrapped, LST) -->
                    <div v-if="autoStablecoins && autoStablecoins.coins && autoStablecoins.coins.length > 0" class="list-group-item d-flex align-items-start">
                        <div class="form-check">
                            <input
                                class="form-check-input"
                                type="checkbox"
                                :id="'auto-set-' + autoStablecoins.id"
                                :value="autoStablecoins.id"
                                v-model="selectedSetIds"
                                @change="updateButtonsState">
                        </div>
                        <div class="flex-grow-1">
                            <div class="fw-semibold d-flex align-items-center gap-2">
                                <span aria-hidden="true">{{ stablecoinIcon }}</span>
                                Stablecoins
                            </div>
                        </div>
                        <span class="badge bg-primary rounded-pill ms-2 opacity-75">{{ autoStablecoins.coins.length }}</span>
                    </div>
                    <div class="list-group-item" v-if="(autoWrapped && autoWrapped.coins && autoWrapped.coins.length > 0) || (autoLst && autoLst.coins && autoLst.coins.length > 0)">
                        <div class="row g-2">
                            <div class="col-12 col-sm-6" v-if="autoWrapped && autoWrapped.coins && autoWrapped.coins.length > 0">
                                <div class="d-flex align-items-start">
                                    <div class="form-check">
                                        <input
                                            class="form-check-input"
                                            type="checkbox"
                                            :id="'auto-set-' + autoWrapped.id"
                                            :value="autoWrapped.id"
                                            v-model="selectedSetIds"
                                            @change="updateButtonsState">
                                    </div>
                                    <div class="d-flex align-items-center gap-2">
                                        <span aria-hidden="true">{{ wrappedIcon }}</span>
                                        Wrapped
                                    </div>
                                    <span class="badge bg-primary rounded-pill ms-2 opacity-75">{{ autoWrapped.coins.length }}</span>
                                </div>
                            </div>
                            <div class="col-12 col-sm-6 ms-auto" v-if="autoLst && autoLst.coins && autoLst.coins.length > 0">
                                <div class="d-flex align-items-start justify-content-end">
                                    <div class="form-check">
                                        <input
                                            class="form-check-input"
                                            type="checkbox"
                                            :id="'auto-set-' + autoLst.id"
                                            :value="autoLst.id"
                                            v-model="selectedSetIds"
                                            @change="updateButtonsState">
                                    </div>
                                    <div class="d-flex align-items-center gap-2 text-nowrap">
                                        <span aria-hidden="true">{{ lstIcon }}</span>
                                        LST (Liquid Staking)
                                    </div>
                                    <span class="badge bg-primary rounded-pill ms-2 opacity-75">{{ autoLst.coins.length }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- Bottom section: Saved sets -->
                <div class="list-group list-group-flush">
                    <div
                        v-for="coinSet in coinSets"
                        :key="coinSet.id"
                        class="list-group-item d-flex align-items-start">
                        <div class="form-check">
                            <input
                                class="form-check-input"
                                type="checkbox"
                                :id="'coin-set-' + coinSet.id"
                                :value="coinSet.id"
                                v-model="selectedSetIds"
                                @change="updateButtonsState">
                        </div>
                        <div class="flex-grow-1">
                            <div class="fw-semibold">{{ coinSet.name }}</div>
                            <small v-if="coinSet.description" class="text-muted d-block">{{ coinSet.description }}</small>
                            <small v-else class="text-muted d-block">Без описания</small>
                        </div>
                        <span class="badge bg-primary rounded-pill ms-2 opacity-75">{{ coinSet.coin_ids?.length || 0 }}</span>
                    </div>
                    <!-- Message for unauthenticated users -->
                    <div v-if="!isAuthenticated && coinSets.length === 0 && !loading && !error" class="list-group-item text-center text-muted py-4">
                        Для доступа к списку sets монет — авторизуйтесь
                    </div>
                    <!-- Message for authenticated users with no sets -->
                    <div v-else-if="isAuthenticated && coinSets.length === 0 && !loading && !error" class="list-group-item text-center text-muted py-4">
                        Нет сохраненных sets монет
                    </div>
                </div>

                <!-- Two-phase progress bar (PostgreSQL + CoinGecko) -->
                <div v-if="showDefaultSetProgress" class="mt-3 px-1">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <div class="d-flex align-items-center gap-2">
                            <small class="text-muted">{{ defaultSetProgressText }}</small>
                            <button
                                v-if="defaultSetProgress.active && !isCancelling"
                                class="btn btn-sm btn-outline-secondary py-0 px-2"
                                style="font-size: 0.7rem; line-height: 1.4;"
                                @click="cancelLoad">
                                Остановить
                            </button>
                            <small v-if="isCancelling" class="text-warning">Останавливаем…</small>
                        </div>
                        <small v-if="defaultSetProgress.total > 0" class="text-muted">{{ defaultSetProgressPercent }}%</small>
                    </div>
                    <div class="progress" style="height: 6px; background-color: rgba(0,0,0,0.05);">
                        <div
                            class="progress-bar"
                            :class="pgProgressBarClass"
                            role="progressbar"
                            :style="{ width: pgProgressWidth + '%' }"
                            :aria-valuenow="pgProgressWidth"
                            aria-valuemin="0"
                            aria-valuemax="100">
                        </div>
                        <div
                            v-if="cgProgressWidth > 0"
                            class="progress-bar"
                            :class="cgProgressBarClass"
                            role="progressbar"
                            :style="{ width: cgProgressWidth + '%' }"
                            :aria-valuenow="cgProgressWidth"
                            aria-valuemin="0"
                            aria-valuemax="100">
                        </div>
                    </div>
                    <!-- Smooth progress bar for rate-limit pause -->
                    <div
                        v-if="defaultSetProgress.retryCountdown > 0"
                        class="progress mt-1"
                        style="height: 3px; background-color: rgba(0,0,0,0.05);">
                        <div
                            class="progress-bar bg-danger"
                            role="progressbar"
                            :style="{ width: defaultSetProgress.retryProgressWidth + '%', transition: 'none' }"
                            aria-valuemin="0"
                            aria-valuemax="100">
                        </div>
                    </div>
                    <div v-if="defaultSetProgress.pgLoaded > 0 || defaultSetProgress.cgLoaded > 0" class="d-flex gap-3 mt-1">
                        <small v-if="defaultSetProgress.pgLoaded > 0" class="text-muted" style="font-size: 0.65rem;">
                            <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#0d6efd;margin-right:3px;vertical-align:middle;"></span>
                            PG: {{ defaultSetProgress.pgLoaded }}
                        </small>
                        <small v-if="defaultSetProgress.cgLoaded > 0" class="text-muted" style="font-size: 0.65rem;">
                            <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#ffc107;margin-right:3px;vertical-align:middle;"></span>
                            CG: {{ defaultSetProgress.cgLoaded }}
                        </small>
                    </div>
                </div>
            </div>
        </div>
    `,

    inject: ['modalApi'],

    props: {
        onLoad: {
            type: Function,
            required: true
        },
        onDelete: {
            type: Function,
            required: true
        },
        onCancel: {
            type: Function,
            required: true
        },
        onOpenAuth: {
            type: Function,
            required: false
        }
    },

    data() {
        return {
            coinSets: [],
            selectedSetIds: [],
            loading: false,
            loadingSet: false, // Coin set loading state
            error: null,
            defaultCount: 50, // Coin count in default set
            defaultSortBy: 'market_cap', // Sort: 'market_cap' | 'volume'
            defaultSetProgress: {
                active: false,
                done: false,
                loaded: 0,
                total: 0,
                overallTotal: 0,
                chunkIndex: 0,
                chunksTotal: 0,
                text: '',
                retryCountdown: 0,
                retryTimer: null,
                retryProgressWidth: 0,   // 0→100 over pause duration (smooth animation)
                retryProgressRaf: null,  // requestAnimationFrame handle
                pgLoaded: 0,
                pgTotal: 0,
                cgLoaded: 0,
                cgTotal: 0,
                currentSource: ''
            },
            isCancelling: false, // Flag: user clicked Stop
            loadAbortController: null, // AbortController for cancelling current load
            validationTimeout: null, // Timer for validation debounce
            autoSets: [], // Auto sets (stablecoins, wrapped, LST)
            draftSet: {
                id: 'draft',
                name: 'Draft (черновик)',
                description: 'Локальный набор (только на этом устройстве)',
                coin_ids: [],
                coins: null,
                tickers: '',
                is_draft: true,
                is_local: true
            }, // Local "Draft" set from localStorage (initialized empty)
            draftTickersInput: '', // Editable field for Draft set ticker input
            draftLoading: false, // Draft set loading state
            banSet: {
                id: 'ban',
                name: 'Ban (служебный)',
                description: 'Локальный список исключений (только на этом устройстве)',
                coin_ids: [],
                coins: null,
                tickers: '',
                is_ban: true,
                is_local: true
            }, // Built-in "Ban" set
            banTickersInput: '', // Editable field for Ban set ticker input
            banLoading: false, // Ban set loading state
            // Use centralized state from auth-state (SSOT)
            authState: window.authState ? window.authState.getState() : null
        };
    },

    computed: {
        /**
         * User auth check (reactive property)
         */
        isAuthenticated() {
            return this.authState ? this.authState.isAuthenticated === true : false;
        },
        autoStablecoins() {
            return this.autoSets.find(set => set.id === 'auto-stablecoins');
        },
        autoWrapped() {
            return this.autoSets.find(set => set.id === 'auto-wrapped');
        },
        autoLst() {
            return this.autoSets.find(set => set.id === 'auto-lst');
        },
        stablecoinIcon() {
            return window.coinsConfig.getCoinTypeIcon('stable');
        },
        wrappedIcon() {
            return window.coinsConfig.getCoinTypeIcon('wrapped');
        },
        lstIcon() {
            return window.coinsConfig.getCoinTypeIcon('lst');
        },
        showDefaultSetProgress() {
            return Boolean(this.defaultSetProgress.active || this.defaultSetProgress.text);
        },
        defaultSetProgressPercent() {
            const total = Number(this.defaultSetProgress.overallTotal || this.defaultSetProgress.total) || 0;
            const loaded = Number(this.defaultSetProgress.loaded) || 0;
            if (total <= 0) {
                return this.defaultSetProgress.done ? 100 : 0;
            }
            return Math.max(0, Math.min(100, Math.round((loaded / total) * 100)));
        },
        defaultSetProgressText() {
            if (this.defaultSetProgress.text) {
                return this.defaultSetProgress.text;
            }
            return this.defaultSetProgress.active ? 'Загрузка данных...' : '';
        },
        defaultSetProgressBarClass() {
            if (this.defaultSetProgress.active) {
                return 'progress-bar-striped progress-bar-animated';
            }
            return this.defaultSetProgress.done ? 'bg-success' : 'bg-secondary';
        },
        pgProgressWidth() {
            const overallTotal = Number(this.defaultSetProgress.overallTotal || this.defaultSetProgress.total) || 0;
            if (overallTotal <= 0) {
                const t = Number(this.defaultSetProgress.total || this.defaultSetProgress.overallTotal) || 0;
                const l = Number(this.defaultSetProgress.loaded) || 0;
                if (t <= 0) return this.defaultSetProgress.done ? 100 : 0;
                return Math.round((l / t) * 100);
            }
            return Math.round(((Number(this.defaultSetProgress.pgLoaded) || 0) / overallTotal) * 100);
        },
        cgProgressWidth() {
            const overallTotal = Number(this.defaultSetProgress.overallTotal || this.defaultSetProgress.total) || 0;
            if (overallTotal <= 0) return 0;
            return Math.round(((Number(this.defaultSetProgress.cgLoaded) || 0) / overallTotal) * 100);
        },
        pgProgressBarClass() {
            if (this.defaultSetProgress.currentSource === 'postgres' && this.defaultSetProgress.active) {
                return 'bg-primary progress-bar-striped progress-bar-animated';
            }
            return 'bg-primary';
        },
        cgProgressBarClass() {
            if (this.defaultSetProgress.currentSource === 'coingecko' && this.defaultSetProgress.active) {
                return 'bg-warning progress-bar-striped progress-bar-animated';
            }
            return 'bg-warning';
        },

        /**
         * Whether draft can be saved (compares ticker sets regardless of order)
         */
        canSaveDraft() {
            if (!this.draftTickersInput || this.draftTickersInput.trim().length === 0) {
                return false;
            }

            // Parse tickers from input field
            const inputTickers = new Set(
                this.draftTickersInput
                    .split(',')
                    .map(t => t.trim().toLowerCase())
                    .filter(t => t.length > 0)
            );

            if (inputTickers.size === 0) {
                return false;
            }

            // Get tickers from saved Draft set
            const savedTickers = new Set();
            if (this.draftSet) {
                // If full coin data exists - extract tickers from it
                if (this.draftSet.coins && Array.isArray(this.draftSet.coins) && this.draftSet.coins.length > 0) {
                    this.draftSet.coins.forEach(coin => {
                        const symbol = (coin.symbol || coin.id || '').toLowerCase();
                        if (symbol) {
                            savedTickers.add(symbol);
                        }
                    });
                } else if (this.draftSet.tickers && this.draftSet.tickers.trim().length > 0) {
                    // If saved ticker string exists - parse it
                    this.draftSet.tickers
                        .split(',')
                        .map(t => t.trim().toLowerCase())
                        .filter(t => t.length > 0)
                        .forEach(t => savedTickers.add(t));
                }
            }

            // If saved set empty and input has tickers - can save
            if (savedTickers.size === 0 && inputTickers.size > 0) {
                return true;
            }

            // Compare sets (order irrelevant)
            if (inputTickers.size !== savedTickers.size) {
                return true; // Different count - has differences
            }

            // Check if all input tickers exist in saved set
            for (const ticker of inputTickers) {
                if (!savedTickers.has(ticker)) {
                    return true; // New ticker found
                }
            }

            // Check if all saved set tickers exist in input
            for (const ticker of savedTickers) {
                if (!inputTickers.has(ticker)) {
                    return true; // Removed ticker found
                }
            }

            return false; // Sets identical
        },

        saveDraftTitle() {
            if (!window.tooltipsConfig) return 'Сохранить черновик';
            return window.tooltipsConfig.getTooltip('ui.coinSet.draft.save');
        }
    },

    watch: {
        /**
         * Watch auth change for button state update
         */
        isAuthenticated() {
            this.$nextTick(() => {
                this.updateButtonsState();
            });
        },
        /**
         * Watch Draft ticker input change for button state update
         */
        draftTickersInput() {
            this.$nextTick(() => {
                this.updateButtonsState();
            });
        },
        banTickersInput() {
            this.$nextTick(() => {
                this.updateButtonsState();
            });
        }
    },

    mounted() {
        // Register buttons
        this.registerButtons();

        // Update button state on mount
        this.updateButtonsState();

        // Load local "Draft" set from localStorage
        // Ticker input field auto-updates inside loadDraftSet()
        this.loadDraftSet();
        // Load local "Ban" set from localStorage
        this.loadBanSet();

        // Load auto sets (stablecoins, wrapped, LST)
        this.loadAutoSets();

        // Load coin sets only if already authenticated (e.g. after F5 with valid token)
        if (this.authState && this.authState.isAuthenticated === true) {
            this.loadCoinSets();
        }
        // Subscribe to auth events — only when became authenticated
        if (window.eventBus) {
            this.authStateUnsubscribe = window.eventBus.on('auth-state-changed', (eventData) => {
                console.log('coin-set-load-modal-body: auth-state-changed event, isAuthenticated:', eventData?.isAuthenticated);
                // Update button state on auth change
                this.updateButtonsState();
                if (eventData && eventData.isAuthenticated === true) {
                    // Use forceAuth=true to bypass race (event arrives before window.authState update)
                    this.loadCoinSets(true);
                }
            });

            // Subscribe to set save event for list refresh
            this.coinSetSavedUnsubscribe = window.eventBus.on('coin-set-saved', (eventData) => {
                console.log('coin-set-load-modal-body: coin-set-saved event, refreshing sets list');
                // Refresh sets list after save
                this.loadCoinSets(true);
            });

            // Subscribe to Draft set update event
            this.draftSetUpdatedUnsubscribe = window.eventBus.on('draft-set-updated', () => {
                console.log('coin-set-load-modal-body: draft-set-updated event, refreshing Draft set');
                this.loadDraftSet();
                // Update button state after Draft set refresh
                this.$nextTick(() => {
                    this.updateButtonsState();
                });
            });

            this.banSetUpdatedUnsubscribe = window.eventBus.on('ban-set-updated', () => {
                console.log('coin-set-load-modal-body: ban-set-updated event, refreshing Ban set');
                this.loadBanSet();
                this.$nextTick(() => {
                    this.updateButtonsState();
                });
            });
        }
    },

    beforeUnmount() {
        // Clear validation timer on unmount
        if (this.validationTimeout) {
            clearTimeout(this.validationTimeout);
            this.validationTimeout = null;
        }

        // Unsubscribe from events
        if (window.eventBus) {
            if (this.authStateUnsubscribe) {
                window.eventBus.off('auth-state-changed', this.authStateUnsubscribe);
            }
            if (this.coinSetSavedUnsubscribe) {
                window.eventBus.off('coin-set-saved', this.coinSetSavedUnsubscribe);
            }
            if (this.draftSetUpdatedUnsubscribe) {
                window.eventBus.off('draft-set-updated', this.draftSetUpdatedUnsubscribe);
            }
            if (this.banSetUpdatedUnsubscribe) {
                window.eventBus.off('ban-set-updated', this.banSetUpdatedUnsubscribe);
            }
        }
    },

    methods: {
        /**
         * Register modal buttons
         */
        registerButtons() {
            if (!this.modalApi) return;

            // Delete button (left in footer)
            this.modalApi.registerButton('delete', {
                label: 'Удалить',
                variant: 'danger',
                locations: ['footer'],
                classesAdd: { root: 'me-auto' },
                disabled: true,
                onClick: () => this.handleDelete()
            });

            // Add button (right in footer, second)
            this.modalApi.registerButton('add', {
                label: 'Добавить',
                variant: 'primary',
                locations: ['footer'],
                disabled: true,
                onClick: () => this.handleAdd()
            });

            // Replace button (right in footer, first)
            this.modalApi.registerButton('replace', {
                label: 'Заменить',
                variant: 'primary',
                locations: ['footer'],
                disabled: true,
                onClick: () => this.handleReplace()
            });

            // Auth button (right in footer, shown when default set not selected and user not authenticated)
            this.modalApi.registerButton('auth', {
                label: 'Авторизоваться',
                variant: 'primary',
                locations: ['footer'],
                disabled: false,
                visible: false, // Hidden by default
                onClick: () => this.handleOpenAuth()
            });
        },

        /**
         * Update button state based on selected sets and auth status
         */
        updateButtonsState() {
            if (!this.modalApi) return;

            const hasSelection = this.selectedSetIds.length > 0;
            const hasDefaultSelected = this.selectedSetIds.includes('default');
            const hasDraftSelected = this.selectedSetIds.includes('draft');
            // "Delete" button active only when saved sets are selected (not default or Draft)
            const hasSavableSelection = this.selectedSetIds.some(id => id !== 'default' && id !== 'draft');

            // "Load" button active when there are selected sets
            const canLoad = hasSelection;

            // Update "Delete" button
            this.modalApi.updateButton('delete', {
                disabled: !hasSavableSelection
            });

            // Logic for switching between "Add"/"Replace" and "Authorize" buttons:
            // - If authenticated → always show "Add" and "Replace"
            // - If not authenticated and (default set selected OR Draft available) → show "Add" and "Replace"
            // - If not authenticated and neither default nor Draft selected → show "Authorize"
            if (this.isAuthenticated) {
                // User authenticated - always show "Add" and "Replace" buttons
                this.modalApi.updateButton('add', {
                    disabled: !canLoad || this.loadingSet,
                    visible: true
                });
                this.modalApi.updateButton('replace', {
                    disabled: !canLoad || this.loadingSet,
                    visible: true
                });
                this.modalApi.updateButton('auth', {
                    visible: false
                });
            } else if (hasDefaultSelected || hasDraftSelected) {
                // User not authenticated but default set or Draft selected - show "Add" and "Replace"
                this.modalApi.updateButton('add', {
                    disabled: !canLoad || this.loadingSet,
                    visible: true
                });
                this.modalApi.updateButton('replace', {
                    disabled: !canLoad || this.loadingSet,
                    visible: true
                });
                this.modalApi.updateButton('auth', {
                    visible: false
                });
            } else {
                // User not authenticated and neither default nor Draft selected - show "Authorize"
                this.modalApi.updateButton('add', {
                    visible: false
                });
                this.modalApi.updateButton('replace', {
                    visible: false
                });
                this.modalApi.updateButton('auth', {
                    visible: true,
                    disabled: false
                });
            }
        },

        /**
         * Initiate Google OAuth authorization
         * Uses same approach as auth-modal-body (SSOT principle)
         */
        async handleOpenAuth() {
            try {
                if (!window.authClient || !window.authState) {
                    console.error('coin-set-load-modal-body: authClient or authState not loaded');
                    return;
                }

                // Set loading state in centralized store
                window.authState.setLoading(true);

                // Initiate Google OAuth (SSOT: same method as auth-modal-body)
                window.authClient.initiateGoogleAuth();

                // Handle postMessage from OAuth callback popup (SSOT: same approach as auth-modal-body)
                const handleOAuthMessage = async (event) => {
                    if (event.data && event.data.type === 'oauth-callback' && event.data.success) {
                        try {
                            const tokenData = event.data.token;

                            if (tokenData && tokenData.access_token) {
                                // Save token via auth-client
                                if (window.authClient && window.authClient.saveToken) {
                                    await window.authClient.saveToken(tokenData);
                                }

                                // Update centralized auth state (syncs all instances)
                                // Check auth status via auth-state
                                if (window.authState && typeof window.authState.checkAuthStatus === 'function') {
                                    await window.authState.checkAuthStatus();
                                }

                                // Reload coin sets list after successful auth
                                await this.loadCoinSets(true);

                                // Remove handler after successful auth
                                window.removeEventListener('message', handleOAuthMessage);
                            }
                        } catch (error) {
                            console.error('coin-set-load-modal-body.handleOAuthMessage error:', error);
                        } finally {
                            window.authState.setLoading(false);
                            // Update button state after auth
                            this.updateButtonsState();
                        }
                    }
                };

                window.addEventListener('message', handleOAuthMessage);

                // Timeout to remove handler (if popup closed without auth)
                setTimeout(() => {
                    window.removeEventListener('message', handleOAuthMessage);
                    window.authState.setLoading(false);
                    this.updateButtonsState();
                }, 5 * 60 * 1000); // 5 minutes

            } catch (error) {
                console.error('coin-set-load-modal-body.handleOpenAuth error:', error);
                if (window.authState) {
                    window.authState.setLoading(false);
                }
                this.updateButtonsState();
                if (window.errorHandler) {
                    window.errorHandler.handleError(error, {
                        context: 'coin-set-load-modal-body.handleOpenAuth',
                        userMessage: 'Ошибка при инициации авторизации'
                    });
                }
            }
        },

        /**
         * Load local "Draft" set from localStorage
         * Always fetches fresh data from localStorage for correct coin count display
         * Creates empty object for display if Draft set does not exist
         */
        loadDraftSet() {
            if (window.draftCoinSet) {
                // Always fetch fresh data from localStorage
                const loadedDraftSet = window.draftCoinSet.get();

                // If Draft set does not exist, create empty object for display
                if (!loadedDraftSet) {
                    this.draftSet = {
                        id: 'draft',
                        name: 'Draft (черновик)',
                        description: 'Локальный набор (только на этом устройстве)',
                        coin_ids: [],
                        coins: null,
                        tickers: '',
                        is_draft: true,
                        is_local: true
                    };
                    this.draftTickersInput = '';
                } else {
                    // Update draftSet reactively
                    this.draftSet = loadedDraftSet;
                    // Update ticker input field with value from localStorage
                    // Always update input to match localStorage data
                    const newTickers = loadedDraftSet.tickers || '';

                    // Always sync input field with localStorage value
                    this.draftTickersInput = newTickers;
                }
            } else {
                // If draftCoinSet not loaded, create empty object for display
                this.draftSet = {
                    id: 'draft',
                    name: 'Draft (черновик)',
                    description: 'Локальный набор (только на этом устройстве)',
                    coin_ids: [],
                    coins: null,
                    tickers: '',
                    is_draft: true,
                    is_local: true
                };
                this.draftTickersInput = '';
            }
        },

        /**
         * Load local "Ban" set from localStorage
         */
        loadBanSet() {
            if (window.banCoinSet) {
                const loadedBanSet = window.banCoinSet.get();
                if (!loadedBanSet) {
                    this.banSet = {
                        id: 'ban',
                        name: 'Ban (служебный)',
                        description: 'Локальный список исключений (только на этом устройстве)',
                        coin_ids: [],
                        coins: null,
                        tickers: '',
                        is_ban: true,
                        is_local: true
                    };
                    this.banTickersInput = '';
                } else {
                    this.banSet = loadedBanSet;
                    this.banTickersInput = loadedBanSet.tickers || '';
                }
            } else {
                this.banSet = {
                    id: 'ban',
                    name: 'Ban (служебный)',
                    description: 'Локальный список исключений (только на этом устройстве)',
                    coin_ids: [],
                    coins: null,
                    tickers: '',
                    is_ban: true,
                    is_local: true
                };
                this.banTickersInput = '';
            }
        },

        /**
         * Load auto-sets (stablecoins, wrapped, LST) from localStorage
         */
        loadAutoSets() {
            if (!window.autoCoinSets) {
                console.warn('coin-set-load-modal-body: autoCoinSets not loaded');
                return;
            }

            const autoSetsData = window.autoCoinSets.getAllAutoSets();

            this.autoSets = [
                {
                    id: 'auto-stablecoins',
                    name: 'Стейблкоины',
                    description: 'Автоматический сбор стейблкоинов из loadedных монет',
                    // icon: 'account_balance',
                    coins: autoSetsData.stablecoins,
                    coin_ids: autoSetsData.stablecoins.map(c => c.id)
                },
                {
                    id: 'auto-wrapped',
                    name: 'Обертки (Wrapped)',
                    description: 'Автоматический сбор wrapped-токенов из loadedных монет',
                    // icon: 'repeat',
                    coins: autoSetsData.wrapped,
                    coin_ids: autoSetsData.wrapped.map(c => c.id)
                },
                {
                    id: 'auto-lst',
                    name: 'LST (Liquid Staking)',
                    description: 'Автоматический сбор LST-токенов из loadedных монет',
                    // icon: 'local_fire_department',
                    coins: autoSetsData.lst,
                    coin_ids: autoSetsData.lst.map(c => c.id)
                }
            ];

            console.log(`coin-set-load-modal-body: loaded ${this.autoSets.length} auto-sets`);
        },

        /**
         * Handle ticker input in Draft field
         */
        handleDraftTickersInput() {
            // Update button state when input changes
            this.$nextTick(() => {
                this.updateButtonsState();
            });
        },

        /**
         * Handle ticker input in Ban field
         */
        handleBanTickersInput() {
            this.$nextTick(() => {
                this.updateButtonsState();
            });
        },

        /**
         * Load coins by tickers from Draft input field
         */
        async loadDraftFromTickers() {
            if (!this.draftTickersInput || this.draftTickersInput.trim().length === 0) {
                return;
            }

            if (!window.dataProviderManager) {
                console.error('coin-set-load-modal-body: dataProviderManager not loaded');
                if (window.messagesStore) {
                    window.messagesStore.addMessage({
                        type: 'danger',
                        text: 'Error: модули данных not loadedы',
                        scope: 'global',
                        duration: 5000
                    });
                }
                return;
            }

            this.draftLoading = true;

            try {
                // Parse tickers from string (comma separator) and dedupe via Set
                const rawTickers = this.draftTickersInput
                    .split(',')
                    .map(t => t.trim().toLowerCase())
                    .filter(t => t.length > 0);

                const tickers = Array.from(new Set(rawTickers));

                if (tickers.length === 0) {
                    if (window.messagesStore) {
                        window.messagesStore.addMessage({
                            type: 'warning',
                            text: 'Введите хотя бы один тикер',
                            scope: 'global',
                            duration: 3000
                        });
                    }
                    return;
                }

                // Load max sets from cache for ticker lookup
                const cacheKeyMarketCap = 'top-coins-by-market-cap';
                const cacheKeyVolume = 'top-coins-by-volume';

                let coinsMarketCap = await window.cacheManager.get(cacheKeyMarketCap);
                let coinsVolume = await window.cacheManager.get(cacheKeyVolume);

                // If cache empty, load from API
                if (!coinsMarketCap) {
                    coinsMarketCap = await window.dataProviderManager.getTopCoins(250, 'market_cap');
                    await window.cacheManager.set(cacheKeyMarketCap, coinsMarketCap);
                }

                if (!coinsVolume) {
                    coinsVolume = await window.dataProviderManager.getTopCoins(250, 'volume');
                    await window.cacheManager.set(cacheKeyVolume, coinsVolume);
                }

                // Merge both sets into one Map for ticker lookup
                const coinsMap = new Map();
                if (coinsMarketCap) {
                    coinsMarketCap.forEach(coin => {
                        const symbol = (coin.symbol || '').toLowerCase();
                        if (symbol && !coinsMap.has(symbol)) {
                            coinsMap.set(symbol, coin);
                        }
                    });
                }
                if (coinsVolume) {
                    coinsVolume.forEach(coin => {
                        const symbol = (coin.symbol || '').toLowerCase();
                        if (symbol && !coinsMap.has(symbol)) {
                            coinsMap.set(symbol, coin);
                        }
                    });
                }

                // Find coins by tickers and dedupe coin objects
                const foundCoinsMap = new Map();
                const missingTickersSet = new Set();

                tickers.forEach(ticker => {
                    const coin = coinsMap.get(ticker);
                    if (coin) {
                        if (!foundCoinsMap.has(coin.id)) {
                            foundCoinsMap.set(coin.id, coin);
                        }
                    } else {
                        missingTickersSet.add(ticker);
                    }
                });

                const foundCoins = Array.from(foundCoinsMap.values());
                const missingTickers = Array.from(missingTickersSet);

                if (foundCoins.length === 0) {
                    throw new Error('Не найдено ни одной монеты по указанным тикерам');
                }

                // Save found coins to Draft set
                const coinIds = foundCoins.map(coin => coin.id);

                // Extract tickers from found coins and sort alphabetically
                const tickersString = foundCoins
                    .map(coin => coin.symbol || coin.id)
                    .filter(Boolean)
                    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
                    .join(', ');

                if (window.draftCoinSet) {
                    window.draftCoinSet.save(coinIds, foundCoins);
                }

                // Update ticker input directly (reactive) for immediate display
                this.draftTickersInput = tickersString;

                // Update local state (reload from localStorage for correct count display)
                // Tickers will be auto-sorted in loadDraftSet()
                this.loadDraftSet();

                // Update button state after loading Draft set
                this.$nextTick(() => {
                    this.updateButtonsState();
                });

                // Show success message
                if (window.messagesStore) {
                    const message = missingTickers.length > 0
                        ? `Загружено ${foundCoins.length} из ${tickers.length} монет. Не найдены: ${missingTickers.join(', ')}`
                        : `Загружено ${foundCoins.length} монет в Draft набор`;

                    window.messagesStore.addMessage({
                        type: missingTickers.length > 0 ? 'warning' : 'success',
                        text: message,
                        scope: 'global',
                        duration: 5000
                    });
                }

                // Do not auto-select Draft - user decides whether to load it

            } catch (error) {
                console.error('coin-set-load-modal-body: error loading Draft by tickers:', error);
                if (window.messagesStore) {
                    window.messagesStore.addMessage({
                        type: 'danger',
                        text: `Ошибка загрузки: ${error.message || 'Unknown error'}`,
                        scope: 'global',
                        duration: 5000
                    });
                }
            } finally {
                this.draftLoading = false;
            }
        },

        /**
         * Save Ban list by tickers
         */
        async loadBanFromTickers() {
            if (!this.banTickersInput || this.banTickersInput.trim().length === 0) {
                return;
            }

            if (!window.dataProviderManager || !window.banCoinSet) {
                return;
            }

            this.banLoading = true;
            try {
                const rawTickers = this.banTickersInput
                    .split(',')
                    .map(t => t.trim().toLowerCase())
                    .filter(t => t.length > 0);
                const tickers = Array.from(new Set(rawTickers));
                if (tickers.length === 0) {
                    return;
                }

                const cacheKeyMarketCap = 'top-coins-by-market-cap';
                const cacheKeyVolume = 'top-coins-by-volume';

                let coinsMarketCap = await window.cacheManager.get(cacheKeyMarketCap);
                let coinsVolume = await window.cacheManager.get(cacheKeyVolume);
                if (!coinsMarketCap) {
                    coinsMarketCap = await window.dataProviderManager.getTopCoins(250, 'market_cap');
                    await window.cacheManager.set(cacheKeyMarketCap, coinsMarketCap);
                }
                if (!coinsVolume) {
                    coinsVolume = await window.dataProviderManager.getTopCoins(250, 'volume');
                    await window.cacheManager.set(cacheKeyVolume, coinsVolume);
                }

                const coinsMap = new Map();
                (coinsMarketCap || []).forEach(coin => {
                    const symbol = (coin.symbol || '').toLowerCase();
                    if (symbol && !coinsMap.has(symbol)) coinsMap.set(symbol, coin);
                });
                (coinsVolume || []).forEach(coin => {
                    const symbol = (coin.symbol || '').toLowerCase();
                    if (symbol && !coinsMap.has(symbol)) coinsMap.set(symbol, coin);
                });

                const foundCoinsMap = new Map();
                tickers.forEach(ticker => {
                    const coin = coinsMap.get(ticker);
                    if (coin && !foundCoinsMap.has(coin.id)) {
                        foundCoinsMap.set(coin.id, coin);
                    }
                });

                const foundCoins = Array.from(foundCoinsMap.values());
                const coinIds = foundCoins.map(coin => coin.id);
                const tickersString = tickers.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })).join(', ');

                window.banCoinSet.save(coinIds, foundCoins, tickersString);
                this.banTickersInput = tickersString;
                this.loadBanSet();
            } catch (error) {
                console.error('coin-set-load-modal-body: error saving Ban list:', error);
            } finally {
                this.banLoading = false;
            }
        },

        /**
         * Load coin sets list
         * @param {boolean} forceAuth - Force treat user as authenticated (to avoid race condition)
         */
        async loadCoinSets(forceAuth = false) {
            if (!window.coinSetsClient) {
                // coin-sets-client not loaded - not critical, default set still available
                console.warn('coin-set-load-modal-body: coin-sets-client not loaded');
                this.coinSets = [];
                this.loading = false;
                return;
            }

            // Check auth (use forceAuth to avoid race condition)
            const isAuth = forceAuth || (this.authState && this.authState.isAuthenticated === true);

            if (!isAuth) {
                // User not authenticated - show only default set
                console.info('coin-set-load-modal-body: user not authenticated, showing only default set');
                this.coinSets = [];
                this.loading = false;
                this.error = null; // Don't show error, this is expected
                return;
            }

            this.loading = true;
            this.error = null;

            try {
                const sets = await window.coinSetsClient.getCoinSets({ activeOnly: true }); // Active only
                this.coinSets = sets || [];
                // Update button state after loading sets
                this.$nextTick(() => {
                    this.updateButtonsState();
                });
            } catch (error) {
                console.error('coin-set-load-modal-body: error loading sets:', error);
                // Don't show auth error, already handled above
                if (!error.message || !error.message.includes('авторизован')) {
                    this.error = error.message || 'Ошибка загрузки sets монет';
                }
                this.coinSets = [];
            } finally {
                this.loading = false;
                // Update button state after load completes
                this.updateButtonsState();
            }
        },

        /**
         * Handle count input (debounced to prevent spam)
         */
        handleCountInput(event) {
            // Clear previous timer
            if (this.validationTimeout) {
                clearTimeout(this.validationTimeout);
            }

            // Set new timer (500ms delay)
            this.validationTimeout = setTimeout(() => {
                this.updateDefaultSet();
            }, 500);
        },

        /**
         * Update default set (when settings change)
         */
        updateDefaultSet() {
            // Default set updates dynamically on load, here only validation
            if (this.defaultCount < 1) {
                this.defaultCount = 1;
            }

            if (this.defaultCount > 250) {
                this.defaultCount = 250;
                // Warning removed per user request (didn't display in time)
            }
        },

        /**
         * Reset visual progress state
         */
        resetDefaultSetProgress() {
            if (this.defaultSetProgress.retryTimer) {
                clearInterval(this.defaultSetProgress.retryTimer);
            }
            if (this.defaultSetProgress.retryProgressRaf) {
                cancelAnimationFrame(this.defaultSetProgress.retryProgressRaf);
            }
            this.defaultSetProgress = {
                active: false,
                done: false,
                loaded: 0,
                total: 0,
                overallTotal: 0,
                chunkIndex: 0,
                chunksTotal: 0,
                text: '',
                retryCountdown: 0,
                retryTimer: null,
                retryProgressWidth: 0,
                retryProgressRaf: null,
                pgLoaded: 0,
                pgTotal: 0,
                cgLoaded: 0,
                cgTotal: 0,
                currentSource: ''
            };
        },

        /**
         * Update load visual progress
         * @param {Object} progress
         */
        cancelLoad() {
            this.isCancelling = true;
            if (this.loadAbortController) {
                this.loadAbortController.abort();
            }
        },

        updateDefaultSetProgress(progress = {}) {
            const current = this.defaultSetProgress || {};
            const phase = String(progress.phase || progress.type || '').toLowerCase();
            const source = progress.source || '';

            const total = Number.isFinite(Number(progress.total)) && Number(progress.total) > 0
                ? Number(progress.total)
                : Number(current.total) || 0;
            const loaded = Number.isFinite(Number(progress.loaded)) && Number(progress.loaded) >= 0
                ? Number(progress.loaded)
                : Number(current.loaded) || 0;
            const chunkIndex = Number.isFinite(Number(progress.chunkIndex)) && Number(progress.chunkIndex) > 0
                ? Number(progress.chunkIndex)
                : Number(current.chunkIndex) || 0;
            const chunksTotal = Number.isFinite(Number(progress.chunksTotal)) && Number(progress.chunksTotal) > 0
                ? Number(progress.chunksTotal)
                : Number(current.chunksTotal) || 0;

            let text = current.text || '';
            let active = Boolean(current.active);
            let done = Boolean(current.done);
            let retryCountdown = 0;

            let pgLoaded = Number(current.pgLoaded) || 0;
            let pgTotal = Number(current.pgTotal) || 0;
            let cgLoaded = Number(current.cgLoaded) || 0;
            let cgTotal = Number(current.cgTotal) || 0;
            let overallTotal = Number(current.overallTotal || current.total) || 0;
            let currentSource = source || current.currentSource || '';

            if (phase !== 'retry' && current.retryTimer) {
                clearInterval(current.retryTimer);
                current.retryTimer = null;
            }
            if (phase !== 'retry' && current.retryProgressRaf) {
                cancelAnimationFrame(current.retryProgressRaf);
                current.retryProgressRaf = null;
                current.retryProgressWidth = 0;
            }

            // Source-aware: update per-source counters
            if (source === 'postgres') {
                currentSource = 'postgres';
                if (phase === 'start') {
                    pgTotal = Number(progress.total) || 0;
                    overallTotal = pgTotal || overallTotal;
                    pgLoaded = 0;
                    active = true; done = false;
                    text = `PostgreSQL: загрузка ${pgTotal} монет...`;
                } else if (phase === 'chunk-success') {
                    pgLoaded = Number(progress.loaded) || pgLoaded;
                    active = true; done = false;
                    text = `PostgreSQL: ${pgLoaded}/${pgTotal || '?'} монет`;
                } else if (phase === 'done') {
                    pgLoaded = Number(progress.loaded) || pgLoaded;
                    if (!overallTotal && pgTotal) {
                        overallTotal = pgTotal;
                    }
                    text = `PostgreSQL: ${pgLoaded} монет loadedо`;
                } else if (phase === 'error') {
                    text = `PostgreSQL: ошибка (${progress.error || 'unknown'}), переход к CoinGecko`;
                }
            } else if (source === 'coingecko') {
                currentSource = 'coingecko';
                if (phase === 'start') {
                    cgTotal = Number(progress.total) || 0;
                    if (!overallTotal) {
                        overallTotal = Math.max(pgLoaded + cgTotal, cgTotal);
                    }
                    cgLoaded = 0;
                    active = true; done = false;
                    text = `CoinGecko: загрузка ${cgTotal} монет... (PG: ${pgLoaded}/${overallTotal || pgTotal || '?'})`;
                } else if (phase === 'chunk-success') {
                    cgLoaded = Number(progress.loaded) || cgLoaded;
                    active = true; done = false;
                    text = `CoinGecko: ${cgLoaded}/${cgTotal || '?'} монет`;
                    // Write received chunk to PostgreSQL immediately
                    if (Array.isArray(progress.chunkCoins) && progress.chunkCoins.length > 0) {
                        this.pushChunkToDb(progress.chunkCoins);
                    }
                } else if (phase === 'chunk-start') {
                    active = true; done = false;
                    text = `CoinGecko: часть ${chunkIndex || 1}/${chunksTotal || '?'}...`;
                } else if (phase === 'chunk-delay') {
                    active = true; done = false;
                    const delaySeconds = Math.max(1, Math.ceil((Number(progress.delayMs) || 0) / 1000));
                    text = `CoinGecko: пауза ${delaySeconds}с...`;
                } else if (phase === 'done') {
                    cgLoaded = Number(progress.loaded) || cgLoaded;
                    active = false; done = true;
                    const totalLoaded = pgLoaded + cgLoaded;
                    text = `Готово: ${totalLoaded} монет (PG: ${pgLoaded}, CG: ${cgLoaded})`;
                } else if (phase === 'skip') {
                    active = false; done = true;
                    text = `Готово: ${pgLoaded} монет из PostgreSQL (все найдены)`;
                } else if (phase === 'error') {
                    text = `CoinGecko: ошибка (${progress.error || 'unknown'})`;
                }
            } else {
                // Legacy non-source-aware events
                if (phase === 'start') {
                    active = true; done = false;
                    if (total > 0) {
                        overallTotal = total;
                    }
                    text = `Подготавливаем загрузку ${total || ''} монет...`;
                } else if (phase === 'chunk-start') {
                    active = true; done = false;
                    text = `Часть ${chunkIndex || 1}/${chunksTotal || '?'}: выполняем запрос...`;
                } else if (phase === 'chunk-success') {
                    active = true; done = false;
                    text = `Загружено ${loaded}/${total || '?'} монет (${chunkIndex || 1}/${chunksTotal || '?'})`;
                } else if (phase === 'chunk-delay') {
                    active = true; done = false;
                    const delaySeconds = Math.max(1, Math.ceil((Number(progress.delayMs) || 0) / 1000));
                    text = `Пауза ${delaySeconds}с перед следующей частью...`;
                } else if (phase === 'done') {
                    active = false; done = true;
                    text = `Готово: ${loaded}/${total || loaded} монет loadedо.`;
                } else if (phase === 'failed') {
                    active = false; done = false;
                    text = progress.message || 'Ошибка загрузки данных.';
                }
            }

            // Retry handling (both sources)
            if (phase === 'retry') {
                active = true; done = false;
                const delayMs = Number(progress.delayMs) || 3000;
                retryCountdown = Math.max(1, Math.ceil(delayMs / 1000));
                const nextAttempt = Number.isFinite(Number(progress.nextAttempt)) ? Number(progress.nextAttempt) : '?';
                const srcLabel = source === 'coingecko' ? 'CoinGecko' : '';
                text = `${srcLabel} Rate limit: повтор через ${retryCountdown}... (попытка ${nextAttempt})`;

                // Countdown seconds
                if (!current.retryTimer) {
                    const timer = setInterval(() => {
                        if (this.defaultSetProgress.retryCountdown > 1) {
                            this.defaultSetProgress.retryCountdown--;
                            this.defaultSetProgress.text = `${srcLabel} Rate limit: повтор через ${this.defaultSetProgress.retryCountdown}... (попытка ${nextAttempt})`;
                        } else {
                            clearInterval(timer);
                            this.defaultSetProgress.retryTimer = null;
                        }
                    }, 1000);
                    current.retryTimer = timer;
                }

                // Smooth bar animation: 0→100% over delayMs via RAF
                if (!current.retryProgressRaf) {
                    const startTs = performance.now();
                    const animate = (now) => {
                        const elapsed = now - startTs;
                        const pct = Math.min(100, (elapsed / delayMs) * 100);
                        this.defaultSetProgress.retryProgressWidth = pct;
                        if (pct < 100) {
                            this.defaultSetProgress.retryProgressRaf = requestAnimationFrame(animate);
                        } else {
                            this.defaultSetProgress.retryProgressRaf = null;
                        }
                    };
                    current.retryProgressRaf = requestAnimationFrame(animate);
                }
            } else if (phase === 'fallback-local-cache') {
                active = false; done = true;
                text = 'API временно ограничил запросы, использован локальный инфраструктурный кэш.';
            } else if (phase === 'fallback-cache') {
                active = false; done = true;
                text = 'Свежие данные недоступны, использован сохраненный кэш.';
            }

            let effectiveLoaded = pgLoaded + cgLoaded;
            if (!effectiveLoaded) {
                effectiveLoaded = loaded;
            }
            let effectiveTotal = overallTotal || total || pgTotal || 0;
            if (effectiveTotal > 0 && effectiveLoaded > effectiveTotal) {
                effectiveLoaded = effectiveTotal;
            }

            this.defaultSetProgress = {
                ...current,
                active,
                done,
                loaded: effectiveLoaded,
                total: effectiveTotal,
                overallTotal: effectiveTotal,
                chunkIndex,
                chunksTotal,
                text,
                retryCountdown: retryCountdown || current.retryCountdown,
                retryProgressWidth: current.retryProgressWidth || 0,
                retryProgressRaf: current.retryProgressRaf || null,
                pgLoaded,
                pgTotal,
                cgLoaded,
                cgTotal,
                currentSource
            };
        },

        /**
         * Send coin chunk from CoinGecko to PostgreSQL (fire-and-forget)
         * Called on each chunk-success from CoinGecko
         * @param {Array} coins - normalized coins (application format)
         */
        pushChunkToDb(coins) {
            if (!Array.isArray(coins) || coins.length === 0) return;
            const provider = window.yandexApiGatewayProvider;
            if (!provider || typeof provider.pushMarketCacheCoins !== 'function') {
                return;
            }

            provider.pushMarketCacheCoins(coins)
            .then(data => {
                if (data.upserted > 0) {
                    // Signal root component to refresh DB counter
                    if (window.eventBus) {
                        window.eventBus.emit('db-coins-upserted', { count: data.upserted });
                    }
                }
            })
            .catch(err => {
                console.warn('coin-set-load-modal-body: write error чанка в БД:', err.message);
            });
        },

        /**
         * Handle adding selected coin sets to current list
         */
        async handleAdd() {
            await this.loadSelectedSets({ merge: true });
        },

        /**
         * Handle replacing current coin list with selected sets
         */
        async handleReplace() {
            await this.loadSelectedSets({ merge: false });
        },

        /**
         * Load selected coin sets with merge option
         * @param {Object} options - load options
         * @param {boolean} options.merge - if true, coins added to current; if false, replace
         */
        async loadSelectedSets(options = {}) {
            const { merge = false } = options;

            this.loadingSet = true;
            this.updateButtonsState(); // Update button state (disabled during load)

            // Reset progress before loading any set
            this.resetDefaultSetProgress();

            try {
                await this._performLoad(merge);
            } catch (error) {
                console.error('coin-set-load-modal-body: ошибка загрузки sets:', error);
                if (window.messagesStore) {
                    window.messagesStore.addMessage({
                        type: 'danger',
                        text: `Ошибка загрузки: ${error.message || 'Unknown error'}`,
                        scope: 'global',
                        duration: 5000
                    });
                }
            } finally {
                this.loadingSet = false;
                this.updateButtonsState(); // Restore button state
            }
        },

        /**
         * Internal method to perform load
         * @param {boolean} merge - if true, coins added to current
         */
        async _performLoad(merge) {
            const selectedSets = [];

            // Check if default set selected
            const hasDefault = this.selectedSetIds.includes('default');

            // Check if Draft set selected via checkbox
            const hasDraft = this.selectedSetIds.includes('draft');

            // If no selected sets, do nothing
            if (this.selectedSetIds.length === 0) {
                this.resetDefaultSetProgress();
                return;
            }

            // If default set not selected, reset its progress
            if (!hasDefault) {
                this.resetDefaultSetProgress();
            }

            // Handle default set
            if (hasDefault) {
                // Load default set data from max sets cache
                // IMPORTANT: Always refresh cache before opening set for freshness
                try {
                    if (!window.cacheManager || !window.dataProviderManager) {
                        throw new Error('cacheManager или dataProviderManager not loadedы');
                    }

                    // Determine cache key by sort criterion
                    const cacheKey = this.defaultSortBy === 'market_cap'
                        ? 'top-coins-by-market-cap'
                        : 'top-coins-by-volume';

                    const cachedBeforeRefresh = await window.cacheManager.get(cacheKey);
                    let coinsFullSet = null;

                    // Skill anchor: visual progress required for chunked Top-N load on file://.
                    // See id:sk-bb7c8e
                    this.isCancelling = false;
                    this.loadAbortController = new AbortController();
                    this.updateDefaultSetProgress({
                        phase: 'start',
                        total: 250,
                        loaded: 0,
                        chunksTotal: 10
                    });

                    try {
                        console.log(`coin-set-load-modal-body: обновляем кэш ${cacheKey} через chunked загрузку...`);
                        // Skill anchor: forced chunking + progress callback protects UX and reduces 429 risk.
                        // See id:sk-bb7c8e
                        coinsFullSet = await window.dataProviderManager.getTopCoins(250, this.defaultSortBy, {
                            preferYandexFirst: true,
                            allowCoinGeckoFallback: true,
                            forceChunking: true,
                            chunkSize: 25,
                            chunkDelayMs: 21000,
                            maxAttempts: 3,
                            allowLocalFallback: true,
                            signal: this.loadAbortController.signal,
                            onProgress: (payload) => this.updateDefaultSetProgress(payload)
                        });

                        if (!Array.isArray(coinsFullSet) || coinsFullSet.length === 0) {
                            throw new Error('Провайдер вернул пустой набор монет');
                        }

                        await window.cacheManager.set(cacheKey, coinsFullSet);
                        await window.cacheManager.set(`${cacheKey}-meta`, { timestamp: Date.now() });

                        this.isCancelling = false;
                        this.loadAbortController = null;
                        this.updateDefaultSetProgress({
                            phase: 'done',
                            total: 250,
                            loaded: Math.min(250, coinsFullSet.length)
                        });
                        console.log(`✅ Кэш ${cacheKey} обновлен (${coinsFullSet.length} монет)`);
                    } catch (apiError) {
                        this.isCancelling = false;
                        this.loadAbortController = null;
                        if (apiError && apiError.name === 'AbortError') {
                            console.log('coin-set-load-modal-body: загрузка отменена пользователем');
                            this.updateDefaultSetProgress({ phase: 'failed', message: 'Загрузка остановлена' });
                            return;
                        }
                        console.warn(`coin-set-load-modal-body: свежие данные ${cacheKey} недоступны, пробуем кэш:`, apiError.message);

                        const cachedAfterRefresh = await window.cacheManager.get(cacheKey);
                        const fallbackCache = (Array.isArray(cachedAfterRefresh) && cachedAfterRefresh.length > 0)
                            ? cachedAfterRefresh
                            : (Array.isArray(cachedBeforeRefresh) && cachedBeforeRefresh.length > 0 ? cachedBeforeRefresh : null);

                        if (!fallbackCache) {
                            throw apiError;
                        }

                        coinsFullSet = fallbackCache;
                        if (window.fallbackMonitor && typeof window.fallbackMonitor.notify === 'function') {
                            window.fallbackMonitor.notify({
                                source: 'coinSetLoadModalBody.loadDefaultCoinSet',
                                phase: 'fallback-cache',
                                details: `${cacheKey}; loaded=${fallbackCache.length}`
                            });
                        }
                        this.updateDefaultSetProgress({
                            phase: 'fallback-cache',
                            total: 250,
                            loaded: Math.min(250, fallbackCache.length)
                        });

                        if (window.messagesStore) {
                            window.messagesStore.addMessage({
                                type: 'warning',
                                text: 'Свежие данные временно недоступны, использованы данные из кэша',
                                scope: 'global',
                                duration: 4000
                            });
                        }
                    }

                    // Take required count of coins from full set
                    const coins = coinsFullSet.slice(0, this.defaultCount);

                    console.log(`coin-set-load-modal-body: loadedо ${coins.length} монет из кэша ${cacheKey} (всего в кэше: ${coinsFullSet.length})`);

                    // Create virtual set from current data
                    // IMPORTANT: pass not only coin_ids but full coin data
                    selectedSets.push({
                        id: 'default',
                        name: `Актуальные рейтинги рынка (${coins.length} монет, ${this.defaultSortBy === 'market_cap' ? 'по капитализации' : 'по объему'})`,
                        description: 'Актуальные данные с рынка',
                        coin_ids: coins.map(coin => coin.id),
                        coins: coins, // Полные данные монет for загрузки в this.coins
                        is_default: true
                    });
                } catch (error) {
                    this.updateDefaultSetProgress({
                        phase: 'failed',
                        message: `Ошибка загрузки: ${error.message || 'неизвестно'}`
                    });
                    console.error('coin-set-load-modal-body: ошибка загрузки дефолтного набора:', error);
                    if (window.messagesStore) {
                        window.messagesStore.addMessage({
                            type: 'danger',
                            text: `Ошибка загрузки дефолтного набора: ${error.message || 'Unknown error'}`,
                            scope: 'global',
                            duration: 5000
                        });
                    }
                    // Do not abort - continue processing other sets (if selected)
                }
            }

            // Handle local "Draft" set (when checkbox selected)
            if (hasDraft) {
                try {
                    if (!window.cacheManager || !window.dataProviderManager) {
                        throw new Error('cacheManager или dataProviderManager not loadedы');
                    }

                    // IMPORTANT: Before loading Draft set always refresh from localStorage
                    // Ensures we use fresh data, not stale from this.draftSet
                    this.loadDraftSet();

                    // Use Draft set from localStorage (if exists) or load by tickers from input
                    const draftCoinIds = this.draftSet && this.draftSet.coin_ids ? this.draftSet.coin_ids : [];
                    const draftCoinsData = this.draftSet && this.draftSet.coins ? this.draftSet.coins : null;

                    if (draftCoinIds.length === 0 && draftCoinsData && draftCoinsData.length === 0) {
                        // If Draft set empty but tickers in input - try to load
                        if (this.draftTickersInput && this.draftTickersInput.trim().length > 0) {
                            // Load by tickers from input
                            await this.loadDraftFromTickers();
                            // After load update draftSet
                            this.loadDraftSet();
                            // Use updated data
                            const updatedDraftSet = window.draftCoinSet ? window.draftCoinSet.get() : null;
                            if (updatedDraftSet && updatedDraftSet.coin_ids && updatedDraftSet.coin_ids.length > 0) {
                                selectedSets.push({
                                    id: 'draft',
                                    name: 'Draft (черновик)',
                                    description: 'Локальный набор (только на этом устройстве)',
                                    coin_ids: updatedDraftSet.coin_ids,
                                    coins: updatedDraftSet.coins || null,
                                    tickers: updatedDraftSet.tickers || '',
                                    is_draft: true,
                                    is_local: true
                                });
                            }
                            // Do not abort - continue processing other sets
                        } else {
                            console.warn('coin-set-load-modal-body: Draft набор пуст и нет тикеров for загрузки');
                            // Do not abort - continue processing other sets
                        }
                    } else if (draftCoinIds.length > 0 || (draftCoinsData && draftCoinsData.length > 0)) {
                        // If set contains full coin data - use it
                        if (draftCoinsData && Array.isArray(draftCoinsData) && draftCoinsData.length > 0) {
                                selectedSets.push({
                                    id: 'draft',
                                    name: 'Draft (черновик)',
                                    description: 'Локальный набор (только на этом устройстве)',
                                    coin_ids: draftCoinIds,
                                    coins: draftCoinsData,
                                    tickers: this.draftSet.tickers || draftCoinsData.map(coin => coin.symbol || coin.id).filter(Boolean).join(', '),
                                    is_draft: true,
                                    is_local: true
                                });
                        } else {
                            // Load full data from cache or API
                            const cacheKeyMarketCap = 'top-coins-by-market-cap';
                            const cacheKeyVolume = 'top-coins-by-volume';

                            let coinsMarketCap = await window.cacheManager.get(cacheKeyMarketCap);
                            let coinsVolume = await window.cacheManager.get(cacheKeyVolume);

                            // If cache empty, load from API
                            if (!coinsMarketCap) {
                                coinsMarketCap = await window.dataProviderManager.getTopCoins(250, 'market_cap');
                                await window.cacheManager.set(cacheKeyMarketCap, coinsMarketCap);
                            }

                            if (!coinsVolume) {
                                coinsVolume = await window.dataProviderManager.getTopCoins(250, 'volume');
                                await window.cacheManager.set(cacheKeyVolume, coinsVolume);
                            }

                            // Merge both sets into one Map for ID lookup
                            const coinsMap = new Map();
                            if (coinsMarketCap) {
                                coinsMarketCap.forEach(coin => coinsMap.set(coin.id, coin));
                            }
                            if (coinsVolume) {
                                coinsVolume.forEach(coin => coinsMap.set(coin.id, coin));
                            }

                            // Find coins from Draft set
                            const loadedCoins = [];
                            const missingIds = [];
                            draftCoinIds.forEach(coinId => {
                                const coin = coinsMap.get(coinId);
                                if (coin) {
                                    loadedCoins.push(coin);
                                } else {
                                    missingIds.push(coinId);
                                }
                            });

                            if (loadedCoins.length > 0) {
                                // Update tickers in Draft set when loading full data
                                const tickers = loadedCoins.map(coin => coin.symbol || coin.id).filter(Boolean).join(', ');
                                if (window.draftCoinSet) {
                                    window.draftCoinSet.save(draftCoinIds, loadedCoins);
                                }

                                selectedSets.push({
                                    id: 'draft',
                                    name: 'Draft (черновик)',
                                    description: 'Локальный набор (только на этом устройстве)',
                                    coin_ids: draftCoinIds,
                                    coins: loadedCoins,
                                    tickers: tickers,
                                    is_draft: true,
                                    is_local: true
                                });

                                if (missingIds.length > 0) {
                                    console.warn(`coin-set-load-modal-body: не найдены данные for ${missingIds.length} монет из Draft набора:`, missingIds);
                                }
                            } else {
                                throw new Error('Не удалось загрузить данные монет for Draft набора');
                            }
                        }
                    }
                } catch (error) {
                    console.error('coin-set-load-modal-body: ошибка загрузки Draft набора:', error);
                    if (window.messagesStore) {
                        window.messagesStore.addMessage({
                            type: 'warning',
                            text: `Ошибка загрузки Draft набора: ${error.message || 'Unknown error'}`,
                            scope: 'global',
                            duration: 5000
                        });
                    }
                }
            }

            // Handle auto-sets (stablecoins, wrappers, LST)
            const autoSetIds = this.selectedSetIds.filter(id => typeof id === 'string' && id.startsWith('auto-'));
            if (autoSetIds.length > 0) {
                const autoSetsToLoad = this.autoSets.filter(set => autoSetIds.includes(set.id));
                selectedSets.push(...autoSetsToLoad);
                console.log(`coin-set-load-modal-body: добавлено ${autoSetsToLoad.length} автоsets for объединения`);
            }

            // Add saved sets (exclude 'default', 'draft' and auto-sets from selectedSetIds)
            const savedSetIds = this.selectedSetIds.filter(id => id !== 'default' && id !== 'draft' && !(typeof id === 'string' && id.startsWith('auto-')));
            if (savedSetIds.length > 0) {
                const savedSets = this.coinSets.filter(set => savedSetIds.includes(set.id));
                selectedSets.push(...savedSets);
                console.log(`coin-set-load-modal-body: добавлено ${savedSets.length} сохраненных sets for объединения`);
            }

            if (selectedSets.length === 0) {
                console.warn('coin-set-load-modal-body: нет sets for загрузки после обработки');
                return;
            }

            console.log(`coin-set-load-modal-body: ${merge ? 'добавляем' : 'загружаем'} ${selectedSets.length} sets (${selectedSets.map(s => s.name).join(', ')})`);

            if (this.onLoad) {
                this.onLoad(selectedSets, { 
                    merge,
                    onProgress: (payload) => this.updateDefaultSetProgress(payload)
                });
            }
        },

        /**
         * Handle deletion of selected sets
         */
        async handleDelete() {
            if (this.selectedSetIds.length === 0) {
                return;
            }

            // Exclude default, Draft and auto-sets from deletion (non-deletable)
            const idsToDelete = this.selectedSetIds.filter(id => id !== 'default' && id !== 'draft' && !id.startsWith('auto-'));

            if (idsToDelete.length === 0) {
                // If only default, Draft or auto-sets selected - do not delete
                return;
            }

            if (this.onDelete) {
                await this.onDelete(idsToDelete);
                // Update list after deletion (IMPORTANT: use forceAuth=true as user already authorized)
                await this.loadCoinSets(true);
                // Clear selection
                this.selectedSetIds = [];
                this.updateButtonsState();
            }
        }
    }
};
