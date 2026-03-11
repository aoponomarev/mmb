/**
 * #JS-8j2Hez4u
 * @description Portfolio management via Cloudflare API; emits portfolio-created, portfolio-updated, portfolio-deleted.
 * @skill id:sk-c3d639
 * @skill-anchor id:sk-add9a6 #for-classes-add-remove
 * @skill-anchor id:sk-eeb23d #for-bootstrap-event-proxying
 * @skill-anchor id:sk-cb75ec #for-utility-availability-check
 *
 * EVENTS: portfolio-created, portfolio-updated, portfolio-deleted.
 */

window.portfoliosManager = {
    template: '#portfolios-manager-template',

    components: {
        'cmp-button': window.cmpButton,
        'cmp-modal': window.cmpModal,
        'portfolio-modal-body': window.portfolioModalBody,
    },

    data() {
        return {
            portfolios: [],
            isLoading: false,
            error: null,
            successMessage: null,
            isEditing: false,
            editingPortfolioId: null,
            formData: {
                name: '',
                description: '',
                assets: [],
            },
            initialFormData: {
                name: '',
                description: '',
                assets: [],
            },
        };
    },

    computed: {
        /**
         * Modal title
         * @returns {string}
         */
        modalTitle() {
            if (window.modalsConfig) {
                const title = window.modalsConfig.getModalTitle('portfolioModal');
                if (title) return title;
            }
            return this.isEditing ? 'Редактировать портфель' : 'Создать портфель';
        },

    },

    async mounted() {
        // Check auth before load
        if (window.authClient) {
            const authenticated = await window.authClient.isAuthenticated();
            if (authenticated) {
                await this.loadPortfolios();
            }
        }
    },

    methods: {
        /**
         * Load portfolio list
         */
        async loadPortfolios() {
            try {
                if (!window.portfoliosClient) {
                    console.error('portfolios-manager: portfoliosClient not loaded');
                    return;
                }

                this.isLoading = true;
                this.error = null;

                const portfolios = await window.portfoliosClient.getPortfolios();
                this.portfolios = portfolios || [];
            } catch (error) {
                console.error('portfolios-manager.loadPortfolios error:', error);
                this.error = error.message || 'Ошибка при загрузке portfolios';
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * Open modal for portfolio creation
         */
        openCreateModal() {
            this.isEditing = false;
            this.editingPortfolioId = null;
            this.formData = {
                name: '',
                description: '',
                assets: [],
            };
            this.initialFormData = {
                name: '',
                description: '',
                assets: [],
            };
            this.error = null;
            this.successMessage = null;

            if (this.$refs.portfolioModal) {
                this.$refs.portfolioModal.show();
            }
        },

        /**
         * Open modal for portfolio edit
         * @param {Object} portfolio - Portfolio to edit
         */
        openEditModal(portfolio) {
            this.isEditing = true;
            this.editingPortfolioId = portfolio.id;
            // Deep copy assets to prevent mutating original data
            const assetsCopy = portfolio.assets && Array.isArray(portfolio.assets)
                ? portfolio.assets.map(asset => ({ ...asset }))
                : [];
            this.formData = {
                name: portfolio.name || '',
                description: portfolio.description || '',
                assets: assetsCopy,
            };
            // Store initial data for restore on cancel
            this.initialFormData = {
                name: portfolio.name || '',
                description: portfolio.description || '',
                assets: assetsCopy,
            };
            this.error = null;
            this.successMessage = null;

            if (this.$refs.portfolioModal) {
                this.$refs.portfolioModal.show();
            }
        },

        /**
         * Open portfolio (stub for now)
         * @param {string|number} portfolioId - Portfolio ID
         */
        openPortfolio(portfolioId) {
            console.log('portfolios-manager.openPortfolio:', portfolioId);
            // TODO: Implement portfolio open (Stage 8)
        },

        /**
         * Confirm portfolio deletion
         * @param {Object} portfolio - Portfolio to delete
         */
        confirmDelete(portfolio) {
            this.deletePortfolio(portfolio.id);
        },

        /**
         * Delete portfolio
         * @param {string|number} portfolioId - Portfolio ID
         */
        async deletePortfolio(portfolioId) {
            try {
                if (!window.portfoliosClient) {
                    throw new Error('portfoliosClient not loaded');
                }

                this.isLoading = true;
                this.error = null;

                await window.portfoliosClient.deletePortfolio(portfolioId);
                this.successMessage = 'Портфель успешно удалён';
                this.$emit('portfolio-deleted', portfolioId);

                // Reload portfolio list
                await this.loadPortfolios();
            } catch (error) {
                console.error('portfolios-manager.deletePortfolio error:', error);
                this.error = error.message || 'Ошибка при удалении portfolioя';
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * Save portfolio (create or update)
         * Called from portfolio-modal-body via onSave
         * @param {string} name - Portfolio name
         * @param {string} description - Portfolio description
         * @param {Array} assets - Portfolio assets
         */
        async handleSave(name, description, assets) {
            try {
                if (!window.portfoliosClient) {
                    throw new Error('portfoliosClient not loaded');
                }

                this.isLoading = true;
                this.error = null;

                const portfolioData = {
                    name: name,
                    description: description || null,
                    assets: assets.filter(asset => asset.coinId && asset.weight !== undefined),
                };

                let savedPortfolio;
                if (this.isEditing) {
                    savedPortfolio = await window.portfoliosClient.updatePortfolio(
                        this.editingPortfolioId,
                        portfolioData
                    );
                    this.successMessage = 'Портфель успешно обновлён';
                    this.$emit('portfolio-updated', savedPortfolio);
                } else {
                    savedPortfolio = await window.portfoliosClient.createPortfolio(portfolioData);
                    this.successMessage = 'Портфель успешно создан';
                    this.$emit('portfolio-created', savedPortfolio);
                }

                // Update formData with saved data
                this.formData = {
                    name: savedPortfolio.name || '',
                    description: savedPortfolio.description || '',
                    assets: savedPortfolio.assets || [],
                };
                this.initialFormData = {
                    name: savedPortfolio.name || '',
                    description: savedPortfolio.description || '',
                    assets: (savedPortfolio.assets || []).map(asset => ({ ...asset })),
                };

                // Reload portfolio list
                await this.loadPortfolios();
            } catch (error) {
                console.error('portfolios-manager.handleSave error:', error);
                this.error = error.message || 'Ошибка при сохранении portfolioя';
                this.isLoading = false;
            }
        },

        /**
         * Cancel editing
         * Called from portfolio-modal-body via onCancel
         */
        handleCancel() {
            // Restore initial data
            this.formData = {
                name: this.initialFormData.name,
                description: this.initialFormData.description,
                assets: this.initialFormData.assets.map(asset => ({ ...asset })),
            };

            // Close modal
            if (this.$refs.portfolioModal) {
                this.$refs.portfolioModal.hide();
            }
        },

        /**
         * Format date for display
         * @param {string} dateString - Date in ISO format
         * @returns {string}
         */
        formatDate(dateString) {
            if (!dateString) return '';
            try {
                const date = new Date(dateString);
                return date.toLocaleDateString('ru-RU', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                });
            } catch (error) {
                return dateString;
            }
        },
    },
};
