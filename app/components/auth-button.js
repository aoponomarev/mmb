/**
 * ================================================================================================
 * AUTH BUTTON COMPONENT - Компонент кнопки авторизации и профиля пользователя
 * ================================================================================================
 *
 * PURPOSE: Vue-компонент for отображения кнопки входа через Google или профиля пользователя.
 *
 * @skill-anchor app/skills/component-classes-management #for-classes-add-remove
 * @skill-anchor app/skills/bootstrap-vue-integration #for-bootstrap-event-proxying
 * @skill-anchor app/skills/vue-implementation-patterns #for-utility-availability-check
 * Skill: app/skills/file-protocol-cors-guard
 *
 * API КОМПОНЕНТА:
 *
 * Props: нет
 *
 * Events:
 * - login-success — эмитируется после успешного входа
 * - logout-success — эмитируется после успешного logoutа
 *
*/

window.authButton = {
    template: '#auth-button-template',

    components: {
        'cmp-button': window.cmpButton,
        'cmp-dropdown': window.cmpDropdown,
        'dropdown-menu-item': window.cmpDropdownMenuItem,
    },

    data() {
        return {
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
            const user = this.authState ? this.authState.user : null;
            if (!user) return 'Пользователь';
            return user.name || user.email || 'Пользователь';
        },
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

    async mounted() {
        // Проверка состояния авторизации при монтировании
        await this.checkAuthStatus();

        // Обработка callback от Google OAuth (если есть code в URL)
        await this.handleAuthCallback();

        // Обработка postMessage от popup окна OAuth callback
        window.addEventListener('message', this.handleOAuthMessage);
    },

    beforeUnmount() {
        // Удаляем обработчик postMessage при размонтировании компонента
        window.removeEventListener('message', this.handleOAuthMessage);
    },

    methods: {
        /**
         * Проверка состояния авторизации
         */
        async checkAuthStatus() {
            try {
                if (!window.authClient) {
                    console.warn('auth-button: authClient not loaded');
                    return;
                }

                const authenticated = await window.authClient.isAuthenticated();

                if (authenticated) {
                    // Получаем данные пользователя
                    const user = await window.authClient.getCurrentUser();
                    // Единое состояние хранится в authState; локальные computed читают оттуда.
                    window.authState.setAuthState(user !== null, user);
                } else {
                    window.authState.clearAuthState();
                }
            } catch (error) {
                console.error('auth-button.checkAuthStatus error:', error);
                window.authState.clearAuthState();
            }
        },

        /**
         * Обработка callback от Google OAuth
         */
        async handleAuthCallback() {
            try {
                if (!window.authClient) {
                    return;
                }

                // Проверяем наличие code в URL
                const urlParams = new URLSearchParams(window.location.search);
                const code = urlParams.get('code');
                const state = urlParams.get('state');

                if (code && state) {
                    // Обрабатываем callback
                    if (window.authState) {
                        window.authState.setLoading(true);
                    }
                    const tokenData = await window.authClient.handleAuthCallback();

                    if (tokenData) {
                        // Обновляем состояние
                        await this.checkAuthStatus();
                        this.$emit('login-success', tokenData);
                    }
                }
            } catch (error) {
                console.error('auth-button.handleAuthCallback error:', error);
                if (window.errorHandler) {
                    window.errorHandler.handleError(error, {
                        context: 'auth-button.handleAuthCallback',
                        userMessage: 'Ошибка при обработке авторизации'
                    });
                }
            } finally {
                if (window.authState) {
                    window.authState.setLoading(false);
                }
            }
        },

        /**
         * Обработка postMessage от popup окна OAuth callback
         */
        async handleOAuthMessage(event) {
            // Проверяем, что сообщение от нашего Worker callback
            // Принимаем сообщения с любым origin, так как при file:// точный origin неизвестен
            if (event.data && event.data.type === 'oauth-callback' && event.data.success) {
                try {
                    const tokenData = event.data.token;

                    if (tokenData && tokenData.access_token) {
                        // Сохраняем токен через auth-client
                        if (window.authClient && window.authClient.saveToken) {
                            await window.authClient.saveToken(tokenData);
                        }

                        // Обновляем состояние авторизации
                        await this.checkAuthStatus();

                        // Эмитируем событие успешного входа
                        this.$emit('login-success', tokenData);
                    }
                } catch (error) {
                    console.error('auth-button.handleOAuthMessage error:', error);
                    if (window.errorHandler) {
                        window.errorHandler.handleError(error, {
                            context: 'auth-button.handleOAuthMessage',
                            userMessage: 'Ошибка при обработке авторизации'
                        });
                    }
                } finally {
                    if (window.authState) {
                        window.authState.setLoading(false);
                    }
                }
            }
        },

        /**
         * Обработка клика на кнопку входа
         */
        async handleLogin() {
            try {
                if (!window.authClient) {
                    console.error('auth-button: authClient not loaded');
                    return;
                }

                if (window.authState) {
                    window.authState.setLoading(true);
                }
                window.authClient.initiateGoogleAuth();
            } catch (error) {
                console.error('auth-button.handleLogin error:', error);
                if (window.authState) {
                    window.authState.setLoading(false);
                }
                if (window.errorHandler) {
                    window.errorHandler.handleError(error, {
                        context: 'auth-button.handleLogin',
                        userMessage: 'Ошибка при инициации авторизации'
                    });
                }
            }
        },

        /**
         * Обработка logoutа
         */
        async handleLogout() {
            try {
                if (!window.authClient) {
                    console.error('auth-button: authClient not loaded');
                    return;
                }

                if (window.authState) {
                    window.authState.setLoading(true);
                }
                await window.authClient.logout();
                window.authState.clearAuthState();
                this.$emit('logout-success');
            } catch (error) {
                console.error('auth-button.handleLogout error:', error);
                // Даже при ошибке обновляем состояние
                window.authState.clearAuthState();
                this.$emit('logout-success');
            } finally {
                if (window.authState) {
                    window.authState.setLoading(false);
                }
            }
        },
    },
};
