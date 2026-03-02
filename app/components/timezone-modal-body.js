/**
 * ================================================================================================
 * TIMEZONE MODAL BODY COMPONENT - Компонент body модального окна выбора таймзоны и языка перевода
 * ================================================================================================
 *
 * PURPOSE: Интеграция timezone-selector и выбора языка перевода с системой управления кнопками модального окна.
 *
 * @skill-anchor app/skills/component-classes-management #for-classes-add-remove
 * @skill-anchor app/skills/bootstrap-vue-integration #for-bootstrap-event-proxying
 * @skill-anchor app/skills/vue-implementation-patterns #for-utility-availability-check
 * Skill: app/skills/ux-principles
 *
 * ОСОБЕННОСТИ:
 * - Использует cmp-timezone-selector for выбора таймзоны
 * - Предоставляет выбор языка перевода новостей (10 языков)
 * - Регистрирует кнопки "Отмена" и "Сохранить" через modalApi
 * - Реактивно обновляет состояние кнопок при изменении таймзоны или языка перевода
 * - Управляет логикой отмены (восстановление исходных значений)
 * - Поддерживает состояние "Сохранено, закрыть?" for кнопки "Сохранить"
 *
 * API КОМПОНЕНТА:
 *
 * Props:
 * - modelValue (String, required) — текущая таймзона (v-model)
 * - initialValue (String, required) — исходная таймзона при открытии модального окна
 * - translationLanguage (String, default: 'ru') — текущий язык перевода (v-model)
 * - initialTranslationLanguage (String, default: 'ru') — исходный язык перевода при открытии модального окна
 * - onSave (Function, required) — функция сохранения (timezone, translationLanguage)
 * - onCancel (Function, required) — функция отмены
 *
 * Inject:
 * - modalApi — API for managing кнопками (предоставляется cmp-modal)
 *
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
            isSaved: false // Состояние успешного сохранения
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
            // Сбрасываем состояние сохранения при изменении полей
            if (this.isSaved) {
                this.isSaved = false;
            }
            this.updateSaveButton();
        },
        selectedTranslationLanguage(newVal) {
            this.$emit('update:translationLanguage', newVal);
            // Сбрасываем состояние сохранения при изменении полей
            if (this.isSaved) {
                this.isSaved = false;
            }
            this.updateSaveButton();
        }
    },

    computed: {
        // Уникальный префикс for ID элементов формы (избегаем дублирования при повторном открытии модального окна)
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
                // Состояние "Сохранено, закрыть?"
                this.modalApi.updateButton('save', {
                    label: 'Сохранено, закрыть?',
                    variant: 'success',
                    disabled: false
                });
            } else {
                // Обычное состояние "Сохранить"
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
                // Восстанавливаем исходные значения
                this.selectedTimezone = this.initialValue;
                this.selectedTranslationLanguage = this.initialTranslationLanguage;
                this.$emit('update:modelValue', this.initialValue);
                this.$emit('update:translationLanguage', this.initialTranslationLanguage);
            } else {
                // Закрываем модальное окно
                this.onCancel();
            }
        },
        handleSave() {
            // Если уже сохранено - закрываем модальное окно через родительский компонент
            if (this.isSaved) {
                // Закрываем модальное окно через Bootstrap API
                const modalElement = this.$el.closest('.modal');
                if (modalElement && window.bootstrap && window.bootstrap.Modal) {
                    const modalInstance = window.bootstrap.Modal.getInstance(modalElement);
                    if (modalInstance) {
                        // Убираем фокус перед закрытием
                        if (document.activeElement && document.activeElement.blur) {
                            document.activeElement.blur();
                        }
                        modalInstance.hide();
                    }
                }
                return;
            }

            // Сохраняем данные
            this.onSave(this.selectedTimezone, this.selectedTranslationLanguage);

            // Переводим кнопку в состояние "Сохранено, закрыть?"
            this.isSaved = true;
            this.updateSaveButton();
        }
    },

    mounted() {
        // Регистрируем кнопки при монтировании
        if (this.modalApi) {
            // Кнопка "Отмена" только в footer
            this.modalApi.registerButton('cancel', {
                locations: ['footer'],
                label: 'Отмена',
                variant: 'secondary',
                classesAdd: { root: 'me-auto' },
                onClick: () => this.handleCancel()
            });

            // Кнопка "Сохранить" только в footer
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
        // Удаляем кнопки при размонтировании
        if (this.modalApi) {
            this.modalApi.removeButton('cancel');
            this.modalApi.removeButton('save');
        }
    }
};

