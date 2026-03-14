/**
 * #JS-hW2tvEdg
 * @description Cloud archive modal body: list archived portfolios with restore/delete actions.
 * @skill id:sk-c3d639
 */
 
(function() {
    'use strict';

    window.portfolioCloudArchiveModalBody = {
        template: `
            <div class="portfolio-cloud-archive-modal d-flex flex-column gap-2">
                <div class="small text-muted">
                    Здесь показаны портфели, помеченные как архивные (скрыты из меню).
                </div>

                <div v-if="!archivedPortfolios || archivedPortfolios.length === 0" class="text-center text-muted py-4">
                    Нет архивных портфелей
                </div>

                <div v-else>
                    <table class="table table-sm mb-0">
                        <tbody>
                            <tr v-for="p in archivedPortfolios" :key="p.id" class="align-middle">
                                <td class="text-start text-muted" style="width: 1%; white-space: nowrap; font-size: 0.75rem;">
                                    {{ formatDateTime(p) }}
                                </td>
                                <td class="text-start">
                                    <a
                                        href="#"
                                        class="text-body text-decoration-none"
                                        @click.prevent="onView ? onView(p.id) : null"
                                    >{{ getNameWithoutTimestamp(p) }}</a>
                                </td>
                                <td class="text-end" style="width: 1%; white-space: nowrap;">
                                    <div class="d-inline-flex align-items-center justify-content-end gap-2">
                                        <div class="dropdown" @mouseleave="hideBadgeDropdownOnMouseLeave">
                                            <span
                                                :class="['badge', (p.marketMetrics?.pl || 0) >= 0 ? 'bg-success' : 'bg-danger']"
                                                style="font-size: 0.65rem; cursor: default;"
                                                role="button"
                                                tabindex="0"
                                                data-bs-toggle="dropdown"
                                                data-role="badge-dropdown-toggle"
                                                aria-expanded="false"
                                                @click.stop.prevent
                                            >
                                                {{ (p.marketMetrics?.pl || 0) >= 0 ? '+' : '' }}{{ (p.marketMetrics?.pl || 0).toFixed(1) }}%
                                            </span>
                                            <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end shadow-lg border-secondary portfolio-cloud-archive-action-menu">
                                                <li v-if="onExport">
                                                    <a class="dropdown-item" href="#" @click.stop.prevent="onExport ? onExport(p.id) : null">
                                                        Сохранить
                                                    </a>
                                                </li>
                                                <li>
                                                    <a class="dropdown-item" href="#" @click.stop.prevent="onRestore ? onRestore(p.id) : null">
                                                        Вернуть
                                                    </a>
                                                </li>
                                                <li>
                                                    <a class="dropdown-item text-danger" href="#" @click.stop.prevent="onDelete ? onDelete(p.id) : null">
                                                        Удалить
                                                    </a>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `,
        props: {
            archivedPortfolios: { type: Array, default: () => [] },
            onRestore: { type: Function, default: null },
            onDelete: { type: Function, default: null },
            onView: { type: Function, default: null },
            onExport: { type: Function, default: null }
        },
        methods: {
            formatDateTime(portfolio) {
                const src = portfolio?.updatedAt || portfolio?.createdAt;
                if (!src) return '';
                const date = new Date(src);
                if (Number.isNaN(date.getTime())) {
                    return '';
                }
                const dd = String(date.getDate()).padStart(2, '0');
                const mm = String(date.getMonth() + 1).padStart(2, '0');
                const yy = String(date.getFullYear()).slice(-2);
                const hh = String(date.getHours()).padStart(2, '0');
                const min = String(date.getMinutes()).padStart(2, '0');
                return `${dd}.${mm}.${yy} ${hh}:${min}`;
            },
            getNameWithoutTimestamp(portfolio) {
                const name = typeof portfolio?.name === 'string' ? portfolio.name : '';
                if (!name) return '';
                const parts = name.split('|');
                if (parts.length >= 2 && parts[0].startsWith('L:') && parts[1].startsWith('S:')) {
                    return `${parts[0]}|${parts[1]}`;
                }
                if (parts.length > 2) {
                    return parts.slice(0, parts.length - 2).join('|');
                }
                return name;
            },
            hideBadgeDropdownOnMouseLeave(event) {
                const root = event?.currentTarget;
                const toggle = root?.querySelector?.('[data-role="badge-dropdown-toggle"]');
                if (!toggle || !window.bootstrap?.Dropdown) return;
                try {
                    const instance = window.bootstrap.Dropdown.getInstance(toggle);
                    if (instance) instance.hide();
                } catch (_) {
                    // best-effort
                }
            }
        }
    };
})();

