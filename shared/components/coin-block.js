/**
 * #JS-2d36obxo
 * @description Reusable coin display component; extends cell-coin (dropdown, favorites).
 * @skill-anchor id:sk-add9a6 #for-classes-add-remove
 * @skill-anchor id:sk-eeb23d #for-bootstrap-event-proxying
 * @skill-anchor id:sk-cb75ec #for-utility-availability-check
 *
 * USAGE: <coin-block :coin-id="coin.id" :symbol="coin.symbol" :name="coin.name" :image="coin.image" @context-menu="handleContextMenu" />
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
            // Coin ID (required for events and hashing)
            coinId: {
                type: String,
                required: true
            },
            // Coin ticker (BTC, ETH, USDT)
            symbol: {
                type: String,
                default: ''
            },
            // Full coin name (Bitcoin, Ethereum)
            name: {
                type: String,
                default: ''
            },
            // Coin icon URL
            image: {
                type: String,
                default: ''
            },
            // Fallback icon URL (if primary fails to load)
            fallbackImage: {
                type: String,
                default: ''
            },
            // Is coin in favorites
            isFavorite: {
                type: Boolean,
                default: false
            },
            // CSS classes for component parts
            cssClasses: {
                type: Object,
                default: () => ({
                    container: '',
                    icon: '',
                    symbol: ''
                })
            },
            // Apply text truncation (overflow: hidden, text-overflow: ellipsis)
            applyTextOverflow: {
                type: Boolean,
                default: false
            }
        },

        data() {
            return {
                // Do not force CDN URL when image empty; show text without broken icon
                currentImage: this.image || this.fallbackImage || ''
            };
        },

        watch: {
            // When image changes in props (e.g. coin switch), update local state
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
             * Deterministic instance hash from coinId; stable across sessions
             */
            instanceHash() {
                if (!window.hashGenerator) {
                    console.warn('coin-block: hashGenerator not found, using fallback');
                    return 'coin-00000000';
                }
                return window.hashGenerator.generateMarkupClass(this.coinId);
            },

            /**
             * Classes for text truncation when applyTextOverflow === true
             */
            textOverflowClasses() {
                return this.applyTextOverflow ? 'overflow-hidden text-truncate' : '';
            },

            /**
             * Full title for tooltip
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

            // Reactive tooltips config
            tooltipsConfig() {
                return window.tooltipsConfig || null;
            },

            currentLanguage() {
                return window.uiState?.getState()?.tooltips?.currentLanguage || 'ru';
            },

            favoriteTitle() {
                const lang = this.currentLanguage;
                if (!this.tooltipsConfig) return this.isFavorite ? 'Убрать' : 'Добавить';
                return this.isFavorite
                    ? this.tooltipsConfig.getTooltip('ui.coinBlock.favorite.remove', lang)
                    : this.tooltipsConfig.getTooltip('ui.coinBlock.favorite.add', lang);
            },

            openTitle() {
                const lang = this.currentLanguage;
                return this.tooltipsConfig ? this.tooltipsConfig.getTooltip('ui.coinBlock.open', lang) : 'Открыть';
            },

            deleteTitle() {
                const lang = this.currentLanguage;
                return this.tooltipsConfig ? this.tooltipsConfig.getTooltip('ui.coinBlock.delete', lang) : 'Удалить';
            },

            /**
             * Whether icon can be edited (dev-only)
             */
            canEditIcon() {
                return window.iconManager && window.iconManager.canEditIcons();
            },

            /**
             * Is coin a stablecoin
             */
            isStable() {
                return window.coinsConfig && window.coinsConfig.isStablecoinId(this.coinId);
            },

            /**
             * Is coin wrapped or LST
             */
            isWrapped() {
                return window.coinsConfig && window.coinsConfig.isWrappedOrLst(this.coinId, this.symbol, this.name);
            },

            /**
             * Coin type for UI indicators (SSOT)
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
                return window.coinsConfig.getCoinTypeTitle(this.coinType, this.coinId, this.symbol, this.name);
            }
        },

        methods: {
            /**
             * Click handler - emit event for parent
             */
            handleClick(event) {
                this.$emit('click', event, this.coinId);
                this.$emit('context-menu', event, this.coinId);
            },

            /**
             * Context menu (right-click) handler
             */
            handleContextMenu(event) {
                this.$emit('context-menu', event, this.coinId);
            },

            /**
             * Toggle favorite state
             */
            handleToggleFavorite() {
                this.$emit('toggle-favorite', {
                    id: this.coinId,
                    symbol: this.symbol
                });
            },

            /**
             * Open coin on Bybit
             */
            handleOpenBybit() {
                if (!this.symbol) {
                    console.error('Coin ticker missing');
                    return;
                }

                const ticker = this.symbol.toUpperCase();
                const url = `https://www.bybit.com/trade/usdt/${ticker}USDT`;

                // Open in new tab
                window.open(url, '_blank');
            },

            /**
             * Show candles modal
             */
            handleShowCandles() {
                // Emit event to app-ui-root to show modal
                if (window.eventBus) {
                    window.eventBus.emit('ui:show-modal', {
                        modalId: 'candlesModal',
                        props: {
                            coinId: this.coinId,
                            symbol: this.symbol
                        }
                    });
                } else {
                    console.warn('coin-block: eventBus not found');
                }
            },

            /**
             * Delete coin from table
             */
            handleDelete() {
                this.$emit('delete-coin', this.coinId);
            },

            /**
             * Open icon replace modal
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
             * Icon load error handler; switch to fallback URL if available
             */
            handleImageError() {
                if (this.fallbackImage && this.currentImage !== this.fallbackImage) {
                    this.currentImage = this.fallbackImage;
                } else {
                    // No fallback or fallback also failed - hide img to avoid broken icon
                    this.currentImage = '';
                }
            }
        }
    };

    console.log('✅ coin-block component loaded');
})();
