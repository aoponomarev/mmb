/**
 * #JS-KsDLBKp2
 * @description Template for sortable table column header; id="sortable-header-template"; div/label/sort icon.
 * @see id:sk-318305
 */

(function() {
    'use strict';

    const TEMPLATE = `<div style="cursor: pointer;" @click="handleClick" class="d-inline-flex align-items-center" :title="tooltip">
        <span class="fw-semibold">{{ label }}</span>
        <span class="material-symbols-sharp ms-1" style="font-size: 1rem; opacity: 0.5;">{{ sortIcon }}</span>
    </div>`;

    // Create script element with type x-template
    const scriptElement = document.createElement('script');
    scriptElement.type = 'text/x-template';
    scriptElement.id = 'sortable-header-template';
    scriptElement.textContent = TEMPLATE;

    // Append to DOM
    document.body.appendChild(scriptElement);

    console.log('sortable-header-template.js: шаблон loaded');
})();
