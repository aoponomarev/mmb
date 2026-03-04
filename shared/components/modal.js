/**
 * ================================================================================================
 * MODAL COMPONENT - Modal component
 * ================================================================================================
 *
 * PURPOSE: Vue wrapper over Bootstrap Modal with full Bootstrap API access.
 *
 * @skill-anchor id:sk-318305
 * @skill-anchor id:sk-add9a6 #for-classes-add-remove
 * @skill-anchor id:sk-eeb23d #for-bootstrap-event-proxying
 * @skill-anchor id:sk-cb75ec #for-utility-availability-check
 *
 * API: props modalId, size, centered, titleId, static, title. Emits: show, shown, hide, hidden. Slots: header, body, footer. Ref: show(), hide(), toggle(), getBootstrapInstance().
 * Usage: No "Close" button; close via header btn-close or backdrop. "Cancel" in footer (revert or close). "Save" in footer when editable: two states (Save -> Saved, close?); close only via X/backdrop/second click. Title from modals-config (SSOT) or prop title; menu/buttons use modalsConfig.getModalTitle(modalId).
 * provide/inject: modalApi.title, registerButton, updateButton, removeButton, getButton, getButtonsForLocation. One button can show in header, footer, or both; state is shared.
 * bodyComponent in modals-config must be registered in app-ui-root and in modules-config deps or modal body will be empty.
 *
*/

window.cmpModal = {
    template: '#modal-template',

    props: {
        modalId: {
            type: String,
            required: true
        },
        size: {
            type: String,
            default: null,
            validator: (value) => value === null || ['sm', 'lg', 'xl'].includes(value)
        },
        centered: {
            type: Boolean,
            default: false
        },
        titleId: {
            type: String,
            default: null
        },
        static: {
            type: Boolean,
            default: false
        },
        disableClose: {
            type: Boolean,
            default: false
        },
        title: {
            type: String,
            default: null
        }
    },

    components: {
        'cmp-modal-buttons': window.cmpModalButtons
    },

    data() {
        return {
            isOpen: false,
            modalInstance: null,
            // Single registry of all modal buttons (Map<buttonId, config>; one registration, can show in header/footer/both)
            buttons: new Map(),
            // Counter to force reactivity in computed
            buttonsUpdateCounter: 0
        };
    },

    computed: {
        modalTitle() {
            // Priority: prop title > modalsConfig > null
            if (this.title) {
                return this.title;
            }
            if (window.modalsConfig) {
                return window.modalsConfig.getModalTitle(this.modalId);
            }
            return null;
        },
        modalClasses() {
            const classes = ['modal'];
            if (this.static) {
                classes.push('show', 'd-block');
            } else {
                classes.push('fade');
                if (this.isOpen) {
                    classes.push('show');
                }
            }
            return classes;
        },

        dialogClasses() {
            const classes = ['modal-dialog'];
            if (this.size) {
                classes.push(`modal-${this.size}`);
            }
            if (this.centered) {
                classes.push('modal-dialog-centered');
            }
            return classes;
        },

        computedTitleId() {
            return this.titleId || `${this.modalId}-title`;
        },

        /**
         * Whether header has buttons (uses buttonsUpdateCounter for reactivity)
         */
        hasHeaderButtons() {
            const _ = this.buttonsUpdateCounter;
            let hasButtons = false;
            for (const button of this.buttons.values()) {
                if (button.locations.includes('header') && button.visible) {
                    hasButtons = true;
                    break;
                }
            }
            return hasButtons;
        },

        /**
         * Whether footer has buttons (uses buttonsUpdateCounter for reactivity)
         */
        hasFooterButtons() {
            const _ = this.buttonsUpdateCounter;
            let hasButtons = false;
            for (const button of this.buttons.values()) {
                if (button.locations.includes('footer') && button.visible) {
                    hasButtons = true;
                    break;
                }
            }
            return hasButtons;
        }
    },

    methods: {
        show() {
            if (this.modalInstance) {
                this.modalInstance.show();
            }
        },

        hide() {
            // Remove focus before close to avoid a11y "Blocked aria-hidden..." when descendant retained focus
            if (document.activeElement && document.activeElement.blur) {
                document.activeElement.blur();
            }
            if (document.body && document.body.focus) {
                document.body.focus();
            } else {
                document.activeElement?.blur();
            }
            if (this.modalInstance) {
                this.modalInstance.hide();
            }
        },

        toggle() {
            if (this.modalInstance) {
                this.modalInstance.toggle();
            }
        },

        getBootstrapInstance() {
            return this.modalInstance;
        },

        /**
         * Register button in modal. config: locations, label, variant, onClick, disabled, visible, classesAdd, buttonAttributes, icon, tooltipIcon, tooltipText.
         */
        registerButton(buttonId, config) {
            // Normalize locations to array
            const locations = Array.isArray(config.locations)
                ? config.locations
                : [config.locations || 'footer'];

            // Validation locations
            const validLocations = ['header', 'footer'];
            const invalidLocations = locations.filter(loc => !validLocations.includes(loc));
            if (invalidLocations.length > 0) {
                console.warn(`[cmp-modal] Invalid locations for button "${buttonId}":`, invalidLocations);
            }
            const normalizedLocations = locations.filter(loc => validLocations.includes(loc));

            if (normalizedLocations.length === 0) {
                console.warn(`[cmp-modal] No valid locations for button "${buttonId}", defaulting to footer`);
                normalizedLocations.push('footer');
            }

            this.buttons.set(buttonId, {
                id: buttonId,
                locations: normalizedLocations,
                label: config.label || '',
                variant: config.variant || 'primary',
                disabled: config.disabled || false,
                visible: config.visible !== false,
                onClick: config.onClick || null,
                classesAdd: config.classesAdd || {},
                buttonAttributes: config.buttonAttributes || {},
                icon: config.icon || null,
                tooltipIcon: config.tooltipIcon || null,
                tooltipText: config.tooltipText || null
            });

            // Bump counter to refresh computed
            this.buttonsUpdateCounter++;
        },

        /**
         * Update button (reactive in all locations). locations are not updated.
         * @param {string} buttonId - button ID
         * @param {Object} updates - properties to update
         */
        updateButton(buttonId, updates) {
            const button = this.buttons.get(buttonId);
            if (!button) {
                console.warn(`[cmp-modal] Button "${buttonId}" not found for update`);
                return;
            }

            // Update props but do not change locations (set at registration)
            Object.keys(updates).forEach(key => {
                if (key !== 'locations') {
                    button[key] = updates[key];
                }
            });

            // Bump counter to refresh computed
            this.buttonsUpdateCounter++;
        },

        /**
         * Remove button
         * @param {string} buttonId - button ID
         */
        removeButton(buttonId) {
            if (this.buttons.delete(buttonId)) {
                // Bump counter to refresh computed
                this.buttonsUpdateCounter++;
            }
        },

        /**
         * Get button config
         * @param {string} buttonId - button ID
         * @returns {Object|null} - config or null
         */
        getButton(buttonId) {
            return this.buttons.get(buttonId) || null;
        },

        /**
         * Get buttons for location (header or footer)
         * @param {string} location - 'header' or 'footer'
         * @returns {Array<Object>} - button configs
         */
        getButtonsForLocation(location) {
            const result = [];
            for (const button of this.buttons.values()) {
                if (button.locations.includes(location) && button.visible) {
                    result.push(button);
                }
            }
            return result;
        }
    },

    /**
     * Provide modal button API via provide/inject
     */
    provide() {
        return {
            modalApi: {
                title: this.modalTitle,
                registerButton: this.registerButton,
                updateButton: this.updateButton,
                removeButton: this.removeButton,
                getButton: this.getButton,
                getButtonsForLocation: this.getButtonsForLocation,
                show: this.show,
                hide: this.hide,
                toggle: this.toggle
            }
        };
    },

    mounted() {
        // Init Bootstrap Modal via JS API; skip in static mode
        if (this.static) {
            return;
        }

        this.$nextTick(() => {
            if (window.bootstrap && window.bootstrap.Modal && this.$refs.modalElement) {
                this.modalInstance = new window.bootstrap.Modal(this.$refs.modalElement, {
                    backdrop: this.disableClose ? 'static' : true,
                    keyboard: !this.disableClose
                });

                // Subscribe to Bootstrap events for state sync
                this.$refs.modalElement.addEventListener('show.bs.modal', () => {
                    this.isOpen = true;
                    this.$emit('show');
                });

                this.$refs.modalElement.addEventListener('shown.bs.modal', () => {
                    this.$emit('shown');
                });

                this.$refs.modalElement.addEventListener('hide.bs.modal', () => {
                    // Remove focus before close (a11y: avoid "Blocked aria-hidden...")
                    if (document.activeElement && document.activeElement.blur) {
                        document.activeElement.blur();
                    }
                    if (document.body && document.body.focus) {
                        document.body.focus();
                    } else {
                        document.activeElement?.blur();
                    }
                    this.isOpen = false;
                    this.$emit('hide');
                });

                this.$refs.modalElement.addEventListener('hidden.bs.modal', () => {
                    this.$emit('hidden');
                });
            }
        });
    },

    beforeUnmount() {
        // @skill-anchor id:sk-eeb23d #for-bootstrap-dispose
        // Dispose Bootstrap Modal to avoid leaks
        if (this.modalInstance) {
            this.modalInstance.dispose();
            this.modalInstance = null;
        }
    }
};

