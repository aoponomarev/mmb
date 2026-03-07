/**
 * #JS-KH3kmtFT
 * @description x-template for auth-button: login button or user profile dropdown; responsive (mobile icon only).
 *
 * REFERENCES: #JS-Jd4ASwEo (auth-button.js)
 */

(function() {
    'use strict';

    const template = `
        <div class="auth-button-wrapper">
            <!-- Login button (if not authenticated) -->
            <cmp-button
                v-if="!isAuthenticated"
                :label="'Войти через Google'"
                :label-short="'Войти'"
                icon="fab fa-google"
                variant="outline-primary"
                size="sm"
                :loading="isLoading"
                @click="handleLogin"
                button-id="auth-login-button"
            />

            <!-- Profile dropdown (if authenticated) -->
            <cmp-dropdown
                v-else
                :button-attributes="{
                    'data-bs-toggle': 'dropdown',
                    'aria-expanded': 'false',
                    'id': 'auth-profile-dropdown',
                    'class': 'btn btn-sm btn-outline-secondary'
                }"
            >
                <template #button-content>
                    <div class="d-flex align-items-center gap-2">
                        <img
                            v-if="user && user.picture"
                            :src="user.picture"
                            :alt="user.name || user.email"
                            class="rounded-circle"
                            style="width: 24px; height: 24px; object-fit: cover;"
                        />
                        <i v-else class="fas fa-user-circle"></i>
                        <span class="d-none d-md-inline">{{ userDisplayName }}</span>
                    </div>
                </template>

                <template #menu-items>
                    <div class="px-3 py-2 border-bottom">
                        <div class="fw-bold">{{ userDisplayName }}</div>
                        <div class="text-muted small">{{ user && user.email ? user.email : '' }}</div>
                    </div>
                    <dropdown-menu-item
                        icon="fas fa-sign-out-alt"
                        label="Выйти"
                        @click="handleLogout"
                    />
                </template>
            </cmp-dropdown>
        </div>
    `;

    /**
     * Insert template into DOM
     */
    function insertTemplate() {
        const templateScript = document.createElement('script');
        templateScript.type = 'text/x-template';
        templateScript.id = 'auth-button-template';
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
