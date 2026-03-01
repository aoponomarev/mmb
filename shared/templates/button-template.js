/**
 * ================================================================================================
 * BUTTON TEMPLATE - Шаблон компонента кнопки
 * ================================================================================================
 *
 * ЦЕЛЬ: Шаблон для универсального компонента кнопки (cmp-button) с поддержкой иконки, текста и суффикса.
 *
 * ПРОБЛЕМА: Шаблон должен быть доступен в DOM до инициализации Vue.js для работы компонента.
 *
 * РЕШЕНИЕ: Шаблон хранится как строка в JavaScript файле и автоматически вставляется в DOM
 * при загрузке файла как <script type="text/x-template"> элемент с id="button-template".
 *
 * КАК ДОСТИГАЕТСЯ:
 * - Шаблон определён как строка в константе TEMPLATE
 * - При загрузке файла автоматически создаётся <script type="text/x-template"> элемент
 * - Элемент добавляется в document.body с id="button-template"
 * - Компонент использует шаблон через template: '#button-template'
 *
 * ОСОБЕННОСТИ ШАБЛОНА:
 * Структура HTML:
 * - Корневой элемент: ⟨button⟩ с классами Bootstrap (btn, btn-{variant}, btn-{size})
 * - Внутренний контейнер: ⟨span⟩ с классами d-flex, align-items-center, justify-content-center для layout
 * - Элементы: иконка (⟨span class="icon"⟩), текст (⟨span class="label"⟩ / ⟨span class="label-short"⟩), суффикс (⟨span class="suffix-container"⟩)
 * Layout и CSS-классы:
 * - Паддинги перенесены на внутренний контейнер: p-0 на ⟨button⟩, вертикальный padding управляется через CSS в зависимости от размера кнопки
 * - Все стили реализованы через Bootstrap утилиты: d-flex, align-items-center, justify-content-center, text-break, text-wrap, px-2, py-2, opacity-50 и т.п.
 * - Отступы между элементами: через CSS margin (не gap) для корректной работы с условным рендерингом
 * - Элементы суффикса разделяются отступом ms-1 (кроме первого)
 * Условный рендеринг:
 * - Состояние loading: спиннер вместо иконки/текста (v-if="loading")
 * - Иконка: условный рендеринг через v-else-if="icon"
 * - Текст: условный рендеринг через v-if="label || labelShort"
 * - Суффикс: условный рендеринг через v-if="suffixArray.length > 0 && !loading"
 * - Множественные суффиксы через массив suffixArray с циклом v-for
 * Адаптивность:
 * - Адаптивность управляется через CSS классы компонента .btn-responsive с вложенными селекторами
 * - С иконкой на мобильных: если задан icon, на мобильных отображается только иконка, на десктопе — только текст label
 * - С укороченным текстом на мобильных: если icon не задан, но задан labelShort, на мобильных отображается укороченный текст, на десктопе — полный label
 * - Без адаптивности: если не заданы ни icon, ни labelShort, всегда отображается полный label
 * События:
 * - Раздельные события кликов по зонам (иконка, текст, суффикс) через @click.stop
 *
 * ССЫЛКИ:
 * - Общие принципы работы с шаблонами: a/skills/app/skills/components/components-template-split.md
 * - Компонент: shared/components/button.js
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
     * Вставляет шаблон в DOM
     */
    function insertTemplate() {
        const templateScript = document.createElement('script');
        templateScript.type = 'text/x-template';
        templateScript.id = 'button-template';
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

