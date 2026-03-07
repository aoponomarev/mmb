/**
 * #JS-q14FRbmB
 * @description Template for cmp-modal (Bootstrap Modal); x-template inserted on load with id="modal-template".
 *
 * PURPOSE: Template in DOM before Vue init; stored as string, appended as <script type="text/x-template">; component uses template: '#modal-template'.
 *
 * HOW: TEMPLATE constant → script element → document.body id="modal-template".
 *
 * FEATURES:
 * - Root modal fade + modal-dialog (size, centered) + modal-content
 * - Slots: #header, #body, #footer; dynamic buttons via cmp-modal-buttons and modalApi
 *
 * REFERENCES:
 * - id:sk-483943 (x-template extraction); #JS-HF48eDDR (modal.js); #JS-r8Uair5H (modal-buttons.js)
 */

(function() {
    'use strict';

    const TEMPLATE = `<div
    :class="modalClasses"
    :id="modalId"
    tabindex="-1"
    :aria-labelledby="computedTitleId"
    :aria-hidden="static ? false : !isOpen"
    :style="static ? 'position: relative; z-index: auto;' : ''"
    ref="modalElement">
    <div :class="dialogClasses">
        <div class="modal-content">
            <div class="modal-header modal-header-themed" v-if="$slots.header || hasHeaderButtons || modalTitle" data-bs-theme="dark">
                <div v-if="hasHeaderButtons" class="pe-2">
                    <cmp-modal-buttons location="header"></cmp-modal-buttons>
                </div>
                <slot name="header">
                    <h5 v-if="modalTitle && !$slots.header" class="modal-title" :id="computedTitleId">{{ modalTitle }}</h5>
                </slot>
            </div>
            <div class="modal-body" v-if="$slots.body">
                <slot name="body"></slot>
            </div>
            <div class="modal-footer modal-footer-themed" v-if="$slots.footer || hasFooterButtons" data-bs-theme="dark">
                <div class="me-auto d-flex align-items-center justify-content-start gap-2" :id="modalId + '-footer-extra'">
                    <cmp-modal-buttons location="footer" v-if="hasFooterButtons" :left-only="true"></cmp-modal-buttons>
                </div>
                <slot name="footer"></slot>
                <cmp-modal-buttons location="footer" v-if="hasFooterButtons" :right-only="true"></cmp-modal-buttons>
            </div>
        </div>
    </div>
</div>`;

    /**
     * Injects template into DOM
     */
    function insertTemplate() {
        const templateScript = document.createElement('script');
        templateScript.type = 'text/x-template';
        templateScript.id = 'modal-template';
        templateScript.textContent = TEMPLATE;
        document.body.appendChild(templateScript);
    }

    // Inject template on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', insertTemplate);
    } else {
        insertTemplate();
    }
})();

