/**
 * ================================================================================================
 * AUTH MODAL BODY TEMPLATE - Шаблон компонента body модального окна авторизации
 * ================================================================================================
 *
 * ЦЕЛЬ: Шаблон для компонента body модального окна авторизации (auth-modal-body).
 *
 * ПРОБЛЕМА: Шаблон должен быть доступен в DOM до инициализации Vue.js для работы компонента.
 *
 * РЕШЕНИЕ: Шаблон хранится как строка в JavaScript файле и автоматически вставляется в DOM
 * при загрузке файла как <script type="text/x-template"> элемент с id="auth-modal-body-template".
 *
 * КАК ДОСТИГАЕТСЯ:
 * - Шаблон определён как строка в константе TEMPLATE
 * - При загрузке файла автоматически создаётся <script type="text/x-template"> элемент
 * - Элемент добавляется в document.body с id="auth-modal-body-template"
 * - Компонент использует шаблон через template: '#auth-modal-body-template'
 *
 * ОСОБЕННОСТИ ШАБЛОНА:
 * Структура HTML:
 * - Контейнер с состоянием загрузки (spinner)
 * - Блок с информацией о пользователе (если авторизован)
 * - Блок с сообщением о неавторизованном состоянии
 *
 * ССЫЛКИ:
 * - Общие принципы работы с шаблонами: a/skills/app/skills/components/components-template-split.md
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
            <p class="text-muted">Нажмите "Авторизоваться" для входа через Google</p>
        </div>
    </div>
</div>`;

    /**
     * Вставляет шаблон в DOM
     */
    function insertTemplate() {
        const templateScript = document.createElement('script');
        templateScript.type = 'text/x-template';
        templateScript.id = 'auth-modal-body-template';
        templateScript.textContent = TEMPLATE;
        document.body.appendChild(templateScript);
    }

    // Вставляем шаблон при загрузке
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', insertTemplate);
    } else {
        insertTemplate();
    }
})();
