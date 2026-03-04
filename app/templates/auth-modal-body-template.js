/**
 * ================================================================================================
 * AUTH MODAL BODY TEMPLATE - Auth modal body component template
 * ================================================================================================
 *
 * PURPOSE: Template for auth modal body (auth-modal-body).
 *
 * PROBLEM: Template must be in DOM before Vue.js init for component to work.
 *
 * SOLUTION: Template stored as string in JS file and auto-inserted into DOM
 * on load as <script type="text/x-template"> with id="auth-modal-body-template".
 *
 * HOW:
 * - Template defined as string in TEMPLATE constant
 * - On load, <script type="text/x-template"> element is auto-created
 * - Element added to document.body with id="auth-modal-body-template"
 * - Component uses template via template: '#auth-modal-body-template'
 *
 * TEMPLATE FEATURES:
 * HTML structure:
 * - Container with loading state (spinner)
 * - User info block (if authenticated)
 * - Unauthenticated state message block
 *
 * REFERENCES:
 * - General principles работы с шаблонами: app/skills/ui-architecture
 * - Компонент: app/components/auth-modal-body.js
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
