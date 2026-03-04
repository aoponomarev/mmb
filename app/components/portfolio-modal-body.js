/**
 * ================================================================================================
 * PORTFOLIO MODAL BODY COMPONENT - Modal body for portfolio create/edit
 * ================================================================================================
 *
 * PURPOSE: Integrate portfolio form with modal button management.
 *
 * @skill-anchor id:sk-add9a6 #for-classes-add-remove
 * @skill-anchor id:sk-eeb23d #for-bootstrap-event-proxying
 * @skill-anchor id:sk-cb75ec #for-utility-availability-check
 * Skill: id:sk-c3d639
 *
 * FEATURES:
 * - Form for create/edit portfolio (name, description, assets)
 * - Supports "Saved, close?" state for Save button
 * - Reactive button state updates on form data change
 * - Cancel logic (restore initial values)
 *
 * COMPONENT API:
 *
 * Props:
 * - name (String, required) — current portfolio name (v-model)
 * - description (String, default: '') — current portfolio description (v-model)
 * - assets (Array, default: []) — current portfolio assets (v-model)
 * - initialName (String, required) — initial name when modal opened
 * - initialDescription (String, default: '') — initial description when modal opened
 * - initialAssets (Array, default: []) — initial assets when modal opened
 * - isEditing (Boolean, default: false) — edit mode (true) or create (false)
 * - onSave (Function, required) — save callback (name, description, assets)
 * - onCancel (Function, required) — cancel callback
 *
 * Inject:
 * - modalApi — API for managing buttons (provided by cmp-modal)
 *
*/

window.portfolioModalBody = {
    template: `
        <form @submit.prevent="handleSave">
            <div class="mb-3">
                <label :for="formIdPrefix + '-portfolio-name'" class="form-label">Название portfolioя *</label>
                <input
                    type="text"
                    class="form-control"
                    :id="formIdPrefix + '-portfolio-name'"
                    v-model="formName"
                    required
                    placeholder="Введите название portfolioя"
                />
            </div>
            <div class="mb-3">
                <label :for="formIdPrefix + '-portfolio-description'" class="form-label">Описание</label>
                <textarea
                    class="form-control"
                    :id="formIdPrefix + '-portfolio-description'"
                    v-model="formDescription"
                    rows="3"
                    placeholder="Введите описание portfolioя (необязательно)"
                ></textarea>
            </div>
            <div class="mb-3">
                <label class="form-label">Активы portfolioя</label>
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
            formAssets: this.assets.map(asset => ({ ...asset })), // Deep copy
            isSaved: false // Successful save state
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
                // Ensure it's actually a new value
                if (JSON.stringify(this.formAssets) !== JSON.stringify(newVal)) {
                    this.formAssets = newVal.map(asset => ({ ...asset })); // Deep copy
                }
            },
            deep: true,
            immediate: false
        },
        initialName(newVal) {
            // On initialName change reset form if not saved
            if (!this.isSaved) {
                this.formName = newVal;
            }
        },
        initialDescription(newVal) {
            // On initialDescription change reset form if not saved
            if (!this.isSaved) {
                this.formDescription = newVal;
            }
        },
        initialAssets: {
            handler(newVal) {
                // On initialAssets change reset form if not saved
                if (!this.isSaved) {
                    this.formAssets = newVal.map(asset => ({ ...asset })); // Deep copy
                }
            },
            deep: true,
            immediate: false
        },
        formName() {
            this.$emit('update:name', this.formName);
            // Reset save state on field change
            if (this.isSaved) {
                this.isSaved = false;
            }
            this.updateSaveButton();
        },
        formDescription() {
            this.$emit('update:description', this.formDescription);
            // Reset save state on field change
            if (this.isSaved) {
                this.isSaved = false;
            }
            this.updateSaveButton();
        },
        formAssets: {
            handler() {
                this.$emit('update:assets', this.formAssets.map(asset => ({ ...asset }))); // Deep copy
                // Reset save state on field change
                if (this.isSaved) {
                    this.isSaved = false;
                }
                this.updateSaveButton();
            },
            deep: true
        }
    },

    computed: {
        // Unique prefix for form element IDs (avoid duplicates on modal reopen)
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
                // "Saved, close?" state
                this.modalApi.updateButton('save', {
                    label: 'Сохранено, закрыть?',
                    variant: 'success',
                    disabled: false
                });
            } else {
                // Normal "Save"/"Create" state
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
                // Restore initial values
                this.formName = this.initialName;
                this.formDescription = this.initialDescription;
                this.formAssets = this.initialAssets.map(asset => ({ ...asset })); // Deep copy
                this.$emit('update:name', this.initialName);
                this.$emit('update:description', this.initialDescription);
                this.$emit('update:assets', this.initialAssets.map(asset => ({ ...asset }))); // Deep copy
            } else {
                // Close modal
                this.onCancel();
            }
        },

        handleSave() {
            // If already saved - close modal
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

            if (!this.isFormValid) {
                return;
            }

            // Save data
            this.onSave(this.formName.trim(), this.formDescription.trim(), this.formAssets);

            // Switch button to "Saved, close?" state
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
        // Init form from props
        this.formName = this.name || this.initialName || '';
        this.formDescription = this.description || this.initialDescription || '';
        this.formAssets = (this.assets || this.initialAssets || []).map(asset => ({ ...asset }));

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

            // "Save"/"Create" button in footer only
            const saveLabel = this.isEditing ? 'Сохранить' : 'Создать';
            this.modalApi.registerButton('save', {
                locations: ['footer'],
                label: saveLabel,
                variant: 'primary',
                disabled: !this.isFormValid || !this.hasChanges,
                onClick: () => this.handleSave()
            });
        }

        // Update button state after init
        this.$nextTick(() => {
            this.updateSaveButton();
        });
    },

    beforeUnmount() {
        // Remove buttons on unmount
        if (this.modalApi) {
            this.modalApi.removeButton('cancel');
            this.modalApi.removeButton('save');
        }
    }
};
