/**
 * ================================================================================================
 * PORTFOLIOS MANAGER TEMPLATE - Portfolio management component template
 * ================================================================================================
 *
 * PURPOSE: Template for portfolios-manager with portfolio list and create/edit modal.
 *
 * REFERENCES:
 * - Portfolio list (cards or table)
 * - "Create portfolio" button
 * - Modal for portfolio create/edit
 *
 * BOOTSTRAP CLASSES:
 * - cmp-modal for modal
 * - cmp-button for action buttons
 * - All styles via Bootstrap classes
 *
 * REFERENCES:
 * - Component: app/components/portfolios-manager.js
 */

(function() {
    'use strict';

    const template = `
        <div class="portfolios-manager-wrapper">
            <!-- Header and create button -->
            <div class="d-flex justify-content-start align-items-center gap-3 mb-3">
                <h3>Мои portfolioи</h3>
                <cmp-button
                    label="Создать portfolioь"
                    icon="fas fa-plus"
                    variant="primary"
                    size="sm"
                    :loading="isLoading"
                    @click="openCreateModal"
                    button-id="create-portfolio-button"
                />
            </div>

            <!-- Error message -->
            <div v-if="error" class="alert alert-danger alert-dismissible fade show" role="alert">
                {{ error }}
                <button type="button" class="btn-close" @click="error = null" aria-label="Close"></button>
            </div>

            <!-- Success message -->
            <div v-if="successMessage" class="alert alert-success alert-dismissible fade show" role="alert">
                {{ successMessage }}
                <button type="button" class="btn-close" @click="successMessage = null" aria-label="Close"></button>
            </div>

            <!-- Loading state -->
            <div v-if="isLoading && portfolios.length === 0" class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Загрузка...</span>
                </div>
                <p class="mt-2 text-muted">Загрузка portfolios...</p>
            </div>

            <!-- Empty state -->
            <div v-else-if="!isLoading && portfolios.length === 0" class="text-center py-5 border rounded">
                <i class="fas fa-folder-open fa-3x text-muted mb-3"></i>
                <p class="text-muted">У вас пока нет portfolios</p>
                <cmp-button
                    label="Создать первый portfolioь"
                    icon="fas fa-plus"
                    variant="primary"
                    @click="openCreateModal"
                    button-id="create-first-portfolio-button"
                />
            </div>

            <!-- Portfolio list -->
            <div v-else class="row g-3">
                <div v-for="portfolio in portfolios" :key="portfolio.id" class="col-12 col-md-6 col-lg-4">
                    <div class="card h-100">
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title">{{ portfolio.name }}</h5>
                            <p v-if="portfolio.description" class="card-text text-muted small flex-grow-1">
                                {{ portfolio.description }}
                            </p>
                            <div v-if="portfolio.assets && portfolio.assets.length > 0" class="mb-2">
                                <small class="text-muted">
                                    Активов: {{ portfolio.assets.length }}
                                </small>
                            </div>
                            <div class="mt-auto d-flex gap-2">
                                <cmp-button
                                    label="Открыть"
                                    icon="fas fa-eye"
                                    variant="outline-primary"
                                    size="sm"
                                    @click="openPortfolio(portfolio.id)"
                                    button-id="'open-portfolio-' + portfolio.id"
                                />
                                <cmp-button
                                    label="Редактировать"
                                    icon="fas fa-edit"
                                    variant="outline-secondary"
                                    size="sm"
                                    @click="openEditModal(portfolio)"
                                    button-id="'edit-portfolio-' + portfolio.id"
                                />
                                <cmp-button
                                    label="Удалить"
                                    icon="fas fa-trash"
                                    variant="outline-danger"
                                    size="sm"
                                    @click="confirmDelete(portfolio)"
                                    button-id="'delete-portfolio-' + portfolio.id"
                                />
                            </div>
                        </div>
                        <div class="card-footer text-muted small">
                            Создан: {{ formatDate(portfolio.created_at) }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Portfolio create/edit modal -->
            <cmp-modal
                :modal-id="'portfolioModal'"
                size="lg"
                :title="modalTitle"
                ref="portfolioModal"
            >
                <template #header>
                    <h5 class="modal-title">{{ modalTitle }}</h5>
                    <button type="button" class="btn-close" aria-label="Закрыть" data-bs-dismiss="modal"></button>
                </template>
                <template #body>
                    <portfolio-modal-body
                        v-model:name="formData.name"
                        v-model:description="formData.description"
                        v-model:assets="formData.assets"
                        :initial-name="initialFormData.name"
                        :initial-description="initialFormData.description"
                        :initial-assets="initialFormData.assets"
                        :is-editing="isEditing"
                        :on-save="handleSave"
                        :on-cancel="handleCancel"
                    />
                </template>
                <template #footer>
                    <cmp-modal-buttons location="footer" />
                </template>
            </cmp-modal>
        </div>
    `;

    /**
     * Insert template into DOM
     */
    function insertTemplate() {
        const templateScript = document.createElement('script');
        templateScript.type = 'text/x-template';
        templateScript.id = 'portfolios-manager-template';
        templateScript.textContent = template;
        document.body.appendChild(templateScript);
    }

    // Insert template on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', insertTemplate);
    } else {
        insertTemplate();
    }
})();
