// =========================
// КОМПОНЕНТ ПУНКТА ВЫПАДАЮЩЕГО МЕНЮ
// Универсальный компонент для пунктов dropdown-меню с иконкой, текстом и суффиксом
// =========================
// ЦЕЛЬ: Переиспользуемый компонент пункта выпадающего меню с поддержкой:
// - Левая иконка с tooltip
// - Заголовок и подзаголовок с переносом текста
// - Суффикс (badge/icon/indicator/chevron/info) с tooltip
// - Состояния (active, disabled)
// - Раздельные события для кликов по зонам (по умолчанию все эмитят общий click)
// - Адаптивности элементов через CSS классы (.dropdown-menu-item-responsive)
// - Детерминированных хэшей экземпляров (instanceHash) для идентификации и кастомной стилизации
//
// ПРИНЦИПЫ:
// - Использование только Bootstrap классов (запрет кастомных стилей, кроме inline transition для chevron)
// - Поддержка тем Bootstrap через CSS-переменные
// - Анимация chevron через Font Awesome классы (fa-rotate-90) + inline transition
// - Условный рендеринг всех опциональных элементов
// - Нативные подсказки браузера через атрибут title (по умолчанию)
// - Опциональное использование Bootstrap tooltips через props tooltipIconBootstrap, tooltipTextBootstrap, tooltipSuffixBootstrap
// - По умолчанию все зоны (иконка, текст, суффикс) эмитят общее событие 'click'
//   Раздельные события (click-icon, click-text, click-suffix) срабатывают только если назначены явно
//
// API КОМПОНЕНТА:
//
// Входные параметры (props):
// Обязательные:
// - title (String, required) — заголовок пункта меню
// Опциональные:
// - icon (String) — CSS класс иконки слева (Font Awesome, Material Symbols)
// - subtitle (String) — подзаголовок (вторая строка текста)
// - suffix (Object) — суффикс справа. Формат: { type: 'badge'|'icon'|'indicator'|'chevron'|'info', value: String|Number, variant: String, expanded: Boolean, tooltip: String }
// - tooltipIcon (String) — всплывающая подсказка для иконки слева (по умолчанию нативная через title, можно переключить на Bootstrap через tooltipIconBootstrap)
// - tooltipText (String) — всплывающая подсказка для текстовой области (по умолчанию нативная через title, можно переключить на Bootstrap через tooltipTextBootstrap)
// - tooltipSuffix (String) — всплывающая подсказка для суффикса (приоритет над suffix.tooltip, по умолчанию нативная через title, можно переключить на Bootstrap через tooltipSuffixBootstrap)
// - tooltipIconBootstrap (Boolean, default: false) — использовать Bootstrap tooltip для иконки вместо нативной подсказки
// - tooltipTextBootstrap (Boolean, default: false) — использовать Bootstrap tooltip для текста вместо нативной подсказки
// - tooltipSuffixBootstrap (Boolean, default: false) — использовать Bootstrap tooltip для суффикса вместо нативной подсказки
// - active (Boolean) — активное состояние пункта меню
// - disabled (Boolean) — отключённое состояние пункта меню
// - iconOpacity (Number, default: 0.5) — прозрачность иконки слева (0-1)
// - subtitleOpacity (Number, default: 0.5) — прозрачность подзаголовка (0-1)
// - classesAdd (Object, default: {}) — классы для добавления на различные элементы компонента. Структура: { root: 'классы', icon: 'классы', subtitle: 'классы', suffix: 'классы' }
// - classesRemove (Object, default: {}) — классы для удаления с различных элементов компонента. Структура: { root: 'классы', icon: 'классы', subtitle: 'классы', suffix: 'классы' }
//
// Выходные события (emits):
// - click — общее событие клика по пункту меню (эмитится всегда при клике на любую зону)
// - click-icon — клик по иконке слева (эмитится вместе с click)
// - click-text — клик по текстовой области (эмитится вместе с click)
// - click-suffix — клик по суффиксу справа (эмитится вместе с click)
//
// Примечание: Все зоны (иконка, текст, суффикс) эмитят общее событие click по умолчанию. Раздельные события (click-icon, click-text, click-suffix) срабатывают только если назначены явно в родительском компоненте.
//
// Обработка событий:
// Структура layout и CSS-классы: см. в шапке шаблона `shared/templates/dropdown-menu-item-template.js`
// Bootstrap-совместимость:
// - Компонент использует класс dropdown-item Bootstrap для базовой стилизации
// - Состояния active и disabled применяются через классы Bootstrap
// - Поддержка тем Bootstrap через CSS-переменные (var(--bs-body-color), var(--bs-secondary-color) и т.п.)
// Подсказки (tooltips):
// - По умолчанию: нативные подсказки браузера через атрибут title (не требуют инициализации)
// - Опционально: Bootstrap tooltips через props tooltipIconBootstrap, tooltipTextBootstrap, tooltipSuffixBootstrap (Boolean, default: false)
// - Если соответствующий prop = true, используется Bootstrap tooltip с инициализацией через window.bootstrap.Tooltip
// - Bootstrap tooltips уничтожаются в beforeUnmount() для предотвращения утечек памяти
// - Раздельные подсказки для иконки (tooltipIcon), текста (tooltipText) и суффикса (tooltipSuffix или suffix.tooltip)
// Обработка событий:
// - По умолчанию все зоны (иконка, текст, суффикс) эмитят общее событие 'click'
// - Раздельные события (click-icon, click-text, click-suffix) эмитятся всегда при клике на соответствующую зону
// - Обработчики событий используют .stop для предотвращения всплытия
// - Используется @mouseup вместо @click для закрытия dropdown при отпускании кнопки мыши
// - При отпускании кнопки мыши автоматически закрывается родительский dropdown через Bootstrap API
// Использование нативного Bootstrap dropdown-menu:
// - Кастомный компонент dropdown-menu (контейнер выпадающего меню) не создаётся
// - Используется нативный Bootstrap dropdown-menu через классы и JavaScript API
// - Bootstrap 5 уже предоставляет полный функционал: клавиатурную навигацию, позиционирование через Popper.js, управление через JavaScript API, поддержку тем, закрытие при клике вне меню
//
// АРХИТЕКТУРА:
// - Шаблон: shared/templates/dropdown-menu-item-template.js (ID: dropdown-menu-item-template)
// - Зависимости: Bootstrap 5, Font Awesome 6, Vue.js
// - См. также: `a/skills/app/skills/architecture/architecture-dom-markup.md` (принципы модульности, запрет кастомных стилей)

window.cmpDropdownMenuItem = {
    template: '#dropdown-menu-item-template',

    props: {
        // === Обязательные ===
        title: {
            type: String,
            required: true
        },

        // === Опциональные ===
        icon: {
            type: String,
            default: null
        },
        subtitle: {
            type: String,
            default: null
        },

        // === Суффикс (правый элемент) ===
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

        // === Подсказки для тап-зон ===
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
        // === Использование Bootstrap tooltips (по умолчанию - нативные браузерные через title) ===
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

        // === Состояния ===
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
        }, // Для instanceHash (идентификация экземпляра)

        // === Стилизация ===
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

        // === Управление классами ===
        classesAdd: {
            type: Object,
            default: () => ({})
            // Пример: { root: 'custom-root', icon: 'custom-icon', subtitle: 'custom-subtitle', suffix: 'custom-suffix' }
        },
        classesRemove: {
            type: Object,
            default: () => ({})
            // Пример: { root: 'some-class', icon: 'another-class' }
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
        // Подсказка для суффикса (приоритет у tooltipSuffix)
        suffixTooltip() {
            return this.tooltipSuffix || (this.suffix && this.suffix.tooltip) || null;
        },

        // CSS классы для корневого элемента
        itemClasses() {
            const baseClasses = ['dropdown-menu-item-responsive', this.instanceHash];
            if (this.subtitle) {
                // По умолчанию подзаголовок скрыт на мобильных
                baseClasses.push('hide-subtitle-mobile');
            }

            if (this.highlightClass) {
                baseClasses.push(this.highlightClass);
            }

            // Управление классами через classesAdd и classesRemove
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

        // CSS классы для иконки
        iconClasses() {
            const baseClasses = ['icon', 'd-flex', 'align-items-center', 'me-2'];

            if (!this.imageVisible) {
                baseClasses.push('no-image');
            }

            // Если это изображение, добавляем специфичные классы
            if (this.isIconImage) {
                baseClasses.push('icon-image');
            }

            // Для юникод-иконок вешаем .lh-sm прям на .icon
            if (this.isIconSymbol) {
                baseClasses.push('lh-sm');
            }

            // Добавляем opacity-50 только если это НЕ Unicode-символ и НЕ изображение
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

        // CSS классы для подзаголовка
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

        // CSS классы для контейнера текстовой области
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

        // CSS классы для области заголовка
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

        // Проверка, является ли иконка изображением (URL или путь)
        isIconImage() {
            if (!this.currentIcon) return false;
            // Простая проверка: если есть расширение файла или это http(s) URL
            return (this.currentIcon.includes('.') && !this.currentIcon.includes(' ')) || this.currentIcon.startsWith('http');
        },

        // Проверка, является ли иконка Unicode-символом (эмодзи или один символ)
        isIconSymbol() {
            if (this.isSymbol !== null) return this.isSymbol;
            if (!this.currentIcon || this.isIconImage) return false;
            // Если иконка не содержит пробелов и не содержит fa- (признак FontAwesome),
            // то считаем это Unicode-символом
            return !this.currentIcon.includes(' ') && !this.currentIcon.includes('fa-');
        },

        // Проверка, является ли суффикс Unicode-символом
        isSuffixSymbol() {
            if (!this.suffix || !this.suffix.value) return false;
            if (!['icon', 'indicator', 'info', 'chevron'].includes(this.suffix.type)) return false;
            return !this.suffix.value.includes(' ') && !this.suffix.value.includes('fa-');
        },

        // CSS классы для суффикса
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

        // Детерминированный хэш экземпляра на основе родительского контекста и props
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
        // Получить родительский контекст (класс avto-* или ID родителя)
        // Вызывается из computed, поэтому $el может быть еще не доступен
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

        // Закрытие родительского dropdown при отпускании кнопки мыши
        closeParentDropdown() {
            // Находим ближайший родительский элемент с классом .dropdown
            let parent = this.$el.closest('.dropdown');
            if (!parent) return;

            // Получаем Bootstrap Dropdown instance
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

        // Обработчик клика по всему пункту меню
        handleClick(event) {
            if (this.disabled) return;

            // Закрываем dropdown при отпускании кнопки мыши
            if (this.autoCloseParent) {
                this.closeParentDropdown();
            }

            this.$emit('click', event);
        },

        // Обработчик клика по иконке
        handleIconClick(event) {
            if (this.disabled) return;

            // Закрываем dropdown при отпускании кнопки мыши
            if (this.autoCloseParent) {
                this.closeParentDropdown();
            }

            // По умолчанию все зоны эмитят общий click (как будто клик по title)
            this.$emit('click', event);
            // Раздельное событие эмитится всегда (если обработчик не назначен, Vue его не вызовет)
            this.$emit('click-icon', event);
        },

        // Обработчик клика по тексту
        handleTextClick(event) {
            if (this.disabled) return;

            // Закрываем dropdown при отпускании кнопки мыши
            if (this.autoCloseParent) {
                this.closeParentDropdown();
            }

            // По умолчанию все зоны эмитят общий click (как будто клик по title)
            this.$emit('click', event);
            // Раздельное событие эмитится всегда (если обработчик не назначен, Vue его не вызовет)
            this.$emit('click-text', event);
        },

        // Обработчик клика по суффиксу
        handleSuffixClick(event) {
            if (this.disabled) return;

            // Закрываем dropdown при отпускании кнопки мыши
            if (this.autoCloseParent) {
                this.closeParentDropdown();
            }

            // По умолчанию все зоны эмитят общий click (как будто клик по title)
            this.$emit('click', event);
            // Раздельное событие эмитится всегда (если обработчик не назначен, Vue его не вызовет)
            this.$emit('click-suffix', event);
        },

        // Обработчик ошибки загрузки иконки-изображения
        handleIconError() {
            if (this.fallbackIcon && this.currentIcon !== this.fallbackIcon) {
                this.currentIcon = this.fallbackIcon;
            } else {
                this.imageVisible = false;
            }
        },

        // Обновить Bootstrap tooltips для указанного типа элемента
        updateTouchTooltips(elementType, newTitle) {
            if (!this._touchTooltips || !newTitle) return;

            this.$nextTick(() => {
                this._touchTooltips.forEach(({ element, tooltip, elementType: storedType }) => {
                    if (storedType === elementType && tooltip) {
                        try {
                            tooltip.setContent({ '.tooltip-inner': newTitle });
                            element.setAttribute('data-original-title', newTitle);
                        } catch (error) {
                            console.error('updateTouchTooltips (dropdown): ошибка обновления tooltip', error, element);
                        }
                    }
                });
            });
        },

        /**
         * Инициализация Bootstrap tooltips с поддержкой long press на touch-устройствах
         * Заменяет нативные tooltips (title) на Bootstrap tooltips с manual trigger
         */
        initTouchTooltips() {
            // Определение touch-устройства: проверяем несколько способов
            const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            // Проверка через media query (для DevTools эмуляции)
            const isSmallScreen = window.matchMedia('(max-width: 768px)').matches;
            // Комбинированная проверка: touch support ИЛИ маленький экран (для тестирования в DevTools)
            const isTouch = hasTouchSupport || isSmallScreen;

            if (!isTouch || !window.bootstrap || !window.bootstrap.Tooltip) {
                return;
            }

            const LONG_PRESS_DURATION = 500; // 500ms для long press
            const tooltipElements = [];

            // Находим все элементы с title (иконка, текст, суффикс)
            // Исключаем элементы, которые уже используют Bootstrap tooltips (data-bs-toggle="tooltip")
            const elements = this.$el.querySelectorAll('[title]:not([data-bs-toggle="tooltip"])');

            elements.forEach(element => {
                const title = element.getAttribute('title');
                if (!title) return;

                // Сохраняем title в data-атрибут для восстановления при необходимости
                element.setAttribute('data-original-title', title);
                // Убираем title, чтобы не показывался нативный tooltip
                element.removeAttribute('title');

                // Определяем тип элемента для связи с props
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
                    // Создаём Bootstrap tooltip с manual trigger
                    tooltip = new window.bootstrap.Tooltip(element, {
                        title: title,
                        trigger: 'manual'
                    });

                    tooltipElements.push({ element, tooltip, elementType });
                } catch (error) {
                    console.error('initTouchTooltips (dropdown): ошибка создания tooltip', error);
                    // Восстанавливаем title при ошибке
                    element.setAttribute('title', title);
                    element.removeAttribute('data-original-title');
                    return; // Пропускаем этот элемент, если не удалось создать tooltip
                }

                // Long press обработчики
                let longPressTimer = null;
                let tooltipShown = false; // Флаг, что tooltip был показан

                const handleTouchStart = (e) => {
                    if (!tooltip) {
                        return;
                    }
                    tooltipShown = false; // Сбрасываем флаг при новом touchstart
                    longPressTimer = setTimeout(() => {
                        try {
                            tooltip.show();
                            tooltipShown = true; // Устанавливаем флаг, что tooltip был показан
                        } catch (error) {
                            console.error('initTouchTooltips (dropdown): ошибка показа tooltip', error);
                        }
                    }, LONG_PRESS_DURATION);
                };

                const handleTouchEnd = () => {
                    if (longPressTimer) {
                        clearTimeout(longPressTimer);
                        longPressTimer = null;
                    }
                    // Скрываем tooltip при touchend только если он НЕ был показан (не было long press)
                    // Если tooltip был показан, он останется видимым до клика вне элемента
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

                // Сохраняем обработчики для очистки
                element._touchTooltipHandlers = {
                    touchstart: handleTouchStart,
                    touchend: handleTouchEnd,
                    touchcancel: handleTouchCancel,
                    click: handleClick
                };
            });

            // Сохраняем ссылки для очистки
            this._touchTooltips = tooltipElements;

            // Отслеживание изменений title для обновления Bootstrap tooltips
            if (tooltipElements.length > 0 && !this._titleObserver) {
                this._titleObserver = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.type === 'attributes' && mutation.attributeName === 'title') {
                            const element = mutation.target;
                            const tooltipEntry = tooltipElements.find(entry => entry.element === element);
                            if (tooltipEntry && tooltipEntry.tooltip) {
                                const newTitle = element.getAttribute('title');
                                if (newTitle) {
                                    // Обновляем текст tooltip через Bootstrap API
                                    try {
                                        tooltipEntry.tooltip.setContent({ '.tooltip-inner': newTitle });
                                        // Также обновляем data-original-title для согласованности
                                        element.setAttribute('data-original-title', newTitle);
                                    } catch (error) {
                                        console.error('initTouchTooltips (dropdown): ошибка обновления tooltip', error, element);
                                    }
                                }
                            }
                        }
                    });
                });

                // Наблюдаем за изменениями title на всех элементах
                tooltipElements.forEach(({ element }) => {
                    this._titleObserver.observe(element, {
                        attributes: true,
                        attributeFilter: ['title']
                    });
                });
            }

            // Обработчик клика на document для скрытия всех tooltips при клике вне элемента
            if (tooltipElements.length > 0 && !this._documentClickHandler) {
                this._documentClickHandler = (e) => {
                    // Проверяем, был ли клик вне всех элементов с tooltips
                    const clickedInside = tooltipElements.some(({ element }) => {
                        return element.contains(e.target) || element === e.target;
                    });

                    if (!clickedInside) {
                        // Скрываем все tooltips
                        tooltipElements.forEach(({ tooltip }) => {
                            if (tooltip) {
                                tooltip.hide();
                            }
                        });
                    }
                };

                // Используем capture phase для более раннего перехвата
                document.addEventListener('click', this._documentClickHandler, true);
                document.addEventListener('touchend', this._documentClickHandler, true);
            }
        }
    },

    watch: {
        // Если иконка изменилась в props, обновляем локальное состояние
        icon(newVal) {
            this.currentIcon = newVal;
            this.imageVisible = true; // Сбрасываем видимость при смене иконки
        },
        // Если изменился fallback, тоже сбрасываем состояние, чтобы попробовать загрузить заново
        fallbackIcon(newVal) {
            this.currentIcon = this.icon;
            this.imageVisible = true; // Сбрасываем видимость при смене фолбека
        },
        // Отслеживаем изменения tooltip props и обновляем Bootstrap tooltips
        tooltipIcon(newVal) {
            this.updateTouchTooltips('icon', newVal);
        },
        tooltipText(newVal) {
            this.updateTouchTooltips('text', newVal);
        },
        tooltipSuffix(newVal) {
            this.updateTouchTooltips('suffix', newVal);
        },
        // Отслеживаем изменения suffix
        suffix: {
            handler(newVal) {
                if (this._touchTooltips && newVal) {
                    this.$nextTick(() => {
                        // Обновляем tooltips для элементов суффикса
                        this._touchTooltips.forEach(({ element, tooltip, elementType }) => {
                            if (elementType === 'suffix' && tooltip) {
                                const newTitle = newVal.tooltip || this.tooltipSuffix;
                                const dataOriginalTitle = element.getAttribute('data-original-title') || '';
                                if (newTitle && newTitle !== dataOriginalTitle) {
                                    try {
                                        tooltip.setContent({ '.tooltip-inner': newTitle });
                                        element.setAttribute('data-original-title', newTitle);
                                    } catch (error) {
                                        console.error('watch suffix (dropdown): ошибка обновления tooltip', error, element);
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
        // Инициализация Bootstrap tooltips только для элементов, где соответствующий prop = true
        this.$nextTick(() => {
            if (window.bootstrap && window.bootstrap.Tooltip && this.$el && this.$el.querySelectorAll) {
                const tooltipElements = this.$el.querySelectorAll('[data-bs-toggle="tooltip"]');
                tooltipElements.forEach(element => {
                    new window.bootstrap.Tooltip(element);
                });
            }

            // Инициализация touch tooltips на мобильных устройствах
            this.initTouchTooltips();
        });
    },

    updated() {
        // Обновляем Bootstrap tooltips при изменении title (например, при смене языка)
        if (this._touchTooltips && this._touchTooltips.length > 0) {
            this.$nextTick(() => {
                this._touchTooltips.forEach(({ element, tooltip, elementType }) => {
                    if (!tooltip) return;

                    // Получаем текущий title из props (Vue обновляет title реактивно)
                    let currentTitle = null;
                    if (elementType === 'icon') {
                        currentTitle = this.tooltipIcon;
                    } else if (elementType === 'text') {
                        currentTitle = this.tooltipText;
                    } else if (elementType === 'suffix') {
                        // Для суффикса проверяем suffix prop
                        if (this.suffix) {
                            currentTitle = this.suffix.tooltip || this.tooltipSuffix;
                        } else {
                            currentTitle = this.tooltipSuffix;
                        }
                    }

                    // Обновляем tooltip, если title изменился
                    if (currentTitle) {
                        const dataOriginalTitle = element.getAttribute('data-original-title') || '';
                        if (currentTitle !== dataOriginalTitle) {
                            try {
                                tooltip.setContent({ '.tooltip-inner': currentTitle });
                                element.setAttribute('data-original-title', currentTitle);
                            } catch (error) {
                                console.error('updated (dropdown): ошибка обновления tooltip', error);
                            }
                        }
                    }
                });
            });
        }
    },

    beforeUnmount() {
        // Отключаем MutationObserver
        if (this._titleObserver) {
            this._titleObserver.disconnect();
            this._titleObserver = null;
        }

        // Удаляем обработчик клика на document
        if (this._documentClickHandler) {
            document.removeEventListener('click', this._documentClickHandler, true);
            document.removeEventListener('touchend', this._documentClickHandler, true);
            this._documentClickHandler = null;
        }

        // Очистка touch tooltips
        if (this._touchTooltips) {
            this._touchTooltips.forEach(({ element, tooltip }) => {
                // Удаляем обработчики событий
                if (element._touchTooltipHandlers) {
                    element.removeEventListener('touchstart', element._touchTooltipHandlers.touchstart);
                    element.removeEventListener('touchend', element._touchTooltipHandlers.touchend);
                    element.removeEventListener('touchcancel', element._touchTooltipHandlers.touchcancel);
                    element.removeEventListener('click', element._touchTooltipHandlers.click);
                    delete element._touchTooltipHandlers;
                }

                // Восстанавливаем title из data-original-title
                const originalTitle = element.getAttribute('data-original-title');
                if (originalTitle) {
                    element.setAttribute('title', originalTitle);
                    element.removeAttribute('data-original-title');
                }

                // Уничтожаем Bootstrap tooltip
                if (tooltip) {
                    tooltip.dispose();
                }
            });
            this._touchTooltips = null;
        }

        // Уничтожение Bootstrap tooltips при размонтировании компонента
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

