// =========================
// КОМПОНЕНТ COMBOBOX
// Vue-обёртка над Bootstrap input-group + dropdown с поддержкой автодополнения
// =========================
// ЦЕЛЬ: Переиспользуемый компонент комбобокса с поддержкой:
// - Автодополнения и фильтрации
// - Клавиатурной навигации
// - Выбора значения из списка
// - Произвольного ввода
// - Группировки элементов
// - Валидации
// - Полной совместимости с Bootstrap JS API
// - Переключения в режим простого текстового поля
// - Структура для: подсветки найденного текста, виртуального скроллинга, множественного выбора
//
// ПРИНЦИПЫ:
// - Максимальная совместимость с Bootstrap JS API (обязательное требование)
// - Использование только Bootstrap классов (запрет кастомных стилей, кроме CSS для крестика)
// - Инициализация Bootstrap Dropdown через JavaScript API
// - Подписка на события Bootstrap (show.bs.dropdown, hide.bs.dropdown)
// - Программный доступ к Bootstrap API через ref
// - Поддержка тем Bootstrap через CSS-переменные
//
// API КОМПОНЕНТА:
//
// Входные параметры (props):
// Базовые:
// - modelValue (String | Array) — значение компонента (v-model). Для множественного выбора — массив значений
// - items (Array) — массив элементов для выбора. Может быть массивом строк или объектов с полями label, value, id
// - placeholder (String, default: 'Выберите или введите...') — плейсхолдер для поля ввода
// Режимы:
// - mode (String, default: 'combobox') — режим работы: 'combobox' (комбобокс) или 'input' (простое текстовое поле)
// - multiple (Boolean, default: false) — режим множественного выбора (структура заложена для будущей реализации)
// Поведение:
// - allowCustom (Boolean, default: true) — разрешить произвольный ввод (не только из списка)
// - strict (Boolean, default: false) — только значения из списка (запрет произвольного ввода)
// - autocomplete (Boolean, default: true) — включить автодополнение и фильтрацию
// - clearable (Boolean, default: true) — показывать крестик для очистки (реализовано через CSS псевдоэлемент ::before)
// Фильтрация и поиск:
// - filterFunction (Function, default: null) — кастомная функция фильтрации (items, query) => filteredItems
// - debounce (Number, default: 300) — задержка для debounce поиска (мс)
// - highlightMatches (Boolean, default: false) — подсветка найденного текста (структура заложена для будущей реализации)
// - itemLabel (String | Function, default: null) — поле для label или функция получения label
// - itemValue (String | Function, default: null) — поле для value или функция получения value
// Прокрутка:
// - scrollable (Boolean, default: false) — включить прокрутку для длинных списков
// - maxHeight (String, default: '300px') — максимальная высота прокручиваемой области
// - virtualScrolling (Boolean, default: false) — виртуальный скроллинг (структура заложена для будущей реализации)
// - virtualItemHeight (Number, default: 38) — высота элемента для виртуального скроллинга (px)
// Группировка:
// - groupBy (String | Function, default: null) — поле для группировки или функция (структура заложена для будущей реализации)
// Валидация:
// - required (Boolean, default: false) — обязательное поле
// - pattern (String, default: null) — паттерн для валидации (HTML5)
// - disabled (Boolean, default: false) — отключить компонент
// UI:
// - size (String, default: null) — размер: 'sm' или 'lg'
// - variant (String, default: 'outline-secondary') — вариант кнопки dropdown (Bootstrap button variants)
// - icon (String, default: null) — иконка слева (Font Awesome класс)
// Дополнительные:
// - classesAdd (Object, default: {}) — классы для добавления на различные элементы компонента. Структура: { root: 'классы', menu: 'классы' }
// - classesRemove (Object, default: {}) — классы для удаления с различных элементов компонента. Структура: { root: 'классы', menu: 'классы' }
// - menuClasses (String, default: '') — дополнительные классы для dropdown-menu (для обратной совместимости, рекомендуется использовать classesAdd.menu)
// - menuStyle (Object, default: {}) — дополнительные стили для dropdown-menu
// - dropdownId (String, default: null) — ID для кнопки dropdown (для Bootstrap)
// - emptySearchText (String, default: 'Ничего не найдено') — текст при пустом результате поиска
//
// Выходные события (emits):
// - update:modelValue — обновление значения (v-model)
// - select — выбор элемента: { value, label, item }
// - input — ввод текста: value
// - focus — фокус на поле ввода
// - blur — потеря фокуса
// - clear — очистка значения
// - show — открытие dropdown
// - hide — закрытие dropdown
//
// Методы (через ref):
// - show() — программное открытие dropdown
// - hide() — программное закрытие dropdown
// - toggle() — программное переключение dropdown
// - getBootstrapInstance() — получение экземпляра Bootstrap Dropdown для прямого доступа к API
//
// Клавиатурная навигация:
// Структура layout и CSS-классы: см. в шапке шаблона `shared/templates/combobox-template.js`
// Клавиатурная навигация:
// - ArrowDown / ArrowUp — навигация по элементам
// - Enter — выбор элемента или принятие произвольного значения
// - Escape — закрытие dropdown
// - Tab — закрытие dropdown при переходе
// Структура для будущих расширений:
// - Подсветка найденного текста: метод highlightItemText(), computed highlightText, слот item с highlightedText
// - Виртуальный скроллинг: computed visibleItems, virtualVisibleItems, обработчик handleScroll(), props virtualScrolling, virtualItemHeight
// - Множественный выбор: prop multiple, логика в handleItemSelect(), computed isMultiple
// - Группировка: prop groupBy, структура в шаблоне
//
// АРХИТЕКТУРА:
// - Шаблон: shared/templates/combobox-template.js (ID: combobox-template)
// - Зависимости: Bootstrap 5, Font Awesome 6, Vue.js
// - См. также: app/skills/ux-principles

window.cmpCombobox = {
    template: '#combobox-template',

    props: {
        // === Базовые ===
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

        // === Режимы ===
        mode: {
            type: String,
            default: 'combobox', // 'combobox' | 'input'
            validator: (value) => ['combobox', 'input'].includes(value)
        },
        multiple: {
            type: Boolean,
            default: false
        },

        // === Поведение ===
        allowCustom: {
            type: Boolean,
            default: true // разрешить произвольный ввод
        },
        strict: {
            type: Boolean,
            default: false // только значения из списка
        },
        autocomplete: {
            type: Boolean,
            default: true // автодополнение
        },
        clearable: {
            type: Boolean,
            default: true // показывать крестик для очистки
        },

        // === Фильтрация и поиск ===
        filterFunction: {
            type: Function,
            default: null // кастомная функция фильтрации
        },
        debounce: {
            type: Number,
            default: 300 // задержка для debounce (мс)
        },
        highlightMatches: {
            type: Boolean,
            default: false // подсветка найденного текста (структура заложена)
        },
        itemLabel: {
            type: [String, Function],
            default: null // поле для label или функция получения label
        },
        itemValue: {
            type: [String, Function],
            default: null // поле для value или функция получения value
        },

        // === Прокрутка ===
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
            default: false // виртуальный скроллинг (структура заложена)
        },
        virtualItemHeight: {
            type: Number,
            default: 38 // высота элемента для виртуального скроллинга (px)
        },

        // === Группировка ===
        groupBy: {
            type: [String, Function],
            default: null // поле для группировки или функция (структура заложена)
        },

        // === Валидация ===
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
        // Тип инпута (text | number и т.п.)
        inputType: {
            type: String,
            default: 'text'
        },
        // Стили для инпута (например, maxWidth для компактного режима)
        inputStyle: {
            type: Object,
            default: () => ({})
        },
        // Минимальное значение для number input
        inputMin: {
            type: [Number, String],
            default: null
        },
        // Максимальное значение для number input
        inputMax: {
            type: [Number, String],
            default: null
        },
        // Шаг для number input
        inputStep: {
            type: [Number, String],
            default: null
        },

        // === Управление классами ===
        classesAdd: {
            type: Object,
            default: () => ({})
            // Пример: { root: 'custom-root', menu: 'custom-menu' }
        },
        classesRemove: {
            type: Object,
            default: () => ({})
            // Пример: { root: 'some-class', menu: 'another-class' }
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
            selectedIndex: -1, // индекс выбранного элемента для клавиатурной навигации
            dropdownInstance: null,
            debounceTimer: null,
            scrollTop: 0, // для виртуального скроллинга
            virtualStartIndex: 0, // для виртуального скроллинга
            virtualEndIndex: 0 // для виртуального скроллинга
        };
    },

    computed: {
        // Определение режима множественного выбора
        isMultiple() {
            return this.multiple || Array.isArray(this.modelValue);
        },

        // Отображаемое значение в input
        displayValue() {
            if (this.isMultiple) {
                // Для множественного выбора показываем поисковый запрос или пусто
                return this.searchQuery;
            }
            // Для одиночного выбора: если есть выбранное значение, показываем его label, иначе поисковый запрос
            if (this.modelValue && !this.searchQuery) {
                // Находим выбранный элемент и показываем его label
                const selectedItem = this.items.find(item => this.getItemValue(item) === this.modelValue);
                if (selectedItem) {
                    return this.getItemLabel(selectedItem);
                }
                return this.modelValue; // Если не нашли в списке, показываем значение как есть
            }
            return this.searchQuery || '';
        },

        // CSS классы для input-group
        inputGroupClasses() {
            const baseClasses = [];
            if (this.size) baseClasses.push(`input-group-${this.size}`);

            // Управление классами через classesAdd и classesRemove
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

        // CSS классы для режима input
        inputModeClasses() {
            const baseClasses = ['position-relative'];

            // Управление классами через classesAdd и classesRemove
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

        // CSS классы для выпадающего меню
        menuClassesComputed() {
            const baseClasses = ['dropdown-menu', 'dropdown-menu-end'];

            // Добавляем классы из prop menuClasses (для обратной совместимости)
            if (this.menuClasses) {
                const extraClasses = this.menuClasses.split(' ').filter(c => c);
                baseClasses.push(...extraClasses);
            }

            // Управление классами через classesAdd и classesRemove
            if (!window.classManager) {
                return baseClasses.join(' ');
            }

            return window.classManager.processClassesToString(
                baseClasses,
                this.classesAdd?.menu,
                this.classesRemove?.menu
            );
        },

        // CSS классы для input
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

        // Стили для прокручиваемой области
        scrollableStyle() {
            return {
                maxHeight: this.maxHeight,
                overflowY: 'auto',
                ...this.menuStyle
            };
        },

        // Отфильтрованные элементы
        filteredItems() {
            if (!this.searchQuery || !this.autocomplete) {
                return this.items;
            }

            // Кастомная функция фильтрации
            if (this.filterFunction) {
                return this.filterFunction(this.items, this.searchQuery);
            }

            // Встроенная фильтрация
            const query = this.searchQuery.toLowerCase();
            return this.items.filter(item => {
                const label = this.getItemLabel(item).toLowerCase();
                return label.includes(query);
            });
        },

        // Видимые элементы (для виртуального скроллинга или обычного)
        visibleItems() {
            if (!this.virtualScrolling) {
                return this.filteredItems;
            }

            // Логика виртуального скроллинга (структура заложена для пункта 8)
            // Вычисляем startIndex и endIndex на основе scrollTop
            const containerHeight = this.maxHeight ? parseInt(this.maxHeight) : 300;
            const visibleCount = Math.ceil(containerHeight / this.virtualItemHeight);

            const startIndex = Math.floor(this.scrollTop / this.virtualItemHeight);
            const endIndex = Math.min(
                startIndex + visibleCount + 2, // +2 для буфера
                this.filteredItems.length
            );

            return this.filteredItems.slice(startIndex, endIndex);
        },

        // Виртуальные видимые элементы (для рендеринга)
        virtualVisibleItems() {
            if (!this.virtualScrolling) return this.filteredItems;
            // Для виртуального скроллинга используем visibleItems
            return this.visibleItems;
        },

        // Текст для подсветки
        highlightText() {
            return this.highlightMatches && this.searchQuery ? this.searchQuery : null;
        },

        // Реактивные подсказки
        tooltipsConfig() {
            return window.tooltipsConfig || null;
        },

        clearTitle() {
            return this.tooltipsConfig ? this.tooltipsConfig.getTooltip('ui.combobox.clear') : 'Очистить';
        }
    },

    mounted() {
        // Инициализация Bootstrap Dropdown через JavaScript API
        // Уничтожение Bootstrap Dropdown для предотвращения утечек памяти
        if (this.mode === 'combobox') {
            this.$nextTick(() => {
                if (window.bootstrap && window.bootstrap.Dropdown) {
                    const toggleElement = this.$refs.comboboxContainer?.querySelector('[data-bs-toggle="dropdown"]');
                    if (toggleElement) {
                        this.dropdownInstance = new window.bootstrap.Dropdown(toggleElement, {
                            // Опции Bootstrap Dropdown можно передать через props при необходимости
                        });

                        // Подписка на события Bootstrap для синхронизации состояния
                        this.$refs.comboboxContainer.addEventListener('show.bs.dropdown', () => {
                            this.isOpen = true;
                            this.$emit('show');

                            // Сброс индекса при открытии
                            this.selectedIndex = -1;
                        });

                        this.$refs.comboboxContainer.addEventListener('shown.bs.dropdown', () => {
                            // Дополнительные действия после открытия
                        });

                        this.$refs.comboboxContainer.addEventListener('hide.bs.dropdown', () => {
                            this.isOpen = false;
                            this.$emit('hide');
                        });

                        this.$refs.comboboxContainer.addEventListener('hidden.bs.dropdown', () => {
                            // Очистка поиска при закрытии (опционально)
                            if (this.autocomplete) {
                                // Можно очистить searchQuery, если значение выбрано
                            }
                        });
                    }
                }
            });
        }
    },

    beforeUnmount() {
        // Уничтожение Bootstrap Dropdown для предотвращения утечек памяти
        if (this.dropdownInstance) {
            this.dropdownInstance.dispose();
            this.dropdownInstance = null;
        }

        // Очистка debounce таймера
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
    },

    methods: {
        // Получение label элемента
        getItemLabel(item) {
            if (typeof item === 'string') return item;
            if (this.itemLabel) {
                if (typeof this.itemLabel === 'function') {
                    return this.itemLabel(item);
                }
                return item[this.itemLabel] || String(item);
            }
            // Дефолтная логика: ищем label, name, text или приводим к строке
            return item.label || item.name || item.text || String(item);
        },

        // Получение value элемента
        getItemValue(item) {
            if (typeof item === 'string') return item;
            if (this.itemValue) {
                if (typeof this.itemValue === 'function') {
                    return this.itemValue(item);
                }
                return item[this.itemValue];
            }
            // Дефолтная логика: ищем value, id или используем label
            return item.value !== undefined ? item.value : (item.id !== undefined ? item.id : this.getItemLabel(item));
        },

        // Получение ключа для v-for
        getItemKey(item, index) {
            const value = this.getItemValue(item);
            return value !== undefined ? value : index;
        },

        // Проверка, выбран ли элемент
        isItemSelected(item) {
            const value = this.getItemValue(item);
            if (this.isMultiple) {
                return Array.isArray(this.modelValue) && this.modelValue.includes(value);
            }
            return this.modelValue === value;
        },

        // Подсветка текста в элементе (структура для пункта 6)
        highlightItemText(item) {
            if (!this.highlightText) return this.getItemLabel(item);

            const label = this.getItemLabel(item);
            const query = this.searchQuery;
            const regex = new RegExp(`(${query})`, 'gi');
            return label.replace(regex, '<mark>$1</mark>');
        },

        // Обработчик ввода
        handleInput(event) {
            const value = event.target.value;
            this.searchQuery = value;

            // В режиме input обновляем modelValue сразу
            if (this.mode === 'input') {
                this.$emit('update:modelValue', value);
                this.$emit('input', value);
                return;
            }

            // Debounce для производительности
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
            }

            this.debounceTimer = setTimeout(() => {
                this.$emit('input', value);

                // Если автодополнение включено и dropdown закрыт - открываем
                if (this.autocomplete && !this.isOpen && value) {
                    this.show();
                }
            }, this.debounce);
        },

        // Обработчик клавиатурной навигации
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
                        // Принимаем произвольное значение
                        this.handleCustomValue(this.searchQuery);
                    }
                    break;

                case 'Escape':
                    event.preventDefault();
                    this.hide();
                    break;

                case 'Tab':
                    // Закрываем dropdown при Tab
                    if (this.isOpen) {
                        this.hide();
                    }
                    break;
            }
        },

        // Прокрутка к выбранному элементу
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

        // Обработчик прокрутки (для виртуального скроллинга)
        handleScroll(event) {
            if (this.virtualScrolling) {
                this.scrollTop = event.target.scrollTop;
            }
        },

        // Обработчик выбора элемента
        handleItemSelect(item, event) {
            const value = this.getItemValue(item);
            const label = this.getItemLabel(item);

            if (this.isMultiple) {
                // Логика множественного выбора (структура для пункта 10)
                const currentValues = Array.isArray(this.modelValue) ? [...this.modelValue] : [];
                const index = currentValues.indexOf(value);

                if (index >= 0) {
                    // Удаляем из выбранных
                    currentValues.splice(index, 1);
                } else {
                    // Добавляем к выбранным
                    currentValues.push(value);
                }

                this.$emit('update:modelValue', currentValues);
                this.searchQuery = ''; // Очищаем поиск
            } else {
                // Одиночный выбор
                this.$emit('update:modelValue', value);
                this.searchQuery = ''; // Очищаем поиск после выбора
                this.hide();
            }

            this.$emit('select', { value, label, item });
        },

        // Обработчик произвольного значения
        handleCustomValue(value) {
            if (this.strict) return; // Если strict - не принимаем произвольные значения

            this.$emit('update:modelValue', value);
            this.$emit('select', { value, label: value, item: null });
            this.hide();
        },

        // Обработчик очистки
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

            // Фокус на input
            this.$nextTick(() => {
                if (this.$refs.inputElement) {
                    this.$refs.inputElement.focus();
                }
            });
        },

        // Обработчик фокуса
        handleFocus(event) {
            this.$emit('focus', event);
            if (this.autocomplete && this.searchQuery) {
                this.show();
            }
        },

        // Обработчик blur
        handleBlur(event) {
            this.$emit('blur', event);
            // Не закрываем dropdown сразу, чтобы клик по элементу успел сработать
            setTimeout(() => {
                if (!this.$refs.comboboxContainer?.contains(document.activeElement)) {
                    this.hide();
                }
            }, 200);
        },

        // Обработчик переключения dropdown
        handleToggle(event) {
            // Bootstrap сам управляет открытием/закрытием через data-bs-toggle
        },

        // Программное открытие dropdown (через Bootstrap API)
        show() {
            if (this.dropdownInstance) {
                this.dropdownInstance.show();
            }
        },

        // Программное закрытие dropdown (через Bootstrap API)
        hide() {
            if (this.dropdownInstance) {
                this.dropdownInstance.hide();
            }
        },

        // Программное переключение dropdown (через Bootstrap API)
        toggle() {
            if (this.dropdownInstance) {
                this.dropdownInstance.toggle();
            }
        },

        // Получение экземпляра Bootstrap Dropdown (для прямого доступа к API)
        getBootstrapInstance() {
            return this.dropdownInstance;
        }
    }
};

