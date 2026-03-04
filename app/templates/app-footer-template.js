/**
 * ================================================================================================
 * APP FOOTER TEMPLATE - App footer component template
 * ================================================================================================
 *
 * PURPOSE: Template for app footer (app-footer).
 *
 * PROBLEM: Template must be in DOM before Vue.js init for component to work.
 *
 * SOLUTION: Template stored as string in JS file and auto-inserted into DOM
 * on load as <script type="text/x-template"> with id="app-footer-template".
 *
 * HOW:
 * - Template defined as string in TEMPLATE constant
 * - On load, <script type="text/x-template"> element is auto-created
 * - Element added to document.body with id="app-footer-template"
 * - Component uses template via template: '#app-footer-template'
 *
 * TEMPLATE FEATURES:
 * HTML structure:
 * - Корневой элемент: ⟨footer⟩ с классами fixed-bottom, bg-body, py-2, px-2 px-md-5, font-monospace, text-muted, d-flex, align-items-center, justify-content-between, flex-wrap
 * - MSK time: hidden on mobile (d-none d-md-inline), visible on desktop
 * - Metrics list: market metrics (FGI, VIX, BTC, OI, FR, LSR) as spans with responsive padding (px-1 px-md-2)
 * - Crypto news: one line under metrics, hidden on mobile (d-none d-md-block), overflow-x-hidden, clickable to toggle, tooltip with full text
 * - No intermediate wrappers: all classes on root footer element
 * Layout and CSS classes:
 * - Фиксированное позиционирование: fixed-bottom
 * - Background: bg-body (inherits theme from body, switches with theme)
 * - Multi-layer shadow upward with cool steel tones
 * - Minimal styles: only base Bootstrap classes (text-muted, small, font-monospace on footer)
 * - Element distribution: d-flex, justify-content-between, flex-wrap for even span distribution
 *
 * REFERENCES:
 * - General principles работы с шаблонами: app/skills/ui-architecture
 * - Компонент: app/components/app-footer.js
 * - Стили: styles/layout/footer.css
 */

(function() {
    'use strict';

    const TEMPLATE = `<footer class="fixed-bottom bg-body app-footer">
    <div class="py-2 px-2 px-md-5 text-muted d-flex align-items-center justify-content-between flex-wrap">
        <span class="d-none d-md-inline px-1 px-md-2" @click="openTimezoneModal" style="cursor: pointer;">{{ timeDisplay }}</span>
        <span class="px-1 px-md-2" :title="tooltipFgi">FGI:{{ fgi }}</span>
        <span class="px-1 px-md-2" :title="tooltipVix">
            <span class="d-inline d-md-none">VIX:{{ formatValueMobile(vixValue, vix) }}</span>
            <span class="d-none d-md-inline">VIX:{{ vix }}</span>
        </span>
        <span class="px-1 px-md-2" :title="tooltipBtcDom">
            <span class="d-inline d-md-none">BTC:{{ formatValueMobile(btcDomValue, btcDom) }}%</span>
            <span class="d-none d-md-inline">BTC:{{ btcDom }}</span>
        </span>
        <span class="px-1 px-md-2" :title="tooltipOi">
            <span class="d-inline d-md-none">OI:{{ formatOIMobile() }}</span>
            <span class="d-none d-md-inline">OI:{{ oi }}</span>
        </span>
        <span class="px-1 px-md-2" :title="tooltipFr">FR:{{ fr }}</span>
        <span class="px-1 px-md-2" :title="tooltipLsr">
            <span class="d-inline d-md-none">LSR:{{ formatValueMobile(lsrValue, lsr) }}</span>
            <span class="d-none d-md-inline">LSR:{{ lsr }}</span>
        </span>
        <span class="px-1 px-md-2" :title="fallbackIndicatorTitle">
            <span class="d-inline d-md-none">FB:{{ fallbackCount }}</span>
            <span class="d-none d-md-inline">Fallbacks:{{ fallbackCount }}</span>
        </span>
        <div class="d-none d-md-block w-100 mt-1 px-1 px-md-2 overflow-x-hidden" style="text-overflow: ellipsis; white-space: nowrap; cursor: pointer;" v-if="currentNews" @click="switchToNextNews" :title="currentNewsTranslated || currentNews">{{ currentNews }}</div>
    </div>
</footer>`;

    /**
     * Insert template into DOM
     */
    function insertTemplate() {
        const templateScript = document.createElement('script');
        templateScript.type = 'text/x-template';
        templateScript.id = 'app-footer-template';
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

