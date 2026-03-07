/**
 * #JS-sy2Co9p9
 * @description x-template for auth modal body; id="auth-modal-body-template"; loading, user info, unauthenticated message.
 *
 * REFERENCES: id:sk-318305; #JS-pZ2DyWkj (auth-modal-body.js)
 */

(function() {
    'use strict';

    const TEMPLATE = `<div class="auth-modal-body">
    <div v-if="isLoading" class="text-center py-3">
        <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Загрузка...</span>
        </div>
    </div>
    <div v-else>
        <div v-if="isAuthenticated && user">
            <p class="mb-1"><strong>Авторизован:</strong> {{ userDisplayName }}</p>
            <p class="mb-0"><strong>Email:</strong> {{ user.email || 'Не указан' }}</p>
        </div>
        <div v-else class="text-center py-3">
            <p class="text-muted">Нажмите "Авторизоваться" for входа через Google</p>
        </div>
    </div>
</div>`;

    /**
     * Insert template into DOM
     */
    function insertTemplate() {
        const templateScript = document.createElement('script');
        templateScript.type = 'text/x-template';
        templateScript.id = 'auth-modal-body-template';
        templateScript.textContent = TEMPLATE;
        document.body.appendChild(templateScript);
    }

    // Insert template on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', insertTemplate);
    } else {
        insertTemplate();
    }
})();
