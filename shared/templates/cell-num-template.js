/**
 * CELL-NUM TEMPLATE - Template for formatted table numeric cell. Injected as <script type="text/x-template"> id="cell-num-template".
 * Structure: span root with data-value-sign; empty/infinite display; prefix, sign, integer, separator, fraction, unit. Color via data-value-sign; tooltip via title. Ref: id:sk-318305, shared/components/cell-num.js
 */

(function() {
    'use strict';

    const TEMPLATE = `<span :data-value-sign="colorizeDataAttr" :title="tooltipText">
        <!-- Отображение for пустых значений или бесконечности -->
        <template v-if="emptyOrInfiniteDisplay !== null">
            <span>{{ emptyOrInfiniteDisplay }}</span>
        </template>

        <!-- Отображение обычного числа по частям -->
        <template v-else>
            <!-- Префикс -->
            <span v-if="prefix" :class="prefixClass">{{ prefix }}</span>

            <!-- Знак -->
            <span v-if="numberSign" :class="signClass">{{ numberSign }}</span>

            <!-- Целая часть -->
            <span v-if="integerPart" :class="integerClass">{{ integerPart }}</span>

            <!-- Десятичный sectionитель -->
            <span v-if="decimalSeparatorDisplay" :class="separatorClass">{{ decimalSeparatorDisplay }}</span>

            <!-- Дробная часть -->
            <span v-if="fractionPart" :class="fractionClass">{{ fractionPart }}</span>

            <!-- Единицы измерения -->
            <span v-if="numberUnit" :class="unitClass">{{ numberUnit }}</span>
        </template>
    </span>`;

    // Create script element with type x-template
    const scriptElement = document.createElement('script');
    scriptElement.type = 'text/x-template';
    scriptElement.id = 'cell-num-template';
    scriptElement.textContent = TEMPLATE;

    // Append to DOM
    document.body.appendChild(scriptElement);

    console.log('cell-num-template.js: шаблон loaded');
})();
