/**
 * #JS-yZ2EWUuj
 * @description Template for cmp-combobox (script type=text/x-template id=combobox-template); input/combobox modes, dropdown, keyboard nav.
 * @see id:sk-318305
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
    <!-- Крестик for очистки в режиме input (только Bootstrap классы + Font Awesome) -->
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
    <!-- Иконка слева (optional) -->
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

    <!-- Крестик for очистки (через CSS псевдоэлемент) -->
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
        <!-- Прокручиваемая область for виртуального скроллинга -->
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

        <!-- Группировка элементов (структура заложена for будущей реализации) -->
        <template v-if="groupBy">
            <!-- Логика группировки будет реализована в computed groupedItems -->
        </template>
    </ul>
</div>`;

    /**
     * Injects template into DOM
     */
    function insertTemplate() {
        const templateScript = document.createElement('script');
        templateScript.type = 'text/x-template';
        templateScript.id = 'combobox-template';
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

