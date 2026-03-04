/**
 * #JS-X32EmWyq
 * @description Reusable timezone selector (SSOT); props modelValue, emits update:modelValue.
 * @skill-anchor id:sk-add9a6 #for-classes-add-remove
 * @skill-anchor id:sk-eeb23d #for-bootstrap-event-proxying
 * @skill-anchor id:sk-cb75ec #for-utility-availability-check
 */

window.cmpTimezoneSelector = {
    template: '#timezone-selector-template',

    props: {
        modelValue: {
            type: String,
            required: true
        }
    },

    emits: ['update:modelValue']
};

