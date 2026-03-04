/**
 * ================================================================================================
 * TIMEZONE SELECTOR COMPONENT - Компонент выбора таймзоны
 * ================================================================================================
 *
 * PURPOSE: Переиспользуемый компонент выбора таймзоны for устранения дублирования разметки.
 *
 * @skill-anchor id:sk-add9a6 #for-classes-add-remove
 * @skill-anchor id:sk-eeb23d #for-bootstrap-event-proxying
 * @skill-anchor id:sk-cb75ec #for-utility-availability-check
 *
 * ПРОБЛЕМА: Разметка выбора таймзоны (список опций) дублировалась в нескольких местах
 * (статические примеры модальных окон, реальные модальные окна), что нарушало принцип
 * "единого sourceа правды" (Single Source of Truth).
 *
 * РЕШЕНИЕ: Вынос разметки выбора таймзоны в отдельный переиспользуемый компонент.
 * Все инстансы модальных окон используют один и тот же компонент, что гарантирует
 * единообразие и упрощает поддержку.
 *
 * API КОМПОНЕНТА:
 *
 * Входные параметры (props):
 * - modelValue (String, required) — текущее значение таймзоны (for v-model)
 *
 * Logoutные события (emits):
 * - update:modelValue — обновление значения таймзоны (for v-model)
 *
*/

window.cmpTimezoneSelector = {
    template: '#timezone-selector-template',

    props: {
        modelValue: {
            type: String,
            required: true
        }
    },

    emits: ['update:modelValue']
};

