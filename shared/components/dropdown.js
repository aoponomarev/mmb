// =========================
// КОМПОНЕНТ DROPDOWN
// Vue-обёртка над Bootstrap dropdown с поддержкой поиска и прокрутки
// =========================
// PURPOSE: Переиспользуемый компонент выпадающего списка с поддержкой:
//
// @skill-anchor id:sk-add9a6 #for-classes-add-remove
// @skill-anchor id:sk-eeb23d #for-bootstrap-event-proxying
// @skill-anchor id:sk-cb75ec #for-utility-availability-check
// - Поиска по элементам
// - Прокрутки for длинных списков
// - Полной совместимости with Bootstrap JS API
// - Кастомной кнопки через слот
// - Динамической загрузки элементов
// - Адаптивности кнопки триггера через CSS классы (.dropdown-responsive)
// - Детерминированных хэшей экземпляров (instanceHash) for идентификации и кастомной стилизации
// - Использования компонента cmp-button for кнопки триггера (полная совместимость with Bootstrap API)
// - Режима select с индикацией выбранного пункта на кнопке (полная замена ⟨select⟩)
//
// Кнопка триггера:
// - Индикация выбранного пункта на кнопке триггера
// - Гибкое управление отображением через buttonDisplay (icon, label, labelShort, value)
// - Поддержка любых комбинаций элементов на кнопке
// - Автоматическое закрытие dropdown после выбора
// - Поддержка v-model через update:selectedItem
//
// API КОМПОНЕНТА:
//
// Входные параметры (props):
// Кнопка триггера:
// - buttonText (String, default: 'Dropdown') — текст кнопки (отображается на десктопе, если задана иконка или укороченный текст)
// - buttonTextShort (String) — укороченная версия текста for мобильных (using, если buttonIcon не задан)
// - buttonIcon (String) — иконка for мобильной версии (Font Awesome класс, отображается только на мобильных)
// - buttonVariant (String, default: 'primary') — вариант кнопки Bootstrap (primary, secondary, success, danger, warning, info, light, dark, outline-*, link)
// - buttonSize (String) — размер кнопки (sm, lg)
// - dropdownId (String) — ID for кнопки триггера (using в buttonAttributes.id for Bootstrap)
// Поиск:
// - searchable (Boolean, default: false) — включить поиск по элементам
// - searchPlaceholder (String, default: 'Поиск...') — placeholder for поля поиска
// - emptySearchText (String, default: 'Ничего не найдено') — текст при отсутствии результатов
// - searchFunction (Function) — кастомная функция поиска. Если не указана, using встроенная фильтрация по строке
// Прокрутка:
// - scrollable (Boolean, default: false) — включить прокрутку for длинных списков
// - maxHeight (String, default: '300px') — максимальная высота прокручиваемой области
// Элементы списка:
// - items (Array, default: []) — массив элементов for встроенной фильтрации (optional, если using слот)
// Режим select (индикация выбранного пункта на кнопке):
// - selectMode (Boolean, default: false) — включить режим select. В этом режиме компонент работает как ⟨select⟩, показывая выбранный пункт меню на кнопке триггера
// - selectedItem (String | Number | Object) — выбранный элемент. Может быть индексом, value (id) или самим объектом элемента. Поддерживает v-model через update:selectedItem
// - itemLabel (String | Function, default: 'title') — поле или функция for извлечения label из элемента. Если строка — имя поля (например, 'name', 'title'). Если функция — (item) => item.name
// - itemValue (String | Function, default: 'id') — поле или функция for извлечения value из элемента. Используется for идентификации и v-model
// - itemIcon (String | Function, default: 'icon') — поле или функция for извлечения иконки из элемента
// - itemLabelShort (String | Function, default: 'labelShort') — поле или функция for извлечения укороченного текста из элемента
// - buttonDisplay (Object, default: { icon: true, label: true, labelShort: false, value: false }) — управление отображением элементов выбранного пункта на кнопке. Поддерживаются любые комбинации: icon, label, labelShort, value
// Дополнительные:
// - classesAdd (Object, default: {}) — классы for добавления на различные элементы компонента. Структура: { root: 'классы', button: 'классы', menu: 'классы' }
// - classesRemove (Object, default: {}) — классы for удаления с различных элементов компонента. Структура: { root: 'классы', button: 'классы', menu: 'классы' }
// - menuClasses (String) — дополнительные CSS классы for dropdown-menu (for обратной совместимости, рекомендуется использовать classesAdd.menu)
// - menuStyle (Object) — дополнительные inline стили for dropdown-menu
// - menuOffset (Number | Array, default: null) — отступ между кнопкой и выпадающим меню через Popper.js offset. Число: [0, offsetY] (x, y в пикселях, только вертикальный отступ). Массив: [offsetX, offsetY] (x, y в пикселях). null: использовать дефолтный offset Bootstrap
//
// Logoutные события (emits):
// - show — событие открытия dropdown (синхронизировано с show.bs.dropdown)
// - hide — событие закрытия dropdown (синхронизировано с hide.bs.dropdown)
// - search — событие поиска (эмитится при изменении searchQuery)
// - item-select — событие выбора элемента (эмитится из слота items в обычном режиме)
// - update:selectedItem — обновление выбранного элемента (for v-model в режиме select)
// - select — событие выбора элемента в режиме select: { item, value, index }
//
// Слоты:
// - button — кастомная кнопка триггера (с ограниченной областью видимости: isOpen, toggle). Если using, стандартная кнопка через cmp-button не отображается
// - items — элементы списка (с ограниченной областью видимости: filteredItems, searchQuery, handleItemSelect). В режиме select рекомендуется использовать handleItemSelect for автоматического обновления выбранного элемента и закрытия dropdown
//
// Методы (ref API):
// - show() — программное открытие dropdown через Bootstrap API
// - hide() — программное закрытие dropdown через Bootstrap API
// - toggle() — программное переключение dropdown через Bootstrap API
// - getBootstrapInstance() — получение экземпляра Bootstrap Dropdown for прямого доступа к API
//
// Элементы списка:
// Структура layout и CSS-классы: см. в шапке шаблона `shared/templates/dropdown-template.js`
// Использование компонента cmp-button for кнопки триггера:
// - Кнопка триггера реализована через компонент cmp-button for единообразия
// - Атрибуты Bootstrap передаются через prop buttonAttributes компонента cmp-button
// - Доступ к реальному DOM-элементу через $refs.dropdownButton.$el for инициализации Bootstrap
// - Полная совместимость with Bootstrap API: Bootstrap работает с реальным DOM-элементом, а не с Vue-компонентом
// Поиск:
// - Встроенная фильтрация по строке (ищет в значениях объектов или строках)
// - Поддержка кастомной функции поиска через prop searchFunction
// - Автофокус на поле поиска при открытии dropdown (если searchable === true)
// - Очистка поиска при закрытии dropdown
// Режим select:
// - Выбранный элемент определяется через prop selectedItem (поддерживает v-model)
// - Данные извлекаются из элементов через itemLabel, itemValue, itemIcon, itemLabelShort (строки или функции)
// - Отображение на кнопке управляется через buttonDisplay (любые комбинации icon, label, labelShort, value)
// - После выбора dropdown автоматически закрывается
// - Эмитится событие select с данными { item, value, index }
// - В слоте items рекомендуется использовать handleItemSelect из области видимости слота for автоматического обновления выбранного элемента
//
// АРХИТЕКТУРА:
// - Шаблон: shared/templates/dropdown-template.js (ID: dropdown-template)
// - Зависимости: Bootstrap 5, Vue.js
// - See also: `id:sk-318305` (section "Maximum compatibility strategy with Bootstrap")
// - See also: `id:sk-483943` (принципы moduleости, запрет кастомных стилей)

window.cmpDropdown = {
    template: '#dropdown-template',
    components: {
        'cmp-button': window.cmpButton
    },

    props: {
        // === Кнопка триггера ===
        buttonText: {
            type: String,
            default: 'Найти монеты'
        },
        buttonTextShort: {
            type: String,
            default: null // укороченная версия текста for мобильных (если buttonIcon не задан)
        },
        buttonIcon: {
            type: String,
            default: null // иконка for мобильной версии (Font Awesome класс)
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

        // === Поиск ===
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
            default: null // Если не указана, using встроенная фильтрация по строке
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

        // === Элементы списка ===
        items: {
            type: Array,
            default: () => []
        },

        // === Управление классами ===
        classesAdd: {
            type: Object,
            default: () => ({})
            // Пример: { root: 'float-start', button: 'custom-button', menu: 'custom-menu' }
        },
        classesRemove: {
            type: Object,
            default: () => ({})
            // Пример: { root: 'some-class', button: 'another-class', menu: 'yet-another-class' }
        },
        menuClasses: {
            type: String,
            default: ''
        },
        menuStyle: {
            type: Object,
            default: () => ({})
        },
        // Режим ширины меню: 'auto' (по контенту, без переноса), 'fixed' (в em)
        menuWidthMode: {
            type: String,
            default: 'auto',
            validator: (value) => ['auto', 'fixed'].includes(value)
        },
        // Ширина меню в em (using если menuWidthMode === 'fixed')
        menuWidth: {
            type: [Number, String],
            default: null
        },
        autoClose: {
            type: [String, Boolean],
            default: null // null = поведение Bootstrap по умолчанию
        },
        menuOffset: {
            type: [Number, Array],
            default: null
            // Число: [0, -16] (x, y в пикселях)
            // Массив: [0, -16] (x, y в пикселях)
            // null: использовать дефолтный offset Bootstrap
        },

        // === ID for Bootstrap (optional) ===
        dropdownId: {
            type: String,
            default: null
        },

        // === Режим select (индикация выбранного пункта на кнопке) ===
        selectMode: {
            type: Boolean,
            default: false
        },
        selectedItem: {
            type: [String, Number, Object],
            default: null
        },
        // Функции/строки for извлечения данных из элементов
        itemLabel: {
            type: [String, Function],
            default: 'name' // или 'title' в зависимости от структуры items
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
        // Управление отображением на кнопке в режиме select
        buttonDisplay: {
            type: Object,
            default: () => ({
                icon: true,        // показывать иконку
                label: true,      // показывать полный текст
                labelShort: false, // показывать укороченный текст
                value: false      // показывать value вместо label
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
            outsideClickHandler: null // Обработчик клика вне области
        };
    },

    computed: {
        // CSS классы for корневого элемента dropdown
        dropdownClasses() {
            const baseClasses = ['dropdown', 'dropdown-responsive', this.instanceHash];

            // Условные классы for адаптивности
            if (this.buttonIcon) baseClasses.push('has-icon');
            if (this.buttonTextShort) baseClasses.push('has-text-short');

            // Управление классами через classesAdd и classesRemove
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

        // CSS классы for выпадающего меню
        menuClassesComputed() {
            const baseClasses = ['dropdown-menu'];

            // В режиме 'auto' запрещаем перенос строк (однострочные пункты)
            if (this.menuWidthMode === 'auto') {
                baseClasses.push('text-nowrap');
            }

            // Добавляем классы из prop menuClasses (for обратной совместимости)
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

        // Вычисляемые inline-стили for меню
        menuStyleComputed() {
            const styles = { ...this.menuStyle };

            // В режиме 'fixed' устанавливаем ширину в em
            if (this.menuWidthMode === 'fixed' && this.menuWidth) {
                styles.width = `${this.menuWidth}em`;
                styles.minWidth = 'auto'; // Отключаем Bootstrap min-width если задана фиксированная
            }

            return styles;
        },

        // Атрибуты for кнопки триггера (for передачи в cmp-button)
        buttonAttributes() {
            return {
                'data-bs-toggle': 'dropdown',
                'aria-expanded': this.isOpen,
                'id': this.dropdownId,
                'class': 'dropdown-toggle'
            };
        },

        // Классы for кнопки триггера (for передачи в cmp-button через classesAdd/classesRemove)
        // Передаем classesAdd.button как root, classesAdd.buttonIcon как icon и т.д.
        buttonClassesForDropdown() {
            // ВАЖНО: Возвращаем объект с undefined вместо пропуска свойств
            // Это обеспечивает стабильную структуру объекта for Vue реактивности
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
            // ВАЖНО: Возвращаем объект с undefined вместо пропуска свойств
            // Это обеспечивает стабильную структуру объекта for Vue реактивности
            return {
                root: this.classesRemove?.button || undefined,
                container: this.classesRemove?.buttonContainer || undefined,
                icon: this.classesRemove?.buttonIcon || undefined,
                label: this.classesRemove?.buttonLabel || undefined,
                suffix: this.classesRemove?.buttonSuffix || undefined
            };
        },

        // Детерминированный хэш экземпляра на основе родительского контекста и props
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

        // Отфильтрованные элементы (если using встроенная фильтрация)
        filteredItems() {
            // Защита от undefined/null items
            const items = this.items || [];
            if (!this.searchable || !this.searchQuery) {
                return items;
            }

            // Если указана кастомная функция поиска
            if (this.searchFunction) {
                return this.searchFunction(items, this.searchQuery);
            }

            // Встроенная фильтрация по строке (ищет в значениях объектов)
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
         * Текст кнопки в режиме select
         * Если selectMode включен и selectedItem задан, возвращает label/value выбранного элемента
         * Иначе возвращает статический buttonText
         * @returns {String} Текст for отображения на кнопке
         */
        computedButtonText() {
            if (!this.selectMode || !this.selectedItem) {
                return this.buttonText;
            }
            const item = this.getSelectedItemObject();
            if (!item) return this.buttonText;

            // Если нужно показать value вместо label
            if (this.buttonDisplay.value) {
                return this.getItemValue(item);
            }

            // Если нужно показать labelShort
            if (this.buttonDisplay.labelShort && !this.buttonDisplay.label) {
                return this.getItemLabelShort(item) || this.getItemLabel(item) || this.buttonText;
            }

            // Показываем полный label
            if (this.buttonDisplay.label) {
                return this.getItemLabel(item) || this.buttonText;
            }

            return this.buttonText;
        },

        /**
         * Укороченный текст кнопки в режиме select
         * Если selectMode включен и selectedItem задан, возвращает labelShort выбранного элемента
         * Иначе возвращает статический buttonTextShort
         * @returns {String|null} Укороченный текст for отображения на кнопке
         */
        computedButtonTextShort() {
            if (!this.selectMode || !this.selectedItem) {
                return this.buttonTextShort;
            }
            const item = this.getSelectedItemObject();
            if (!item) return this.buttonTextShort;

            // labelShort показывается только если включен в buttonDisplay
            if (this.buttonDisplay.labelShort) {
                return this.getItemLabelShort(item) || this.getItemLabel(item) || this.buttonTextShort;
            }

            return this.buttonTextShort;
        },

        /**
         * Иконка кнопки в режиме select
         * Если selectMode включен и selectedItem задан, возвращает icon выбранного элемента
         * Иначе возвращает статический buttonIcon
         * @returns {String|null} Иконка for отображения на кнопке или null
         */
        computedButtonIcon() {
            if (!this.selectMode || !this.selectedItem) {
                return this.buttonIcon;
            }
            const item = this.getSelectedItemObject();
            if (!item) return this.buttonIcon;

            // Иконка показывается только если включена в buttonDisplay
            if (this.buttonDisplay.icon) {
                return this.getItemIcon(item) || this.buttonIcon;
            }

            return null; // Не показывать иконку, если выключена
        }
    },

    methods: {
        // Get родительский контекст (класс avto-* или ID родителя)
        // Вызывается из computed, поэтому $el can be еще не доступен
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

        // Обработчик переключения dropdown
        handleToggle(event) {
            // Bootstrap сам управляет открытием/закрытием через data-bs-toggle
            // Этот метод можно использовать for дополнительной логики
        },

        // Обработчик поиска
        handleSearch() {
            this.$emit('search', this.searchQuery);
        },

        // Обработчик Escape (закрытие при поиске)
        handleEscape() {
            if (this.dropdownInstance) {
                this.dropdownInstance.hide();
            }
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

        // Получение экземпляра Bootstrap Dropdown (for прямого доступа к API)
        getBootstrapInstance() {
            return this.dropdownInstance;
        },

        // === Методы for режима select ===

        /**
         * Get объект выбранного элемента из массива items
         * Поддерживает три формата selectedItem:
         * - Объект: возвращает сам объект
         * - Число (индекс): возвращает items[index]
         * - Строка/число (value): ищет элемент по itemValue
         * @returns {Object|null} Объект элемента или null
         */
        getSelectedItemObject() {
            if (!this.selectedItem) {
                return null;
            }

            const items = this.items || [];
            if (items.length === 0) {
                return null;
            }

            // Если selectedItem - это объект, вернуть его
            if (typeof this.selectedItem === 'object') {
                return this.selectedItem;
            }

            // Найти элемент по value (id или строка)
            // Это важно, потому что value can be числом, и мы не должны путать его с индексом
            // Найти элемент по value (id или строка)
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const value = this.getItemValue(item);
                if (value === this.selectedItem || String(value) === String(this.selectedItem)) {
                    return item;
                }
            }

            // Если не найдено по value и selectedItem - это число, попробуем как индекс (fallback)
            // Это for обратной совместимости, если кто-то действительно хочет использовать индекс
            if (typeof this.selectedItem === 'number') {
                return items[this.selectedItem] || null;
            }

            return null;
        },

        /**
         * Извлечь label (текст) из элемента
         * Поддерживает строку (имя поля) или функцию
         * @param {Object} item - Элемент из массива items
         * @returns {String|null} Label элемента или null
         */
        getItemLabel(item) {
            if (!item) return null;
            if (typeof this.itemLabel === 'function') {
                return this.itemLabel(item);
            }
            if (typeof this.itemLabel === 'string') {
                return item[this.itemLabel] || null;
            }
            // Fallback: попробовать стандартные поля
            return item.title || item.name || item.label || null;
        },

        /**
         * Извлечь value (идентификатор) из элемента
         * Используется for v-model и идентификации выбранного элемента
         * @param {Object} item - Элемент из массива items
         * @returns {String|Number|Object|null} Value элемента или null
         */
        getItemValue(item) {
            if (!item) return null;
            if (typeof this.itemValue === 'function') {
                return this.itemValue(item);
            }
            if (typeof this.itemValue === 'string') {
                return item[this.itemValue] || null;
            }
            // Fallback: попробовать стандартные поля
            return item.id || item.value || item;
        },

        /**
         * Извлечь icon (иконку Font Awesome) из элемента
         * @param {Object} item - Элемент из массива items
         * @returns {String|null} Иконка элемента или null
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
         * Извлечь labelShort (укороченный текст) из элемента
         * Используется for адаптивного отображения на мобильных
         * @param {Object} item - Элемент из массива items
         * @returns {String|null} Укороченный текст элемента или null
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
         * Обработчик выбора пункта меню (for использования в слоте items)
         * В режиме select обновляет selectedItem, эмитит события и закрывает dropdown
         * В обычном режиме только эмитит событие item-select
         * @param {Object} item - Выбранный элемент
         * @param {Number} index - Индекс элемента в массиве
         */
        handleItemSelect(item, index) {
            if (this.selectMode) {
                // Обновляем selectedItem
                const value = this.getItemValue(item);
                this.$emit('update:selectedItem', value);
                this.$emit('select', { item, value, index });

                // Закрываем dropdown после выбора
                this.$nextTick(() => {
                    if (this.dropdownInstance) {
                        this.dropdownInstance.hide();
                    }
                });
            } else {
                // Обычный режим - просто эмитим событие
                this.$emit('item-select', { item, index });
            }
        }
    },

    mounted() {
        // Инициализация Bootstrap Dropdown через JavaScript API
                    // Подписка на события Bootstrap for синхронизации состояния
        this.$nextTick(() => {
            if (window.bootstrap && window.bootstrap.Dropdown && this.$refs.dropdownContainer) {
                // Получаем реальный DOM-элемент кнопки через ref на Vue-компоненте или querySelector
                let toggleElement = null;
                if (this.$refs.dropdownButton) {
                    // Вариант 1: Через ref на Vue-компоненте (более надежно)
                    toggleElement = this.$refs.dropdownButton.$el;
                } else {
                    // Вариант 2: Через querySelector (fallback)
                    toggleElement = this.$refs.dropdownContainer.querySelector('[data-bs-toggle="dropdown"]');
                }

                if (toggleElement) {
                    // Подготовка опций for Bootstrap Dropdown
                    const dropdownOptions = {};

                        if (this.autoClose !== null) {
                            dropdownOptions.autoClose = this.autoClose;
                        }

                    // Если указан menuOffset, используем его for Popper.js offset
                    if (this.menuOffset !== null) {
                        // Преобразуем в формат Popper.js: [x, y] или число (только y)
                        if (Array.isArray(this.menuOffset)) {
                            dropdownOptions.offset = this.menuOffset;
                        } else if (typeof this.menuOffset === 'number') {
                            dropdownOptions.offset = [0, this.menuOffset];
                        }
                    }

                    this.dropdownInstance = new window.bootstrap.Dropdown(toggleElement, dropdownOptions);


                    // Подписка на события Bootstrap for синхронизации состояния
                    this.$refs.dropdownContainer.addEventListener('show.bs.dropdown', () => {
                        this.isOpen = true;
                        this.$emit('show');

                        // Фокус на поле поиска при открытии (если поиск включен)
                        if (this.searchable && this.$refs.searchInput) {
                            this.$nextTick(() => {
                                this.$refs.searchInput.focus();
                            });
                        }
                    });

                    this.$refs.dropdownContainer.addEventListener('shown.bs.dropdown', () => {
                        // Дополнительные действия после открытия
                    });

                    this.$refs.dropdownContainer.addEventListener('hide.bs.dropdown', () => {
                        this.isOpen = false;
                        this.$emit('hide');
                    });

                    this.$refs.dropdownContainer.addEventListener('hidden.bs.dropdown', () => {
                        // Очистка поиска при закрытии (optional)
                        if (this.searchable) {
                            this.searchQuery = '';
                        }
                    });

                    // Обработка closeOnOutsideClick
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
        // Уничтожение Bootstrap Dropdown for предотвращения утечек памяти
        if (this.dropdownInstance) {
            this.dropdownInstance.dispose();
            this.dropdownInstance = null;
        }
        // Удаляем обработчик клика вне области
        if (this.outsideClickHandler) {
            document.removeEventListener('click', this.outsideClickHandler);
            this.outsideClickHandler = null;
        }
    }
};


