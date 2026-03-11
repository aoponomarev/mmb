/**
 * #JS-u72ZSLqH
 * @description AI API provider settings modal (YandexGPT, GitHub, PostgreSQL); persistence via cache-manager; inject modalApi.
 * @skill id:sk-bb7c8e
 * @skill-anchor id:sk-add9a6 #for-classes-add-remove
 * @skill-anchor id:sk-eeb23d #for-bootstrap-event-proxying
 * @skill-anchor id:sk-cb75ec #for-utility-availability-check
 *
 * FEATURES: Provider switcher, conditional fields, API key validation, Saved-close state, visibility toggle. YandexGPT: yandexApiKey, yandexFolderId, yandexModel (gpt://...). Data/computed/methods: provider, loadSettings, saveSettings, hasChanges, isValid.
 */

window.aiApiSettings = {
    template: '#ai-api-settings-template',

    inject: ['modalApi'],

    data() {
        const defaultProvider = window.appConfig?.get('defaults.aiProvider', 'yandex');
        const defaultYandexModel = window.appConfig?.get('defaults.yandex.model', 'gpt://b1gv03a122le5a934cqj/yandexgpt-lite/latest');
        const defaultYandexModels = window.appConfig?.get('defaults.yandex.models', [
            { value: 'gpt://b1gv03a122le5a934cqj/yandexgpt-lite/latest', label: 'YandexGPT Lite' },
            { value: 'gpt://b1gv03a122le5a934cqj/yandexgpt/latest', label: 'YandexGPT' },
            { value: 'assistant:fvtj79pcagqihmvsaivl', label: 'Assistant' }
        ]);
        const defaultYandexFolderId = window.appConfig?.get('defaults.yandex.folderId', 'b1gv03a122le5a934cqj');
        const defaultPostgresBaseUrl = window.postgresConfig?.getApiBaseUrl?.() || '';
        return {
            isMounted: false,
            provider: defaultProvider,
            activeTab: defaultProvider,
            yandexApiKey: '',
            yandexFolderId: defaultYandexFolderId,
            yandexModel: defaultYandexModel,
            githubToken: '',
            apiBaseUrl: defaultPostgresBaseUrl,
            syncEnabled: false,
            initialProvider: defaultProvider,
            initialYandexApiKey: '',
            initialYandexFolderId: defaultYandexFolderId,
            initialYandexModel: defaultYandexModel,
            initialGithubToken: '',
            initialBaseUrl: defaultPostgresBaseUrl,
            initialSyncEnabled: false,
            showYandexApiKey: false,
            showGithubToken: false,
            isSaved: false,
            isExporting: false,
            isSnapshotsLoading: false,
            snapshotFiles: [],
            settingsTokenWarningShown: false,
            isCheckingHealth: false,
            healthStatus: null, // null | 'OK' | 'Error'
            yandexModels: defaultYandexModels
        };
    },

    computed: {
        // Unique prefix for form element IDs (avoid duplication when reopening modal)
        formIdPrefix() {
            return `ai-api-settings-${this._uid || Math.random().toString(36).substr(2, 9)}`;
        },
        hasChanges() {
            return this.yandexApiKey !== this.initialYandexApiKey ||
                   this.yandexFolderId !== this.initialYandexFolderId ||
                   this.yandexModel !== this.initialYandexModel ||
                   this.githubToken !== this.initialGithubToken ||
                   this.apiBaseUrl !== this.initialBaseUrl ||
                   this.syncEnabled !== this.initialSyncEnabled;
        },
        isValid() {
            if (this.provider === 'yandex') {
                return this.yandexApiKey.trim().length > 0;
            } else if (this.provider === 'github') {
                return this.githubToken.trim().length > 0;
            } else if (this.provider === 'postgres') {
                if (this.syncEnabled) {
                    const trimmed = this.apiBaseUrl.trim();
                    return trimmed.length > 0 && (trimmed.startsWith('http://') || trimmed.startsWith('https://'));
                }
                return true;
            }
            return false;
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
        activeTab(newValue) {
            // @causality #for-tab-provider-decoupling
            // Because 'postgres' and 'github' are settings tabs but not valid AI providers,
            // we must only sync 'activeTab' to 'this.provider' if it's a valid AI provider.
            // This prevents saving invalid providers to cache and causing startup warnings.
            const validProviders = window.aiProviderManager ? window.aiProviderManager.validProviderIds : ['yandex'];
            if (validProviders.includes(newValue)) {
                this.provider = newValue;
            }
        },
        provider(newValue) {
            // @causality #for-tab-provider-decoupling
            // Ensure UI reflects the actual AI provider when loaded from cache or snapshot.
            if (newValue && this.activeTab !== newValue) {
                this.activeTab = newValue;
            }
        },
        yandexApiKey() {
            this.$nextTick(() => {
                this.onFieldChange();
            });
        },
        yandexModel() {
            this.$nextTick(() => {
                this.onFieldChange();
            });
        },
        yandexFolderId() {
            this.$nextTick(() => {
                this.onFieldChange();
            });
        },
        githubToken() {
            this.$nextTick(() => {
                this.onFieldChange();
            });
        },
        apiBaseUrl() {
            this.healthStatus = null;
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
            // Register buttons on mount via $nextTick to ensure modalApi availability
            this.$nextTick(() => {
                if (this.modalApi) {
                    // Save button only in footer
                    this.modalApi.registerButton('save', {
                        locations: ['footer'],
                        label: 'Сохранить',
                        variant: 'primary',
                        disabled: !this.hasChanges || !this.isValid,
                        onClick: () => {
                            // If already saved - close window (button shows "Saved, close?")
                            if (this.isSaved) {
                                this.handleCancel();
                            } else {
                                this.saveSettings();
                            }
                        }
                    });
                }
            });
            // Load settings after button registration
            await this.loadSettings();
            await this.refreshSnapshots();
            this.$nextTick(() => {
                setTimeout(() => {
                    this.isMounted = true;
                }, 100);
            });
            // Update button after loading settings
            this.$nextTick(() => {
                this.updateSaveButton();
            });
        },

    methods: {
        /**
         * Field change handler
         */
        onFieldChange() {
            if (this.isSaved) {
                this.isSaved = false;
                this.updateSaveButton();
            } else if (this.modalApi) {
                this.modalApi.updateButton('save', {
                    disabled: !this.hasChanges || !this.isValid
                });
            }
        },

        /**
         * Load settings from cache
         */
        async loadSettings() {
            try {
                let savedProvider = await window.cacheManager.get('ai-provider');
                
                // @causality #for-invalid-provider-cleanup
                // Because previous versions might have saved 'postgres' or 'github' as ai-provider,
                // we must sanitize it to prevent UI breaking and console warnings.
                const validProviders = window.aiProviderManager ? window.aiProviderManager.validProviderIds : ['yandex'];
                if (savedProvider && !validProviders.includes(savedProvider)) {
                    savedProvider = window.aiProviderManager ? window.aiProviderManager.defaultProvider : 'yandex';
                    // Proactively clean up the cache
                    await window.cacheManager.set('ai-provider', savedProvider);
                }

                if (savedProvider) {
                    this.provider = savedProvider;
                    this.activeTab = savedProvider;
                    this.initialProvider = savedProvider;
                }

                const savedYandexApiKey = await window.cacheManager.get('yandex-api-key');
                if (savedYandexApiKey) {
                    this.yandexApiKey = savedYandexApiKey;
                    this.initialYandexApiKey = savedYandexApiKey;
                }

                const savedYandexModel = await window.cacheManager.get('yandex-model');
                if (savedYandexModel) {
                    this.yandexModel = savedYandexModel;
                    this.initialYandexModel = savedYandexModel;
                }

                const savedYandexFolderId = await window.cacheManager.get('yandex-folder-id');
                if (savedYandexFolderId) {
                    this.yandexFolderId = savedYandexFolderId;
                    this.initialYandexFolderId = savedYandexFolderId;
                } else {
                    const defaultFolderId = window.appConfig?.get('defaults.yandex.folderId', 'b1gv03a122le5a934cqj');
                    this.yandexFolderId = defaultFolderId;
                    this.initialYandexFolderId = defaultFolderId;
                }

                const savedPostgresBaseUrl = await window.cacheManager.get('postgres-api-base-url');
                const savedPostgresEnabled = await window.cacheManager.get('postgres-sync-enabled');
                const fallbackPostgresBaseUrl = window.postgresConfig?.getApiBaseUrl?.() || '';
                const normalizedSavedPostgresBaseUrl = typeof savedPostgresBaseUrl === 'string' ? savedPostgresBaseUrl.trim() : '';
                this.apiBaseUrl = normalizedSavedPostgresBaseUrl;
                if (!this.apiBaseUrl || this.apiBaseUrl.includes('api.example.com')) {
                    this.apiBaseUrl = fallbackPostgresBaseUrl;
                }
                this.syncEnabled = savedPostgresEnabled === true || savedPostgresEnabled === 'true';
                this.initialBaseUrl = this.apiBaseUrl;
                this.initialSyncEnabled = this.syncEnabled;

                const savedGithubToken = localStorage.getItem('app_github_token');
                if (savedGithubToken) {
                    this.githubToken = savedGithubToken;
                    this.initialGithubToken = savedGithubToken;
                }

                // Skill anchor: if keys not found in local cache — restore from Cloudflare KV.
                // Scenario: cache reset, first run on new device.
                const missingYandexKey = !this.yandexApiKey;
                if (missingYandexKey) {
                    await this._restoreFromCloudflareKV();
                }

                // Local fallback: restore each missing field separately.
                // Important: apiBaseUrl presence must not block yandex/github token restoration.
                const backup = this.loadPersistentSettingsBackup();
                if (backup) {
                    if ((!this.provider || !this.provider.trim()) && typeof backup.provider === 'string' && backup.provider) this.provider = backup.provider;
                    if ((!this.yandexApiKey || !this.yandexApiKey.trim()) && typeof backup.yandexApiKey === 'string' && backup.yandexApiKey) this.yandexApiKey = backup.yandexApiKey;
                    if ((!this.yandexFolderId || !this.yandexFolderId.trim()) && typeof backup.yandexFolderId === 'string' && backup.yandexFolderId) this.yandexFolderId = backup.yandexFolderId;
                    if ((!this.yandexModel || !this.yandexModel.trim()) && typeof backup.yandexModel === 'string' && backup.yandexModel) this.yandexModel = backup.yandexModel;
                    if ((!this.githubToken || !this.githubToken.trim()) && typeof backup.githubToken === 'string' && backup.githubToken) {
                        this.githubToken = backup.githubToken;
                        localStorage.setItem('app_github_token', backup.githubToken);
                    }
                    if ((!this.apiBaseUrl || !this.apiBaseUrl.trim()) && typeof backup.apiBaseUrl === 'string') this.apiBaseUrl = backup.apiBaseUrl;
                    if (typeof this.syncEnabled !== 'boolean' && typeof backup.syncEnabled === 'boolean') this.syncEnabled = backup.syncEnabled;

                    this.initialProvider = this.provider;
                    this.initialYandexApiKey = this.yandexApiKey;
                    this.initialYandexFolderId = this.yandexFolderId;
                    this.initialYandexModel = this.yandexModel;
                    this.initialGithubToken = this.githubToken;
                    this.initialBaseUrl = this.apiBaseUrl;
                    this.initialSyncEnabled = this.syncEnabled;
                }

                if (window.postgresConfig?.setApiBaseUrl) {
                    window.postgresConfig.setApiBaseUrl(this.apiBaseUrl);
                }
                if (window.uiState?.setPostgresSyncEnabled) {
                    window.uiState.setPostgresSyncEnabled(this.syncEnabled);
                }
            } catch (error) {
                console.error('ai-api-settings: load settings error:', error);
            }
        },

        /**
         * Restore settings from Cloudflare KV to local cacheManager.
         * Called automatically when keys are missing in local cache.
         */
        async _restoreFromCloudflareKV() {
            // @causality #for-ais-rollout-gap-marking
            // Transitional deviation from AIS target state: this component still owns
            // direct /api/settings transport for restore/list/export/import flows until
            // the settings transport is extracted into a dedicated facade/client layer.
            const token = await this.resolveSettingsToken();
            if (!token) {
                this.warnMissingSettingsToken('auto-restore from KV');
                return;
            }
            try {
                const cfUrl = this.getSettingsUrl();
                const resp = await fetch(cfUrl, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    signal: AbortSignal.timeout(5000)
                });
                if (!resp.ok) {
                    console.warn('ai-api-settings: KV returned', resp.status, '— auto-restore skipped');
                    return;
                }
                const json = await resp.json();
                const d = json.data;
                if (!d || typeof d !== 'object') return;

                // Apply fields from KV only if missing locally
                const validProviders = window.aiProviderManager ? window.aiProviderManager.validProviderIds : ['yandex'];
                if (d.provider && validProviders.includes(d.provider) && !this.provider) {
                    this.provider = d.provider;
                    this.initialProvider = d.provider;
                }
                if (d.yandexApiKey && !this.yandexApiKey) {
                    this.yandexApiKey = d.yandexApiKey;
                    this.initialYandexApiKey = d.yandexApiKey;
                }
                if (d.yandexFolderId && !this.yandexFolderId) {
                    this.yandexFolderId = d.yandexFolderId;
                    this.initialYandexFolderId = d.yandexFolderId;
                }
                if (d.yandexModel && !this.yandexModel) {
                    this.yandexModel = d.yandexModel;
                    this.initialYandexModel = d.yandexModel;
                }
                if (d.githubToken && !this.githubToken) {
                    this.githubToken = d.githubToken;
                    this.initialGithubToken = d.githubToken;
                    localStorage.setItem('app_github_token', d.githubToken);
                }
                if (d.apiBaseUrl && !this.apiBaseUrl) {
                    this.apiBaseUrl = d.apiBaseUrl;
                    this.initialBaseUrl = d.apiBaseUrl;
                }
                if (d.syncEnabled !== undefined && !this.syncEnabled) {
                    this.syncEnabled = d.syncEnabled;
                    this.initialSyncEnabled = d.syncEnabled;
                }

                // Save restored keys to local cacheManager for next startup
                const saves = [];
                if (d.provider && validProviders.includes(d.provider)) saves.push(window.cacheManager.set('ai-provider', d.provider));
                if (d.yandexApiKey)    saves.push(window.cacheManager.set('yandex-api-key', d.yandexApiKey));
                if (d.yandexFolderId)  saves.push(window.cacheManager.set('yandex-folder-id', d.yandexFolderId));
                if (d.yandexModel)     saves.push(window.cacheManager.set('yandex-model', d.yandexModel));
                if (d.apiBaseUrl)      saves.push(window.cacheManager.set('postgres-api-base-url', d.apiBaseUrl));
                if (d.syncEnabled !== undefined) saves.push(window.cacheManager.set('postgres-sync-enabled', d.syncEnabled));
                await Promise.all(saves);
                this.savePersistentSettingsBackup({
                    provider: d.provider || this.provider,
                    yandexApiKey: d.yandexApiKey || this.yandexApiKey,
                    yandexFolderId: d.yandexFolderId || this.yandexFolderId,
                    yandexModel: d.yandexModel || this.yandexModel,
                    githubToken: d.githubToken || this.githubToken,
                    apiBaseUrl: d.apiBaseUrl || this.apiBaseUrl,
                    syncEnabled: typeof d.syncEnabled === 'boolean' ? d.syncEnabled : this.syncEnabled
                });
                console.log('ai-api-settings: ✅ settings restored from Cloudflare KV');
            } catch (err) {
                console.warn('ai-api-settings: KV auto-restore error:', err.message);
            }
        },

        buildSnapshotPayload() {
            return {
                provider: this.provider,
                yandexApiKey: this.yandexApiKey,
                yandexFolderId: this.yandexFolderId,
                yandexModel: this.yandexModel,
                githubToken: this.githubToken,
                apiBaseUrl: this.apiBaseUrl,
                syncEnabled: this.syncEnabled
            };
        },

        getPersistentSettingsKey() {
            return 'app_api_settings_backup_v1';
        },

        loadPersistentSettingsBackup() {
            try {
                const raw = localStorage.getItem(this.getPersistentSettingsKey());
                if (!raw) return null;
                const parsed = JSON.parse(raw);
                return parsed && typeof parsed === 'object' ? parsed : null;
            } catch (_) {
                return null;
            }
        },

        savePersistentSettingsBackup(payload) {
            try {
                const prev = this.loadPersistentSettingsBackup() || {};
                const pickString = (nextValue, prevValue) => {
                    const normalized = typeof nextValue === 'string' ? nextValue.trim() : '';
                    return normalized.length > 0 ? normalized : (typeof prevValue === 'string' ? prevValue : '');
                };
                const merged = {
                    provider: pickString(payload.provider, prev.provider),
                    yandexApiKey: pickString(payload.yandexApiKey, prev.yandexApiKey),
                    yandexFolderId: pickString(payload.yandexFolderId, prev.yandexFolderId),
                    yandexModel: pickString(payload.yandexModel, prev.yandexModel),
                    githubToken: pickString(payload.githubToken, prev.githubToken),
                    apiBaseUrl: pickString(payload.apiBaseUrl, prev.apiBaseUrl),
                    syncEnabled: typeof payload.syncEnabled === 'boolean'
                        ? payload.syncEnabled
                        : (typeof prev.syncEnabled === 'boolean' ? prev.syncEnabled : false)
                };
                localStorage.setItem(this.getPersistentSettingsKey(), JSON.stringify({
                    ...merged,
                    updatedAt: Date.now()
                }));
            } catch (_) {}
        },

        saveSnapshotToUserDisk(payload) {
            try {
                const ts = new Date();
                const pad = (n) => String(n).padStart(2, '0');
                const filename = `app-api-${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.json`;
                const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
                const href = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = href;
                a.download = filename;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(href);
                return true;
            } catch (_) {
                return false;
            }
        },

        /**
         * Get auth header for Cloudflare /api/settings.
         * Priority:
         * 1) service token (githubToken / app_github_token)
         * 2) OAuth JWT of current user
         */
        async getSettingsAuthHeader() {
            const token = await this.resolveSettingsToken();
            return token ? { 'Authorization': `Bearer ${token}` } : {};
        },

        async resolveSettingsToken() {
            // OAuth JWT has priority: it matches current user session.
            try {
                if (window.authClient && typeof window.authClient.getAccessToken === 'function') {
                    const authTokenData = await window.authClient.getAccessToken();
                    const jwt = (authTokenData?.access_token || '').trim();
                    if (jwt) {
                        return jwt;
                    }
                }
            } catch (_) {
                // ignore auth token read errors
            }

            const directToken = (this.githubToken || localStorage.getItem('app_github_token') || '').trim();
            if (directToken) {
                return directToken;
            }

            try {
                const backupRaw = localStorage.getItem(this.getPersistentSettingsKey());
                if (backupRaw) {
                    const backup = JSON.parse(backupRaw);
                    const backupToken = (backup?.githubToken || '').trim();
                    if (backupToken) {
                        localStorage.setItem('app_github_token', backupToken);
                        return backupToken;
                    }
                }
            } catch (_) {
                // ignore parse/storage errors
            }

            return '';
        },

        warnMissingSettingsToken(context = '') {
            if (this.settingsTokenWarningShown) {
                return;
            }
            this.settingsTokenWarningShown = true;
            const suffix = context ? ` (${context})` : '';
            console.warn(
                `ai-api-settings: no token for Cloudflare KV${suffix}. ` +
                'Either service token (githubToken) or OAuth JWT after auth required.'
            );
        },

        /**
         * Get URL Cloudflare Worker for /api/settings.
         */
        getSettingsUrl() {
            const base = window.cloudflareConfig
                ? (window.cloudflareConfig.getAuthBaseUrl?.() || window.cloudflareConfig.getWorkersBaseUrl())
                : 'https://app-api.ponomarev-ux.workers.dev';
            return `${base}/api/settings`;
        },

        /**
         * Update snapshot list: Cloudflare KV.
         * KV stores one current snapshot — show it as "cloud".
         */
        async refreshSnapshots() {
            this.isSnapshotsLoading = true;
            // Skill anchor: isSnapshotsLoading reset in common finally — required for all logout paths.
            try {
                const snapshotFiles = [];
                try {
                    const cfUrl = this.getSettingsUrl();
                    const token = await this.resolveSettingsToken();
                    if (!token) {
                        this.warnMissingSettingsToken('snapshot list refresh');
                        this.snapshotFiles = snapshotFiles;
                        return;
                    }
                    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                    const cfResp = await fetch(cfUrl, {
                        headers,
                        signal: AbortSignal.timeout(5000)
                    });
                    if (cfResp.ok) {
                        const cfData = await cfResp.json();
                        const hasData = cfData.data && Object.keys(cfData.data).length > 0;
                        if (hasData) {
                            snapshotFiles.push('☁ Cloudflare KV (актуальный)');
                        }
                    } else {
                        console.warn('ai-api-settings: Cloudflare KV returned', cfResp.status);
                    }
                } catch (cfError) {
                    console.warn('ai-api-settings: Cloudflare KV unavailable:', cfError.message);
                }

                this.snapshotFiles = snapshotFiles;
            } finally {
                this.isSnapshotsLoading = false;
            }
        },

        /**
         * Export settings: save to Cloudflare KV + download JSON to disk.
         */
        async exportSnapshot() {
            if (this.isExporting) return;
            this.isExporting = true;
            try {
                const payload = this.buildSnapshotPayload();

                // Primary: Cloudflare KV
                try {
                    const cfUrl = this.getSettingsUrl();
                    const token = await this.resolveSettingsToken();
                    const cfResp = await fetch(cfUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                        },
                        body: JSON.stringify(payload),
                        signal: AbortSignal.timeout(8000)
                    });
                    if (cfResp.ok) {
                        console.log('ai-api-settings: settings saved to Cloudflare KV');
                    } else {
                        const err = await cfResp.text();
                        console.warn('ai-api-settings: Cloudflare KV export error:', cfResp.status, err);
                    }
                } catch (cfError) {
                    console.warn('ai-api-settings: Cloudflare KV unavailable on export:', cfError.message);
                }

                // Fallback: download JSON to Downloads folder.
                this.saveSnapshotToUserDisk(payload);
                await this.refreshSnapshots();
            } catch (error) {
                console.error('ai-api-settings: snapshot export error:', error);
            } finally {
                this.isExporting = false;
            }
        },

        /**
         * Import settings: from Cloudflare KV.
         */
        async importSnapshot(filename) {
            if (!filename) return;
            try {
                let payload = null;

                const cfUrl = this.getSettingsUrl();
                const token = await this.resolveSettingsToken();
                const cfResp = await fetch(cfUrl, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                    signal: AbortSignal.timeout(8000)
                });
                if (!cfResp.ok) throw new Error(`Cloudflare KV error: ${cfResp.status}`);
                const cfData = await cfResp.json();
                payload = cfData.data || null;

                if (!payload || typeof payload !== 'object') {
                    throw new Error('Invalid snapshot payload');
                }
                await this.applyImportedPayload(payload);
            } catch (error) {
                console.error('ai-api-settings: snapshot import error:', error);
            }
        },

        async applyImportedPayload(payload) {
            const validProviders = window.aiProviderManager ? window.aiProviderManager.validProviderIds : ['yandex'];
            if (typeof payload.provider === 'string' && validProviders.includes(payload.provider)) {
                this.provider = payload.provider;
            }
            if (typeof payload.yandexApiKey === 'string') this.yandexApiKey = payload.yandexApiKey;
            if (typeof payload.yandexFolderId === 'string') this.yandexFolderId = payload.yandexFolderId;
            if (typeof payload.yandexModel === 'string') this.yandexModel = payload.yandexModel;
            if (typeof payload.githubToken === 'string') this.githubToken = payload.githubToken;
            if (typeof payload.apiBaseUrl === 'string') this.apiBaseUrl = payload.apiBaseUrl;
            if (typeof payload.syncEnabled === 'boolean') this.syncEnabled = payload.syncEnabled;

            const saves = [];
            if (typeof payload.provider === 'string') saves.push(window.cacheManager.set('ai-provider', this.provider));
            if (typeof payload.yandexApiKey === 'string') saves.push(window.cacheManager.set('yandex-api-key', this.yandexApiKey));
            if (typeof payload.yandexFolderId === 'string') saves.push(window.cacheManager.set('yandex-folder-id', this.yandexFolderId));
            if (typeof payload.yandexModel === 'string') saves.push(window.cacheManager.set('yandex-model', this.yandexModel));
            if (typeof payload.apiBaseUrl === 'string') saves.push(window.cacheManager.set('postgres-api-base-url', this.apiBaseUrl.trim()));
            if (typeof payload.syncEnabled === 'boolean') saves.push(window.cacheManager.set('postgres-sync-enabled', this.syncEnabled));
            await Promise.all(saves);

            if (typeof payload.githubToken === 'string' && payload.githubToken.trim()) {
                localStorage.setItem('app_github_token', payload.githubToken.trim());
            }
            this.savePersistentSettingsBackup(this.buildSnapshotPayload());
            this.onFieldChange();
        },

        importSnapshotFromDisk() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json,.json';
            input.addEventListener('change', async () => {
                const file = input.files && input.files[0];
                if (!file) return;
                try {
                    const text = await file.text();
                    const json = JSON.parse(text);
                    const payload = (json && typeof json === 'object' && json.data && typeof json.data === 'object')
                        ? json.data
                        : json;
                    if (!payload || typeof payload !== 'object') {
                        throw new Error('Invalid snapshot payload');
                    }
                    await this.applyImportedPayload(payload);
                } catch (error) {
                    console.error('ai-api-settings: disk import error:', error);
                }
            });
            input.click();
        },

        /**
         * Save settings to cache
         */
        async saveSettings() {
            try {
                const existingYandexApiKey = (await window.cacheManager.get('yandex-api-key')) || '';
                const existingGithubToken = localStorage.getItem('app_github_token') || '';
                const nextYandexApiKey = this.yandexApiKey.trim() || existingYandexApiKey;
                const nextGithubToken = this.githubToken.trim() || existingGithubToken;

                await window.cacheManager.set('ai-provider', this.provider);

                // Save Yandex settings
                await window.cacheManager.set('yandex-api-key', nextYandexApiKey);
                await window.cacheManager.set('yandex-folder-id', this.yandexFolderId);
                await window.cacheManager.set('yandex-model', this.yandexModel);

                // Update provider manager
                if (window.aiProviderManager && this.provider === 'yandex') {
                    await window.aiProviderManager.setProvider(this.provider);
                }

                localStorage.setItem('app_github_token', nextGithubToken);

                await window.cacheManager.set('postgres-api-base-url', this.apiBaseUrl.trim());
                await window.cacheManager.set('postgres-sync-enabled', this.syncEnabled);

                if (window.postgresConfig?.setApiBaseUrl) {
                    window.postgresConfig.setApiBaseUrl(this.apiBaseUrl.trim());
                }
                if (window.uiState?.setPostgresSyncEnabled) {
                    window.uiState.setPostgresSyncEnabled(this.syncEnabled);
                }

                // Update initial values
                this.initialProvider = this.provider;
                this.yandexApiKey = nextYandexApiKey;
                this.githubToken = nextGithubToken;
                this.initialYandexApiKey = this.yandexApiKey;
                this.initialYandexFolderId = this.yandexFolderId;
                this.initialYandexModel = this.yandexModel;
                this.initialGithubToken = this.githubToken;
                this.initialBaseUrl = this.apiBaseUrl;
                this.initialSyncEnabled = this.syncEnabled;
                this.savePersistentSettingsBackup(this.buildSnapshotPayload());

                // Set "Saved" state
                this.isSaved = true;
                this.updateSaveButton();

                console.log('ai-api-settings: settings saved');
            } catch (error) {
                console.error('ai-api-settings: save settings error:', error);
            }
        },

        /**
         * Cancel handler
         */
        handleCancel() {
            if (this.isSaved) {
                // If already saved - close modal
                this.closeModal();
            } else {
                // Restore initial values
                this.provider = this.initialProvider;
                this.yandexApiKey = this.initialYandexApiKey;
                this.yandexFolderId = this.initialYandexFolderId;
                this.yandexModel = this.initialYandexModel;
                this.githubToken = this.initialGithubToken;
                this.apiBaseUrl = this.initialBaseUrl;
                this.syncEnabled = this.initialSyncEnabled;
                this.updateSaveButton();
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
                // Skill anchor: health-check on file:// may give false CORS errors, not a provider bug.
                // See id:sk-7cf3f7
                const isLocal = window.location.protocol === 'file:' || window.location.hostname.includes('github.io') || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                if (error.message === 'Failed to fetch' && isLocal) {
                    this.healthStatus = 'Fail (CORS/Network)';
                } else {
                    this.healthStatus = error.message.includes('API Error') ? error.message : 'Fail (Network)';
                }
            } finally {
                this.isCheckingHealth = false;
            }
        },

        /**
         * Close modal and remove focus
         */
        closeModal() {
            if (this.modalApi && this.modalApi.hide) {
                this.modalApi.hide();
            }
        },

        /**
         * Update Save button state
         */
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
                // Normal state
                this.modalApi.updateButton('save', {
                    label: 'Сохранить',
                    variant: 'primary',
                    disabled: !this.hasChanges || !this.isValid
                });
            }
        },

        /**
         * Toggle Yandex API key visibility
         */
        toggleYandexApiKeyVisibility() {
            this.showYandexApiKey = !this.showYandexApiKey;
        },

        /**
         * Toggle GitHub token visibility
         */
        toggleGithubTokenVisibility() {
            this.showGithubToken = !this.showGithubToken;
        }
    }
};

