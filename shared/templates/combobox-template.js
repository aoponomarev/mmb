/**
 * ================================================================================================
 * COMBOBOX TEMPLATE - Шаблон компонента комбобокса
 * ================================================================================================
 *
 * ЦЕЛЬ: Шаблон для Vue-обёртки над Bootstrap input-group + dropdown (cmp-combobox)
 * с поддержкой автодополнения, фильтрации и клавиатурной навигации.
 *
 * ПРОБЛЕМА: Шаблон должен быть доступен в DOM до инициализации Vue.js для работы компонента.
 *
 * РЕШЕНИЕ: Шаблон хранится как строка в JavaScript файле и автоматически вставляется в DOM
 * при загрузке файла как <script type="text/x-template"> элемент с id="combobox-template".
 *
 * КАК ДОСТИГАЕТСЯ:
 * - Шаблон определён как строка в константе TEMPLATE
 * - При загрузке файла автоматически создаётся <script type="text/x-template"> элемент
 * - Элемент добавляется в document.body с id="combobox-template"
 * - Компонент использует шаблон через template: '#combobox-template'
 *
 * ОСОБЕННОСТИ ШАБЛОНА:
 * Структура HTML:
 * - Режим 'input': ⟨div⟩ с классом position-relative, внутри ⟨input⟩ и крестик через Font Awesome иконку
 * - Режим 'combobox': ⟨div class="input-group"⟩ с иконкой слева (опционально), ⟨input⟩, крестик через CSS псевдоэлемент, кнопка dropdown, выпадающее меню ⟨ul class="dropdown-menu"⟩
 * Layout и CSS-классы:
 * - Два режима работы: 'input' (простое текстовое поле) и 'combobox' (с dropdown)
 * - Крестик для очистки в режиме combobox: через CSS псевдоэлемент ::before с Font Awesome иконкой (\f00d) на ⟨span class="input-group-text combobox-clear"⟩
 * - Крестик в режиме input: через Font Awesome иконку ⟨i class="fas fa-times"⟩ с position-absolute
 * - Использование Bootstrap input-group для режима combobox
 * Условный рендеринг:
 * - Режим 'input': v-if="mode === 'input'" — рендерится как простое текстовое поле без dropdown
 * - Режим 'combobox': v-else — рендерится как input-group с dropdown
 * - Иконка слева: условный рендеринг через v-if="icon"
 * - Крестик для очистки: условный рендеринг через v-if="clearable && displayValue" (combobox) или v-if="clearable && modelValue" (input)
 * - Прокручиваемая область: условный рендеринг через v-if="scrollable || virtualScrolling"
 * - Виртуальный скроллинг: рендеринг через v-if="!virtualScrolling" для обычного списка, v-else для виртуального
 * - Пустое состояние: условный рендеринг через v-if="visibleItems.length === 0 && searchQuery"
 * Слоты:
 * - #items — элементы списка (с ограниченной областью видимости: visibleItems, searchQuery, highlightText, selectedIndex)
 * - #item — переопределение отображения элемента (с ограниченной областью видимости: item, index, highlightedText)
 * Структура для будущих расширений:
 * - Подсветка найденного текста: структура заложена через v-html и highlightItemText
 * - Группировка элементов: структура заложена для будущей реализации через v-if="groupBy"
 *
 * ССЫЛКИ:
 * - Общие принципы работы с шаблонами: app/skills/ui-architecture
 * - Компонент: shared/components/combobox.js
 */

(function() {
    'use strict';

    const TEMPLATE = `<!-- Режим простого текстового поля -->
<div v-if="mode === 'input'" :class="inputModeClasses" :title="tooltip">
    <input :type="inputType"
           :class="[inputClasses, { 'pe-5': clearable && modelValue }]"
           :placeholder="placeholder"
           :value="modelValue"
           :disabled="disabled"
           :required="required"
           :pattern="pattern"
           :min="inputMin"
           :max="inputMax"
           :step="inputStep"
           :style="inputStyle"
           @input="handleInput"
           @keydown="handleKeydown"
           ref="inputElement">
    <!-- Крестик для очистки в режиме input (только Bootstrap классы + Font Awesome) -->
    <i v-if="clearable && modelValue"
       class="fas fa-times position-absolute end-0 top-50 translate-middle-y text-secondary"
       style="cursor: pointer; z-index: 10; padding-right: 0.5rem;"
       @click="handleClear"
       @mousedown.prevent
       :title="clearTitle">
    </i>
</div>

<!-- Режим комбобокса -->
<div v-else
     class="input-group"
     :class="inputGroupClasses"
     :title="tooltip"
     ref="comboboxContainer">
    <!-- Иконка слева (опционально) -->
    <span v-if="icon" class="input-group-text">
        <i :class="icon"></i>
    </span>

    <!-- Поле ввода -->
    <input :type="inputType"
           :class="inputClasses"
           :placeholder="placeholder"
           :value="displayValue"
           :disabled="disabled"
           :required="required"
           :pattern="pattern"
           :min="inputMin"
           :max="inputMax"
           :step="inputStep"
           :style="inputStyle"
           @input="handleInput"
           @keydown="handleKeydown"
           @focus="handleFocus"
           @blur="handleBlur"
           ref="inputElement">

    <!-- Крестик для очистки (через CSS псевдоэлемент) -->
    <span v-if="clearable && displayValue"
          class="input-group-text combobox-clear"
          @click="handleClear"
          @mousedown.prevent
          :title="clearTitle">
    </span>

    <!-- Кнопка dropdown -->
    <button class="btn btn-outline-secondary dropdown-toggle"
            type="button"
            :id="dropdownId"
            data-bs-toggle="dropdown"
            :aria-expanded="isOpen"
            :disabled="disabled"
            @click="handleToggle">
    </button>

    <!-- Выпадающее меню -->
    <ul :class="[
            menuClassesComputed,
            { 'show': isOpen }
        ]"
        :style="menuStyle">
        <!-- Прокручиваемая область для виртуального скроллинга -->
        <div v-if="scrollable || virtualScrolling"
             class="dropdown-menu-scrollable"
             :style="scrollableStyle"
             @scroll="handleScroll"
             ref="scrollContainer">
            <slot name="items"
                  :filteredItems="visibleItems"
                  :searchQuery="searchQuery"
                  :highlightText="highlightText"
                  :selectedIndex="selectedIndex">
                <!-- Дефолтный рендеринг элементов (обычная прокрутка) -->
                <template v-if="!virtualScrolling">
                    <li v-for="(item, index) in visibleItems"
                        :key="getItemKey(item, index)"
                        :class="{ 'active': index === selectedIndex }">
                        <a class="dropdown-item"
                           :class="{ 'active': isItemSelected(item) }"
                           href="#"
                           @click.prevent="handleItemSelect(item, $event)"
                           @mouseenter="selectedIndex = index">
                            <slot name="item"
                                  :item="item"
                                  :index="index"
                                  :highlightedText="highlightText ? highlightItemText(item) : null">
                                <span v-html="highlightText ? highlightItemText(item) : getItemLabel(item)"></span>
                            </slot>
                        </a>
                    </li>
                </template>
                <!-- Виртуальный скроллинг (рендерим только видимые) -->
                <template v-else>
                    <li v-for="(item, index) in virtualVisibleItems"
                        :key="getItemKey(item, index)"
                        :class="{ 'active': index === selectedIndex }"
                        :style="{ height: virtualItemHeight + 'px' }">
                        <a class="dropdown-item"
                           :class="{ 'active': isItemSelected(item) }"
                           href="#"
                           @click.prevent="handleItemSelect(item, $event)"
                           @mouseenter="selectedIndex = index">
                            <slot name="item"
                                  :item="item"
                                  :index="index"
                                  :highlightedText="highlightText ? highlightItemText(item) : null">
                                <span v-html="highlightText ? highlightItemText(item) : getItemLabel(item)"></span>
                            </slot>
                        </a>
                    </li>
                </template>
            </slot>
        </div>

        <!-- Обычный список (если не прокручиваемый) -->
        <slot v-else
              name="items"
              :filteredItems="visibleItems"
              :searchQuery="searchQuery"
              :highlightText="highlightText"
              :selectedIndex="selectedIndex">
            <li v-for="(item, index) in visibleItems"
                :key="getItemKey(item, index)"
                :class="{ 'active': index === selectedIndex }">
                <a class="dropdown-item"
                   :class="{ 'active': isItemSelected(item) }"
                   href="#"
                   @click.prevent="handleItemSelect(item, $event)"
                   @mouseenter="selectedIndex = index">
                    <slot name="item"
                          :item="item"
                          :index="index"
                          :highlightedText="highlightText ? highlightItemText(item) : null">
                        <span v-html="highlightText ? highlightItemText(item) : getItemLabel(item)"></span>
                    </slot>
                </a>
            </li>
        </slot>

        <!-- Пустое состояние при поиске -->
        <li v-if="visibleItems.length === 0 && searchQuery" class="px-3 py-2 text-muted text-center">
            {{ emptySearchText }}
        </li>

        <!-- Группировка элементов (структура заложена для будущей реализации) -->
        <template v-if="groupBy">
            <!-- Логика группировки будет реализована в computed groupedItems -->
        </template>
    </ul>
</div>`;

    /**
     * Вставляет шаблон в DOM
     */
    function insertTemplate() {
        const templateScript = document.createElement('script');
        templateScript.type = 'text/x-template';
        templateScript.id = 'combobox-template';
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

