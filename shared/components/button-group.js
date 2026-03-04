/**
 * ================================================================================================
 * BUTTON GROUP COMPONENT - Button group component
 * ================================================================================================
 *
 * PURPOSE: Vue wrapper over Bootstrap .btn-group with:
 *
 * @skill-anchor id:sk-add9a6 #for-classes-add-remove
 * @skill-anchor id:sk-eeb23d #for-bootstrap-event-proxying
 * @skill-anchor id:sk-cb75ec #for-utility-availability-check
 * - Three button types: button (via cmp-button), checkbox, radio (native HTML)
 * - Style inheritance (variant, size) from group to buttons
 * - Responsive collapse into dropdown at breakpoint
 * - 100% compatibility with Bootstrap JS API
 *
 * Button configuration:
 * - Dual render: button group (>= breakpoint) and dropdown (< breakpoint)
 * - CSS toggle via Bootstrap utilities (d-none, d-md-inline-flex)
 * - Map buttons[] to DropdownMenuItem when collapsed
 * - Event sync between buttons and menu items
 * - Deterministic instance hashes (instanceHash)
 *
 * COMPONENT API:
 *
 * Input (props):
 * Group base props:
 * - size (String) — group size: 'sm', 'lg' or '' (default). Applied to all buttons unless overridden
 * - variant (String, default: 'secondary') — base Bootstrap variant for all buttons. Button inherits from group if not set
 * - vertical (Boolean, default: false) — vertical group orientation (adds btn-group-vertical)
 * - verticalBreakpoint (String) — responsive vertical: 'sm' (576px). Mobile (< 576px) vertical, desktop (>= 576px) horizontal
 * - role (String, default: 'group') — ARIA role of group
 * - ariaLabel (String) — ARIA label for group
 * - classesAdd (Object, default: {}) — classes to add to component elements. Shape: { root, dropdown, dropdownButton, dropdownMenu }
 * - classesRemove (Object, default: {}) — classes to remove from component elements. Shape: { root, dropdown, dropdownButton, dropdownMenu }
 * Responsiveness (collapse into dropdown):
 * - collapseBreakpoint (String) — breakpoint for group collapse: 'sm', 'md', 'lg', 'xl', 'xxl'. If omitted, group always shown as buttons
 * - dropdownLabel (String, default: 'Actions') — dropdown button label when collapsed
 * - dropdownIcon (String) — dropdown button icon (Font Awesome class)
 * - dropdownVariant (String) — dropdown button variant. If omitted, inherits from group variant
 * Button configuration:
 * - buttons (Array, required) — array of button configs. Each element is ButtonConfig:
 *   ButtonConfig:
 *   - type (String, required) — 'button', 'checkbox' or 'radio'
 *   - label (String) — button text (all types)
 *   - labelShort (String) — short label for mobile (button only)
 *   - icon (String) — icon CSS class (Font Awesome, Material Symbols)
 *   - variant (String) — Bootstrap variant (overrides group)
 *   - size (String) — button size (overrides group)
 *   - disabled (Boolean) — disabled state
 *   - loading (Boolean) — loading state (button only)
 *   - active (Boolean) — active state (checkbox/radio)
 *   - suffix (Object | Array) — suffix on the right (button only). Same format as cmp-button
 *   - tooltip (String) — general tooltip
 *   - tooltipIcon (String) — icon tooltip (button only)
 *   - tooltipText (String) — text tooltip (button only)
 *   - tooltipSuffix (String) — tooltip for suffix (button only)
 *   - [key: data-bs-${string}] (any) — arbitrary Bootstrap data-* for JS API transparency
 *   - [key: string] (any) — any other attributes
 *
 * Output events (emits):
 * - button-click — button click (type="button"). Payload: (event, { button, index, type })
 * - button-click-icon — icon click (type="button"). Payload: (event, { button, index, type })
 * - button-click-text — text click (type="button"). Payload: (event, { button, index, type })
 * - button-click-suffix — suffix click (type="button"). Payload: (event, { button, index, type })
 * - button-change — checkbox/radio change. Payload: (event, { button, index, active, type })
 * - button-toggle — checkbox/radio toggle. Payload: ({ button, index, active, type })
 *
 * Slots:
 * - default — button content (fallback for custom buttons)
 * - button-{index} — override specific button by index. Slot props: { button, index }
 *
 * Group base props:
 * Layout and CSS: see template header in `shared/templates/button-group-template.js`
 * cmp-button usage for type="button":
 * - All cmp-button props supported via ButtonConfig
 * - Responsiveness via .btn-responsive works automatically
 * - Suffix and tooltips fully supported
 * Style inheritance:
 * - Component inherits variant and size from group to buttons
 * - Button without own variant inherits from group
 * - Button without own size inherits from group
 * - Button can override group styles via own variant or size
 * Data mapping when collapsed:
 * - ButtonConfig → DropdownMenuItem: label → title, icon → icon, suffix → suffix, type="checkbox/radio" + active → active: true, disabled → disabled, tooltip → tooltipText
 * State sync:
 * - Component uses internal buttonStates for sync
 * - On mount state is init from props
 * - On checkbox/radio change state updates in buttonStates
 * - For radio, other radios in group are reset on select
 * - State syncs with dropdown when collapsed
 * - Events sync between buttons and menu items
 *
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

