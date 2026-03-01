/**
 * ================================================================================================
 * MODAL EXAMPLE BODY COMPONENT - Компонент-пример for демонстрации системы управления кнопками
 * ================================================================================================
 *
 * PURPOSE: Демонстрация использования системы управления кнопками модального окна.
 *
 * ОСОБЕННОСТИ:
 * - Регистрация кнопок через inject modalApi
 * - Реактивное обновление состояния кнопок при изменении данных формы
 * - Демонстрация кнопок в header и footer одновременно
 *
 * REFERENCES:
 * - Система управления кнопками: shared/components/modal.js
 * - Принципы: app/skills/ux-principles
 */

window.modalExampleBody = {
    template: `
        <div>
            <p>Содержимое модального окна. Здесь can be любой контент: текст, формы, изображения и т.д.</p>
            <div class="mb-3">
                <label :for="formIdPrefix + '-exampleInput'" class="form-label">Пример поля ввода</label>
                <input
                    type="text"
                    name="exampleInput"
                    class="form-control"
                    :id="formIdPrefix + '-exampleInput'"
                    v-model="formData.inputValue"
                    placeholder="Введите текст">
            </div>
            <div class="form-check">
                <input
                    class="form-check-input"
                    type="checkbox"
                    name="exampleCheck"
                    :id="formIdPrefix + '-exampleCheck'"
                    v-model="formData.checkboxValue">
                <label class="form-check-label" :for="formIdPrefix + '-exampleCheck'">
                    Пример чекбокса
                </label>
            </div>
        </div>
    `,

    inject: ['modalApi'],

    data() {
        return {
            formData: {
                inputValue: '',
                checkboxValue: false
            },
            initialData: {
                inputValue: '',
                checkboxValue: false
            }
        };
    },

    computed: {
        // Уникальный префикс for ID элементов формы (избегаем дублирования при повторном открытии модального окна)
        formIdPrefix() {
            return `modal-example-${this._uid || Math.random().toString(36).substr(2, 9)}`;
        },
        hasChanges() {
            return JSON.stringify(this.formData) !== JSON.stringify(this.initialData);
        },
        isValid() {
            // Форма всегда валидна (нет обязательных полей)
            return true;
        }
    },

    watch: {
        formData: {
            deep: true,
            handler() {
                // Реактивно обновляем состояние кнопок при изменении формы
                if (this.modalApi) {
                    this.modalApi.updateButton('save', {
                        disabled: !this.hasChanges || !this.isValid
                    });
                }
            }
        }
    },

    methods: {
        handleCancel() {
            if (this.hasChanges) {
                // Восстанавливаем исходные значения
                this.formData = JSON.parse(JSON.stringify(this.initialData));
            } else {
                // Закрываем модальное окно
                if (this.$parent.$refs && this.$parent.$refs.exampleModal) {
                    this.$parent.$refs.exampleModal.hide();
                }
            }
        },
        handleSave() {
            // Сохраняем данные
            this.initialData = JSON.parse(JSON.stringify(this.formData));
            console.log('Данные сохранены:', this.formData);

            // Закрываем модальное окно
            if (this.$parent.$refs && this.$parent.$refs.exampleModal) {
                this.$parent.$refs.exampleModal.hide();
            }
        },
        handleExport() {
            console.log('Экспорт данных:', this.formData);
        }
    },

    mounted() {
        // Регистрируем кнопки при монтировании
        if (this.modalApi) {
            // Кнопка "Сохранить" в header и footer
            this.modalApi.registerButton('save', {
                locations: ['header', 'footer'],
                label: 'Сохранить',
                variant: 'primary',
                icon: 'fas fa-save', // Иконка for header версии
                tooltipIcon: 'Сохранить', // Подсказка for иконочной кнопки в header
                disabled: !this.hasChanges || !this.isValid,
                onClick: () => this.handleSave()
            });

            // Кнопка "Отмена" только в footer
            this.modalApi.registerButton('cancel', {
                locations: ['footer'],
                label: 'Отмена',
                variant: 'secondary',
                classesAdd: { root: 'me-auto' },
                onClick: () => this.handleCancel()
            });

            // Кнопка "Экспорт" только в header
            this.modalApi.registerButton('export', {
                locations: ['header'],
                label: 'Экспорт',
                variant: 'outline-primary',
                icon: 'fas fa-download',
                tooltipIcon: 'Экспорт данных', // Подсказка for иконочной кнопки
                onClick: () => this.handleExport()
            });
        }
    },

    beforeUnmount() {
        // Удаляем кнопки при размонтировании
        if (this.modalApi) {
            this.modalApi.removeButton('save');
            this.modalApi.removeButton('cancel');
            this.modalApi.removeButton('export');
        }
    }
};

