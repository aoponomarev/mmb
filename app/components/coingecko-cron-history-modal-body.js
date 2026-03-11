/**
 * #JS-AjyFAjvh
 * @description History of CoinGecko data fetch cycles; GET /api/coins/cycles (Yandex app-api).
 * @skill-anchor id:sk-add9a6 #for-classes-add-remove
 * @skill-anchor id:sk-eeb23d #for-bootstrap-event-proxying
 * @skill-anchor id:sk-cb75ec #for-utility-availability-check
 * @skill-anchor id:sk-224210 #for-adapter-mandatory
 */

(function() {
    'use strict';

    window.coingeckoCronHistoryModalBody = {
        template: `
            <div class="container-fluid">
                <div class="d-flex align-items-center mb-3">
                    <div class="small text-muted">
                        Последние циклы крона CoinGecko в облачной БД
                    </div>
                </div>

                <div v-if="loading" class="text-center py-4">
                    <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                    <span class="small text-muted">Загрузка истории...</span>
                </div>

                <div v-else-if="error" class="alert alert-danger py-2 mb-0">
                    <div class="fw-semibold">Не удалось загрузить историю</div>
                    <div class="small">{{ error }}</div>
                </div>

                <div v-else-if="rows.length === 0" class="alert alert-secondary py-2 mb-0">
                    <div class="small mb-0">История пока недоступна.</div>
                </div>

                <div v-else class="table-responsive">
                    <table class="table table-sm align-middle mb-0">
                        <thead>
                            <tr>
                                <th class="text-nowrap">Дата</th>
                                <th class="text-nowrap">Время</th>
                                <th class="text-end text-nowrap">Монет</th>
                                <th class="text-nowrap">Статус</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="row in rows" :key="row.cycleId">
                                <td class="text-nowrap">{{ row.date }}</td>
                                <td class="text-nowrap">{{ row.time }}</td>
                                <td class="text-end">
                                    <span v-if="row.typeLabel" class="me-1">{{ row.typeLabel }}</span>
                                    <span>{{ row.coinCount }}</span>
                                </td>
                                <td>
                                    <span
                                        class="badge"
                                        :class="row.status === 'Успех' ? 'text-bg-success' : 'text-bg-danger'">
                                        {{ row.status }}
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `,

        inject: ['modalApi'],

        data() {
            return {
                loading: false,
                error: '',
                rows: [],
                triggering: false,
                applyingDbCoins: false,
                dbCoinCount: null,
                dbCoinCountRaw: null,
                dbCoinsPrepared: []
            };
        },

        methods: {
            getDbButtonLabel() {
                if (typeof this.dbCoinCount === 'number' && this.dbCoinCount > 0) {
                    return String(this.dbCoinCount);
                }
                return '...';
            },

            getGatewayProvider() {
                const provider = window.yandexApiGatewayProvider;
                if (!provider || typeof provider.getCycles !== 'function' || typeof provider.triggerMarketCache !== 'function') {
                    throw new Error('Yandex API Gateway provider недоступен');
                }
                return provider;
            },

            async loadHistory() {
                this.loading = true;
                this.error = '';
                this.updateButtons();
                try {
                    const provider = this.getGatewayProvider();
                    this.rows = await provider.getCycles();
                } catch (err) {
                    this.rows = [];
                    this.error = err?.message || 'Unknown error';
                } finally {
                    await this.fetchDbCoinCount();
                    this.loading = false;
                    this.updateButtons();
                }
            },

            async fetchDbCoinCount() {
                try {
                    const provider = window.dataProviderManager?.providers?.['yandex-cache'];
                    if (!provider || typeof provider.checkCacheStatus !== 'function' || typeof provider.getTopCoins !== 'function') {
                        this.dbCoinCount = null;
                        this.dbCoinCountRaw = null;
                        this.dbCoinsPrepared = [];
                        return;
                    }
                    const status = await provider.checkCacheStatus();
                    const rawCount = status?.available ? (status.count ?? null) : null;
                    this.dbCoinCountRaw = rawCount;

                    const targetCount = Number.isFinite(rawCount) && rawCount > 0
                        ? Math.min(rawCount, 1000)
                        : 250;
                    const coinsFromDb = await provider.getTopCoins(targetCount, 'market_cap');
                    const appRoot = window.appRoot;
                    const filtered = (appRoot && typeof appRoot.applyBanFilterToCoins === 'function')
                        ? appRoot.applyBanFilterToCoins(coinsFromDb)
                        : coinsFromDb;

                    this.dbCoinsPrepared = Array.isArray(filtered) ? filtered : [];
                    this.dbCoinCount = this.dbCoinsPrepared.length;
                } catch (_) {
                    this.dbCoinCount = null;
                    this.dbCoinCountRaw = null;
                    this.dbCoinsPrepared = [];
                } finally {
                    this.updateButtons();
                }
            },

            async applyDbCoinsToWorkingTable() {
                if (this.loading || this.triggering || this.applyingDbCoins) {
                    return;
                }

                const provider = window.dataProviderManager?.providers?.['yandex-cache'];
                if (!provider || typeof provider.getTopCoins !== 'function') {
                    this.error = 'Yandex cache provider недоступен';
                    return;
                }

                this.applyingDbCoins = true;
                this.error = '';
                this.updateButtons();

                try {
                    let coinsFromDb = Array.isArray(this.dbCoinsPrepared) ? this.dbCoinsPrepared : [];
                    if (!coinsFromDb.length) {
                        await this.fetchDbCoinCount();
                        coinsFromDb = Array.isArray(this.dbCoinsPrepared) ? this.dbCoinsPrepared : [];
                    }

                    if (!Array.isArray(coinsFromDb) || coinsFromDb.length === 0) {
                        throw new Error('В БД нет монет для замены таблицы');
                    }

                    if (window.cacheManager) {
                        await window.cacheManager.set('top-coins-by-market-cap', coinsFromDb);
                        await window.cacheManager.set('top-coins-by-market-cap-meta', { timestamp: Date.now() });
                    }

                    const appRoot = window.appRoot;
                    if (appRoot) {
                        const nextCoins = coinsFromDb;
                        appRoot.coins = nextCoins;
                        appRoot.selectedCoinIds = [];

                        if (appRoot.coinsDataCache && typeof appRoot.coinsDataCache.set === 'function') {
                            nextCoins.forEach(coin => {
                                if (coin && coin.id) {
                                    appRoot.coinsDataCache.set(coin.id, coin);
                                }
                            });
                        }

                        if (window.autoCoinSets && typeof window.autoCoinSets.classifyAndUpdateAutoSets === 'function') {
                            window.autoCoinSets.classifyAndUpdateAutoSets(nextCoins);
                        }

                        if (typeof appRoot.recalculateAllMetrics === 'function') {
                            appRoot.recalculateAllMetrics();
                        }

                        if (typeof appRoot.saveActiveCoinSetIds === 'function') {
                            await appRoot.saveActiveCoinSetIds(nextCoins.map(c => c.id));
                        }

                        if (typeof appRoot.updateCoinsCacheMeta === 'function') {
                            await appRoot.updateCoinsCacheMeta();
                        }
                    }

                    if (window.messagesStore) {
                        window.messagesStore.addMessage({
                            type: 'success',
                            text: `Таблица заменена монетами из БД (${this.dbCoinCount})`,
                            scope: 'global',
                            duration: 3000
                        });
                    }
                } catch (err) {
                    this.error = err?.message || 'Unknown error';
                } finally {
                    this.applyingDbCoins = false;
                    await this.fetchDbCoinCount();
                    this.updateButtons();
                }
            },

            updateButtons() {
                if (!this.modalApi) return;
                const isBusy = this.loading || this.triggering || this.applyingDbCoins;
                this.modalApi.updateButton('refresh-history', { disabled: isBusy });
                this.modalApi.updateButton('apply-db-coins', { disabled: isBusy, label: this.getDbButtonLabel() });
                this.modalApi.updateButton('trigger-cap', { disabled: isBusy });
                this.modalApi.updateButton('trigger-vol', { disabled: isBusy });
            },

            registerButtons() {
                if (!this.modalApi) return;
                this.modalApi.registerButton('close-history', {
                    label: 'Закрыть',
                    variant: 'secondary',
                    locations: ['footer'],
                    onClick: () => this.modalApi.hide()
                });
                this.modalApi.registerButton('trigger-cap', {
                    label: '🗘Cap',
                    variant: 'secondary',
                    locations: ['footer'],
                    disabled: this.loading || this.triggering,
                    onClick: () => this.triggerManual('market_cap')
                });
                this.modalApi.registerButton('trigger-vol', {
                    label: '🗘Vol',
                    variant: 'secondary',
                    locations: ['footer'],
                    disabled: this.loading || this.triggering,
                    onClick: () => this.triggerManual('volume')
                });
                this.modalApi.registerButton('apply-db-coins', {
                    label: this.getDbButtonLabel(),
                    variant: 'primary',
                    locations: ['footer'],
                    classesAdd: { root: 'ms-auto' },
                    disabled: this.loading || this.triggering || this.applyingDbCoins,
                    onClick: () => this.applyDbCoinsToWorkingTable()
                });
                this.modalApi.registerButton('refresh-history', {
                    label: 'Обновить',
                    variant: 'primary',
                    locations: ['footer'],
                    disabled: this.loading || this.triggering,
                    onClick: () => this.loadHistory()
                });
            },

            async triggerManual(order) {
                if (this.loading || this.triggering) {
                    return;
                }

                this.triggering = true;
                this.error = '';
                this.updateButtons();

                try {
                    const provider = this.getGatewayProvider();
                    await provider.triggerMarketCache(order);
                } catch (err) {
                    this.error = err?.message || 'Unknown error';
                } finally {
                    this.triggering = false;
                    this.updateButtons();
                }

                // Reload history so that freshly ingested cycle appears immediately.
                await this.loadHistory();
            }
        },

        mounted() {
            this.registerButtons();
            this.loadHistory();
        },

        beforeUnmount() {
            if (!this.modalApi) return;
            this.modalApi.removeButton('close-history');
            this.modalApi.removeButton('refresh-history');
            this.modalApi.removeButton('apply-db-coins');
            this.modalApi.removeButton('trigger-cap');
            this.modalApi.removeButton('trigger-vol');
        }
    };
})();
