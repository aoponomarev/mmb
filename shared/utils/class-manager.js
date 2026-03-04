/**
 * #JS-492QR3zK
 * @description Utility for managing CSS classes (add/remove, strings or arrays, no duplicates); use in computed for classesAdd/classesRemove.
 * @see id:sk-318305
 */

/**
 * Merge classes: add classesAdd, remove classesRemove
 * @param {Array} baseClasses - base classes
 * @param {String|Array} classesAdd - classes to add (optional)
 * @param {String|Array} classesRemove - classes to remove (optional)
 * @returns {Array} - final class array without duplicates
 */
function processClasses(baseClasses, classesAdd, classesRemove) {
    // Start with base classes
    let classes = Array.isArray(baseClasses) ? [...baseClasses] : [baseClasses].filter(c => c);

    // Remove first, then add
    if (classesRemove) {
        const removeClasses = Array.isArray(classesRemove)
            ? classesRemove
            : classesRemove.split(' ').filter(c => c);
        classes = classes.filter(c => !removeClasses.includes(c));
    }

    // Then add
    if (classesAdd) {
        const addClasses = Array.isArray(classesAdd)
            ? classesAdd
            : classesAdd.split(' ').filter(c => c);
        classes.push(...addClasses);
    }

    // Remove duplicates and empty values
    return [...new Set(classes.filter(c => c))];
}

/**
 * Convert processClasses result to string for :class
 * @param {Array} baseClasses - base classes
 * @param {String|Array} classesAdd - classes to add (optional)
 * @param {String|Array} classesRemove - classes to remove (optional)
 * @returns {String} - space-separated class string
 */
function processClassesToString(baseClasses, classesAdd, classesRemove) {
    return processClasses(baseClasses, classesAdd, classesRemove).join(' ');
}

// Export on window for use in components
window.classManager = {
    processClasses,
    processClassesToString
};

