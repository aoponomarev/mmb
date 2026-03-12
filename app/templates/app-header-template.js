/**
 * #JS-vK2JcZrV
 * @description x-template for app header (menu + settings); id="app-header-template"; ref app-header.js, #CSS-xrZxCxoN (header.css).
 *
 * PURPOSE: Template in DOM before Vue init; string → script type="text/x-template" → document.body. Slots: #menu-items, #portfolio-items, #settings-items.
 *
 * REFERENCES: id:sk-483943 (x-template extraction); #JS-Cu2wz595 (app-header.js)
 */

(function() {
    'use strict';

    const TEMPLATE = `<header class="fixed-top bg-dark bg-opacity-90 app-header" data-bs-theme="dark">
    <div class="d-flex align-items-center justify-content-between px-0 px-lg-2">
            <!-- Menu button (hamburger) - left -->
            <cmp-dropdown
                button-text=""
                button-icon="fas fa-bars"
                button-variant="link"
                :menu-offset="-8"
                :classes-add="{ button: 'hide-suffix rounded-0 icon-only border-0 text-white text-decoration-none', buttonIcon: 'text-white', buttonContainer: 'py-3' }">
                <template #items>
                    <slot name="menu-items"></slot>
                </template>
            </cmp-dropdown>

        <!-- Center block: 5 controls without extra wrappers -->
        <div class="flex-grow-1 d-flex align-items-center justify-content-around justify-content-lg-between gap-2 flex-wrap flex-lg-nowrap">
            <!-- Forecast horizon (number field, no dropdown) -->
            <cmp-combobox
                mode="input"
                input-id="horizon-select"
                :model-value="horizonDays"
                input-type="number"
                label="ГП"
                placeholder="ГП"
                :allow-custom="true"
                :clearable="false"
                size="sm"
                :input-min="1"
                :input-max="90"
                :input-step="1"
                :input-style="{ width: '2.5em' }"
                :tooltip="tooltipHorizonDays"
                :classes-add="{
                    root: 'w-auto rounded header-inset-1',
                    input: 'text-center border-0 bg-transparent hide-spinners',
                    label: 'text-white-50'
                }"
                @update:model-value="handleHorizonChange"
            ></cmp-combobox>

            <!-- mdnHours radio buttons (D.2: MDN value indication and smart coloring) -->
            <cmp-button-group
                :buttons="[
                    {
                        type: 'radio',
                        label: '4h: ' + (marketDirection.mdn4h !== undefined ? marketDirection.mdn4h : '—'),
                        labelShort: '4h',
                        variant: 'outline-light',
                        active: Number(mdnHours) === 4,
                        hours: 4,
                        tooltip: tooltipMdnHours4h,
                        class: (Number(mdnHours) === 4)
                            ? (marketDirection.mdn4h > 0 ? 'bg-success border-success text-white' : (marketDirection.mdn4h < 0 ? 'bg-danger border-danger text-white' : ''))
                            : (marketDirection.mdn4h > 0 ? 'text-success border-success' : (marketDirection.mdn4h < 0 ? 'text-danger border-danger' : 'border-secondary'))
                    },
                    {
                        type: 'radio',
                        label: '8h: ' + (marketDirection.mdn8h !== undefined ? marketDirection.mdn8h : '—'),
                        labelShort: '8h',
                        variant: 'outline-light',
                        active: Number(mdnHours) === 8,
                        hours: 8,
                        tooltip: tooltipMdnHours8h,
                        class: (Number(mdnHours) === 8)
                            ? (marketDirection.mdn8h > 0 ? 'bg-success border-success text-white' : (marketDirection.mdn8h < 0 ? 'bg-danger border-danger text-white' : ''))
                            : (marketDirection.mdn8h > 0 ? 'text-success border-success' : (marketDirection.mdn8h < 0 ? 'text-danger border-danger' : 'border-secondary'))
                    },
                    {
                        type: 'radio',
                        label: '12h: ' + (marketDirection.mdn12h !== undefined ? marketDirection.mdn12h : '—'),
                        labelShort: '12h',
                        variant: 'outline-light',
                        active: Number(mdnHours) === 12,
                        hours: 12,
                        tooltip: tooltipMdnHours12h,
                        class: (Number(mdnHours) === 12)
                            ? (marketDirection.mdn12h > 0 ? 'bg-success border-success text-white' : (marketDirection.mdn12h < 0 ? 'bg-danger border-danger text-white' : ''))
                            : (marketDirection.mdn12h > 0 ? 'text-success border-success' : (marketDirection.mdn12h < 0 ? 'text-danger border-danger' : 'border-secondary'))
                    }
                ]"
                size="sm"
                variant="outline-light"
                collapse-breakpoint="lg"
                dropdown-variant="link"
                :dropdown-dynamic-label="true"
                :dropdown-dynamic-label-short="true"
                :dropdown-menu-style="{ minWidth: '5em' }"
                :classes-add="{
                    root: 'btn-group-responsive-vertical-sm',
                    dropdownButton: 'text-white text-decoration-none hide-suffix border border-secondary bg-transparent px-0'
                }"
                @button-toggle="data => handleMdnHoursChange(data?.button?.hours ?? data?.button?.label)"
            ></cmp-button-group>

            <!-- AGR method selection -->
            <div class="d-flex align-items-center gap-2">
                <span class="text-white-50 small d-none d-lg-inline" :title="tooltipAgrLabel">AGR:</span>
                <cmp-button-group
                    :buttons="[
                        { type: 'radio', label: 'DCS', labelShort: 'DCS', variant: 'outline-light', active: agrMethod === 'dcs', value: 'dcs', tooltip: tooltipAgrDcs, class: [agrMethod === 'dcs' ? '' : 'border-secondary', recommendedAgrMethod === 'dcs' ? 'fw-bold' : ''] },
                        { type: 'radio', label: 'TSI', labelShort: 'TSI', variant: 'outline-light', active: agrMethod === 'tsi', value: 'tsi', tooltip: tooltipAgrTsi, class: [agrMethod === 'tsi' ? '' : 'border-secondary', recommendedAgrMethod === 'tsi' ? 'fw-bold' : ''] },
                        { type: 'radio', label: 'MPS', labelShort: 'MPS', variant: 'outline-light', active: agrMethod === 'mp', value: 'mp', tooltip: tooltipAgrMp, class: [agrMethod === 'mp' ? '' : 'border-secondary', recommendedAgrMethod === 'mp' ? 'fw-bold' : ''] }
                    ]"
                    size="sm"
                    variant="outline-light"
                    collapse-breakpoint="lg"
                    dropdown-variant="link"
                    :dropdown-dynamic-label="true"
                    :dropdown-dynamic-label-short="true"
                    :dropdown-menu-style="{ minWidth: '4em' }"
                    :classes-add="{
                        root: 'btn-group-responsive-vertical-sm',
                        dropdownButton: 'text-white text-decoration-none hide-suffix border border-secondary bg-transparent px-0'
                    }"
                    @button-toggle="data => handleAgrMethodChange(data?.button?.value)"
            ></cmp-button-group>
        </div>

            <!-- Tab radio button group -->
            <cmp-button-group
                v-if="displayTabs && displayTabs.length > 0"
                :buttons="displayTabs.map(t => ({ ...t, class: t.active ? '' : 'border-secondary', tooltip: getTabTooltip(t.id) }))"
                size="sm"
                variant="outline-light"
                collapse-breakpoint="lg"
                dropdown-variant="link"
                :dropdown-dynamic-label="true"
                :dropdown-dynamic-label-short="true"
                :classes-add="{
                    root: 'btn-group-responsive-vertical-sm',
                    dropdownButton: 'text-white text-decoration-none hide-suffix border border-secondary bg-transparent px-0'
                }"
                @button-toggle="handleTabToggle"
            ></cmp-button-group>

            <!-- Portfolio access and create portfolio -->
            <cmp-dropdown
                :button-text="(portfolio.longCount || 0) + '/' + (portfolio.shortCount || 0)"
                :button-text-short="(portfolio.longCount || 0) + '/' + (portfolio.shortCount || 0)"
                button-variant="outline-light"
                size="sm"
                :menu-offset="-8"
                :classes-add="{
                    button: 'text-white text-decoration-none hide-suffix border border-secondary bg-transparent px-0 btn-sm',
                    menu: 'dropdown-menu-dark shadow-lg border-secondary text-start'
                }"
                :tooltip="tooltipPortfolio"
            >
                <template #items>
                    <!-- New portfolio form item -->
                    <li>
                        <a class="dropdown-item d-flex align-items-center py-2 px-3"
                           href="#" @click.prevent="$emit('create-portfolio')">
                            <i class="fas fa-plus fa-fw fa-lg me-2"></i>
                            <span class="small fw-bold">Сформировать новый...</span>
                        </a>
                    </li>

                    <!-- Portfolio action items (slot) -->
                    <slot name="portfolio-items"></slot>

                    <template v-if="userPortfolios && userPortfolios.length > 0">
                        <div class="dropdown-divider border-secondary opacity-25"></div>
                        <h6 class="dropdown-header d-flex justify-content-between align-items-center py-2 px-3">
                            <span style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px;">Мои портфели</span>
                            <span class="badge bg-secondary ms-2" style="font-size: 0.6rem;">{{ userPortfolios.length }}</span>
                        </h6>
                        <li v-for="p in userPortfolios" :key="p.id">
                            <a class="dropdown-item d-flex justify-content-between align-items-center py-2 px-3"
                               href="#"
                               @click.prevent="handleViewPortfolio(p.id)"
                               :class="getPortfolioItemClasses(p)">
                                <div class="d-flex flex-column">
                                    <div class="d-flex align-items-center gap-2 flex-wrap">
                                        <span class="fw-bold small">{{ p.name }}</span>
                                        <span
                                            v-if="isConflictPortfolio(p)"
                                            class="app-portfolio-sync-marker app-portfolio-sync-marker-conflict"
                                            :title="getPortfolioConflictTooltip()"
                                        >
                                            <i class="fas fa-triangle-exclamation"></i>
                                            <span>{{ getPortfolioConflictLabel() }}</span>
                                        </span>
                                    </div>
                                    <span class="text-white-50" style="font-size: 0.65rem;">{{ p.id }}</span>
                                </div>
                                <span :class="['badge ms-3', (p.marketMetrics?.pl || 0) >= 0 ? 'bg-success' : 'bg-danger']" style="font-size: 0.65rem;">
                                    {{ (p.marketMetrics?.pl || 0) >= 0 ? '+' : '' }}{{ (p.marketMetrics?.pl || 0).toFixed(1) }}%
                                </span>
                            </a>
                        </li>
                    </template>
                </template>
            </cmp-dropdown>
        </div>

        <!-- Settings button (gear/id-card) -->
            <cmp-dropdown
                button-text=""
                :button-icon="settingsIcon"
                button-variant="link"
                :menu-offset="-8"
                :classes-add="{ button: 'hide-suffix rounded-0 icon-only border-0 text-white text-decoration-none', buttonIcon: 'text-white', buttonContainer: 'py-3', menu: 'text-end' }">
                <template #items>
                    <slot name="settings-items"></slot>
                </template>
            </cmp-dropdown>
    </div>

    <!-- Second row: Info-box (Long/Short, Medians) -->
    <div class="header-info-row d-flex align-items-center px-0 px-lg-2 flex-wrap justify-content-center justify-content-lg-start">
        <!-- Section 1: Long/Short -->
        <div class="flex-grow-1 d-flex align-items-center justify-content-center py-1" :title="tooltipLongShort">
            <span class="text-muted pe-2 d-none d-lg-inline">Long/Short:</span>
            <div class="d-flex gap-3">
                <span :title="tooltipBullishPercent" class="info-value">
                    Bull:<span :class="marketBreadth.bullishPercent >= 0.5 ? 'positive' : 'negative'">{{ marketBreadth.bullishPercent !== undefined ? (marketBreadth.bullishPercent * 100).toFixed(1) + '%' : '—' }}</span>
                </span>
                <span :title="tooltipCdhRatio" class="info-value">
                    CDH:<span>{{ marketBreadth.cdhRatio || '—' }}</span>
                </span>
                <span :title="tooltipCgrRatio" class="info-value">
                    CGR:<span>{{ marketBreadth.cgrRatio || '—' }}</span>
                </span>
                <span :title="tooltipAgrRatio" class="info-value">
                    AGR:<span>{{ marketBreadth.agrRatio || '—' }}</span>
                </span>
            </div>
        </div>

        <!-- Section 2: Medians -->
        <div class="flex-grow-1 d-flex align-items-center justify-content-center py-1">
            <span class="text-muted pe-2">Медианы:</span>
            <div class="d-flex gap-3">
                <span :title="tooltipMedianCdh" class="info-value">
                    CDH:<span :class="medians.cdh >= 0 ? 'positive' : 'negative'">{{ medians.cdh !== undefined ? medians.cdh.toFixed(2) : '—' }}</span>
                </span>
                <span :title="tooltipMedianCgr" class="info-value">
                    CGR:<span :class="medians.cgr >= 0 ? 'positive' : 'negative'">{{ medians.cgr !== undefined ? medians.cgr.toFixed(2) : '—' }}</span>
                </span>
                <span :title="tooltipMedianAgr" class="info-value">
                    AGR:<span :class="medians.agr >= 0 ? 'positive' : 'negative'">{{ medians.agr !== undefined ? medians.agr.toFixed(2) : '—' }}</span>
                </span>
            </div>
        </div>
    </div>
</header>`;

    /**
     * Insert template into DOM
     */
    function insertTemplate() {
        const templateScript = document.createElement('script');
        templateScript.type = 'text/x-template';
        templateScript.id = 'app-header-template';
        templateScript.textContent = TEMPLATE;
        document.body.appendChild(templateScript);
    }

    // Insert template on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', insertTemplate);
    } else {
        insertTemplate();
    }
})();

