/**
 * #JS-Vz2p3xSA
 * @description Selective cache reset by category; checkboxes, Full = all except API keys; Reset via modalApi; cacheManager.delete().
 * @skill id:sk-3c832d
 * @skill-anchor id:sk-add9a6 #for-classes-add-remove
 * @skill-anchor id:sk-eeb23d #for-bootstrap-event-proxying
 * @skill-anchor id:sk-cb75ec #for-utility-availability-check
 *
 * CATEGORIES: API settings, UI settings, Portfolios, Market data, history, Cache/resources, Translations, Full. Inject: modalApi.
 */

window.storageResetModalBody = {
    template: `
        <div class="container-fluid">
            <p class="text-muted mb-3">Выберите категории данных for удаления из кэша. <strong>API-ключи</strong> не включены в "Полностью" и требуют явного выбора.</p>
            <div class="row g-3">
                <div class="col-md-6">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" :id="formIdPrefix + '-api-settings'" v-model="selectedCategories.apiSettings">
                        <label class="form-check-label" :for="formIdPrefix + '-api-settings'">
                            API-ключи <span class="text-danger fw-bold">⚠</span>
                            <small class="d-block text-muted">Yandex и др.</small>
                        </label>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" :id="formIdPrefix + '-ui-settings'" v-model="selectedCategories.uiSettings">
                        <label class="form-check-label" :for="formIdPrefix + '-ui-settings'">
                            Настройки интерфейса
                        </label>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" :id="formIdPrefix + '-portfolios'" v-model="selectedCategories.portfolios">
                        <label class="form-check-label" :for="formIdPrefix + '-portfolios'">
                            Портфели
                        </label>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" :id="formIdPrefix + '-market-data'" v-model="selectedCategories.marketData">
                        <label class="form-check-label" :for="formIdPrefix + '-market-data'">
                            Рыночные данные
                        </label>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" :id="formIdPrefix + '-history'" v-model="selectedCategories.history">
                        <label class="form-check-label" :for="formIdPrefix + '-history'">
                            История операций
                        </label>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" :id="formIdPrefix + '-cache-resources'" v-model="selectedCategories.cacheResources">
                        <label class="form-check-label" :for="formIdPrefix + '-cache-resources'">
                            Кэш и ресурсы
                        </label>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" :id="formIdPrefix + '-translations'" v-model="selectedCategories.translations">
                        <label class="form-check-label" :for="formIdPrefix + '-translations'">
                            Переводы
                        </label>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" :id="formIdPrefix + '-all'" v-model="selectedCategories.all">
                        <label class="form-check-label" :for="formIdPrefix + '-all'">
                            <strong>Полностью</strong>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    `,

    inject: ['modalApi'],

    data() {
        return {
            selectedCategories: {
                apiSettings: false,
                uiSettings: false,
                portfolios: false,
                marketData: false,
                history: false,
                cacheResources: false,
                translations: false,
                all: false
            },
            isResetting: false
        };
    },

    computed: {
        formIdPrefix() {
            return `storage-reset-modal-${this._uid || Math.random().toString(36).substr(2, 9)}`;
        },
        hasSelection() {
            return Object.values(this.selectedCategories).some(v => v === true);
        }
    },

    watch: {
        'selectedCategories.all'(newVal) {
            if (newVal) {
                // When "Full" selected, select all categories EXCEPT API keys —
                // they require explicit manual confirmation to avoid accidental loss.
                this.selectedCategories.uiSettings = true;
                this.selectedCategories.portfolios = true;
                this.selectedCategories.marketData = true;
                this.selectedCategories.history = true;
                this.selectedCategories.cacheResources = true;
                this.selectedCategories.translations = true;
            }
        },
        selectedCategories: {
            deep: true,
            handler(newVal) {
                // When any checkbox (except apiSettings) unchecked, uncheck "Full"
                if (newVal.all && (!newVal.uiSettings || !newVal.portfolios ||
                    !newVal.marketData || !newVal.history || !newVal.cacheResources || !newVal.translations)) {
                    this.selectedCategories.all = false;
                }
                this.updateResetButton();
            }
        }
    },

    methods: {
        updateResetButton() {
            if (!this.modalApi) return;

            this.modalApi.updateButton('reset', {
                label: this.isResetting ? 'Сброс...' : 'Сбросить выбранное',
                variant: 'danger',
                disabled: !this.hasSelection || this.isResetting
            });
        },

        async handleReset() {
            if (!this.hasSelection || this.isResetting) return;

            this.isResetting = true;
            this.updateResetButton();

            try {
                const keysToDelete = [];
                const protectedKeys = new Set([
                    'yandex-api-key',
                    'ai-provider',
                    'yandex-folder-id',
                    'yandex-model',
                    'postgres-api-base-url',
                    'postgres-sync-enabled'
                ]);

                // API settings (critical keys and paths protected from deletion)
                if (this.selectedCategories.apiSettings || this.selectedCategories.all) {
                    keysToDelete.push(
                        'yandex-api-key',
                        'ai-provider',
                        'yandex-folder-id',
                        'yandex-model',
                        'yandex-proxy-type'
                    );
                }

                // UI settings
                if (this.selectedCategories.uiSettings || this.selectedCategories.all) {
                    keysToDelete.push(
                        'theme',
                        'timezone',
                        'favorites',
                        'ui-state',
                        'active-tab',
                        'translation-language'
                    );
                }

                // Portfolios
                if (this.selectedCategories.portfolios || this.selectedCategories.all) {
                    keysToDelete.push('portfolios', 'strategies');
                }

                // Market data
                if (this.selectedCategories.marketData || this.selectedCategories.all) {
                    keysToDelete.push(
                        'market-metrics',
                        'coins-list',
                        'top-coins',
                        'top-coins-by-market-cap',
                        'top-coins-by-market-cap-meta',
                        'top-coins-by-volume',
                        'top-coins-by-volume-meta',
                        'stablecoins-list',
                        'vix-index',
                        'fear-greed-index',
                        'time-series',
                        'correlations'
                    );
                }

                // Operation history
                if (this.selectedCategories.history || this.selectedCategories.all) {
                    keysToDelete.push('history');
                }

                // Cache and resources
                if (this.selectedCategories.cacheResources || this.selectedCategories.all) {
                    keysToDelete.push(
                        'api-cache',
                        'icons-cache',
                        'crypto-news-state'
                    );
                }

                // Translations
                if (this.selectedCategories.translations || this.selectedCategories.all) {
                    // Delete all translation keys (tooltips-* and app-messages-translations-*)
                    if (window.storageLayers) {
                        // Get all keys from all layers
                        for (const layerName of ['hot', 'warm', 'cold']) {
                            try {
                                const storage = window.storageLayers.getStorage(layerName);
                                if (storage) {
                                    const allKeys = await storage.keys();
                                    for (const key of allKeys) {
                                        // Check versioned keys
                                        if (key.startsWith('v:')) {
                                            const parts = key.split(':');
                                            if (parts.length >= 3) {
                                                const unversionedKey = parts.slice(2).join(':');
                                                if (unversionedKey.startsWith('tooltips-') || unversionedKey.startsWith('app-messages-translations-')) {
                                                    keysToDelete.push(key);
                                                }
                                            }
                                        } else {
                                            // Non-versioned keys
                                            if (key.startsWith('tooltips-') || key.startsWith('app-messages-translations-')) {
                                                keysToDelete.push(key);
                                            }
                                        }
                                    }
                                }
                            } catch (error) {
                                console.error(`Ошибка получения ключей из слоя ${layerName}:`, error);
                            }
                        }
                    }
                }

                // Full - add settings
                if (this.selectedCategories.all) {
                    keysToDelete.push('settings');
                }

                // On market data or full reset — clear request journal
                // to lift rate limit block (12-hour block after 429).
                if ((this.selectedCategories.marketData || this.selectedCategories.all) && window.requestRegistry) {
                    window.requestRegistry.clear();
                }

                let deletedCount = 0;
                const uniqueKeys = [...new Set(keysToDelete)].filter(key => !protectedKeys.has(key));

                for (const key of uniqueKeys) {
                    try {
                        if (key.startsWith('v:')) {
                            const parts = key.split(':');
                            if (parts.length >= 3) {
                                const unversionedKey = parts.slice(2).join(':');
                                const layer = window.storageLayers ? window.storageLayers.getLayerForKey(unversionedKey) : null;
                                if (layer) {
                                    const storage = window.storageLayers.getStorage(layer.layer);
                                    if (storage) {
                                        await storage.delete(key);
                                        deletedCount++;
                                    }
                                }
                            }
                        } else {
                            const deleted = await window.cacheManager.delete(key);
                            if (deleted) {
                                deletedCount++;
                            }
                        }
                    } catch (error) {
                        console.error(`Error deleting key ${key}:`, error);
                    }
                }

                if (window.eventBus) {
                    window.eventBus.emit('cache-reset', { keys: uniqueKeys });
                }
                alert(`Удалено ${deletedCount} из ${uniqueKeys.length} ключей кэша.`);

                // Keys outside cacheManager that should survive reset
                // (localStorage token and key backup)
                // Intentionally delete nothing.

                // Close modal
                const modalElement = this.$el.closest('.modal');
                if (modalElement && window.bootstrap && window.bootstrap.Modal) {
                    const modalInstance = window.bootstrap.Modal.getInstance(modalElement);
                    if (modalInstance) {
                        if (document.activeElement && document.activeElement.blur) {
                            document.activeElement.blur();
                        }
                        modalInstance.hide();
                    }
                }
            } catch (error) {
                console.error('Cache reset error:', error);
                alert('Произошла ошибка при удалении данных из кэша.');
            } finally {
                this.isResetting = false;
                this.updateResetButton();
            }
        }
    },

    mounted() {
        // Register "Reset selected" button in footer
        if (this.modalApi) {
            this.modalApi.registerButton('reset', {
                locations: ['footer'],
                label: 'Сбросить выбранное',
                variant: 'danger',
                disabled: !this.hasSelection,
                onClick: () => this.handleReset()
            });
        }
    },

    beforeUnmount() {
        // Remove button on unmount
        if (this.modalApi) {
            this.modalApi.removeButton('reset');
        }
    }
};
