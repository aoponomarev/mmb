/**
 * ================================================================================================
 * SORTABLE HEADER - Компонент сортируемого заголовка таблицы
 * ================================================================================================
 *
 * PURPOSE: Заголовок колонки с возможностью сортировки.
 *
 * PRINCIPLES:
 * - Минимальная кастомизация, дефолтный Bootstrap
 * - Показывает иконку сортировки в зависимости от состояния (null, asc, desc)
 * - Эмитит событие при клике for обработки сортировки родительским компонентом
 *
 * USAGE:
 * <sortable-header field="current_price" label="Price" :sort-by="sortBy" :sort-order="sortOrder" @sort="handleSort"></sortable-header>
 *
 * REFERENCES:
 * - Старая версия: do-overs/BOT/ui/components/sortable-header.js
 * - Архитектура: is/skills/arch-foundation
 */

(function() {
    'use strict';

    window.cmpSortableHeader = {
        template: '#sortable-header-template',

        props: {
            // Поле for сортировки (передается в handleSort)
            field: {
                type: String,
                required: true
            },
            // Текст заголовка
            label: {
                type: String,
                required: true
            },
            // Текущее поле сортировки (из родительского компонента)
            sortBy: {
                type: String,
                default: null
            },
            // Текущий порядок сортировки (null | 'asc' | 'desc')
            sortOrder: {
                type: String,
                default: null,
                validator: (value) => value === null || value === 'asc' || value === 'desc'
            },
            // Всплывающая подсказка (tooltip)
            tooltip: {
                type: String,
                default: ''
            }
        },

        computed: {
            // Определяет, активна ли сортировка for этого поля
            isActive() {
                return this.sortBy === this.field && this.sortOrder !== null;
            },

            // Иконка сортировки в зависимости от состояния
            sortIcon() {
                if (!this.isActive) {
                    return 'sort'; // Material Symbols: неактивная сортировка
                }
                return this.sortOrder === 'asc' ? 'north' : 'south'; // Material Symbols: asc/desc
            }
        },

        methods: {
            // Обработчик клика - эмитит событие for родительского компонента
            handleClick() {
                this.$emit('sort', this.field);
            }
        }
    };

    console.log('✅ sortable-header component loaded');
})();
