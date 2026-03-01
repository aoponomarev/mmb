/**
 * ================================================================================================
 * COIN SET LOAD MODAL BODY COMPONENT - Компонент body модального окна загрузки набора монет
 * ================================================================================================
 *
 * ЦЕЛЬ: Список сохраненных наборов монет для загрузки с возможностью множественного выбора.
 *
 * ОСОБЕННОСТИ:
 * - Отображает список сохраненных наборов монет пользователя
 * - Загружает наборы из Cloudflare D1 через coin-sets-client
 * - Позволяет выбрать несколько наборов для загрузки (чекбоксы)
 * - Объединяет монеты из выбранных наборов при загрузке
 * - Позволяет удалить выбранные наборы
 * - Регистрирует кнопки "Загрузить" и "Удалить" через modalApi
 * - Поддерживает локальный набор "Draft" из localStorage (доступен без авторизации)
 *
 * API КОМПОНЕНТА:
 *
 * Props:
 * - onLoad (Function, required) — функция загрузки наборов (массив coinSets)
 * - onDelete (Function, required) — функция удаления наборов (массив IDs)
 * - onCancel (Function, required) — функция отмены
 *
 * Inject:
 * - modalApi — API для управления кнопками (предоставляется cmp-modal)
 *
 * ССЫЛКИ:
 * - Система управления кнопками: shared/components/modal.js
 * - Coin Sets Client: core/api/cloudflare/coin-sets-client.js
 * - Skill: a/skills/app/skills/integrations/integrations-data-providers.md
 */

window.coinSetLoadModalBody = {
    template: `
        <div>
            <div v-if="loading" class="text-center py-4">
                <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                Загрузка наборов монет...
            </div>
            <div v-else-if="error" class="alert alert-danger">
                {{ error }}
            </div>
            <div v-else>
                <!-- Верхний список: Дефолтный набор и Draft (с рамкой) -->
                <div class="list-group mb-3">
                    <!-- Дефолтный набор (первым, неудаляемый) -->
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
                    <!-- Локальный набор "Draft" (только localStorage) -->
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
                                <!-- Индикатор количества монет (синий баллончик с белыми цифрами) -->
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
                    <!-- Локальный служебный набор "Ban" (список исключений) -->
                    <div class="list-group-item">
                        <div class="d-flex align-items-start">
                            <div class="form-check">
                                <input
                                    class="form-check-input"
                                    type="checkbox"
                                    disabled
                                    title="Служебный список: для управления тикерами, не для загрузки"
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
                    <!-- Автонаборы (Stablecoins, Wrapped, LST) -->
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
                <!-- Нижний список: Сохраненные наборы -->
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
                    <!-- Сообщение для неавторизованных пользователей -->
                    <div v-if="!isAuthenticated && coinSets.length === 0 && !loading && !error" class="list-group-item text-center text-muted py-4">
                        Для доступа к списку наборов монет — авторизуйтесь
                    </div>
                    <!-- Сообщение для авторизованных пользователей без наборов -->
                    <div v-else-if="isAuthenticated && coinSets.length === 0 && !loading && !error" class="list-group-item text-center text-muted py-4">
                        Нет сохраненных наборов монет
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
                    <!-- Плавная полоска ожидания rate-limit паузы -->
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
            loadingSet: false, // Состояние загрузки набора монет
            error: null,
            defaultCount: 50, // Количество монет в дефолтном наборе
            defaultSortBy: 'market_cap', // Сортировка: 'market_cap' | 'volume'
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
                retryProgressWidth: 0,   // 0→100 за время паузы (плавная анимация)
                retryProgressRaf: null,  // requestAnimationFrame handle
                pgLoaded: 0,
                pgTotal: 0,
                cgLoaded: 0,
                cgTotal: 0,
                currentSource: ''
            },
            isCancelling: false, // Флаг: пользователь нажал «Остановить»
            loadAbortController: null, // AbortController для отмены текущей загрузки
            validationTimeout: null, // Таймер для debounce валидации
            autoSets: [], // Автонаборы (стейблкоины, обертки, LST)
            draftSet: {
                id: 'draft',
                name: 'Draft (черновик)',
                description: 'Локальный набор (только на этом устройстве)',
                coin_ids: [],
                coins: null,
                tickers: '',
                is_draft: true,
                is_local: true
            }, // Локальный набор "Draft" из localStorage (инициализируется пустым)
            draftTickersInput: '', // Редактируемое поле для ввода тикеров Draft набора
            draftLoading: false, // Состояние загрузки Draft набора
            banSet: {
                id: 'ban',
                name: 'Ban (служебный)',
                description: 'Локальный список исключений (только на этом устройстве)',
                coin_ids: [],
                coins: null,
                tickers: '',
                is_ban: true,
                is_local: true
            }, // Локальный служебный набор "Ban"
            banTickersInput: '', // Редактируемое поле для ввода тикеров Ban набора
            banLoading: false, // Состояние загрузки Ban набора
            // Используем централизованное состояние из auth-state (единый источник правды)
            authState: window.authState ? window.authState.getState() : null
        };
    },

    computed: {
        /**
         * Проверка авторизации пользователя (реактивное свойство)
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
         * Можно ли сохранить черновик (сравнивает множества тикеров без учета порядка)
         */
        canSaveDraft() {
            if (!this.draftTickersInput || this.draftTickersInput.trim().length === 0) {
                return false;
            }

            // Парсим тикеры из поля ввода
            const inputTickers = new Set(
                this.draftTickersInput
                    .split(',')
                    .map(t => t.trim().toLowerCase())
                    .filter(t => t.length > 0)
            );

            if (inputTickers.size === 0) {
                return false;
            }

            // Получаем тикеры из сохраненного Draft набора
            const savedTickers = new Set();
            if (this.draftSet) {
                // Если есть полные данные монет - извлекаем тикеры из них
                if (this.draftSet.coins && Array.isArray(this.draftSet.coins) && this.draftSet.coins.length > 0) {
                    this.draftSet.coins.forEach(coin => {
                        const symbol = (coin.symbol || coin.id || '').toLowerCase();
                        if (symbol) {
                            savedTickers.add(symbol);
                        }
                    });
                } else if (this.draftSet.tickers && this.draftSet.tickers.trim().length > 0) {
                    // Если есть сохраненная строка тикеров - парсим её
                    this.draftSet.tickers
                        .split(',')
                        .map(t => t.trim().toLowerCase())
                        .filter(t => t.length > 0)
                        .forEach(t => savedTickers.add(t));
                }
            }

            // Если сохраненный набор пуст, а в поле ввода есть тикеры - можно сохранить
            if (savedTickers.size === 0 && inputTickers.size > 0) {
                return true;
            }

            // Сравниваем множества (порядок не важен)
            if (inputTickers.size !== savedTickers.size) {
                return true; // Разное количество - есть различия
            }

            // Проверяем, все ли тикеры из поля ввода есть в сохраненном наборе
            for (const ticker of inputTickers) {
                if (!savedTickers.has(ticker)) {
                    return true; // Есть новый тикер
                }
            }

            // Проверяем, все ли тикеры из сохраненного набора есть в поле ввода
            for (const ticker of savedTickers) {
                if (!inputTickers.has(ticker)) {
                    return true; // Есть удаленный тикер
                }
            }

            return false; // Множества идентичны
        },

        saveDraftTitle() {
            if (!window.tooltipsConfig) return 'Сохранить черновик';
            return window.tooltipsConfig.getTooltip('ui.coinSet.draft.save');
        }
    },

    watch: {
        /**
         * Отслеживание изменения авторизации для обновления состояния кнопок
         */
        isAuthenticated() {
            this.$nextTick(() => {
                this.updateButtonsState();
            });
        },
        /**
         * Отслеживание изменения поля ввода тикеров Draft для обновления состояния кнопок
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
        // Регистрируем кнопки
        this.registerButtons();

        // Обновляем состояние кнопок при монтировании
        this.updateButtonsState();

        // Загружаем локальный набор "Draft" из localStorage
        // Поле ввода тикеров автоматически обновляется внутри loadDraftSet()
        this.loadDraftSet();
        // Загружаем локальный набор "Ban" из localStorage
        this.loadBanSet();

        // Загружаем автонаборы (стейблкоины, обертки, LST)
        this.loadAutoSets();

        // Загружаем наборы монет только если уже авторизован (например, после F5 но с валидным токеном)
        if (this.authState && this.authState.isAuthenticated === true) {
            this.loadCoinSets();
        }
        // Подписываемся на события авторизации — только если стал авторизован!
        if (window.eventBus) {
            this.authStateUnsubscribe = window.eventBus.on('auth-state-changed', (eventData) => {
                console.log('coin-set-load-modal-body: получено событие auth-state-changed, isAuthenticated:', eventData?.isAuthenticated);
                // Обновляем состояние кнопок при изменении авторизации
                this.updateButtonsState();
                if (eventData && eventData.isAuthenticated === true) {
                    // Используем forceAuth=true для обхода race condition (событие приходит до обновления window.authState)
                    this.loadCoinSets(true);
                }
            });

            // Подписываемся на событие сохранения набора для обновления списка
            this.coinSetSavedUnsubscribe = window.eventBus.on('coin-set-saved', (eventData) => {
                console.log('coin-set-load-modal-body: получено событие coin-set-saved, обновляем список наборов');
                // Обновляем список наборов после сохранения
                this.loadCoinSets(true);
            });

            // Подписываемся на событие обновления Draft набора
            this.draftSetUpdatedUnsubscribe = window.eventBus.on('draft-set-updated', () => {
                console.log('coin-set-load-modal-body: получено событие draft-set-updated, обновляем Draft набор');
                this.loadDraftSet();
                // Обновляем состояние кнопок после обновления Draft набора
                this.$nextTick(() => {
                    this.updateButtonsState();
                });
            });

            this.banSetUpdatedUnsubscribe = window.eventBus.on('ban-set-updated', () => {
                console.log('coin-set-load-modal-body: получено событие ban-set-updated, обновляем Ban набор');
                this.loadBanSet();
                this.$nextTick(() => {
                    this.updateButtonsState();
                });
            });
        }
    },

    beforeUnmount() {
        // Очищаем таймер валидации при размонтировании
        if (this.validationTimeout) {
            clearTimeout(this.validationTimeout);
            this.validationTimeout = null;
        }

        // Отписываемся от событий
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
         * Регистрация кнопок модального окна
         */
        registerButtons() {
            if (!this.modalApi) return;

            // Кнопка "Удалить" (слева в footer)
            this.modalApi.registerButton('delete', {
                label: 'Удалить',
                variant: 'danger',
                locations: ['footer'],
                classesAdd: { root: 'me-auto' },
                disabled: true,
                onClick: () => this.handleDelete()
            });

            // Кнопка "Добавить" (справа в footer, вторая)
            this.modalApi.registerButton('add', {
                label: 'Добавить',
                variant: 'primary',
                locations: ['footer'],
                disabled: true,
                onClick: () => this.handleAdd()
            });

            // Кнопка "Заменить" (справа в footer, первая)
            this.modalApi.registerButton('replace', {
                label: 'Заменить',
                variant: 'primary',
                locations: ['footer'],
                disabled: true,
                onClick: () => this.handleReplace()
            });

            // Кнопка "Авторизоваться" (справа в footer, показывается когда дефолтный набор не выбран и пользователь не авторизован)
            this.modalApi.registerButton('auth', {
                label: 'Авторизоваться',
                variant: 'primary',
                locations: ['footer'],
                disabled: false,
                visible: false, // По умолчанию скрыта
                onClick: () => this.handleOpenAuth()
            });
        },

        /**
         * Обновить состояние кнопок в зависимости от выбранных наборов и авторизации
         */
        updateButtonsState() {
            if (!this.modalApi) return;

            const hasSelection = this.selectedSetIds.length > 0;
            const hasDefaultSelected = this.selectedSetIds.includes('default');
            const hasDraftSelected = this.selectedSetIds.includes('draft');
            // Кнопка "Удалить" активна только если выбраны сохраненные наборы (не дефолтный и не Draft)
            const hasSavableSelection = this.selectedSetIds.some(id => id !== 'default' && id !== 'draft');

            // Кнопка "Загрузить" активна, если есть выбранные наборы
            const canLoad = hasSelection;

            // Обновляем кнопку "Удалить"
            this.modalApi.updateButton('delete', {
                disabled: !hasSavableSelection
            });

            // Логика переключения между кнопками "Добавить"/"Заменить" и "Авторизоваться":
            // - Если пользователь авторизован → ВСЕГДА показываем "Добавить" и "Заменить"
            // - Если пользователь НЕ авторизован и (дефолтный набор выбран ИЛИ доступен Draft) → показываем "Добавить" и "Заменить"
            // - Если пользователь НЕ авторизован и ни дефолтный набор не выбран, ни Draft не доступен → показываем "Авторизоваться"
            if (this.isAuthenticated) {
                // Пользователь авторизован - всегда показываем кнопки "Добавить" и "Заменить"
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
                // Пользователь НЕ авторизован, но дефолтный набор или Draft выбран - показываем кнопки "Добавить" и "Заменить"
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
                // Пользователь НЕ авторизован и ни дефолтный набор не выбран, ни Draft не выбран - показываем "Авторизоваться"
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
         * Инициировать авторизацию через Google OAuth
         * Использует тот же подход, что и auth-modal-body (принцип ЕИП)
         */
        async handleOpenAuth() {
            try {
                if (!window.authClient || !window.authState) {
                    console.error('coin-set-load-modal-body: authClient или authState не загружен');
                    return;
                }

                // Устанавливаем состояние загрузки в централизованное хранилище
                window.authState.setLoading(true);

                // Инициируем авторизацию через Google OAuth (ЕИП: используем тот же метод, что и auth-modal-body)
                window.authClient.initiateGoogleAuth();

                // Обработка postMessage от popup окна OAuth callback (ЕИП: используем тот же подход, что и auth-modal-body)
                const handleOAuthMessage = async (event) => {
                    if (event.data && event.data.type === 'oauth-callback' && event.data.success) {
                        try {
                            const tokenData = event.data.token;

                            if (tokenData && tokenData.access_token) {
                                // Сохраняем токен через auth-client
                                if (window.authClient && window.authClient.saveToken) {
                                    await window.authClient.saveToken(tokenData);
                                }

                                // Обновляем централизованное состояние авторизации (синхронизирует все экземпляры)
                                // Проверяем статус авторизации через auth-state
                                if (window.authState && typeof window.authState.checkAuthStatus === 'function') {
                                    await window.authState.checkAuthStatus();
                                }

                                // Перезагружаем список наборов монет после успешной авторизации
                                await this.loadCoinSets(true);

                                // Удаляем обработчик после успешной авторизации
                                window.removeEventListener('message', handleOAuthMessage);
                            }
                        } catch (error) {
                            console.error('coin-set-load-modal-body.handleOAuthMessage error:', error);
                        } finally {
                            window.authState.setLoading(false);
                            // Обновляем состояние кнопок после авторизации
                            this.updateButtonsState();
                        }
                    }
                };

                window.addEventListener('message', handleOAuthMessage);

                // Таймаут для удаления обработчика (на случай если окно закрыто без авторизации)
                setTimeout(() => {
                    window.removeEventListener('message', handleOAuthMessage);
                    window.authState.setLoading(false);
                    this.updateButtonsState();
                }, 5 * 60 * 1000); // 5 минут

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
         * Загрузить локальный набор "Draft" из localStorage
         * Всегда берет актуальные данные из localStorage для корректного отображения количества монет
         * Если Draft набор не существует, создает пустой объект для отображения
         */
        loadDraftSet() {
            if (window.draftCoinSet) {
                // Всегда получаем свежие данные из localStorage
                const loadedDraftSet = window.draftCoinSet.get();

                // Если Draft набор не существует, создаем пустой объект для отображения
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
                    // Обновляем draftSet реактивно
                    this.draftSet = loadedDraftSet;
                    // Обновляем поле ввода тикеров значением из localStorage
                    // ВСЕГДА обновляем поле ввода, чтобы оно соответствовало данным в localStorage
                    const newTickers = loadedDraftSet.tickers || '';

                    // ВСЕГДА обновляем поле ввода значением из localStorage для синхронизации
                    this.draftTickersInput = newTickers;
                }
            } else {
                // Если draftCoinSet не загружен, создаем пустой объект для отображения
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
         * Загрузить локальный служебный набор "Ban" из localStorage
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
         * Загрузить автонаборы (стейблкоины, обертки, LST) из localStorage
         */
        loadAutoSets() {
            if (!window.autoCoinSets) {
                console.warn('coin-set-load-modal-body: autoCoinSets не загружен');
                return;
            }

            const autoSetsData = window.autoCoinSets.getAllAutoSets();

            this.autoSets = [
                {
                    id: 'auto-stablecoins',
                    name: 'Стейблкоины',
                    description: 'Автоматический сбор стейблкоинов из загруженных монет',
                    // icon: 'account_balance',
                    coins: autoSetsData.stablecoins,
                    coin_ids: autoSetsData.stablecoins.map(c => c.id)
                },
                {
                    id: 'auto-wrapped',
                    name: 'Обертки (Wrapped)',
                    description: 'Автоматический сбор wrapped-токенов из загруженных монет',
                    // icon: 'repeat',
                    coins: autoSetsData.wrapped,
                    coin_ids: autoSetsData.wrapped.map(c => c.id)
                },
                {
                    id: 'auto-lst',
                    name: 'LST (Liquid Staking)',
                    description: 'Автоматический сбор LST-токенов из загруженных монет',
                    // icon: 'local_fire_department',
                    coins: autoSetsData.lst,
                    coin_ids: autoSetsData.lst.map(c => c.id)
                }
            ];

            console.log(`coin-set-load-modal-body: загружено ${this.autoSets.length} автонаборов`);
        },

        /**
         * Обработка ввода тикеров в поле Draft
         */
        handleDraftTickersInput() {
            // Обновляем состояние кнопок при изменении поля ввода
            this.$nextTick(() => {
                this.updateButtonsState();
            });
        },

        /**
         * Обработка ввода тикеров в поле Ban
         */
        handleBanTickersInput() {
            this.$nextTick(() => {
                this.updateButtonsState();
            });
        },

        /**
         * Загрузить монеты по тикерам из поля ввода Draft
         */
        async loadDraftFromTickers() {
            if (!this.draftTickersInput || this.draftTickersInput.trim().length === 0) {
                return;
            }

            if (!window.dataProviderManager) {
                console.error('coin-set-load-modal-body: dataProviderManager не загружен');
                if (window.messagesStore) {
                    window.messagesStore.addMessage({
                        type: 'danger',
                        text: 'Ошибка: модули данных не загружены',
                        scope: 'global',
                        duration: 5000
                    });
                }
                return;
            }

            this.draftLoading = true;

            try {
                // Парсим тикеры из строки (разделитель: запятая) и сразу удаляем дубликаты через Set
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

                // Загружаем максимальные наборы из кэша для поиска монет по тикерам
                const cacheKeyMarketCap = 'top-coins-by-market-cap';
                const cacheKeyVolume = 'top-coins-by-volume';

                let coinsMarketCap = await window.cacheManager.get(cacheKeyMarketCap);
                let coinsVolume = await window.cacheManager.get(cacheKeyVolume);

                // Если кэш пуст, загружаем из API
                if (!coinsMarketCap) {
                    coinsMarketCap = await window.dataProviderManager.getTopCoins(250, 'market_cap');
                    await window.cacheManager.set(cacheKeyMarketCap, coinsMarketCap);
                }

                if (!coinsVolume) {
                    coinsVolume = await window.dataProviderManager.getTopCoins(250, 'volume');
                    await window.cacheManager.set(cacheKeyVolume, coinsVolume);
                }

                // Объединяем оба набора в один Map для поиска по тикеру
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

                // Находим монеты по тикерам и исключаем дубликаты объектов монет
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

                // Сохраняем найденные монеты в Draft набор
                const coinIds = foundCoins.map(coin => coin.id);

                // Извлекаем тикеры из найденных монет и сортируем по алфавиту
                const tickersString = foundCoins
                    .map(coin => coin.symbol || coin.id)
                    .filter(Boolean)
                    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
                    .join(', ');

                if (window.draftCoinSet) {
                    window.draftCoinSet.save(coinIds, foundCoins);
                }

                // Обновляем поле ввода тикеров напрямую (реактивно) - это гарантирует немедленное отображение
                this.draftTickersInput = tickersString;

                // Обновляем локальное состояние (перезагружаем из localStorage для корректного отображения количества)
                // Тикеры будут автоматически отсортированы по алфавиту в loadDraftSet()
                this.loadDraftSet();

                // Обновляем состояние кнопок после загрузки Draft набора
                this.$nextTick(() => {
                    this.updateButtonsState();
                });

                // Показываем сообщение об успехе
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

                // НЕ выбираем Draft автоматически - пользователь сам решит, нужно ли его загружать

            } catch (error) {
                console.error('coin-set-load-modal-body: ошибка загрузки Draft по тикерам:', error);
                if (window.messagesStore) {
                    window.messagesStore.addMessage({
                        type: 'danger',
                        text: `Ошибка загрузки: ${error.message || 'Неизвестная ошибка'}`,
                        scope: 'global',
                        duration: 5000
                    });
                }
            } finally {
                this.draftLoading = false;
            }
        },

        /**
         * Сохранить служебный Ban список по тикерам
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
                console.error('coin-set-load-modal-body: ошибка сохранения Ban списка:', error);
            } finally {
                this.banLoading = false;
            }
        },

        /**
         * Загрузить список наборов монет
         * @param {boolean} forceAuth - Принудительно считать пользователя авторизованным (для обхода race condition)
         */
        async loadCoinSets(forceAuth = false) {
            if (!window.coinSetsClient) {
                // coin-sets-client не загружен - не критично, дефолтный набор всё равно будет доступен
                console.warn('coin-set-load-modal-body: coin-sets-client не загружен');
                this.coinSets = [];
                this.loading = false;
                return;
            }

            // Проверяем авторизацию (используем forceAuth для обхода race condition)
            const isAuth = forceAuth || (this.authState && this.authState.isAuthenticated === true);

            if (!isAuth) {
                // Пользователь не авторизован - показываем только дефолтный набор
                console.info('coin-set-load-modal-body: пользователь не авторизован, показываем только дефолтный набор');
                this.coinSets = [];
                this.loading = false;
                this.error = null; // Не показываем ошибку, это нормальная ситуация
                return;
            }

            this.loading = true;
            this.error = null;

            try {
                const sets = await window.coinSetsClient.getCoinSets({ activeOnly: true }); // Только активные
                this.coinSets = sets || [];
                // Обновляем состояние кнопок после загрузки наборов
                this.$nextTick(() => {
                    this.updateButtonsState();
                });
            } catch (error) {
                console.error('coin-set-load-modal-body: ошибка загрузки наборов:', error);
                // Не показываем ошибку авторизации, она уже обработана выше
                if (!error.message || !error.message.includes('авторизован')) {
                    this.error = error.message || 'Ошибка загрузки наборов монет';
                }
                this.coinSets = [];
            } finally {
                this.loading = false;
                // Обновляем состояние кнопок после завершения загрузки
                this.updateButtonsState();
            }
        },

        /**
         * Обработка ввода в поле количества монет (с debounce для предотвращения спама)
         */
        handleCountInput(event) {
            // Очищаем предыдущий таймер
            if (this.validationTimeout) {
                clearTimeout(this.validationTimeout);
            }

            // Устанавливаем новый таймер (500мс задержка)
            this.validationTimeout = setTimeout(() => {
                this.updateDefaultSet();
            }, 500);
        },

        /**
         * Обновить дефолтный набор (при изменении настроек)
         */
        updateDefaultSet() {
            // Дефолтный набор обновляется динамически при загрузке, здесь только валидация
            if (this.defaultCount < 1) {
                this.defaultCount = 1;
            }

            if (this.defaultCount > 250) {
                this.defaultCount = 250;
                // Предупреждение убрано по запросу пользователя (не успевает выводиться)
            }
        },

        /**
         * Сбросить состояние визуального прогресса
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
         * Обновить визуальный прогресс загрузки
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
                    text = `PostgreSQL: ${pgLoaded} монет загружено`;
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
                    // Сразу пишем полученный чанк в PostgreSQL
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
                    text = `Готово: ${loaded}/${total || loaded} монет загружено.`;
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

                // Countdown секунд
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

                // Плавная анимация полоски: 0→100% за delayMs миллисекунд через RAF
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
         * Отправить чанк монет из CoinGecko в PostgreSQL (fire-and-forget)
         * Вызывается при каждом chunk-success от CoinGecko
         * @param {Array} coins - нормализованные монеты (формат приложения)
         */
        pushChunkToDb(coins) {
            if (!Array.isArray(coins) || coins.length === 0) return;
            const base = window.cloudflareConfig
                ? (window.cloudflareConfig.getAuthBaseUrl?.() || window.cloudflareConfig.getWorkersBaseUrl?.())
                : null;
            // Используем Yandex API Gateway напрямую (не через Cloudflare)
            const API_GATEWAY = 'https://d5dl2ia43kck6aqb1el5.k1mxzkh0.apigw.yandexcloud.net';
            const url = `${API_GATEWAY}/api/coins/market-cache`;

            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ coins })
            })
            .then(r => r.json())
            .then(data => {
                if (data.upserted > 0) {
                    // Сигнализируем корневому компоненту обновить счётчик БД
                    if (window.eventBus) {
                        window.eventBus.emit('db-coins-upserted', { count: data.upserted });
                    }
                }
            })
            .catch(err => {
                console.warn('coin-set-load-modal-body: ошибка записи чанка в БД:', err.message);
            });
        },

        /**
         * Обработка добавления выбранных наборов монет к текущему списку
         */
        async handleAdd() {
            await this.loadSelectedSets({ merge: true });
        },

        /**
         * Обработка замены текущего списка монет выбранными наборами
         */
        async handleReplace() {
            await this.loadSelectedSets({ merge: false });
        },

        /**
         * Загрузка выбранных наборов монет с опцией мерджа
         * @param {Object} options - опции загрузки
         * @param {boolean} options.merge - если true, монеты добавляются к текущим, если false - заменяют
         */
        async loadSelectedSets(options = {}) {
            const { merge = false } = options;

            this.loadingSet = true;
            this.updateButtonsState(); // Обновляем состояние кнопок (disabled во время загрузки)

            // Сбрасываем прогресс перед началом загрузки любого набора
            this.resetDefaultSetProgress();

            try {
                await this._performLoad(merge);
            } catch (error) {
                console.error('coin-set-load-modal-body: ошибка загрузки наборов:', error);
                if (window.messagesStore) {
                    window.messagesStore.addMessage({
                        type: 'danger',
                        text: `Ошибка загрузки: ${error.message || 'Неизвестная ошибка'}`,
                        scope: 'global',
                        duration: 5000
                    });
                }
            } finally {
                this.loadingSet = false;
                this.updateButtonsState(); // Восстанавливаем состояние кнопок
            }
        },

        /**
         * Внутренний метод для выполнения загрузки
         * @param {boolean} merge - если true, монеты добавляются к текущим
         */
        async _performLoad(merge) {
            const selectedSets = [];

            // Проверяем, выбран ли дефолтный набор
            const hasDefault = this.selectedSetIds.includes('default');

            // Проверяем, выбран ли Draft набор чекбоксом
            const hasDraft = this.selectedSetIds.includes('draft');

            // Если нет выбранных наборов, ничего не делаем
            if (this.selectedSetIds.length === 0) {
                this.resetDefaultSetProgress();
                return;
            }

            // Если дефолтный набор не выбран — сбрасываем его прогресс
            if (!hasDefault) {
                this.resetDefaultSetProgress();
            }

            // Обработка дефолтного набора
            if (hasDefault) {
                // Загружаем данные для дефолтного набора из кэша максимальных наборов
                // ВАЖНО: Перед открытием набора ВСЕГДА обновляем кэш для актуальности
                try {
                    if (!window.cacheManager || !window.dataProviderManager) {
                        throw new Error('cacheManager или dataProviderManager не загружены');
                    }

                    // Определяем ключ кэша в зависимости от критерия сортировки
                    const cacheKey = this.defaultSortBy === 'market_cap'
                        ? 'top-coins-by-market-cap'
                        : 'top-coins-by-volume';

                    const cachedBeforeRefresh = await window.cacheManager.get(cacheKey);
                    let coinsFullSet = null;

                    // Skill anchor: визуальный прогресс обязателен для chunked загрузки Top-N на file://.
                    // See a/skills/app/skills/integrations/integrations-data-providers.md
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
                        // Skill anchor: принудительный chunking + progress callback защищает UX и снижает риск 429 циклов.
                        // See a/skills/app/skills/integrations/integrations-data-providers.md
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

                    // Берем нужное количество монет из полного набора
                    const coins = coinsFullSet.slice(0, this.defaultCount);

                    console.log(`coin-set-load-modal-body: загружено ${coins.length} монет из кэша ${cacheKey} (всего в кэше: ${coinsFullSet.length})`);

                    // Создаем виртуальный набор из актуальных данных
                    // ВАЖНО: передаем не только coin_ids, но и полные данные монет
                    selectedSets.push({
                        id: 'default',
                        name: `Актуальные рейтинги рынка (${coins.length} монет, ${this.defaultSortBy === 'market_cap' ? 'по капитализации' : 'по объему'})`,
                        description: 'Актуальные данные с рынка',
                        coin_ids: coins.map(coin => coin.id),
                        coins: coins, // Полные данные монет для загрузки в this.coins
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
                            text: `Ошибка загрузки дефолтного набора: ${error.message || 'Неизвестная ошибка'}`,
                            scope: 'global',
                            duration: 5000
                        });
                    }
                    // НЕ прерываем выполнение - продолжаем обработку других наборов (если они выбраны)
                }
            }

            // Обработка локального набора "Draft" (если выбран чекбоксом)
            if (hasDraft) {
                try {
                    if (!window.cacheManager || !window.dataProviderManager) {
                        throw new Error('cacheManager или dataProviderManager не загружены');
                    }

                    // ВАЖНО: Перед загрузкой Draft набора всегда обновляем его из localStorage
                    // Это гарантирует, что мы используем актуальные данные, а не устаревшие из this.draftSet
                    this.loadDraftSet();

                    // Используем Draft набор из localStorage (если есть) или загружаем по тикерам из поля ввода
                    const draftCoinIds = this.draftSet && this.draftSet.coin_ids ? this.draftSet.coin_ids : [];
                    const draftCoinsData = this.draftSet && this.draftSet.coins ? this.draftSet.coins : null;

                    if (draftCoinIds.length === 0 && draftCoinsData && draftCoinsData.length === 0) {
                        // Если Draft набор пуст, но есть тикеры в поле ввода - пытаемся загрузить
                        if (this.draftTickersInput && this.draftTickersInput.trim().length > 0) {
                            // Загружаем по тикерам из поля ввода
                            await this.loadDraftFromTickers();
                            // После загрузки обновляем draftSet
                            this.loadDraftSet();
                            // Используем обновленные данные
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
                            // НЕ выходим - продолжаем обработку других наборов
                        } else {
                            console.warn('coin-set-load-modal-body: Draft набор пуст и нет тикеров для загрузки');
                            // НЕ выходим - продолжаем обработку других наборов
                        }
                    } else if (draftCoinIds.length > 0 || (draftCoinsData && draftCoinsData.length > 0)) {
                        // Если набор содержит полные данные монет - используем их
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
                            // Загружаем полные данные из кэша или API
                            const cacheKeyMarketCap = 'top-coins-by-market-cap';
                            const cacheKeyVolume = 'top-coins-by-volume';

                            let coinsMarketCap = await window.cacheManager.get(cacheKeyMarketCap);
                            let coinsVolume = await window.cacheManager.get(cacheKeyVolume);

                            // Если кэш пуст, загружаем из API
                            if (!coinsMarketCap) {
                                coinsMarketCap = await window.dataProviderManager.getTopCoins(250, 'market_cap');
                                await window.cacheManager.set(cacheKeyMarketCap, coinsMarketCap);
                            }

                            if (!coinsVolume) {
                                coinsVolume = await window.dataProviderManager.getTopCoins(250, 'volume');
                                await window.cacheManager.set(cacheKeyVolume, coinsVolume);
                            }

                            // Объединяем оба набора в один Map для поиска по ID
                            const coinsMap = new Map();
                            if (coinsMarketCap) {
                                coinsMarketCap.forEach(coin => coinsMap.set(coin.id, coin));
                            }
                            if (coinsVolume) {
                                coinsVolume.forEach(coin => coinsMap.set(coin.id, coin));
                            }

                            // Находим монеты из Draft набора
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
                                // Обновляем тикеры в Draft наборе при загрузке полных данных
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
                                    console.warn(`coin-set-load-modal-body: не найдены данные для ${missingIds.length} монет из Draft набора:`, missingIds);
                                }
                            } else {
                                throw new Error('Не удалось загрузить данные монет для Draft набора');
                            }
                        }
                    }
                } catch (error) {
                    console.error('coin-set-load-modal-body: ошибка загрузки Draft набора:', error);
                    if (window.messagesStore) {
                        window.messagesStore.addMessage({
                            type: 'warning',
                            text: `Ошибка загрузки Draft набора: ${error.message || 'Неизвестная ошибка'}`,
                            scope: 'global',
                            duration: 5000
                        });
                    }
                }
            }

            // Обработка автонаборов (стейблкоины, обертки, LST)
            const autoSetIds = this.selectedSetIds.filter(id => typeof id === 'string' && id.startsWith('auto-'));
            if (autoSetIds.length > 0) {
                const autoSetsToLoad = this.autoSets.filter(set => autoSetIds.includes(set.id));
                selectedSets.push(...autoSetsToLoad);
                console.log(`coin-set-load-modal-body: добавлено ${autoSetsToLoad.length} автонаборов для объединения`);
            }

            // Добавляем сохраненные наборы (исключаем 'default', 'draft' и автонаборы из selectedSetIds)
            const savedSetIds = this.selectedSetIds.filter(id => id !== 'default' && id !== 'draft' && !(typeof id === 'string' && id.startsWith('auto-')));
            if (savedSetIds.length > 0) {
                const savedSets = this.coinSets.filter(set => savedSetIds.includes(set.id));
                selectedSets.push(...savedSets);
                console.log(`coin-set-load-modal-body: добавлено ${savedSets.length} сохраненных наборов для объединения`);
            }

            if (selectedSets.length === 0) {
                console.warn('coin-set-load-modal-body: нет наборов для загрузки после обработки');
                return;
            }

            console.log(`coin-set-load-modal-body: ${merge ? 'добавляем' : 'загружаем'} ${selectedSets.length} наборов (${selectedSets.map(s => s.name).join(', ')})`);

            if (this.onLoad) {
                this.onLoad(selectedSets, { 
                    merge,
                    onProgress: (payload) => this.updateDefaultSetProgress(payload)
                });
            }
        },

        /**
         * Обработка удаления выбранных наборов
         */
        async handleDelete() {
            if (this.selectedSetIds.length === 0) {
                return;
            }

            // Исключаем дефолтный набор, Draft и автонаборы из удаления (они неудаляемые)
            const idsToDelete = this.selectedSetIds.filter(id => id !== 'default' && id !== 'draft' && !id.startsWith('auto-'));

            if (idsToDelete.length === 0) {
                // Если выбран только дефолтный набор, Draft или автонаборы - ничего не удаляем
                return;
            }

            if (this.onDelete) {
                await this.onDelete(idsToDelete);
                // Обновляем список после удаления (ВАЖНО: используем forceAuth=true, так как пользователь уже авторизован)
                await this.loadCoinSets(true);
                // Очищаем выбор
                this.selectedSetIds = [];
                this.updateButtonsState();
            }
        }
    }
};
