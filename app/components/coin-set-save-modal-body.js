/**
 * ================================================================================================
 * COIN SET SAVE MODAL BODY COMPONENT - Компонент body модального окна сохранения набора монет
 * ================================================================================================
 *
 * PURPOSE: Форма for сохранения выбранных монет в набор с названием.
 *
 * @skill-anchor app/skills/component-classes-management #for-classes-add-remove
 * @skill-anchor app/skills/bootstrap-vue-integration #for-bootstrap-event-proxying
 * @skill-anchor app/skills/vue-implementation-patterns #for-utility-availability-check
 * Skill: app/skills/ux-principles
 *
 * ОСОБЕННОСТИ:
 * - Форма for ввода названия набора монет
 * - Регистрирует кнопки "Отмена" и "Сохранить" через modalApi
 * - Реактивно обновляет состояние кнопок при изменении данных формы
 * - Управляет логикой отмены (восстановление исходных значений)
 * - Поддерживает состояние "Сохранено, закрыть?" for кнопки "Сохранить"
 *
 * API КОМПОНЕНТА:
 *
 * Props:
 * - selectedCoinIds (Array, required) — массив ID выбранных монет
 * - onSave (Function, required) — функция сохранения (name, description, coinIds)
 * - onCancel (Function, required) — функция отмены
 *
 * Inject:
 * - modalApi — API for managing кнопками (предоставляется cmp-modal)
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
            // Используем централизованное состояние из auth-state (единый источник правды)
            authState: window.authState ? window.authState.getState() : null
        };
    },

    computed: {
        /**
         * Проверка авторизации пользователя (реактивное свойство)
         */
        isAuthenticated() {
            return this.authState ? this.authState.isAuthenticated === true : false;
        }
    },

    watch: {
        /**
         * Отслеживание изменения авторизации for обновления состояния кнопок
         */
        isAuthenticated() {
            this.$nextTick(() => {
                this.updateSaveButton();
            });
        }
    },

    mounted() {
        // Сохраняем исходные значения
        this.initialName = this.formName;
        this.initialDescription = this.formDescription;

        // Регистрируем кнопки
        this.registerButtons();

        // Проверяем валидность формы
        this.updateSaveButton();
        this.updateDraftButton();

        // Отслеживаем изменения выбранных монет for обновления кнопки Draft
        this.$watch('selectedCoinIds', () => {
            this.updateDraftButton();
        }, { deep: true });

        // Подписываемся на события авторизации
        if (window.eventBus) {
            this.authStateUnsubscribe = window.eventBus.on('auth-state-changed', (eventData) => {
                console.log('coin-set-save-modal-body: получено событие auth-state-changed, isAuthenticated:', eventData?.isAuthenticated);
                // Обновляем состояние кнопок при изменении авторизации
                this.updateSaveButton();
            });
        }
    },

    beforeUnmount() {
        // Отписываемся от событий
        if (this.authStateUnsubscribe && window.eventBus) {
            window.eventBus.off('auth-state-changed', this.authStateUnsubscribe);
        }
    },

    methods: {
        /**
         * Регистрация кнопок модального окна
         */
        registerButtons() {
            if (!this.modalApi) return;

            // Кнопка "Отмена" (слева в footer)
            this.modalApi.registerButton('cancel', {
                label: 'Отмена',
                variant: 'secondary',
                locations: ['footer'],
                classesAdd: { root: 'me-auto' },
                onClick: () => this.handleCancel()
            });

            // Кнопка "Сохранить в Draft" (локально, без авторизации)
            this.modalApi.registerButton('saveToDraft', {
                label: 'Сохранить в Draft',
                variant: 'info',
                locations: ['footer'],
                disabled: false,
                onClick: () => this.handleSaveToDraft()
            });

            // Кнопка "Сохранить" или "Авторизоваться" (переключается в зависимости от авторизации)
            this.modalApi.registerButton('save', {
                label: 'Сохранить',
                variant: 'primary',
                locations: ['footer'],
                disabled: true,
                onClick: () => this.handleSave()
            });

            // Кнопка "Авторизоваться" (показывается когда пользователь not authenticated)
            this.modalApi.registerButton('auth', {
                label: 'Авторизоваться',
                variant: 'primary',
                locations: ['footer'],
                disabled: false,
                visible: false, // По умолчанию скрыта
                onClick: () => this.handleOpenAuth()
            });
        },

        /**
         * Обработка изменений формы
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
         * Обновление состояния кнопки "Сохранить в Draft"
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

            // Получаем текущий Draft набор из localStorage
            const draftSet = window.draftCoinSet ? window.draftCoinSet.get() : null;
            const existingCoinIds = draftSet && draftSet.coin_ids ? new Set(draftSet.coin_ids) : new Set();

            // Проверяем, какие выбранные монеты уже есть в Draft
            // Используем this.coins (из props) for получения полных данных монет (ЕИП)
            const newCoinIds = this.selectedCoinIds.filter(id => !existingCoinIds.has(id));
            const allExist = newCoinIds.length === 0;

            if (allExist) {
                // Все монеты уже есть в Draft
                this.modalApi.updateButton('saveToDraft', {
                    label: 'Есть в Draft',
                    variant: 'secondary',
                    disabled: true,
                    visible: true
                });
            } else {
                // Есть новые монеты for добавления
                this.modalApi.updateButton('saveToDraft', {
                    label: `+ ${newCoinIds.length} to Draft`,
                    variant: 'info',
                    disabled: false,
                    visible: true
                });
            }
        },

        /**
         * Обновление состояния кнопки "Сохранить" или "Авторизоваться"
         */
        updateSaveButton() {
            if (!this.modalApi) return;

            const hasChanges = this.formName !== this.initialName || this.formDescription !== this.initialDescription;
            const isValid = this.formName.trim().length > 0 && this.selectedCoinIds.length > 0;

            if (this.isAuthenticated) {
                // Пользователь авторизован - показываем кнопку "Сохранить"
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
                // Пользователь НЕ авторизован - показываем кнопку "Авторизоваться"
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
         * Обработка сохранения в Draft (локально, без авторизации)
         * Добавляет выбранные монеты к существующему Draft набору
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
                // Получаем текущий Draft набор из localStorage
                const draftSet = window.draftCoinSet ? window.draftCoinSet.get() : null;
                const existingCoinIds = draftSet && draftSet.coin_ids ? new Set(draftSet.coin_ids) : new Set();
                const existingCoinsMap = new Map();

                if (draftSet && draftSet.coins && Array.isArray(draftSet.coins)) {
                    draftSet.coins.forEach(coin => {
                        existingCoinsMap.set(coin.id, coin);
                    });
                }

            // Находим новые монеты (которые еще не в Draft)
                const newCoinIds = this.selectedCoinIds.filter(id => !existingCoinIds.has(id));

                if (newCoinIds.length === 0) {
                    // Все монеты уже есть в Draft
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

            // Получаем полные данные новых монет из props (ЕИП: единый источник правды)
            const fullCoinsData = this.coins ?
                this.coins.filter(coin => newCoinIds.includes(coin.id)) :
                [];

            // Объединяем существующие и новые монеты
                const allCoinIds = Array.from(new Set([...Array.from(existingCoinIds), ...newCoinIds]));
                const allCoinsData = [];

                // Добавляем существующие монеты
                existingCoinsMap.forEach(coin => {
                    allCoinsData.push(coin);
                });

                // Добавляем новые монеты
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
                    // Fallback: прямое сохранение через утилиту
                    window.draftCoinSet.save(allCoinIds, allCoinsData);

                    if (window.messagesStore) {
                        window.messagesStore.addMessage({
                            type: 'success',
                            text: `Добавлено ${newCoinIds.length} монет в Draft (всего: ${allCoinIds.length})`,
                            scope: 'global',
                            duration: 3000
                        });
                    }

                    // Обновляем Draft набор в модальном окне загрузки (если оно открыто)
                    if (window.eventBus) {
                        window.eventBus.emit('draft-set-updated');
                    }
                }

                // Обновляем состояние кнопки
                this.updateDraftButton();

                // Обновляем Draft набор в модальном окне загрузки (если оно открыто)
                if (window.eventBus) {
                    window.eventBus.emit('draft-set-updated');
                }
            } catch (error) {
                console.error('coin-set-save-modal-body: ошибка сохранения в Draft:', error);
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
         * Обработка сохранения
         */
        async handleSave() {
            if (this.isSaved) {
                // Второй клик после сохранения - закрываем модальное окно через callback
                this.onCancel();
                return;
            }

            if (!this.formName.trim() || this.selectedCoinIds.length === 0) {
                return;
            }

            try {
                // Получаем полные данные монет из родительского компонента
                // Это нужно for того, чтобы при загрузке набора сразу были доступны полные данные
                const fullCoinsData = this.$parent.coins ?
                    this.$parent.coins.filter(coin => this.selectedCoinIds.includes(coin.id)) :
                    [];

                await this.onSave({
                    name: this.formName.trim(),
                    description: this.formDescription.trim() || null,
                    coin_ids: this.selectedCoinIds,
                    coins: fullCoinsData // Передаем полные данные монет
                });

                this.isSaved = true;
                this.updateSaveButton();
            } catch (error) {
                console.error('coin-set-save-modal-body: ошибка сохранения:', error);
                // TODO: Показать сообщение об ошибке через систему сообщений
                throw error; // Пробрасываем ошибку, чтобы родительский компонент мог обработать
            }
        },

        /**
         * Инициировать авторизацию через Google OAuth
         * Использует тот же подход, что и auth-modal-body и coin-set-load-modal-body (принцип ЕИП)
         */
        async handleOpenAuth() {
            try {
                if (!window.authClient || !window.authState) {
                    console.error('coin-set-save-modal-body: authClient или authState not loaded');
                    return;
                }

                // Устанавливаем состояние загрузки в централизованное хранилище
                window.authState.setLoading(true);

                // Инициируем авторизацию через Google OAuth (ЕИП: используем тот же метод, что и auth-modal-body)
                window.authClient.initiateGoogleAuth();

                // Обработка postMessage от popup окна OAuth callback (ЕИП: используем тот же подход, что и auth-modal-body)
                const handleOAuthMessage = async (event) => {
                    if (event.data && event.data.type === 'oauth-callback' && event.data.success) {
                        try {
                            const tokenData = event.data.token;

                            if (tokenData && tokenData.access_token) {
                                // Сохраняем токен через auth-client
                                if (window.authClient && window.authClient.saveToken) {
                                    await window.authClient.saveToken(tokenData);
                                }

                                // Обновляем централизованное состояние авторизации (синхронизирует все экземпляры)
                                // Проверяем статус авторизации через auth-state
                                if (window.authState && typeof window.authState.checkAuthStatus === 'function') {
                                    await window.authState.checkAuthStatus();
                                }

                                // Удаляем обработчик после успешной авторизации
                                window.removeEventListener('message', handleOAuthMessage);
                            }
                        } catch (error) {
                            console.error('coin-set-save-modal-body.handleOAuthMessage error:', error);
                        } finally {
                            window.authState.setLoading(false);
                            // Обновляем состояние кнопок после авторизации
                            this.updateSaveButton();
                        }
                    }
                };

                window.addEventListener('message', handleOAuthMessage);

                // Таймаут for удаления обработчика (на случай если окно закрыто без авторизации)
                setTimeout(() => {
                    window.removeEventListener('message', handleOAuthMessage);
                    window.authState.setLoading(false);
                    this.updateSaveButton();
                }, 5 * 60 * 1000); // 5 минут

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
         * Обработка отмены
         */
        handleCancel() {
            if (this.formName !== this.initialName || this.formDescription !== this.initialDescription) {
                // Восстанавливаем исходные значения
                this.formName = this.initialName;
                this.formDescription = this.initialDescription;
                this.isSaved = false;
                this.updateSaveButton();
            } else {
                // Закрываем модальное окно через callback
                this.onCancel();
            }
        }
    }
};
