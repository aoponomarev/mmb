/**
 * ================================================================================================
 * AUTH MODAL BODY COMPONENT - Компонент body модального окна авторизации
 * ================================================================================================
 *
 * ЦЕЛЬ: Компонент для отображения состояния авторизации и управления авторизацией через Google OAuth.
 *
 * Skill: a/skills/app/skills/integrations/integrations-oauth-file-protocol.md
 *
 * ОСОБЕННОСТИ:
 * - Отображение текущего состояния авторизации (авторизован/не авторизован)
 * - Отображение информации о пользователе (имя, email)
 * - Регистрирует кнопки "Авторизоваться" и "Выйти" через modalApi
 * - Использует auth-client для авторизации и выхода
 * - Использует централизованное состояние из auth-state для синхронизации между всеми экземплярами
 * - Реактивно обновляет состояние при изменении авторизации (все экземпляры синхронизируются автоматически)
 *
 * API КОМПОНЕНТА:
 *
 * Props:
 * - onLoginSuccess (Function, optional) — функция, вызываемая после успешного входа
 * - onLogoutSuccess (Function, optional) — функция, вызываемая после успешного выхода
 *
 * Inject:
 * - modalApi — API для управления кнопками (предоставляется cmp-modal)
 *
 * ССЫЛКИ:
 * - OAuth клиент: core/api/cloudflare/auth-client.js
 * - Централизованное состояние: core/state/auth-state.js
 * - Система управления кнопками: shared/components/modal.js
 */

window.authModalBody = {
    template: '#auth-modal-body-template',

    inject: ['modalApi'],

    props: {
        onLoginSuccess: {
            type: Function,
            default: null
        },
        onLogoutSuccess: {
            type: Function,
            default: null
        }
    },

    data() {
        return {
            // Используем централизованное состояние из auth-state (единый источник правды)
            authState: window.authState ? window.authState.getState() : null
        };
    },

    computed: {
        uiState() {
            return window.uiState ? window.uiState.getState() : null;
        },
        /**
         * Отображаемое имя пользователя
         * @returns {string}
         */
        userDisplayName() {
            if (!this.authState || !this.authState.user) return 'Пользователь';
            return this.authState.user.name || this.authState.user.email || 'Пользователь';
        },

        /**
         * Локальные алиасы для удобства (прямой доступ к свойствам authState)
         */
        isAuthenticated() {
            return this.authState ? this.authState.isAuthenticated : false;
        },
        isLoading() {
            return this.uiState ? this.uiState.auth.isLoading : false;
        },
        user() {
            return this.authState ? this.authState.user : null;
        }
    },

    watch: {
        // Отслеживаем изменения в централизованном состоянии и обновляем кнопки
        'authState.isAuthenticated'(newVal, oldVal) {
            this.updateButtons();
        },
        // Отслеживаем изменения isLoading для обновления disabled состояния кнопок
        'uiState.auth.isLoading'(newVal, oldVal) {
            this.updateButtons();
        }
    },

    methods: {
        /**
         * Проверка состояния авторизации через централизованное хранилище
         * Обновляет состояние для всех экземпляров компонента автоматически
         */
        async checkAuthStatus() {
            if (!window.authState) {
                console.warn('auth-modal-body: authState не загружен');
                return;
            }

            // Централизованная проверка через auth-state (обновит состояние для всех экземпляров)
            await window.authState.checkAuthStatus();
        },

        /**
         * Обновление состояния кнопок в зависимости от авторизации
         */
        updateButtons() {
            if (!this.modalApi) return;

            // Проверяем существование кнопок перед обновлением
            const hasLoginButton = this.modalApi.getButton('login') !== undefined;
            const hasLogoutButton = this.modalApi.getButton('logout') !== undefined;

            // Если кнопки не зарегистрированы (модальное окно не смонтировано), выходим
            if (!hasLoginButton || !hasLogoutButton) {
                return;
            }

            if (this.isAuthenticated) {
                // Показываем только кнопку "Выйти"
                this.modalApi.updateButton('login', {
                    visible: false
                });
                this.modalApi.updateButton('logout', {
                    visible: true,
                    disabled: this.isLoading
                });
            } else {
                // Показываем только кнопку "Авторизоваться"
                this.modalApi.updateButton('login', {
                    visible: true,
                    disabled: this.isLoading
                });
                this.modalApi.updateButton('logout', {
                    visible: false
                });
            }
        },

        /**
         * Обработка авторизации
         */
        async handleLogin() {
            try {
                if (!window.authClient || !window.authState) {
                    console.error('auth-modal-body: authClient или authState не загружен');
                    return;
                }

                // Устанавливаем состояние загрузки в централизованное хранилище
                window.authState.setLoading(true);
                this.updateButtons();
                this._authInProgress = true;

                // Инициируем авторизацию через Google OAuth
                window.authClient.initiateGoogleAuth();

                // Обработка postMessage от popup окна OAuth callback
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
                                await this.checkAuthStatus();

                                // Вызываем callback если передан
                                if (this.onLoginSuccess) {
                                    this.onLoginSuccess(tokenData);
                                }

                                // Удаляем обработчик после успешной авторизации
                                window.removeEventListener('message', handleOAuthMessage);
                                this._authInProgress = false;
                            }
                        } catch (error) {
                            console.error('auth-modal-body.handleOAuthMessage error:', error);
                        } finally {
                            window.authState.setLoading(false);
                            this.updateButtons();
                        }
                    }
                };

                this._oauthMessageHandler = handleOAuthMessage;
                window.addEventListener('message', handleOAuthMessage);

                // Таймаут для удаления обработчика (на случай если окно закрыто без авторизации)
                setTimeout(() => {
                    window.removeEventListener('message', handleOAuthMessage);
                    this._authInProgress = false;
                    window.authState.setLoading(false);
                    this.updateButtons();
                }, 5 * 60 * 1000); // 5 минут

            } catch (error) {
                console.error('auth-modal-body.handleLogin error:', error);
                window.authState.setLoading(false);
                this.updateButtons();
                if (window.errorHandler) {
                    window.errorHandler.handleError(error, {
                        context: 'auth-modal-body.handleLogin',
                        userMessage: 'Ошибка при инициации авторизации'
                    });
                }
            }
        },

        /**
         * Обработка выхода
         */
        async handleLogout() {
            try {
                if (!window.authClient || !window.authState) {
                    console.error('auth-modal-body: authClient или authState не загружен');
                    return;
                }

                // Устанавливаем состояние загрузки в централизованное хранилище
                window.authState.setLoading(true);
                this.updateButtons();

                await window.authClient.logout();

                // Очищаем централизованное состояние (синхронизирует все экземпляры)
                window.authState.clearAuthState();

                // Вызываем callback если передан
                if (this.onLogoutSuccess) {
                    this.onLogoutSuccess();
                }

                // Обновляем кнопки
                this.updateButtons();
            } catch (error) {
                console.error('auth-modal-body.handleLogout error:', error);
                // Даже при ошибке обновляем состояние
                window.authState.clearAuthState();
                this.updateButtons();
                if (this.onLogoutSuccess) {
                    this.onLogoutSuccess();
                }
            } finally {
                window.authState.setLoading(false);
                this.updateButtons();
            }
        }
    },

    async mounted() {
        // Регистрируем кнопки ПЕРЕД проверкой авторизации
        if (this.modalApi) {
            // Кнопка "Авторизоваться" в footer
            this.modalApi.registerButton('login', {
                locations: ['footer'],
                label: 'Авторизоваться',
                variant: 'primary',
                disabled: this.isLoading,
                visible: !this.isAuthenticated,
                onClick: () => this.handleLogin()
            });

            // Кнопка "Выйти" в footer (слева, как "Отмена")
            this.modalApi.registerButton('logout', {
                locations: ['footer'],
                label: 'Выйти',
                variant: 'secondary',
                classesAdd: { root: 'me-auto' },
                disabled: this.isLoading,
                visible: this.isAuthenticated,
                onClick: () => this.handleLogout()
            });
        }

        // Проверяем состояние авторизации после регистрации кнопок
        await this.checkAuthStatus();

        const modalElement = this.$el.closest('.modal');
        if (modalElement) {
            this._onModalHidden = () => {
                if (this._authInProgress) {
                    if (this._oauthMessageHandler) {
                        window.removeEventListener('message', this._oauthMessageHandler);
                    }
                    this._authInProgress = false;
                    window.authState.setLoading(false);
                    this.updateButtons();
                }
            };
            modalElement.addEventListener('hidden.bs.modal', this._onModalHidden);
        }
    },

    beforeUnmount() {
        // Удаляем кнопки при размонтировании
        if (this.modalApi) {
            this.modalApi.removeButton('login');
            this.modalApi.removeButton('logout');
        }
        const modalElement = this.$el.closest('.modal');
        if (modalElement && this._onModalHidden) {
            modalElement.removeEventListener('hidden.bs.modal', this._onModalHidden);
        }
        if (this._oauthMessageHandler) {
            window.removeEventListener('message', this._oauthMessageHandler);
        }
    }
};
