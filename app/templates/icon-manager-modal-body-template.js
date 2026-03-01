/**
 * ================================================================================================
 * ICON MANAGER TEMPLATE - Шаблон модального окна управления иконками
 * ================================================================================================
 */

(function() {
    'use strict';

    const TEMPLATE = `<div class="icon-manager-modal">
        <!-- Блок токена (если not configured) -->
        <div v-if="!githubToken" class="alert alert-warning mb-4">
            <h6 class="alert-heading"><i class="fas fa-key me-2"></i>GitHub Token not configured</h6>
            <p class="small mb-2">Для загрузки иконок в репозиторий <code>libs</code> необходимо указать Personal Access Token.</p>
            <div class="input-group input-group-sm">
                <input type="password" class="form-control" v-model="tokenInput" placeholder="ghp_xxxxxxxxxxxx">
                <button class="btn btn-outline-warning" type="button" @click="saveToken">Сохранить</button>
            </div>
        </div>

        <div v-if="githubToken" class="container-fluid p-0">
            <!-- Первая строка: Внешний URL (на всю ширину) -->
            <div class="row mb-4">
                <div class="col-12">
                    <div class="p-3 border rounded bg-body-tertiary">
                        <label class="form-label small fw-bold">Внешний URL for подгрузки иконки</label>
                        <div class="input-group">
                            <input type="text" class="form-control" v-model="externalUrl" placeholder="https://example.com/icon.png" @input="loadFromUrl()">
                            <button class="btn btn-outline-primary" type="button" @click="loadFromUrl()">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                        </div>
                        <div class="form-text x-small">Изображение будет пропущено через прокси Cloudflare for CORS bypass.</div>
                    </div>
                </div>
            </div>

            <!-- Вторая строка: Изображения и Загрузка -->
            <div class="row g-4">
                <!-- Левая колонка: Сравнение иконок (без фона и рамок) -->
                <div class="col-md-6">
                    <div class="h-100 d-flex flex-column justify-content-center px-2">
                        <!-- Актуальная -->
                        <div class="row align-items-center mb-3">
                            <div class="col-5 text-end">
                                <span class="text-muted x-small uppercase fw-bold">Актуальная</span>
                            </div>
                            <div class="col-7">
                                <div class="d-inline-block p-2 bg-body rounded border shadow-sm">
                                    <img :src="coinData.currentImage" width="48" height="48" class="img-fluid" alt="Actual" @error="$event.target.style.opacity=0.2">
                                </div>
                            </div>
                        </div>
                        <!-- Новая -->
                        <div class="row align-items-center">
                            <div class="col-5 text-end">
                                <span class="text-primary x-small uppercase fw-bold">Новая</span>
                            </div>
                            <div class="col-7">
                                <div class="d-inline-block p-2 bg-body rounded border shadow-sm">
                                    <canvas ref="iconCanvas" width="128" height="128" style="width: 48px; height: 48px;"></canvas>
                                    <div v-if="!previewUrl" class="text-muted x-small d-flex align-items-center justify-content-center" style="width: 48px; height: 48px;">
                                        <i class="fas fa-image fa-lg opacity-25"></i>
                                    </div>
                                </div>
                                <div v-if="previewUrl" class="mt-1 x-small text-muted text-truncate" style="max-width: 120px;">{{ targetFilename }}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Правая колонка: Drag & Drop (с фоном и рамкой) -->
                <div class="col-md-6">
                    <div
                        class="p-3 border rounded bg-body-tertiary h-100 d-flex flex-column align-items-center justify-content-center text-center cursor-pointer icon-drop-zone"
                        :class="{'border-primary bg-primary-subtle': isDragging}"
                        @dragover.prevent="isDragging = true"
                        @dragleave.prevent="isDragging = false"
                        @drop.prevent="handleFileDrop"
                        @click="$refs.fileInput.click()"
                    >
                        <i class="fas fa-cloud-upload-alt fa-2x mb-2" :class="isDragging ? 'text-primary' : 'text-muted'"></i>
                        <p class="mb-0 small fw-bold">Загрузить файл</p>
                        <p class="mb-0 x-small text-muted">Перетащите сюда или кликните</p>
                        <input type="file" ref="fileInput" class="d-none" accept="image/*" @change="handleFileSelect">
                    </div>
                </div>
            </div>
            </div>
        </div>
    </div>`;

    // Добавляем в DOM
    function insertTemplate() {
        if (document.getElementById('icon-manager-modal-body-template')) return;
        const scriptElement = document.createElement('script');
        scriptElement.type = 'text/x-template';
        scriptElement.id = 'icon-manager-modal-body-template';
        scriptElement.textContent = TEMPLATE;
        document.body.appendChild(scriptElement);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', insertTemplate);
    } else {
        insertTemplate();
    }

    console.log('icon-manager-modal-body-template.js: шаблон loaded');
})();
