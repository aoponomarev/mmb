/**
 * ================================================================================================
 * MODAL BUTTONS TEMPLATE - Шаблон компонента кнопок модального окна
 * ================================================================================================
 *
 * ЦЕЛЬ: Шаблон для компонента рендеринга кнопок модального окна (cmp-modal-buttons).
 *
 * ПРОБЛЕМА: Шаблон должен быть доступен в DOM до инициализации Vue.js для работы компонента.
 *
 * РЕШЕНИЕ: Шаблон хранится как строка в JavaScript файле и автоматически вставляется в DOM
 * при загрузке файла как <script type="text/x-template"> элемент с id="modal-buttons-template".
 *
 * КАК ДОСТИГАЕТСЯ:
 * - Шаблон определён как строка в константе TEMPLATE
 * - При загрузке файла автоматически создаётся <script type="text/x-template"> элемент
 * - Элемент добавляется в document.body с id="modal-buttons-template"
 * - Компонент использует шаблон через template: '#modal-buttons-template'
 *
 * ОСОБЕННОСТИ ШАБЛОНА:
 * Структура HTML:
 * - Рендеринг списка кнопок через v-for
 * - Каждая кнопка использует cmp-button с конфигурацией из button config
 * - Передача всех свойств кнопки (label, variant, disabled, icon, classesAdd, buttonAttributes)
 *
 * ССЫЛКИ:
 * - Общие принципы работы с шаблонами: a/skills/app/skills/components/components-template-split.md
 * - Компонент: shared/components/modal-buttons.js
 */

(function() {
    'use strict';

    const TEMPLATE = `<template v-if="processedButtons.length > 0">
    <cmp-button
        v-for="button in processedButtons"
        :key="button.id"
        :label="button.label"
        :variant="button.variant"
        :disabled="button.disabled"
        :icon="button.icon"
        :tooltip-icon="button.tooltipIcon"
        :tooltip-text="button.tooltipText"
        :classes-add="button.classesAdd"
        :button-attributes="button.buttonAttributes"
        @click="handleClick(button)">
    </cmp-button>
</template>`;

    /**
     * Вставляет шаблон в DOM
     */
    function insertTemplate() {
        const templateScript = document.createElement('script');
        templateScript.type = 'text/x-template';
        templateScript.id = 'modal-buttons-template';
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

