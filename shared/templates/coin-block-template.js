/**
 * ================================================================================================
 * COIN-BLOCK TEMPLATE - Шаблон компонента блока монеты
 * ================================================================================================
 *
 * PURPOSE: Шаблон for компонента отображения информации о монете (иконка + символ).
 *
 * ПРОБЛЕМА: Шаблон должен быть доступен в DOM до инициализации Vue.js for работы компонента.
 *
 * РЕШЕНИЕ: Шаблон хранится как строка в JavaScript файле и автоматически вставляется в DOM
 * при загрузке файла как <script type="text/x-template"> элемент с id="coin-block-template".
 *
 * КАК ДОСТИГАЕТСЯ:
 * - Шаблон определён как строка в константе TEMPLATE
 * - При загрузке файла автоматически создаётся <script type="text/x-template"> элемент
 * - Элемент добавляется в document.body с id="coin-block-template"
 * - Компонент использует шаблон через template: '#coin-block-template'
 *
 * ОСОБЕННОСТИ ШАБЛОНА:
 * Структура HTML:
 * - Корневой элемент: ⟨div class="coin-block d-flex align-items-center"⟩
 * - Иконка монеты: ⟨img⟩ с условным отображением
 * - Символ монеты: ⟨span class="text-uppercase fw-bold"⟩
 * Layout и CSS-классы:
 * - Использование Bootstrap классов for layout (d-flex, align-items-center)
 * - Поддержка tooltip через title атрибут
 * - Курсор pointer for индикации кликабельности
 *
 * REFERENCES:
 * - General principles работы с шаблонами: `is/skills/arch-foundationarchitecture-dom-markup.md` (раздел "Вынос x-template шаблонов")
 * - Компонент: shared/components/coin-block.js
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

                    <!-- Индикаторы типов монет (ЕИП) -->
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

    // Создаём элемент script с типом x-template
    const scriptElement = document.createElement('script');
    scriptElement.type = 'text/x-template';
    scriptElement.id = 'coin-block-template';
    scriptElement.textContent = TEMPLATE;

    // Добавляем в DOM
    document.body.appendChild(scriptElement);

    console.log('coin-block-template.js: шаблон loaded');
})();
