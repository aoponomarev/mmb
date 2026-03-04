/**
 * #JS-SM3w4kNX
 * @description x-template for app footer; id="app-footer-template"; fixed-bottom, metrics, crypto news; ref app-footer.js, styles/layout/footer.css.
 *
 * PURPOSE: Template in DOM before Vue init; string → script type="text/x-template" → document.body.
 *
 * REFERENCES: id:sk-318305; app/components/app-footer.js
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

