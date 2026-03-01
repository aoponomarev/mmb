/**
 * ================================================================================================
 * BUTTON COMPONENT - Компонент кнопки
 * ================================================================================================
 *
 * ЦЕЛЬ: Переиспользуемый компонент кнопки с поддержкой иконки, текста, суффикса, вариантов Bootstrap,
 * размеров, состояний, адаптивности и детерминированных хэшей экземпляров.
 *
 * Обработка событий:
 * Структура layout и CSS-классы: см. в шапке шаблона `shared/templates/button-template.js`
 * Bootstrap-совместимость:
 * - Компонент использует классы btn, btn-{variant}, btn-{size} Bootstrap для базовой стилизации
 * - Состояния disabled и loading применяются через атрибут disabled и классы Bootstrap
 * - Поддержка тем Bootstrap через CSS-переменные (var(--bs-body-color), var(--bs-secondary-color) и т.п.)
 * - Полная обратная совместимость: компонент — обёртка над нативной Bootstrap кнопкой, все стандартные классы и атрибуты Bootstrap работают корректно
 * Использование в комплексных компонентах:
 * - Компонент cmp-button может использоваться в других компонентах (например, cmp-dropdown) для кнопок триггеров Bootstrap
 * - Для этого используется prop buttonAttributes с атрибутами Bootstrap (data-bs-toggle, aria-expanded, id, class)
 * - Атрибуты из buttonAttributes передаются на реальный DOM-элемент ⟨button⟩ через v-bind
 * - Bootstrap API работает напрямую с реальным DOM-элементом (не с Vue-компонентом)
 * - Доступ к реальному DOM-элементу через $refs.componentName.$el для инициализации Bootstrap
 * - Классы из buttonAttributes.class объединяются с классами из buttonClasses
 * Подсказки (tooltips):
 * - Нативные подсказки браузера через атрибут title (не Bootstrap Tooltip)
 * - Не требуют инициализации и уничтожения — работают автоматически через браузер
 * - Раздельные подсказки для иконки (tooltipIcon), текста (tooltipText) и каждого элемента суффикса (если suffix — массив, каждый элемент может иметь свой tooltip)
 * Обработка событий:
 * - По умолчанию все зоны (иконка, текст, суффикс) эмитят общее событие 'click'
 * - Раздельные события (click-icon, click-text, click-suffix) эмитятся всегда при клике на соответствующую зону
 * - Обработчики событий используют .stop для предотвращения всплытия
 * Множественные суффиксы:
 * - suffix может быть массивом элементов для поддержки нескольких badge/icon/indicator одновременно
 * - Каждый элемент массива может иметь свой tooltip
 * Анимация chevron:
 * - Анимация chevron через Font Awesome классы (fa-rotate-90) + inline transition (единственное исключение из запрета inline-стилей)
 *
 * API КОМПОНЕНТА:
 *
 * Входные параметры (props):
 * - label (String) — текст кнопки (отображается на десктопе, если задана иконка или укороченный текст)
 * - labelShort (String) — укороченная версия текста для мобильных (используется, если icon не задан)
 * - icon (String) — CSS класс иконки слева (Font Awesome, Material Symbols)
 * - suffix (Object | Array) — суффикс справа. Может быть одиночным объектом или массивом элементов. Формат элемента:
 *   { type: 'badge'|'icon'|'indicator'|'chevron'|'info', value: String|Number, variant: String, expanded: Boolean, tooltip: String }
 * - tooltipIcon (String) — всплывающая подсказка для иконки слева
 * - tooltipText (String) — всплывающая подсказка для текстовой области
 * - tooltipSuffix (String) — всплывающая подсказка для суффикса (приоритет над suffix.tooltip, работает только для одиночного suffix)
 * - variant (String, default: 'primary') — вариант Bootstrap: 'primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark', 'outline-*', 'link'
 * - size (String) — размер кнопки: 'sm', 'lg' или null (по умолчанию)
 * - disabled (Boolean) — отключённое состояние кнопки
 * - loading (Boolean) — состояние загрузки (показывает спиннер вместо иконки/текста)
 * - type (String, default: 'button') — тип кнопки: 'button', 'submit', 'reset'
 * - iconOpacity (Number, default: 1) — прозрачность иконки слева (0-1)
 * - buttonId (String) — идентификатор экземпляра для генерации детерминированного хэша (instanceHash)
 * - classesAdd (Object, default: {}) — классы для добавления на различные элементы компонента. Структура: { root: 'классы', icon: 'классы', label: 'классы', suffix: 'классы' }
 * - classesRemove (Object, default: {}) — классы для удаления с различных элементов компонента. Структура: { root: 'классы', icon: 'классы', label: 'классы', suffix: 'классы' }
 * - buttonAttributes (Object, default: {}) — произвольные атрибуты для передачи на корневой <button> элемент. Используется для интеграции с Bootstrap API (dropdown, modal и т.д.)
 *
 * Выходные события (emits):
 * - click — общее событие клика по кнопке (эмитится всегда при клике на любую зону)
 * - click-icon — клик по иконке слева (эмитится вместе с click)
 * - click-text — клик по текстовой области (эмитится вместе с click)
 * - click-suffix — клик по элементу суффикса (эмитится вместе с click, передаёт элемент суффикса как второй аргумент)
 *
 * Примечание: Все зоны (иконка, текст, суффикс) эмитят общее событие click по умолчанию. Раздельные события (click-icon, click-text, click-suffix) срабатывают только если назначены явно в родительском компоненте.
 *
 * ССЫЛКИ:
 * - Общие принципы работы с компонентами: a/skills/app/skills/components/components-ssot.md
 * - Адаптивность: a/skills/app/skills/components/components-responsive-visibility.md
 * - Выравнивание высоты: a/skills/app/skills/components/components-layout-alignment.md
 * - Детерминированные хэши: a/skills/app/skills/architecture/architecture-core-stack.md
 * - Шаблон: shared/templates/button-template.js
 */

window.cmpButton = {
    template: '#button-template',

    props: {
        // === Текст кнопки ===
        label: {
            type: String,
            default: null
        },
        labelShort: {
            type: String,
            default: null // укороченная версия текста для мобильных (если нет иконки)
        },

        // === Опциональные ===
        icon: {
            type: String,
            default: null
        },

        // === Суффикс (правый элемент) - может быть объектом или массивом ===
        suffix: {
            type: [Object, Array],
            default: null,
            validator: (value) => {
                if (!value) return true;
                // Если массив - проверяем каждый элемент
                if (Array.isArray(value)) {
                    return value.every(item => {
                        const validTypes = ['badge', 'icon', 'indicator', 'chevron', 'info'];
                        return validTypes.includes(item.type) && item.value;
                    });
                }
                // Если объект - проверяем как одиночный элемент
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
        tooltip: {
            type: String,
            default: null
        },

        // === Bootstrap варианты и размеры ===
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

        // === Состояния ===
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
        }, // Для instanceHash (идентификация экземпляра)

        // === Произвольные атрибуты для использования в комплексных компонентах ===
        buttonAttributes: {
            type: Object,
            default: () => ({})
            // Пример: { 'data-bs-toggle': 'dropdown', 'aria-expanded': false, 'id': 'dropdown-button', 'class': 'dropdown-toggle' }
            // Используется для передачи data-атрибутов, aria-атрибутов и дополнительных классов
            // для интеграции с Bootstrap API (dropdown, modal и т.д.)
        },

        // === Стилизация ===
        iconOpacity: {
            type: Number,
            default: 1,
            validator: (value) => value >= 0 && value <= 1
        },

        // === Управление классами ===
        classesAdd: {
            type: Object,
            default: () => ({})
            // Пример: { root: 'float-start', icon: 'custom-icon', label: 'custom-label', suffix: 'hide-suffix' }
        },
        classesRemove: {
            type: Object,
            default: () => ({})
            // Пример: { root: 'some-class', icon: 'another-class' }
        }

    },

    emits: ['click', 'click-icon', 'click-text', 'click-suffix'],

    computed: {
        // Нормализация suffix в массив
        suffixArray() {
            const baseSuffix = this.suffix ? (Array.isArray(this.suffix) ? this.suffix : [this.suffix]) : [];

            // УДАЛЕНО: Автоматическое добавление chevron для dropdown-toggle
            // Теперь используем стандартный Bootstrap треугольник через CSS псевдоэлемент ::after
            // (идентично combobox)

            return baseSuffix;
        },

        // CSS классы для корневого элемента (root)
        buttonClasses() {
            const baseClasses = ['btn', 'btn-responsive', this.instanceHash];

            // Условные классы для адаптивности
            if (this.icon) baseClasses.push('has-icon');
            if (this.labelShort) baseClasses.push('has-label-short');

            // Если disabled и не loading - используем нейтральные цвета (кроме variant='link')
            if (this.disabled && !this.loading && this.variant !== 'link') {
                baseClasses.push('btn-secondary', 'text-secondary', 'bg-secondary', 'bg-opacity-10', 'border-secondary');
            } else {
                // Обычный вариант из темы (или link для иконочных кнопок в header)
                baseClasses.push(`btn-${this.variant}`);
            }

            if (this.size) baseClasses.push(`btn-${this.size}`);
            if (this.disabled) baseClasses.push('disabled');

            // Добавить дополнительные классы из buttonAttributes (если есть)
            if (this.buttonAttributes.class) {
                const extraClasses = Array.isArray(this.buttonAttributes.class)
                    ? this.buttonAttributes.class
                    : this.buttonAttributes.class.split(' ').filter(c => c);
                baseClasses.push(...extraClasses);
            }

            // Управление классами через classesAdd и classesRemove
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

        // CSS классы для обертки иконки (icon)
        iconClasses() {
            // Flexbox для центрирования иконки внутри квадратной обертки
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

        // CSS классы для обертки текста (label)
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

        // CSS классы для обертки суффиксов (suffix)
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

        // Атрибуты для передачи на корневой элемент (исключая class, который обрабатывается отдельно)
        buttonAttrs() {
            const attrs = { ...this.buttonAttributes };
            // Удаляем class из копии, так как он обрабатывается в buttonClasses
            delete attrs.class;
            return attrs;
        },

        // CSS классы для внутреннего контейнера
        // ВАЖНО: Вертикальный padding (py-*) управляется через CSS в зависимости от размера кнопки
        // Горизонтальный padding (px-2) задан по умолчанию, может быть переопределен через classesAdd.container
        // ВАЖНО: gap НЕ используется, так как flexbox gap применяется между ВСЕМИ дочерними элементами,
        // даже если они скрыты через visibility:hidden или имеют width:0. Это вызывает смещение иконки.
        // Отступы между элементами управляются через CSS для дочерних элементов.
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

        // Детерминированный хэш экземпляра на основе родительского контекста и props
        // Стабилен между сессиями - один и тот же контекст + идентификатор всегда дает один и тот же хэш
        instanceHash() {
            if (!window.hashGenerator) {
                console.warn('hashGenerator not found, using fallback');
                return 'avto-00000000';
            }

            // Родительский контекст (стабильный маркер родителя)
            const parentContext = this.getParentContext();

            // Идентификатор экземпляра из props
            const instanceId = this.buttonId || this.label || this.icon || 'button';

            // Комбинация для уникальности
            const uniqueId = `${parentContext}:${instanceId}`;
            return window.hashGenerator.generateMarkupClass(uniqueId);
        }
    },

    watch: {
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
        // Отслеживаем изменения suffix (может быть массивом)
        suffix: {
            handler(newVal) {
                if (this._touchTooltips) {
                    this.$nextTick(() => {
                        // Обновляем tooltips для элементов суффикса
                        this._touchTooltips.forEach(({ element, tooltip, elementType }) => {
                            if (elementType === 'suffix' && tooltip) {
                                // Для суффикса нужно найти соответствующий элемент в массиве
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
                                        console.error('watch suffix: ошибка обновления tooltip', error, element);
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
                            console.error('updateTouchTooltips: ошибка обновления tooltip', error, element);
                        }
                    }
                });
            });
        },

        // Получить родительский контекст (класс avto-* или ID родителя)
        // Вызывается из computed, поэтому $el может быть еще не доступен
        getParentContext() {
            // Проверяем доступность DOM элемента
            if (!this.$el) {
                return 'root';
            }

            // Проверяем наличие родителя
            if (!this.$el.parentElement) {
                return 'root';
            }

            // Ищем родительский элемент с классом avto-* или ID
            let parent = this.$el.parentElement;
            let depth = 0;
            const maxDepth = 5; // Ограничение глубины поиска

            while (parent && depth < maxDepth) {
                // Проверяем классы avto-*
                const avtoClass = Array.from(parent.classList).find(cls => cls.startsWith('avto-'));
                if (avtoClass) {
                    return avtoClass;
                }

                // Проверяем ID
                if (parent.id) {
                    return `#${parent.id}`;
                }

                parent = parent.parentElement;
                depth++;
            }

            return 'root'; // fallback
        },

        // Обработчик клика по кнопке
        handleClick(event) {
            if (this.disabled || this.loading) return;
            this.$emit('click', event);
        },

        // Обработчик клика по иконке
        handleIconClick(event) {
            if (this.disabled || this.loading) return;
            this.$emit('click', event);
            this.$emit('click-icon', event);
        },

        // Обработчик клика по тексту
        handleTextClick(event) {
            if (this.disabled || this.loading) return;
            this.$emit('click', event);
            this.$emit('click-text', event);
        },

        // Обработчик клика по элементу суффикса
        handleSuffixClick(event, item) {
            if (this.disabled || this.loading) return;
            this.$emit('click', event);
            this.$emit('click-suffix', event, item);
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
            const elements = this.$el.querySelectorAll('[title]');

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
                } else if (element.classList.contains('text-nowrap') || element.classList.contains('label')) {
                    elementType = 'text';
                } else if (element.classList.contains('badge') || element.classList.contains('suffix-container') || element.closest('.suffix-container')) {
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
                    console.error('initTouchTooltips: ошибка создания tooltip', error);
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
                            console.error('initTouchTooltips: ошибка показа tooltip', error);
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

    mounted() {
        // Инициализация touch tooltips на мобильных устройствах
        this.$nextTick(() => {
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

                    // Обновляем tooltip, если title изменился
                    if (currentTitle) {
                        const dataOriginalTitle = element.getAttribute('data-original-title') || '';
                        if (currentTitle !== dataOriginalTitle) {
                            try {
                                tooltip.setContent({ '.tooltip-inner': currentTitle });
                                element.setAttribute('data-original-title', currentTitle);
                            } catch (error) {
                                console.error('updated: ошибка обновления tooltip', error);
                            }
                        }
                    }
                });
            });
        }
    },

    beforeUnmount() {
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
    }
};

