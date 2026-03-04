/**
 * ================================================================================================
 * COINGECKO CRON HISTORY MODAL BODY - History of coin data update cycles
 * ================================================================================================
 *
 * PURPOSE: Shows history of recent CoinGecko data fetch cycles (via cron).
 *
 * @skill-anchor id:sk-add9a6 #for-classes-add-remove
 * @skill-anchor id:sk-eeb23d #for-bootstrap-event-proxying
 * @skill-anchor id:sk-cb75ec #for-utility-availability-check
 * Data source: GET /api/coins/cycles (Yandex app-api).
 */

(function() {
    'use strict';

    const API_GATEWAY_BASE = 'https://d5dl2ia43kck6aqb1el5.k1mxzkh0.apigw.yandexcloud.net';
    const CYCLES_ENDPOINT = `${API_GATEWAY_BASE}/api/coins/cycles`;

    window.coingeckoCronHistoryModalBody = {
        template: `
            <div class="container-fluid">
                <div class="d-flex align-items-center justify-content-between mb-3">
                    <div class="small text-muted">
                        Последние циклы крона CoinGecko в облачной БД
                    </div>
                    <button
                        type="button"
                        class="btn btn-sm btn-outline-secondary"
                        :disabled="loading"
                        @click="loadHistory">
                        <i class="fas fa-sync-alt me-1"></i>Обновить
                    </button>
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
                                <td class="text-end">{{ row.coinCount }}</td>
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
                rows: []
            };
        },

        methods: {
            formatDateTime(value) {
                if (!value) return { date: '—', time: '—' };
                const dt = new Date(value);
                if (Number.isNaN(dt.getTime())) return { date: '—', time: '—' };

                const date = dt.toLocaleDateString('ru-RU');
                const time = dt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                return { date, time };
            },

            normalizeRows(cycles) {
                return (Array.isArray(cycles) ? cycles : []).map((cycle, index) => {
                    const count = Number.parseInt(cycle.coin_count, 10) || 0;
                    const finished = this.formatDateTime(cycle.finished_at || cycle.started_at);
                    return {
                        cycleId: cycle.cycle_id || `cycle-${index}`,
                        date: finished.date,
                        time: finished.time,
                        coinCount: count,
                        status: count > 0 ? 'Успех' : 'Отказ'
                    };
                });
            },

            async loadHistory() {
                this.loading = true;
                this.error = '';
                this.updateButtons();
                try {
                    const res = await fetch(CYCLES_ENDPOINT, { headers: { 'Accept': 'application/json' } });
                    if (!res.ok) {
                        throw new Error(`HTTP ${res.status}`);
                    }
                    const data = await res.json();
                    this.rows = this.normalizeRows(data?.cycles);
                } catch (err) {
                    this.rows = [];
                    this.error = err?.message || 'Unknown error';
                } finally {
                    this.loading = false;
                    this.updateButtons();
                }
            },

            updateButtons() {
                if (!this.modalApi) return;
                this.modalApi.updateButton('refresh-history', { disabled: this.loading });
            },

            registerButtons() {
                if (!this.modalApi) return;
                this.modalApi.registerButton('close-history', {
                    label: 'Закрыть',
                    variant: 'secondary',
                    locations: ['footer'],
                    classesAdd: { root: 'me-auto' },
                    onClick: () => this.modalApi.hide()
                });
                this.modalApi.registerButton('refresh-history', {
                    label: 'Обновить',
                    variant: 'primary',
                    locations: ['footer'],
                    disabled: this.loading,
                    onClick: () => this.loadHistory()
                });
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
        }
    };
})();
