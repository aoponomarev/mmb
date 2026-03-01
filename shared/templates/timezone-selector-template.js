/**
 * ================================================================================================
 * TIMEZONE SELECTOR TEMPLATE - Шаблон компонента выбора таймзоны
 * ================================================================================================
 *
 * ЦЕЛЬ: Шаблон для компонента выбора таймзоны (cmp-timezone-selector).
 *
 * ПРОБЛЕМА: Шаблон должен быть доступен в DOM до инициализации Vue.js для работы компонента.
 *
 * РЕШЕНИЕ: Шаблон хранится как строка в JavaScript файле и автоматически вставляется в DOM
 * при загрузке файла как <script type="text/x-template"> элемент с id="timezone-selector-template".
 *
 * КАК ДОСТИГАЕТСЯ:
 * - Шаблон определён как строка в константе TEMPLATE
 * - При загрузке файла автоматически создаётся <script type="text/x-template"> элемент
 * - Элемент добавляется в document.body с id="timezone-selector-template"
 * - Компонент использует шаблон через template: '#timezone-selector-template'
 *
 * ОСОБЕННОСТИ ШАБЛОНА:
 * Структура HTML:
 * - Корневой элемент: ⟨select class="form-select"⟩ с v-model для двусторонней привязки
 * - Список опций: ⟨option⟩ элементы с value и текстом для каждой таймзоны
 * Layout и CSS-классы:
 * - Использование только Bootstrap классов (form-select)
 * - Минималистичный дизайн без дополнительных оберток
 *
 * ССЫЛКИ:
 * - Общие принципы работы с шаблонами: app/skills/ui-architecture
 * - Компонент: shared/components/timezone-selector.js
 */

(function() {
    'use strict';

    const TEMPLATE = `<select class="form-select" :value="modelValue" @change="$emit('update:modelValue', $event.target.value)">
    <option value="Europe/Moscow">Москва (MCK)</option>
    <option value="Europe/London">Лондон (LON)</option>
    <option value="America/New_York">Нью-Йорк (NYC)</option>
    <option value="America/Los_Angeles">Лос-Анджелес (LAX)</option>
    <option value="Asia/Tokyo">Токио (TYO)</option>
    <option value="Asia/Shanghai">Шанхай (SHA)</option>
    <option value="Europe/Berlin">Берлин (BER)</option>
    <option value="America/Chicago">Чикаго (CHI)</option>
    <option value="UTC">UTC</option>
</select>`;

    /**
     * Вставляет шаблон в DOM
     */
    function insertTemplate() {
        const templateScript = document.createElement('script');
        templateScript.type = 'text/x-template';
        templateScript.id = 'timezone-selector-template';
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

