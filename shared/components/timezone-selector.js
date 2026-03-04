/**
 * ================================================================================================
 * TIMEZONE SELECTOR COMPONENT - Timezone picker
 * ================================================================================================
 *
 * PURPOSE: Reusable timezone selector to avoid duplicating markup (SSOT). Props: modelValue. Emits: update:modelValue.
 *
 * @skill-anchor id:sk-add9a6 #for-classes-add-remove
 * @skill-anchor id:sk-eeb23d #for-bootstrap-event-proxying
 * @skill-anchor id:sk-cb75ec #for-utility-availability-check
 *
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

