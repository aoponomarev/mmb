/**
 * #JS-Gn38YPCx
 * @description Container for system messages list; delegates to cmp-system-message (template SSOT).
 * @skill-anchor id:sk-add9a6 #for-classes-add-remove
 * @skill-anchor id:sk-eeb23d #for-bootstrap-event-proxying
 * @skill-anchor id:sk-cb75ec #for-utility-availability-check
 *
 * USAGE: <cmp-system-messages scope="global" /> | scope="test-messages" :limit="3" | :horizontal-scroll="true" />
 */

(function() {
    'use strict';

    if (!window.Vue) {
        console.error('system-messages.js: Vue.js not loaded');
        return;
    }

    /**
     * System messages container
     */
    const cmpSystemMessages = {
        components: {
            // Local registration of child component (Vue 3)
            'cmp-system-message': window.cmpSystemMessage
        },
        template: `
            <div :class="containerClasses">
                <template v-if="horizontalScroll">
                    <div
                        v-for="message in visibleMessages"
                        :key="message.id"
                        class="flex-shrink-0 me-2"
                    >
                        <cmp-system-message
                            :message="message"
                            @dismiss="dismissMessage"
                            @action="handleAction"
                        />
                    </div>
                </template>
                <template v-else>
                    <cmp-system-message
                        v-for="message in visibleMessages"
                        :key="message.id"
                        :message="message"
                        @dismiss="dismissMessage"
                        @action="handleAction"
                    />
                </template>
            </div>
        `,

        props: {
            /**
             * Horizontal scroll (e.g. splash at bottom)
             * @type {Boolean}
             */
            horizontalScroll: {
                type: Boolean,
                default: false
            },
            /**
             * Message scope for filtering
             * @type {String}
             */
            scope: {
                type: String,
                default: 'global'
            },

            /**
             * Include messages without scope
             * @type {Boolean}
             */
            includeUnscoped: {
                type: Boolean,
                default: true
            },

            /**
             * Max number of messages (0 = no limit)
             * @type {Number}
             */
            limit: {
                type: Number,
                default: 0
            }
        },

        data() {
            return {
                // Fallback tick to force re-render
                _appMessagesTick: 0,
                _onAppMessagesChanged: null
            };
        },

        mounted() {
            // Subscribe to message changes (fallback when not Vue-reactive)
            this._onAppMessagesChanged = () => {
                this._appMessagesTick++;
            };
            document.addEventListener('app-messages:changed', this._onAppMessagesChanged);
        },

        beforeUnmount() {
            if (this._onAppMessagesChanged) {
                document.removeEventListener('app-messages:changed', this._onAppMessagesChanged);
            }
        },

        computed: {
            /**
             * Container classes
             */
            containerClasses() {
                const base = ['messages-container'];
                if (this.horizontalScroll) {
                    base.push('d-flex', 'flex-nowrap', 'overflow-auto', 'gap-2', 'py-1');
                }
                return base;
            },
            /**
             * Visible messages after filters
             * @returns {Array<Object>}
             */
            visibleMessages() {
                // Depend on _appMessagesTick for fallback reactivity
                // eslint-disable-next-line no-unused-vars
                const tick = this._appMessagesTick;

                if (!window.AppMessages || !window.AppMessages.state) {
                    return [];
                }

                const allMessages = window.AppMessages.state.messages || [];

                // Filter by scope
                let filtered = allMessages.filter(m => {
                    if (m.scope === this.scope) return true;
                    if (this.includeUnscoped && !m.scope) return true;
                    return false;
                });

                // Apply limit if set
                if (this.limit > 0) {
                    filtered = filtered.slice(0, this.limit);
                }

                return filtered;
            }
        },

        methods: {
            /**
             * Dismiss message
             * @param {string} id - message ID
             */
            dismissMessage(id) {
                if (window.AppMessages && typeof window.AppMessages.dismiss === 'function') {
                    window.AppMessages.dismiss(id);
                }
            },

            /**
             * Handle message action
             * @param {Object} action - action object
             */
            handleAction(action) {
                if (!action || !action.handler) {
                    console.warn('system-messages: action не имеет handler');
                    return;
                }

                if (typeof action.handler === 'function') {
                    action.handler();
                } else if (typeof action.handler === 'string' && window.messagesConfig) {
                    const handler = window.messagesConfig.ACTIONS[action.handler];
                    if (handler && typeof handler === 'function') {
                        handler();
                    } else {
                        console.warn(`system-messages: handler "${action.handler}" не найден в messagesConfig.ACTIONS`);
                    }
                }
            }
        }
    };

    // Export for registration in app-ui-root
    window.cmpSystemMessages = cmpSystemMessages;

})();
