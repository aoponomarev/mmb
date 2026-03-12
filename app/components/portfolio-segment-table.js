/**
 * #JS-Ah6d2Adu
 * @description Shared shell for portfolio segment tables; single layout basis for form/view modal segments.
 * @skill id:sk-c3d639
 * @causality #for-segment-table-ssot
 */

(function() {
    'use strict';

    function normalizeWidth(width) {
        if (width === undefined || width === null || width === '') {
            return null;
        }
        if (typeof width === 'number') {
            return `${width}px`;
        }
        return String(width);
    }

    window.portfolioSegmentTable = {
        template: `
            <div :class="rootClasses">
                <div :class="headerClasses">
                    <span :class="titleClasses"><i :class="[iconClass, 'me-1']"></i> {{ resolvedTitle }}</span>
                    <span :class="badgeClasses">{{ resolvedCount }}</span>
                </div>
                <div class="portfolio-segment-table-scroll table-responsive flex-grow-1" :style="scrollStyle">
                    <table :class="tableClasses">
                        <thead class="modal-table-header-themed sticky-top opacity-50">
                            <tr>
                                <th
                                    v-for="(column, index) in normalizedColumns"
                                    :key="column.key || column.label || column.icon || index"
                                    :class="column.headerClass"
                                    :style="getHeaderCellStyle(column)"
                                    :title="column.title || null"
                                >
                                    <i v-if="column.icon" :class="column.icon"></i>
                                    <span v-if="column.label">{{ column.label }}</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <slot name="rows"></slot>
                        </tbody>
                    </table>
                </div>
                <div v-if="$slots.summary" :class="summaryClasses">
                    <slot name="summary"></slot>
                </div>
            </div>
        `,

        props: {
            side: {
                type: String,
                required: true,
                validator: value => ['long', 'short'].includes(String(value || '').toLowerCase())
            },
            title: {
                type: String,
                default: ''
            },
            count: {
                type: Number,
                default: 0
            },
            columns: {
                type: Array,
                default: () => []
            },
            scrollMaxHeight: {
                type: [String, Number],
                default: '250px'
            }
        },

        computed: {
            isLong() {
                return this.side === 'long';
            },
            resolvedTitle() {
                return this.title || (this.isLong ? 'Long' : 'Short');
            },
            resolvedCount() {
                return Number.isFinite(Number(this.count)) ? Number(this.count) : 0;
            },
            iconClass() {
                return this.isLong ? 'fas fa-arrow-up' : 'fas fa-arrow-down';
            },
            rootClasses() {
                return [
                    'portfolio-segment-card',
                    this.isLong ? 'portfolio-segment-card-long' : 'portfolio-segment-card-short',
                    'rounded',
                    'h-100',
                    'overflow-hidden',
                    'd-flex',
                    'flex-column'
                ];
            },
            headerClasses() {
                return [
                    'portfolio-segment-card-header',
                    this.isLong ? 'portfolio-segment-card-header-long' : 'portfolio-segment-card-header-short',
                    'py-1',
                    'px-2',
                    'border-bottom',
                    'd-flex',
                    'justify-content-between',
                    'align-items-center'
                ];
            },
            titleClasses() {
                return [
                    'small',
                    'fw-bold',
                    this.isLong ? 'text-success' : 'text-danger'
                ];
            },
            badgeClasses() {
                return [
                    'badge',
                    'portfolio-segment-card-count',
                    this.isLong ? 'portfolio-segment-card-count-long' : 'portfolio-segment-card-count-short'
                ];
            },
            summaryClasses() {
                return [
                    'portfolio-segment-card-summary',
                    this.isLong ? 'portfolio-segment-card-summary-long' : 'portfolio-segment-card-summary-short',
                    'py-1',
                    'px-2',
                    'small',
                    'd-flex',
                    'align-items-center',
                    'justify-content-center',
                    'gap-2'
                ];
            },
            tableClasses() {
                return [
                    'table',
                    'table-sm',
                    'mb-0',
                    'portfolio-segment-table',
                    this.isLong ? 'portfolio-segment-table-long' : 'portfolio-segment-table-short'
                ];
            },
            scrollStyle() {
                const normalized = normalizeWidth(this.scrollMaxHeight);
                return normalized ? { maxHeight: normalized } : null;
            },
            normalizedColumns() {
                return (this.columns || []).map(column => ({
                    key: column?.key || null,
                    label: column?.label || '',
                    icon: column?.icon || '',
                    title: column?.title || '',
                    headerClass: column?.headerClass || '',
                    width: normalizeWidth(column?.width),
                    style: column?.style && typeof column.style === 'object' ? column.style : null
                }));
            }
        },

        methods: {
            getHeaderCellStyle(column) {
                const style = column?.style ? { ...column.style } : {};
                if (column?.width) {
                    style.width = column.width;
                }
                return Object.keys(style).length > 0 ? style : null;
            }
        }
    };
})();
