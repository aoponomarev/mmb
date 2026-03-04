// =========================
// COMBOBOX COMPONENT
// Vue wrapper over Bootstrap input-group + dropdown with autocomplete
// =========================
// PURPOSE: Reusable combobox with:
//
// @skill-anchor id:sk-add9a6 #for-classes-add-remove
// @skill-anchor id:sk-eeb23d #for-bootstrap-event-proxying
// @skill-anchor id:sk-cb75ec #for-utility-availability-check
// - Autocomplete and filtering
// - Keyboard navigation
// - Select from list
// - Free text input
// - Item grouping
// - Validation
// - Full Bootstrap JS API compatibility
// - Toggle to plain text input mode
// - Structure for: match highlight, virtual scroll, multi-select
//
// COMPONENT API:
//
// Props:
// Basic: modelValue (v-model), items (array of strings or {label, value, id}), placeholder
// Mode: mode ('combobox' | 'input'), multiple (boolean)
// Behavior: allowCustom, strict, autocomplete, clearable (clear button via CSS ::before)
// Filter: filterFunction (items, query) => filteredItems, debounce (ms), highlightMatches, itemLabel, itemValue
// Scroll: scrollable, maxHeight, virtualScrolling, virtualItemHeight (px)
// Group: groupBy (field or function)
// Validation: required, pattern (HTML5), disabled
// UI: size ('sm'|'lg'), variant (dropdown button), icon (Font Awesome class)
// Extra: classesAdd { root, menu }, classesRemove { root, menu }, menuClasses, menuStyle, dropdownId, emptySearchText
//
// Emits: update:modelValue, select, input, focus, blur, clear, show, hide
//
// Methods (via ref): show(), hide(), toggle(), getBootstrapInstance()
//
// Keyboard: ArrowDown/Up (navigate), Enter (select or accept), Escape (close), Tab (close on tab out)
// Layout/CSS: see shared/templates/combobox-template.js
//
// ARCHITECTURE:
// Template: shared/templates/combobox-template.js. Deps: Bootstrap 5, Font Awesome 6, Vue. See also: id:sk-e0b8f3

window.cmpCombobox = {
    template: '#combobox-template',

    props: {
        // === Basic ===
        modelValue: {
            type: [String, Array],
            default: ''
        },
        items: {
            type: Array,
            default: () => []
        },
        placeholder: {
            type: String,
            default: 'Выберите или введите...'
        },

        // === Mode ===
        mode: {
            type: String,
            default: 'combobox', // 'combobox' | 'input'
            validator: (value) => ['combobox', 'input'].includes(value)
        },
        multiple: {
            type: Boolean,
            default: false
        },

        // === Behavior ===
        allowCustom: {
            type: Boolean,
            default: true // allow free input
        },
        strict: {
            type: Boolean,
            default: false // only values from list
        },
        autocomplete: {
            type: Boolean,
            default: true // autocomplete
        },
        clearable: {
            type: Boolean,
            default: true // show clear button
        },

        // === Filter and search ===
        filterFunction: {
            type: Function,
            default: null // custom filter function
        },
        debounce: {
            type: Number,
            default: 300 // debounce delay (ms)
        },
        highlightMatches: {
            type: Boolean,
            default: false // highlight matches (structure in place)
        },
        itemLabel: {
            type: [String, Function],
            default: null // label field or getter function
        },
        itemValue: {
            type: [String, Function],
            default: null // value field or getter function
        },

        // === Scroll ===
        scrollable: {
            type: Boolean,
            default: false
        },
        maxHeight: {
            type: String,
            default: '300px'
        },
        virtualScrolling: {
            type: Boolean,
            default: false // virtual scrolling (structure in place)
        },
        virtualItemHeight: {
            type: Number,
            default: 38 // item height for virtual scroll (px)
        },

        // === Grouping ===
        groupBy: {
            type: [String, Function],
            default: null // group by field or function (structure in place)
        },

        // === Validation ===
        required: {
            type: Boolean,
            default: false
        },
        pattern: {
            type: String,
            default: null
        },
        disabled: {
            type: Boolean,
            default: false
        },

        // === UI ===
        size: {
            type: String,
            default: null,
            validator: (value) => !value || ['sm', 'lg'].includes(value)
        },
        variant: {
            type: String,
            default: 'outline-secondary',
            validator: (value) => ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark', 'outline-primary', 'outline-secondary', 'outline-success', 'outline-danger', 'outline-warning', 'outline-info', 'outline-light', 'outline-dark', 'link'].includes(value)
        },
        icon: {
            type: String,
            default: null
        },
        // Input type (text | number etc.)
        inputType: {
            type: String,
            default: 'text'
        },
        // Input styles (e.g. maxWidth for compact)
        inputStyle: {
            type: Object,
            default: () => ({})
        },
        // Min value for number input
        inputMin: {
            type: [Number, String],
            default: null
        },
        // Max value for number input
        inputMax: {
            type: [Number, String],
            default: null
        },
        // Step for number input
        inputStep: {
            type: [Number, String],
            default: null
        },

        // === Class management ===
        classesAdd: {
            type: Object,
            default: () => ({})
            // Example: { root: 'custom-root', menu: 'custom-menu' }
        },
        classesRemove: {
            type: Object,
            default: () => ({})
            // Example: { root: 'some-class', menu: 'another-class' }
        },
        menuClasses: {
            type: String,
            default: ''
        },
        menuStyle: {
            type: Object,
            default: () => ({})
        },
        dropdownId: {
            type: String,
            default: null
        },
        emptySearchText: {
            type: String,
            default: 'Ничего не найдено'
        },
        tooltip: {
            type: String,
            default: null
        }
    },

    emits: ['update:modelValue', 'select', 'input', 'focus', 'blur', 'clear', 'show', 'hide'],

    data() {
        return {
            isOpen: false,
            searchQuery: '',
            selectedIndex: -1, // selected item index for keyboard nav
            dropdownInstance: null,
            debounceTimer: null,
            scrollTop: 0, // for virtual scroll
            virtualStartIndex: 0, // for virtual scroll
            virtualEndIndex: 0 // for virtual scroll
        };
    },

    computed: {
        // Multiple selection mode
        isMultiple() {
            return this.multiple || Array.isArray(this.modelValue);
        },

        // Display value in input
        displayValue() {
            if (this.isMultiple) {
                // For multiple: show query or empty
                return this.searchQuery;
            }
            // Single: show selected label or query
            if (this.modelValue && !this.searchQuery) {
                // Find selected item and show its label
                const selectedItem = this.items.find(item => this.getItemValue(item) === this.modelValue);
                if (selectedItem) {
                    return this.getItemLabel(selectedItem);
                }
                return this.modelValue; // Not in list - show as-is
            }
            return this.searchQuery || '';
        },

        // CSS classes for input-group
        inputGroupClasses() {
            const baseClasses = [];
            if (this.size) baseClasses.push(`input-group-${this.size}`);

            // Class management via classesAdd and classesRemove
            if (!window.classManager) {
                console.error('classManager not found in inputGroupClasses');
                return baseClasses.join(' ');
            }

            return window.classManager.processClassesToString(
                baseClasses,
                this.classesAdd?.root,
                this.classesRemove?.root
            );
        },

        // CSS classes for input mode
        inputModeClasses() {
            const baseClasses = ['position-relative'];

            // Class management via classesAdd and classesRemove
            if (!window.classManager) {
                console.error('classManager not found in inputModeClasses');
                return baseClasses.join(' ');
            }

            return window.classManager.processClassesToString(
                baseClasses,
                this.classesAdd?.root,
                this.classesRemove?.root
            );
        },

        // CSS classes for dropdown menu
        menuClassesComputed() {
            const baseClasses = ['dropdown-menu', 'dropdown-menu-end'];

            // Add classes from menuClasses prop (backward compat)
            if (this.menuClasses) {
                const extraClasses = this.menuClasses.split(' ').filter(c => c);
                baseClasses.push(...extraClasses);
            }

            // Class management via classesAdd and classesRemove
            if (!window.classManager) {
                return baseClasses.join(' ');
            }

            return window.classManager.processClassesToString(
                baseClasses,
                this.classesAdd?.menu,
                this.classesRemove?.menu
            );
        },

        // CSS classes for input
        inputClasses() {
            const classes = ['form-control'];
            if (this.size) classes.push(`form-control-${this.size}`);

            if (!window.classManager) {
                return classes.join(' ');
            }

            return window.classManager.processClassesToString(
                classes,
                this.classesAdd?.input,
                this.classesRemove?.input
            );
        },

        // Styles for scroll area
        scrollableStyle() {
            return {
                maxHeight: this.maxHeight,
                overflowY: 'auto',
                ...this.menuStyle
            };
        },

        // Filtered items
        filteredItems() {
            if (!this.searchQuery || !this.autocomplete) {
                return this.items;
            }

            // Custom filter function
            if (this.filterFunction) {
                return this.filterFunction(this.items, this.searchQuery);
            }

            // Built-in filter
            const query = this.searchQuery.toLowerCase();
            return this.items.filter(item => {
                const label = this.getItemLabel(item).toLowerCase();
                return label.includes(query);
            });
        },

        // Visible items (virtual or normal scroll)
        visibleItems() {
            if (!this.virtualScrolling) {
                return this.filteredItems;
            }

            // Virtual scroll logic; compute startIndex/endIndex from scrollTop
            const containerHeight = this.maxHeight ? parseInt(this.maxHeight) : 300;
            const visibleCount = Math.ceil(containerHeight / this.virtualItemHeight);

            const startIndex = Math.floor(this.scrollTop / this.virtualItemHeight);
            const endIndex = Math.min(
                startIndex + visibleCount + 2, // +2 buffer
                this.filteredItems.length
            );

            return this.filteredItems.slice(startIndex, endIndex);
        },

        // Virtual visible items (for render)
        virtualVisibleItems() {
            if (!this.virtualScrolling) return this.filteredItems;
            // For virtual scroll use visibleItems
            return this.visibleItems;
        },

        // Text for highlight
        highlightText() {
            return this.highlightMatches && this.searchQuery ? this.searchQuery : null;
        },

        // Reactive tooltips config
        tooltipsConfig() {
            return window.tooltipsConfig || null;
        },

        clearTitle() {
            return this.tooltipsConfig ? this.tooltipsConfig.getTooltip('ui.combobox.clear') : 'Очистить';
        }
    },

    mounted() {
        // Init Bootstrap Dropdown via JS API. Dispose on unmount to avoid leaks
        if (this.mode === 'combobox') {
            this.$nextTick(() => {
                if (window.bootstrap && window.bootstrap.Dropdown) {
                    const toggleElement = this.$refs.comboboxContainer?.querySelector('[data-bs-toggle="dropdown"]');
                    if (toggleElement) {
                        this.dropdownInstance = new window.bootstrap.Dropdown(toggleElement, {
                            // Bootstrap Dropdown options can be passed via props if needed
                        });

                        // Subscribe to Bootstrap events for state sync
                        this.$refs.comboboxContainer.addEventListener('show.bs.dropdown', () => {
                            this.isOpen = true;
                            this.$emit('show');

                            // Reset index on open
                            this.selectedIndex = -1;
                        });

                        this.$refs.comboboxContainer.addEventListener('shown.bs.dropdown', () => {
                            // Extra actions after open
                        });

                        this.$refs.comboboxContainer.addEventListener('hide.bs.dropdown', () => {
                            this.isOpen = false;
                            this.$emit('hide');
                        });

                        this.$refs.comboboxContainer.addEventListener('hidden.bs.dropdown', () => {
                            // Clear search on close (optional)
                            if (this.autocomplete) {
                                // Can clear searchQuery when value selected
                            }
                        });
                    }
                }
            });
        }
    },

    beforeUnmount() {
        // Dispose Bootstrap Dropdown to avoid leaks
        if (this.dropdownInstance) {
            this.dropdownInstance.dispose();
            this.dropdownInstance = null;
        }

        // Clear debounce timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
    },

    methods: {
        // Get item label
        getItemLabel(item) {
            if (typeof item === 'string') return item;
            if (this.itemLabel) {
                if (typeof this.itemLabel === 'function') {
                    return this.itemLabel(item);
                }
                return item[this.itemLabel] || String(item);
            }
            // Default: look for label, name, text or stringify
            return item.label || item.name || item.text || String(item);
        },

        // Get item value
        getItemValue(item) {
            if (typeof item === 'string') return item;
            if (this.itemValue) {
                if (typeof this.itemValue === 'function') {
                    return this.itemValue(item);
                }
                return item[this.itemValue];
            }
            // Default: look for value, id or use label
            return item.value !== undefined ? item.value : (item.id !== undefined ? item.id : this.getItemLabel(item));
        },

        // Get key for v-for
        getItemKey(item, index) {
            const value = this.getItemValue(item);
            return value !== undefined ? value : index;
        },

        // Is item selected
        isItemSelected(item) {
            const value = this.getItemValue(item);
            if (this.isMultiple) {
                return Array.isArray(this.modelValue) && this.modelValue.includes(value);
            }
            return this.modelValue === value;
        },

        // Highlight text in item (structure for match highlight)
        highlightItemText(item) {
            if (!this.highlightText) return this.getItemLabel(item);

            const label = this.getItemLabel(item);
            const query = this.searchQuery;
            const regex = new RegExp(`(${query})`, 'gi');
            return label.replace(regex, '<mark>$1</mark>');
        },

        // Input handler
        handleInput(event) {
            const value = event.target.value;
            this.searchQuery = value;

            // In input mode update modelValue immediately
            if (this.mode === 'input') {
                this.$emit('update:modelValue', value);
                this.$emit('input', value);
                return;
            }

            // Debounce for performance
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
            }

            this.debounceTimer = setTimeout(() => {
                this.$emit('input', value);

                // If autocomplete on and dropdown closed - open it
                if (this.autocomplete && !this.isOpen && value) {
                    this.show();
                }
            }, this.debounce);
        },

        // Keyboard navigation handler
        handleKeydown(event) {
            if (this.mode === 'input') return;

            switch (event.key) {
                case 'ArrowDown':
                    event.preventDefault();
                    if (!this.isOpen) {
                        this.show();
                    } else {
                        this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredItems.length - 1);
                        this.scrollToSelected();
                    }
                    break;

                case 'ArrowUp':
                    event.preventDefault();
                    if (this.isOpen) {
                        this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
                        this.scrollToSelected();
                    }
                    break;

                case 'Enter':
                    event.preventDefault();
                    if (this.isOpen && this.selectedIndex >= 0 && this.filteredItems[this.selectedIndex]) {
                        this.handleItemSelect(this.filteredItems[this.selectedIndex], event);
                    } else if (this.allowCustom && !this.strict) {
                        // Accept custom value
                        this.handleCustomValue(this.searchQuery);
                    }
                    break;

                case 'Escape':
                    event.preventDefault();
                    this.hide();
                    break;

                case 'Tab':
                    // Close dropdown on Tab
                    if (this.isOpen) {
                        this.hide();
                    }
                    break;
            }
        },

        // Scroll to selected item
        scrollToSelected() {
            if (!this.scrollable && !this.virtualScrolling) return;

            this.$nextTick(() => {
                const container = this.$refs.scrollContainer;
                if (container && this.selectedIndex >= 0) {
                    const itemHeight = this.virtualScrolling ? this.virtualItemHeight : 38;
                    const scrollPosition = this.selectedIndex * itemHeight;
                    container.scrollTop = scrollPosition;
                }
            });
        },

        // Scroll handler (for virtual scroll)
        handleScroll(event) {
            if (this.virtualScrolling) {
                this.scrollTop = event.target.scrollTop;
            }
        },

        // Item select handler
        handleItemSelect(item, event) {
            const value = this.getItemValue(item);
            const label = this.getItemLabel(item);

            if (this.isMultiple) {
                // Multi-select logic
                const currentValues = Array.isArray(this.modelValue) ? [...this.modelValue] : [];
                const index = currentValues.indexOf(value);

                if (index >= 0) {
                    // Remove from selected
                    currentValues.splice(index, 1);
                } else {
                    // Add to selected
                    currentValues.push(value);
                }

                this.$emit('update:modelValue', currentValues);
                this.searchQuery = ''; // Clear search
            } else {
                // Single select
                this.$emit('update:modelValue', value);
                this.searchQuery = ''; // Clear search после выбора
                this.hide();
            }

            this.$emit('select', { value, label, item });
        },

        // Custom value handler
        handleCustomValue(value) {
            if (this.strict) return; // In strict mode reject custom values

            this.$emit('update:modelValue', value);
            this.$emit('select', { value, label: value, item: null });
            this.hide();
        },

        // Clear handler
        handleClear(event) {
            event.preventDefault();
            event.stopPropagation();

            if (this.isMultiple) {
                this.$emit('update:modelValue', []);
            } else {
                this.$emit('update:modelValue', '');
            }

            this.searchQuery = '';
            this.$emit('clear');

            // Focus input
            this.$nextTick(() => {
                if (this.$refs.inputElement) {
                    this.$refs.inputElement.focus();
                }
            });
        },

        // Focus handler
        handleFocus(event) {
            this.$emit('focus', event);
            if (this.autocomplete && this.searchQuery) {
                this.show();
            }
        },

        // Blur handler
        handleBlur(event) {
            this.$emit('blur', event);
            // Don't close dropdown immediately so item click can fire
            setTimeout(() => {
                if (!this.$refs.comboboxContainer?.contains(document.activeElement)) {
                    this.hide();
                }
            }, 200);
        },

        // Dropdown toggle handler
        handleToggle(event) {
            // Bootstrap handles open/close via data-bs-toggle
        },

        // Programmatic open (via Bootstrap API)
        show() {
            if (this.dropdownInstance) {
                this.dropdownInstance.show();
            }
        },

        // Programmatic close (via Bootstrap API)
        hide() {
            if (this.dropdownInstance) {
                this.dropdownInstance.hide();
            }
        },

        // Programmatic toggle (via Bootstrap API)
        toggle() {
            if (this.dropdownInstance) {
                this.dropdownInstance.toggle();
            }
        },

        // Get Bootstrap Dropdown instance (for direct API access)
        getBootstrapInstance() {
            return this.dropdownInstance;
        }
    }
};

