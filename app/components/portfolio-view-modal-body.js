/**
 * #JS-9oNFE9kB
 * @description Portfolio view modal body (D.3); display portfolio metadata and assets using the shared portfolio-segment-table shell.
 * @skill id:sk-c3d639
 */

(function() {
    'use strict';

    window.portfolioViewModalBody = {
        template: `
            <div class="portfolio-view-modal">
                <!-- Header with metadata -->
                <div class="row g-3 mb-4">
                    <div class="col-md-8">
                        <div v-if="isConflictPortfolio" class="portfolio-conflict-banner mb-2">
                            <span class="badge portfolio-conflict-badge" :title="conflictTooltip">
                                <i class="fas fa-triangle-exclamation me-1"></i>{{ conflictLabel }}
                            </span>
                            <span class="portfolio-conflict-note small">{{ conflictNote }}</span>
                        </div>
                        <h4 class="mb-1">{{ portfolio?.name }}</h4>
                        <div class="text-muted small">
                            <i class="far fa-calendar-alt me-1"></i> Сформирован: {{ formatDate(portfolio?.createdAt) }}
                        </div>
                    </div>
                    <div class="col-md-4 text-md-end">
                        <div class="badge bg-body-secondary text-body border py-2 px-3">
                            <span class="text-muted small me-2">P/L (Snapshot):</span>
                            <span :class="['fw-bold', (portfolio?.marketMetrics?.pl || 0) >= 0 ? 'text-success' : 'text-danger']">
                                {{ (portfolio?.marketMetrics?.pl || 0).toFixed(2) }}%
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Market context at creation -->
                <div class="mb-4">
                    <div class="py-2">
                        <div class="d-flex flex-wrap gap-4 align-items-center">
                            <div class="d-flex align-items-center gap-2">
                                <span class="text-muted small">FGI:</span>
                                <span class="badge bg-dark">{{ portfolio?.marketMetrics?.fgi || '—' }}</span>
                            </div>
                            <div class="d-flex align-items-center gap-2" v-if="portfolio?.modelVersion?.modelId || portfolio?.settings?.modelId">
                                <span class="text-muted small">Модель:</span>
                                <span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25">
                                    {{ modelLabel }}
                                </span>
                            </div>
                            <div class="d-flex align-items-center gap-2" v-if="portfolio?.settings?.horizonDays">
                                <span class="text-muted small">Горизонт:</span>
                                <span class="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25">
                                    {{ portfolio.settings.horizonDays }}d
                                </span>
                            </div>
                            <div class="d-flex align-items-center gap-2" v-if="portfolio?.settings?.mdnHours">
                                <span class="text-muted small">MDN:</span>
                                <span class="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25">
                                    {{ portfolio.settings.mdnHours }}h
                                </span>
                            </div>
                            <div class="d-flex align-items-center gap-2" v-if="portfolio?.settings?.agrMethod">
                                <span class="text-muted small">Метод:</span>
                                <span class="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25 text-uppercase">
                                    {{ portfolio.settings.agrMethod }}
                                </span>
                            </div>
                            <div class="d-flex align-items-center gap-2">
                                <span class="text-muted small">Распределение:</span>
                                <span class="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 text-capitalize">
                                    {{ portfolio?.settings?.mode || 'equal' }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Long/Short tables -->
                <div class="row g-3 mb-4">
                    <div class="col-md-6">
                        <portfolio-segment-table
                            side="long"
                            title="Long"
                            :count="longCoins.length"
                            :columns="buildSegmentColumns()"
                        >
                            <template #rows>
                                <tr v-for="coin in longCoins" :key="coin.coinId">
                                    <td class="align-middle">
                                        <cmp-cell-num :value="coin.metrics?.agr" :precision="2" :colored="true"></cmp-cell-num>
                                    </td>
                                    <td class="text-center align-middle text-muted">{{ getCoinKeyMetricLabel(coin) }}</td>
                                    <td class="align-middle">
                                        {{ coin.ticker }}
                                    </td>
                                    <td class="align-middle">{{ coin.portfolioPercent }}%</td>
                                </tr>
                            </template>
                            <template #summary>
                                <span class="text-muted">Long:</span>
                                <span class="fw-bold text-success">{{ longTotal }}%</span>
                            </template>
                        </portfolio-segment-table>
                    </div>

                    <div class="col-md-6">
                        <portfolio-segment-table
                            side="short"
                            title="Short"
                            :count="shortCoins.length"
                            :columns="buildSegmentColumns()"
                        >
                            <template #rows>
                                <tr v-for="coin in shortCoins" :key="coin.coinId">
                                    <td class="align-middle">
                                        <cmp-cell-num :value="coin.metrics?.agr" :precision="2" :colored="true"></cmp-cell-num>
                                    </td>
                                    <td class="text-center align-middle text-muted">{{ getCoinKeyMetricLabel(coin) }}</td>
                                    <td class="align-middle">
                                        {{ coin.ticker }}
                                    </td>
                                    <td class="align-middle">{{ coin.portfolioPercent }}%</td>
                                </tr>
                            </template>
                            <template #summary>
                                <span class="text-muted">Short:</span>
                                <span class="fw-bold text-danger">{{ shortTotal }}%</span>
                            </template>
                        </portfolio-segment-table>
                    </div>
                </div>

                <!-- Model Mix tab -->
                <div class="mb-2" v-if="Object.keys(portfolio?.modelMix || {}).length > 0">
                    <h6 class="small text-muted text-uppercase fw-bold mb-2">Вклад моделей</h6>
                    <div class="d-flex flex-wrap gap-2">
                        <div v-for="(mix, id) in portfolio.modelMix" :key="id"
                             class="py-1 d-flex align-items-center gap-3">
                            <div class="small fw-bold">{{ mix.modelName }}</div>
                            <div class="d-flex gap-2">
                                <span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25">{{ mix.coinsCount }} монет</span>
                                <span class="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25">{{ mix.totalPercent }}% долей</span>
                                <span v-if="mix.versionDate" class="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25">v{{ mix.versionDate }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `,

        inject: ['modalApi'],

        components: {
            'cmp-button': window.cmpButton,
            'cmp-cell-num': window.cmpCellNum,
            'portfolio-segment-table': window.portfolioSegmentTable
        },

        props: {
            portfolio: {
                type: Object,
                required: true
            },
            onDelete: {
                type: Function,
                required: true
            },
            onRebalance: {
                type: Function,
                required: false
            }
        },

        computed: {
            modelLabel() {
                const modelId = this.portfolio?.modelVersion?.modelId || this.portfolio?.settings?.modelId;
                if (!modelId) return '';
                const versionName = this.portfolio?.modelVersion?.versionName
                    || this.portfolio?.modelVersion?.modelName
                    || window.modelsConfig?.getModelMeta?.(modelId)?.versionName;
                return versionName ? `${versionName} (${modelId})` : modelId;
            },
            longCoins() {
                return (this.portfolio?.coins || []).filter(c => (c.metrics?.agr || 0) >= 0);
            },
            shortCoins() {
                return (this.portfolio?.coins || []).filter(c => (c.metrics?.agr || 0) < 0);
            },
            longTotal() {
                const sum = this.longCoins.reduce((acc, c) => acc + (Number(c.portfolioPercent) || 0), 0);
                return Math.round(sum * 100) / 100;
            },
            shortTotal() {
                const sum = this.shortCoins.reduce((acc, c) => acc + (Number(c.portfolioPercent) || 0), 0);
                return Math.round(sum * 100) / 100;
            },
            isConflictPortfolio() {
                return this.portfolio?.syncState === 'conflict';
            },
            currentLanguage() {
                return window.uiState?.getState()?.tooltips?.currentLanguage || 'ru';
            },
            conflictLabel() {
                return window.tooltipsConfig?.getTooltip('ui.portfolio.syncConflict.badge', this.currentLanguage);
            },
            conflictTooltip() {
                return window.tooltipsConfig?.getTooltip('ui.portfolio.syncConflict.tooltip', this.currentLanguage);
            },
            conflictNote() {
                return window.tooltipsConfig?.getTooltip('ui.portfolio.syncConflict.note', this.currentLanguage);
            }
        },

        mounted() {
            this.registerButtons();
        },

        methods: {
            registerButtons() {
                if (!this.modalApi) return;

                this.modalApi.registerButton('delete', {
                    label: 'Delete',
                    variant: 'outline-danger',
                    icon: 'fas fa-trash-alt',
                    locations: ['footer'],
                    classesAdd: { root: 'me-auto' },
                    onClick: () => this.handleDelete()
                });

                if (this.onRebalance) {
                    this.modalApi.registerButton('rebalance', {
                        label: 'Ребалансировать',
                        variant: 'primary',
                        icon: 'fas fa-sync-alt',
                        locations: ['footer'],
                        onClick: () => this.handleRebalance()
                    });
                }

                this.modalApi.registerButton('close', {
                    label: 'Закрыть',
                    variant: 'secondary',
                    locations: ['footer'],
                    onClick: () => this.modalApi.hide()
                });
            },

            formatDate(dateString) {
                if (!dateString) return '—';
                const date = new Date(dateString);
                return date.toLocaleString('ru-RU', {
                    day: '2-digit', month: '2-digit', year: '2-digit',
                    hour: '2-digit', minute: '2-digit'
                });
            },

            getCoinKeyMetricLabel(coin) {
                return coin?.keyMetric?.label || coin?.keyBuyer || '—';
            },

            buildSegmentColumns() {
                return [
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
            },

            async handleDelete() {
                await this.onDelete(this.portfolio.id);
                this.modalApi.hide();
            },

            handleRebalance() {
                if (typeof this.onRebalance === 'function') {
                    // Route rebalance through canonical engine before handing off.
                    const preparedPortfolio = this.preparePortfolioForRebalance(this.portfolio);
                    if (!preparedPortfolio) {
                        return;
                    }
                    this.onRebalance(preparedPortfolio);
                }
            },

            preparePortfolioForRebalance(portfolio) {
                if (!portfolio || !Array.isArray(portfolio.coins)) {
                    return portfolio;
                }
                if (!window.portfolioEngine?.allocateWeights) {
                    return portfolio;
                }

                const mode = portfolio?.settings?.mode === 'agr' ? 'agr' : 'equal';
                const normalizeKeyMetric = (coin) => {
                    const normalized = window.portfolioConfig?.normalizeKeyMetric
                        ? window.portfolioConfig.normalizeKeyMetric(coin.keyMetric || { field: coin.keyMetricField || null, label: coin.keyBuyer || null })
                        : (coin.keyMetric || null);
                    return normalized?.field ? normalized : null;
                };
                const assets = portfolio.coins.map((coin, index) => ({
                    coinId: coin.coinId || coin.id || `${coin.ticker || coin.symbol || 'coin'}-${index}`,
                    ticker: (coin.ticker || coin.symbol || '').toUpperCase(),
                    side: (coin.metrics?.agr || 0) >= 0 ? 'long' : 'short',
                    agr: coin.metrics?.agr || 0,
                    weight: Number(coin.portfolioPercent) || 0,
                    isLocked: !!coin.isLocked,
                    isDisabledInRebalance: !!coin.isDisabledInRebalance,
                    keyMetric: normalizeKeyMetric(coin),
                    delegatedBy: {
                        modelId: coin.delegatedBy?.modelId || portfolio?.settings?.modelId || 'unknown',
                        modelName: coin.delegatedBy?.modelName || ''
                    }
                }));

                const draft = {
                    id: portfolio.id,
                    name: portfolio.name,
                    mode,
                    assets,
                    constraints: { totalWeight: 100, minWeight: 1 },
                    metadata: {
                        modelId: portfolio?.settings?.modelId,
                        horizonDays: portfolio?.settings?.horizonDays,
                        mdnHours: portfolio?.settings?.mdnHours,
                        agrMethod: portfolio?.settings?.agrMethod
                    }
                };

                const normalized = window.portfolioEngine.allocateWeights(draft, mode);
                const validation = window.portfolioConfig?.validateDraft
                    ? window.portfolioConfig.validateDraft(normalized)
                    : { ok: true, issues: [] };

                if (!validation.ok) {
                    const firstIssue = validation.issues && validation.issues.length > 0
                        ? validation.issues[0].message
                        : 'Ошибка подготовки ребалансировки';
                    if (window.messagesStore?.addMessage) {
                        window.messagesStore.addMessage({
                            type: 'warning',
                            text: firstIssue,
                            scope: 'global',
                            duration: 3500
                        });
                    }
                    return null;
                }

                const byId = new Map((normalized.assets || []).map(asset => [asset.coinId, asset]));
                const preparedCoins = portfolio.coins.map((coin, index) => {
                    const coinId = coin.coinId || coin.id || `${coin.ticker || coin.symbol || 'coin'}-${index}`;
                    const asset = byId.get(coinId);
                    if (!asset) return coin;
                    return {
                        ...coin,
                        portfolioPercent: asset.weight,
                        isLocked: !!asset.isLocked,
                        isDisabledInRebalance: !!asset.isDisabledInRebalance
                    };
                });

                return {
                    ...portfolio,
                    settings: {
                        ...(portfolio.settings || {}),
                        mode
                    },
                    coins: preparedCoins
                };
            }
        }
    };
})();
