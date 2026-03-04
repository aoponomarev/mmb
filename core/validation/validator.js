/**
 * #JS-qP2fyDmZ
 * @description Schema-based data validation against validation-schemas.js; type checking, required fields, value ranges.
 * @skill id:sk-c3d639
 *
 * PURPOSE: Validate data against schemas from validation-schemas.js.
 *
 * PRINCIPLES:
 * - Strict validation before using data
 * - Detailed error messages
 * - Support for nested objects and arrays
 *
 * REFERENCE: Critical structures described in id:sk-483943
 */

(function() {
    'use strict';

    if (typeof window.validationSchemas === 'undefined') {
        console.error('validator.js: validationSchemas not loaded');
        return;
    }

    /**
     * Validate value against rule
     * @param {any} value - Value
     * @param {Object} rule - Validation rule
     * @returns {Object} - { valid: boolean, error: string }
     */
    function validateRule(value, rule) {
        // Check required
        if (rule.required && (value === undefined || value === null)) {
            return { valid: false, error: 'Поле обязательно' };
        }

        if (value === undefined || value === null) {
            return { valid: true }; // Optional field can be null
        }

        // Type check
        if (rule.type) {
            const actualType = Array.isArray(value) ? 'array' : typeof value;
            if (actualType !== rule.type) {
                return { valid: false, error: `Ожидается тип ${rule.type}, получен ${actualType}` };
            }
        }

        // Range check for numbers
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

        // Enum check
        if (rule.enum && !rule.enum.includes(value)) {
            return { valid: false, error: `Значение должно быть одним из: ${rule.enum.join(', ')}` };
        }

        return { valid: true };
    }

    /**
     * Validate data against schema
     * @param {any} data - Data to validate
     * @param {string} schemaName - Schema name
     * @param {Object} options - Options { showMessage: boolean, scope: string }
     * @returns {Object} - { valid: boolean, errors: Array }
     */
    function validate(data, schemaName, options = {}) {
        const schema = window.validationSchemas.getSchema(schemaName);
        if (!schema) {
            return { valid: false, errors: [`Схема ${schemaName} не найдена`] };
        }

        const errors = [];

        // Object validation
        if (typeof data !== 'object' || Array.isArray(data) || data === null) {
            return { valid: false, errors: ['Данные должны быть объектом'] };
        }

        // Validate each schema field
        for (const [fieldName, rule] of Object.entries(schema)) {
            const value = data[fieldName];
            const result = validateRule(value, rule);

            if (!result.valid) {
                errors.push(`${fieldName}: ${result.error}`);
            }

            // Nested object validation (itemSchema for arrays)
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

        // Show message automatically on validation error
        // Option showMessage: false disables automatic display
        const showMessage = options.showMessage !== false;
        if (!result.valid && showMessage && window.AppMessages && window.messagesConfig) {
            const messageData = window.messagesConfig.getMessage('error.validation.error');
            const scope = options.scope || 'global';

            window.AppMessages.push({
                text: messageData.text,
                details: errors.join('; '),
                type: messageData.type || 'warning',
                priority: messageData.priority || 3,
                key: 'error.validation.error', // Keep key for later translation
                scope: scope,
                actions: []
            });
        }

        return result;
    }

    /**
     * Validate data array
     * @param {Array} dataArray - Data array
     * @param {string} schemaName - Schema name
     * @param {Object} options - Options { showMessage: boolean, scope: string }
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

        // Show message automatically on array validation error
        const showMessage = options.showMessage !== false;
        if (!result.valid && showMessage && window.AppMessages && window.messagesConfig) {
            const messageData = window.messagesConfig.getMessage('error.validation.error');
            const scope = options.scope || 'global';

            window.AppMessages.push({
                text: messageData.text,
                details: errors.join('; '),
                type: messageData.type || 'warning',
                priority: messageData.priority || 3,
                key: 'error.validation.error', // Keep key for later translation
                scope: scope,
                actions: []
            });
        }

        return result;
    }

    // Export to global scope
    window.validator = {
        validate,
        validateArray,
        validateRule
    };

    console.log('validator.js: initialized');
})();

