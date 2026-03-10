/**
 * #JS-CandlesModalBody
 * @description Modal body for displaying coin kline (candlestick) data from Bybit.
 * @skill id:sk-224210
 */

(function() {
    'use strict';

    window.candlesModalBody = {
        template: `
            <div class="candles-modal-body">
                <div v-if="loading" class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Загрузка...</span>
                    </div>
                    <div class="mt-2 text-muted">Получение данных со свечами...</div>
                </div>

                <div v-else-if="error" class="alert alert-danger m-3">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    {{ error }}
                    <button class="btn btn-sm btn-outline-danger ms-3" @click="fetchData">Повторить</button>
                </div>

                <div v-else>
                    <ul class="nav nav-tabs mb-3" role="tablist">
                        <li v-for="interval in intervals" :key="interval" class="nav-item" role="presentation">
                            <button 
                                class="nav-link" 
                                :class="{ active: activeInterval === interval }"
                                @click="activeInterval = interval"
                                type="button" 
                                role="tab">
                                {{ interval }}m
                            </button>
                        </li>
                    </ul>

                    <div class="tab-content">
                        <div class="table-responsive" style="max-height: 400px;">
                            <table class="table table-sm table-hover align-middle mb-0">
                                <thead class="sticky-top bg-white shadow-sm">
                                    <tr>
                                        <th>Время</th>
                                        <th class="text-end">Цена (Close)</th>
                                        <th class="text-end">Изм. %</th>
                                        <th class="text-end">High / Low</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="candle in currentKlines" :key="candle.startTime">
                                        <td class="text-nowrap text-muted" style="font-size: 0.85rem;">
                                            {{ formatTime(candle.startTime) }}
                                        </td>
                                        <td class="text-end fw-semibold">
                                            {{ formatPrice(candle.close) }}
                                        </td>
                                        <td class="text-end" :class="candle.changePercent >= 0 ? 'text-success' : 'text-danger'">
                                            {{ candle.changePercent >= 0 ? '+' : '' }}{{ candle.changePercent.toFixed(2) }}%
                                        </td>
                                        <td class="text-end text-muted" style="font-size: 0.8rem;">
                                            <span class="text-success">{{ formatPrice(candle.high) }}</span> / 
                                            <span class="text-danger">{{ formatPrice(candle.low) }}</span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `,

        inject: ['modalApi'],

        props: {
            // Passed via modal props in app-ui-root
            coinId: {
                type: String,
                required: true
            },
            symbol: {
                type: String,
                required: true
            }
        },

        data() {
            return {
                loading: true,
                error: null,
                klines: {}, // { interval: data }
                activeInterval: '15',
                intervals: ['1', '3', '5', '15', '30']
            };
        },

        computed: {
            currentKlines() {
                return this.klines[this.activeInterval] || [];
            }
        },

        methods: {
            async fetchData() {
                this.loading = true;
                this.error = null;
                try {
                    if (!window.klineService) {
                        throw new Error('KlineService не инициализирован');
                    }
                    this.klines = await window.klineService.getKlinesMulti(this.symbol, this.intervals);
                    
                    // Check if all failed
                    const hasData = Object.values(this.klines).some(v => v !== null);
                    if (!hasData) {
                        throw new Error('Не удалось получить данные ни для одного интервала');
                    }
                } catch (err) {
                    this.error = err.message || 'Ошибка при загрузке данных';
                    console.error('CandlesModalBody: fetchData error', err);
                } finally {
                    this.loading = false;
                }
            },

            formatTime(ts) {
                const date = new Date(ts);
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            },

            formatPrice(price) {
                if (price === null || price === undefined) return '—';
                if (price >= 1) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                if (price >= 0.0001) return price.toFixed(4);
                return price.toFixed(8);
            }
        },

        mounted() {
            this.fetchData();
        }
    };
})();
