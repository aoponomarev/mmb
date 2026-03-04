/**
 * ================================================================================================
 * DROPDOWN TEMPLATE - Dropdown menu component template
 * ================================================================================================
 *
 * PURPOSE: Template for Vue wrapper over Bootstrap dropdown (cmp-dropdown) with search and scroll.
 *
 * PROBLEM: Template must be in DOM before Vue.js init for component to work.
 *
 * SOLUTION: Template stored as string in JS file and auto-inserted into DOM
 * on file load as <script type="text/x-template"> element with id="dropdown-template".
 *
 * HOW:
 * - Template defined as string in TEMPLATE constant
 * - On file load <script type="text/x-template"> element is created
 * - Element appended to document.body with id="dropdown-template"
 * - Component uses template via template: '#dropdown-template'
 *
 * TEMPLATE FEATURES:
 * HTML structure:
 * - Root: ⟨div class="dropdown"⟩ with ref="dropdownContainer"
 * - Trigger button: ⟨cmp-button⟩ or custom via slot #button
 * - Dropdown menu: ⟨ul class="dropdown-menu"⟩ with conditional 'show' when open
 * Layout and CSS:
 * - cmp-button for trigger (via ⟨cmp-button⟩) for consistency
 * - Scrollable area: ⟨div class="dropdown-menu-scrollable"⟩ with overflow-y: auto and max-height
 * - Bootstrap classes only for styling
 * Conditional rendering:
 * - Custom button via slot #button (v-if="!$slots.button" for default)
 * - Search field (v-if="searchable")
 * - Scrollable area for long lists (v-if="scrollable")
 * - Empty state on search (filteredItems && filteredItems.length)
 * Slots:
 * - #button — custom trigger button (scope: isOpen, toggle)
 * - #items — list items (scope: filteredItems, searchQuery, handleItemSelect)
 * Responsiveness:
 * - Trigger button responsiveness via .dropdown-responsive and .btn-responsive
 * - With icon on mobile: if buttonIcon set, show icon only on mobile, buttonText on desktop
 * - With short text on mobile: if buttonTextShort set (no icon), show short on mobile, full on desktop
 * - No responsiveness: if neither buttonIcon nor buttonTextShort, always full buttonText
 *
 * REFERENCES:
 * - General template principles: id:sk-483943 (section "x-template extraction")
 * - Component: shared/components/dropdown.js
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

