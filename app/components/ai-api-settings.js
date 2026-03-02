/**
 * ================================================================================================
 * AI API SETTINGS COMPONENT - Компонент настроек AI API провайдеров
 * ================================================================================================
 *
 * PURPOSE: Компонент настроек AI API провайдеров (YandexGPT) for модального окна.
 * Позволяет переключаться между провайдерами и настраивать их параметры.
 *
 * @skill-anchor app/skills/component-classes-management #for-classes-add-remove
 * @skill-anchor app/skills/bootstrap-vue-integration #for-bootstrap-event-proxying
 * @skill-anchor app/skills/vue-implementation-patterns #for-utility-availability-check
 *
 * Skill: core/skills/api-layer
 *
 * ОСОБЕННОСТИ:
 * - Переключатель провайдеров через radio buttons (YandexGPT, GitHub, PostgreSQL)
 * - Условное отображение полей настроек в зависимости от выбранного провайдера
 * - Компактный и аскетичный интерфейс
 * - Использует систему управления кнопками модального окна
 * - Сохранение через cache-manager
 * - Валидация API ключей
 * - Поддержка состояния "Сохранено, закрыть?" for кнопки "Сохранить"
 * - Переключатель видимости API ключа (глазик)
 *
 * YANDEXGPT НАСТРОЙКИ:
 * - yandexApiKey: API ключ Yandex Cloud (получается из IAM, показывается только один раз при создании)
 * - yandexFolderId: Folder ID for Yandex Cloud (b1gv03a122le5a934cqj)
 * - yandexModel: Model URI (gpt://{folderId}/{model}/latest)
 * - Модели: YandexGPT Lite, YandexGPT
 *
 * API КОМПОНЕНТА:
 *
 * Data:
 * - provider (String) — текущий провайдер ('yandex')
 * - yandexApiKey (String) — API ключ Yandex
 * - yandexModel (String) — модель YandexGPT
 * - initialProvider (String) — исходный провайдер при открытии модального окна
 * - initialYandexApiKey (String) — исходный API ключ Yandex
 * - initialYandexModel (String) — исходная модель Yandex
 * - showYandexApiKey (Boolean) — видимость API ключа Yandex
 * - isSaved (Boolean) — состояние успешного сохранения
 * - yandexModels (Array) — список доступных моделей YandexGPT
 *
 * Computed:
 * - hasChanges (Boolean) — есть ли изменения в полях
 * - isValid (Boolean) — валидность формы (API ключ текущего провайдера не пустой)
 *
 * Inject:
 * - modalApi — API for managing кнопками (предоставляется cmp-modal)
 *
 * Методы:
 * - loadSettings() — загрузка настроек из кэша
 * - saveSettings() — сохранение настроек в кэш
 * - handleCancel() — обработка отмены (восстановление исходных значений или закрытие)
 * - closeModal() — закрытие модального окна с удалением фокуса
 * - updateSaveButton() — обновление состояния кнопки "Сохранить" (обычное/сохранено)
 * - toggleYandexApiKeyVisibility() — переключение видимости API ключа Yandex
 * - toggleGithubTokenVisibility() — переключение видимости GitHub token
 *
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
        // Уникальный префикс for ID элементов формы (избегаем дублирования при повторном открытии модального окна)
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
            // Переключение вкладок не должно сбрасывать состояние "Сохранено".
            // Синхронизируем выбранный provider с активной вкладкой без маркировки dirty-state.
            this.provider = newValue;
        },
        provider(newValue) {
            // Если provider меняется программно (загрузка из кэша/импорт), синхронизируем вкладку.
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
            // Регистрируем кнопки при монтировании через $nextTick for гарантии доступности modalApi
            this.$nextTick(() => {
                if (this.modalApi) {
                    // Кнопка "Сохранить" только в footer
                    this.modalApi.registerButton('save', {
                        locations: ['footer'],
                        label: 'Сохранить',
                        variant: 'primary',
                        disabled: !this.hasChanges || !this.isValid,
                        onClick: () => {
                            // Если уже сохранено - закрываем окно (кнопка "Сохранено, закрыть?")
                            if (this.isSaved) {
                                this.handleCancel();
                            } else {
                                this.saveSettings();
                            }
                        }
                    });
                }
            });
            // Загружаем настройки после регистрации кнопок
            await this.loadSettings();
            await this.refreshSnapshots();
            this.$nextTick(() => {
                setTimeout(() => {
                    this.isMounted = true;
                }, 100);
            });
            // Обновляем кнопку после загрузки настроек
            this.$nextTick(() => {
                this.updateSaveButton();
            });
        },

    methods: {
        /**
         * Обработчик изменения полей
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
         * Загрузка настроек из кэша
         */
        async loadSettings() {
            try {
                const savedProvider = await window.cacheManager.get('ai-provider');
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

                // Skill anchor: если ключи не нашлись в локальном кэше — восстанавливаем из Cloudflare KV.
                // Сценарий: сброс кэша, первый запуск на новом устройстве.
                const missingYandexKey = !this.yandexApiKey;
                if (missingYandexKey) {
                    await this._restoreFromCloudflareKV();
                }

                // Локальный резервный план: восстанавливаем ПО КАЖДОМУ отсутствующему полю отдельно.
                // Important: наличие apiBaseUrl не должно блокировать восстановление yandex/github токенов.
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
                console.error('ai-api-settings: ошибка загрузки настроек:', error);
            }
        },

        /**
         * Восстановить настройки из Cloudflare KV в локальный cacheManager.
         * Вызывается автоматически при отсутствии ключей в локальном кэше.
         */
        async _restoreFromCloudflareKV() {
            const token = await this.resolveSettingsToken();
            if (!token) {
                this.warnMissingSettingsToken('автовосстановление из KV');
                return;
            }
            try {
                const cfUrl = this.getSettingsUrl();
                const resp = await fetch(cfUrl, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    signal: AbortSignal.timeout(5000)
                });
                if (!resp.ok) {
                    console.warn('ai-api-settings: KV вернул', resp.status, '— автовосстановление пропущено');
                    return;
                }
                const json = await resp.json();
                const d = json.data;
                if (!d || typeof d !== 'object') return;

                // Применяем поля из KV только если они отсутствуют локально
                if (d.provider && !this.provider) {
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

                // Сохраняем восстановленные ключи в локальный cacheManager for следующего старта
                const saves = [];
                if (d.provider)        saves.push(window.cacheManager.set('ai-provider', d.provider));
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
                console.log('ai-api-settings: ✅ настройки восстановлены из Cloudflare KV');
            } catch (err) {
                console.warn('ai-api-settings: ошибка автовосстановления из KV:', err.message);
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
         * Get заголовок авторизации for Cloudflare /api/settings.
         * Приоритет:
         * 1) service token (githubToken / app_github_token)
         * 2) OAuth JWT текущего пользователя
         */
        async getSettingsAuthHeader() {
            const token = await this.resolveSettingsToken();
            return token ? { 'Authorization': `Bearer ${token}` } : {};
        },

        async resolveSettingsToken() {
            // OAuth JWT приоритетнее: он соответствует текущей пользовательской сессии.
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
                `ai-api-settings: нет токена for Cloudflare KV${suffix}. ` +
                'Нужен либо service token (githubToken), либо OAuth JWT после авторизации.'
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
         * Update список снимков: Cloudflare KV.
         * В KV хранится один актуальный снимок — показываем его как "облако".
         */
        async refreshSnapshots() {
            this.isSnapshotsLoading = true;
            // Skill anchor: isSnapshotsLoading сбрасывается в общем finally — обязательно for всех путей logoutа.
            try {
                const snapshotFiles = [];
                try {
                    const cfUrl = this.getSettingsUrl();
                    const token = await this.resolveSettingsToken();
                    if (!token) {
                        this.warnMissingSettingsToken('обновление snapshot списка');
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
                        console.warn('ai-api-settings: Cloudflare KV вернул', cfResp.status);
                    }
                } catch (cfError) {
                    console.warn('ai-api-settings: Cloudflare KV недоступен:', cfError.message);
                }

                this.snapshotFiles = snapshotFiles;
            } finally {
                this.isSnapshotsLoading = false;
            }
        },

        /**
         * Экспорт настроек: сохранить в Cloudflare KV + скачать JSON на диск.
         */
        async exportSnapshot() {
            if (this.isExporting) return;
            this.isExporting = true;
            try {
                const payload = this.buildSnapshotPayload();

                // Основной: Cloudflare KV
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
                        console.log('ai-api-settings: настройки сохранены в Cloudflare KV');
                    } else {
                        const err = await cfResp.text();
                        console.warn('ai-api-settings: Cloudflare KV export error:', cfResp.status, err);
                    }
                } catch (cfError) {
                    console.warn('ai-api-settings: Cloudflare KV недоступен при экспорте:', cfError.message);
                }

                // Страховка: скачать JSON в папку Downloads.
                this.saveSnapshotToUserDisk(payload);
                await this.refreshSnapshots();
            } catch (error) {
                console.error('ai-api-settings: ошибка экспорта снимка:', error);
            } finally {
                this.isExporting = false;
            }
        },

        /**
         * Импорт настроек: из Cloudflare KV.
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
                console.error('ai-api-settings: ошибка импорта снимка:', error);
            }
        },

        async applyImportedPayload(payload) {
            if (typeof payload.provider === 'string') this.provider = payload.provider;
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
                    console.error('ai-api-settings: ошибка импорта с диска:', error);
                }
            });
            input.click();
        },

        /**
         * Сохранение настроек в кэш
         */
        async saveSettings() {
            try {
                const existingYandexApiKey = (await window.cacheManager.get('yandex-api-key')) || '';
                const existingGithubToken = localStorage.getItem('app_github_token') || '';
                const nextYandexApiKey = this.yandexApiKey.trim() || existingYandexApiKey;
                const nextGithubToken = this.githubToken.trim() || existingGithubToken;

                await window.cacheManager.set('ai-provider', this.provider);

                // Сохраняем настройки Yandex
                await window.cacheManager.set('yandex-api-key', nextYandexApiKey);
                await window.cacheManager.set('yandex-folder-id', this.yandexFolderId);
                await window.cacheManager.set('yandex-model', this.yandexModel);

                // Обновляем менеджер провайдеров
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

                // Обновляем исходные значения
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

                // Устанавливаем состояние "Сохранено"
                this.isSaved = true;
                this.updateSaveButton();

                console.log('ai-api-settings: настройки сохранены');
            } catch (error) {
                console.error('ai-api-settings: ошибка сохранения настроек:', error);
            }
        },

        /**
         * Обработка отмены
         */
        handleCancel() {
            if (this.isSaved) {
                // Если уже сохранено - закрываем модальное окно
                this.closeModal();
            } else {
                // Восстанавливаем исходные значения
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
                // Skill anchor: health-check на file:// может давать ложные CORS ошибки, это не баг провайдера.
                // See app/skills/file-protocol-cors-guard
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
         * Закрытие модального окна с удалением фокуса
         */
        closeModal() {
            if (this.modalApi && this.modalApi.hide) {
                this.modalApi.hide();
            }
        },

        /**
         * Обновление состояния кнопки "Сохранить"
         */
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
                // Обычное состояние
                this.modalApi.updateButton('save', {
                    label: 'Сохранить',
                    variant: 'primary',
                    disabled: !this.hasChanges || !this.isValid
                });
            }
        },

        /**
         * Переключение видимости API ключа Yandex
         */
        toggleYandexApiKeyVisibility() {
            this.showYandexApiKey = !this.showYandexApiKey;
        },

        /**
         * Переключение видимости GitHub token
         */
        toggleGithubTokenVisibility() {
            this.showGithubToken = !this.showGithubToken;
        }
    }
};

