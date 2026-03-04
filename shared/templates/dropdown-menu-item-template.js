/**
 * DROPDOWN-MENU-ITEM TEMPLATE - Template for cmp-dropdown-menu-item (icon, text, subtitle, suffix). Injected as <script type="text/x-template"> id="dropdown-menu-item-template".
 * Structure: li.dropdown-item; d-flex container; icon, text area, suffix. Zone clicks via @mouseup.stop; close on mouse release. Ref: id:sk-483943, shared/components/dropdown-menu-item.js
 */

(function() {
    'use strict';

    const TEMPLATE = `<li class="dropdown-item p-0"
    :class="[itemClasses, { 'active': active, 'disabled': disabled }]"
    :style="disabled ? {} : { cursor: 'pointer' }"
    @mouseup="handleClick">
    <div class="d-flex align-items-start px-2 py-2">
        <!-- Левая иконка -->
        <span v-if="icon"
              :class="iconClasses"
              :style="[
                  iconOpacity !== 0.5 && iconOpacity !== 1 ? { opacity: iconOpacity } : {},
                  isIconSymbol ? { lineHeight: '2.3ex' } : {}
              ]"
              :data-bs-toggle="tooltipIconBootstrap && tooltipIcon ? 'tooltip' : null"
              :data-bs-title="tooltipIconBootstrap && tooltipIcon ? tooltipIcon : null"
              :title="!tooltipIconBootstrap && tooltipIcon ? tooltipIcon : null"
              @mouseup.stop="handleIconClick">
            <img v-if="isIconImage"
                 v-show="imageVisible"
                 :src="currentIcon"
                 @error="handleIconError"
                 class="ms-2"
                 style="width: 1.25rem; height: 1.25rem; object-fit: contain;">
            <template v-else-if="isIconSymbol">{{ currentIcon }}</template>
            <i v-else :class="[currentIcon, 'lh-sm']"></i>
        </span>

        <!-- Текстовая область -->
        <div :class="textContainerClasses"
             style="min-width: 0;"
             :data-bs-toggle="tooltipTextBootstrap && tooltipText ? 'tooltip' : null"
             :data-bs-title="tooltipTextBootstrap && tooltipText ? tooltipText : null"
             :title="!tooltipTextBootstrap && tooltipText ? tooltipText : null"
             class="text-nowrap"
             @mouseup.stop="handleTextClick">
            <div :class="titleClasses" class="text-nowrap">{{ title }}</div>
            <small v-if="subtitle"
                   :class="subtitleClasses"
                   class="text-nowrap"
                   :style="subtitleOpacity !== 0.5 && subtitleOpacity !== 1 ? { opacity: subtitleOpacity } : {}">{{ subtitle }}</small>
        </div>

        <!-- Суффикс (badge/icon/indicator/chevron/info) -->
        <span v-if="suffix"
              :class="suffixClasses"
              :data-bs-toggle="tooltipSuffixBootstrap && suffixTooltip ? 'tooltip' : null"
              :data-bs-title="tooltipSuffixBootstrap && suffixTooltip ? suffixTooltip : null"
              :title="!tooltipSuffixBootstrap && suffixTooltip ? suffixTooltip : null"
              @mouseup.stop="handleSuffixClick">
            <!-- Badge -->
            <span v-if="suffix.type === 'badge'"
                  :class="['badge', \`bg-\${suffix.variant || 'secondary'}\`]">
                {{ suffix.value }}
            </span>

            <!-- Icon / Indicator / Info -->
            <template v-else-if="['icon', 'indicator', 'info'].includes(suffix.type)">
                <template v-if="isSuffixSymbol">{{ suffix.value }}</template>
                <i v-else :class="suffix.value"></i>
            </template>

            <!-- Chevron с анимацией -->
            <template v-else-if="suffix.type === 'chevron'">
                <template v-if="isSuffixSymbol">{{ suffix.value }}</template>
                <i v-else :class="[suffix.value, { 'fa-rotate-90': suffix.expanded }]"
                   style="transition: transform 0.3s ease;"></i>
            </template>
        </span>
    </div>
</li>`;

    /**
     * Injects template into DOM
     */
    function insertTemplate() {
        const templateScript = document.createElement('script');
        templateScript.type = 'text/x-template';
        templateScript.id = 'dropdown-menu-item-template';
        templateScript.textContent = TEMPLATE;
        document.body.appendChild(templateScript);
    }

    // Inject template on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', insertTemplate);
    } else {
        insertTemplate();
    }
})();

