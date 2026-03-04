/**
 * #JS-Tm2EL8Pw
 * @description Universal dropdown menu item: icon, title, subtitle, suffix; zone clicks; template dropdown-menu-item-template.js.
 * @see id:sk-483943
 */
window.cmpDropdownMenuItem = {
    template: '#dropdown-menu-item-template',

    props: {
        // === Required ===
        title: {
            type: String,
            required: true
        },

        // === Optional ===
        icon: {
            type: String,
            default: null
        },
        subtitle: {
            type: String,
            default: null
        },

        // === Suffix (right element) ===
        suffix: {
            type: Object,
            default: null,
            validator: (value) => {
                if (!value) return true;
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
        // === Bootstrap tooltips (default: native via title) ===
        tooltipIconBootstrap: {
            type: Boolean,
            default: false
        },
        tooltipTextBootstrap: {
            type: Boolean,
            default: false
        },
        tooltipSuffixBootstrap: {
            type: Boolean,
            default: false
        },

        // === State ===
        active: {
            type: Boolean,
            default: false
        },
        disabled: {
            type: Boolean,
            default: false
        },
        itemId: {
            type: String,
            default: null
        }, // For instanceHash (instance identification)

        // === Styling ===
        iconOpacity: {
            type: Number,
            default: 0.5,
            validator: (value) => value >= 0 && value <= 1
        },
        subtitleOpacity: {
            type: Number,
            default: 0.5,
            validator: (value) => value >= 0 && value <= 1
        },

        // === Class control ===
        classesAdd: {
            type: Object,
            default: () => ({})
            // e.g. { root: 'custom-root', icon: 'custom-icon', subtitle: 'custom-subtitle', suffix: 'custom-suffix' }
        },
        classesRemove: {
            type: Object,
            default: () => ({})
            // e.g. { root: 'some-class', icon: 'another-class' }
        },
        autoCloseParent: {
            type: Boolean,
            default: true
        },
        noWrap: {
            type: Boolean,
            default: false
        },
        highlightClass: {
            type: String,
            default: null
        },
        isSymbol: {
            type: Boolean,
            default: null
        },
        fallbackIcon: {
            type: String,
            default: null
        }

    },

    emits: ['click', 'click-icon', 'click-text', 'click-suffix'],

    data() {
        return {
            currentIcon: this.icon,
            imageVisible: true
        };
    },

    computed: {
        // Tooltip for suffix (tooltipSuffix takes priority)
        suffixTooltip() {
            return this.tooltipSuffix || (this.suffix && this.suffix.tooltip) || null;
        },

        // CSS classes for root element
        itemClasses() {
            const baseClasses = ['dropdown-menu-item-responsive', this.instanceHash];
            if (this.subtitle) {
                // Subtitle hidden on mobile by default
                baseClasses.push('hide-subtitle-mobile');
            }

            if (this.highlightClass) {
                baseClasses.push(this.highlightClass);
            }

            // Classes via classesAdd and classesRemove
            if (!window.classManager) {
                console.error('classManager not found in itemClasses');
                return baseClasses.join(' ');
            }

            return window.classManager.processClassesToString(
                baseClasses,
                this.classesAdd?.root,
                this.classesRemove?.root
            );
        },

        // CSS classes for icon
        iconClasses() {
            const baseClasses = ['icon', 'd-flex', 'align-items-center', 'me-2'];

            if (!this.imageVisible) {
                baseClasses.push('no-image');
            }

            // If image, add image-specific classes
            if (this.isIconImage) {
                baseClasses.push('icon-image');
            }

            // For Unicode icons add .lh-sm on .icon
            if (this.isIconSymbol) {
                baseClasses.push('lh-sm');
            }

            // Add opacity-50 only if not Unicode and not image
            if (this.iconOpacity === 0.5 && !this.isIconSymbol && !this.isIconImage) {
                baseClasses.push('opacity-50');
            }

            if (!window.classManager) {
                return baseClasses.join(' ');
            }

            return window.classManager.processClassesToString(
                baseClasses,
                this.classesAdd?.icon,
                this.classesRemove?.icon
            );
        },

        // CSS classes for subtitle
        subtitleClasses() {
            const baseClasses = ['subtitle', 'd-block', 'mt-1', 'lh-sm'];
            if (this.subtitleOpacity === 0.5) baseClasses.push('opacity-50');

            if (!window.classManager) {
                return baseClasses.join(' ');
            }

            return window.classManager.processClassesToString(
                baseClasses,
                this.classesAdd?.subtitle,
                this.classesRemove?.subtitle
            );
        },

        // CSS classes for text area container
        textContainerClasses() {
            const baseClasses = ['flex-grow-1'];

            if (this.noWrap) {
                baseClasses.push('text-nowrap');
            } else {
                baseClasses.push('text-break', 'text-wrap');
            }

            if (!window.classManager) {
                return baseClasses.join(' ');
            }

            return window.classManager.processClassesToString(
                baseClasses,
                this.classesAdd?.textContainer,
                this.classesRemove?.textContainer
            );
        },

        // CSS classes for title area
        titleClasses() {
            const baseClasses = ['lh-sm'];

            if (!this.noWrap) {
                baseClasses.push('text-wrap');
            }

            if (!window.classManager) {
                return baseClasses.join(' ');
            }

            return window.classManager.processClassesToString(
                baseClasses,
                this.classesAdd?.title,
                this.classesRemove?.title
            );
        },

        // Check if icon is image (URL or path)
        isIconImage() {
            if (!this.currentIcon) return false;
            // Simple check: file extension or http(s) URL
            return (this.currentIcon.includes('.') && !this.currentIcon.includes(' ')) || this.currentIcon.startsWith('http');
        },

        // Check if icon is Unicode (emoji or single char)
        isIconSymbol() {
            if (this.isSymbol !== null) return this.isSymbol;
            if (!this.currentIcon || this.isIconImage) return false;
            // If no spaces and no fa- (FontAwesome), treat as Unicode
            return !this.currentIcon.includes(' ') && !this.currentIcon.includes('fa-');
        },

        // Check if suffix is Unicode
        isSuffixSymbol() {
            if (!this.suffix || !this.suffix.value) return false;
            if (!['icon', 'indicator', 'info', 'chevron'].includes(this.suffix.type)) return false;
            return !this.suffix.value.includes(' ') && !this.suffix.value.includes('fa-');
        },

        // CSS classes for suffix
        suffixClasses() {
            const baseClasses = ['d-flex', 'align-items-center', 'ms-2', 'pt-1'];

            if (!window.classManager) {
                return baseClasses.join(' ');
            }

            return window.classManager.processClassesToString(
                baseClasses,
                this.classesAdd?.suffix,
                this.classesRemove?.suffix
            );
        },

        // Deterministic instance hash from parent context and props
        instanceHash() {
            if (!window.hashGenerator) {
                console.warn('hashGenerator not found, using fallback');
                return 'avto-00000000';
            }

            const parentContext = this.getParentContext();
            const instanceId = this.itemId || this.title || this.icon || 'menu-item';
            const uniqueId = `${parentContext}:${instanceId}`;
            return window.hashGenerator.generateMarkupClass(uniqueId);
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

        // Close parent dropdown on mouse release
        closeParentDropdown() {
            // Find closest parent with .dropdown
            let parent = this.$el.closest('.dropdown');
            if (!parent) return;

            // Get Bootstrap Dropdown instance
            if (window.bootstrap && window.bootstrap.Dropdown) {
                const dropdownElement = parent.querySelector('[data-bs-toggle="dropdown"]');
                if (dropdownElement) {
                    const dropdownInstance = window.bootstrap.Dropdown.getInstance(dropdownElement);
                    if (dropdownInstance) {
                        dropdownInstance.hide();
                    }
                }
            }
        },

        // Whole menu item click handler
        handleClick(event) {
            if (this.disabled) return;

            // Close dropdown on mouse release
            if (this.autoCloseParent) {
                this.closeParentDropdown();
            }

            this.$emit('click', event);
        },

        // Icon click handler
        handleIconClick(event) {
            if (this.disabled) return;

            // Close dropdown on mouse release
            if (this.autoCloseParent) {
                this.closeParentDropdown();
            }

            // All zones emit click by default; zone-specific event always emitted
            this.$emit('click', event);
            this.$emit('click-icon', event);
        },

        // Text click handler
        handleTextClick(event) {
            if (this.disabled) return;

            // Close dropdown on mouse release
            if (this.autoCloseParent) {
                this.closeParentDropdown();
            }

            // All zones emit click by default; zone-specific event always emitted
            this.$emit('click', event);
            this.$emit('click-text', event);
        },

        // Suffix click handler
        handleSuffixClick(event) {
            if (this.disabled) return;

            // Close dropdown on mouse release
            if (this.autoCloseParent) {
                this.closeParentDropdown();
            }

            // All zones emit click by default; zone-specific event always emitted
            this.$emit('click', event);
            this.$emit('click-suffix', event);
        },

        // Image icon load error handler
        handleIconError() {
            if (this.fallbackIcon && this.currentIcon !== this.fallbackIcon) {
                this.currentIcon = this.fallbackIcon;
            } else {
                this.imageVisible = false;
            }
        },

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
                            console.error('updateTouchTooltips (dropdown): tooltip update error', error, element);
                        }
                    }
                });
            });
        },

        /**
         * Init Bootstrap tooltips with long-press on touch. Replaces native title with Bootstrap manual trigger.
         */
        initTouchTooltips() {
            // Detect touch device (multiple checks)
            const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            // Media query (for DevTools emulation)
            const isSmallScreen = window.matchMedia('(max-width: 768px)').matches;
            // Touch support OR small screen (for DevTools testing)
            const isTouch = hasTouchSupport || isSmallScreen;

            if (!isTouch || !window.bootstrap || !window.bootstrap.Tooltip) {
                return;
            }

            const LONG_PRESS_DURATION = 500; // 500ms for long press
            const tooltipElements = [];

            // Find all elements with title (icon, text, suffix); skip those already using Bootstrap tooltips
            const elements = this.$el.querySelectorAll('[title]:not([data-bs-toggle="tooltip"])');

            elements.forEach(element => {
                const title = element.getAttribute('title');
                if (!title) return;

                // Store title in data attr for restore
                element.setAttribute('data-original-title', title);
                // Remove title to avoid native tooltip
                element.removeAttribute('title');

                // Determine element type for props mapping
                let elementType = null;
                if (element.classList.contains('icon')) {
                    elementType = 'icon';
                } else if (element.classList.contains('flex-grow-1') || element.classList.contains('text-break')) {
                    elementType = 'text';
                } else if (element.classList.contains('d-flex') && element.classList.contains('align-items-center') && element.classList.contains('ms-2')) {
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
                    console.error('initTouchTooltips (dropdown): tooltip creation error', error);
                    // Restore title on error
                    element.setAttribute('title', title);
                    element.removeAttribute('data-original-title');
                    return; // Skip element if tooltip creation failed
                }

                // Long-press handlers
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
                            console.error('initTouchTooltips (dropdown): tooltip show error', error);
                        }
                    }, LONG_PRESS_DURATION);
                };

                const handleTouchEnd = () => {
                    if (longPressTimer) {
                        clearTimeout(longPressTimer);
                        longPressTimer = null;
                    }
                    // Hide tooltip on touchend only if not shown (no long press); if shown, stays until click outside
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

            // Store refs for cleanup
            this._touchTooltips = tooltipElements;

            // Watch title changes to update Bootstrap tooltips
            if (tooltipElements.length > 0 && !this._titleObserver) {
                this._titleObserver = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.type === 'attributes' && mutation.attributeName === 'title') {
                            const element = mutation.target;
                            const tooltipEntry = tooltipElements.find(entry => entry.element === element);
                            if (tooltipEntry && tooltipEntry.tooltip) {
                                const newTitle = element.getAttribute('title');
                                if (newTitle) {
                                    // Update tooltip text via Bootstrap API
                                    try {
                                        tooltipEntry.tooltip.setContent({ '.tooltip-inner': newTitle });
                                        // Also update data-original-title for consistency
                                        element.setAttribute('data-original-title', newTitle);
                                    } catch (error) {
                                        console.error('initTouchTooltips (dropdown): tooltip update error', error, element);
                                    }
                                }
                            }
                        }
                    });
                });

                // Watch title on all elements
                tooltipElements.forEach(({ element }) => {
                    this._titleObserver.observe(element, {
                        attributes: true,
                        attributeFilter: ['title']
                    });
                });
            }

            // Document click handler to hide all tooltips on outside click
            if (tooltipElements.length > 0 && !this._documentClickHandler) {
                this._documentClickHandler = (e) => {
                    // Check if click was outside all tooltip elements
                    const clickedInside = tooltipElements.some(({ element }) => {
                        return element.contains(e.target) || element === e.target;
                    });

                    if (!clickedInside) {
                        // Hide all tooltips
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

    watch: {
        // If icon changed in props, update local state
        icon(newVal) {
            this.currentIcon = newVal;
            this.imageVisible = true;
        },
        // If fallback changed, reset state to retry load
        fallbackIcon(newVal) {
            this.currentIcon = this.icon;
            this.imageVisible = true;
        },
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
        // Watch suffix changes
        suffix: {
            handler(newVal) {
                if (this._touchTooltips && newVal) {
                    this.$nextTick(() => {
                        // Update tooltips for suffix elements
                        this._touchTooltips.forEach(({ element, tooltip, elementType }) => {
                            if (elementType === 'suffix' && tooltip) {
                                const newTitle = newVal.tooltip || this.tooltipSuffix;
                                const dataOriginalTitle = element.getAttribute('data-original-title') || '';
                                if (newTitle && newTitle !== dataOriginalTitle) {
                                    try {
                                        tooltip.setContent({ '.tooltip-inner': newTitle });
                                        element.setAttribute('data-original-title', newTitle);
                                    } catch (error) {
                                        console.error('watch suffix (dropdown): tooltip update error', error, element);
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

    mounted() {
        // Init Bootstrap tooltips only where prop is true
        this.$nextTick(() => {
            if (window.bootstrap && window.bootstrap.Tooltip && this.$el && this.$el.querySelectorAll) {
                const tooltipElements = this.$el.querySelectorAll('[data-bs-toggle="tooltip"]');
                tooltipElements.forEach(element => {
                    new window.bootstrap.Tooltip(element);
                });
            }

            // Init touch tooltips on mobile
            this.initTouchTooltips();
        });
    },

    updated() {
        // Update Bootstrap tooltips when title changes (e.g. language)
        if (this._touchTooltips && this._touchTooltips.length > 0) {
            this.$nextTick(() => {
                this._touchTooltips.forEach(({ element, tooltip, elementType }) => {
                    if (!tooltip) return;

                    // Get current title from props (Vue updates reactively)
                    let currentTitle = null;
                    if (elementType === 'icon') {
                        currentTitle = this.tooltipIcon;
                    } else if (elementType === 'text') {
                        currentTitle = this.tooltipText;
                    } else if (elementType === 'suffix') {
                        // For suffix check suffix prop
                        if (this.suffix) {
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
                                console.error('updated (dropdown): tooltip update error', error);
                            }
                        }
                    }
                });
            });
        }
    },

    beforeUnmount() {
        // Disconnect MutationObserver
        if (this._titleObserver) {
            this._titleObserver.disconnect();
            this._titleObserver = null;
        }

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

        // Dispose Bootstrap tooltips on unmount
        if (window.bootstrap && window.bootstrap.Tooltip) {
            const tooltipElements = this.$el.querySelectorAll('[data-bs-toggle="tooltip"]');
            tooltipElements.forEach(element => {
                const tooltipInstance = window.bootstrap.Tooltip.getInstance(element);
                if (tooltipInstance) {
                    tooltipInstance.dispose();
                }
            });
        }
    }
};

