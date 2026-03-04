/**
 * ================================================================================================
 * COIN SET SAVE MODAL BODY COMPONENT - Coin set save modal body component
 * ================================================================================================
 *
 * PURPOSE: Form for saving selected coins into a named set.
 *
 * @skill-anchor app/skills/component-classes-management #for-classes-add-remove
 * @skill-anchor app/skills/bootstrap-vue-integration #for-bootstrap-event-proxying
 * @skill-anchor app/skills/vue-implementation-patterns #for-utility-availability-check
 * Skill: app/skills/ux-principles
 *
 * FEATURES:
 * - Form for entering coin set name
 * - Registers "Cancel" and "Save" buttons via modalApi
 * - Reactively updates button state on form data change
 * - Manages cancel logic (restore initial values)
 * - Supports "Saved, close?" state for "Save" button
 *
 * COMPONENT API:
 *
 * Props:
 * - selectedCoinIds (Array, required) — array of selected coin IDs
 * - onSave (Function, required) — save callback (name, description, coinIds)
 * - onCancel (Function, required) — cancel callback
 *
 * Inject:
 * - modalApi — API for managing buttons (provided by cmp-modal)
 *
*/

window.coinSetSaveModalBody = {
    template: `
        <form @submit.prevent="handleSave">
            <div class="mb-3">
                <label :for="formIdPrefix + '-coin-set-name'" class="form-label">Название набора *</label>
                <input
                    type="text"
                    class="form-control"
                    :id="formIdPrefix + '-coin-set-name'"
                    v-model="formName"
                    required
                    placeholder="Введите название набора монет"
                    @input="handleFormChange"
                />
            </div>
            <div class="mb-3">
                <label :for="formIdPrefix + '-coin-set-description'" class="form-label">Описание</label>
                <textarea
                    class="form-control"
                    :id="formIdPrefix + '-coin-set-description'"
                    v-model="formDescription"
                    rows="3"
                    placeholder="Введите описание набора (необязательно)"
                    @input="handleFormChange"
                ></textarea>
            </div>
            <div class="mb-3">
                <small class="text-muted">
                    Будет сохранено монет: <strong>{{ selectedCoinIds.length }}</strong>
                </small>
            </div>
        </form>
    `,

    inject: ['modalApi'],

    props: {
        selectedCoinIds: {
            type: Array,
            required: true
        },
        coins: {
            type: Array,
            required: true,
            default: () => []
        },
        onSave: {
            type: Function,
            required: true
        },
        onCancel: {
            type: Function,
            required: true
        },
        onSaveToDraft: {
            type: Function,
            required: false
        },
        onOpenAuth: {
            type: Function,
            required: false
        }
    },

    data() {
        return {
            formName: '',
            formDescription: '',
            initialName: '',
            initialDescription: '',
            isSaved: false,
            formIdPrefix: `coin-set-save-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            // Use centralized state from auth-state (SSOT)
            authState: window.authState ? window.authState.getState() : null
        };
    },

    computed: {
        /**
         * Check user auth (reactive property)
         */
        isAuthenticated() {
            return this.authState ? this.authState.isAuthenticated === true : false;
        }
    },

    watch: {
        /**
         * Watch auth changes to update button state
         */
        isAuthenticated() {
            this.$nextTick(() => {
                this.updateSaveButton();
            });
        }
    },

    mounted() {
        // Store initial values
        this.initialName = this.formName;
        this.initialDescription = this.formDescription;

        // Register buttons
        this.registerButtons();

        // Validate form
        this.updateSaveButton();
        this.updateDraftButton();

        // Watch selected coins changes to update Draft button
        this.$watch('selectedCoinIds', () => {
            this.updateDraftButton();
        }, { deep: true });

        // Subscribe to auth events
        if (window.eventBus) {
            this.authStateUnsubscribe = window.eventBus.on('auth-state-changed', (eventData) => {
                console.log('coin-set-save-modal-body: auth-state-changed event, isAuthenticated:', eventData?.isAuthenticated);
                // Update button state on auth change
                this.updateSaveButton();
            });
        }
    },

    beforeUnmount() {
        // Unsubscribe from events
        if (this.authStateUnsubscribe && window.eventBus) {
            window.eventBus.off('auth-state-changed', this.authStateUnsubscribe);
        }
    },

    methods: {
        /**
         * Register modal buttons
         */
        registerButtons() {
            if (!this.modalApi) return;

            // "Cancel" button (left in footer)
            this.modalApi.registerButton('cancel', {
                label: 'Отмена',
                variant: 'secondary',
                locations: ['footer'],
                classesAdd: { root: 'me-auto' },
                onClick: () => this.handleCancel()
            });

            // "Save to Draft" button (local, no auth)
            this.modalApi.registerButton('saveToDraft', {
                label: 'Сохранить в Draft',
                variant: 'info',
                locations: ['footer'],
                disabled: false,
                onClick: () => this.handleSaveToDraft()
            });

            // "Save" or "Authorize" button (toggles by auth)
            this.modalApi.registerButton('save', {
                label: 'Сохранить',
                variant: 'primary',
                locations: ['footer'],
                disabled: true,
                onClick: () => this.handleSave()
            });

            // "Authorize" button (shown when user not authenticated)
            this.modalApi.registerButton('auth', {
                label: 'Авторизоваться',
                variant: 'primary',
                locations: ['footer'],
                disabled: false,
                visible: false, // Hidden by default
                onClick: () => this.handleOpenAuth()
            });
        },

        /**
         * Handle form changes
         */
        handleFormChange() {
            if (this.isSaved) {
                this.isSaved = false;
                this.updateSaveButton();
            } else {
                this.updateSaveButton();
            }
            this.updateDraftButton();
        },

        /**
         * Update "Save to Draft" button state
         */
        updateDraftButton() {
            if (!this.modalApi) return;

            if (this.selectedCoinIds.length === 0) {
                this.modalApi.updateButton('saveToDraft', {
                    label: 'Сохранить в Draft',
                    variant: 'info',
                    disabled: true,
                    visible: true
                });
                return;
            }

            // Get current Draft set from localStorage
            const draftSet = window.draftCoinSet ? window.draftCoinSet.get() : null;
            const existingCoinIds = draftSet && draftSet.coin_ids ? new Set(draftSet.coin_ids) : new Set();

            // Check which selected coins already exist in Draft
            // Use this.coins (from props) for full coin data (SSOT)
            const newCoinIds = this.selectedCoinIds.filter(id => !existingCoinIds.has(id));
            const allExist = newCoinIds.length === 0;

            if (allExist) {
                // All coins already in Draft
                this.modalApi.updateButton('saveToDraft', {
                    label: 'Есть в Draft',
                    variant: 'secondary',
                    disabled: true,
                    visible: true
                });
            } else {
                // New coins to add
                this.modalApi.updateButton('saveToDraft', {
                    label: `+ ${newCoinIds.length} to Draft`,
                    variant: 'info',
                    disabled: false,
                    visible: true
                });
            }
        },

        /**
         * Update "Save" or "Authorize" button state
         */
        updateSaveButton() {
            if (!this.modalApi) return;

            const hasChanges = this.formName !== this.initialName || this.formDescription !== this.initialDescription;
            const isValid = this.formName.trim().length > 0 && this.selectedCoinIds.length > 0;

            if (this.isAuthenticated) {
                // User authenticated - show "Save" button
                if (this.isSaved) {
                    this.modalApi.updateButton('save', {
                        label: 'Сохранено, закрыть?',
                        variant: 'success',
                        disabled: false,
                        visible: true
                    });
                    this.modalApi.updateButton('auth', {
                        visible: false
                    });
                } else {
                    this.modalApi.updateButton('save', {
                        label: 'Сохранить',
                        variant: 'primary',
                        disabled: !hasChanges || !isValid,
                        visible: true
                    });
                    this.modalApi.updateButton('auth', {
                        visible: false
                    });
                }
            } else {
                // User not authenticated - show "Authorize" button
                this.modalApi.updateButton('save', {
                    visible: false
                });
                this.modalApi.updateButton('auth', {
                    label: 'Авторизоваться',
                    variant: 'primary',
                    disabled: false,
                    visible: true
                });
            }
        },

        /**
         * Handle save to Draft (local, no auth)
         * Adds selected coins to existing Draft set
         */
        async handleSaveToDraft() {
            if (this.selectedCoinIds.length === 0) {
                if (window.messagesStore) {
                    window.messagesStore.addMessage({
                        type: 'warning',
                        text: 'Нет монет for сохранения в Draft',
                        scope: 'global',
                        duration: 3000
                    });
                }
                return;
            }

            try {
                // Get current Draft set from localStorage
                const draftSet = window.draftCoinSet ? window.draftCoinSet.get() : null;
                const existingCoinIds = draftSet && draftSet.coin_ids ? new Set(draftSet.coin_ids) : new Set();
                const existingCoinsMap = new Map();

                if (draftSet && draftSet.coins && Array.isArray(draftSet.coins)) {
                    draftSet.coins.forEach(coin => {
                        existingCoinsMap.set(coin.id, coin);
                    });
                }

            // Find new coins (not yet in Draft)
                const newCoinIds = this.selectedCoinIds.filter(id => !existingCoinIds.has(id));

                if (newCoinIds.length === 0) {
                    // All coins already in Draft
                    if (window.messagesStore) {
                        window.messagesStore.addMessage({
                            type: 'info',
                            text: 'Все выбранные монеты уже есть в Draft',
                            scope: 'global',
                            duration: 3000
                        });
                    }
                    return;
                }

            // Get full coin data from props (SSOT)
            const fullCoinsData = this.coins ?
                this.coins.filter(coin => newCoinIds.includes(coin.id)) :
                [];

                // Merge existing and new coins
                const allCoinIds = Array.from(new Set([...Array.from(existingCoinIds), ...newCoinIds]));
                const allCoinsData = [];

                // Add existing coins
                existingCoinsMap.forEach(coin => {
                    allCoinsData.push(coin);
                });

                // Add new coins
                fullCoinsData.forEach(coin => {
                    if (!existingCoinsMap.has(coin.id)) {
                        allCoinsData.push(coin);
                    }
                });

            if (this.onSaveToDraft) {
                    await this.onSaveToDraft({
                        coin_ids: allCoinIds,
                        coins: allCoinsData
                    });
                } else if (window.draftCoinSet) {
                    // Fallback: direct save via utility
                    window.draftCoinSet.save(allCoinIds, allCoinsData);

                    if (window.messagesStore) {
                        window.messagesStore.addMessage({
                            type: 'success',
                            text: `Добавлено ${newCoinIds.length} монет в Draft (всего: ${allCoinIds.length})`,
                            scope: 'global',
                            duration: 3000
                        });
                    }

                    // Update Draft set in load modal (if open)
                    if (window.eventBus) {
                        window.eventBus.emit('draft-set-updated');
                    }
                }

                // Update button state
                this.updateDraftButton();

                // Обновляем Draft набор в модальном окне загрузки (если оно открыто)
                if (window.eventBus) {
                    window.eventBus.emit('draft-set-updated');
                }
            } catch (error) {
                console.error('coin-set-save-modal-body: error saving to Draft:', error);
                if (window.messagesStore) {
                    window.messagesStore.addMessage({
                        type: 'danger',
                        text: `Ошибка сохранения в Draft: ${error.message || 'Неизвестная ошибка'}`,
                        scope: 'global',
                        duration: 5000
                    });
                }
            }
        },

        /**
         * Handle save
         */
        async handleSave() {
            if (this.isSaved) {
                // Second click after save - close modal via callback
                this.onCancel();
                return;
            }

            if (!this.formName.trim() || this.selectedCoinIds.length === 0) {
                return;
            }

            try {
                // Get full coin data from parent component
                // Needed so full data is available when set is loaded
                const fullCoinsData = this.$parent.coins ?
                    this.$parent.coins.filter(coin => this.selectedCoinIds.includes(coin.id)) :
                    [];

                await this.onSave({
                    name: this.formName.trim(),
                    description: this.formDescription.trim() || null,
                    coin_ids: this.selectedCoinIds,
                    coins: fullCoinsData // Pass full coin data
                });

                this.isSaved = true;
                this.updateSaveButton();
            } catch (error) {
                console.error('coin-set-save-modal-body: save error:', error);
                // TODO: Show error via message system
                throw error; // Re-throw for parent to handle
            }
        },

        /**
         * Initiate Google OAuth authorization
         * Same approach as auth-modal-body and coin-set-load-modal-body (SSOT)
         */
        async handleOpenAuth() {
            try {
                if (!window.authClient || !window.authState) {
                    console.error('coin-set-save-modal-body: authClient or authState not loaded');
                    return;
                }

                // Set loading state in centralized store
                window.authState.setLoading(true);

                // Initiate Google OAuth (SSOT: same method as auth-modal-body)
                window.authClient.initiateGoogleAuth();

                // Handle postMessage from OAuth callback popup (SSOT: same as auth-modal-body)
                const handleOAuthMessage = async (event) => {
                    if (event.data && event.data.type === 'oauth-callback' && event.data.success) {
                        try {
                            const tokenData = event.data.token;

                            if (tokenData && tokenData.access_token) {
                                // Save token via auth-client
                                if (window.authClient && window.authClient.saveToken) {
                                    await window.authClient.saveToken(tokenData);
                                }

                                // Update centralized auth state (syncs all instances)
                                // Check auth status via auth-state
                                if (window.authState && typeof window.authState.checkAuthStatus === 'function') {
                                    await window.authState.checkAuthStatus();
                                }

                                // Remove handler after successful auth
                                window.removeEventListener('message', handleOAuthMessage);
                            }
                        } catch (error) {
                            console.error('coin-set-save-modal-body.handleOAuthMessage error:', error);
                        } finally {
                            window.authState.setLoading(false);
                            // Update button state after auth
                            this.updateSaveButton();
                        }
                    }
                };

                window.addEventListener('message', handleOAuthMessage);

                // Timeout to remove handler (if popup closed without auth)
                setTimeout(() => {
                    window.removeEventListener('message', handleOAuthMessage);
                    window.authState.setLoading(false);
                    this.updateSaveButton();
                }, 5 * 60 * 1000); // 5 minutes

            } catch (error) {
                console.error('coin-set-save-modal-body.handleOpenAuth error:', error);
                if (window.authState) {
                    window.authState.setLoading(false);
                }
                this.updateSaveButton();
                if (window.errorHandler) {
                    window.errorHandler.handleError(error, {
                        context: 'coin-set-save-modal-body.handleOpenAuth',
                        userMessage: 'Ошибка при инициации авторизации'
                    });
                }
            }
        },

        /**
         * Handle cancel
         */
        handleCancel() {
            if (this.formName !== this.initialName || this.formDescription !== this.initialDescription) {
                // Restore initial values
                this.formName = this.initialName;
                this.formDescription = this.initialDescription;
                this.isSaved = false;
                this.updateSaveButton();
            } else {
                // Close modal via callback
                this.onCancel();
            }
        }
    }
};
