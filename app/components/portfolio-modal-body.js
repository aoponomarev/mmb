/**
 * ================================================================================================
 * PORTFOLIO MODAL BODY COMPONENT - Компонент body модального окна создания/редактирования портфеля
 * ================================================================================================
 *
 * PURPOSE: Интеграция формы портфеля с системой управления кнопками модального окна.
 * Skill: core/skills/domain-portfolio
 *
 * ОСОБЕННОСТИ:
 * - Форма for создания/редактирования портфеля (название, описание, активы)
 * - Поддерживает состояние "Сохранено, закрыть?" for кнопки "Сохранить"
 * - Реактивно обновляет состояние кнопок при изменении данных формы
 * - Управляет логикой отмены (восстановление исходных значений)
 * - Поддерживает состояние "Сохранено, закрыть?" for кнопки "Сохранить"
 *
 * API КОМПОНЕНТА:
 *
 * Props:
 * - name (String, required) — текущее название портфеля (v-model)
 * - description (String, default: '') — текущее описание портфеля (v-model)
 * - assets (Array, default: []) — текущие активы портфеля (v-model)
 * - initialName (String, required) — исходное название при открытии модального окна
 * - initialDescription (String, default: '') — исходное описание при открытии модального окна
 * - initialAssets (Array, default: []) — исходные активы при открытии модального окна
 * - isEditing (Boolean, default: false) — режим редактирования (true) или создания (false)
 * - onSave (Function, required) — функция сохранения (name, description, assets)
 * - onCancel (Function, required) — функция отмены
 *
 * Inject:
 * - modalApi — API for managing кнопками (предоставляется cmp-modal)
 *
 * REFERENCES:
 * - Система управления кнопками: shared/components/modal.js
 * - Компонент кнопки: shared/components/button.js
 */

window.portfolioModalBody = {
    template: `
        <form @submit.prevent="handleSave">
            <div class="mb-3">
                <label :for="formIdPrefix + '-portfolio-name'" class="form-label">Название портфеля *</label>
                <input
                    type="text"
                    class="form-control"
                    :id="formIdPrefix + '-portfolio-name'"
                    v-model="formName"
                    required
                    placeholder="Введите название портфеля"
                />
            </div>
            <div class="mb-3">
                <label :for="formIdPrefix + '-portfolio-description'" class="form-label">Описание</label>
                <textarea
                    class="form-control"
                    :id="formIdPrefix + '-portfolio-description'"
                    v-model="formDescription"
                    rows="3"
                    placeholder="Введите описание портфеля (необязательно)"
                ></textarea>
            </div>
            <div class="mb-3">
                <label class="form-label">Активы портфеля</label>
                <div v-if="formAssets && formAssets.length > 0" class="mb-2">
                    <div
                        v-for="(asset, index) in formAssets"
                        :key="index"
                        class="d-flex align-items-center gap-2 mb-2"
                    >
                        <input
                            type="text"
                            class="form-control form-control-sm"
                            v-model="asset.coinId"
                            placeholder="ID монеты"
                        />
                        <input
                            type="number"
                            class="form-control form-control-sm"
                            v-model.number="asset.weight"
                            placeholder="Вес (0-1)"
                            min="0"
                            max="1"
                            step="0.01"
                        />
                        <cmp-button
                            label=""
                            icon="fas fa-times"
                            variant="outline-danger"
                            size="sm"
                            @click="removeAsset(index)"
                            :button-id="formIdPrefix + '-remove-asset-' + index"
                        />
                    </div>
                </div>
                <cmp-button
                    label="Добавить актив"
                    icon="fas fa-plus"
                    variant="outline-primary"
                    size="sm"
                    @click="addAsset"
                    :button-id="formIdPrefix + '-add-asset-button'"
                />
            </div>
        </form>
    `,

    components: {
        'cmp-button': window.cmpButton
    },

    inject: ['modalApi'],

    props: {
        name: {
            type: String,
            required: true
        },
        description: {
            type: String,
            default: ''
        },
        assets: {
            type: Array,
            default: () => []
        },
        initialName: {
            type: String,
            required: true
        },
        initialDescription: {
            type: String,
            default: ''
        },
        initialAssets: {
            type: Array,
            default: () => []
        },
        isEditing: {
            type: Boolean,
            default: false
        },
        onSave: {
            type: Function,
            required: true
        },
        onCancel: {
            type: Function,
            required: true
        }
    },

    data() {
        return {
            formName: this.name,
            formDescription: this.description,
            formAssets: this.assets.map(asset => ({ ...asset })), // Глубокое копирование
            isSaved: false // Состояние успешного сохранения
        };
    },

    watch: {
        name(newVal) {
            if (this.formName !== newVal) {
                this.formName = newVal;
            }
        },
        description(newVal) {
            if (this.formDescription !== newVal) {
                this.formDescription = newVal;
            }
        },
        assets: {
            handler(newVal) {
                // Проверяем, что это действительно новое значение
                if (JSON.stringify(this.formAssets) !== JSON.stringify(newVal)) {
                    this.formAssets = newVal.map(asset => ({ ...asset })); // Глубокое копирование
                }
            },
            deep: true,
            immediate: false
        },
        initialName(newVal) {
            // При изменении initialName сбрасываем форму, если она не была сохранена
            if (!this.isSaved) {
                this.formName = newVal;
            }
        },
        initialDescription(newVal) {
            // При изменении initialDescription сбрасываем форму, если она не была сохранена
            if (!this.isSaved) {
                this.formDescription = newVal;
            }
        },
        initialAssets: {
            handler(newVal) {
                // При изменении initialAssets сбрасываем форму, если она не была сохранена
                if (!this.isSaved) {
                    this.formAssets = newVal.map(asset => ({ ...asset })); // Глубокое копирование
                }
            },
            deep: true,
            immediate: false
        },
        formName() {
            this.$emit('update:name', this.formName);
            // Сбрасываем состояние сохранения при изменении полей
            if (this.isSaved) {
                this.isSaved = false;
            }
            this.updateSaveButton();
        },
        formDescription() {
            this.$emit('update:description', this.formDescription);
            // Сбрасываем состояние сохранения при изменении полей
            if (this.isSaved) {
                this.isSaved = false;
            }
            this.updateSaveButton();
        },
        formAssets: {
            handler() {
                this.$emit('update:assets', this.formAssets.map(asset => ({ ...asset }))); // Глубокое копирование
                // Сбрасываем состояние сохранения при изменении полей
                if (this.isSaved) {
                    this.isSaved = false;
                }
                this.updateSaveButton();
            },
            deep: true
        }
    },

    computed: {
        // Уникальный префикс for ID элементов формы (избегаем дублирования при повторном открытии модального окна)
        formIdPrefix() {
            return `portfolio-modal-${this._uid || Math.random().toString(36).substr(2, 9)}`;
        },
        hasChanges() {
            return this.formName.trim() !== (this.initialName || '').trim() ||
                   this.formDescription.trim() !== (this.initialDescription || '').trim() ||
                   JSON.stringify(this.formAssets) !== JSON.stringify(this.initialAssets || []);
        },
        isFormValid() {
            return this.formName && this.formName.trim().length > 0;
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
                // Обычное состояние "Сохранить"/"Создать"
                const label = this.isEditing ? 'Сохранить' : 'Создать';
                this.modalApi.updateButton('save', {
                    label: label,
                    variant: 'primary',
                    disabled: !this.isFormValid || !this.hasChanges
                });
            }
        },

        handleCancel() {
            if (this.hasChanges) {
                // Восстанавливаем исходные значения
                this.formName = this.initialName;
                this.formDescription = this.initialDescription;
                this.formAssets = this.initialAssets.map(asset => ({ ...asset })); // Глубокое копирование
                this.$emit('update:name', this.initialName);
                this.$emit('update:description', this.initialDescription);
                this.$emit('update:assets', this.initialAssets.map(asset => ({ ...asset }))); // Глубокое копирование
            } else {
                // Закрываем модальное окно
                this.onCancel();
            }
        },

        handleSave() {
            // Если уже сохранено - закрываем модальное окно
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

            if (!this.isFormValid) {
                return;
            }

            // Сохраняем данные
            this.onSave(this.formName.trim(), this.formDescription.trim(), this.formAssets);

            // Переводим кнопку в состояние "Сохранено, закрыть?"
            this.isSaved = true;
            this.updateSaveButton();
        },

        addAsset() {
            this.formAssets.push({
                coinId: '',
                weight: 0,
            });
        },

        removeAsset(index) {
            this.formAssets.splice(index, 1);
        }
    },

    mounted() {
        // Инициализируем форму из props
        this.formName = this.name || this.initialName || '';
        this.formDescription = this.description || this.initialDescription || '';
        this.formAssets = (this.assets || this.initialAssets || []).map(asset => ({ ...asset }));

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

            // Кнопка "Сохранить"/"Создать" только в footer
            const saveLabel = this.isEditing ? 'Сохранить' : 'Создать';
            this.modalApi.registerButton('save', {
                locations: ['footer'],
                label: saveLabel,
                variant: 'primary',
                disabled: !this.isFormValid || !this.hasChanges,
                onClick: () => this.handleSave()
            });
        }

        // Обновляем состояние кнопок после инициализации
        this.$nextTick(() => {
            this.updateSaveButton();
        });
    },

    beforeUnmount() {
        // Удаляем кнопки при размонтировании
        if (this.modalApi) {
            this.modalApi.removeButton('cancel');
            this.modalApi.removeButton('save');
        }
    }
};
