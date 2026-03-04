/**
 * #JS-M144RMHB
 * @description Template for cmp-dropdown (Bootstrap dropdown with search and scroll); x-template id="dropdown-template".
 *
 * PURPOSE: Template in DOM before Vue init; string → <script type="text/x-template"> → document.body; template: '#dropdown-template'.
 *
 * FEATURES: Root dropdown + trigger (cmp-button or slot #button) + dropdown-menu; searchable, scrollable; slots #button (isOpen, toggle), #items (filteredItems, searchQuery, handleItemSelect); responsive trigger (buttonIcon, buttonTextShort).
 *
 * REFERENCES: id:sk-483943 (x-template extraction); shared/components/dropdown.js
 */

(function() {
    'use strict';

    const TEMPLATE = `<div :class="dropdownClasses" :title="tooltip" ref="dropdownContainer">
    <!-- Trigger button via cmp-button -->
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

    <!-- Custom button via slot -->
    <slot name="button" :isOpen="isOpen" :toggle="handleToggle"></slot>

    <!-- Dropdown menu -->
    <ul
        :class="[
            menuClassesComputed,
            { 'show': isOpen }
        ]"
        :style="menuStyleComputed"
        :data-bs-boundary="menuWidthMode === 'auto' ? 'viewport' : null"
        ref="menuElement"
        style="cursor: pointer;">
        <!-- Search field -->
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

        <!-- Scrollable area for long lists -->
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

        <!-- Empty state on search -->
        <li v-if="searchable && filteredItems && filteredItems.length === 0 && searchQuery" class="px-3 py-2 text-muted text-center">
            {{ emptySearchText }}
        </li>
    </ul>
</div>`;

    /**
     * Insert template into DOM
     */
    function insertTemplate() {
        const templateScript = document.createElement('script');
        templateScript.type = 'text/x-template';
        templateScript.id = 'dropdown-template';
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

