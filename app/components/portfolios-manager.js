/**
 * ================================================================================================
 * PORTFOLIOS MANAGER COMPONENT - Компонент управления портфелями
 * ================================================================================================
 *
 * PURPOSE: Vue-компонент for managing портфелями пользователя через Cloudflare API.
 *
 * @skill-anchor app/skills/component-classes-management #for-classes-add-remove
 * @skill-anchor app/skills/bootstrap-vue-integration #for-bootstrap-event-proxying
 * @skill-anchor app/skills/vue-implementation-patterns #for-utility-availability-check
 *
 * Skill: core/skills/domain-portfolio
 *
 * API КОМПОНЕНТА:
 *
 * Props: нет
 *
 * Events:
 * - portfolio-created — эмитируется после создания портфеля
 * - portfolio-updated — эмитируется после обновления портфеля
 * - portfolio-deleted — эмитируется после удаления портфеля
 *
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
         * Заголовок модального окна
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
        // Проверка авторизации перед загрузкой
        if (window.authClient) {
            const authenticated = await window.authClient.isAuthenticated();
            if (authenticated) {
                await this.loadPortfolios();
            }
        }
    },

    methods: {
        /**
         * Загрузка списка портфелей
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
                this.error = error.message || 'Ошибка при загрузке портфелей';
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * Открытие модального окна for создания портфеля
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
         * Открытие модального окна for редактирования портфеля
         * @param {Object} portfolio - Портфель for редактирования
         */
        openEditModal(portfolio) {
            this.isEditing = true;
            this.editingPortfolioId = portfolio.id;
            // Глубокое копирование assets for предотвращения мутаций оригинальных данных
            const assetsCopy = portfolio.assets && Array.isArray(portfolio.assets)
                ? portfolio.assets.map(asset => ({ ...asset }))
                : [];
            this.formData = {
                name: portfolio.name || '',
                description: portfolio.description || '',
                assets: assetsCopy,
            };
            // Сохраняем исходные данные for восстановления при отмене
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
         * Открытие портфеля (пока заглушка)
         * @param {string|number} portfolioId - ID портфеля
         */
        openPortfolio(portfolioId) {
            console.log('portfolios-manager.openPortfolio:', portfolioId);
            // TODO: Реализовать открытие портфеля (будет на Этапе 8)
        },

        /**
         * Подтверждение удаления портфеля
         * @param {Object} portfolio - Портфель for удаления
         */
        confirmDelete(portfolio) {
            this.deletePortfolio(portfolio.id);
        },

        /**
         * Удаление портфеля
         * @param {string|number} portfolioId - ID портфеля
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

                // Перезагружаем list portfolios
                await this.loadPortfolios();
            } catch (error) {
                console.error('portfolios-manager.deletePortfolio error:', error);
                this.error = error.message || 'Ошибка при удалении портфеля';
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * Сохранение портфеля (создание или обновление)
         * Вызывается из portfolio-modal-body через onSave
         * @param {string} name - Название портфеля
         * @param {string} description - Описание портфеля
         * @param {Array} assets - Активы портфеля
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

                // Обновляем formData с сохраненными данными
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

                // Перезагружаем list portfolios
                await this.loadPortfolios();
            } catch (error) {
                console.error('portfolios-manager.handleSave error:', error);
                this.error = error.message || 'Ошибка при сохранении портфеля';
                this.isLoading = false;
            }
        },

        /**
         * Отмена редактирования
         * Вызывается из portfolio-modal-body через onCancel
         */
        handleCancel() {
            // Восстанавливаем исходные данные
            this.formData = {
                name: this.initialFormData.name,
                description: this.initialFormData.description,
                assets: this.initialFormData.assets.map(asset => ({ ...asset })),
            };

            // Закрываем модальное окно
            if (this.$refs.portfolioModal) {
                this.$refs.portfolioModal.hide();
            }
        },

        /**
         * Форматирование даты for отображения
         * @param {string} dateString - Дата в формате ISO
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
