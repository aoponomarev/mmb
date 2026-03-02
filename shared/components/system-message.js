/**
 * ================================================================================================
 * SYSTEM MESSAGE - Единичное системное сообщение (SSOT for шаблона)
 * ================================================================================================
 *
 * PURPOSE: SSOT for отображения одного системного сообщения.
 * Используется компонентом cmp-system-messages for рендеринга каждого сообщения.
 *
 * @skill-anchor app/skills/component-classes-management #for-classes-add-remove
 * @skill-anchor app/skills/bootstrap-vue-integration #for-bootstrap-event-proxying
 * @skill-anchor app/skills/vue-implementation-patterns #for-utility-availability-check
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
     * Компонент единичного системного сообщения
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
             * Объект сообщения
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
                // Tick for принудительного пересчета computed при смене языка
                _translationTick: 0,
                _onLanguageChanged: null
            };
        },

        mounted() {
            // Подписываемся на изменения языка for принудительного пересчета computed
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
             * CSS классы for сообщения
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
             * Есть ли действия у сообщения
             * @returns {boolean}
             */
            hasActions() {
                return this.message.actions && this.message.actions.length > 0;
            },

            /**
             * Переведенный текст сообщения с подставленными параметрами
             * SSOT: использует messagesTranslator for перевода
             * @returns {string}
             */
            translatedText() {
                // Принудительная зависимость от _translationTick for пересчета при смене языка
                // eslint-disable-next-line no-unused-vars
                const tick = this._translationTick;

                // Если есть ключ и переводчик доступен - используем переводчик
                if (this.message.key && window.messagesTranslator) {
                    const translated = window.messagesTranslator.translate(
                        this.message.key,
                        this.message.params || {}
                    );
                    return translated.text || this.message.text || '';
                }
                // Fallback на оригинальный текст
                return this.message.text || '';
            },

            /**
             * Переведенные детали сообщения с подставленными параметрами
             * SSOT: использует messagesTranslator for перевода
             * @returns {string|null}
             */
            translatedDetails() {
                // Принудительная зависимость от _translationTick for пересчета при смене языка
                // eslint-disable-next-line no-unused-vars
                const tick = this._translationTick;

                // Если есть ключ и переводчик доступен - используем переводчик
                if (this.message.key && window.messagesTranslator) {
                    const translated = window.messagesTranslator.translate(
                        this.message.key,
                        this.message.params || {}
                    );
                    return translated.details || this.message.details || null;
                }
                // Fallback на оригинальные детали
                return this.message.details || null;
            }
        },

        methods: {
            /**
             * Get Bootstrap класс for типа сообщения
             * @param {string} type - тип сообщения (danger|warning|info|success)
             * @returns {string} - Bootstrap класс alert-*
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
             * Get класс кнопки for действия
             * @param {Object} action - объект действия
             * @returns {string} - классы Bootstrap кнопки
             */
            getActionButtonClass(action) {
                const variant = action.variant || 'primary';
                return `btn btn-sm btn-${variant} me-2`;
            },

            /**
             * Закрыть сообщение
             */
            dismiss() {
                this.$emit('dismiss', this.message.id);
            },

            /**
             * Обработать действие
             * @param {Object} action - объект действия
             */
            handleAction(action) {
                this.$emit('action', action);
            }
        }
    };

    // Экспортируем компонент в window for регистрации в app-ui-root
    window.cmpSystemMessage = cmpSystemMessage;

})();
