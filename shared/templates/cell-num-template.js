/**
 * ================================================================================================
 * CELL-NUM TEMPLATE - Шаблон компонента числовой ячейки
 * ================================================================================================
 *
 * PURPOSE: Шаблон for компонента отображения форматированных числовых значений в таблице.
 *
 * ПРОБЛЕМА: Шаблон должен быть доступен в DOM до инициализации Vue.js for работы компонента.
 *
 * РЕШЕНИЕ: Шаблон хранится как строка в JavaScript файле и автоматически вставляется в DOM
 * при загрузке файла как <script type="text/x-template"> элемент с id="cell-num-template".
 *
 * КАК ДОСТИГАЕТСЯ:
 * - Шаблон определён как строка в константе TEMPLATE
 * - При загрузке файла автоматически создаётся <script type="text/x-template"> элемент
 * - Элемент добавляется в document.body с id="cell-num-template"
 * - Компонент использует шаблон через template: '#cell-num-template'
 *
 * ОСОБЕННОСТИ ШАБЛОНА:
 * Структура HTML:
 * - Корневой элемент: ⟨span⟩ с data-value-sign for цветизации через CSS
 * - Условное отображение пустых/бесконечных значений
 * - Раздельное отображение префикса, знака, целой части, sectionителя, дробной части, единиц
 * Layout и CSS-классы:
 * - Цветизация через data-value-sign атрибут (Bootstrap классы через CSS селекторы)
 * - Поддержка tooltip через title атрибут
 *
 * REFERENCES:
 * - General principles работы с шаблонами: id:sk-318305
 * - Компонент: shared/components/cell-num.js
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

    // Создаём элемент script с типом x-template
    const scriptElement = document.createElement('script');
    scriptElement.type = 'text/x-template';
    scriptElement.id = 'cell-num-template';
    scriptElement.textContent = TEMPLATE;

    // Добавляем в DOM
    document.body.appendChild(scriptElement);

    console.log('cell-num-template.js: шаблон loaded');
})();
