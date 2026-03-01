/**
 * ================================================================================================
 * EVENT BUS - Глобальная шина событий
 * ================================================================================================
 *
 * ЦЕЛЬ: Обеспечить коммуникацию между компонентами без жёстких зависимостей.
 * Подписка на события, эмит событий, автоматическая отписка.
 * Skill: is/skills/arch-foundation
 *
 * ПРИНЦИПЫ:
 * - Глобальная шина событий для всех компонентов
 * - Подписка/отписка через простой API
 * - Поддержка одноразовых подписок
 *
 * ССЫЛКА: Критически важные структуры описаны в is/skills/arch-foundation
 */

(function() {
    'use strict';

    /**
     * Хранилище подписок
     * Формат: { eventName: [{ callback, once, id }, ...] }
     */
    const subscriptions = new Map();

    /**
     * Счётчик для генерации ID подписок
     */
    let subscriptionIdCounter = 0;

    /**
     * Подписаться на событие
     * @param {string} eventName - имя события
     * @param {Function} callback - функция-обработчик
     * @param {boolean} once - одноразовая подписка
     * @returns {string} - ID подписки (для отписки)
     */
    function on(eventName, callback, once = false) {
        if (typeof callback !== 'function') {
            console.error('event-bus.on: callback должен быть функцией');
            return null;
        }

        const id = `sub_${subscriptionIdCounter++}`;

        if (!subscriptions.has(eventName)) {
            subscriptions.set(eventName, []);
        }

        subscriptions.get(eventName).push({
            id,
            callback,
            once
        });

        return id;
    }

    /**
     * Подписаться на событие один раз
     * @param {string} eventName - имя события
     * @param {Function} callback - функция-обработчик
     * @returns {string} - ID подписки
     */
    function once(eventName, callback) {
        return on(eventName, callback, true);
    }

    /**
     * Отписаться от события
     * @param {string} eventName - имя события
     * @param {string|Function} idOrCallback - ID подписки или функция-обработчик
     */
    function off(eventName, idOrCallback) {
        if (!subscriptions.has(eventName)) {
            return;
        }

        const subs = subscriptions.get(eventName);
        const index = subs.findIndex(sub =>
            sub.id === idOrCallback || sub.callback === idOrCallback
        );

        if (index !== -1) {
            subs.splice(index, 1);
        }

        if (subs.length === 0) {
            subscriptions.delete(eventName);
        }
    }

    /**
     * Эмитнуть событие
     * @param {string} eventName - имя события
     * @param {any} data - данные события
     */
    function emit(eventName, data) {
        if (!subscriptions.has(eventName)) {
            return;
        }

        const subs = subscriptions.get(eventName);
        const toRemove = [];

        for (const sub of subs) {
            try {
                sub.callback(data);
                if (sub.once) {
                    toRemove.push(sub.id);
                }
            } catch (error) {
                console.error(`event-bus.emit(${eventName}): ошибка в обработчике:`, error);
            }
        }

        // Удаление одноразовых подписок
        for (const id of toRemove) {
            off(eventName, id);
        }
    }

    /**
     * Получить количество подписок на событие
     * @param {string} eventName - имя события
     * @returns {number}
     */
    function listenerCount(eventName) {
        return subscriptions.has(eventName) ? subscriptions.get(eventName).length : 0;
    }

    /**
     * Очистить все подписки
     */
    function clear() {
        subscriptions.clear();
    }

    // Экспорт в глобальную область
    window.eventBus = {
        on,
        once,
        off,
        emit,
        listenerCount,
        clear
    };

    console.log('event-bus.js: инициализирован');
})();

