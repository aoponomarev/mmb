/**
 * ================================================================================================
 * CLASS MANAGER - Утилита for managing CSS классами в компонентах
 * ================================================================================================
 *
 * PURPOSE: Универсальная функция for обработки классов с поддержкой добавления и удаления.
 *
 * PRINCIPLES:
 * - Обрабатывает строки (классы space-separated) и массивы строк
 * - Фильтрует пустые значения
 * - Удаляет дубликаты
 * - Поддерживает добавление и удаление классов
 *
 * USAGE:
 * - В computed свойствах компонентов for обработки classesAdd и classesRemove
 * - Применяется к разным элементам внутри компонента (root, button, menu, suffix и т.д.)
 *
 * REFERENCES:
 * - Documentation компонентов: app/skills/ui-architecture
 */

/**
 * Обрабатывает классы: добавляет classesAdd и удаляет classesRemove
 * @param {Array} baseClasses - базовые классы компонента
 * @param {String|Array} classesAdd - классы for добавления (optional)
 * @param {String|Array} classesRemove - классы for удаления (optional)
 * @returns {Array} - итоговый массив классов без дубликатов
 */
function processClasses(baseClasses, classesAdd, classesRemove) {
    // Начинаем с базовых классов
    let classes = Array.isArray(baseClasses) ? [...baseClasses] : [baseClasses].filter(c => c);

    // ВАЖНО: Сначала удаляем классы (чтобы убрать базовые классы перед добавлением новых)
    if (classesRemove) {
        const removeClasses = Array.isArray(classesRemove)
            ? classesRemove
            : classesRemove.split(' ').filter(c => c);
        classes = classes.filter(c => !removeClasses.includes(c));
    }

    // Затем добавляем классы
    if (classesAdd) {
        const addClasses = Array.isArray(classesAdd)
            ? classesAdd
            : classesAdd.split(' ').filter(c => c);
        classes.push(...addClasses);
    }

    // Удаляем дубликаты и пустые значения
    return [...new Set(classes.filter(c => c))];
}

/**
 * Преобразует результат processClasses в строку for использования в :class
 * @param {Array} baseClasses - базовые классы компонента
 * @param {String|Array} classesAdd - классы for добавления (optional)
 * @param {String|Array} classesRemove - классы for удаления (optional)
 * @returns {String} - итоговая строка классов space-separated
 */
function processClassesToString(baseClasses, classesAdd, classesRemove) {
    return processClasses(baseClasses, classesAdd, classesRemove).join(' ');
}

// Экспорт через window for использования в компонентах
window.classManager = {
    processClasses,
    processClassesToString
};

