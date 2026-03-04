/**
 * #JS-Nz32oDKA
 * @description Modal body: missing coins list; exclude or replace by ticker; Skill id:sk-e0b8f3.
 */
(function() {
    'use strict';

    /**
     * MISSING COINS MODAL BODY
     * Shows missing coins, allows excluding or replacing by ticker lookup.
     * Skill: id:sk-e0b8f3
     *
     * Props:
     * - missingCoins: Array<{ id, symbol?, name? }>
     * - onResolve: Function({ excludes: string[], replacements: Array<{ oldId, newId, coin }> })
     */
    window.missingCoinsModalBody = {
        template: `
            <div>
                <div class="alert alert-warning mb-3">
                    Не найдены данные for {{ rows.length }} монет. Выберите, что сделать с каждой: исключить или заменить по тикеру.
                </div>
                <div class="list-group">
                    <div
                        v-for="row in rows"
                        :key="row.id"
                        class="list-group-item"
                    >
                        <div class="d-flex flex-wrap align-items-start gap-2">
                            <div class="form-check me-2 mt-1">
                                <input
                                    class="form-check-input"
                                    type="checkbox"
                                    :id="'exclude-'+row.id"
                                    v-model="row.exclude"
                                    :disabled="row.altTicker.length > 0"
                                    @change="handleExcludeChange(row)"
                                >
                            </div>
                            <div class="flex-grow-1">
                                <div class="fw-semibold">
                                    {{ row.symbolDisplay }} <span class="text-muted small">({{ row.id }})</span>
                                </div>
                                <div class="small text-muted" v-if="row.name">{{ row.name }}</div>
                                <div class="row g-2 align-items-center mt-2">
                                    <div class="col-sm-6">
                                        <input
                                            type="text"
                                            class="form-control form-control-sm"
                                            :placeholder="'Тикер for замены (' + row.id + ')'"
                                            v-model="row.altTicker"
                                            :disabled="row.exclude"
                                            @input="handleAltTickerInput(row)"
                                        >
                                        <div v-if="row.error" class="text-danger small mt-1">{{ row.error }}</div>
                                        <div v-else-if="row.searching" class="text-muted small mt-1">Поиск...</div>
                                        <div v-else-if="row.searchResults.length === 0 && row.altTickerValid" class="text-muted small mt-1">Ничего не найдено</div>
                                    </div>
                                    <div class="col-sm-6" v-if="row.searchResults.length > 0">
                                        <select
                                            class="form-select form-select-sm"
                                            v-model="row.selectedResultId"
                                        >
                                            <option
                                                v-for="res in row.searchResults"
                                                :key="res.id"
                                                :value="res.id">
                                                {{ res.symbol.toUpperCase() }} — {{ res.name }} (mc: {{ formatNumber(res.market_cap) }})
                                            </option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `,

        inject: ['modalApi'],

        props: {
            missingCoins: {
                type: Array,
                required: true
            },
            onResolve: {
                type: Function,
                required: true
            }
        },

        data() {
            return {
                rows: this.missingCoins.map(c => ({
                    id: c.id,
                    symbol: c.symbol || '',
                    name: c.name || '',
                    symbolDisplay: (c.symbol || c.id || '').toUpperCase(),
                    exclude: false,
                    altTicker: '',
                    altTickerValid: false,
                    searching: false,
                    searchResults: [],
                    selectedResultId: null,
                    error: null
                }))
            };
        },

        computed: {
            hasExclude() {
                return this.rows.some(r => r.exclude);
            },
            hasReplacementReady() {
                return this.rows.some(r => r.altTickerValid && !r.exclude && r.selectedResultId);
            }
        },

        mounted() {
            this.registerButtons();
            this.updateButtons();
        },

        methods: {
            registerButtons() {
                if (!this.modalApi) return;

                this.modalApi.registerButton('missing-exclude', {
                    label: 'Исключить',
                    variant: 'secondary',
                    locations: ['footer'],
                    classesAdd: { root: 'me-auto' },
                    disabled: !this.hasExclude,
                    onClick: () => this.handleExclude()
                });

                this.modalApi.registerButton('missing-replace', {
                    label: 'Заменить',
                    variant: 'primary',
                    locations: ['footer'],
                    disabled: !this.hasReplacementReady,
                    onClick: () => this.handleReplace()
                });
            },

            updateButtons() {
                if (!this.modalApi) return;
                this.modalApi.updateButton('missing-exclude', { disabled: !this.hasExclude });
                this.modalApi.updateButton('missing-replace', { disabled: !this.hasReplacementReady });
            },

            formatNumber(val) {
                if (val == null) return '—';
                return Number(val).toLocaleString('en-US', { maximumFractionDigits: 0 });
            },

            handleExcludeChange(row) {
                if (row.exclude) {
                    row.altTicker = '';
                    row.altTickerValid = false;
                    row.searchResults = [];
                    row.selectedResultId = null;
                }
                this.updateButtons();
            },

            async handleAltTickerInput(row) {
                const value = (row.altTicker || '').trim().toLowerCase();
                row.altTicker = value;
                row.exclude = false; // input blocks checkbox when filled
                row.error = null;
                row.searchResults = [];
                row.selectedResultId = null;
                row.altTickerValid = /^[a-z0-9-]+$/.test(value) && value.length > 0;
                this.updateButtons();

                if (!row.altTickerValid) {
                    return;
                }

                if (!window.dataProviderManager || typeof window.dataProviderManager.searchCoins !== 'function') {
                    row.error = 'searchCoins недоступен';
                    return;
                }

                row.searching = true;
                try {
                    const results = await window.dataProviderManager.searchCoins(value, { limit: 5 });
                    const normalized = Array.isArray(results)
                        ? results.map(r => ({
                            id: r.id,
                            symbol: r.symbol || r.id || '',
                            name: r.name || '',
                            market_cap: r.market_cap || r.marketCap || null
                        }))
                        : [];
                    row.searchResults = normalized;
                    row.selectedResultId = normalized.length > 0 ? normalized[0].id : null;
                } catch (e) {
                    row.error = e.message || 'Ошибка поиска';
                } finally {
                    row.searching = false;
                    this.updateButtons();
                }
            },

            handleExclude() {
                const excludes = this.rows.filter(r => r.exclude).map(r => r.id);
                if (this.onResolve) {
                    this.onResolve({ excludes, replacements: [] });
                }
                if (this.modalApi) {
                    this.modalApi.hide();
                }
            },

            handleReplace() {
                const replacements = [];
                this.rows.forEach(r => {
                    if (r.altTickerValid && !r.exclude && r.selectedResultId) {
                        const sel = r.searchResults.find(x => x.id === r.selectedResultId);
                        if (sel) {
                            replacements.push({
                                oldId: r.id,
                                newId: sel.id,
                                coin: sel
                            });
                        }
                    }
                });
                if (this.onResolve) {
                    this.onResolve({ excludes: [], replacements });
                }
                if (this.modalApi) {
                    this.modalApi.hide();
                }
            }
        }
    };
})();
