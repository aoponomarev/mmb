/**
 * ================================================================================================
 * SORTABLE HEADER - Компонент сортируемого заголовка таблицы
 * ================================================================================================
 *
 * PURPOSE: Заголовок колонки с возможностью сортировки.
 *
 * @skill-anchor id:sk-add9a6 #for-classes-add-remove
 * @skill-anchor id:sk-eeb23d #for-bootstrap-event-proxying
 * @skill-anchor id:sk-cb75ec #for-utility-availability-check
 *
 * USAGE:
 * <sortable-header field="current_price" label="Price" :sort-by="sortBy" :sort-order="sortOrder" @sort="handleSort"></sortable-header>
 *
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
