/**
 * ================================================================================================
 * BUTTON GROUP TEMPLATE - Шаблон компонента группы кнопок
 * ================================================================================================
 *
 * ЦЕЛЬ: Шаблон для Vue-обёртки над Bootstrap .btn-group (cmp-button-group).
 *
 * ПРОБЛЕМА: Шаблон должен быть доступен в DOM до инициализации Vue.js для работы компонента.
 *
 * РЕШЕНИЕ: Шаблон хранится как строка в JavaScript файле и автоматически вставляется в DOM
 * при загрузке файла как <script type="text/x-template"> элемент с id="button-group-template".
 *
 * КАК ДОСТИГАЕТСЯ:
 * - Шаблон определён как строка в константе TEMPLATE
 * - При загрузке файла автоматически создаётся <script type="text/x-template"> элемент
 * - Элемент добавляется в document.body с id="button-group-template"
 * - Компонент использует шаблон через template: '#button-group-template'
 *
 * ОСОБЕННОСТИ ШАБЛОНА:
 * Структура HTML:
 * - Двойной рендер: группа кнопок (>= breakpoint) и dropdown (< breakpoint)
 * - Группа кнопок: ⟨div class="btn-group"⟩ с условными классами для видимости (d-none d-{breakpoint}-inline-flex)
 * - Dropdown: ⟨cmp-dropdown⟩ с условными классами для видимости (d-{breakpoint}-none)
 * Layout и CSS-классы:
 * - Адаптивное схлопывание в dropdown: CSS-переключение через Bootstrap utilities (d-none, d-{breakpoint}-inline-flex для группы, d-{breakpoint}-none для dropdown)
 * - Мгновенное переключение через CSS (без JS resize listener), использование стандартных Bootstrap utilities
 * - Оба режима независимы и совместимы с Bootstrap JS API
 * Условный рендеринг:
 * - Группа кнопок: условная видимость через классы d-none d-{breakpoint}-inline-flex (видна >= breakpoint)
 * - Dropdown: условная видимость через классы d-{breakpoint}-none (виден < breakpoint)
 * - Типы кнопок: type="button" через ⟨cmp-button⟩, type="checkbox" и type="radio" через нативный HTML
 * Нативный HTML для checkbox/radio:
 * - Используется стандартная Bootstrap структура: ⟨input class="btn-check"⟩ + ⟨label class="btn"⟩
 * - Классы выравнивания: d-flex, align-items-center для label
 * Слоты:
 * - default — содержимое кнопок (fallback для кастомных кнопок)
 * - button-{index} — переопределение конкретной кнопки по индексу (параметры слота: { button, index })
 *
 * ССЫЛКИ:
 * - Общие принципы работы с шаблонами: `a/skills/app/skills/architecture/architecture-dom-markup.md` (раздел "Вынос x-template шаблонов")
 * - Компонент: shared/components/button-group.js
 */

(function() {
    'use strict';

    const TEMPLATE = `<div :title="tooltip">
    <!-- Режим 1: Группа кнопок (видна >= breakpoint) -->
    <div :class="groupClasses" v-bind="groupAttrs" ref="groupContainer">
        <template v-for="(button, index) in buttonStates" :key="index">
            <!-- Слот для переопределения кнопки -->
            <slot v-if="$slots[\`button-\${index}\`]" :name="\`button-\${index}\`" :button="button" :index="index"></slot>

            <!-- Action кнопка через cmp-button -->
            <cmp-button
                v-else-if="button.type === 'button'"
                :variant="button.variant || variant || 'secondary'"
                :size="button.size || size"
                :label="button.label"
                :label-short="button.labelShort"
                :icon="button.icon"
                :suffix="button.suffix"
                :disabled="button.disabled"
                :loading="button.loading"
                :tooltip="button.tooltip"
                :tooltip-icon="button.tooltipIcon"
                :tooltip-text="button.tooltipText"
                :tooltip-suffix="button.tooltipSuffix"
                :button-attributes="omit(button, ['type', 'label', 'labelShort', 'icon', 'variant', 'size', 'disabled', 'loading', 'active', 'responsive', 'suffix', 'tooltip', 'tooltipIcon', 'tooltipText', 'tooltipSuffix', 'tooltipIconBootstrap', 'tooltipTextBootstrap', 'tooltipSuffixBootstrap', 'class'])"
                :classes-add="{ root: button.class ? \`flex-grow-0 \${button.class}\` : 'flex-grow-0' }"
                @click="handleButtonClick($event, button, index)"
                @click-icon="handleButtonClickIcon($event, button, index)"
                @click-text="handleButtonClickText($event, button, index)"
                @click-suffix="handleButtonClickSuffix($event, button, index)">
            </cmp-button>

            <!-- Checkbox -->
            <template v-else-if="button.type === 'checkbox' && !$slots[\`button-\${index}\`]">
                <input
                    :id="getButtonId(index)"
                    class="btn-check"
                    type="checkbox"
                    :checked="buttonStates[index]?.active || false"
                    :disabled="button.disabled || false"
                    v-bind="omit(button, ['type', 'label', 'labelShort', 'icon', 'variant', 'size', 'active', 'disabled', 'responsive', 'suffix', 'tooltip', 'tooltipIcon', 'tooltipText', 'tooltipSuffix', 'tooltipIconBootstrap', 'tooltipTextBootstrap', 'tooltipSuffixBootstrap', 'class', 'checked'])"
                    @change="handleButtonChange($event, button, index)">
                <label
                    :for="getButtonId(index)"
                    class="btn d-flex align-items-center"
                    :class="[
                        \`btn-\${button.variant || variant || 'outline-secondary'}\`,
                        button.size || size ? \`btn-\${button.size || size}\` : '',
                        buttonStates[index]?.active ? 'active' : '',
                        button.disabled ? 'disabled' : '',
                        button.class
                    ]"
                    :title="button.tooltip || button.tooltipText"
                    v-bind="omit(button, ['type', 'label', 'labelShort', 'icon', 'variant', 'size', 'active', 'disabled', 'responsive', 'suffix', 'tooltip', 'tooltipIcon', 'tooltipText', 'tooltipSuffix', 'tooltipIconBootstrap', 'tooltipTextBootstrap', 'tooltipSuffixBootstrap', 'class', 'checked'])">
                    <span v-if="button.icon" :class="button.icon"></span>
                    {{ button.label || button.labelShort }}
                </label>
            </template>

            <!-- Radio -->
            <template v-else-if="button.type === 'radio' && !$slots[\`button-\${index}\`]">
                <input
                    :id="getButtonId(index)"
                    class="btn-check"
                    type="radio"
                    :name="getRadioName()"
                    :checked="buttonStates[index]?.active || false"
                    :disabled="button.disabled || false"
                    v-bind="omit(button, ['type', 'label', 'labelShort', 'icon', 'variant', 'size', 'active', 'disabled', 'responsive', 'suffix', 'tooltip', 'tooltipIcon', 'tooltipText', 'tooltipSuffix', 'tooltipIconBootstrap', 'tooltipTextBootstrap', 'tooltipSuffixBootstrap', 'class', 'checked', 'name'])"
                    @change="handleButtonChange($event, button, index)">
                <label
                    :for="getButtonId(index)"
                    class="btn d-flex align-items-center"
                    :class="[
                        \`btn-\${button.variant || variant || 'outline-secondary'}\`,
                        button.size || size ? \`btn-\${button.size || size}\` : '',
                        buttonStates[index]?.active ? 'active' : '',
                        button.disabled ? 'disabled' : '',
                        button.class
                    ]"
                    :title="button.tooltip || button.tooltipText"
                    v-bind="omit(button, ['type', 'label', 'labelShort', 'icon', 'variant', 'size', 'active', 'disabled', 'responsive', 'suffix', 'tooltip', 'tooltipIcon', 'tooltipText', 'tooltipSuffix', 'tooltipIconBootstrap', 'tooltipTextBootstrap', 'tooltipSuffixBootstrap', 'class', 'checked', 'name'])"
                    @click="handleLabelClick(button, index)">
                    <span v-if="button.icon" :class="button.icon"></span>
                    {{ button.label || button.labelShort }}
                </label>
            </template>
        </template>

        <!-- Слот для дополнительного контента -->
        <slot name="default"></slot>
    </div>

    <!-- Режим 2: Dropdown (виден < breakpoint) -->
    <div v-if="collapseBreakpoint" :class="dropdownClasses">
        <cmp-dropdown
            :button-text="computedDropdownLabel"
            :button-text-short="computedDropdownLabelShort"
            :button-icon="dropdownIcon"
            :button-variant="computedDropdownVariant"
            :button-size="computedDropdownSize"
            :menu-style="dropdownMenuStyle"
            :classes-add="dropdownClassesForGroup"
            :classes-remove="dropdownClassesRemoveForGroup"
            :tooltip="tooltip">
            <template #items>
                <li v-for="(menuItem, index) in menuItems" :key="index">
                    <cmp-dropdown-menu-item
                        :title="menuItem.title"
                        :icon="menuItem.icon"
                        :suffix="menuItem.suffix"
                        :active="menuItem.active"
                        :disabled="menuItem.disabled"
                        :tooltip-text="menuItem.tooltipText"
                        :tooltip-icon="menuItem.tooltipIcon"
                        :tooltip-suffix="menuItem.tooltipSuffix"
                        highlight-class="bg-hover-secondary-soft"
                        @click="handleMenuClick(menuItem)">
                    </cmp-dropdown-menu-item>
                </li>
            </template>
        </cmp-dropdown>
    </div>
</div>`;

    /**
     * Вставляет шаблон в DOM
     */
    function insertTemplate() {
        const templateScript = document.createElement('script');
        templateScript.type = 'text/x-template';
        templateScript.id = 'button-group-template';
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

