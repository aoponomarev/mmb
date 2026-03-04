/**
 * ================================================================================================
 * SORTABLE HEADER - Table column sortable header
 * ================================================================================================
 *
 * PURPOSE: Column header with sort indicator and emit.
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
            // Sort field (passed to handleSort)
            field: {
                type: String,
                required: true
            },
            // Header label
            label: {
                type: String,
                required: true
            },
            // Current sort field (from parent)
            sortBy: {
                type: String,
                default: null
            },
            // Current sort order (null | 'asc' | 'desc')
            sortOrder: {
                type: String,
                default: null,
                validator: (value) => value === null || value === 'asc' || value === 'desc'
            },
            // Tooltip
            tooltip: {
                type: String,
                default: ''
            }
        },

        computed: {
            // Whether sort is active for this field
            isActive() {
                return this.sortBy === this.field && this.sortOrder !== null;
            },

            // Sort icon by state
            sortIcon() {
                if (!this.isActive) {
                    return 'sort'; // Material Symbols: inactive
                }
                return this.sortOrder === 'asc' ? 'north' : 'south'; // Material Symbols: asc/desc
            }
        },

        methods: {
            // Click handler - emit sort for parent
            handleClick() {
                this.$emit('sort', this.field);
            }
        }
    };

    console.log('✅ sortable-header component loaded');
})();
