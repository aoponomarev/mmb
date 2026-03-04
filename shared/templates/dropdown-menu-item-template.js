/**
 * ================================================================================================
 * DROPDOWN-MENU-ITEM TEMPLATE - Шаблон компонента пункта выпадающего меню
 * ================================================================================================
 *
 * PURPOSE: Шаблон for универсального компонента пункта выпадающего меню (cmp-dropdown-menu-item)
 * с поддержкой иконки, текста, подзаголовка и суффикса.
 *
 * ПРОБЛЕМА: Шаблон должен быть доступен в DOM до инициализации Vue.js for работы компонента.
 *
 * РЕШЕНИЕ: Шаблон хранится как строка в JavaScript файле и автоматически вставляется в DOM
 * при загрузке файла как <script type="text/x-template"> элемент с id="dropdown-menu-item-template".
 *
 * КАК ДОСТИГАЕТСЯ:
 * - Шаблон определён как строка в константе TEMPLATE
 * - При загрузке файла автоматически создаётся <script type="text/x-template"> элемент
 * - Элемент добавляется в document.body с id="dropdown-menu-item-template"
 * - Компонент использует шаблон через template: '#dropdown-menu-item-template'
 *
 * ОСОБЕННОСТИ ШАБЛОНА:
 * Структура HTML:
 * - Корневой элемент: ⟨li class="dropdown-item p-0"⟩ с условными классами 'active' и 'disabled'
 * - Внутренний контейнер: ⟨div class="d-flex align-items-start px-2 py-2"⟩ for layout
 * - Элементы: иконка (⟨span class="icon"⟩), текстовая область (⟨div class="flex-grow-1 text-break text-wrap"⟩), суффикс (⟨span⟩)
 * Layout и CSS-классы:
 * - Все стили реализованы через Bootstrap утилиты: d-flex, align-items-start, text-break, text-wrap, lh-sm, mt-1, opacity-50 и т.п.
 * - Выравнивание элементов: иконка и суффикс выровнены по первой строке текста через align-items-start и pt-1
 * - Текстовая область растягивается через flex-grow-1
 * - Перенос текста: текстовая область использует text-break и text-wrap for переноса длинного текста
 * - min-width: 0 на flex-элементе for корректного обрезания текста
 * - Подзаголовок отображается через ⟨small⟩ с классом mt-1 for отступа
 * Условный рендеринг:
 * - Иконка: условный рендеринг через v-if="icon"
 * - Подзаголовок: условный рендеринг через v-if="subtitle"
 * - Суффикс: условный рендеринг через v-if="suffix"
 * - Состояния: классы 'active' и 'disabled' применяются условно через :class
 * Responsiveness:
 * - Responsiveness через классы .icon, .subtitle (управляется CSS)
 * События:
 * - Раздельные события кликов по зонам (иконка, текст, суффикс) через @mouseup.stop
 * - Закрытие dropdown при отпускании кнопки мыши (@mouseup вместо @click)
 * Подсказки (tooltips):
 * - Поддержка нативных и Bootstrap tooltips через условные атрибуты (data-bs-toggle, data-bs-title, title)
 * Анимация chevron:
 * - Анимация chevron через Font Awesome класс fa-rotate-90 и inline transition (единственное исключение из запрета inline-стилей)
 *
 * REFERENCES:
 * - General principles работы с шаблонами: id:sk-483943 (section "Вынос x-template шаблонов")
 * - Компонент: shared/components/dropdown-menu-item.js
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
     * Вставляет шаблон в DOM
     */
    function insertTemplate() {
        const templateScript = document.createElement('script');
        templateScript.type = 'text/x-template';
        templateScript.id = 'dropdown-menu-item-template';
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

