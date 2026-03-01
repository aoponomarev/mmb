/**
 * ================================================================================================
 * AUTH BUTTON TEMPLATE - Шаблон компонента кнопки авторизации
 * ================================================================================================
 *
 * ЦЕЛЬ: Шаблон для компонента auth-button с условным отображением кнопки входа или профиля пользователя.
 *
 * АДАПТИВНОСТЬ:
 * - Если не авторизован: кнопка "Войти через Google" с иконкой
 * - Если авторизован: dropdown с профилем пользователя (аватар, имя, email) и кнопкой выхода
 *
 * BOOTSTRAP КЛАССЫ:
 * - Используется cmp-dropdown для меню профиля
 * - Используется cmp-button для кнопки входа
 * - Все стили через Bootstrap классы
 *
 * АДАПТИВНОСТЬ:
 * - На мобильных: только иконка Google
 * - На десктопе: иконка + текст "Войти через Google"
 *
 * ССЫЛКИ:
 * - Компонент: app/components/auth-button.js
 */

(function() {
    'use strict';

    const template = `
        <div class="auth-button-wrapper">
            <!-- Кнопка входа (если не авторизован) -->
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

            <!-- Dropdown с профилем (если авторизован) -->
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
     * Вставляет шаблон в DOM
     */
    function insertTemplate() {
        const templateScript = document.createElement('script');
        templateScript.type = 'text/x-template';
        templateScript.id = 'auth-button-template';
        templateScript.textContent = template;
        document.body.appendChild(templateScript);
    }

    // Вставляем шаблон при загрузке
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', insertTemplate);
    } else {
        insertTemplate();
    }
})();
