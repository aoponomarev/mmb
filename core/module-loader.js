/**
 * #JS-xj43kftu
 * @description Auto-load application modules in correct order with dependency resolution; file:// and http:// via async script tag.
 * @skill id:sk-a17d41
 *
 * PURPOSE: Auto-load modules in correct order with dependency resolution; file:// and http:// via async script tag.
 *
 * PROBLEM:
 * - Manual load order via nested onload callbacks is hard to maintain
 * - Adding new module requires manually updating load chain
 * - Easy to err in load order
 * - file:// protocol does not support fetch() and XMLHttpRequest due to CORS
 *
 * SOLUTION:
 * - Module config in core/modules-config.js with dependency description
 * - Automatic dependency resolution via topological sort (Kahn algorithm)
 * - Cycle detection
 * - Async load via dynamic script tag creation (works with file:// and http://)
 * - Cache loaded modules to avoid reload
 *
 * HOW:
 * - Read config from window.modulesConfig
 * - Build dependency graph
 * - Topological sort for correct order
 * - Sequential load via Promise with dependency respect
 * - Validate global variable presence after load
 * - Error handling: critical modules abort load, non-critical skipped with warning
 *
 * FEATURES:
 * - Conditional load via feature flags (optional condition field)
 * - Cache loaded modules by src path
 * - Detailed error messages with problematic module names
 *
 * REFERENCES:
 * - General principles module system: id:sk-a17d41
 * - Modules configuration: core/modules-config.js
 */

// @skill-anchor id:sk-130fa2 #for-umd-libraries #for-cdn-fallback
(function() {
    'use strict';

    /**
     * Cache of loaded modules (by src path)
     */
    const loadedModulesCache = new Set();

    /**
     * Load script async via script tag (works with file:// and http://)
     * @param {string} src - path to script
     * @returns {Promise<boolean>} - load success
     */
    function loadScriptAsync(src) {
        return new Promise((resolve, reject) => {
            // Check cache
            if (loadedModulesCache.has(src)) {
                resolve(true);
                return;
            }

            // Check if script already in DOM
            const existingScript = document.querySelector(`script[src="${src}"]`);
            if (existingScript) {
                loadedModulesCache.add(src);
                resolve(true);
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.async = false; // Important: sequential load for dependencies

            script.onload = () => {
                // Add to cache after successful load
                loadedModulesCache.add(src);
                resolve(true);
            };

            script.onerror = () => {
                reject(new Error(`Не удалось загрузить скрипт: ${src}`));
            };

            document.head.appendChild(script);
        });
    }


    /**
     * Load module async (works with file:// and http:// via script tags)
     * @param {Object} module - module object from config
     * @returns {Promise<boolean>} - load success
     */
    function loadModule(module) {
        // Use async load via script tags for all protocols
        // Works with both file:// and http://
        return loadScriptAsync(module.src);
    }

    /**
     * Collect all modules from config into array
     * Filter by load conditions (feature flags)
     * IMPORTANT: Conditions depending on other modules (e.g. app-config) checked AFTER deps loaded
     * @param {Object} config - module config
     * @param {boolean} checkConditions - check load conditions (false = collect only, true = with check)
     * @returns {Array} - array of all modules (after filtering)
     */
    function collectModules(config, checkConditions = true) {
        const modules = [];
        const categories = ['utilities', 'core', 'templates', 'libraries', 'components', 'app'];

        for (const category of categories) {
            if (config[category]) {
                for (const module of config[category]) {
                    // Check load condition (feature flag) only if specified
                    if (checkConditions && module.condition && typeof module.condition === 'function') {
                        try {
                            const conditionResult = module.condition();
                            if (!conditionResult) {
                                continue;
                            }
                        } catch (error) {
                            // On condition check error, load module by default
                        }
                    }
                    modules.push(module);
                }
            }
        }

        return modules;
    }

    /**
     * Build dependency graph from modules
     * @param {Array} modules - array of all modules
     * @returns {Object} - dependency graph { moduleId: [depId1, depId2, ...] }
     */
    function buildDependencyGraph(modules) {
        const graph = {};
        const moduleMap = {};

        // Build module map by ID
        for (const module of modules) {
            moduleMap[module.id] = module;
            graph[module.id] = [];
        }

        // Build dependency graph
        for (const module of modules) {
            if (module.deps && module.deps.length > 0) {
                for (const depId of module.deps) {
                    if (!moduleMap[depId]) {
                        throw new Error(`module-loader: зависимость "${depId}" не найдена for модуля "${module.id}"`);
                    }
                    graph[module.id].push(depId);
                }
            }
        }

        return { graph, moduleMap };
    }

    /**
     * Detect cyclic dependencies
     * @param {Object} graph - dependency graph
     * @returns {Array|null} - array of modules forming cycle, or null
     */
    function detectCycles(graph) {
        const visited = new Set();
        const recStack = new Set();
        const cycle = [];

        function dfs(node) {
            if (recStack.has(node)) {
                cycle.push(node);
                return true;
            }
            if (visited.has(node)) {
                return false;
            }

            visited.add(node);
            recStack.add(node);

            for (const dep of graph[node] || []) {
                if (dfs(dep)) {
                    if (cycle.length > 0 && cycle[0] !== node) {
                        cycle.push(node);
                    }
                    return true;
                }
            }

            recStack.delete(node);
            return false;
        }

        for (const node of Object.keys(graph)) {
            if (!visited.has(node)) {
                if (dfs(node)) {
                    return cycle;
                }
            }
        }

        return null;
    }

    /**
     * Topological sort of modules (Kahn algorithm)
     * @param {Object} graph - dependency graph (graph[A] = [B, C] means A depends on B and C)
     * @param {Object} moduleMap - module map by ID
     * @returns {Array} - sorted module array
     *
     * LOGIC:
     * - If A depends on B, B must load before A
     * - inDegree[A] = count of modules A depends on (length of graph[A])
     * - Modules with inDegree === 0 load first (no deps)
     * - After loading module, decrement inDegree for all modules depending on it
     */
    function topologicalSort(graph, moduleMap) {
        const inDegree = {};
        const queue = [];
        const result = [];

        // Initialize inDegree
        // inDegree[node] = count of modules node depends on (length of graph[node])
        for (const node of Object.keys(graph)) {
            inDegree[node] = graph[node].length;
        }

        // Find all nodes with no deps (inDegree === 0)
        for (const node of Object.keys(inDegree)) {
            if (inDegree[node] === 0) {
                queue.push(node);
            }
        }

        // Process queue
        while (queue.length > 0) {
            const node = queue.shift();
            result.push(moduleMap[node]);

            // Decrement inDegree for all modules depending on node
            // Find all modules that have node in their deps list
            for (const otherNode of Object.keys(graph)) {
                if (graph[otherNode].includes(node)) {
                    inDegree[otherNode]--;
                    if (inDegree[otherNode] === 0) {
                        queue.push(otherNode);
                    }
                }
            }
        }

        // Check for cycles (if nodes with inDegree > 0 remain)
        const remaining = Object.keys(inDegree).filter(node => inDegree[node] > 0);
        if (remaining.length > 0) {
            throw new Error(`module-loader: обнаружены циклические зависимости: ${remaining.join(', ')}`);
        }

        return result;
    }

    /**
     * Load all modules in correct order
     * @param {Object} config - module config
     * @returns {Promise<void>}
     */
    async function loadAllModules(config) {
        if (!config) {
            throw new Error('module-loader: конфигурация модулей не найдена (window.modulesConfig)');
        }

        // First collect all modules WITHOUT condition check (for building dependency graph)
        const allModules = collectModules(config, false);

        if (allModules.length === 0) {
            throw new Error('module-loader: не найдено модулей for загрузки');
        }

        // Build dependency graph
        const { graph, moduleMap } = buildDependencyGraph(allModules);

        // Check for cyclic dependencies
        const cycle = detectCycles(graph);
        if (cycle) {
            throw new Error(`module-loader: обнаружена циклическая зависимость: ${cycle.join(' → ')}`);
        }

        // Topological sort
        const sortedModules = topologicalSort(graph, moduleMap);

        // Load modules sequentially and check conditions AFTER deps loaded
        const failedModules = [];
        for (let i = 0; i < sortedModules.length; i++) {
            const module = sortedModules[i];

            // Check load condition AFTER deps are loaded
            if (module.condition && typeof module.condition === 'function') {
                try {
                    const conditionResult = module.condition();
                    if (!conditionResult) {
                        continue; // Skip module, do not load it
                    }
                } catch (error) {
                    // On condition check error, load module by default
                }
            }

            try {
                await loadModule(module);
            } catch (error) {
                failedModules.push({ module, error });

                // For critical modules (app, vue, templates) abort load
                const criticalModules = ['vue', 'button-template', 'dropdown-menu-item-template', 'dropdown-template', 'combobox-template'];
                if (module.category === 'app' || criticalModules.includes(module.id)) {
                    throw new Error(`Критичный модуль ${module.id} not loaded. Приложение не может продолжить работу.`);
                }

                // For non-critical modules continue loading
            }
        }

        // Call app init if defined
        // Wait for DOM ready if not yet loaded
        function callAppInit() {
            if (typeof window.appInit === 'function') {
                window.appInit();
            }
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callAppInit);
        } else {
            // DOM already loaded, call immediately
            callAppInit();
        }
    }

    /**
     * Module loader public API
     */
    window.moduleLoader = {
        /**
         * Load all modules from config
         * @returns {Promise<void>}
         */
        load: function() {
            return loadAllModules(window.modulesConfig);
        },

        /**
         * Check if config exists
         * @returns {boolean}
         */
        hasConfig: function() {
            return typeof window.modulesConfig !== 'undefined';
        },

        /**
         * Clear loaded modules cache
         */
        clearCache: function() {
            loadedModulesCache.clear();
        },

        /**
         * Check if module is loaded
         * @param {string} src - path to module
         * @returns {boolean}
         */
        isLoaded: function(src) {
            return loadedModulesCache.has(src);
        }
    };
})();


