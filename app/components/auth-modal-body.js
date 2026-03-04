/**
 * #JS-pZ2DyWkj
 * @description Auth modal body: auth state, user info, Log in/Log out via modalApi; auth-client, auth-state sync.
 * @skill id:sk-7cf3f7
 * @skill-anchor id:sk-add9a6 #for-classes-add-remove
 * @skill-anchor id:sk-eeb23d #for-bootstrap-event-proxying
 * @skill-anchor id:sk-cb75ec #for-utility-availability-check
 *
 * Props: onLoginSuccess, onLogoutSuccess (optional). Inject: modalApi.
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
            // Use centralized state from auth-state (SSOT)
            authState: window.authState ? window.authState.getState() : null
        };
    },

    computed: {
        uiState() {
            return window.uiState ? window.uiState.getState() : null;
        },
        /**
         * Display name for user
         * @returns {string}
         */
        userDisplayName() {
            if (!this.authState || !this.authState.user) return 'Пользователь';
            return this.authState.user.name || this.authState.user.email || 'Пользователь';
        },

        /**
         * Local aliases for convenience (direct access to authState properties)
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
        // Watch centralized state changes and update buttons
        'authState.isAuthenticated'(newVal, oldVal) {
            this.updateButtons();
        },
        // Watch isLoading for updating button disabled state
        'uiState.auth.isLoading'(newVal, oldVal) {
            this.updateButtons();
        }
    },

    methods: {
        /**
         * Check auth status via centralized store
         * Updates state for all component instances automatically
         */
        async checkAuthStatus() {
            if (!window.authState) {
                console.warn('auth-modal-body: authState not loaded');
                return;
            }

            // Centralized check via auth-state (updates state for all instances)
            await window.authState.checkAuthStatus();
        },

        /**
         * Update button state based on auth status
         */
        updateButtons() {
            if (!this.modalApi) return;

            // Check button existence before update
            const hasLoginButton = this.modalApi.getButton('login') !== undefined;
            const hasLogoutButton = this.modalApi.getButton('logout') !== undefined;

            // If buttons not registered (modal not mounted), return
            if (!hasLoginButton || !hasLogoutButton) {
                return;
            }

            if (this.isAuthenticated) {
                // Show only logout button
                this.modalApi.updateButton('login', {
                    visible: false
                });
                this.modalApi.updateButton('logout', {
                    visible: true,
                    disabled: this.isLoading
                });
            } else {
                // Show only login button
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
         * Handle authentication
         */
        async handleLogin() {
            try {
                if (!window.authClient || !window.authState) {
                    console.error('auth-modal-body: authClient или authState not loaded');
                    return;
                }

                // Set loading state in centralized store
                window.authState.setLoading(true);
                this.updateButtons();
                this._authInProgress = true;

                // Initiate auth via Google OAuth
                window.authClient.initiateGoogleAuth();

                // Handle postMessage from OAuth callback popup
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
                                await this.checkAuthStatus();

                                // Call callback if provided
                                if (this.onLoginSuccess) {
                                    this.onLoginSuccess(tokenData);
                                }

                                // Remove handler after successful auth
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

                // Timeout for handler removal (if window closed without auth)
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
         * Handle logout
         */
        async handleLogout() {
            try {
                if (!window.authClient || !window.authState) {
                    console.error('auth-modal-body: authClient или authState not loaded');
                    return;
                }

                // Set loading state in centralized store
                window.authState.setLoading(true);
                this.updateButtons();

                await window.authClient.logout();

                // Clear centralized state (syncs all instances)
                window.authState.clearAuthState();

                // Call callback if provided
                if (this.onLogoutSuccess) {
                    this.onLogoutSuccess();
                }

                // Update buttons
                this.updateButtons();
            } catch (error) {
                console.error('auth-modal-body.handleLogout error:', error);
                // Update state even on error
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
        // Register buttons BEFORE auth check
        if (this.modalApi) {
            // Login button in footer
            this.modalApi.registerButton('login', {
                locations: ['footer'],
                label: 'Авторизоваться',
                variant: 'primary',
                disabled: this.isLoading,
                visible: !this.isAuthenticated,
                onClick: () => this.handleLogin()
            });

            // Logout button in footer (left, like Cancel)
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

        // Check auth status after button registration
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
        // Remove buttons on unmount
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
