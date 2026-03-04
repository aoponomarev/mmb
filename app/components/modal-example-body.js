/**
 * ================================================================================================
 * MODAL EXAMPLE BODY COMPONENT - Example component for modal button system demo
 * ================================================================================================
 *
 * PURPOSE: Demo of modal button management system.
 *
 * @skill-anchor id:sk-add9a6 #for-classes-add-remove
 * @skill-anchor id:sk-eeb23d #for-bootstrap-event-proxying
 * @skill-anchor id:sk-cb75ec #for-utility-availability-check
 *
 * FEATURES:
 * - Button registration via inject modalApi
 * - Reactive button state updates on form data change
 * - Buttons in header and footer simultaneously
 *
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
        // Unique prefix for form element IDs (avoid duplicates on modal reopen)
        formIdPrefix() {
            return `modal-example-${this._uid || Math.random().toString(36).substr(2, 9)}`;
        },
        hasChanges() {
            return JSON.stringify(this.formData) !== JSON.stringify(this.initialData);
        },
        isValid() {
            // Form always valid (no required fields)
            return true;
        }
    },

    watch: {
        formData: {
            deep: true,
            handler() {
                // Reactively update button state on form change
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
                // Restore initial values
                this.formData = JSON.parse(JSON.stringify(this.initialData));
            } else {
                // Close modal
                if (this.$parent.$refs && this.$parent.$refs.exampleModal) {
                    this.$parent.$refs.exampleModal.hide();
                }
            }
        },
        handleSave() {
            // Save data
            this.initialData = JSON.parse(JSON.stringify(this.formData));
            console.log('Data saved:', this.formData);

            // Close modal
            if (this.$parent.$refs && this.$parent.$refs.exampleModal) {
                this.$parent.$refs.exampleModal.hide();
            }
        },
        handleExport() {
            console.log('Export data:', this.formData);
        }
    },

    mounted() {
        // Register buttons on mount
        if (this.modalApi) {
            // "Save" button in header and footer
            this.modalApi.registerButton('save', {
                locations: ['header', 'footer'],
                label: 'Сохранить',
                variant: 'primary',
                icon: 'fas fa-save', // Icon for header version
                tooltipIcon: 'Сохранить', // Tooltip for icon button in header
                disabled: !this.hasChanges || !this.isValid,
                onClick: () => this.handleSave()
            });

            // "Cancel" button in footer only
            this.modalApi.registerButton('cancel', {
                locations: ['footer'],
                label: 'Отмена',
                variant: 'secondary',
                classesAdd: { root: 'me-auto' },
                onClick: () => this.handleCancel()
            });

            // "Export" button in header only
            this.modalApi.registerButton('export', {
                locations: ['header'],
                label: 'Экспорт',
                variant: 'outline-primary',
                icon: 'fas fa-download',
                tooltipIcon: 'Экспорт данных', // Tooltip for icon button
                onClick: () => this.handleExport()
            });
        }
    },

    beforeUnmount() {
        // Remove buttons on unmount
        if (this.modalApi) {
            this.modalApi.removeButton('save');
            this.modalApi.removeButton('cancel');
            this.modalApi.removeButton('export');
        }
    }
};

