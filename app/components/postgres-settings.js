/**
 * ================================================================================================
 * POSTGRES SETTINGS COMPONENT - PostgreSQL API layer settings
 * ================================================================================================
 *
 * PURPOSE: Manage basic settings for PostgreSQL API layer.
 *
 * @skill-anchor app/skills/component-classes-management #for-classes-add-remove
 * @skill-anchor app/skills/bootstrap-vue-integration #for-bootstrap-event-proxying
 * @skill-anchor app/skills/vue-implementation-patterns #for-utility-availability-check
 * No DB queries or table creation.
 *
 * Skill: core/skills/api-layer
 *
*/

window.postgresSettings = {
    template: '#postgres-settings-template',

    inject: ['modalApi'],

    data() {
        const defaultBaseUrl = window.postgresConfig?.getApiBaseUrl?.() || '';
        return {
            apiBaseUrl: defaultBaseUrl,
            syncEnabled: false,
            initialBaseUrl: defaultBaseUrl,
            initialSyncEnabled: false,
            isSaved: false,
            isCheckingHealth: false,
            healthStatus: null // null | 'OK' | 'Error'
        };
    },

    computed: {
        formIdPrefix() {
            return `postgres-settings-${this._uid || Math.random().toString(36).substr(2, 9)}`;
        },
        hasChanges() {
            return this.apiBaseUrl !== this.initialBaseUrl ||
                   this.syncEnabled !== this.initialSyncEnabled;
        },
        isValid() {
            if (this.syncEnabled) {
                // If sync enabled, URL must not be empty and must look like URL
                const trimmed = this.apiBaseUrl.trim();
                return trimmed.length > 0 && (trimmed.startsWith('http://') || trimmed.startsWith('https://'));
            }
            return true;
        },
        healthEndpoint() {
            if (!this.apiBaseUrl.trim()) {
                return '';
            }
            if (window.postgresConfig?.getHealthEndpoint) {
                return window.postgresConfig.getHealthEndpoint();
            }
            return '';
        }
    },

    watch: {
        apiBaseUrl() {
            this.healthStatus = null; // Reset status on URL change
            this.$nextTick(() => {
                this.onFieldChange();
            });
        },
        syncEnabled() {
            this.$nextTick(() => {
                this.onFieldChange();
            });
        }
    },

    async mounted() {
        this.$nextTick(() => {
            if (this.modalApi) {
                this.modalApi.registerButton('cancel', {
                    locations: ['footer'],
                    label: 'Отмена',
                    variant: 'secondary',
                    classesAdd: { root: 'me-auto' },
                    onClick: () => this.handleCancel()
                });
                this.modalApi.registerButton('save', {
                    locations: ['footer'],
                    label: 'Сохранить',
                    variant: 'primary',
                    disabled: !this.hasChanges || !this.isValid,
                    onClick: () => {
                        if (this.isSaved) {
                            this.handleCancel();
                        } else {
                            this.saveSettings();
                        }
                    }
                });
            }
        });

        await this.loadSettings();
        this.$nextTick(() => {
            this.updateSaveButton();
        });
    },

    methods: {
        async loadSettings() {
            try {
                let baseUrl = window.postgresConfig?.getApiBaseUrl?.() || '';
                let enabled = false;

                baseUrl = await window.cacheManager.get('postgres-api-base-url');
                enabled = await window.cacheManager.get('postgres-sync-enabled');

                const normalizedBaseUrl = typeof baseUrl === 'string' ? baseUrl.trim() : '';
                this.apiBaseUrl = (!normalizedBaseUrl || normalizedBaseUrl.includes('api.example.com'))
                    ? (window.postgresConfig?.getApiBaseUrl?.() || '')
                    : normalizedBaseUrl;
                this.syncEnabled = enabled === true || enabled === 'true';
                this.initialBaseUrl = this.apiBaseUrl;
                this.initialSyncEnabled = this.syncEnabled;

                if (window.postgresConfig?.setApiBaseUrl) {
                    window.postgresConfig.setApiBaseUrl(this.apiBaseUrl);
                }
                if (window.uiState?.setPostgresSyncEnabled) {
                    window.uiState.setPostgresSyncEnabled(this.syncEnabled);
                }
            } catch (error) {
                console.error('postgres-settings.loadSettings:', error);
            }
        },
        async saveSettings() {
            try {
                if (!this.isValid) {
                    return;
                }

                await window.cacheManager.set('postgres-api-base-url', this.apiBaseUrl.trim());
                await window.cacheManager.set('postgres-sync-enabled', this.syncEnabled);

                if (window.postgresConfig?.setApiBaseUrl) {
                    window.postgresConfig.setApiBaseUrl(this.apiBaseUrl.trim());
                }
                if (window.uiState?.setPostgresSyncEnabled) {
                    window.uiState.setPostgresSyncEnabled(this.syncEnabled);
                }

                this.initialBaseUrl = this.apiBaseUrl;
                this.initialSyncEnabled = this.syncEnabled;
                this.isSaved = true;
                this.updateSaveButton();
            } catch (error) {
                console.error('postgres-settings.saveSettings:', error);
            }
        },
        async checkHealth() {
            if (!this.isValid || !this.healthEndpoint) return;

            this.isCheckingHealth = true;
            this.healthStatus = null;

            try {
                if (window.postgresClient?.checkHealth) {
                    await window.postgresClient.checkHealth();
                    this.healthStatus = 'OK';
                } else {
                    // Fallback if client not yet loaded
                    const response = await fetch(this.healthEndpoint, {
                        method: 'GET',
                        mode: 'cors',
                        cache: 'no-cache'
                    });

                    if (response.ok) {
                        this.healthStatus = 'OK';
                    } else {
                        this.healthStatus = `Error: ${response.status}`;
                    }
                }
            } catch (error) {
                // If error contains "Failed to fetch" and we're on file://, likely CORS
                const isLocal = window.location.protocol === 'file:' || window.location.hostname.includes('github.io') || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                if (error.message === 'Failed to fetch' && isLocal) {
                    this.healthStatus = 'Fail (CORS/Network)';
                } else {
                    this.healthStatus = error.message.includes('API Error') ? error.message : 'Fail (Network)';
                }

                // Log only if not a normal network failure during check
                if (!error.message.includes('Failed to fetch')) {
                    console.error('postgres-settings: health check failed', error);
                }
            } finally {
                this.isCheckingHealth = false;
            }
        },
        handleCancel() {
            if (this.hasChanges) {
                this.apiBaseUrl = this.initialBaseUrl;
                this.syncEnabled = this.initialSyncEnabled;
                this.isSaved = false;
                this.updateSaveButton();
                return;
            }
            this.closeModal();
        },
        closeModal() {
            const modalRef = this.modalApi?.getModalRef?.();
            if (modalRef && typeof modalRef.hide === 'function') {
                modalRef.hide();
            }
        },
        onFieldChange() {
            this.isSaved = false;
            this.updateSaveButton();
        },
        updateSaveButton() {
            if (!this.modalApi) return;
            this.modalApi.updateButton('save', {
                disabled: !this.hasChanges || !this.isValid,
                label: this.isSaved ? 'Сохранено, закрыть?' : 'Сохранить'
            });
        }
    }
};
