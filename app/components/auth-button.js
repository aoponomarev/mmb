/**
 * ================================================================================================
 * AUTH BUTTON COMPONENT - Authentication button and user profile component
 * ================================================================================================
 *
 * PURPOSE: Vue component for displaying Google sign-in button or user profile.
 *
 * @skill-anchor app/skills/component-classes-management #for-classes-add-remove
 * @skill-anchor app/skills/bootstrap-vue-integration #for-bootstrap-event-proxying
 * @skill-anchor app/skills/vue-implementation-patterns #for-utility-availability-check
 * Skill: app/skills/file-protocol-cors-guard
 *
 * COMPONENT API:
 *
 * Props: none
 *
 * Events:
 * - login-success — emitted after successful login
 * - logout-success — emitted after successful logout
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
         * Display name for user
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
        // Check auth status on mount
        await this.checkAuthStatus();

        // Handle callback from Google OAuth (if code in URL)
        await this.handleAuthCallback();

        // Handle postMessage from OAuth callback popup
        window.addEventListener('message', this.handleOAuthMessage);
    },

    beforeUnmount() {
        // Remove postMessage handler on unmount
        window.removeEventListener('message', this.handleOAuthMessage);
    },

    methods: {
        /**
         * Check authentication status
         */
        async checkAuthStatus() {
            try {
                if (!window.authClient) {
                    console.warn('auth-button: authClient not loaded');
                    return;
                }

                const authenticated = await window.authClient.isAuthenticated();

                if (authenticated) {
                    // Get user data
                    const user = await window.authClient.getCurrentUser();
                    // Unified state stored in authState; local computed reads from there.
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
         * Handle callback from Google OAuth
         */
        async handleAuthCallback() {
            try {
                if (!window.authClient) {
                    return;
                }

                // Check for code in URL
                const urlParams = new URLSearchParams(window.location.search);
                const code = urlParams.get('code');
                const state = urlParams.get('state');

                if (code && state) {
                    // Handle callback
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
         * Handle postMessage from OAuth callback popup
         */
        async handleOAuthMessage(event) {
            // Verify message is from our Worker callback
            // Accept messages from any origin, as file:// has unknown origin
            if (event.data && event.data.type === 'oauth-callback' && event.data.success) {
                try {
                    const tokenData = event.data.token;

                    if (tokenData && tokenData.access_token) {
                        // Save token via auth-client
                        if (window.authClient && window.authClient.saveToken) {
                            await window.authClient.saveToken(tokenData);
                        }

                        // Update auth state
                        await this.checkAuthStatus();

                        // Emit successful login event
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
         * Handle login button click
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
         * Handle logout
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
                // Update state even on error
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
