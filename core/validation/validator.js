/**
 * ================================================================================================
 * VALIDATOR - Валидация данных по схемам
 * ================================================================================================
 *
 * ЦЕЛЬ: Валидировать данные по схемам из validation-schemas.js.
 * Проверка типов, обязательных полей, диапазонов значений.
 *
 * Skill: a/skills/app/skills/metrics/metrics-validation.md
 *
 * ПРИНЦИПЫ:
 * - Строгая валидация перед использованием данных
 * - Детальные сообщения об ошибках
 * - Поддержка вложенных объектов и массивов
 *
 * ССЫЛКА: Критически важные структуры описаны в a/skills/app/skills/architecture/architecture-core-stack.md
 */

(function() {
    'use strict';

    if (typeof window.validationSchemas === 'undefined') {
        console.error('validator.js: validationSchemas не загружен');
        return;
    }

    /**
     * Валидировать значение по правилу
     * @param {any} value - значение
     * @param {Object} rule - правило валидации
     * @returns {Object} - { valid: boolean, error: string }
     */
    function validateRule(value, rule) {
        // Проверка обязательности
        if (rule.required && (value === undefined || value === null)) {
            return { valid: false, error: 'Поле обязательно' };
        }

        if (value === undefined || value === null) {
            return { valid: true }; // Необязательное поле может быть null
        }

        // Проверка типа
        if (rule.type) {
            const actualType = Array.isArray(value) ? 'array' : typeof value;
            if (actualType !== rule.type) {
                return { valid: false, error: `Ожидается тип ${rule.type}, получен ${actualType}` };
            }
        }

        // Проверка диапазона для чисел
        if (rule.type === 'number') {
            if (typeof value !== 'number' || isNaN(value)) {
                return { valid: false, error: 'Значение должно быть числом' };
            }
            if (rule.min !== undefined && value < rule.min) {
                return { valid: false, error: `Значение должно быть >= ${rule.min}` };
            }
            if (rule.max !== undefined && value > rule.max) {
                return { valid: false, error: `Значение должно быть <= ${rule.max}` };
            }
        }

        // Проверка enum
        if (rule.enum && !rule.enum.includes(value)) {
            return { valid: false, error: `Значение должно быть одним из: ${rule.enum.join(', ')}` };
        }

        return { valid: true };
    }

    /**
     * Валидировать данные по схеме
     * @param {any} data - данные для валидации
     * @param {string} schemaName - имя схемы
     * @param {Object} options - опции { showMessage: boolean, scope: string }
     * @returns {Object} - { valid: boolean, errors: Array }
     */
    function validate(data, schemaName, options = {}) {
        const schema = window.validationSchemas.getSchema(schemaName);
        if (!schema) {
            return { valid: false, errors: [`Схема ${schemaName} не найдена`] };
        }

        const errors = [];

        // Валидация объекта
        if (typeof data !== 'object' || Array.isArray(data) || data === null) {
            return { valid: false, errors: ['Данные должны быть объектом'] };
        }

        // Валидация каждого поля схемы
        for (const [fieldName, rule] of Object.entries(schema)) {
            const value = data[fieldName];
            const result = validateRule(value, rule);

            if (!result.valid) {
                errors.push(`${fieldName}: ${result.error}`);
            }

            // Валидация вложенных объектов (itemSchema для массивов)
            if (rule.itemSchema && Array.isArray(value)) {
                for (let i = 0; i < value.length; i++) {
                    const itemResult = validate(value[i], rule.itemSchema, { showMessage: false });
                    if (!itemResult.valid) {
                        errors.push(`${fieldName}[${i}]: ${itemResult.errors.join(', ')}`);
                    }
                }
            }
        }

        const result = {
            valid: errors.length === 0,
            errors
        };

        // Автоматический показ сообщения при ошибке валидации
        // Опция showMessage: false отключает автоматический показ
        const showMessage = options.showMessage !== false;
        if (!result.valid && showMessage && window.AppMessages && window.messagesConfig) {
            const messageData = window.messagesConfig.getMessage('error.validation.error');
            const scope = options.scope || 'global';

            window.AppMessages.push({
                text: messageData.text,
                details: errors.join('; '),
                type: messageData.type || 'warning',
                priority: messageData.priority || 3,
                key: 'error.validation.error', // Сохраняем ключ для последующего перевода
                scope: scope,
                actions: []
            });
        }

        return result;
    }

    /**
     * Валидировать массив данных
     * @param {Array} dataArray - массив данных
     * @param {string} schemaName - имя схемы
     * @param {Object} options - опции { showMessage: boolean, scope: string }
     * @returns {Object} - { valid: boolean, errors: Array }
     */
    function validateArray(dataArray, schemaName, options = {}) {
        if (!Array.isArray(dataArray)) {
            return { valid: false, errors: ['Данные должны быть массивом'] };
        }

        const errors = [];
        for (let i = 0; i < dataArray.length; i++) {
            const result = validate(dataArray[i], schemaName, { showMessage: false });
            if (!result.valid) {
                errors.push(`[${i}]: ${result.errors.join(', ')}`);
            }
        }

        const result = {
            valid: errors.length === 0,
            errors
        };

        // Автоматический показ сообщения при ошибке валидации массива
        const showMessage = options.showMessage !== false;
        if (!result.valid && showMessage && window.AppMessages && window.messagesConfig) {
            const messageData = window.messagesConfig.getMessage('error.validation.error');
            const scope = options.scope || 'global';

            window.AppMessages.push({
                text: messageData.text,
                details: errors.join('; '),
                type: messageData.type || 'warning',
                priority: messageData.priority || 3,
                key: 'error.validation.error', // Сохраняем ключ для последующего перевода
                scope: scope,
                actions: []
            });
        }

        return result;
    }

    // Экспорт в глобальную область
    window.validator = {
        validate,
        validateArray,
        validateRule
    };

    console.log('validator.js: инициализирован');
})();

