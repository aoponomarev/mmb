/**
 * #JS-ca2bWcWq
 * @description Template for cmp-timezone-selector; id="timezone-selector-template"; select.form-select, option list.
 * @see id:sk-318305
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
     * Injects template into DOM
     */
    function insertTemplate() {
        const templateScript = document.createElement('script');
        templateScript.type = 'text/x-template';
        templateScript.id = 'timezone-selector-template';
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

