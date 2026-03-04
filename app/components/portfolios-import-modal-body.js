/**
 * #JS-Ri3c3bMt
 * @description Import portfolios from JSON; date filter, merge|replace; portfolioConfig + eventBus sync; inject modalApi.
 * @skill id:sk-c3d639
 * @skill-anchor id:sk-add9a6 #for-classes-add-remove
 * @skill-anchor id:sk-eeb23d #for-bootstrap-event-proxying
 * @skill-anchor id:sk-cb75ec #for-utility-availability-check
 */

window.portfoliosImportModalBody = {
    template: `
        <div class="container-fluid">
            <div class="mb-3">
                <label class="form-label">Файл JSON</label>
                <input class="form-control" type="file" accept="application/json,.json" @change="handleFileChange">
                <div v-if="fileName" class="small text-muted mt-1">Выбрано: {{ fileName }}</div>
            </div>

            <div v-if="errors.length" class="alert alert-danger py-2">
                <div class="fw-semibold mb-1">Ошибка импорта</div>
                <div v-for="err in errors" :key="err" class="small">{{ err }}</div>
            </div>

            <div v-if="isLoaded">
                <div class="row g-3 mb-3">
                    <div class="col-md-4">
                        <label class="form-label">Режим</label>
                        <div class="form-check">
                            <input class="form-check-input" type="radio" :id="formIdPrefix + '-mode-merge'" value="merge" v-model="mode">
                            <label class="form-check-label" :for="formIdPrefix + '-mode-merge'">Merge</label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="radio" :id="formIdPrefix + '-mode-replace'" value="replace" v-model="mode">
                            <label class="form-check-label" :for="formIdPrefix + '-mode-replace'">Replace</label>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Дата от</label>
                        <input class="form-control" type="date" v-model="dateFrom">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Дата до</label>
                        <input class="form-control" type="date" v-model="dateTo">
                    </div>
                </div>

                <div class="d-flex align-items-center justify-content-between mb-2">
                    <div class="form-check">
                        <input
                            class="form-check-input"
                            type="checkbox"
                            :id="formIdPrefix + '-select-all'"
                            :checked="isAllSelected"
                            @change="toggleSelectAll">
                        <label class="form-check-label" :for="formIdPrefix + '-select-all'">
                            Выбрать все ({{ filteredPortfolios.length }})
                        </label>
                    </div>
                    <div class="small text-muted">Выбрано: {{ selectedIds.length }}</div>
                </div>

                <div class="list-group mb-2" v-if="filteredPortfolios.length">
                    <label
                        v-for="portfolio in filteredPortfolios"
                        :key="portfolio.id"
                        class="list-group-item d-flex align-items-start gap-2">
                        <input class="form-check-input mt-1" type="checkbox" :value="portfolio.id" v-model="selectedIds">
                        <div class="flex-grow-1">
                            <div class="fw-semibold">{{ portfolio.name || 'Без имени' }}</div>
                            <div class="small text-muted">
                                ID: {{ portfolio.id }} • Создан: {{ formatDate(portfolio.createdAt || portfolio.updatedAt) || '—' }}
                            </div>
                        </div>
                    </label>
                </div>

                <div v-else class="small text-muted">Нет portfolios for выбранного фильтра.</div>
            </div>
        </div>
    `,

    inject: ['modalApi'],

    data() {
        return {
            fileName: '',
            payload: null,
            errors: [],
            isLoaded: false,
            mode: 'merge',
            dateFrom: '',
            dateTo: '',
            selectedIds: [],
            formIdPrefix: `import-portfolios-${Math.random().toString(36).slice(2, 8)}`,
            isImporting: false
        };
    },

    computed: {
        portfolios() {
            return Array.isArray(this.payload?.portfolios) ? this.payload.portfolios : [];
        },
        filteredPortfolios() {
            if (!this.portfolios.length) return [];
            const from = this.dateFrom ? new Date(this.dateFrom) : null;
            const to = this.dateTo ? new Date(this.dateTo) : null;
            const toEnd = to ? new Date(to.getTime() + 24 * 60 * 60 * 1000 - 1) : null;

            return this.portfolios.filter(portfolio => {
                const dateValue = portfolio.createdAt || portfolio.updatedAt;
                if (!dateValue) return true;
                const date = new Date(dateValue);
                if (from && date < from) return false;
                if (toEnd && date > toEnd) return false;
                return true;
            });
        },
        isAllSelected() {
            return this.filteredPortfolios.length > 0
                && this.filteredPortfolios.every(portfolio => this.selectedIds.includes(portfolio.id));
        },
        canImport() {
            return this.isLoaded && this.errors.length === 0 && this.selectedIds.length > 0 && !this.isImporting;
        }
    },

    watch: {
        filteredPortfolios() {
            const allowedIds = new Set(this.filteredPortfolios.map(p => p.id));
            this.selectedIds = this.selectedIds.filter(id => allowedIds.has(id));
            if (!this.selectedIds.length && this.filteredPortfolios.length) {
                this.selectedIds = this.filteredPortfolios.map(p => p.id);
            }
            this.updateImportButton();
        },
        mode() {
            this.updateImportButton();
        },
        canImport() {
            this.updateImportButton();
        }
    },

    methods: {
        handleFileChange(event) {
            const file = event.target.files && event.target.files[0];
            if (!file) return;
            this.fileName = file.name;
            this.resetState();

            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const payload = JSON.parse(String(reader.result || ''));
                    this.payload = payload;
                    this.errors = this.validatePayload(payload);
                    this.isLoaded = this.errors.length === 0;
                    if (this.isLoaded) {
                        this.selectedIds = this.filteredPortfolios.map(p => p.id);
                    }
                } catch (error) {
                    this.errors = ['Файл не является корректным JSON.'];
                    this.isLoaded = false;
                } finally {
                    this.updateImportButton();
                }
            };
            reader.readAsText(file);
        },
        resetState() {
            this.payload = null;
            this.errors = [];
            this.isLoaded = false;
            this.selectedIds = [];
        },
        validatePayload(payload) {
            const errors = [];
            if (!payload || typeof payload !== 'object') {
                errors.push('Некорректный формат: корневой объект отсутствует.');
                return errors;
            }
            if (typeof payload.schemaVersion !== 'number') {
                errors.push('Некорректный формат: отсутствует schemaVersion.');
            }
            if (!Array.isArray(payload.portfolios)) {
                errors.push('Некорректный формат: отсутствует список portfolios.');
                return errors;
            }
            payload.portfolios.forEach((portfolio, index) => {
                if (!portfolio || typeof portfolio !== 'object') {
                    errors.push(`Портфель #${index + 1}: некорректная структура.`);
                    return;
                }
                if (!portfolio.id) {
                    errors.push(`Портфель #${index + 1}: отсутствует id.`);
                }
            });
            return errors;
        },
        toggleSelectAll() {
            if (this.isAllSelected) {
                const filteredIds = new Set(this.filteredPortfolios.map(p => p.id));
                this.selectedIds = this.selectedIds.filter(id => !filteredIds.has(id));
            } else {
                const merged = new Set(this.selectedIds);
                this.filteredPortfolios.forEach(p => merged.add(p.id));
                this.selectedIds = Array.from(merged);
            }
            this.updateImportButton();
        },
        formatDate(value) {
            if (!value) return '';
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return '';
            return date.toISOString().slice(0, 10);
        },
        handleImport() {
            if (!this.canImport) return;
            if (!window.portfolioConfig || typeof window.portfolioConfig.importPortfolios !== 'function') {
                this.errors = ['importPortfolios недоступен.'];
                this.updateImportButton();
                return;
            }

            const selectedSet = new Set(this.selectedIds);
            const filtered = this.portfolios.filter(p => selectedSet.has(p.id));
            if (!filtered.length) {
                this.errors = ['Не выбраны portfolioи for импорта.'];
                this.updateImportButton();
                return;
            }

            this.isImporting = true;
            this.updateImportButton();

            const payload = {
                ...this.payload,
                portfolios: filtered
            };

            const ok = window.portfolioConfig.importPortfolios(payload, { mode: this.mode });
            if (ok) {
                if (window.eventBus) {
                    window.eventBus.emit('portfolios-imported', { count: filtered.length });
                }
                if (window.messagesStore) {
                    window.messagesStore.addMessage({
                        type: 'success',
                        text: `Импортировано portfolios: ${filtered.length}`,
                        duration: 2500
                    });
                }
            } else {
                this.errors = ['Импорт завершился с ошибкой.'];
            }

            this.isImporting = false;
            this.updateImportButton();
        },
        updateImportButton() {
            if (!this.modalApi) return;
            this.modalApi.updateButton('import', {
                disabled: !this.canImport || this.isImporting,
                label: this.isImporting ? 'Импорт...' : 'Импортировать'
            });
        }
    },

    mounted() {
        if (this.modalApi) {
            this.modalApi.registerButton('import', {
                locations: ['footer'],
                label: 'Импортировать',
                variant: 'primary',
                disabled: true,
                onClick: () => this.handleImport()
            });
        }
    },

    beforeUnmount() {
        if (this.modalApi) {
            this.modalApi.removeButton('import');
        }
    }
};
