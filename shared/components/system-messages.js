/**
 * ================================================================================================
 * SYSTEM MESSAGES - Контейнер системных сообщений
 * ================================================================================================
 *
 * PURPOSE: Контейнер for отображения списка системных сообщений.
 * Делегирует рендеринг каждого сообщения компоненту cmp-system-message (SSOT шаблона).
 *
 * @skill-anchor id:sk-add9a6 #for-classes-add-remove
 * @skill-anchor id:sk-eeb23d #for-bootstrap-event-proxying
 * @skill-anchor id:sk-cb75ec #for-utility-availability-check
 *
 * USAGE:
 * <cmp-system-messages scope="global" />
 * <cmp-system-messages scope="test-messages" :limit="3" />
 * <cmp-system-messages scope="global" :horizontal-scroll="true" />
 *
*/

(function() {
    'use strict';

    if (!window.Vue) {
        console.error('system-messages.js: Vue.js not loaded');
        return;
    }

    /**
     * Контейнер системных сообщений
     */
    const cmpSystemMessages = {
        components: {
            // Локальная регистрация дочернего компонента for Vue 3
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
             * Горизонтальная прокрутка (for сплэша внизу)
             * @type {Boolean}
             */
            horizontalScroll: {
                type: Boolean,
                default: false
            },
            /**
             * Scope сообщений for фильтрации
             * @type {String}
             */
            scope: {
                type: String,
                default: 'global'
            },

            /**
             * Показывать сообщения без scope
             * @type {Boolean}
             */
            includeUnscoped: {
                type: Boolean,
                default: true
            },

            /**
             * Ограничение количества сообщений (0 = без ограничения)
             * @type {Number}
             */
            limit: {
                type: Number,
                default: 0
            }
        },

        data() {
            return {
                // Fallback tick for принудительного ререндера
                _appMessagesTick: 0,
                _onAppMessagesChanged: null
            };
        },

        mounted() {
            // Подписываемся на изменения сообщений (fallback for не-Vue реактивности)
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
             * Классы контейнера
             */
            containerClasses() {
                const base = ['messages-container'];
                if (this.horizontalScroll) {
                    base.push('d-flex', 'flex-nowrap', 'overflow-auto', 'gap-2', 'py-1');
                }
                return base;
            },
            /**
             * Видимые сообщения с учётом фильтров
             * @returns {Array<Object>}
             */
            visibleMessages() {
                // Принудительная зависимость от _appMessagesTick for fallback
                // eslint-disable-next-line no-unused-vars
                const tick = this._appMessagesTick;

                if (!window.AppMessages || !window.AppMessages.state) {
                    return [];
                }

                const allMessages = window.AppMessages.state.messages || [];

                // Фильтрация по scope
                let filtered = allMessages.filter(m => {
                    if (m.scope === this.scope) return true;
                    if (this.includeUnscoped && !m.scope) return true;
                    return false;
                });

                // Ограничение количества (если limit > 0)
                if (this.limit > 0) {
                    filtered = filtered.slice(0, this.limit);
                }

                return filtered;
            }
        },

        methods: {
            /**
             * Закрыть сообщение
             * @param {string} id - ID сообщения
             */
            dismissMessage(id) {
                if (window.AppMessages && typeof window.AppMessages.dismiss === 'function') {
                    window.AppMessages.dismiss(id);
                }
            },

            /**
             * Обработать действие сообщения
             * @param {Object} action - объект действия
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

    // Экспортируем компонент в window for регистрации в app-ui-root
    window.cmpSystemMessages = cmpSystemMessages;

})();
