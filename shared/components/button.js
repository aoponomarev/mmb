/**
 * #JS-5n33791x
 * @description Reusable button: icon, text, suffix, Bootstrap variants/sizes/states, deterministic instance hashes.
 * @skill-anchor id:sk-f449b3 #for-template-logic-separation #not-doc-duplication
 *
 * PURPOSE: Layout and CSS: see shared/templates/button-template.js
 *
 * COMPONENT API:
 * Props: label, labelShort, icon, suffix (Object|Array), tooltipIcon, tooltipText, tooltipSuffix, variant, size, disabled, loading, type, iconOpacity, buttonId, classesAdd, classesRemove, buttonAttributes.
 * Emits: click, click-icon, click-text, click-suffix (all zones emit click by default).
 */

window.cmpButton = {
    template: '#button-template',

    props: {
        // === Button text ===
        label: {
            type: String,
            default: null
        },
        labelShort: {
            type: String,
            default: null // short text for mobile (when no icon)
        },

        // === Optional ===
        icon: {
            type: String,
            default: null
        },

        // === Suffix (right element) - object or array ===
        suffix: {
            type: [Object, Array],
            default: null,
            validator: (value) => {
                if (!value) return true;
                // If array - check each element
                if (Array.isArray(value)) {
                    return value.every(item => {
                        const validTypes = ['badge', 'icon', 'indicator', 'chevron', 'info'];
                        return validTypes.includes(item.type) && item.value;
                    });
                }
                // If object - treat as single element
                const validTypes = ['badge', 'icon', 'indicator', 'chevron', 'info'];
                if (!validTypes.includes(value.type)) return false;
                if (!value.value) return false;
                return true;
            }
        },

        // === Tooltips for tap zones ===
        tooltipIcon: {
            type: String,
            default: null
        },
        tooltipText: {
            type: String,
            default: null
        },
        tooltipSuffix: {
            type: String,
            default: null
        },
        tooltip: {
            type: String,
            default: null
        },

        // === Bootstrap variant and size ===
        variant: {
            type: String,
            default: 'primary',
            validator: (value) => ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark', 'outline-primary', 'outline-secondary', 'outline-success', 'outline-danger', 'outline-warning', 'outline-info', 'outline-light', 'outline-dark', 'link'].includes(value)
        },
        size: {
            type: String,
            default: null,
            validator: (value) => !value || ['sm', 'lg'].includes(value)
        },

        // === States ===
        disabled: {
            type: Boolean,
            default: false
        },
        loading: {
            type: Boolean,
            default: false
        },
        type: {
            type: String,
            default: 'button',
            validator: (value) => ['button', 'submit', 'reset'].includes(value)
        },
        buttonId: {
            type: String,
            default: null
        }, // For instanceHash (instance identification)

        // === Arbitrary attributes for complex usage ===
        buttonAttributes: {
            type: Object,
            default: () => ({})
            // Example: { 'data-bs-toggle': 'dropdown', 'aria-expanded': false, 'id': 'dropdown-button', 'class': 'dropdown-toggle' }
            // Used to pass data-*, aria-* and extra classes for Bootstrap API (dropdown, modal etc.)
        },

        // === Styling ===
        iconOpacity: {
            type: Number,
            default: 1,
            validator: (value) => value >= 0 && value <= 1
        },

        // === Class management ===
        classesAdd: {
            type: Object,
            default: () => ({})
            // Example: { root: 'float-start', icon: 'custom-icon', label: 'custom-label', suffix: 'hide-suffix' }
        },
        classesRemove: {
            type: Object,
            default: () => ({})
            // Example: { root: 'some-class', icon: 'another-class' }
        }

    },

    emits: ['click', 'click-icon', 'click-text', 'click-suffix'],

    computed: {
        // Normalize suffix to array
        suffixArray() {
            const baseSuffix = this.suffix ? (Array.isArray(this.suffix) ? this.suffix : [this.suffix]) : [];

            // REMOVED: Auto chevron for dropdown-toggle; using Bootstrap triangle via CSS ::after (same as combobox)

            return baseSuffix;
        },

        // CSS classes for root element (root)
        buttonClasses() {
            const baseClasses = ['btn', 'btn-responsive', this.instanceHash];

            // Conditional classes for responsiveness
            if (this.icon) baseClasses.push('has-icon');
            if (this.labelShort) baseClasses.push('has-label-short');

            // If disabled and not loading - use neutral colors (except variant='link')
            if (this.disabled && !this.loading && this.variant !== 'link') {
                baseClasses.push('btn-secondary', 'text-secondary', 'bg-secondary', 'bg-opacity-10', 'border-secondary');
            } else {
                // Theme variant (or link for icon-only buttons in header)
                baseClasses.push(`btn-${this.variant}`);
            }

            if (this.size) baseClasses.push(`btn-${this.size}`);
            if (this.disabled) baseClasses.push('disabled');

            // Add extra classes from buttonAttributes if present
            if (this.buttonAttributes.class) {
                const extraClasses = Array.isArray(this.buttonAttributes.class)
                    ? this.buttonAttributes.class
                    : this.buttonAttributes.class.split(' ').filter(c => c);
                baseClasses.push(...extraClasses);
            }

            // @skill-anchor id:sk-add9a6 #for-classes-add-remove #for-classes-merge-order
            // @skill-anchor id:sk-cb75ec #for-utility-availability-check
            // Class management via classesAdd and classesRemove
            if (!window.classManager) {
                console.error('classManager not found in buttonClasses');
                return baseClasses.join(' ');
            }

            const result = window.classManager.processClassesToString(
                baseClasses,
                this.classesAdd?.root,
                this.classesRemove?.root
            );
            return result;
        },

        // CSS classes for icon wrapper (icon)
        iconClasses() {
            // Flexbox to center icon in square wrapper
            const baseClasses = ['icon', 'd-flex', 'align-items-center', 'justify-content-center'];
            if (this.iconOpacity === 0.5) baseClasses.push('opacity-50');

            if (!window.classManager) {
                console.error('classManager not found in iconClasses');
                return baseClasses.join(' ');
            }

            const classesAddIcon = this.classesAdd?.icon;
            const classesRemoveIcon = this.classesRemove?.icon;
            return window.classManager.processClassesToString(
                baseClasses,
                classesAddIcon,
                classesRemoveIcon
            );
        },

        // CSS classes for label wrapper (label)
        labelClasses() {
            const baseClasses = ['text-nowrap'];

            if (!window.classManager) {
                console.error('classManager not found in labelClasses');
                return baseClasses.join(' ');
            }

            const result = window.classManager.processClassesToString(
                baseClasses,
                this.classesAdd?.label,
                this.classesRemove?.label
            );
            return result;
        },

        // CSS classes for suffix wrapper (suffix)
        suffixClasses() {
            const baseClasses = ['d-flex', 'align-items-center', 'suffix-container'];

            if (!window.classManager) {
                console.error('classManager not found in suffixClasses');
                return baseClasses.join(' ');
            }

            const result = window.classManager.processClassesToString(
                baseClasses,
                this.classesAdd?.suffix,
                this.classesRemove?.suffix
            );
            return result;
        },

        // Attributes for root element (class handled separately in buttonClasses)
        buttonAttrs() {
            const attrs = { ...this.buttonAttributes };
            // Remove class from copy; it is handled in buttonClasses
            delete attrs.class;
            return attrs;
        },

        // CSS classes for inner container
        // Vertical padding (py-*) is controlled via CSS by button size
        // Horizontal padding (px-2) default; can override via classesAdd.container
        // gap not used: flexbox gap applies to all children (including hidden/width:0), shifting icon; use margin on children instead
        containerClasses() {
            const baseClasses = ['d-flex', 'align-items-center', 'justify-content-center', 'px-2'];

            if (!window.classManager) {
                console.error('classManager not found in containerClasses');
                return baseClasses.join(' ');
            }

            return window.classManager.processClassesToString(
                baseClasses,
                this.classesAdd?.container,
                this.classesRemove?.container
            );
        },

        // Deterministic instance hash from parent context and props; stable across sessions
        instanceHash() {
            if (!window.hashGenerator) {
                console.warn('hashGenerator not found, using fallback');
                return 'avto-00000000';
            }

            // Parent context (stable parent marker)
            const parentContext = this.getParentContext();

            // Instance id from props
            const instanceId = this.buttonId || this.label || this.icon || 'button';

            // Combine for uniqueness
            const uniqueId = `${parentContext}:${instanceId}`;
            return window.hashGenerator.generateMarkupClass(uniqueId);
        }
    },

    watch: {
        // Watch tooltip props and update Bootstrap tooltips
        tooltipIcon(newVal) {
            this.updateTouchTooltips('icon', newVal);
        },
        tooltipText(newVal) {
            this.updateTouchTooltips('text', newVal);
        },
        tooltipSuffix(newVal) {
            this.updateTouchTooltips('suffix', newVal);
        },
        // Watch suffix changes (can be array)
        suffix: {
            handler(newVal) {
                if (this._touchTooltips) {
                    this.$nextTick(() => {
                        // Update tooltips for suffix elements
                        this._touchTooltips.forEach(({ element, tooltip, elementType }) => {
                            if (elementType === 'suffix' && tooltip) {
                                // For suffix find matching element in array
                                const suffixArray = Array.isArray(newVal) ? newVal : (newVal ? [newVal] : []);
                                const dataOriginalTitle = element.getAttribute('data-original-title') || '';
                                const suffixItem = suffixArray.find(item => {
                                    const itemTooltip = item?.tooltip || '';
                                    return dataOriginalTitle.includes(itemTooltip) || itemTooltip.includes(dataOriginalTitle);
                                });
                                const newTitle = suffixItem?.tooltip || this.tooltipSuffix;
                                if (newTitle && newTitle !== dataOriginalTitle) {
                                    try {
                                        tooltip.setContent({ '.tooltip-inner': newTitle });
                                        element.setAttribute('data-original-title', newTitle);
                                    } catch (error) {
                                        console.error('watch suffix: tooltip update error', error, element);
                                    }
                                }
                            }
                        });
                    });
                }
            },
            deep: true
        }
    },

    methods: {
        // Update Bootstrap tooltips for given element type
        updateTouchTooltips(elementType, newTitle) {
            if (!this._touchTooltips || !newTitle) return;

            this.$nextTick(() => {
                this._touchTooltips.forEach(({ element, tooltip, elementType: storedType }) => {
                    if (storedType === elementType && tooltip) {
                        try {
                            tooltip.setContent({ '.tooltip-inner': newTitle });
                            element.setAttribute('data-original-title', newTitle);
                        } catch (error) {
                            console.error('updateTouchTooltips: tooltip update error', error, element);
                        }
                    }
                });
            });
        },

        // @skill-anchor id:sk-cb75ec #for-vue-comment-node-fallback #not-dom-in-computed
        // Get parent context (avto-* class or parent ID). Called from computed so $el may be unavailable
        getParentContext() {
            if (!this.$el) {
                return 'root';
            }

            if (!this.$el.parentElement) {
                return 'root';
            }

            let parent = this.$el.parentElement;
            let depth = 0;
            const maxDepth = 5; // Search depth limit

            while (parent && depth < maxDepth) {
                const avtoClass = Array.from(parent.classList).find(cls => cls.startsWith('avto-'));
                if (avtoClass) {
                    return avtoClass;
                }

                if (parent.id) {
                    return `#${parent.id}`;
                }

                parent = parent.parentElement;
                depth++;
            }

            return 'root'; // fallback
        },

        // Button click handler
        handleClick(event) {
            if (this.disabled || this.loading) return;
            this.$emit('click', event);
        },

        // Icon click handler
        handleIconClick(event) {
            if (this.disabled || this.loading) return;
            this.$emit('click', event);
            this.$emit('click-icon', event);
        },

        // Text click handler
        handleTextClick(event) {
            if (this.disabled || this.loading) return;
            this.$emit('click', event);
            this.$emit('click-text', event);
        },

        // Suffix element click handler
        handleSuffixClick(event, item) {
            if (this.disabled || this.loading) return;
            this.$emit('click', event);
            this.$emit('click-suffix', event, item);
        },

        /**
         * Init Bootstrap tooltips with long-press on touch devices.
         * Replaces native title tooltips with Bootstrap tooltips (manual trigger).
         */
        initTouchTooltips() {
            const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            const isSmallScreen = window.matchMedia('(max-width: 768px)').matches;
            // Touch support OR small screen (for DevTools testing)
            const isTouch = hasTouchSupport || isSmallScreen;

            if (!isTouch || !window.bootstrap || !window.bootstrap.Tooltip) {
                return;
            }

            const LONG_PRESS_DURATION = 500; // 500ms for long press
            const tooltipElements = [];

            // Find all elements with title (icon, text, suffix)
            const elements = this.$el.querySelectorAll('[title]');

            elements.forEach(element => {
                const title = element.getAttribute('title');
                if (!title) return;

                element.setAttribute('data-original-title', title);
                element.removeAttribute('title');

                // Determine element type for props mapping
                let elementType = null;
                if (element.classList.contains('icon')) {
                    elementType = 'icon';
                } else if (element.classList.contains('text-nowrap') || element.classList.contains('label')) {
                    elementType = 'text';
                } else if (element.classList.contains('badge') || element.classList.contains('suffix-container') || element.closest('.suffix-container')) {
                    elementType = 'suffix';
                }

                let tooltip = null;
                try {
                    // Create Bootstrap tooltip with manual trigger
                    tooltip = new window.bootstrap.Tooltip(element, {
                        title: title,
                        trigger: 'manual'
                    });

                    tooltipElements.push({ element, tooltip, elementType });
                } catch (error) {
                    console.error('initTouchTooltips: tooltip create error', error);
                    element.setAttribute('title', title);
                    element.removeAttribute('data-original-title');
                    return;
                }

                let longPressTimer = null;
                let tooltipShown = false;

                const handleTouchStart = (e) => {
                    if (!tooltip) {
                        return;
                    }
                    tooltipShown = false;
                    longPressTimer = setTimeout(() => {
                        try {
                            tooltip.show();
                            tooltipShown = true;
                        } catch (error) {
                            console.error('initTouchTooltips: tooltip show error', error);
                        }
                    }, LONG_PRESS_DURATION);
                };

                const handleTouchEnd = () => {
                    if (longPressTimer) {
                        clearTimeout(longPressTimer);
                        longPressTimer = null;
                    }
                    // Hide on touchend only if tooltip was not shown (no long press); if shown, stays until click outside
                    if (tooltip && !tooltipShown) {
                        tooltip.hide();
                    }
                };

                const handleTouchCancel = () => {
                    if (longPressTimer) {
                        clearTimeout(longPressTimer);
                        longPressTimer = null;
                    }
                    if (tooltip) {
                        tooltip.hide();
                    }
                };

                const handleClick = () => {
                    if (tooltip) {
                        tooltip.hide();
                    }
                };

                element.addEventListener('touchstart', handleTouchStart, { passive: true });
                element.addEventListener('touchend', handleTouchEnd, { passive: true });
                element.addEventListener('touchcancel', handleTouchCancel, { passive: true });
                element.addEventListener('click', handleClick);

                // Store handlers for cleanup
                element._touchTooltipHandlers = {
                    touchstart: handleTouchStart,
                    touchend: handleTouchEnd,
                    touchcancel: handleTouchCancel,
                    click: handleClick
                };
            });

            this._touchTooltips = tooltipElements;

            // Document click handler to hide all tooltips when clicking outside
            if (tooltipElements.length > 0 && !this._documentClickHandler) {
                this._documentClickHandler = (e) => {
                    const clickedInside = tooltipElements.some(({ element }) => {
                        return element.contains(e.target) || element === e.target;
                    });

                    if (!clickedInside) {
                        tooltipElements.forEach(({ tooltip }) => {
                            if (tooltip) {
                                tooltip.hide();
                            }
                        });
                    }
                };

                // Use capture phase for earlier handling
                document.addEventListener('click', this._documentClickHandler, true);
                document.addEventListener('touchend', this._documentClickHandler, true);
            }
        }
    },

    mounted() {
        // Init touch tooltips on mobile
        this.$nextTick(() => {
            this.initTouchTooltips();
        });
    },

    updated() {
        // @skill-anchor id:sk-502074 #for-tooltip-reactivity
        // Update Bootstrap tooltips when title changes (e.g. language switch)
        if (this._touchTooltips && this._touchTooltips.length > 0) {
            this.$nextTick(() => {
                this._touchTooltips.forEach(({ element, tooltip, elementType }) => {
                    if (!tooltip) return;

                    // Get current title from props (Vue updates title reactively)
                    let currentTitle = null;
                    if (elementType === 'icon') {
                        currentTitle = this.tooltipIcon;
                    } else if (elementType === 'text') {
                        currentTitle = this.tooltipText;
                    } else if (elementType === 'suffix') {
                        // For suffix check suffix prop
                        if (Array.isArray(this.suffix)) {
                            const suffixItem = this.suffix.find(item => {
                                const itemTooltip = item?.tooltip || '';
                                const dataOriginalTitle = element.getAttribute('data-original-title') || '';
                                return dataOriginalTitle.includes(itemTooltip) || itemTooltip.includes(dataOriginalTitle);
                            });
                            currentTitle = suffixItem?.tooltip || this.tooltipSuffix;
                        } else if (this.suffix) {
                            currentTitle = this.suffix.tooltip || this.tooltipSuffix;
                        } else {
                            currentTitle = this.tooltipSuffix;
                        }
                    }

                    // Update tooltip if title changed
                    if (currentTitle) {
                        const dataOriginalTitle = element.getAttribute('data-original-title') || '';
                        if (currentTitle !== dataOriginalTitle) {
                            try {
                                tooltip.setContent({ '.tooltip-inner': currentTitle });
                                element.setAttribute('data-original-title', currentTitle);
                            } catch (error) {
                                console.error('updated: tooltip update error', error);
                            }
                        }
                    }
                });
            });
        }
    },

    beforeUnmount() {
        // Remove document click handler
        if (this._documentClickHandler) {
            document.removeEventListener('click', this._documentClickHandler, true);
            document.removeEventListener('touchend', this._documentClickHandler, true);
            this._documentClickHandler = null;
        }

        // Cleanup touch tooltips
        if (this._touchTooltips) {
            this._touchTooltips.forEach(({ element, tooltip }) => {
                // Remove event handlers
                if (element._touchTooltipHandlers) {
                    element.removeEventListener('touchstart', element._touchTooltipHandlers.touchstart);
                    element.removeEventListener('touchend', element._touchTooltipHandlers.touchend);
                    element.removeEventListener('touchcancel', element._touchTooltipHandlers.touchcancel);
                    element.removeEventListener('click', element._touchTooltipHandlers.click);
                    delete element._touchTooltipHandlers;
                }

                // Restore title from data-original-title
                const originalTitle = element.getAttribute('data-original-title');
                if (originalTitle) {
                    element.setAttribute('title', originalTitle);
                    element.removeAttribute('data-original-title');
                }

                // Dispose Bootstrap tooltip
                if (tooltip) {
                    tooltip.dispose();
                }
            });
            this._touchTooltips = null;
        }
    }
};

