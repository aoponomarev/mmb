/**
 * ================================================================================================
 * MODAL TEMPLATE - Modal window component template
 * ================================================================================================
 *
 * PURPOSE: Template for Vue wrapper over Bootstrap Modal (cmp-modal).
 *
 * PROBLEM: Template must be in DOM before Vue.js init for component to work.
 *
 * SOLUTION: Template stored as string in JS file and auto-inserted into DOM
 * on file load as <script type="text/x-template"> element with id="modal-template".
 *
 * HOW:
 * - Template defined as string in TEMPLATE constant
 * - On file load <script type="text/x-template"> element is created
 * - Element appended to document.body with id="modal-template"
 * - Component uses template via template: '#modal-template'
 *
 * TEMPLATE FEATURES:
 * Структура HTML:
 * - Root: ⟨div class="modal fade"⟩ with ref="modalElement" and conditional 'show'
 * - Dialog container: ⟨div class="modal-dialog"⟩ with size and center classes
 * - Content: ⟨div class="modal-content"⟩
 * Layout and CSS:
 * - Bootstrap classes only for styling
 * - Size via Bootstrap classes (modal-sm, modal-lg, modal-xl)
 * - Center via modal-dialog-centered
 * Slots:
 * - #header — modal header
 * - #body — modal body
 * - #footer — modal footer
 *
 * FEATURES:
 * - Dynamic buttons via cmp-modal-buttons
 * - Buttons auto-shown when registered via modalApi
 * - Slots and dynamic buttons can be used together
 *
 * REFERENCES:
 * - General template principles: id:sk-483943 (section "x-template extraction")
 * - Компонент: shared/components/modal.js
 * - Компонент кнопок: shared/components/modal-buttons.js
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
     * Вставляет шаблон в DOM
     */
    function insertTemplate() {
        const templateScript = document.createElement('script');
        templateScript.type = 'text/x-template';
        templateScript.id = 'modal-template';
        templateScript.textContent = TEMPLATE;
        document.body.appendChild(templateScript);
    }

    // Вставляем шаблон при загрузке
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', insertTemplate);
    } else {
        insertTemplate();
    }
})();

