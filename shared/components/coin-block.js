/**
 * ================================================================================================
 * COIN BLOCK - Компонент for отображения монеты
 * ================================================================================================
 *
 * PURPOSE: Переиспользуемый компонент for отображения информации о монете.
 * Адаптирован из do-overs/BOT/ui/components/cell-coin.js с удалением привязки к CoinGecko.
 *
 * @skill-anchor app/skills/component-classes-management #for-classes-add-remove
 * @skill-anchor app/skills/bootstrap-vue-integration #for-bootstrap-event-proxying
 * @skill-anchor app/skills/vue-implementation-patterns #for-utility-availability-check
 *
 * USAGE:
 * <coin-block
 *   :coin-id="coin.id"
 *   :symbol="coin.symbol"
 *   :name="coin.name"
 *   :image="coin.image"
 *   @context-menu="handleContextMenu">
 * </coin-block>
 *
*/

(function() {
    'use strict';

    window.cmpCoinBlock = {
        template: '#coin-block-template',
        components: {
            'cmp-dropdown': window.cmpDropdown,
            'cmp-dropdown-menu-item': window.cmpDropdownMenuItem
        },

        props: {
            // ID монеты (обязательно for событий и хэширования)
            coinId: {
                type: String,
                required: true
            },
            // Тикер монеты (BTC, ETH, USDT)
            symbol: {
                type: String,
                default: ''
            },
            // Полное название монеты (Bitcoin, Ethereum)
            name: {
                type: String,
                default: ''
            },
            // URL иконки монеты
            image: {
                type: String,
                default: ''
            },
            // Fallback URL иконки монеты (если основная не загрузится)
            fallbackImage: {
                type: String,
                default: ''
            },
            // Находится ли монета в избранном
            isFavorite: {
                type: Boolean,
                default: false
            },
            // CSS-классы for частей компонента
            cssClasses: {
                type: Object,
                default: () => ({
                    container: '',
                    icon: '',
                    symbol: ''
                })
            },
            // Применить стили for обрезания текста (overflow: hidden, text-overflow: ellipsis, white-space: nowrap)
            applyTextOverflow: {
                type: Boolean,
                default: false
            }
        },

        data() {
            return {
                // Не подставляем принудительно CDN URL при пустом image:
                // если у монеты нет картинки, лучше показать текст без "битой" иконки.
                currentImage: this.image || this.fallbackImage || ''
            };
        },

        watch: {
            // Если иконка изменилась в props (например, при переключении монет), обновляем локальное состояние
            image(newVal) {
                this.currentImage = newVal || this.fallbackImage || '';
            },
            fallbackImage(newVal) {
                if (!this.currentImage && newVal) {
                    this.currentImage = newVal;
                }
            }
        },

        computed: {
            /**
             * Детерминированный хэш экземпляра на основе coinId
             * Стабилен между сессиями - один и тот же coinId всегда дает один и тот же хэш
             */
            instanceHash() {
                if (!window.hashGenerator) {
                    console.warn('coin-block: hashGenerator not found, using fallback');
                    return 'coin-00000000';
                }
                return window.hashGenerator.generateMarkupClass(this.coinId);
            },

            /**
             * Классы for обрезания текста (если applyTextOverflow === true)
             */
            textOverflowClasses() {
                return this.applyTextOverflow ? 'overflow-hidden text-truncate' : '';
            },

            /**
             * Полный заголовок for tooltip
             */
            tooltipTitle() {
                if (this.name && this.symbol) {
                    return `${this.name} (${this.symbol.toUpperCase()})`;
                } else if (this.name) {
                    return this.name;
                } else if (this.symbol) {
                    return this.symbol.toUpperCase();
                } else {
                    return this.coinId;
                }
            },

            // Реактивные подсказки
            tooltipsConfig() {
                return window.tooltipsConfig || null;
            },

            currentLanguage() {
                return window.uiState?.getState()?.tooltips?.currentLanguage || 'ru';
            },

            favoriteTitle() {
                const lang = this.currentLanguage; // Establish dependency
                if (!this.tooltipsConfig) return this.isFavorite ? 'Убрать' : 'Добавить';
                return this.isFavorite
                    ? this.tooltipsConfig.getTooltip('ui.coinBlock.favorite.remove')
                    : this.tooltipsConfig.getTooltip('ui.coinBlock.favorite.add');
            },

            openTitle() {
                const lang = this.currentLanguage; // Establish dependency
                return this.tooltipsConfig ? this.tooltipsConfig.getTooltip('ui.coinBlock.open') : 'Открыть';
            },

            deleteTitle() {
                const lang = this.currentLanguage; // Establish dependency
                return this.tooltipsConfig ? this.tooltipsConfig.getTooltip('ui.coinBlock.delete') : 'Удалить';
            },

            /**
             * Можно ли редактировать иконку (Dev-only)
             */
            canEditIcon() {
                return window.iconManager && window.iconManager.canEditIcons();
            },

            /**
             * Является ли монета стейблкоином
             */
            isStable() {
                return window.coinsConfig && window.coinsConfig.isStablecoinId(this.coinId);
            },

            /**
             * Является ли монета оберткой или LST
             */
            isWrapped() {
                return window.coinsConfig && window.coinsConfig.isWrappedOrLst(this.coinId, this.symbol, this.name);
            },

            /**
             * Тип монеты for UI-индикаторов (ЕИП)
             */
            coinType() {
                if (!window.coinsConfig || !window.coinsConfig.getCoinType) return null;
                return window.coinsConfig.getCoinType(this.coinId, this.symbol, this.name);
            },

            coinTypeIcon() {
                if (!window.coinsConfig || !window.coinsConfig.getCoinTypeIcon) return null;
                return window.coinsConfig.getCoinTypeIcon(this.coinType);
            },

            coinTypeTitle() {
                if (!window.coinsConfig || !window.coinsConfig.getCoinTypeTitle) return null;
                return window.coinsConfig.getCoinTypeTitle(this.coinType);
            }
        },

        methods: {
            /**
             * Обработка клика - эмитим событие for родительского компонента
             */
            handleClick(event) {
                this.$emit('click', event, this.coinId);
                this.$emit('context-menu', event, this.coinId);
            },

            /**
             * Обработка контекстного меню (ПКМ)
             */
            handleContextMenu(event) {
                this.$emit('context-menu', event, this.coinId);
            },

            /**
             * Переключить состояние избранного
             */
            handleToggleFavorite() {
                this.$emit('toggle-favorite', {
                    id: this.coinId,
                    symbol: this.symbol
                });
            },

            /**
             * Открыть монету на Bybit
             */
            handleOpenBybit() {
                if (!this.symbol) {
                    console.error('Тикер монеты отсутствует');
                    return;
                }

                // Формируем ссылку: https://www.bybit.com/trade/usdt/{тикер}USDT
                const ticker = this.symbol.toUpperCase();
                const url = `https://www.bybit.com/trade/usdt/${ticker}USDT`;

                // Открываем в новой вкладке
                window.open(url, '_blank');
            },

            /**
             * Delete монету из таблицы
             */
            handleDelete() {
                this.$emit('delete-coin', this.coinId);
            },

            /**
             * Открыть модальное окно замены иконки
             */
            handleReplaceIcon() {
                this.$emit('replace-icon', {
                    id: this.coinId,
                    symbol: this.symbol,
                    name: this.name,
                    image: this.image,
                    fallbackImage: this.fallbackImage,
                    currentImage: this.currentImage
                });
            },

            /**
             * Обработка ошибки загрузки иконки
             * Переключаемся на fallback URL если доступен
             */
            handleImageError() {
                if (this.fallbackImage && this.currentImage !== this.fallbackImage) {
                    // console.warn(`coin-block: failed to загрузить основную иконку for ${this.coinId}, пробуем fallback...`);
                    this.currentImage = this.fallbackImage;
                } else {
                    // Если fallback отсутствует/тоже битый — скрываем img, чтобы не показывать broken icon.
                    this.currentImage = '';
                }
            }
        }
    };

    console.log('✅ coin-block component loaded');
})();
