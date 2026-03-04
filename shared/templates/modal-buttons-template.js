/**
 * #JS-xriQKxoX
 * @description Template for cmp-modal-buttons (script type=text/x-template id=modal-buttons-template); v-for processedButtons, cmp-button.
 * @see id:sk-318305
 */

(function() {
    'use strict';

    const TEMPLATE = `<template v-if="processedButtons.length > 0">
    <cmp-button
        v-for="button in processedButtons"
        :key="button.id"
        :label="button.label"
        :variant="button.variant"
        :disabled="button.disabled"
        :icon="button.icon"
        :tooltip-icon="button.tooltipIcon"
        :tooltip-text="button.tooltipText"
        :classes-add="button.classesAdd"
        :button-attributes="button.buttonAttributes"
        @click="handleClick(button)">
    </cmp-button>
</template>`;

    /**
     * Injects template into DOM
     */
    function insertTemplate() {
        const templateScript = document.createElement('script');
        templateScript.type = 'text/x-template';
        templateScript.id = 'modal-buttons-template';
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

