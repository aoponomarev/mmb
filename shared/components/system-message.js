/**
 * ================================================================================================
 * SYSTEM MESSAGE - Single system message (SSOT for template)
 * ================================================================================================
 *
 * PURPOSE: SSOT for displaying one system message. Used by cmp-system-messages to render each message.
 *
 * @skill-anchor id:sk-add9a6 #for-classes-add-remove
 * @skill-anchor id:sk-eeb23d #for-bootstrap-event-proxying
 * @skill-anchor id:sk-cb75ec #for-utility-availability-check
 *
 * USAGE:
 * <cmp-system-message
 *     :message="messageObject"
 *     @dismiss="handleDismiss"
 *     @action="handleAction"
 * />
 *
*/

(function() {
    'use strict';

    if (!window.Vue) {
        console.error('system-message.js: Vue.js not loaded');
        return;
    }

    /**
     * Single system message component
     */
    const cmpSystemMessage = {
        template: `
            <div
                :class="messageClasses"
                role="alert"
            >
                <div class="d-flex align-items-start">
                    <div class="flex-grow-1">
                        <strong>{{ translatedText }}</strong>
                        <small v-if="translatedDetails" class="d-block mt-1 text-muted">
                            {{ translatedDetails }}
                        </small>
                    </div>
                    <button
                        type="button"
                        class="btn-close opacity-25"
                        @click="dismiss"
                        aria-label="Close"
                    ></button>
                </div>
                <div v-if="hasActions" class="mt-2">
                    <button
                        v-for="action in message.actions"
                        :key="action.id"
                        type="button"
                        :class="getActionButtonClass(action)"
                        @click="handleAction(action)"
                    >
                        {{ action.label }}
                    </button>
                </div>
            </div>
        `,

        props: {
            /**
             * Message object
             * @type {Object}
             * @required
             */
            message: {
                type: Object,
                required: true,
                validator(value) {
                    return value.id && value.text && value.type;
                }
            }
        },

        data() {
            return {
                // Tick to force recompute on language change
                _translationTick: 0,
                _onLanguageChanged: null
            };
        },

        mounted() {
            // Subscribe to language change to refresh computed
            this._onLanguageChanged = () => {
                this._translationTick++;
            };
            document.addEventListener('messages-translator:language-changed', this._onLanguageChanged);
        },

        beforeUnmount() {
            if (this._onLanguageChanged) {
                document.removeEventListener('messages-translator:language-changed', this._onLanguageChanged);
            }
        },

        computed: {
            /**
             * CSS classes for message
             * @returns {Array<string>}
             */
            messageClasses() {
                const baseClass = 'alert';
                const typeClass = this.getBootstrapAlertClass(this.message.type);
                const dismissibleClass = 'alert-dismissible';
                const fadeClass = 'fade show';

                return [baseClass, typeClass, dismissibleClass, fadeClass];
            },

            /**
             * Whether message has actions
             * @returns {boolean}
             */
            hasActions() {
                return this.message.actions && this.message.actions.length > 0;
            },

            /**
             * Translated message text (SSOT: messagesTranslator)
             * @returns {string}
             */
            translatedText() {
                // eslint-disable-next-line no-unused-vars
                const tick = this._translationTick;

                if (this.message.key && window.messagesTranslator) {
                    const translated = window.messagesTranslator.translate(
                        this.message.key,
                        this.message.params || {}
                    );
                    return translated.text || this.message.text || '';
                }
                return this.message.text || '';
            },

            /**
             * Translated message details (SSOT: messagesTranslator)
             * @returns {string|null}
             */
            translatedDetails() {
                // eslint-disable-next-line no-unused-vars
                const tick = this._translationTick;

                if (this.message.key && window.messagesTranslator) {
                    const translated = window.messagesTranslator.translate(
                        this.message.key,
                        this.message.params || {}
                    );
                    return translated.details || this.message.details || null;
                }
                return this.message.details || null;
            }
        },

        methods: {
            /**
             * Bootstrap alert class for message type
             * @param {string} type - danger|warning|info|success
             * @returns {string} - alert-*
             */
            getBootstrapAlertClass(type) {
                const mapping = {
                    'danger': 'alert-danger',
                    'warning': 'alert-warning',
                    'info': 'alert-info',
                    'success': 'alert-success'
                };
                return mapping[type] || 'alert-info';
            },

            /**
             * Button class for action
             * @param {Object} action - action object
             * @returns {string} - Bootstrap btn classes
             */
            getActionButtonClass(action) {
                const variant = action.variant || 'primary';
                return `btn btn-sm btn-${variant} me-2`;
            },

            /**
             * Dismiss message
             */
            dismiss() {
                this.$emit('dismiss', this.message.id);
            },

            /**
             * Handle action
             * @param {Object} action - action object
             */
            handleAction(action) {
                this.$emit('action', action);
            }
        }
    };

    // Export for registration in app-ui-root
    window.cmpSystemMessage = cmpSystemMessage;

})();
