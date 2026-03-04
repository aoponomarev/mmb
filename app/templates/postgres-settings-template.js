/**
 * ================================================================================================
 * POSTGRES SETTINGS TEMPLATE - PostgreSQL API settings component template
 * ================================================================================================
 *
 * PURPOSE: Template for postgres-settings component.
 *
 * REFERENCES:
 * - Component: app/components/postgres-settings.js
 * - Template principles: id:sk-483943
 */

(function() {
    'use strict';

    const TEMPLATE = `<div>
    <div class="mb-3">
        <div class="form-check form-switch">
            <input
                class="form-check-input"
                type="checkbox"
                role="switch"
                :id="formIdPrefix + '-enabled'"
                v-model="syncEnabled">
            <label class="form-check-label" :for="formIdPrefix + '-enabled'">
                Синхронизация с PostgreSQL (Yandex Cloud)
            </label>
        </div>
        <small class="form-text text-muted">Только подготовка. Запись в БД будет включена позже.</small>
    </div>

    <div class="mb-3">
        <label :for="formIdPrefix + '-base-url'" class="form-label">API base URL</label>
        <input
            class="form-control"
            :id="formIdPrefix + '-base-url'"
            type="text"
            v-model="apiBaseUrl"
            placeholder="https://api.example.com">
        <small class="form-text text-muted mb-3 d-block">
            Используется for health и будущих CRUD эндпоинтов.
        </small>

        <div class="d-flex align-items-center gap-2 mb-2">
            <button
                type="button"
                class="btn btn-outline-secondary btn-sm"
                :disabled="!isValid || isCheckingHealth"
                @click="checkHealth"
            >
                <span v-if="isCheckingHealth" class="spinner-border spinner-border-sm me-1" role="status"></span>
                Проверить соединение
            </button>
            <span v-if="healthStatus" :class="['badge', healthStatus === 'OK' ? 'bg-success' : 'bg-danger']">
                {{ healthStatus }}
            </span>
        </div>
    </div>

    <div class="alert alert-secondary py-2 mb-0">
        <div class="small text-muted">
            Текущий health endpoint:
            <span class="fw-semibold text-body">{{ healthEndpoint || '—' }}</span>
        </div>
    </div>
</div>`;

    const template = document.createElement('template');
    template.innerHTML = `<script type="text/x-template" id="postgres-settings-template">${TEMPLATE}</script>`;
    document.body.appendChild(template.content);
})();
