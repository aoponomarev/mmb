/**
 * ================================================================================================
 * MODAL TEMPLATE - Шаблон компонента модального окна
 * ================================================================================================
 *
 * ЦЕЛЬ: Шаблон для Vue-обёртки над Bootstrap Modal (cmp-modal).
 *
 * ПРОБЛЕМА: Шаблон должен быть доступен в DOM до инициализации Vue.js для работы компонента.
 *
 * РЕШЕНИЕ: Шаблон хранится как строка в JavaScript файле и автоматически вставляется в DOM
 * при загрузке файла как <script type="text/x-template"> элемент с id="modal-template".
 *
 * КАК ДОСТИГАЕТСЯ:
 * - Шаблон определён как строка в константе TEMPLATE
 * - При загрузке файла автоматически создаётся <script type="text/x-template"> элемент
 * - Элемент добавляется в document.body с id="modal-template"
 * - Компонент использует шаблон через template: '#modal-template'
 *
 * ОСОБЕННОСТИ ШАБЛОНА:
 * Структура HTML:
 * - Корневой элемент: ⟨div class="modal fade"⟩ с ref="modalElement" и условным классом 'show'
 * - Контейнер диалога: ⟨div class="modal-dialog"⟩ с условными классами размера и центрирования
 * - Контент: ⟨div class="modal-content"⟩
 * Layout и CSS-классы:
 * - Использование только Bootstrap классов для стилизации
 * - Поддержка размеров через Bootstrap классы (modal-sm, modal-lg, modal-xl)
 * - Центрирование через класс modal-dialog-centered
 * Слоты:
 * - #header — заголовок модального окна
 * - #body — тело модального окна
 * - #footer — футер модального окна
 *
 * ОСОБЕННОСТИ:
 * - Поддержка динамических кнопок через cmp-modal-buttons
 * - Кнопки отображаются автоматически, если зарегистрированы через modalApi
 * - Слоты и динамические кнопки могут использоваться одновременно
 *
 * ССЫЛКИ:
 * - Общие принципы работы с шаблонами: `is/skills/arch-foundationarchitecture-dom-markup.md` (раздел "Вынос x-template шаблонов")
 * - Компонент: shared/components/modal.js
 * - Компонент кнопок: shared/components/modal-buttons.js
 */

(function() {
    'use strict';

    const TEMPLATE = `<div
    :class="modalClasses"
    :id="modalId"
    tabindex="-1"
    :aria-labelledby="computedTitleId"
    :aria-hidden="static ? false : !isOpen"
    :style="static ? 'position: relative; z-index: auto;' : ''"
    ref="modalElement">
    <div :class="dialogClasses">
        <div class="modal-content">
            <div class="modal-header modal-header-themed" v-if="$slots.header || hasHeaderButtons || modalTitle" data-bs-theme="dark">
                <div v-if="hasHeaderButtons" class="pe-2">
                    <cmp-modal-buttons location="header"></cmp-modal-buttons>
                </div>
                <slot name="header">
                    <h5 v-if="modalTitle && !$slots.header" class="modal-title" :id="computedTitleId">{{ modalTitle }}</h5>
                </slot>
            </div>
            <div class="modal-body" v-if="$slots.body">
                <slot name="body"></slot>
            </div>
            <div class="modal-footer modal-footer-themed" v-if="$slots.footer || hasFooterButtons" data-bs-theme="dark">
                <div class="me-auto d-flex align-items-center justify-content-start gap-2" :id="modalId + '-footer-extra'">
                    <cmp-modal-buttons location="footer" v-if="hasFooterButtons" :left-only="true"></cmp-modal-buttons>
                </div>
                <slot name="footer"></slot>
                <cmp-modal-buttons location="footer" v-if="hasFooterButtons" :right-only="true"></cmp-modal-buttons>
            </div>
        </div>
    </div>
</div>`;

    /**
     * Вставляет шаблон в DOM
     */
    function insertTemplate() {
        const templateScript = document.createElement('script');
        templateScript.type = 'text/x-template';
        templateScript.id = 'modal-template';
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

