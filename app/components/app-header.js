/**
 * #JS-Cu2wz595
 * @description Application header: menu and settings buttons; dark theme; cmp-dropdown.
 * @skill id:sk-e0b8f3
 * @skill-anchor id:sk-add9a6 #for-classes-add-remove
 * @skill-anchor id:sk-eeb23d #for-bootstrap-event-proxying
 * @skill-anchor id:sk-cb75ec #for-utility-availability-check
 *
 * SLOTS: #menu-items (hamburger left), #portfolio-items (create/list), #settings-items (right).
 */

window.appHeader = {
    template: '#app-header-template',
    components: {
        'cmp-dropdown': window.cmpDropdown,
        'cmp-button-group': window.cmpButtonGroup,
        'cmp-combobox': window.cmpCombobox,
        'cmp-button': window.cmpButton
    },
    data() {
        return {
            uiState: window.uiState ? window.uiState.getState() : null
        };
    },
    props: {
        isAuthenticated: {
            type: Boolean,
            default: false
        },
        displayTabs: {
            type: Array,
            default: () => []
        },
        horizonDays: {
            type: [Number, String],
            default: 2
        },
        mdnHours: {
            type: [Number, String],
            default: 4
        },
        mdnValue: {
            type: [Number, String, null],
            default: null
        },
        agrMethod: {
            type: String,
            default: 'mp'
        },
        recommendedAgrMethod: {
            type: [String, null],
            default: null
        },
        // Data for Info-box (second header row)
        medians: {
            type: Object,
            default: () => ({})
        },
        marketBreadth: {
            type: Object,
            default: () => ({})
        },
        marketDirection: {
            type: Object,
            default: () => ({})
        },
        portfolio: {
            type: Object,
            default: () => ({})
        },
        // List of all user portfolios (D.6)
        userPortfolios: {
            type: Array,
            default: () => []
        },
        portfolioMenuMaxHeight: {
            type: String,
            default: '70vh'
        },
        onPortfolioDelete: {
            type: Function,
            default: null
        },
        onPortfolioArchive: {
            type: Function,
            default: null
        },
        onPortfolioExport: {
            type: Function,
            default: null
        }
    },
    methods: {
        escapeHtml(value) {
            const text = value == null ? '' : String(value);
            return text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        },
        handleTabToggle(data) {
            this.$emit('tab-toggle', data);
        },
        handleHorizonChange(value) {
            this.$emit('horizon-change', value);
        },
        handleMdnHoursChange(value) {
            this.$emit('mdn-hours-change', value);
        },
        handleAgrMethodChange(value) {
            this.$emit('agr-method-change', value);
        },
        handleViewPortfolio(portfolioId) {
            this.$emit('view-portfolio', portfolioId);
        },
        handlePortfolioArchive(portfolio, event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            if (typeof this.onPortfolioArchive === 'function') {
                this.onPortfolioArchive(portfolio?.id);
            }
        },
        handlePortfolioDelete(portfolio, event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            if (typeof this.onPortfolioDelete === 'function') {
                this.onPortfolioDelete(portfolio?.id);
            }
        },
        handlePortfolioExport(portfolio, event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            if (typeof this.onPortfolioExport === 'function') {
                this.onPortfolioExport(portfolio?.id);
            }
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
        },
        getPortfolioDisplayName(portfolio) {
            const name = (portfolio && typeof portfolio.name === 'string') ? portfolio.name : '';
            if (!name) return '';

            const parts = name.split('|');
            if (parts.length >= 2 && parts[0].startsWith('L:') && parts[1].startsWith('S:')) {
                const left = parts[0];
                const right = parts[1];

                const formatSegment = (segment) => {
                    const idx = segment.indexOf(':');
                    if (idx === -1) {
                        return this.escapeHtml(segment);
                    }
                    const rawMarker = segment.slice(0, idx); // "L" / "S"
                    const rest = segment.slice(idx + 1);
                    const marker = rawMarker.trim().toUpperCase();
                    const colorClass = marker === 'L' ? 'text-success' : (marker === 'S' ? 'text-danger' : '');
                    const markerHtml = `<span class="fw-bold ${colorClass}">${this.escapeHtml(marker)}</span>`;
                    const colonHtml = `<span class="${colorClass}">:</span>`;
                    return `${markerHtml}${colonHtml}&nbsp;${this.escapeHtml(rest)}`;
                };

                const hasThreeOrMoreTickers = (segment) => {
                    const idx = segment.indexOf(':');
                    const tickersPart = idx >= 0 ? segment.slice(idx + 1) : segment;
                    const tickers = tickersPart.split('-').filter(Boolean);
                    return tickers.length >= 3;
                };

                if (hasThreeOrMoreTickers(left) && hasThreeOrMoreTickers(right)) {
                    return `${formatSegment(left)}<br>${formatSegment(right)}`;
                }

                return `${formatSegment(left)}&nbsp;|&nbsp;${formatSegment(right)}`;
            }

            return this.escapeHtml(name);
        },
        isConflictPortfolio(portfolio) {
            return portfolio?.syncState === 'conflict';
        },
        // @causality #for-conflict-state-marker
        // Conflict forks must stay visually distinct from ordinary unsynced copies.
        getPortfolioItemClasses(portfolio) {
            return {
                'opacity-50': !!portfolio?.syncState && portfolio.syncState !== 'synced' && portfolio.syncState !== 'conflict',
                'app-portfolio-item-conflict': this.isConflictPortfolio(portfolio)
            };
        },
        getPortfolioConflictLabel() {
            return window.tooltipsConfig?.getTooltip('ui.portfolio.syncConflict.badge', this.currentLanguage);
        },
        getPortfolioConflictTooltip() {
            return window.tooltipsConfig?.getTooltip('ui.portfolio.syncConflict.tooltip', this.currentLanguage);
        },
        // Method to get tooltip for column visibility button by id
        getTabTooltip(tabId) {
            const tooltipMap = {
                'percent': this.tooltipTabPercent,
                'complex-deltas': this.tooltipTabComplexDeltas,
                'gradients': this.tooltipTabGradients,
                'result': this.tooltipTabResult
            };
            return tooltipMap[tabId] || '';
        }
    },
    watch: {
        userPortfolios: {
            handler() {
            },
            immediate: false
        }
    },
    computed: {
        visibleUserPortfolios() {
            return (this.userPortfolios || []).filter(p => !p?.archived);
        },
        // Centralized language for tooltips
        currentLanguage() {
            return this.uiState?.tooltips?.currentLanguage || 'ru';
        },
        settingsIcon() {
            return this.isAuthenticated ? 'fas fa-id-card' : 'fas fa-cog';
        },
        // Reactive tooltips for header controls
        tooltipHorizonDays() {
            if (!window.tooltipInterpreter) return '';
            return window.tooltipInterpreter.getTooltip('horizonDays', {
                value: Number(this.horizonDays),
                lang: this.currentLanguage
            });
        },
        // Individual tooltips for hours buttons (4h, 8h, 12h) tied to current MDN value
        tooltipMdnHours4h() {
            if (!window.tooltipInterpreter || !window.tooltipsConfig) return '';
            const staticText = window.tooltipsConfig.getTooltip('metric.mdnHours.description', this.currentLanguage);
            const mdnValue = this.marketDirection?.mdn4h;
            if (mdnValue !== undefined && mdnValue !== null) {
                const interpretation = window.tooltipInterpreter.getInterpretation('mdn', Number(mdnValue), this.currentLanguage);
                return interpretation ? `${staticText}\n${interpretation}` : staticText;
            }
            return staticText;
        },
        tooltipMdnHours8h() {
            if (!window.tooltipInterpreter || !window.tooltipsConfig) return '';
            const staticText = window.tooltipsConfig.getTooltip('metric.mdnHours.description', this.currentLanguage);
            const mdnValue = this.marketDirection?.mdn8h;
            if (mdnValue !== undefined && mdnValue !== null) {
                const interpretation = window.tooltipInterpreter.getInterpretation('mdn', Number(mdnValue), this.currentLanguage);
                return interpretation ? `${staticText}\n${interpretation}` : staticText;
            }
            return staticText;
        },
        tooltipMdnHours12h() {
            if (!window.tooltipInterpreter || !window.tooltipsConfig) return '';
            const staticText = window.tooltipsConfig.getTooltip('metric.mdnHours.description', this.currentLanguage);
            const mdnValue = this.marketDirection?.mdn12h;
            if (mdnValue !== undefined && mdnValue !== null) {
                const interpretation = window.tooltipInterpreter.getInterpretation('mdn', Number(mdnValue), this.currentLanguage);
                return interpretation ? `${staticText}\n${interpretation}` : staticText;
            }
            return staticText;
        },
        // Tooltip for AGR label
        tooltipAgrLabel() {
            if (!window.tooltipsConfig) return '';
            const lang = this.currentLanguage;
            return window.tooltipsConfig.getTooltip('metric.agrMethod.description', this.currentLanguage);
        },
        // Individual tooltips for AGR buttons (DCS, TSI, MP)
        tooltipAgrDcs() {
            if (!window.tooltipsConfig) return '';
            const lang = this.currentLanguage;
            return window.tooltipsConfig.getTooltip('metric.dcs.description', this.currentLanguage);
        },
        tooltipAgrTsi() {
            if (!window.tooltipsConfig) return '';
            const lang = this.currentLanguage;
            return window.tooltipsConfig.getTooltip('metric.tsi.description', this.currentLanguage);
        },
        tooltipAgrMp() {
            if (!window.tooltipsConfig) return '';
            const lang = this.currentLanguage;
            return window.tooltipsConfig.getTooltip('metric.mp.description', this.currentLanguage);
        },
        tooltipMdn() {
            if (!window.tooltipInterpreter) return '';
            return window.tooltipInterpreter.getTooltip('mdn', {
                value: Number(this.mdnValue),
                lang: this.currentLanguage
            });
        },
        tooltipLongShort() {
            if (!window.tooltipInterpreter) return '';
            return window.tooltipInterpreter.getTooltip('longShort', {
                lang: this.currentLanguage
            });
        },
        // Individual tooltips for column visibility buttons
        tooltipTabPercent() {
            if (!window.tooltipsConfig) return '';
            const lang = this.currentLanguage;
            return window.tooltipsConfig.getTooltip('metric.columnVisibility.percent.description', this.currentLanguage);
        },
        tooltipTabComplexDeltas() {
            if (!window.tooltipsConfig) return '';
            const lang = this.currentLanguage;
            return window.tooltipsConfig.getTooltip('metric.columnVisibility.complexDeltas.description', this.currentLanguage);
        },
        tooltipTabGradients() {
            if (!window.tooltipsConfig) return '';
            const lang = this.currentLanguage;
            return window.tooltipsConfig.getTooltip('metric.columnVisibility.gradients.description', this.currentLanguage);
        },
        tooltipTabResult() {
            if (!window.tooltipsConfig) return '';
            const lang = this.currentLanguage;
            return window.tooltipsConfig.getTooltip('metric.columnVisibility.result.description', this.currentLanguage);
        },
        tooltipPortfolio() {
            if (!window.tooltipsConfig) return '';
            const lang = this.currentLanguage;
            const baseText = window.tooltipsConfig.getTooltip('metric.portfolioAccess.description', this.currentLanguage);
            const longCount = this.portfolio?.longCount || 0;
            const shortCount = this.portfolio?.shortCount || 0;
            if (longCount > 0 || shortCount > 0) {
                const lsHeader = window.tooltipsConfig.getTooltip('metric.portfolioAccess.lsHeader', this.currentLanguage);
                const lsLong = window.tooltipsConfig.getTooltip('metric.portfolioAccess.lsLong', this.currentLanguage);
                const lsShort = window.tooltipsConfig.getTooltip('metric.portfolioAccess.lsShort', this.currentLanguage);
                return `${baseText}\n\n${lsHeader}\n${lsLong}: ${longCount}\n${lsShort}: ${shortCount}`;
            }
            return baseText;
        },
        // Enhanced tooltips for Long/Short metrics
        tooltipLongShort() {
            if (!window.tooltipsConfig) return '';
            const lang = this.currentLanguage;
            return window.tooltipsConfig.getTooltip('metric.longShort.description', this.currentLanguage);
        },
        tooltipBullishPercent() {
            if (!window.tooltipsConfig) return '';
            const lang = this.currentLanguage;
            return window.tooltipsConfig.getTooltip('metric.bullishPercent.description', this.currentLanguage);
        },
        tooltipCdhRatio() {
            if (!window.tooltipsConfig) return '';
            const lang = this.currentLanguage;
            return window.tooltipsConfig.getTooltip('metric.cdhRatio.description', this.currentLanguage);
        },
        tooltipCgrRatio() {
            if (!window.tooltipsConfig) return '';
            const lang = this.currentLanguage;
            return window.tooltipsConfig.getTooltip('metric.cgrRatio.description', this.currentLanguage);
        },
        tooltipAgrRatio() {
            if (!window.tooltipsConfig) return '';
            const lang = this.currentLanguage;
            return window.tooltipsConfig.getTooltip('metric.agrRatio.description', this.currentLanguage);
        },
        // Per-metric tooltips for medians depending on values
        tooltipMedianCdh() {
            if (!window.tooltipInterpreter || !window.tooltipsConfig) return '';
            const staticText = window.tooltipsConfig.getTooltip('metric.medianCdh.description', this.currentLanguage);
            const cdhValue = this.medians?.cdh;
            if (cdhValue !== undefined && cdhValue !== null) {
                // Use mdn interpretation as CDH has similar logic
                const interpretation = window.tooltipInterpreter.getInterpretation('mdn', Number(cdhValue), this.currentLanguage);
                return interpretation ? `${staticText}\n${interpretation}` : staticText;
            }
            return staticText;
        },
        tooltipMedianCgr() {
            if (!window.tooltipInterpreter || !window.tooltipsConfig) return '';
            const staticText = window.tooltipsConfig.getTooltip('metric.medianCgr.description', this.currentLanguage);
            const cgrValue = this.medians?.cgr;
            if (cgrValue !== undefined && cgrValue !== null) {
                // Use mdn interpretation as CGR has similar logic
                const interpretation = window.tooltipInterpreter.getInterpretation('mdn', Number(cgrValue), this.currentLanguage);
                return interpretation ? `${staticText}\n${interpretation}` : staticText;
            }
            return staticText;
        },
        tooltipMedianAgr() {
            if (!window.tooltipInterpreter || !window.tooltipsConfig) return '';
            const staticText = window.tooltipsConfig.getTooltip('metric.medianAgr.description', this.currentLanguage);
            const agrValue = this.medians?.agr;
            if (agrValue !== undefined && agrValue !== null) {
                // Use agr interpretation
                const interpretation = window.tooltipInterpreter.getInterpretation('agr', Number(agrValue), this.currentLanguage);
                return interpretation ? `${staticText}\n${interpretation}` : staticText;
            }
            return staticText;
        }
    }
};

