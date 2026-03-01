/**
 * ================================================================================================
 * STORAGE RESET MODAL BODY COMPONENT - Компонент body модального окна сброса кэша
 * ================================================================================================
 *
 * ЦЕЛЬ: Выборочное удаление данных из кэша по категориям.
 *
 * Skill: core/skills/cache-layer
 *
 * ОСОБЕННОСТИ:
 * - Чекбоксы для выбора категорий кэша
 * - Автоматический выбор всех категорий при выборе "Полностью"
 * - Регистрация кнопки "Сбросить выбранное" через modalApi
 * - Удаление данных через cacheManager.delete()
 *
 * КАТЕГОРИИ:
 * - Настройки API: yandex-api-key, ai-provider, yandex-folder-id, yandex-model, yandex-proxy-type
 * - Настройки интерфейса: theme, timezone, favorites, ui-state, active-tab, translation-language
 * - Портфели: portfolios, strategies
 * - Рыночные данные: market-metrics, coins-list, top-coins, top-coins-by-market-cap, top-coins-by-volume, stablecoins-list, vix-index, fear-greed-index, time-series, correlations
 * - История операций: history
 * - Кэш и ресурсы: api-cache, icons-cache, crypto-news-state
 * - Переводы: tooltips-*, app-messages-translations-*
 * - Полностью: все категории КРОМЕ API-ключей (требуют явного выбора) + settings
 *
 * API КОМПОНЕНТА:
 *
 * Inject:
 * - modalApi — API для управления кнопками (предоставляется cmp-modal)
 *
 * ССЫЛКИ:
 * - Система управления кнопками: shared/components/modal.js
 * - Cache Manager: core/cache/cache-manager.js
 */

window.storageResetModalBody = {
    template: `
        <div class="container-fluid">
            <p class="text-muted mb-3">Выберите категории данных для удаления из кэша. <strong>API-ключи</strong> не включены в "Полностью" и требуют явного выбора.</p>
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
                // При выборе "Полностью" выбираем все категории КРОМЕ API-ключей —
                // они требуют явного ручного подтверждения, чтобы не слетали случайно.
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
                // При снятии любого чекбокса (кроме apiSettings) снимаем "Полностью"
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

                // Настройки API (критичные ключи и пути защищены от удаления)
                if (this.selectedCategories.apiSettings || this.selectedCategories.all) {
                    keysToDelete.push(
                        'yandex-api-key',
                        'ai-provider',
                        'yandex-folder-id',
                        'yandex-model',
                        'yandex-proxy-type'
                    );
                }

                // Настройки интерфейса
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

                // Портфели
                if (this.selectedCategories.portfolios || this.selectedCategories.all) {
                    keysToDelete.push('portfolios', 'strategies');
                }

                // Рыночные данные
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

                // История операций
                if (this.selectedCategories.history || this.selectedCategories.all) {
                    keysToDelete.push('history');
                }

                // Кэш и ресурсы
                if (this.selectedCategories.cacheResources || this.selectedCategories.all) {
                    keysToDelete.push(
                        'api-cache',
                        'icons-cache',
                        'crypto-news-state'
                    );
                }

                // Переводы
                if (this.selectedCategories.translations || this.selectedCategories.all) {
                    // Удаляем все ключи переводов (tooltips-* и app-messages-translations-*)
                    if (window.storageLayers) {
                        // Получаем все ключи из всех слоев
                        for (const layerName of ['hot', 'warm', 'cold']) {
                            try {
                                const storage = window.storageLayers.getStorage(layerName);
                                if (storage) {
                                    const allKeys = await storage.keys();
                                    for (const key of allKeys) {
                                        // Проверяем версионированные ключи
                                        if (key.startsWith('v:')) {
                                            const parts = key.split(':');
                                            if (parts.length >= 3) {
                                                const unversionedKey = parts.slice(2).join(':');
                                                if (unversionedKey.startsWith('tooltips-') || unversionedKey.startsWith('app-messages-translations-')) {
                                                    keysToDelete.push(key);
                                                }
                                            }
                                        } else {
                                            // Неверсионированные ключи
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

                // Полностью - добавляем settings
                if (this.selectedCategories.all) {
                    keysToDelete.push('settings');
                }

                // При сбросе рыночных данных или полном сбросе — очищаем журнал запросов,
                // чтобы снять блокировку rate limit (12-часовая блокировка после 429).
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
                        console.error(`Ошибка удаления ключа ${key}:`, error);
                    }
                }

                if (window.eventBus) {
                    window.eventBus.emit('cache-reset', { keys: uniqueKeys });
                }
                alert(`Удалено ${deletedCount} из ${uniqueKeys.length} ключей кэша.`);

                // Ключи вне cacheManager, которые тоже должны переживать reset
                // (localStorage-токен и backup с ключами)
                // Ничего не удаляем намеренно.

                // Закрываем модальное окно
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
                console.error('Ошибка при сбросе кэша:', error);
                alert('Произошла ошибка при удалении данных из кэша.');
            } finally {
                this.isResetting = false;
                this.updateResetButton();
            }
        }
    },

    mounted() {
        // Регистрируем кнопку "Сбросить выбранное" в footer
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
        // Удаляем кнопку при размонтировании
        if (this.modalApi) {
            this.modalApi.removeButton('reset');
        }
    }
};
