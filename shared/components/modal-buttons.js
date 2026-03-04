/**
 * ================================================================================================
 * MODAL BUTTONS COMPONENT - Renders modal buttons in header or footer from single registry
 * ================================================================================================
 *
 * PURPOSE: Render modal buttons in header or footer from unified button API.
 *
 * @skill-anchor id:sk-add9a6 #for-classes-add-remove
 * @skill-anchor id:sk-eeb23d #for-bootstrap-event-proxying
 * @skill-anchor id:sk-cb75ec #for-utility-availability-check
 *
 * API: props location ('header'|'footer'), leftOnly, rightOnly. Inject: modalApi (from cmp-modal).
 *
*/

window.cmpModalButtons = {
    template: '#modal-buttons-template',

    inject: ['modalApi'],

    props: {
        location: {
            type: String,
            required: true,
            validator: (value) => ['header', 'footer'].includes(value)
        },
        leftOnly: {
            type: Boolean,
            default: false
        },
        rightOnly: {
            type: Boolean,
            default: false
        }
    },

    components: {
        'cmp-button': window.cmpButton
    },

    data() {
        return {
            buttons: []
        };
    },

    computed: {
        /**
         * Buttons processed for header vs footer (header: icon-only, link style; footer: filter Close)
         */
        processedButtons() {
            let initialButtons = [...this.buttons];

            if (this.location === 'footer') {
                initialButtons = initialButtons.filter(button => {
                    const isCloseButton = button.id === 'close' || button.label === 'Закрыть';
                    if (isCloseButton) {
                        // Close button not used; Cancel and Save used instead
                        return false;
                    }
                    return true;
                });
            }

            let processed = initialButtons.map(button => {
                // Header: icon-only (no label, variant link, no underline, no horizontal padding)
                if (this.location === 'header') {
                    return {
                        ...button,
                        label: null,
                        variant: 'link',
                        classesAdd: {
                            ...(button.classesAdd || {}),
                            root: `${button.classesAdd?.root || ''} text-decoration-none px-0`.trim()
                        }
                    };
                }
                return button;
            });

            // Filter by left/right side for footer
            if (this.location === 'footer') {
                if (this.leftOnly) {
                    processed = processed.filter(b => b.classesAdd?.root?.includes('me-auto'));
                } else if (this.rightOnly) {
                    processed = processed.filter(b => !b.classesAdd?.root?.includes('me-auto'));
                }
            }

            processed.sort((a, b) => {
                const aHasMeAuto = a.classesAdd?.root?.includes('me-auto') || false;
                const bHasMeAuto = b.classesAdd?.root?.includes('me-auto') || false;
                // Left block (me-auto) first; sort keeps correct block distribution
                if (aHasMeAuto && !bHasMeAuto) return -1;
                if (!aHasMeAuto && bHasMeAuto) return 1;
                return 0;
            });

            return processed;
        }
    },

    methods: {
        /**
         * Refresh button list for current location
         */
        updateButtons() {
            if (this.modalApi && this.modalApi.getButtonsForLocation) {
                const buttons = this.modalApi.getButtonsForLocation(this.location);
                this.buttons = buttons;
            }
        },

        /**
         * Button click handler
         * @param {Object} button - button config
         */
        handleClick(button) {
            if (button.onClick && !button.disabled) {
                button.onClick();
            }
        }
    },

    mounted() {
        this.updateButtons();

        // Watch modalApi for button changes
        this.$watch(
            () => {
                return this.modalApi ? this.modalApi.getButtonsForLocation(this.location) : [];
            },
            (newButtons) => {
                this.buttons = newButtons;
            },
            { deep: true, immediate: true }
        );
    }
};

