/**
 * ================================================================================================
 * AI API SETTINGS TEMPLATE - AI API provider settings component template
 * ================================================================================================
 *
 * PURPOSE: Template for AI API provider settings (ai-api-settings).
 * Providers: GitHub, YandexGPT, PostgreSQL.
 *
 * PROBLEM: Template must be in DOM before Vue.js init for component to work.
 *
 * SOLUTION: Template stored as string in JS file and auto-inserted into DOM
 * on load as <script type="text/x-template"> with id="ai-api-settings-template".
 *
 * HOW:
 * - Template defined as string in TEMPLATE constant
 * - On load, <script type="text/x-template"> element is auto-created
 * - Element added to document.body with id="ai-api-settings-template"
 * - Component uses template via template: '#ai-api-settings-template'
 *
 * TEMPLATE FEATURES:
 * HTML structure:
 * - Radio buttons for provider selection (GitHub, YandexGPT, PostgreSQL)
 * - Conditional settings fields based on selected provider
 * - API key input fields (password/text with visibility toggle)
 * - Model selection via select
 * - Compact minimal interface
 *
 * REFERENCES:
 * - General principles работы с шаблонами: `is/skills/arch-foundationarchitecture-dom-markup.md` (раздел "Вынос x-template шаблонов")
 * - Компонент: app/components/ai-api-settings.js
 */

(function() {
    'use strict';

    const TEMPLATE = `<div class="modal-body-fixed-size">
    <!-- Duplicate toggle in modal header -->
    <Teleport to="#aiApiModal-header-extra" v-if="isMounted">
        <div class="btn-group btn-group-sm modal-header-tabs-group" role="group" aria-label="Выбор источника API ключа (заголовок)">
            <input
                type="radio"
                class="btn-check"
                :id="formIdPrefix + '-header-provider-github'"
                name="ai-provider-header"
                value="github"
                v-model="activeTab">
            <label class="btn btn-outline-primary lh-1 p-3" :for="formIdPrefix + '-header-provider-github'" title="GitHub" aria-label="GitHub">
                <iconify-icon icon="mdi:github" width="32" height="32"></iconify-icon>
            </label>

            <input
                type="radio"
                class="btn-check"
                :id="formIdPrefix + '-header-provider-yandex'"
                name="ai-provider-header"
                value="yandex"
                v-model="activeTab">
            <label class="btn btn-outline-primary lh-1 p-3" :for="formIdPrefix + '-header-provider-yandex'" title="Yandex" aria-label="Yandex">
                <iconify-icon icon="simple-icons:yandexcloud" width="32" height="32"></iconify-icon>
            </label>

            <input
                type="radio"
                class="btn-check"
                :id="formIdPrefix + '-header-provider-postgres'"
                name="ai-provider-header"
                value="postgres"
                v-model="activeTab">
            <label class="btn btn-outline-primary lh-1 p-3" :for="formIdPrefix + '-header-provider-postgres'" title="PostgreSQL" aria-label="PostgreSQL">
                <iconify-icon icon="akar-icons:postgresql-fill" width="32" height="32"></iconify-icon>
            </label>

        </div>
    </Teleport>

    <!-- Export/import buttons in modal footer -->
    <Teleport to="#aiApiModal-footer-extra" v-if="isMounted">
        <button
            type="button"
            class="btn btn-outline-secondary"
            :disabled="isExporting"
            @click="exportSnapshot">
            <span v-if="isExporting" class="spinner-border spinner-border-sm me-1" role="status"></span>
            Экспорт
        </button>
        <div class="dropdown">
            <button
                type="button"
                class="btn btn-outline-secondary dropdown-toggle"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                :disabled="isSnapshotsLoading">
                Импорт
            </button>
            <ul class="dropdown-menu">
                <li v-if="isSnapshotsLoading">
                    <span class="dropdown-item-text small text-muted">Загрузка...</span>
                </li>
                <li v-else-if="!snapshotFiles.length">
                    <span class="dropdown-item-text small text-muted">Снимков нет</span>
                </li>
                <li v-else v-for="file in snapshotFiles" :key="file">
                    <button class="dropdown-item" type="button" @click="importSnapshot(file)">
                        {{ file }}
                    </button>
                </li>
                <li><hr class="dropdown-divider"></li>
                <li>
                    <button class="dropdown-item" type="button" @click="importSnapshotFromDisk">
                        Импорт с диска (.json)
                    </button>
                </li>
            </ul>
        </div>
    </Teleport>

    <!-- YandexGPT settings -->
    <div v-if="activeTab === 'yandex'">
        <div class="mb-3">
            <label :for="formIdPrefix + '-yandex-api-key'" class="form-label">API ключ Yandex</label>
            <div class="input-group">
                <input
                    class="form-control"
                    :id="formIdPrefix + '-yandex-api-key'"
                    name="yandex-api-key"
                    v-model="yandexApiKey"
                    :type="showYandexApiKey ? 'text' : 'password'"
                    placeholder="Введите API ключ Yandex">
                <button
                    class="btn btn-outline-secondary"
                    type="button"
                    @click="toggleYandexApiKeyVisibility">
                    <i :class="showYandexApiKey ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
                </button>
            </div>
        </div>
        <div class="row g-3 mb-3">
            <div class="col-md-6">
                <label :for="formIdPrefix + '-yandex-folder-id'" class="form-label">Folder ID</label>
                <input
                    class="form-control"
                    :id="formIdPrefix + '-yandex-folder-id'"
                    name="yandex-folder-id"
                    v-model="yandexFolderId"
                    type="text"
                    placeholder="b1gv03a122le5a934cqj">
                <small class="form-text text-muted">ID папки в Yandex Cloud</small>
            </div>
            <div class="col-md-6">
                <label :for="formIdPrefix + '-yandex-model'" class="form-label">Модель</label>
                <select
                    class="form-select"
                    :id="formIdPrefix + '-yandex-model'"
                    name="yandex-model"
                    v-model="yandexModel">
                    <option v-for="m in yandexModels" :key="m.value" :value="m.value">{{ m.label }}</option>
                </select>
            </div>
        </div>
    </div>

    <!-- PostgreSQL settings -->
    <div v-if="activeTab === 'postgres'">
        <div class="mb-3">
            <div class="form-check form-switch">
                <input
                    class="form-check-input"
                    type="checkbox"
                    role="switch"
                    :id="formIdPrefix + '-postgres-enabled'"
                    v-model="syncEnabled">
                <label class="form-check-label" :for="formIdPrefix + '-postgres-enabled'">
                    Синхронизация с PostgreSQL (Yandex Cloud)
                </label>
            </div>
            <small class="form-text text-muted">Только подготовка. Запись в БД будет включена позже.</small>
        </div>

        <div class="mb-3">
            <label :for="formIdPrefix + '-postgres-base-url'" class="form-label">API base URL</label>
            <input
                class="form-control"
                :id="formIdPrefix + '-postgres-base-url'"
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
    </div>

    <!-- GitHub settings -->
    <div v-if="activeTab === 'github'">
        <div class="mb-3">
            <label :for="formIdPrefix + '-github-token'" class="form-label">GitHub token</label>
            <div class="input-group">
                <input
                    class="form-control"
                    :id="formIdPrefix + '-github-token'"
                    name="github-token"
                    v-model="githubToken"
                    :type="showGithubToken ? 'text' : 'password'"
                    placeholder="ghp_...">
                <button
                    class="btn btn-outline-secondary"
                    type="button"
                    @click="toggleGithubTokenVisibility">
                    <i :class="showGithubToken ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
                </button>
            </div>
            <small class="form-text text-muted">Хранится локально в localStorage (ключ: app_github_token)</small>
        </div>
    </div>
    </div>`;

    /**
     * Insert template into DOM
     */
    function insertTemplate() {
        const templateScript = document.createElement('script');
        templateScript.type = 'text/x-template';
        templateScript.id = 'ai-api-settings-template';
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

