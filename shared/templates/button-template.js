/**
 * #JS-Gv3d5gD6
 * @description Template for cmp-button (icon, text, suffix); id="button-template"; structure button/span, loading/icon/label/suffix, .btn-responsive.
 * @see id:sk-318305
 */

(function() {
    'use strict';

    const TEMPLATE = `<button :type="type"
        :class="buttonClasses"
        :disabled="disabled || loading"
        @click="handleClick"
        v-bind="buttonAttrs"
        :title="tooltip">
    <span :class="containerClasses">
        <!-- Спиннер загрузки -->
        <span v-if="loading" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>

        <!-- Левая иконка -->
        <span v-else-if="icon"
              :class="iconClasses"
              :style="{
                  ...(iconOpacity !== 0.5 && iconOpacity !== 1 ? { opacity: iconOpacity } : {})
              }"
              :title="tooltipIcon"
              @click.stop="handleIconClick">
            <i :class="icon"></i>
        </span>

        <!-- Текстовая область -->
        <span v-if="label || labelShort"
              :class="labelClasses"
              :title="tooltipText"
              @click.stop="handleTextClick">
            <!-- Укороченный текст (только на мобильных, если нет иконки, но есть labelShort) -->
            <span v-if="!icon && labelShort"
                  class="label-short">
                {{ labelShort }}
            </span>

            <!-- Полный текст -->
            <span v-if="label"
                  class="label">
                {{ label }}
            </span>
        </span>

        <!-- Суффикс (массив элементов) -->
        <span v-if="suffixArray.length > 0 && !loading"
              :class="suffixClasses">
            <template v-for="(item, index) in suffixArray" :key="index">
                <!-- Badge -->
                <span v-if="item.type === 'badge'"
                      :class="['badge', \`bg-\${item.variant || 'secondary'}\`, index > 0 ? 'ms-1' : '']"
                      :title="item.tooltip"
                      @click.stop="handleSuffixClick($event, item)">
                    {{ item.value }}
                </span>

                <!-- Icon / Indicator / Info -->
                <i v-else-if="['icon', 'indicator', 'info'].includes(item.type)"
                   :class="[item.value, index > 0 ? 'ms-1' : '']"
                   :title="item.tooltip"
                   @click.stop="handleSuffixClick($event, item)"></i>

                <!-- Chevron с анимацией -->
                <i v-else-if="item.type === 'chevron'"
                   :class="[item.value, { 'fa-rotate-90': item.expanded }, index > 0 ? 'ms-1' : '']"
                   style="transition: transform 0.3s ease;"
                   :title="item.tooltip"
                   @click.stop="handleSuffixClick($event, item)"></i>
            </template>
        </span>
    </span>
</button>`;

    /**
     * Injects template into DOM
     */
    function insertTemplate() {
        const templateScript = document.createElement('script');
        templateScript.type = 'text/x-template';
        templateScript.id = 'button-template';
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

