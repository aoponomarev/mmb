/**
 * ================================================================================================
 * SORTABLE-HEADER TEMPLATE - Шаблон компонента сортируемого заголовка колонки
 * ================================================================================================
 *
 * PURPOSE: Шаблон for компонента заголовка колонки таблицы с поддержкой сортировки.
 *
 * ПРОБЛЕМА: Шаблон должен быть доступен в DOM до инициализации Vue.js for работы компонента.
 *
 * РЕШЕНИЕ: Шаблон хранится как строка в JavaScript файле и автоматически вставляется в DOM
 * при загрузке файла как <script type="text/x-template"> элемент с id="sortable-header-template".
 *
 * КАК ДОСТИГАЕТСЯ:
 * - Шаблон определён как строка в константе TEMPLATE
 * - При загрузке файла автоматически создаётся <script type="text/x-template"> элемент
 * - Элемент добавляется в document.body с id="sortable-header-template"
 * - Компонент использует шаблон через template: '#sortable-header-template'
 *
 * ОСОБЕННОСТИ ШАБЛОНА:
 * Структура HTML:
 * - Корневой элемент: ⟨div style="cursor: pointer;"⟩ с обработчиком клика
 * - Текст заголовка: ⟨span class="fw-semibold"⟩
 * - Иконка сортировки: ⟨span class="material-symbols-sharp"⟩
 * Layout и CSS-классы:
 * - Использование только Bootstrap классов for стилизации
 * - Курсор pointer for индикации кликабельности
 * - Material Symbols for иконок сортировки
 *
 * REFERENCES:
 * - General principles работы с шаблонами: id:sk-318305
 * - Компонент: shared/components/sortable-header.js
 */

(function() {
    'use strict';

    const TEMPLATE = `<div style="cursor: pointer;" @click="handleClick" class="d-inline-flex align-items-center" :title="tooltip">
        <span class="fw-semibold">{{ label }}</span>
        <span class="material-symbols-sharp ms-1" style="font-size: 1rem; opacity: 0.5;">{{ sortIcon }}</span>
    </div>`;

    // Создаём элемент script с типом x-template
    const scriptElement = document.createElement('script');
    scriptElement.type = 'text/x-template';
    scriptElement.id = 'sortable-header-template';
    scriptElement.textContent = TEMPLATE;

    // Добавляем в DOM
    document.body.appendChild(scriptElement);

    console.log('sortable-header-template.js: шаблон loaded');
})();
