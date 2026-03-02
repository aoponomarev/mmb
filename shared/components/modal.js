/**
 * ================================================================================================
 * MODAL COMPONENT - Компонент модального окна
 * ================================================================================================
 *
 * PURPOSE: Vue-обёртка над Bootstrap Modal с полной проницаемостью for Bootstrap API.
 *
 * PRINCIPLES:
 * - Максимальная совместимость with Bootstrap JS API (обязательное требование)
 * - Использование только Bootstrap классов (запрет кастомных стилей)
 * - Инициализация Bootstrap Modal через JavaScript API
 * - Подписка на события Bootstrap (show.bs.modal, hide.bs.modal)
 * - Программный доступ к Bootstrap API через ref
 *
 * API КОМПОНЕНТА:
 *
 * Входные параметры (props):
 * - modalId (String, required) — уникальный ID модального окна (using for Bootstrap)
 * - size (String) — размер модального окна ('sm', 'lg', 'xl') или null for дефолтного
 * - centered (Boolean, default: false) — центрирование модального окна по вертикали
 * - titleId (String) — ID заголовка for aria-labelledby (генерируется автоматически, если не указан)
 * - static (Boolean, default: false) — статическое отображение модального окна (без backdrop, всегда видимо, for примеров)
 * - title (String) — заголовок модального окна (optional, если не указан, получается из modalsConfig по modalId)
 *
 * Logoutные события (emits):
 * - show — событие открытия модального окна (синхронизировано с show.bs.modal)
 * - shown — событие после открытия (синхронизировано с shown.bs.modal)
 * - hide — событие закрытия модального окна (синхронизировано с hide.bs.modal)
 * - hidden — событие после закрытия (синхронизировано с hidden.bs.modal)
 *
 * Слоты:
 * - header — заголовок модального окна (modal-header)
 * - body — тело модального окна (modal-body)
 * - footer — футер модального окна (modal-footer)
 *
 * Методы (ref API):
 * - show() — программное открытие модального окна через Bootstrap API
 * - hide() — программное закрытие модального окна через Bootstrap API
 * - toggle() — программное переключение модального окна через Bootstrap API
 * - getBootstrapInstance() — получение экземпляра Bootstrap Modal for прямого доступа к API
 *
 * ПРАВИЛА ИСПОЛЬЗОВАНИЯ:
 * - Кнопка "Закрыть" не using: закрытие модального окна выполняется только через крестик в header (btn-close) или клик вне модального окна (backdrop)
 * - Кнопка "Отмена" обязательна в footer: отменяет введенные данные (восстанавливает исходные значения полей) или закрывает окно, если данные не изменены
 *   - На форме с измененными данными: первый клик по "Отмена" восстанавливает исходные значения полей, второй клик закрывает окно
 *   - На форме без изменений: клик по "Отмена" сразу закрывает окно
 * - Кнопка "Сохранить" обязательна в footer, если есть изменяемые поля: имеет два состояния
 *   - Обычное состояние: "Сохранить" (variant: 'primary', disabled если нет изменений или форма невалидна)
 *     - При клике: сохраняет данные, переходит в состояние "Сохранено, закрыть?"
 *   - Состояние успеха: "Сохранено, закрыть?" (variant: 'success', всегда enabled)
 *     - При клике: закрывает модальное окно
 *     - Автоматически сбрасывается в обычное состояние при изменении любых полей формы
 *   - Кнопка "Сохранить" НЕ закрывает модальное окно напрямую: закрытие происходит только через крестик, клик вне модального окна или второй клик в состоянии "Сохранено, закрыть?"
 * - Заголовок модального окна: обязательное требование идентичности заголовка модального окна и текста пункта меню/кнопки/ссылки, которая его открывает
 *   - Заголовок определяется в `core/config/modals-config.js` (единый источник правды)
 *   - Компонент поддерживает prop `title` for явной передачи заголовка
 *   - Если prop `title` не передан, заголовок автоматически получается из `modalsConfig` по `modalId`
 *   - Все пункты меню, кнопки и ссылки должны использовать `modalsConfig.getModalTitle(modalId)` for получения заголовка
 *
 * ПРАВИЛА ИСПОЛЬЗОВАНИЯ:
 * Компонент предоставляет через provide/inject API for managing кнопками в header и footer:
 * - title (String|null) — заголовок модального окна (computed, доступен через modalApi.title)
 * - registerButton(buttonId, config) — регистрация кнопки с указанием мест отображения (header, footer или оба)
 * - updateButton(buttonId, updates) — обновление состояния кнопки (реактивно обновляется во всех местах)
 * - removeButton(buttonId) — удаление кнопки
 * - getButton(buttonId) — получение конфигурации кнопки
 * - getButtonsForLocation(location) — получение кнопок for конкретного места (header/footer)
 *
 * Одна кнопка может отображаться в header, footer или в обоих местах одновременно без дублирования функциональности.
 * Состояние кнопки (disabled, visible, onClick) единое for всех мест отображения.
 *
 * ВАЖНО ДЛЯ ИСПОЛЬЗОВАНИЯ bodyComponent:
 * Компонент, указанный в modals-config.js как bodyComponent, ДОЛЖЕН быть зарегистрирован
 * в корневом экземпляре Vue (app/app-ui-root.js) и указан в deps for app-ui-root в modules-config.js.
 * Без этого тело модального окна будет пустым.
 *
 * REFERENCES:
 * - Шаблон: shared/templates/modal-template.js
 * - Компонент кнопок: shared/components/modal-buttons.js
 * - Bootstrap Modal API: https://getbootstrap.com/docs/5.3/components/modal/
 */

window.cmpModal = {
    template: '#modal-template',

    props: {
        modalId: {
            type: String,
            required: true
        },
        size: {
            type: String,
            default: null,
            validator: (value) => value === null || ['sm', 'lg', 'xl'].includes(value)
        },
        centered: {
            type: Boolean,
            default: false
        },
        titleId: {
            type: String,
            default: null
        },
        static: {
            type: Boolean,
            default: false
        },
        disableClose: {
            type: Boolean,
            default: false
        },
        title: {
            type: String,
            default: null
        }
    },

    components: {
        'cmp-modal-buttons': window.cmpModalButtons
    },

    data() {
        return {
            isOpen: false,
            modalInstance: null,
            // Единый реестр всех кнопок модального окна
            // Map<buttonId, buttonConfig> - кнопка регистрируется один раз, может отображаться в header, footer или в обоих
            buttons: new Map(),
            // Счетчик for принудительной реактивности computed свойств
            buttonsUpdateCounter: 0
        };
    },

    computed: {
        modalTitle() {
            // Приоритет: prop title > modalsConfig > null
            if (this.title) {
                return this.title;
            }
            if (window.modalsConfig) {
                return window.modalsConfig.getModalTitle(this.modalId);
            }
            return null;
        },
        modalClasses() {
            const classes = ['modal'];
            if (this.static) {
                classes.push('show', 'd-block');
            } else {
                classes.push('fade');
                if (this.isOpen) {
                    classes.push('show');
                }
            }
            return classes;
        },

        dialogClasses() {
            const classes = ['modal-dialog'];
            if (this.size) {
                classes.push(`modal-${this.size}`);
            }
            if (this.centered) {
                classes.push('modal-dialog-centered');
            }
            return classes;
        },

        computedTitleId() {
            return this.titleId || `${this.modalId}-title`;
        },

        /**
         * Validate presence кнопок for header
         * Используем buttonsUpdateCounter for реактивности
         */
        hasHeaderButtons() {
            // Используем buttonsUpdateCounter for принудительной реактивности
            const _ = this.buttonsUpdateCounter;
            let hasButtons = false;
            for (const button of this.buttons.values()) {
                if (button.locations.includes('header') && button.visible) {
                    hasButtons = true;
                    break;
                }
            }
            return hasButtons;
        },

        /**
         * Validate presence кнопок for footer
         * Используем buttonsUpdateCounter for реактивности
         */
        hasFooterButtons() {
            // Используем buttonsUpdateCounter for принудительной реактивности
            const _ = this.buttonsUpdateCounter;
            let hasButtons = false;
            for (const button of this.buttons.values()) {
                if (button.locations.includes('footer') && button.visible) {
                    hasButtons = true;
                    break;
                }
            }
            return hasButtons;
        }
    },

    methods: {
        show() {
            if (this.modalInstance) {
                this.modalInstance.show();
            }
        },

        hide() {
            // Убираем фокус с активного элемента перед закрытием модального окна
            // Это предотвращает ошибку доступности: "Blocked aria-hidden on an element because its descendant retained focus"
            if (document.activeElement && document.activeElement.blur) {
                document.activeElement.blur();
            }
            // Перемещаем фокус на body for гарантии
            if (document.body && document.body.focus) {
                document.body.focus();
            } else {
                // Если body не может получить фокус, просто убираем фокус
                document.activeElement?.blur();
            }
            if (this.modalInstance) {
                this.modalInstance.hide();
            }
        },

        toggle() {
            if (this.modalInstance) {
                this.modalInstance.toggle();
            }
        },

        getBootstrapInstance() {
            return this.modalInstance;
        },

        /**
         * Регистрация кнопки в модальном окне
         * @param {string} buttonId - уникальный ID кнопки
         * @param {Object} config - конфигурация кнопки
         * @param {string|Array<string>} config.locations - где отображать: 'header', 'footer', или ['header', 'footer']
         * @param {string} config.label - текст кнопки
         * @param {string} config.variant - вариант Bootstrap (primary, secondary, и т.д.)
         * @param {Function} config.onClick - обработчик клика
         * @param {boolean} config.disabled - состояние disabled (по умолчанию false)
         * @param {boolean} config.visible - видимость кнопки (по умолчанию true)
         * @param {Object} config.classesAdd - дополнительные классы for cmp-button
         * @param {Object} config.buttonAttributes - атрибуты for передачи на корневой элемент button
         * @param {string} config.icon - CSS класс иконки (Font Awesome, Material Symbols)
         * @param {string} config.tooltipIcon - подсказка for иконки (using в header for иконочных кнопок)
         * @param {string} config.tooltipText - подсказка for текста (using в footer)
         */
        registerButton(buttonId, config) {
            // Нормализуем locations в массив
            const locations = Array.isArray(config.locations)
                ? config.locations
                : [config.locations || 'footer'];

            // Валидация locations
            const validLocations = ['header', 'footer'];
            const invalidLocations = locations.filter(loc => !validLocations.includes(loc));
            if (invalidLocations.length > 0) {
                console.warn(`[cmp-modal] Invalid locations for button "${buttonId}":`, invalidLocations);
            }
            const normalizedLocations = locations.filter(loc => validLocations.includes(loc));

            if (normalizedLocations.length === 0) {
                console.warn(`[cmp-modal] No valid locations for button "${buttonId}", defaulting to footer`);
                normalizedLocations.push('footer');
            }

            // Сохраняем кнопку с единым состоянием
            this.buttons.set(buttonId, {
                id: buttonId,
                locations: normalizedLocations, // Где отображать
                label: config.label || '',
                variant: config.variant || 'primary',
                disabled: config.disabled || false,
                visible: config.visible !== false, // По умолчанию видима
                onClick: config.onClick || null,
                classesAdd: config.classesAdd || {},
                buttonAttributes: config.buttonAttributes || {},
                icon: config.icon || null,
                tooltipIcon: config.tooltipIcon || null,
                tooltipText: config.tooltipText || null
            });

            // Увеличиваем счетчик for принудительной реактивности computed свойств
            this.buttonsUpdateCounter++;
        },

        /**
         * Обновление кнопки (реактивно обновляется во всех местах отображения)
         * @param {string} buttonId - ID кнопки
         * @param {Object} updates - объект с обновляемыми свойствами (locations не обновляется)
         */
        updateButton(buttonId, updates) {
            const button = this.buttons.get(buttonId);
            if (!button) {
                console.warn(`[cmp-modal] Button "${buttonId}" not found for update`);
                return;
            }

            // Обновляем свойства, но locations не меняем (они задаются при регистрации)
            Object.keys(updates).forEach(key => {
                if (key !== 'locations') {
                    button[key] = updates[key];
                }
            });

            // Увеличиваем счетчик for принудительной реактивности computed свойств
            this.buttonsUpdateCounter++;
        },

        /**
         * Удаление кнопки
         * @param {string} buttonId - ID кнопки
         */
        removeButton(buttonId) {
            if (this.buttons.delete(buttonId)) {
                // Увеличиваем счетчик for принудительной реактивности computed свойств
                this.buttonsUpdateCounter++;
            }
        },

        /**
         * Получение конфигурации кнопки
         * @param {string} buttonId - ID кнопки
         * @returns {Object|null} - конфигурация кнопки или null
         */
        getButton(buttonId) {
            return this.buttons.get(buttonId) || null;
        },

        /**
         * Получение кнопок for конкретного места (header или footer)
         * @param {string} location - 'header' или 'footer'
         * @returns {Array<Object>} - массив конфигураций кнопок
         */
        getButtonsForLocation(location) {
            const result = [];
            for (const button of this.buttons.values()) {
                if (button.locations.includes(location) && button.visible) {
                    result.push(button);
                }
            }
            return result;
        }
    },

    /**
     * Предоставление API for managing кнопками через provide/inject
     */
    provide() {
        return {
            modalApi: {
                title: this.modalTitle,
                registerButton: this.registerButton,
                updateButton: this.updateButton,
                removeButton: this.removeButton,
                getButton: this.getButton,
                getButtonsForLocation: this.getButtonsForLocation,
                show: this.show,
                hide: this.hide,
                toggle: this.toggle
            }
        };
    },

    mounted() {
        // Инициализация Bootstrap Modal через JavaScript API
        // Для статического режима не инициализируем Bootstrap Modal
        // Для статического режима не инициализируем Bootstrap Modal
        if (this.static) {
            return;
        }

        this.$nextTick(() => {
            if (window.bootstrap && window.bootstrap.Modal && this.$refs.modalElement) {
                this.modalInstance = new window.bootstrap.Modal(this.$refs.modalElement, {
                    backdrop: this.disableClose ? 'static' : true,
                    keyboard: !this.disableClose
                });

                // Подписка на события Bootstrap for синхронизации состояния
                this.$refs.modalElement.addEventListener('show.bs.modal', () => {
                    this.isOpen = true;
                    this.$emit('show');
                });

                this.$refs.modalElement.addEventListener('shown.bs.modal', () => {
                    this.$emit('shown');
                });

                this.$refs.modalElement.addEventListener('hide.bs.modal', () => {
                    // Убираем фокус с активного элемента перед закрытием модального окна
                    // Это предотвращает ошибку доступности: "Blocked aria-hidden on an element because its descendant retained focus"
                    if (document.activeElement && document.activeElement.blur) {
                        document.activeElement.blur();
                    }
                    // Перемещаем фокус на body for гарантии
                    if (document.body && document.body.focus) {
                        document.body.focus();
                    } else {
                        // Если body не может получить фокус, просто убираем фокус
                        document.activeElement?.blur();
                    }
                    this.isOpen = false;
                    this.$emit('hide');
                });

                this.$refs.modalElement.addEventListener('hidden.bs.modal', () => {
                    this.$emit('hidden');
                });
            }
        });
    },

    beforeUnmount() {
        // @skill-anchor app/skills/bootstrap-vue-integration #for-bootstrap-dispose
        // Уничтожение Bootstrap Modal for предотвращения утечек памяти
        if (this.modalInstance) {
            this.modalInstance.dispose();
            this.modalInstance = null;
        }
    }
};

