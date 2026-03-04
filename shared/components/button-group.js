/**
 * #JS-Na3ZaWJk
 * @description Vue wrapper over Bootstrap .btn-group; button/checkbox/radio; responsive collapse to dropdown; style inheritance; instanceHash.
 * @skill-anchor id:sk-add9a6 #for-classes-add-remove
 * @skill-anchor id:sk-eeb23d #for-bootstrap-event-proxying
 * @skill-anchor id:sk-cb75ec #for-utility-availability-check
 *
 * PURPOSE: Dual render (group >= breakpoint, dropdown < breakpoint); buttons[] → DropdownMenuItem when collapsed; Layout: shared/templates/button-group-template.js
 *
 * COMPONENT API:
 * Props: size, variant, vertical, verticalBreakpoint, role, ariaLabel, classesAdd, classesRemove, collapseBreakpoint, dropdownLabel, dropdownIcon, dropdownVariant, buttons (ButtonConfig: type, label, labelShort, icon, variant, size, disabled, loading, active, suffix, tooltips, data-bs-*).
 * Emits: button-click, button-click-icon, button-click-text, button-click-suffix, button-change, button-toggle.
 * Slots: default, button-{index}. State sync: buttonStates, dropdown sync, radio reset.
 */

window.cmpButtonGroup = {
    template: '#button-group-template',
    components: {
        'cmp-button': window.cmpButton,
        'cmp-dropdown': window.cmpDropdown,
        'cmp-dropdown-menu-item': window.cmpDropdownMenuItem
    },

    props: {
        // === Group base props ===
        size: {
            type: String,
            default: '',
            validator: (value) => !value || ['sm', 'lg'].includes(value)
        },
        variant: {
            type: String,
            default: 'secondary' // base variant for all buttons
        },
        vertical: {
            type: Boolean,
            default: false
        },
        verticalBreakpoint: {
            type: String,
            default: null,
            validator: (value) => !value || value === 'sm'
        },
        role: {
            type: String,
            default: 'group'
        },
        ariaLabel: {
            type: String,
            default: null
        },
        // === Class management ===
        classesAdd: {
            type: Object,
            default: () => ({})
            // Example: { root: 'custom-root', dropdown: 'custom-dropdown' }
        },
        classesRemove: {
            type: Object,
            default: () => ({})
            // Example: { root: 'some-class', dropdown: 'another-class' }
        },

        // === Responsiveness (collapse into dropdown) ===
        collapseBreakpoint: {
            type: String,
            default: null,
            validator: (value) => !value || ['sm', 'md', 'lg', 'xl', 'xxl'].includes(value)
        },
        dropdownLabel: {
            type: String,
            default: 'Actions'
        },
        dropdownIcon: {
            type: String,
            default: null
        },
        dropdownVariant: {
            type: String,
            default: null // if omitted, inherits from group variant
        },
        dropdownSize: {
            type: String,
            default: null, // if omitted, inherits from group size
            validator: (value) => !value || ['sm', 'lg'].includes(value)
        },
        dropdownDynamicLabel: {
            type: Boolean,
            default: false // if true, show active button text
        },
        dropdownDynamicLabelShort: {
            type: Boolean,
            default: false // if true, show short active button text
        },
        dropdownMenuStyle: {
            type: Object,
            default: () => ({})
        },
        tooltip: {
            type: String,
            default: null
        },

        // === Button configuration ===
        buttons: {
            type: Array,
            required: true,
            validator: (buttons) => {
                if (!Array.isArray(buttons)) return false;
                return buttons.every(btn =>
                    btn && typeof btn === 'object' && ['button', 'checkbox', 'radio'].includes(btn.type)
                );
            }
        }
    },

    emits: ['button-click', 'button-click-icon', 'button-click-text', 'button-click-suffix', 'button-toggle', 'button-change'],

    data() {
        return {
            buttonStates: [] // button state (checkbox/radio)
        };
    },

    created() {
        // Generate unique ID for group on mount
        this._groupId = `btn-group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Init button state from props
        this.buttonStates = this.buttons.map((btn, index) => ({
            ...btn,
            active: btn.active || false
        }));
    },

    watch: {
        // Sync internal state when props change
        buttons: {
            handler(newButtons) {
                this.buttonStates = newButtons.map((btn, index) => ({
                    ...btn,
                    active: btn.active || false
                }));
            },
            deep: true
        }
    },

    computed: {
        // CSS classes for button group
        groupClasses() {
            const baseClasses = ['btn-group'];
            if (this.size) baseClasses.push(`btn-group-${this.size}`);

            // Check for responsive vertical class in classesAdd.root
            const classesAddRoot = this.classesAdd?.root;
            const hasAdaptiveVertical = classesAddRoot && (
                (typeof classesAddRoot === 'string' && classesAddRoot.includes('btn-group-responsive-vertical')) ||
                (Array.isArray(classesAddRoot) && classesAddRoot.some(c => typeof c === 'string' && c.includes('btn-group-responsive-vertical')))
            );

            // If verticalBreakpoint set, add responsive class
            if (this.verticalBreakpoint && !hasAdaptiveVertical) {
                baseClasses.push(`btn-group-responsive-vertical-${this.verticalBreakpoint}`);
            }

            // Add btn-group-vertical only if vertical=true and no responsive class
            if (this.vertical && !hasAdaptiveVertical && !this.verticalBreakpoint) {
                baseClasses.push('btn-group-vertical');
            }

            if (this.instanceHash) baseClasses.push(this.instanceHash);

            // Visibility classes for responsive collapse
            if (this.collapseBreakpoint) {
                baseClasses.push(`d-none`, `d-${this.collapseBreakpoint}-inline-flex`);
            }

            // Class management via classesAdd and classesRemove
            if (!window.classManager) {
                console.error('classManager not found in groupClasses');
                return baseClasses.join(' ');
            }

            const result = window.classManager.processClassesToString(
                baseClasses,
                this.classesAdd?.root,
                this.classesRemove?.root
            );
            return result;
        },

        // Group attributes
        groupAttrs() {
            return {
                role: this.role,
                'aria-label': this.ariaLabel || undefined
            };
        },

        // Classes for dropdown (passed to cmp-dropdown)
        dropdownClassesForGroup() {
            // IMPORTANT: return object with undefined instead of omitting props for stable Vue reactivity
            return {
                root: this.classesAdd?.dropdown || undefined,
                button: this.classesAdd?.dropdownButton || undefined,
                menu: this.classesAdd?.dropdownMenu || undefined
            };
        },
        dropdownClassesRemoveForGroup() {
            return {
                root: this.classesRemove?.dropdown || undefined,
                button: this.classesRemove?.dropdownButton || undefined,
                menu: this.classesRemove?.dropdownMenu || undefined
            };
        },

        // Classes for dropdown container
        dropdownClasses() {
            if (!this.collapseBreakpoint) return '';
            return `d-${this.collapseBreakpoint}-none`;
        },

        // Deterministic instance hash
        instanceHash() {
            if (!window.hashGenerator) {
                console.warn('hashGenerator not found, using fallback');
                return 'avto-00000000';
            }

            const parentContext = this.getParentContext();
            const instanceId = this.ariaLabel || 'button-group';
            return window.hashGenerator.generateMarkupClass(`${parentContext}:${instanceId}`);
        },

        // Map buttons to menuItems for dropdown
        menuItems() {
            if (!this.collapseBreakpoint) return [];

            const items = this.buttonStates.map((btn, index) => ({
                title: btn.label || btn.labelShort || '',
                icon: btn.icon || null,
                suffix: btn.suffix || null,
                active: btn.active && (btn.type === 'checkbox' || btn.type === 'radio'),
                disabled: btn.disabled || false,
                tooltipText: btn.tooltip || btn.tooltipText || null,
                tooltipIcon: btn.tooltipIcon || null,
                tooltipSuffix: btn.tooltipSuffix || (btn.suffix?.tooltip) || null,
                // Keep original data for events
                _originalButton: btn,
                _originalIndex: index
            }));

            return items;
        },

        // Variant for dropdown button
        computedDropdownVariant() {
            return this.dropdownVariant || this.variant;
        },

        // Size for dropdown button
        computedDropdownSize() {
            return this.dropdownSize || this.size;
        },

        // Text for dropdown button
        computedDropdownLabel() {
            if (this.dropdownDynamicLabel) {
                const activeBtn = this.buttonStates.find(btn => btn.active && (btn.type === 'radio' || btn.type === 'checkbox'));
                if (activeBtn) {
                    return activeBtn.label || activeBtn.labelShort || this.dropdownLabel;
                }
            }
            return this.dropdownLabel;
        },

        // Short text for dropdown button
        computedDropdownLabelShort() {
            if (this.dropdownDynamicLabelShort) {
                const activeBtn = this.buttonStates.find(btn => btn.active && (btn.type === 'radio' || btn.type === 'checkbox'));
                if (activeBtn) {
                    return activeBtn.labelShort || activeBtn.label || this.dropdownLabel;
                }
            }
            return null;
        }
    },

    methods: {
        // Get parent context (avto-* class or parent ID)
        getParentContext() {
            if (!this.$el?.parentElement) return 'root';

            let parent = this.$el.parentElement;
            let depth = 0;
            const maxDepth = 5;

            while (parent && depth < maxDepth) {
                const avtoClass = Array.from(parent.classList).find(cls => cls.startsWith('avto-'));
                if (avtoClass) return avtoClass;
                if (parent.id) return `#${parent.id}`;
                parent = parent.parentElement;
                depth++;
            }

            return 'root';
        },

        // Utility to omit props from object
        omit(obj, keys) {
            const result = { ...obj };
            keys.forEach(key => delete result[key]);
            return result;
        },

        // Generate unique ID for checkbox/radio
        getButtonId(index) {
            return `${this._groupId}-${index}`;
        },

        // Name for radio group
        getRadioName() {
            return `${this._groupId}-radio`;
        },

        // Button click handler (type="button")
        handleButtonClick(event, button, index) {
            const state = this.buttonStates[index] || button;
            this.$emit('button-click', event, { button: state, index, type: state.type });
        },

        handleButtonClickIcon(event, button, index) {
            const state = this.buttonStates[index] || button;
            this.$emit('button-click-icon', event, { button: state, index, type: state.type });
        },

        handleButtonClickText(event, button, index) {
            const state = this.buttonStates[index] || button;
            this.$emit('button-click-text', event, { button: state, index, type: state.type });
        },

        handleButtonClickSuffix(event, button, index) {
            const state = this.buttonStates[index] || button;
            this.$emit('button-click-suffix', event, { button: state, index, type: state.type });
        },

        // Checkbox/radio change handler
        handleLabelClick(button, index) {
            // For radio buttons, manually trigger the change
            if (button.type === 'radio') {
                const event = { target: { checked: true } };
                this.handleButtonChange(event, button, index);
            }
        },

        handleButtonChange(event, button, index) {
            const newActive = event.target.checked;
            const state = this.buttonStates[index];

            if (!state) return;

            // Update internal state
            state.active = newActive;

            // For radio: reset other radios in group
            if (state.type === 'radio' && newActive) {
                this.buttonStates.forEach((s, i) => {
                    if (i !== index && s.type === 'radio') {
                        s.active = false;
                    }
                });
            }

            // Consistent emit order: button-change then button-toggle
            this.$emit('button-change', event, { button: state, index, active: newActive, type: state.type });
            this.$emit('button-toggle', { button: state, index, active: newActive, type: state.type });
        },

        // Menu item click handler (when collapsed)
        handleMenuClick(menuItem) {
            const { _originalButton: button, _originalIndex: index } = menuItem;
            const state = this.buttonStates[index] || button;

            if (state.type === 'checkbox') {
                // Emulate checkbox toggle
                const newActive = !state.active;
                state.active = newActive;

                // Consistent emit order: button-change then button-toggle
                this.$emit('button-change', new Event('change'), { button: state, index, active: newActive, type: state.type });
                this.$emit('button-toggle', { button: state, index, active: newActive, type: state.type });
            } else if (state.type === 'radio') {
                // For radio: if already active, no-op (radio cannot be deactivated by click)
                // If inactive, activate it and deactivate other radios in group
                if (!state.active) {
                    state.active = true;

                    // Reset other radios in group
                    this.buttonStates.forEach((s, i) => {
                        if (i !== index && s.type === 'radio') {
                            s.active = false;
                        }
                    });

                    // Consistent emit order: button-change then button-toggle
                    this.$emit('button-change', new Event('change'), { button: state, index, active: true, type: state.type });
                    this.$emit('button-toggle', { button: state, index, active: true, type: state.type });
                }
                // If radio already active, no-op (standard radio behavior)
            } else {
                // Emulate button click
                this.$emit('button-click', new Event('click'), { button: state, index, type: state.type });
            }
        }
    },

    mounted() {
        // Init Bootstrap Button for action buttons (if needed)
        this.$nextTick(() => {
            if (window.bootstrap?.Button && this.$refs.groupContainer) {
                const buttons = this.$refs.groupContainer.querySelectorAll('.btn[data-bs-toggle="button"]');
                buttons.forEach(btn => {
                    new window.bootstrap.Button(btn);
                });
            }
        });
    }
};

