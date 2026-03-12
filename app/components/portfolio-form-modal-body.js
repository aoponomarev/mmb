/**
 * #JS-dc3EKYZn
 * @description Portfolio form modal body (D.2); create/edit form built on the shared portfolio-segment-table shell.
 * @skill id:sk-c3d639
 */

(function() {
    'use strict';

    window.portfolioFormModalBody = {
        template: `
            <div class="portfolio-form-modal">
                <!-- Main portfolio parameters -->
                <div class="mb-3">
                    <label class="form-label small text-muted mb-1">Название портфеля *</label>
                    <div class="d-flex align-items-center gap-2">
                        <input
                            type="text"
                            class="form-control form-control-sm"
                            v-model="portfolioName"
                            placeholder="Напр: Топ-10 Median"
                            @input="handleFormChange"
                        >
                        <cmp-button
                            v-if="!initialData"
                            label="5+5"
                            variant="outline-secondary"
                            size="xs"
                            @click="handleAutoSelect"
                        ></cmp-button>
                    </div>
                </div>

                <!-- Build settings -->
                <div class="mb-3">
                    <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
                        <div class="d-flex align-items-center gap-2">
                            <span class="small text-muted">Веса:</span>
                            <cmp-button-group
                                :buttons="[
                                    { type: 'radio', label: 'Equal', active: weightMode === 'equal', value: 'equal' },
                                    { type: 'radio', label: 'AGR', active: weightMode === 'agr', value: 'agr' }
                                ]"
                                variant="outline-secondary"
                                @button-toggle="data => { weightMode = data.button.value; handleWeightModeChange(); }"
                            ></cmp-button-group>
                        </div>
                        <div class="d-flex align-items-center gap-2">
                            <span class="small text-muted">Баланс:</span>
                            <cmp-button-group
                                :buttons="[
                                    { type: 'radio', label: 'Auto', active: balanceMode === 'auto', value: 'auto' },
                                    { type: 'radio', label: 'Custom', active: balanceMode === 'custom', value: 'custom' }
                                ]"
                                variant="outline-secondary"
                                @button-toggle="data => { balanceMode = data.button.value; handleBalanceModeChange(); }"
                            ></cmp-button-group>
                        </div>
                    </div>
                </div>

                <!-- Coin list (Long/Short) -->
                <div class="row g-3 mb-2">
                    <div class="col-md-6">
                        <portfolio-segment-table
                            side="long"
                            title="Long"
                            :count="longCoins.length"
                            :columns="buildSegmentColumns(true)"
                        >
                            <template #rows>
                                <tr v-for="coin in longCoins" :key="coin.coinId">
                                    <td class="align-middle">
                                        <cmp-cell-num :value="coin.metrics?.agr" :precision="1" :colored="true" :class="{'fw-bold': coin.isLocked}"></cmp-cell-num>
                                    </td>
                                    <td class="text-center align-middle text-muted">{{ getCoinKeyMetricLabel(coin) }}</td>
                                    <td class="align-middle">
                                        <div
                                            :class="['cursor-pointer', coin.isLocked ? 'fw-bold text-success' : '']"
                                            :title="coin.isLocked ? 'Сбросить к весу по умолчанию' : (isLastUnlockedInSegment(coin) ? 'Этот тикер балансирует сумму сегмента' : '')"
                                            @click="coin.isLocked ? resetCoinWeight(coin) : null"
                                        >{{ coin.ticker }}</div>
                                    </td>
                                    <td class="align-middle">
                                        <input
                                            type="number"
                                            class="form-control form-control-sm text-center p-1"
                                            :class="[
                                                coin.isLocked ? 'fw-bold text-success' : '',
                                                isLastUnlockedInSegment(coin) ? 'bg-body-secondary text-muted border-dashed' : ''
                                            ]"
                                            v-model.number="coin.portfolioPercent"
                                            :readonly="coin.isDisabledInRebalance || isLastUnlockedInSegment(coin)"
                                            :min="1"
                                            :max="100"
                                            @input="handleWeightInput(coin)">
                                    </td>
                                    <td class="align-middle portfolio-segment-table-col-shrink">
                                        <div v-if="!initialData" class="portfolio-segment-action-dropdown dropdown">
                                            <i
                                                class="fas fa-times text-body-secondary opacity-50 cursor-pointer"
                                                data-bs-toggle="dropdown"
                                                aria-expanded="false"></i>
                                            <ul class="portfolio-segment-action-menu dropdown-menu dropdown-menu-end dropdown-menu-sm">
                                                <li>
                                                    <button class="dropdown-item" type="button" @click="removeCoin(coin.coinId)">
                                                        Удалить из портфеля
                                                    </button>
                                                </li>
                                                <li>
                                                    <button class="dropdown-item text-danger" type="button" @click="banCoin(coin)">
                                                        Поместить в бан
                                                    </button>
                                                </li>
                                            </ul>
                                        </div>
                                        <input
                                            v-else
                                            type="checkbox"
                                            class="form-check-input"
                                            :checked="!coin.isDisabledInRebalance"
                                            :title="coin.isDisabledInRebalance ? 'Включить монету в ребаланс' : 'Отключить (вес 1%)'"
                                            @change="toggleCoinRebalance(coin, $event.target.checked)">
                                    </td>
                                </tr>
                            </template>
                            <template #summary>
                                <span class="text-muted">Long:</span>
                                <div style="width: 60px;">
                                    <input
                                        type="number"
                                        class="form-control form-control-xs text-center p-0 fw-bold text-success border-success border-opacity-25"
                                        :class="balanceMode !== 'custom' ? 'border-transparent bg-transparent shadow-none pe-none' : ''"
                                        v-model.number="customLongPercent"
                                        min="0"
                                        max="100"
                                        :readonly="balanceMode !== 'custom'"
                                        :tabindex="balanceMode !== 'custom' ? -1 : 0"
                                        @input="handleSegmentWeightInput(true)"
                                    >
                                </div>
                            </template>
                        </portfolio-segment-table>
                    </div>

                    <div class="col-md-6">
                        <portfolio-segment-table
                            side="short"
                            title="Short"
                            :count="shortCoins.length"
                            :columns="buildSegmentColumns(true)"
                        >
                            <template #rows>
                                <tr v-for="coin in shortCoins" :key="coin.coinId">
                                    <td class="align-middle">
                                        <cmp-cell-num :value="coin.metrics?.agr" :precision="1" :colored="true" :class="{'fw-bold': coin.isLocked}"></cmp-cell-num>
                                    </td>
                                    <td class="text-center align-middle text-muted">{{ getCoinKeyMetricLabel(coin) }}</td>
                                    <td class="align-middle">
                                        <div
                                            :class="['cursor-pointer', coin.isLocked ? 'fw-bold text-danger' : '']"
                                            :title="coin.isLocked ? 'Сбросить к весу по умолчанию' : (isLastUnlockedInSegment(coin) ? 'Этот тикер балансирует сумму сегмента' : '')"
                                            @click="coin.isLocked ? resetCoinWeight(coin) : null"
                                        >{{ coin.ticker }}</div>
                                    </td>
                                    <td class="align-middle">
                                        <input
                                            type="number"
                                            class="form-control form-control-sm text-center p-1"
                                            :class="[
                                                coin.isLocked ? 'fw-bold text-danger' : '',
                                                isLastUnlockedInSegment(coin) ? 'bg-body-secondary text-muted border-dashed' : ''
                                            ]"
                                            v-model.number="coin.portfolioPercent"
                                            :readonly="coin.isDisabledInRebalance || isLastUnlockedInSegment(coin)"
                                            :min="1"
                                            :max="100"
                                            @input="handleWeightInput(coin)">
                                    </td>
                                    <td class="align-middle portfolio-segment-table-col-shrink">
                                        <div v-if="!initialData" class="portfolio-segment-action-dropdown dropdown">
                                            <i
                                                class="fas fa-times text-body-secondary opacity-50 cursor-pointer"
                                                data-bs-toggle="dropdown"
                                                aria-expanded="false"></i>
                                            <ul class="portfolio-segment-action-menu dropdown-menu dropdown-menu-end dropdown-menu-sm">
                                                <li>
                                                    <button class="dropdown-item" type="button" @click="removeCoin(coin.coinId)">
                                                        Удалить из портфеля
                                                    </button>
                                                </li>
                                                <li>
                                                    <button class="dropdown-item text-danger" type="button" @click="banCoin(coin)">
                                                        Поместить в бан
                                                    </button>
                                                </li>
                                            </ul>
                                        </div>
                                        <input
                                            v-else
                                            type="checkbox"
                                            class="form-check-input"
                                            :checked="!coin.isDisabledInRebalance"
                                            :title="coin.isDisabledInRebalance ? 'Включить монету в ребаланс' : 'Отключить (вес 1%)'"
                                            @change="toggleCoinRebalance(coin, $event.target.checked)">
                                    </td>
                                </tr>
                            </template>
                            <template #summary>
                                <span class="text-muted">Short:</span>
                                <div style="width: 60px;">
                                    <input
                                        type="number"
                                        class="form-control form-control-xs text-center p-0 fw-bold text-danger border-danger border-opacity-25"
                                        :class="balanceMode !== 'custom' ? 'border-transparent bg-transparent shadow-none pe-none' : ''"
                                        v-model.number="customShortPercent"
                                        min="0"
                                        max="100"
                                        :readonly="balanceMode !== 'custom'"
                                        :tabindex="balanceMode !== 'custom' ? -1 : 0"
                                        @input="handleSegmentWeightInput(false)"
                                    >
                                </div>
                            </template>
                        </portfolio-segment-table>
                    </div>
                </div>

                <!-- Summary stats (hidden per request, kept for validation) -->
                <div v-if="Math.abs(totalPercent - 100) > 0.01" class="p-1 small text-center">
                    <span class="text-warning fw-bold">Warning: распределено {{ totalPercent }}% (требуется 100%)</span>
                </div>
            </div>
        `,

        inject: ['modalApi'],

        components: {
            'cmp-button': window.cmpButton,
            'cmp-button-group': window.cmpButtonGroup,
            'cmp-cell-num': window.cmpCellNum,
            'portfolio-segment-table': window.portfolioSegmentTable
        },

        props: {
            allCoins: {
                type: Array,
                required: true,
                default: () => []
            },
            // IDs of coins pre-selected in table (checkboxes)
            preselectedCoinIds: {
                type: Array,
                required: false,
                default: () => []
            },
            preselectedCoinKeyMetrics: {
                type: Object,
                required: false,
                default: () => ({})
            },
            onSave: {
                type: Function,
                required: true
            },
            // Initial data for edit mode (D.4)
            initialData: {
                type: Object,
                required: false,
                default: null
            }
        },

        data() {
            return {
                portfolioName: this.initialData ? this.initialData.name : '',
                balanceMode: this.initialData
                    ? (this.initialData.settings?.balanceMode || (this.initialData.settings?.mode === 'custom' ? 'custom' : 'auto'))
                    : 'auto',
                weightMode: this.initialData
                    ? (this.initialData.settings?.mode === 'agr' ? 'agr' : 'equal')
                    : 'equal',
                selectedCoins: this.initialData ? JSON.parse(JSON.stringify(this.initialData.coins)) : [],
                isSaved: false,
                isNameManuallyEdited: !!this.initialData, // When editing existing, assume name already set
                creationTimestamp: new Date(),
                customLongPercent: 0,
                customShortPercent: 0
            };
        },

        computed: {
            totalPercent() {
                return this.selectedCoins.reduce((sum, c) => sum + (Number(c.portfolioPercent) || 0), 0);
            },
            longCoins() {
                return (this.selectedCoins || []).filter(c => (c.metrics?.agr || 0) >= 0);
            },
            shortCoins() {
                return (this.selectedCoins || []).filter(c => (c.metrics?.agr || 0) < 0);
            },
            isValid() {
                return this.portfolioName.trim().length > 0 && this.selectedCoins.length > 0;
            }
        },

        watch: {
            selectedCoins: {
                deep: true,
                handler() {
                    this.updateDefaultName();
                    // IMPORTANT: In custom mode do NOT update customLongPercent/customShortPercent here.
                    // Segment total weight in Custom mode is a hard constraint
                    // that changes only manually via segment input.
                    if (this.balanceMode !== 'custom') {
                        this.customLongPercent = this.segmentTotalPercent(true);
                        this.customShortPercent = this.segmentTotalPercent(false);
                    }
                }
            },
            portfolioName(newVal, oldVal) {
                // If new value differs from auto-generated, user edited it manually
                const autoName = this.generateDefaultName();
                if (newVal !== autoName && oldVal === autoName) {
                    this.isNameManuallyEdited = true;
                }
            }
        },

        mounted() {
            this.registerButtons();
            this.normalizeSelectedCoinsForDomain();

            // If edit mode (D.4) — coins already loaded from initialData
            // If pre-selected coins from table — use them
            // Else — auto-select top 5+5
            if (!this.initialData) {
                if (this.preselectedCoinIds && this.preselectedCoinIds.length > 0) {
                    this.initFromPreselected();
                } else {
                    this.handleAutoSelect();
                }
            } else {
                // Rebalance/edit mode: enforce domain invariants on existing portfolio snapshot.
                this.applyWeights();
            }

            // Initialize custom weights
            this.customLongPercent = this.segmentTotalPercent(true);
            this.customShortPercent = this.segmentTotalPercent(false);

            this.updateSaveButton();
        },

        beforeUnmount() {
        },

        methods: {
            /**
             * Handle weight mode change
             */
            handleBalanceModeChange() {
                if (this.balanceMode === 'custom') {
                    this.customLongPercent = this.segmentTotalPercent(true);
                    this.customShortPercent = this.segmentTotalPercent(false);
                }
                this.applyWeights();
            },
            handleWeightModeChange() {
                this.applyWeights();
            },

            /**
             * Handle segment weight input
             */
            handleSegmentWeightInput(isLong) {
                if (this.balanceMode !== 'custom') {
                    this.customLongPercent = this.segmentTotalPercent(true);
                    this.customShortPercent = this.segmentTotalPercent(false);
                    return;
                }
                if (isLong) {
                    this.customLongPercent = Math.max(0, Math.min(100, Math.round(Number(this.customLongPercent) || 0)));
                    this.customShortPercent = 100 - this.customLongPercent;
                } else {
                    this.customShortPercent = Math.max(0, Math.min(100, Math.round(Number(this.customShortPercent) || 0)));
                    this.customLongPercent = 100 - this.customShortPercent;
                }
                this.applyWeights();
            },

            /**
             * Check if coin is last unlocked in its segment
             * (In Custom mode such coin becomes balancer and readonly)
             */
            isLastUnlockedInSegment(coin) {
                if (this.balanceMode !== 'custom') return false;
                
                const isLong = (coin.metrics?.agr || 0) >= 0;
                const segmentCoins = this.selectedCoins.filter(c => 
                    isLong ? (c.metrics?.agr || 0) >= 0 : (c.metrics?.agr || 0) < 0
                );
                
                // If segment has only one coin - it's always readonly balancer
                if (segmentCoins.length <= 1) return true;
                
                const unlocked = segmentCoins.filter(c => !c.isLocked && !c.isDisabledInRebalance);
                
                // If this coin is unlocked and is the only one in segment
                return !coin.isLocked && !coin.isDisabledInRebalance && unlocked.length === 1;
            },

            /**
             * Reset coin weight to default (removes lock)
             */
            resetCoinWeight(coin) {
                coin.isLocked = false;
                this.applyWeights();
            },

            /**
             * Calculate segment total percent
             */
            segmentTotalPercent(isLong) {
                const coins = this.selectedCoins.filter(c => isLong ? (c.metrics?.agr || 0) >= 0 : (c.metrics?.agr || 0) < 0);
                const sum = coins.reduce((acc, c) => acc + (Number(c.portfolioPercent) || 0), 0);
                return Math.round(sum * 100) / 100;
            },
            registerButtons() {
                if (!this.modalApi) return;

                this.modalApi.registerButton('cancel', {
                    label: 'Отмена',
                    variant: 'secondary',
                    locations: ['footer'],
                    classesAdd: { root: 'me-auto' },
                    onClick: () => this.modalApi.hide()
                });

                this.modalApi.registerButton('save', {
                    label: this.initialData ? 'Сохранить изменения' : 'Создать портфель',
                    variant: 'primary',
                    locations: ['footer'],
                    disabled: true,
                    onClick: () => this.handleSave()
                });
            },

            updateSaveButton() {
                if (!this.modalApi) return;

                const saveBtn = this.modalApi.getButton('save');

                if (this.isSaved) {
                    this.modalApi.updateButton('save', {
                        label: 'Сохранено!',
                        variant: 'success',
                        disabled: true
                    });
                } else {
                    this.modalApi.updateButton('save', {
                        disabled: !this.isValid
                    });
                }
            },

            handleFormChange() {
                this.updateSaveButton();
            },

            getCoinKeyMetricLabel(coin) {
                return coin?.keyMetric?.label || coin?.keyBuyer || '—';
            },

            buildSegmentColumns(includeActionColumn = false) {
                const columns = [
                    {
                        key: 'agr',
                        label: 'AGR',
                        headerClass: 'text-center'
                    },
                    {
                        key: 'keyMetric',
                        icon: 'fas fa-crosshairs opacity-50',
                        title: 'Ключевая метрика',
                        headerClass: 'text-center'
                    },
                    {
                        key: 'asset',
                        label: 'Актив',
                        headerClass: 'text-center'
                    },
                    {
                        key: 'weight',
                        label: '%',
                        headerClass: 'text-center'
                    }
                ];
                if (includeActionColumn) {
                    columns.push({
                        key: 'actions',
                        label: '',
                        headerClass: 'text-center portfolio-segment-table-col-shrink',
                        width: '2.5rem'
                    });
                }
                return columns;
            },

            getPreselectedKeyMetric(coinId) {
                if (!coinId || !this.preselectedCoinKeyMetrics || typeof this.preselectedCoinKeyMetrics !== 'object') {
                    return null;
                }
                const selection = this.preselectedCoinKeyMetrics[coinId];
                return window.portfolioConfig?.normalizeKeyMetric
                    ? window.portfolioConfig.normalizeKeyMetric(selection)
                    : selection;
            },

            normalizeSelectedCoinsForDomain() {
                this.selectedCoins = (this.selectedCoins || []).map((coin, index) => {
                    if (window.portfolioConfig?.normalizePortfolioCoin) {
                        return window.portfolioConfig.normalizePortfolioCoin(coin, this.$root?.activeModelId);
                    }
                    return {
                        ...coin,
                        coinId: coin.coinId || coin.id || `${coin.symbol || coin.ticker || 'coin'}-${index}`,
                        ticker: (coin.ticker || coin.symbol || '').toUpperCase(),
                        portfolioPercent: Number.isFinite(Number(coin.portfolioPercent)) ? Number(coin.portfolioPercent) : 0,
                        isLocked: !!coin.isLocked,
                        isDisabledInRebalance: !!coin.isDisabledInRebalance
                    };
                });
            },

            buildDraftFromSelected() {
                const normalizeKeyMetric = (coin) => {
                    const normalized = window.portfolioConfig?.normalizeKeyMetric
                        ? window.portfolioConfig.normalizeKeyMetric(coin.keyMetric || { field: coin.keyMetricField || null, label: coin.keyBuyer || null })
                        : (coin.keyMetric || null);
                    return normalized?.field ? normalized : null;
                };
                return {
                    id: this.initialData?.id,
                    name: this.portfolioName,
                    mode: this.weightMode === 'agr' ? 'agr' : 'equal',
                    assets: (this.selectedCoins || []).map((coin, index) => ({
                        coinId: coin.coinId || coin.id || `${coin.ticker || coin.symbol || 'coin'}-${index}`,
                        ticker: (coin.ticker || coin.symbol || '').toUpperCase(),
                        side: (coin.metrics?.agr || 0) >= 0 ? 'long' : 'short',
                        agr: coin.metrics?.agr || 0,
                        weight: Number(coin.portfolioPercent) || 0,
                        isLocked: !!coin.isLocked,
                        isDisabledInRebalance: !!coin.isDisabledInRebalance,
                        keyMetric: normalizeKeyMetric(coin),
                        delegatedBy: {
                            modelId: coin.delegatedBy?.modelId || this.$root.activeModelId || 'unknown',
                            modelName: coin.delegatedBy?.modelName || ''
                        }
                    })),
                    constraints: { totalWeight: 100, minWeight: 1 },
                    metadata: {
                        modelId: this.$root.activeModelId,
                        horizonDays: this.$root.horizonDays,
                        mdnHours: this.$root.mdnHours,
                        agrMethod: this.$root.agrMethod
                    }
                };
            },

            /**
             * Init from pre-selected table coins
             */
            initFromPreselected() {
                const activeModelId = this.$root?.activeModelId
                    || window.modelsConfig?.getDefaultModelId?.()
                    || 'Median/AIR/260101';
                // Find full coin data by ID
                const preselected = this.allCoins.filter(c =>
                    this.preselectedCoinIds.includes(c.id) || this.preselectedCoinIds.includes(c.coinId)
                );

                // Convert to PortfolioCoin structure
                this.selectedCoins = preselected.map(coin => {
                    const created = window.portfolioConfig.createPortfolioCoin(coin, activeModelId);
                    const keyMetric = this.getPreselectedKeyMetric(created.coinId);
                    if (keyMetric) {
                        created.keyMetric = keyMetric;
                    }
                    return window.portfolioConfig.normalizePortfolioCoin
                        ? window.portfolioConfig.normalizePortfolioCoin(created, activeModelId)
                        : created;
                });

                if (!this.portfolioName) {
                    this.portfolioName = this.generateDefaultName();
                }

                this.applyWeights();
            },

            /**
             * Auto-select top 5 Long and top 5 Short by AGR
             */
            handleAutoSelect() {
                const activeModelId = this.$root?.activeModelId
                    || window.modelsConfig?.getDefaultModelId?.()
                    || 'Median/AIR/260101';
                const topCoins = window.portfolioConfig.autoSelectCoins(this.allCoins);

                // Prepare coins for portfolio (PortfolioCoin structure)
                this.selectedCoins = topCoins.map(coin =>
                    window.portfolioConfig.createPortfolioCoin(coin, activeModelId)
                );

                if (!this.portfolioName) {
                    this.portfolioName = this.generateDefaultName();
                }

                this.applyWeights();
            },

            /**
             * Generate default portfolio name from selected coins
             * Format: "L:BTC-ETH...|S:SOL-ADA...|DD.MM.YY|hh:mm"
             */
            generateDefaultName() {
                const longs = this.selectedCoins.filter(c => (c.metrics?.agr || 0) >= 0).map(c => c.ticker).join('-');
                const shorts = this.selectedCoins.filter(c => (c.metrics?.agr || 0) < 0).map(c => c.ticker).join('-');

                const now = this.creationTimestamp || new Date();
                const day = String(now.getDate()).padStart(2, '0');
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const year = String(now.getFullYear()).slice(-2);
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');

                return `L:${longs}|S:${shorts}|${day}.${month}.${year}|${hours}:${minutes}`;
            },

            /**
             * Update portfolio name if not manually edited
             */
            updateDefaultName() {
                if (!this.isNameManuallyEdited) {
                    this.portfolioName = this.generateDefaultName();
                }
            },

            applyWeights() {
                if (window.portfolioEngine?.allocateWeights) {
                    if (this.balanceMode === 'custom') {
                        // Custom mode: distribute within each segment separately
                        const longs = this.selectedCoins.filter(c => (c.metrics?.agr || 0) >= 0);
                        const shorts = this.selectedCoins.filter(c => (c.metrics?.agr || 0) < 0);

                        const allocateSegment = (assets, targetTotal) => {
                            if (assets.length === 0) return [];
                            
                            // Create temp draft for segment
                            const draft = {
                                assets: assets.map(a => ({ 
                                    ...a, 
                                    coinId: a.coinId || a.id,
                                    ticker: (a.ticker || a.symbol || '').toUpperCase(),
                                    side: (a.metrics?.agr || a.agr || 0) >= 0 ? 'long' : 'short',
                                    agr: Number(a.agr ?? a.metrics?.agr ?? 0) || 0,
                                    // Pass current weight so allocateWeights knows what to redistribute
                                    weight: a.portfolioPercent 
                                })),
                                constraints: { totalWeight: targetTotal, minWeight: 1 },
                                mode: this.weightMode
                            };

                            // Use engine to distribute targetTotal within segment
                            // It accounts for locked (isLocked) weights and distributes remainder
                            const allocated = window.portfolioEngine.allocateWeights(draft, draft.mode);
                            return allocated.assets;
                        };

                        const allocatedLongs = allocateSegment(longs, this.customLongPercent);
                        const allocatedShorts = allocateSegment(shorts, this.customShortPercent);

                        const byId = new Map([...allocatedLongs, ...allocatedShorts].map(asset => [asset.coinId, asset]));
                        
                        this.selectedCoins = this.selectedCoins.map((coin, index) => {
                            const coinId = coin.coinId || coin.id || `${coin.symbol || coin.ticker || 'coin'}-${index}`;
                            const nextAsset = byId.get(coinId);
                            if (!nextAsset) return coin;
                            return {
                                ...coin,
                                portfolioPercent: Number(nextAsset.weight) || 0,
                                isLocked: !!nextAsset.isLocked,
                                isDisabledInRebalance: !!nextAsset.isDisabledInRebalance
                            };
                        });
                    } else {
                        // Standard Equal/AGR modes
                        const draft = this.buildDraftFromSelected();
                        const allocated = window.portfolioEngine.allocateWeights(draft, draft.mode);
                        const byId = new Map((allocated.assets || []).map(asset => [asset.coinId, asset]));
                        this.selectedCoins = this.selectedCoins.map((coin, index) => {
                            const coinId = coin.coinId || coin.id || `${coin.symbol || coin.ticker || 'coin'}-${index}`;
                            const nextAsset = byId.get(coinId);
                            if (!nextAsset) return coin;
                            return {
                                ...coin,
                                portfolioPercent: Number(nextAsset.weight) || 0,
                                isLocked: !!nextAsset.isLocked,
                                isDisabledInRebalance: !!nextAsset.isDisabledInRebalance
                            };
                        });
                    }
                } else {
                    window.portfolioConfig.calculateWeights(this.selectedCoins, this.weightMode, 100);
                }
                this.updateSaveButton();
            },

            handleWeightInput(coin) {
                const raw = Number(coin.portfolioPercent);
                const value = Number.isFinite(raw) ? Math.round(raw) : 1;
                coin.portfolioPercent = Math.max(1, Math.min(100, value));
                // Manual edit marks coin as locked for rebalance-safe behavior.
                coin.isLocked = true;
                this.applyWeights();
            },

            toggleCoinRebalance(coin, enabled) {
                if (!window.portfolioEngine?.setRebalanceEnabled) {
                    return;
                }
                const draft = this.buildDraftFromSelected();
                const next = window.portfolioEngine.setRebalanceEnabled(draft, coin.coinId, enabled);
                const byId = new Map((next.assets || []).map(asset => [asset.coinId, asset]));
                this.selectedCoins = this.selectedCoins.map((item, index) => {
                    const itemId = item.coinId || item.id || `${item.symbol || item.ticker || 'coin'}-${index}`;
                    const nextAsset = byId.get(itemId);
                    if (!nextAsset) return item;
                    return {
                        ...item,
                        portfolioPercent: Number(nextAsset.weight) || 0,
                        isLocked: !!nextAsset.isLocked,
                        isDisabledInRebalance: !!nextAsset.isDisabledInRebalance
                    };
                });
                this.updateSaveButton();
            },

            removeCoin(coinId) {
                this.selectedCoins = this.selectedCoins.filter(c => c.coinId !== coinId);
                this.applyWeights();
            },

            banCoin(coin) {
                if (window.banCoinSet && typeof window.banCoinSet.addCoin === 'function') {
                    window.banCoinSet.addCoin({
                        id: coin.coinId || coin.id,
                        ticker: coin.ticker || coin.symbol,
                        name: coin.name || ''
                    });
                    if (window.eventBus) {
                        window.eventBus.emit('ban-set-updated');
                    }
                }
                this.removeCoin(coin.coinId || coin.id);
                if (window.messagesStore?.addMessage) {
                    window.messagesStore.addMessage({
                        type: 'info',
                        text: `Монета ${(coin.ticker || coin.symbol || '').toUpperCase()} добавлена в Ban`,
                        scope: 'global',
                        duration: 2500
                    });
                }
            },

            async handleSave() {
                if (!this.isValid) return;

                try {
                    // Canonical draft validation before persistence.
                    const draft = this.buildDraftFromSelected();
                    const validation = window.portfolioConfig?.validateDraft
                        ? window.portfolioConfig.validateDraft(draft)
                        : { ok: true, issues: [] };
                    if (!validation.ok) {
                        const firstIssue = validation.issues && validation.issues.length > 0
                            ? validation.issues[0].message
                            : 'Портфель не прошел валидацию';
                        console.warn('portfolio-form-modal: validation issues', validation.issues || []);
                        if (window.messagesStore?.addMessage) {
                            window.messagesStore.addMessage({
                                type: 'warning',
                                text: firstIssue,
                                scope: 'global',
                                duration: 3500
                            });
                        }
                        return;
                    }

                    const modelMix = window.portfolioConfig.calculateModelMix(this.selectedCoins);

                    // Create portfolio object (D.4: keep ID when editing)
                    const portfolioId = this.initialData ? this.initialData.id : window.portfolioConfig.generatePortfolioId();

                    const portfolio = window.portfolioConfig.createPortfolio(
                        portfolioId,
                        this.portfolioName,
                        this.selectedCoins,
                        this.initialData ? this.initialData.marketMetrics : {}, // marketMetrics
                        this.initialData ? this.initialData.marketAnalysis : {}, // marketAnalysis
                        {
                            modelId: this.$root.activeModelId,
                            horizonDays: this.$root.horizonDays,
                            mdnHours: this.$root.mdnHours,
                            agrMethod: this.$root.agrMethod, // From root
                            mode: this.weightMode, // Schema field is 'mode'
                            balanceMode: this.balanceMode
                        },
                        modelMix
                    );

                    await this.onSave(portfolio);

                    this.isSaved = true;
                    this.updateSaveButton();

                    // Close after one second
                    setTimeout(() => this.modalApi.hide(), 1000);
                } catch (error) {
                    console.error('portfolio-form-modal: save error:', error);
                }
            }
        }
    };
})();
