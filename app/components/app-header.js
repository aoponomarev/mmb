/**
 * ================================================================================================
 * APP HEADER COMPONENT - Application header component
 * ================================================================================================
 *
 * PURPOSE: Vue component for application header with menu and settings buttons.
 *
 * @skill-anchor app/skills/component-classes-management #for-classes-add-remove
 * @skill-anchor app/skills/bootstrap-vue-integration #for-bootstrap-event-proxying
 * @skill-anchor app/skills/vue-implementation-patterns #for-utility-availability-check
 * Skill: app/skills/ux-principles
 *
 * SLOTS:
 * - Fixed dark theme (data-bs-theme="dark"), not switchable
 * - Uses cmp-dropdown for menu and settings buttons
 * - Slot support for menu element customization
 *
 * COMPONENT API:
 *
 * SLOTS:
 * - #menu-items — menu elements (hamburger) on the left
 * - #portfolio-items — portfolio menu items (between create and list)
 * - #settings-items — settings menu elements on the right
 *
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
    },
    methods: {
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
            const staticText = window.tooltipsConfig.getTooltip('metric.mdnHours.description');
            const mdnValue = this.marketDirection?.mdn4h;
            if (mdnValue !== undefined && mdnValue !== null) {
                const interpretation = window.tooltipInterpreter.getInterpretation('mdn', Number(mdnValue), this.currentLanguage);
                return interpretation ? `${staticText}\n${interpretation}` : staticText;
            }
            return staticText;
        },
        tooltipMdnHours8h() {
            if (!window.tooltipInterpreter || !window.tooltipsConfig) return '';
            const staticText = window.tooltipsConfig.getTooltip('metric.mdnHours.description');
            const mdnValue = this.marketDirection?.mdn8h;
            if (mdnValue !== undefined && mdnValue !== null) {
                const interpretation = window.tooltipInterpreter.getInterpretation('mdn', Number(mdnValue), this.currentLanguage);
                return interpretation ? `${staticText}\n${interpretation}` : staticText;
            }
            return staticText;
        },
        tooltipMdnHours12h() {
            if (!window.tooltipInterpreter || !window.tooltipsConfig) return '';
            const staticText = window.tooltipsConfig.getTooltip('metric.mdnHours.description');
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
            return window.tooltipsConfig.getTooltip('metric.agrMethod.description');
        },
        // Individual tooltips for AGR buttons (DCS, TSI, MP)
        tooltipAgrDcs() {
            if (!window.tooltipsConfig) return '';
            const lang = this.currentLanguage;
            return window.tooltipsConfig.getTooltip('metric.dcs.description');
        },
        tooltipAgrTsi() {
            if (!window.tooltipsConfig) return '';
            const lang = this.currentLanguage;
            return window.tooltipsConfig.getTooltip('metric.tsi.description');
        },
        tooltipAgrMp() {
            if (!window.tooltipsConfig) return '';
            const lang = this.currentLanguage;
            return window.tooltipsConfig.getTooltip('metric.mp.description');
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
            return window.tooltipsConfig.getTooltip('metric.columnVisibility.percent.description');
        },
        tooltipTabComplexDeltas() {
            if (!window.tooltipsConfig) return '';
            const lang = this.currentLanguage;
            return window.tooltipsConfig.getTooltip('metric.columnVisibility.complexDeltas.description');
        },
        tooltipTabGradients() {
            if (!window.tooltipsConfig) return '';
            const lang = this.currentLanguage;
            return window.tooltipsConfig.getTooltip('metric.columnVisibility.gradients.description');
        },
        tooltipTabResult() {
            if (!window.tooltipsConfig) return '';
            const lang = this.currentLanguage;
            return window.tooltipsConfig.getTooltip('metric.columnVisibility.result.description');
        },
        tooltipPortfolio() {
            if (!window.tooltipsConfig) return '';
            const lang = this.currentLanguage;
            const baseText = window.tooltipsConfig.getTooltip('metric.portfolioAccess.description');
            const longCount = this.portfolio?.longCount || 0;
            const shortCount = this.portfolio?.shortCount || 0;
            if (longCount > 0 || shortCount > 0) {
                const lsHeader = window.tooltipsConfig.getTooltip('metric.portfolioAccess.lsHeader');
                const lsLong = window.tooltipsConfig.getTooltip('metric.portfolioAccess.lsLong');
                const lsShort = window.tooltipsConfig.getTooltip('metric.portfolioAccess.lsShort');
                return `${baseText}\n\n${lsHeader}\n${lsLong}: ${longCount}\n${lsShort}: ${shortCount}`;
            }
            return baseText;
        },
        // Enhanced tooltips for Long/Short metrics
        tooltipLongShort() {
            if (!window.tooltipsConfig) return '';
            const lang = this.currentLanguage;
            return window.tooltipsConfig.getTooltip('metric.longShort.description');
        },
        tooltipBullishPercent() {
            if (!window.tooltipsConfig) return '';
            const lang = this.currentLanguage;
            return window.tooltipsConfig.getTooltip('metric.bullishPercent.description');
        },
        tooltipCdhRatio() {
            if (!window.tooltipsConfig) return '';
            const lang = this.currentLanguage;
            return window.tooltipsConfig.getTooltip('metric.cdhRatio.description');
        },
        tooltipCgrRatio() {
            if (!window.tooltipsConfig) return '';
            const lang = this.currentLanguage;
            return window.tooltipsConfig.getTooltip('metric.cgrRatio.description');
        },
        tooltipAgrRatio() {
            if (!window.tooltipsConfig) return '';
            const lang = this.currentLanguage;
            return window.tooltipsConfig.getTooltip('metric.agrRatio.description');
        },
        // Индивидуальные tooltips for медиан с зависимостью от значений
        tooltipMedianCdh() {
            if (!window.tooltipInterpreter || !window.tooltipsConfig) return '';
            const staticText = window.tooltipsConfig.getTooltip('metric.medianCdh.description');
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
            const staticText = window.tooltipsConfig.getTooltip('metric.medianCgr.description');
            const cgrValue = this.medians?.cgr;
            if (cgrValue !== undefined && cgrValue !== null) {
                // Используем интерпретацию for mdn, так как CGR имеет похожую логику
                const interpretation = window.tooltipInterpreter.getInterpretation('mdn', Number(cgrValue), this.currentLanguage);
                return interpretation ? `${staticText}\n${interpretation}` : staticText;
            }
            return staticText;
        },
        tooltipMedianAgr() {
            if (!window.tooltipInterpreter || !window.tooltipsConfig) return '';
            const staticText = window.tooltipsConfig.getTooltip('metric.medianAgr.description');
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

