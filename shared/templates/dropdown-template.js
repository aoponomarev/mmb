/**
 * ================================================================================================
 * DROPDOWN TEMPLATE - Шаблон компонента выпадающего меню
 * ================================================================================================
 *
 * PURPOSE: Шаблон for Vue-обёртки над Bootstrap dropdown (cmp-dropdown) с поддержкой поиска и прокрутки.
 *
 * ПРОБЛЕМА: Шаблон должен быть доступен в DOM до инициализации Vue.js for работы компонента.
 *
 * РЕШЕНИЕ: Шаблон хранится как строка в JavaScript файле и автоматически вставляется в DOM
 * при загрузке файла как <script type="text/x-template"> элемент с id="dropdown-template".
 *
 * КАК ДОСТИГАЕТСЯ:
 * - Шаблон определён как строка в константе TEMPLATE
 * - При загрузке файла автоматически создаётся <script type="text/x-template"> элемент
 * - Элемент добавляется в document.body с id="dropdown-template"
 * - Компонент использует шаблон через template: '#dropdown-template'
 *
 * ОСОБЕННОСТИ ШАБЛОНА:
 * Структура HTML:
 * - Корневой элемент: ⟨div class="dropdown"⟩ с ref="dropdownContainer"
 * - Кнопка триггера: компонент ⟨cmp-button⟩ или кастомная кнопка через слот #button
 * - Выпадающее меню: ⟨ul class="dropdown-menu"⟩ с условным классом 'show' при открытии
 * Layout и CSS-классы:
 * - Использование компонента cmp-button for кнопки триггера (через ⟨cmp-button⟩) for единообразия
 * - Прокручиваемая область: ⟨div class="dropdown-menu-scrollable"⟩ с overflow-y: auto и настраиваемой max-height
 * - Использование только Bootstrap классов for стилизации
 * Условный рендеринг:
 * - Кастомная кнопка через слот #button (v-if="!$slots.button" for стандартной кнопки)
 * - Поисковое поле с условным рендерингом (v-if="searchable")
 * - Прокручиваемая область for длинных списков (v-if="scrollable")
 * - Пустое состояние при поиске с проверкой filteredItems && filteredItems.length
 * Слоты:
 * - #button — кастомная кнопка триггера (с ограниченной областью видимости: isOpen, toggle)
 * - #items — элементы списка (с ограниченной областью видимости: filteredItems, searchQuery, handleItemSelect)
 * Responsiveness:
 * - Responsiveness кнопки триггера реализована через CSS классы компонента .dropdown-responsive и .btn-responsive с вложенными селекторами
 * - С иконкой на мобильных: если задан buttonIcon, на мобильных отображается только иконка, на десктопе — только текст buttonText
 * - С укороченным текстом на мобильных: если buttonIcon не задан, но задан buttonTextShort, на мобильных отображается укороченный текст, на десктопе — полный buttonText
 * - Без адаптивности: если не заданы ни buttonIcon, ни buttonTextShort, всегда отображается полный buttonText
 *
 * REFERENCES:
 * - General principles работы с шаблонами: `is/skills/arch-foundationarchitecture-dom-markup.md` (раздел "Вынос x-template шаблонов")
 * - Компонент: shared/components/dropdown.js
 */

(function() {
    'use strict';

    const TEMPLATE = `<div :class="dropdownClasses" :title="tooltip" ref="dropdownContainer">
    <!-- Кнопка триггера через cmp-button -->
    <cmp-button
        v-if="!$slots.button"
        ref="dropdownButton"
        :label="computedButtonText"
        :label-short="computedButtonTextShort"
        :icon="computedButtonIcon"
        :variant="buttonVariant"
        :size="buttonSize"
        :button-attributes="buttonAttributes"
        :classes-add="buttonClassesForDropdown"
        :classes-remove="buttonClassesRemoveForDropdown"
        :tooltip="tooltip">
    </cmp-button>

    <!-- Кастомная кнопка через слот -->
    <slot name="button" :isOpen="isOpen" :toggle="handleToggle"></slot>

    <!-- Выпадающее меню -->
    <ul
        :class="[
            menuClassesComputed,
            { 'show': isOpen }
        ]"
        :style="menuStyleComputed"
        :data-bs-boundary="menuWidthMode === 'auto' ? 'viewport' : null"
        ref="menuElement"
        style="cursor: pointer;">
        <!-- Поисковое поле -->
        <li v-if="searchable" class="px-3 py-2 border-bottom">
            <input
                type="text"
                class="form-control form-control-sm"
                v-model="searchQuery"
                :placeholder="searchPlaceholder"
                @input="handleSearch"
                @keydown.esc="handleEscape"
                ref="searchInput">
        </li>

        <!-- Прокручиваемая область for длинных списков -->
        <template v-if="scrollable">
            <div
                class="dropdown-menu-scrollable"
                :style="{ maxHeight: maxHeight, overflowY: 'auto' }">
                <slot name="items" :filteredItems="filteredItems" :searchQuery="searchQuery" :handleItemSelect="handleItemSelect"></slot>
            </div>
        </template>

        <!-- Обычный список (если не прокручиваемый) -->
        <template v-else>
            <slot name="items" :filteredItems="filteredItems" :searchQuery="searchQuery" :handleItemSelect="handleItemSelect"></slot>
        </template>

        <!-- Пустое состояние при поиске -->
        <li v-if="searchable && filteredItems && filteredItems.length === 0 && searchQuery" class="px-3 py-2 text-muted text-center">
            {{ emptySearchText }}
        </li>
    </ul>
</div>`;

    /**
     * Вставляет шаблон в DOM
     */
    function insertTemplate() {
        const templateScript = document.createElement('script');
        templateScript.type = 'text/x-template';
        templateScript.id = 'dropdown-template';
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

