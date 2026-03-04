/**
 * #JS-nr238Xj2
 * @description Timezone and translation language modal; cmp-timezone-selector; Cancel/Save via modalApi; inject modalApi.
 * @skill id:sk-e0b8f3
 * @skill-anchor id:sk-add9a6 #for-classes-add-remove
 * @skill-anchor id:sk-eeb23d #for-bootstrap-event-proxying
 * @skill-anchor id:sk-cb75ec #for-utility-availability-check
 *
 * Props: modelValue, initialValue, translationLanguage, initialTranslationLanguage, onSave, onCancel.
 */

window.timezoneModalBody = {
    template: `
        <div class="row g-3">
            <div class="col-md-6">
                <label :for="formIdPrefix + '-timezone-select'" class="form-label">Таймзона</label>
                <cmp-timezone-selector v-model="selectedTimezone" :id="formIdPrefix + '-timezone-select'"></cmp-timezone-selector>
            </div>
            <div class="col-md-6">
                <label :for="formIdPrefix + '-translation-language-select'" class="form-label">Язык перевода</label>
                <select
                    :id="formIdPrefix + '-translation-language-select'"
                    name="translation-language-select"
                    class="form-select"
                    v-model="selectedTranslationLanguage"
                    @change="$emit('update:translationLanguage', $event.target.value)">
                    <option
                        v-for="lang in supportedLanguages"
                        :key="lang.code"
                        :value="lang.code">
                        {{ lang.label }}
                    </option>
                </select>
            </div>
        </div>
    `,

    components: {
        'cmp-timezone-selector': window.cmpTimezoneSelector
    },

    inject: ['modalApi'],

    props: {
        modelValue: {
            type: String,
            required: true
        },
        initialValue: {
            type: String,
            required: true
        },
        translationLanguage: {
            type: String,
            default: 'ru'
        },
        initialTranslationLanguage: {
            type: String,
            default: 'ru'
        },
        onSave: {
            type: Function,
            required: true
        },
        onCancel: {
            type: Function,
            required: true
        },
        modalRef: {
            type: String,
            default: null
        }
    },

    data() {
        return {
            selectedTimezone: this.modelValue,
            selectedTranslationLanguage: this.translationLanguage,
            isSaved: false // Successful save state
        };
    },

    watch: {
        modelValue(newVal) {
            this.selectedTimezone = newVal;
        },
        translationLanguage(newVal) {
            this.selectedTranslationLanguage = newVal;
        },
        selectedTimezone(newVal) {
            this.$emit('update:modelValue', newVal);
            // Reset save state on field change
            if (this.isSaved) {
                this.isSaved = false;
            }
            this.updateSaveButton();
        },
        selectedTranslationLanguage(newVal) {
            this.$emit('update:translationLanguage', newVal);
            // Reset save state on field change
            if (this.isSaved) {
                this.isSaved = false;
            }
            this.updateSaveButton();
        }
    },

    computed: {
        // Unique prefix for form element IDs (avoid duplicates on modal reopen)
        formIdPrefix() {
            return `timezone-modal-${this._uid || Math.random().toString(36).substr(2, 9)}`;
        },
        supportedLanguages() {
            const list = window.i18nConfig?.SUPPORTED_LANGUAGES || ['ru', 'en'];
            const labels = window.i18nConfig?.LANGUAGE_LABELS || {};
            return list.map(code => ({
                code,
                label: labels[code] || code
            }));
        },
        hasChanges() {
            return this.selectedTimezone !== this.initialValue ||
                   this.selectedTranslationLanguage !== this.initialTranslationLanguage;
        }
    },

    methods: {
        updateSaveButton() {
            if (!this.modalApi) return;

            if (this.isSaved) {
                // "Saved, close?" state
                this.modalApi.updateButton('save', {
                    label: 'Сохранено, закрыть?',
                    variant: 'success',
                    disabled: false
                });
            } else {
                // Normal "Save" state
                const hasChanges = this.selectedTimezone !== this.initialValue ||
                                 this.selectedTranslationLanguage !== this.initialTranslationLanguage;
                this.modalApi.updateButton('save', {
                    label: 'Сохранить',
                    variant: 'primary',
                    disabled: !hasChanges
                });
            }
        },

        handleCancel() {
            if (this.hasChanges) {
                // Restore initial values
                this.selectedTimezone = this.initialValue;
                this.selectedTranslationLanguage = this.initialTranslationLanguage;
                this.$emit('update:modelValue', this.initialValue);
                this.$emit('update:translationLanguage', this.initialTranslationLanguage);
            } else {
                // Close modal
                this.onCancel();
            }
        },
        handleSave() {
            // If already saved - close modal via parent
            if (this.isSaved) {
                // Close modal via Bootstrap API
                const modalElement = this.$el.closest('.modal');
                if (modalElement && window.bootstrap && window.bootstrap.Modal) {
                    const modalInstance = window.bootstrap.Modal.getInstance(modalElement);
                    if (modalInstance) {
                        // Remove focus before close
                        if (document.activeElement && document.activeElement.blur) {
                            document.activeElement.blur();
                        }
                        modalInstance.hide();
                    }
                }
                return;
            }

            // Save data
            this.onSave(this.selectedTimezone, this.selectedTranslationLanguage);

            // Switch button to "Saved, close?" state
            this.isSaved = true;
            this.updateSaveButton();
        }
    },

    mounted() {
        // Register buttons on mount
        if (this.modalApi) {
            // "Cancel" button in footer only
            this.modalApi.registerButton('cancel', {
                locations: ['footer'],
                label: 'Отмена',
                variant: 'secondary',
                classesAdd: { root: 'me-auto' },
                onClick: () => this.handleCancel()
            });

            // "Save" button in footer only
            this.modalApi.registerButton('save', {
                locations: ['footer'],
                label: 'Сохранить',
                variant: 'primary',
                disabled: !this.hasChanges,
                onClick: () => this.handleSave()
            });
        }
    },

    beforeUnmount() {
        // Remove buttons on unmount
        if (this.modalApi) {
            this.modalApi.removeButton('cancel');
            this.modalApi.removeButton('save');
        }
    }
};

