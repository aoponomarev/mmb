// =========================
// DROPDOWN COMPONENT
// Vue wrapper over Bootstrap dropdown with search and scroll
// =========================
// PURPOSE: Reusable dropdown with:
//
// @skill-anchor id:sk-add9a6 #for-classes-add-remove
// @skill-anchor id:sk-eeb23d #for-bootstrap-event-proxying
// @skill-anchor id:sk-cb75ec #for-utility-availability-check
// - Item search, scroll for long lists, full Bootstrap JS API, custom trigger via slot
// - Trigger responsiveness (.dropdown-responsive), instanceHash, cmp-button for trigger
// - Select mode with selected item on button (replaces <select>)
//
// API. Props - Trigger: buttonText, buttonTextShort, buttonIcon, buttonVariant, buttonSize, dropdownId
// Search: searchable, searchPlaceholder, emptySearchText, searchFunction. Scroll: scrollable, maxHeight.
// Items: items (for built-in filter). Select: selectMode, selectedItem, itemLabel, itemValue, itemIcon, itemLabelShort, buttonDisplay.
// Extra: classesAdd, classesRemove, menuClasses, menuStyle, menuOffset (Popper offset: number [0,y] or [x,y] px, null = Bootstrap default).
// Emits: show, hide, search, item-select, update:selectedItem, select. Slots: button, items. Ref: show(), hide(), toggle(), getBootstrapInstance().
// Layout: see shared/templates/dropdown-template.js. Trigger via cmp-button on $refs.dropdownButton.$el. Search: built-in or searchFunction; autofocus; clear on close. Select: selectedItem, itemLabel/Value/Icon/LabelShort, buttonDisplay, auto-close, emit select.
// ARCHITECTURE: Template shared/templates/dropdown-template.js. Deps: Bootstrap 5, Vue. See id:sk-318305, id:sk-483943.

window.cmpDropdown = {
    template: '#dropdown-template',
    components: {
        'cmp-button': window.cmpButton
    },

    props: {
        // === Trigger button ===
        buttonText: {
            type: String,
            default: 'Найти монеты'
        },
        buttonTextShort: {
            type: String,
            default: null // short text for mobile when buttonIcon not set
        },
        buttonIcon: {
            type: String,
            default: null // icon for mobile (Font Awesome class)
        },
        buttonVariant: {
            type: String,
            default: 'primary',
            validator: (value) => ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark', 'outline-primary', 'outline-secondary', 'outline-success', 'outline-danger', 'outline-warning', 'outline-info', 'outline-light', 'outline-dark', 'link'].includes(value)
        },
        buttonSize: {
            type: String,
            default: null,
            validator: (value) => !value || ['sm', 'lg'].includes(value)
        },

        // === Search ===
        searchable: {
            type: Boolean,
            default: false
        },
        closeOnOutsideClick: {
            type: Boolean,
            default: false
        },
        searchPlaceholder: {
            type: String,
            default: 'Поиск...'
        },
        emptySearchText: {
            type: String,
            default: 'Ничего не найдено'
        },
        searchFunction: {
            type: Function,
            default: null // if not set, use built-in string filter
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

        // === List items ===
        items: {
            type: Array,
            default: () => []
        },

        // === Class control ===
        classesAdd: {
            type: Object,
            default: () => ({})
            // e.g. { root: 'float-start', button: 'custom-button', menu: 'custom-menu' }
        },
        classesRemove: {
            type: Object,
            default: () => ({})
            // e.g. { root: 'some-class', button: 'another-class', menu: 'yet-another-class' }
        },
        menuClasses: {
            type: String,
            default: ''
        },
        menuStyle: {
            type: Object,
            default: () => ({})
        },
        // Menu width: 'auto' (by content), 'fixed' (in em)
        menuWidthMode: {
            type: String,
            default: 'auto',
            validator: (value) => ['auto', 'fixed'].includes(value)
        },
        // Menu width in em when menuWidthMode === 'fixed'
        menuWidth: {
            type: [Number, String],
            default: null
        },
        autoClose: {
            type: [String, Boolean],
            default: null // null = Bootstrap default
        },
        menuOffset: {
            type: [Number, Array],
            default: null
            // Number: [0, -16] (x, y px). Array: [0, -16]. null: Bootstrap default offset
        },

        // === ID for Bootstrap (optional) ===
        dropdownId: {
            type: String,
            default: null
        },

        // === Select mode (selected item on button) ===
        selectMode: {
            type: Boolean,
            default: false
        },
        selectedItem: {
            type: [String, Number, Object],
            default: null
        },
        // Functions or field names to get data from items
        itemLabel: {
            type: [String, Function],
            default: 'name' // or 'title' depending on items structure
        },
        itemValue: {
            type: [String, Function],
            default: 'id'
        },
        itemIcon: {
            type: [String, Function],
            default: 'icon'
        },
        itemLabelShort: {
            type: [String, Function],
            default: 'labelShort'
        },
        // What to show on button in select mode
        buttonDisplay: {
            type: Object,
            default: () => ({
                icon: true,        // show icon
                label: true,      // show full text
                labelShort: false, // show short text
                value: false      // show value instead of label
            })
        },
        tooltip: {
            type: String,
            default: null
        }
    },

    emits: ['show', 'hide', 'search', 'item-select', 'update:selectedItem', 'select'],

    data() {
        return {
            isOpen: false,
            searchQuery: '',
            dropdownInstance: null,
            outsideClickHandler: null // handler for click outside
        };
    },

    computed: {
        // CSS classes for dropdown root
        dropdownClasses() {
            const baseClasses = ['dropdown', 'dropdown-responsive', this.instanceHash];

            // Conditional classes for responsiveness
            if (this.buttonIcon) baseClasses.push('has-icon');
            if (this.buttonTextShort) baseClasses.push('has-text-short');

            // Classes via classesAdd and classesRemove
            if (!window.classManager) {
                console.error('classManager not found in dropdownClasses');
                return baseClasses.join(' ');
            }

            const result = window.classManager.processClassesToString(
                baseClasses,
                this.classesAdd?.root,
                this.classesRemove?.root
            );
            return result;
        },

        // CSS classes for dropdown menu
        menuClassesComputed() {
            const baseClasses = ['dropdown-menu'];

            // In 'auto' mode prevent line wrap (single-line items)
            if (this.menuWidthMode === 'auto') {
                baseClasses.push('text-nowrap');
            }

            // Add classes from menuClasses prop (backward compat)
            if (this.menuClasses) {
                const extraClasses = this.menuClasses.split(' ').filter(c => c);
                baseClasses.push(...extraClasses);
            }

            // Classes via classesAdd and classesRemove
            if (!window.classManager) {
                return baseClasses.join(' ');
            }

            return window.classManager.processClassesToString(
                baseClasses,
                this.classesAdd?.menu,
                this.classesRemove?.menu
            );
        },

        // Computed inline styles for menu
        menuStyleComputed() {
            const styles = { ...this.menuStyle };

            // In 'fixed' mode set width in em
            if (this.menuWidthMode === 'fixed' && this.menuWidth) {
                styles.width = `${this.menuWidth}em`;
                styles.minWidth = 'auto'; // Disable Bootstrap min-width when fixed width set
            }

            return styles;
        },

        // Attributes for trigger button (passed to cmp-button)
        buttonAttributes() {
            return {
                'data-bs-toggle': 'dropdown',
                'aria-expanded': this.isOpen,
                'id': this.dropdownId,
                'class': 'dropdown-toggle'
            };
        },

        // Classes for trigger button (passed to cmp-button via classesAdd/classesRemove)
        // Map classesAdd.button -> root, classesAdd.buttonIcon -> icon, etc.
        buttonClassesForDropdown() {
            // Keep undefined for missing keys so Vue reactivity sees stable shape
            const result = {
                root: this.classesAdd?.button || undefined,
                container: this.classesAdd?.buttonContainer || undefined,
                icon: this.classesAdd?.buttonIcon || undefined,
                label: this.classesAdd?.buttonLabel || undefined,
                suffix: this.classesAdd?.buttonSuffix || undefined
            };
            return result;
        },
        buttonClassesRemoveForDropdown() {
            // Keep undefined for missing keys so Vue reactivity sees stable shape
            return {
                root: this.classesRemove?.button || undefined,
                container: this.classesRemove?.buttonContainer || undefined,
                icon: this.classesRemove?.buttonIcon || undefined,
                label: this.classesRemove?.buttonLabel || undefined,
                suffix: this.classesRemove?.buttonSuffix || undefined
            };
        },

        // Deterministic instance hash from parent context and props
        instanceHash() {
            if (!window.hashGenerator) {
                console.warn('hashGenerator not found, using fallback');
                return 'avto-00000000';
            }

            const parentContext = this.getParentContext();
            const instanceId = this.dropdownId || this.buttonText || this.buttonIcon || 'dropdown';
            const uniqueId = `${parentContext}:${instanceId}`;
            return window.hashGenerator.generateMarkupClass(uniqueId);
        },

        // Filtered items (when using built-in filter)
        filteredItems() {
            // Guard against undefined/null items
            const items = this.items || [];
            if (!this.searchable || !this.searchQuery) {
                return items;
            }

            // When custom search function is provided
            if (this.searchFunction) {
                return this.searchFunction(items, this.searchQuery);
            }

            // Built-in string filter (searches in object values)
            const query = this.searchQuery.toLowerCase();
            return items.filter(item => {
                if (typeof item === 'string') {
                    return item.toLowerCase().includes(query);
                }
                if (typeof item === 'object') {
                    return Object.values(item).some(value =>
                        String(value).toLowerCase().includes(query)
                    );
                }
                return false;
            });
        },

        /**
         * Button text in select mode. If selectMode and selectedItem set, returns label/value of selected item; else static buttonText.
         * @returns {String} Text to show on button
         */
        computedButtonText() {
            if (!this.selectMode || !this.selectedItem) {
                return this.buttonText;
            }
            const item = this.getSelectedItemObject();
            if (!item) return this.buttonText;

            // Show value instead of label
            if (this.buttonDisplay.value) {
                return this.getItemValue(item);
            }

            // Show labelShort
            if (this.buttonDisplay.labelShort && !this.buttonDisplay.label) {
                return this.getItemLabelShort(item) || this.getItemLabel(item) || this.buttonText;
            }

            // Show full label
            if (this.buttonDisplay.label) {
                return this.getItemLabel(item) || this.buttonText;
            }

            return this.buttonText;
        },

        /**
         * Short button text in select mode. If selectMode and selectedItem set, returns labelShort of selected item; else static buttonTextShort.
         * @returns {String|null} Short text for button
         */
        computedButtonTextShort() {
            if (!this.selectMode || !this.selectedItem) {
                return this.buttonTextShort;
            }
            const item = this.getSelectedItemObject();
            if (!item) return this.buttonTextShort;

            // labelShort only if enabled in buttonDisplay
            if (this.buttonDisplay.labelShort) {
                return this.getItemLabelShort(item) || this.getItemLabel(item) || this.buttonTextShort;
            }

            return this.buttonTextShort;
        },

        /**
         * Button icon in select mode. If selectMode and selectedItem set, returns icon of selected item; else static buttonIcon.
         * @returns {String|null} Icon for button or null
         */
        computedButtonIcon() {
            if (!this.selectMode || !this.selectedItem) {
                return this.buttonIcon;
            }
            const item = this.getSelectedItemObject();
            if (!item) return this.buttonIcon;

            // Icon only if enabled in buttonDisplay
            if (this.buttonDisplay.icon) {
                return this.getItemIcon(item) || this.buttonIcon;
            }

            return null; // Do not show icon when disabled
        }
    },

    methods: {
        // Get parent context (avto-* class or parent ID). Called from computed so $el may not be ready.
        getParentContext() {
            if (!this.$el) {
                return 'root';
            }

            if (!this.$el.parentElement) {
                return 'root';
            }

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

        // Dropdown toggle handler
        handleToggle(event) {
            // Bootstrap handles open/close via data-bs-toggle; this is for extra logic
        },

        // Search handler
        handleSearch() {
            this.$emit('search', this.searchQuery);
        },

        // Escape handler (close when searching)
        handleEscape() {
            if (this.dropdownInstance) {
                this.dropdownInstance.hide();
            }
        },

        // Programmatic open (Bootstrap API)
        show() {
            if (this.dropdownInstance) {
                this.dropdownInstance.show();
            }
        },

        // Programmatic close (Bootstrap API)
        hide() {
            if (this.dropdownInstance) {
                this.dropdownInstance.hide();
            }
        },

        // Programmatic toggle (Bootstrap API)
        toggle() {
            if (this.dropdownInstance) {
                this.dropdownInstance.toggle();
            }
        },

        // Get Bootstrap Dropdown instance for direct API access
        getBootstrapInstance() {
            return this.dropdownInstance;
        },

        // === Select mode helpers ===

        /**
         * Get selected item object from items array. selectedItem can be: object (return as-is), number (index), string/number (value by itemValue).
         * @returns {Object|null} Item object or null
         */
        getSelectedItemObject() {
            if (!this.selectedItem) {
                return null;
            }

            const items = this.items || [];
            if (items.length === 0) {
                return null;
            }

            // If selectedItem is object, return it
            if (typeof this.selectedItem === 'object') {
                return this.selectedItem;
            }

            // Find by value (id or string); value may be number so don't confuse with index
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const value = this.getItemValue(item);
                if (value === this.selectedItem || String(value) === String(this.selectedItem)) {
                    return item;
                }
            }

            // If not found by value and selectedItem is number, treat as index (backward compat)
            if (typeof this.selectedItem === 'number') {
                return items[this.selectedItem] || null;
            }

            return null;
        },

        /**
         * Get label (text) from item. itemLabel can be field name (string) or function.
         * @param {Object} item - Item from items array
         * @returns {String|null} Label or null
         */
        getItemLabel(item) {
            if (!item) return null;
            if (typeof this.itemLabel === 'function') {
                return this.itemLabel(item);
            }
            if (typeof this.itemLabel === 'string') {
                return item[this.itemLabel] || null;
            }
            // Fallback: try standard fields
            return item.title || item.name || item.label || null;
        },

        /**
         * Get value (id) from item. Used for v-model and selection.
         * @param {Object} item - Item from items array
         * @returns {String|Number|Object|null} Value or null
         */
        getItemValue(item) {
            if (!item) return null;
            if (typeof this.itemValue === 'function') {
                return this.itemValue(item);
            }
            if (typeof this.itemValue === 'string') {
                return item[this.itemValue] || null;
            }
            // Fallback: try standard fields
            return item.id || item.value || item;
        },

        /**
         * Get icon (Font Awesome class) from item.
         * @param {Object} item - Item from items array
         * @returns {String|null} Icon or null
         */
        getItemIcon(item) {
            if (!item) return null;
            if (typeof this.itemIcon === 'function') {
                return this.itemIcon(item);
            }
            if (typeof this.itemIcon === 'string') {
                return item[this.itemIcon] || null;
            }
            // Fallback
            return item.icon || null;
        },

        /**
         * Get labelShort from item (for mobile display).
         * @param {Object} item - Item from items array
         * @returns {String|null} Short text or null
         */
        getItemLabelShort(item) {
            if (!item) return null;
            if (typeof this.itemLabelShort === 'function') {
                return this.itemLabelShort(item);
            }
            if (typeof this.itemLabelShort === 'string') {
                return item[this.itemLabelShort] || null;
            }
            // Fallback
            return item.labelShort || item.short || null;
        },

        /**
         * Menu item select handler (use in items slot). In select mode: update selectedItem, emit, close. Otherwise: emit item-select.
         * @param {Object} item - Selected item
         * @param {Number} index - Index in items array
         */
        handleItemSelect(item, index) {
            if (this.selectMode) {
                // Update selectedItem
                const value = this.getItemValue(item);
                this.$emit('update:selectedItem', value);
                this.$emit('select', { item, value, index });

                // Close dropdown after selection
                this.$nextTick(() => {
                    if (this.dropdownInstance) {
                        this.dropdownInstance.hide();
                    }
                });
            } else {
                // Normal mode: just emit event
                this.$emit('item-select', { item, index });
            }
        }
    },

    mounted() {
        // Init Bootstrap Dropdown via JS API; subscribe to Bootstrap events for state sync
        this.$nextTick(() => {
            if (window.bootstrap && window.bootstrap.Dropdown && this.$refs.dropdownContainer) {
                // Get trigger DOM: ref to Vue component or querySelector
                let toggleElement = null;
                if (this.$refs.dropdownButton) {
                    toggleElement = this.$refs.dropdownButton.$el;
                } else {
                    toggleElement = this.$refs.dropdownContainer.querySelector('[data-bs-toggle="dropdown"]');
                }

                if (toggleElement) {
                    // Bootstrap Dropdown options
                    const dropdownOptions = {};

                        if (this.autoClose !== null) {
                            dropdownOptions.autoClose = this.autoClose;
                        }

                    // Use menuOffset for Popper.js when set
                    if (this.menuOffset !== null) {
                        // Popper format: [x, y] or number (y only)
                        if (Array.isArray(this.menuOffset)) {
                            dropdownOptions.offset = this.menuOffset;
                        } else if (typeof this.menuOffset === 'number') {
                            dropdownOptions.offset = [0, this.menuOffset];
                        }
                    }

                    this.dropdownInstance = new window.bootstrap.Dropdown(toggleElement, dropdownOptions);


                    // Subscribe to Bootstrap events for state sync
                    this.$refs.dropdownContainer.addEventListener('show.bs.dropdown', () => {
                        this.isOpen = true;
                        this.$emit('show');

                        // Focus search input on open when searchable
                        if (this.searchable && this.$refs.searchInput) {
                            this.$nextTick(() => {
                                this.$refs.searchInput.focus();
                            });
                        }
                    });

                    this.$refs.dropdownContainer.addEventListener('shown.bs.dropdown', () => {
                        // Post-open actions
                    });

                    this.$refs.dropdownContainer.addEventListener('hide.bs.dropdown', () => {
                        this.isOpen = false;
                        this.$emit('hide');
                    });

                    this.$refs.dropdownContainer.addEventListener('hidden.bs.dropdown', () => {
                        // Clear search on close
                        if (this.searchable) {
                            this.searchQuery = '';
                        }
                    });

                    // closeOnOutsideClick handling
                    if (this.closeOnOutsideClick) {
                        const handleOutsideClick = (event) => {
                            if (this.isOpen && !this.$refs.dropdownContainer.contains(event.target)) {
                                this.dropdownInstance.hide();
                            }
                        };
                        document.addEventListener('click', handleOutsideClick);
                        this.outsideClickHandler = handleOutsideClick;
                    }
                }
            }
        });
    },

    beforeUnmount() {
        // @skill-anchor id:sk-eeb23d #for-bootstrap-dispose
        // Dispose Bootstrap Dropdown to avoid leaks
        if (this.dropdownInstance) {
            this.dropdownInstance.dispose();
            this.dropdownInstance = null;
        }
        // Remove outside-click handler
        if (this.outsideClickHandler) {
            document.removeEventListener('click', this.outsideClickHandler);
            this.outsideClickHandler = null;
        }
    }
};


