/**
 * ================================================================================================
 * MODAL BUTTONS COMPONENT - Компонент для рендеринга кнопок модального окна
 * ================================================================================================
 *
 * ЦЕЛЬ: Рендеринг кнопок модального окна в header или footer на основе единой системы управления.
 *
 * ПРИНЦИПЫ:
 * - Компонент получает кнопки через inject от cmp-modal
 * - Отображает кнопки только для указанного места (header или footer)
 * - Использует cmp-button для рендеринга каждой кнопки
 * - Реагирует на изменения состояния кнопок (disabled, visible)
 *
 * API КОМПОНЕНТА:
 *
 * Входные параметры (props):
 * - location (String, required) — место отображения: 'header' или 'footer'
 *
 * Inject:
 * - modalApi — API для управления кнопками (предоставляется cmp-modal)
 *
 * ССЫЛКИ:
 * - Шаблон: shared/templates/modal-buttons-template.js
 * - Компонент модального окна: shared/components/modal.js
 * - Компонент кнопки: shared/components/button.js
 */

window.cmpModalButtons = {
    template: '#modal-buttons-template',

    inject: ['modalApi'],

    props: {
        location: {
            type: String,
            required: true,
            validator: (value) => ['header', 'footer'].includes(value)
        },
        leftOnly: {
            type: Boolean,
            default: false
        },
        rightOnly: {
            type: Boolean,
            default: false
        }
    },

    components: {
        'cmp-button': window.cmpButton
    },

    data() {
        return {
            buttons: []
        };
    },

    computed: {
        /**
         * Обработанные кнопки с учетом особенностей header/footer
         */
        processedButtons() {
            let initialButtons = [...this.buttons];

            if (this.location === 'footer') {
                initialButtons = initialButtons.filter(button => {
                    const isCloseButton = button.id === 'close' || button.label === 'Закрыть';
                    if (isCloseButton) {
                        // Кнопка Закрыть в новой схеме не нужна, так как есть Отмена и Сохранить
                        return false;
                    }
                    return true;
                });
            }

            let processed = initialButtons.map(button => {
                // Для кнопок в header делаем их иконочными (без label, variant='link', без подчеркивания, без горизонтальных паддингов)
                if (this.location === 'header') {
                    return {
                        ...button,
                        label: null, // Убираем текст
                        variant: 'link', // Убираем окантовку
                        // Убираем подчеркивание и горизонтальные паддинги у btn-link через classesAdd
                        classesAdd: {
                            ...(button.classesAdd || {}),
                            root: `${button.classesAdd?.root || ''} text-decoration-none px-0`.trim()
                        },
                        // icon остается как есть
                    };
                }
                // Для footer оставляем как есть
                return button;
            });

            // Фильтрация по левой/правой стороне для footer
            if (this.location === 'footer') {
                if (this.leftOnly) {
                    processed = processed.filter(b => b.classesAdd?.root?.includes('me-auto'));
                } else if (this.rightOnly) {
                    processed = processed.filter(b => !b.classesAdd?.root?.includes('me-auto'));
                }
            }

            processed.sort((a, b) => {
                const aHasMeAuto = a.classesAdd?.root?.includes('me-auto') || false;
                const bHasMeAuto = b.classesAdd?.root?.includes('me-auto') || false;
                // ВАЖНО: Теперь все кнопки в левом блоке (с me-auto) выравниваются влево.
                // Сортировка остается для корректного распределения по блокам.
                if (aHasMeAuto && !bHasMeAuto) return -1;
                if (!aHasMeAuto && bHasMeAuto) return 1;
                return 0;
            });

            return processed;
        }
    },

    methods: {
        /**
         * Обновление списка кнопок для текущего места
         */
        updateButtons() {
            if (this.modalApi && this.modalApi.getButtonsForLocation) {
                const buttons = this.modalApi.getButtonsForLocation(this.location);
                this.buttons = buttons;
            }
        },

        /**
         * Обработчик клика по кнопке
         * @param {Object} button - конфигурация кнопки
         */
        handleClick(button) {
            if (button.onClick && !button.disabled) {
                button.onClick();
            }
        }
    },

    mounted() {
        this.updateButtons();

        // Подписка на изменения кнопок через watch
        // Используем $watch для отслеживания изменений в modalApi
        this.$watch(
            () => {
                // Принудительно получаем актуальный список кнопок
                return this.modalApi ? this.modalApi.getButtonsForLocation(this.location) : [];
            },
            (newButtons) => {
                this.buttons = newButtons;
            },
            { deep: true, immediate: true }
        );
    }
};

