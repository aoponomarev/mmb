/**
 * COIN-BLOCK TEMPLATE - Template for coin block (icon + symbol). Injected as <script type="text/x-template"> id="coin-block-template".
 * Structure: coin-block d-flex; img icon; symbol span. Bootstrap layout; tooltip via title; cursor pointer. Ref: id:sk-483943, shared/components/coin-block.js
 */

(function() {
    'use strict';

    const TEMPLATE = `<div class="coin-block-wrapper">
        <cmp-dropdown
            :dropdown-id="'dropdown-' + coinId"
            button-variant="link"
            menu-width-mode="auto"
            :classes-add="{
                root: 'w-100',
                button: 'p-0 border-0 text-decoration-none w-100 text-start d-block',
                menu: 'shadow-sm'
            }"
            :classes-remove="{ button: 'dropdown-toggle' }">

            <template #button="{ toggle }">
                <div
                    :class="['coin-block d-flex align-items-center', instanceHash, cssClasses.container]"
                    :title="tooltipTitle"
                    @click="toggle"
                    data-bs-toggle="dropdown"
                    @contextmenu.prevent="handleContextMenu"
                    style="cursor: pointer;">
                    <img
                        v-if="currentImage"
                        :src="currentImage"
                        :alt="symbol || name || coinId"
                        :class="['coin-block__icon', cssClasses.icon]"
                        class="me-2"
                        width="24"
                        height="24"
                        @error="handleImageError">
                    <span
                        :class="['coin-block__symbol', cssClasses.symbol, textOverflowClasses]"
                        class="text-uppercase fw-semibold">{{ symbol || coinId }}</span>

                    <!-- Индикаторы типов монет (SSOT) -->
                    <span
                        v-if="coinTypeIcon"
                        class="ms-1"
                        :title="coinTypeTitle"
                        style="font-size: 0.8rem; cursor: help;">{{ coinTypeIcon }}</span>
                </div>
            </template>

            <template #items>
                <li>
                    <cmp-dropdown-menu-item
                        :title="favoriteTitle"
                        :icon="isFavorite ? 'fas fa-star' : 'far fa-star'"
                        :classes-add="{ icon: isFavorite ? 'text-warning' : '' }"
                        highlight-class="bg-hover-secondary-soft"
                        @click="handleToggleFavorite">
                    </cmp-dropdown-menu-item>
                </li>
                <li>
                    <cmp-dropdown-menu-item
                        :title="openTitle"
                        icon="fas fa-external-link-alt"
                        highlight-class="bg-hover-secondary-soft"
                        @click="handleOpenBybit">
                    </cmp-dropdown-menu-item>
                </li>
                <li><hr class="dropdown-divider"></li>
                <li v-if="canEditIcon">
                    <cmp-dropdown-menu-item
                        title="Заменить иконку"
                        icon="fas fa-image"
                        highlight-class="bg-hover-secondary-soft"
                        @click="handleReplaceIcon">
                    </cmp-dropdown-menu-item>
                </li>
                <li>
                    <cmp-dropdown-menu-item
                        :title="deleteTitle"
                        icon="fas fa-trash"
                        highlight-class="bg-hover-secondary-soft"
                        @click="handleDelete">
                    </cmp-dropdown-menu-item>
                </li>
            </template>
        </cmp-dropdown>
    </div>`;

    // Create script element with type x-template
    const scriptElement = document.createElement('script');
    scriptElement.type = 'text/x-template';
    scriptElement.id = 'coin-block-template';
    scriptElement.textContent = TEMPLATE;

    // Append to DOM
    document.body.appendChild(scriptElement);

    console.log('coin-block-template.js: шаблон loaded');
})();
