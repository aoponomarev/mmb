/**
 * ================================================================================================
 * BUTTON GROUP COMPONENT - Компонент группы кнопок
 * ================================================================================================
 *
 * PURPOSE: Vue-обёртка над Bootstrap .btn-group с поддержкой:
 *
 * @skill-anchor id:sk-add9a6 #for-classes-add-remove
 * @skill-anchor id:sk-eeb23d #for-bootstrap-event-proxying
 * @skill-anchor id:sk-cb75ec #for-utility-availability-check
 * - Трёх типов кнопок: button (через cmp-button), checkbox, radio (нативный HTML)
 * - Наследования стилей (variant, size) от группы к кнопкам
 * - Адаптивного схлопывания в dropdown при брейкпоинте
 * - 100% совместимости with Bootstrap JS API
 *
 * Configuration кнопок:
 * - Двойной рендер: группа кнопок (>= breakpoint) и dropdown (< breakpoint)
 * - CSS-переключение через Bootstrap utilities (d-none, d-md-inline-flex)
 * - Маппинг buttons[] в DropdownMenuItem при схлопывании
 * - Синхронизация событий между кнопками и пунктами меню
 * - Детерминированные хэши экземпляров (instanceHash)
 *
 * API КОМПОНЕНТА:
 *
 * Входные параметры (props):
 * Базовые свойства группы:
 * - size (String) — размер группы: 'sm', 'lg' или '' (по умолчанию). Применяется ко всем кнопкам, если не переопределено в конфигурации кнопки
 * - variant (String, default: 'secondary') — базовый вариант Bootstrap for всех кнопок. Если кнопка не имеет собственного variant, наследует от группы
 * - vertical (Boolean, default: false) — вертикальная ориентация группы (добавляет класс btn-group-vertical)
 * - verticalBreakpoint (String) — адаптивная вертикальная ориентация: 'sm' (576px). На мобильных (< 576px) группа отображается вертикально, на десктопе (>= 576px) — горизонтально
 * - role (String, default: 'group') — ARIA-роль группы
 * - ariaLabel (String) — ARIA-метка for группы
 * - classesAdd (Object, default: {}) — классы for добавления на различные элементы компонента. Структура: { root: 'классы', dropdown: 'классы', dropdownButton: 'классы', dropdownMenu: 'классы' }
 * - classesRemove (Object, default: {}) — классы for удаления с различных элементов компонента. Структура: { root: 'классы', dropdown: 'классы', dropdownButton: 'классы', dropdownMenu: 'классы' }
 * Responsiveness (схлопывание в dropdown):
 * - collapseBreakpoint (String) — брейкпоинт for схлопывания группы в dropdown: 'sm', 'md', 'lg', 'xl', 'xxl'. Если не указан, группа всегда отображается как группа кнопок
 * - dropdownLabel (String, default: 'Действия') — текст кнопки dropdown при схлопывании
 * - dropdownIcon (String) — иконка кнопки dropdown (Font Awesome класс)
 * - dropdownVariant (String) — вариант кнопки dropdown. Если не указан, наследует от variant группы
 * Configuration кнопок:
 * - buttons (Array, required) — массив конфигураций кнопок. Каждый элемент — объект ButtonConfig:
 *   ButtonConfig:
 *   - type (String, required) — тип кнопки: 'button', 'checkbox' или 'radio'
 *   - label (String) — текст кнопки (for всех типов)
 *   - labelShort (String) — укороченная версия текста for мобильных (только for type="button")
 *   - icon (String) — CSS класс иконки (Font Awesome, Material Symbols)
 *   - variant (String) — вариант Bootstrap (переопределяет групповой)
 *   - size (String) — размер кнопки (переопределяет групповой)
 *   - disabled (Boolean) — отключённое состояние
 *   - loading (Boolean) — состояние загрузки (только for type="button")
 *   - active (Boolean) — активное состояние (for checkbox/radio)
 *   - suffix (Object | Array) — суффикс справа (только for type="button"). Формат аналогичен cmp-button
 *   - tooltip (String) — общая подсказка
 *   - tooltipIcon (String) — подсказка for иконки (только for type="button")
 *   - tooltipText (String) — подсказка for текста (только for type="button")
 *   - tooltipSuffix (String) — подсказка for суффикса (только for type="button")
 *   - [key: data-bs-${string}] (any) — произвольные Bootstrap data-атрибуты for прозрачности JS API
 *   - [key: string] (any) — любые другие атрибуты
 *
 * Logoutные события (emits):
 * - button-click — клик по кнопке (type="button"). Параметры: (event, { button, index, type })
 * - button-click-icon — клик по иконке кнопки (type="button"). Параметры: (event, { button, index, type })
 * - button-click-text — клик по тексту кнопки (type="button"). Параметры: (event, { button, index, type })
 * - button-click-suffix — клик по суффиксу кнопки (type="button"). Параметры: (event, { button, index, type })
 * - button-change — изменение состояния checkbox/radio. Параметры: (event, { button, index, active, type })
 * - button-toggle — переключение состояния checkbox/radio. Параметры: ({ button, index, active, type })
 *
 * Слоты:
 * - default — содержимое кнопок (fallback for кастомных кнопок)
 * - button-{index} — переопределение конкретной кнопки по индексу. Параметры слота: { button, index }
 *
 * Базовые свойства группы:
 * Структура layout и CSS-классы: см. в шапке шаблона `shared/templates/button-group-template.js`
 * Использование компонента cmp-button for type="button":
 * - Все пропсы cmp-button поддерживаются через ButtonConfig
 * - Responsiveness через CSS классы .btn-responsive работает автоматически
 * - Suffix и tooltips поддерживаются полностью
 * Наследование стилей:
 * - Компонент поддерживает наследование variant и size от группы к кнопкам
 * - Если кнопка не имеет собственного variant, наследует от variant группы
 * - Если кнопка не имеет собственного size, наследует от size группы
 * - Кнопка может переопределить групповые стили, указав собственные variant или size
 * Маппинг данных при схлопывании:
 * - Маппинг ButtonConfig → DropdownMenuItem: label → title, icon → icon, suffix → suffix, type="checkbox/radio" + active → active: true, disabled → disabled, tooltip → tooltipText
 * Синхронизация состояния:
 * - Компонент использует внутреннее состояние buttonStates for синхронизации
 * - При создании компонента состояние инициализируется из props
 * - При изменении checkbox/radio состояние обновляется в buttonStates
 * - Для radio автоматически сбрасываются все остальные radio в группе при выборе
 * - Состояние синхронизируется с dropdown при схлопывании
 * - События синхронизируются между кнопками и пунктами меню
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
        // === Базовые свойства группы ===
        size: {
            type: String,
            default: '',
            validator: (value) => !value || ['sm', 'lg'].includes(value)
        },
        variant: {
            type: String,
            default: 'secondary' // базовый variant for всех кнопок
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
        // === Управление классами ===
        classesAdd: {
            type: Object,
            default: () => ({})
            // Пример: { root: 'custom-root', dropdown: 'custom-dropdown' }
        },
        classesRemove: {
            type: Object,
            default: () => ({})
            // Пример: { root: 'some-class', dropdown: 'another-class' }
        },

        // === Responsiveness (схлопывание в dropdown) ===
        collapseBreakpoint: {
            type: String,
            default: null,
            validator: (value) => !value || ['sm', 'md', 'lg', 'xl', 'xxl'].includes(value)
        },
        dropdownLabel: {
            type: String,
            default: 'Действия'
        },
        dropdownIcon: {
            type: String,
            default: null
        },
        dropdownVariant: {
            type: String,
            default: null // если не указан, наследует от variant группы
        },
        dropdownSize: {
            type: String,
            default: null, // если не указан, наследует от size группы
            validator: (value) => !value || ['sm', 'lg'].includes(value)
        },
        dropdownDynamicLabel: {
            type: Boolean,
            default: false // если true, показывает текст активной кнопки
        },
        dropdownDynamicLabelShort: {
            type: Boolean,
            default: false // если true, показывает укороченный текст активной кнопки
        },
        dropdownMenuStyle: {
            type: Object,
            default: () => ({})
        },
        tooltip: {
            type: String,
            default: null
        },

        // === Configuration кнопок ===
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
            buttonStates: [] // состояние кнопок (for checkbox/radio)
        };
    },

    created() {
        // Генерируем уникальный ID for группы при создании компонента
        this._groupId = `btn-group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Инициализируем внутреннее состояние кнопок из props
        this.buttonStates = this.buttons.map((btn, index) => ({
            ...btn,
            active: btn.active || false
        }));
    },

    watch: {
        // Синхронизируем внутреннее состояние при изменении props
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
        // CSS классы for группы кнопок
        groupClasses() {
            const baseClasses = ['btn-group'];
            if (this.size) baseClasses.push(`btn-group-${this.size}`);

            // Проверяем, есть ли адаптивный класс for вертикальной ориентации в classesAdd.root
            const classesAddRoot = this.classesAdd?.root;
            const hasAdaptiveVertical = classesAddRoot && (
                (typeof classesAddRoot === 'string' && classesAddRoot.includes('btn-group-responsive-vertical')) ||
                (Array.isArray(classesAddRoot) && classesAddRoot.some(c => typeof c === 'string' && c.includes('btn-group-responsive-vertical')))
            );

            // Если задан verticalBreakpoint, автоматически добавляем адаптивный класс
            if (this.verticalBreakpoint && !hasAdaptiveVertical) {
                baseClasses.push(`btn-group-responsive-vertical-${this.verticalBreakpoint}`);
            }

            // Добавляем btn-group-vertical только если vertical=true И нет адаптивного класса
            if (this.vertical && !hasAdaptiveVertical && !this.verticalBreakpoint) {
                baseClasses.push('btn-group-vertical');
            }

            if (this.instanceHash) baseClasses.push(this.instanceHash);

            // Классы видимости for адаптивного схлопывания
            if (this.collapseBreakpoint) {
                baseClasses.push(`d-none`, `d-${this.collapseBreakpoint}-inline-flex`);
            }

            // Управление классами через classesAdd и classesRemove
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

        // Атрибуты for группы
        groupAttrs() {
            return {
                role: this.role,
                'aria-label': this.ariaLabel || undefined
            };
        },

        // Классы for dropdown (for передачи в cmp-dropdown)
        dropdownClassesForGroup() {
            // ВАЖНО: Возвращаем объект с undefined вместо пропуска свойств
            // Это обеспечивает стабильную структуру объекта for Vue реактивности
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

        // Классы for dropdown контейнера
        dropdownClasses() {
            if (!this.collapseBreakpoint) return '';
            return `d-${this.collapseBreakpoint}-none`;
        },

        // Детерминированный хэш экземпляра
        instanceHash() {
            if (!window.hashGenerator) {
                console.warn('hashGenerator not found, using fallback');
                return 'avto-00000000';
            }

            const parentContext = this.getParentContext();
            const instanceId = this.ariaLabel || 'button-group';
            return window.hashGenerator.generateMarkupClass(`${parentContext}:${instanceId}`);
        },

        // Маппинг buttons в menuItems for dropdown
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
                // Сохраняем оригинальные данные for событий
                _originalButton: btn,
                _originalIndex: index
            }));

            return items;
        },

        // Variant for dropdown кнопки
        computedDropdownVariant() {
            return this.dropdownVariant || this.variant;
        },

        // Size for dropdown кнопки
        computedDropdownSize() {
            return this.dropdownSize || this.size;
        },

        // Текст for dropdown кнопки
        computedDropdownLabel() {
            if (this.dropdownDynamicLabel) {
                const activeBtn = this.buttonStates.find(btn => btn.active && (btn.type === 'radio' || btn.type === 'checkbox'));
                if (activeBtn) {
                    return activeBtn.label || activeBtn.labelShort || this.dropdownLabel;
                }
            }
            return this.dropdownLabel;
        },

        // Укороченный текст for dropdown кнопки
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
        // Get родительский контекст (класс avto-* или ID родителя)
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

        // Утилита for исключения свойств из объекта
        omit(obj, keys) {
            const result = { ...obj };
            keys.forEach(key => delete result[key]);
            return result;
        },

        // Генерация уникального ID for checkbox/radio
        getButtonId(index) {
            return `${this._groupId}-${index}`;
        },

        // Имя for radio группы
        getRadioName() {
            return `${this._groupId}-radio`;
        },

        // Обработчик клика по кнопке (type="button")
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

        // Обработчик изменения checkbox/radio
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

            // Обновляем внутреннее состояние
            state.active = newActive;

            // Для radio: сбрасываем все остальные radio в группе
            if (state.type === 'radio' && newActive) {
                this.buttonStates.forEach((s, i) => {
                    if (i !== index && s.type === 'radio') {
                        s.active = false;
                    }
                });
            }

            // Консистентный порядок эмиссии: button-change → button-toggle
            this.$emit('button-change', event, { button: state, index, active: newActive, type: state.type });
            this.$emit('button-toggle', { button: state, index, active: newActive, type: state.type });
        },

        // Обработчик клика по пункту меню (при схлопывании)
        handleMenuClick(menuItem) {
            const { _originalButton: button, _originalIndex: index } = menuItem;
            const state = this.buttonStates[index] || button;

            if (state.type === 'checkbox') {
                // Эмулируем переключение checkbox
                const newActive = !state.active;
                state.active = newActive;

                // Консистентный порядок эмиссии: button-change → button-toggle
                this.$emit('button-change', new Event('change'), { button: state, index, active: newActive, type: state.type });
                this.$emit('button-toggle', { button: state, index, active: newActive, type: state.type });
            } else if (state.type === 'radio') {
                // Для radio: если уже активна, ничего не делаем (radio нельзя деактивировать кликом)
                // Если неактивна, активируем её и деактивируем все остальные radio в группе
                if (!state.active) {
                    state.active = true;

                    // Сбрасываем все остальные radio в группе
                    this.buttonStates.forEach((s, i) => {
                        if (i !== index && s.type === 'radio') {
                            s.active = false;
                        }
                    });

                    // Консистентный порядок эмиссии: button-change → button-toggle
                    this.$emit('button-change', new Event('change'), { button: state, index, active: true, type: state.type });
                    this.$emit('button-toggle', { button: state, index, active: true, type: state.type });
                }
                // Если radio уже активна, ничего не делаем (стандартное поведение radio)
            } else {
                // Эмулируем клик по кнопке
                this.$emit('button-click', new Event('click'), { button: state, index, type: state.type });
            }
        }
    },

    mounted() {
        // Инициализация Bootstrap Button for action-кнопок (если нужно)
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

