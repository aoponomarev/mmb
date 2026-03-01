/**
 * ================================================================================================
 * CLASS MANAGER - Утилита для управления CSS классами в компонентах
 * ================================================================================================
 *
 * ЦЕЛЬ: Универсальная функция для обработки классов с поддержкой добавления и удаления.
 *
 * ПРИНЦИПЫ:
 * - Обрабатывает строки (классы через пробел) и массивы строк
 * - Фильтрует пустые значения
 * - Удаляет дубликаты
 * - Поддерживает добавление и удаление классов
 *
 * ИСПОЛЬЗОВАНИЕ:
 * - В computed свойствах компонентов для обработки classesAdd и classesRemove
 * - Применяется к разным элементам внутри компонента (root, button, menu, suffix и т.д.)
 *
 * ССЫЛКИ:
 * - Документация компонентов: a/skills/app/skills/components/components-class-manager.md
 */

/**
 * Обрабатывает классы: добавляет classesAdd и удаляет classesRemove
 * @param {Array} baseClasses - базовые классы компонента
 * @param {String|Array} classesAdd - классы для добавления (опционально)
 * @param {String|Array} classesRemove - классы для удаления (опционально)
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
 * Преобразует результат processClasses в строку для использования в :class
 * @param {Array} baseClasses - базовые классы компонента
 * @param {String|Array} classesAdd - классы для добавления (опционально)
 * @param {String|Array} classesRemove - классы для удаления (опционально)
 * @returns {String} - итоговая строка классов через пробел
 */
function processClassesToString(baseClasses, classesAdd, classesRemove) {
    return processClasses(baseClasses, classesAdd, classesRemove).join(' ');
}

// Экспорт через window для использования в компонентах
window.classManager = {
    processClasses,
    processClassesToString
};

