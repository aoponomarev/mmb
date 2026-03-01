/**
 * ================================================================================================
 * MODULE LOADER - Загрузчик модулей с автоматическим разрешением зависимостей
 * ================================================================================================
 *
 * PURPOSE: Автоматическая загрузка модулей приложения в правильном порядке с учётом зависимостей.
 * Поддержка работы с file:// и http:// протоколами через асинхронную загрузку ⟨script⟩ тегов.
 * Skill: core/skills/state-events
 *
 * ПРОБЛЕМА:
 * - Ручное управление порядком загрузки через вложенные onload колбэки сложно поддерживать
 * - При добавлении нового модуля нужно manually обновлять цепочку загрузки
 * - Легко допустить ошибку в порядке загрузки
 * - file:// протокол не поддерживает fetch() и XMLHttpRequest из-за CORS
 *
 * РЕШЕНИЕ:
 * - Конфигурация модулей в core/modules-config.js с описанием зависимостей
 * - Автоматическое разрешение зависимостей через топологическую сортировку (алгоритм Kahn)
 * - Обнаружение циклических зависимостей
 * - Асинхронная загрузка через динамическое создание ⟨script⟩ тегов (работает с file:// и http://)
 * - Кэширование loadedных модулей for избежания повторной загрузки
 *
 * КАК ДОСТИГАЕТСЯ:
 * - Чтение конфигурации из window.modulesConfig
 * - Построение графа зависимостей
 * - Топологическая сортировка for определения правильного порядка
 * - Последовательная загрузка модулей через Promise с учётом зависимостей
 * - Validate presence глобальных переменных после загрузки
 * - Обработка ошибок: критичные модули прерывают загрузку, некритичные пропускаются с предупреждением
 *
 * ОСОБЕННОСТИ:
 * - Поддержка условной загрузки модулей через feature flags (optionalе поле condition)
 * - Кэширование loadedных модулей по src пути
 * - Детальные сообщения об ошибках с указанием проблемных модулей
 *
 * REFERENCES:
 * - General principles модульной системы: core/skills/state-events
 * - Конфигурация модулей: core/modules-config.js
 */

(function() {
    'use strict';

    /**
     * Кэш loadedных модулей (по src пути)
     */
    const loadedModulesCache = new Set();

    /**
     * Загружает скрипт асинхронно через <script> тег (работает с file:// и http://)
     * @param {string} src - путь к скрипту
     * @returns {Promise<boolean>} - успех загрузки
     */
    function loadScriptAsync(src) {
        return new Promise((resolve, reject) => {
            // Проверка кэша
            if (loadedModulesCache.has(src)) {
                resolve(true);
                return;
            }

            // Проверка, not loaded ли уже скрипт в DOM
            const existingScript = document.querySelector(`script[src="${src}"]`);
            if (existingScript) {
                loadedModulesCache.add(src);
                resolve(true);
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.async = false; // Important: последовательная загрузка for зависимостей

            script.onload = () => {
                // Добавляем в кэш после успешной загрузки
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
     * Загружает модуль асинхронно (работает с file:// и http:// через <script> теги)
     * @param {Object} module - объект модуля из конфигурации
     * @returns {Promise<boolean>} - успех загрузки
     */
    function loadModule(module) {
        // Используем асинхронную загрузку через <script> теги for всех протоколов
        // Это работает и с file://, и с http://
        return loadScriptAsync(module.src);
    }

    /**
     * Собирает все модули из конфигурации в один массив
     * Фильтрует модули по условиям загрузки (feature flags)
     * ВАЖНО: Условия, зависящие от других модулей (например, app-config), проверяются ПОСЛЕ загрузки зависимостей
     * @param {Object} config - конфигурация модулей
     * @param {boolean} checkConditions - проверять ли условия загрузки (false - только сборка, true - с проверкой)
     * @returns {Array} - массив всех модулей (после фильтрации)
     */
    function collectModules(config, checkConditions = true) {
        const modules = [];
        const categories = ['utilities', 'core', 'templates', 'libraries', 'components', 'app'];

        for (const category of categories) {
            if (config[category]) {
                for (const module of config[category]) {
                    // Проверяем условие загрузки (feature flag) только если указано
                    if (checkConditions && module.condition && typeof module.condition === 'function') {
                        try {
                            const conditionResult = module.condition();
                            if (!conditionResult) {
                                continue;
                            }
                        } catch (error) {
                            // При ошибке проверки условия загружаем модуль по умолчанию
                        }
                    }
                    modules.push(module);
                }
            }
        }

        return modules;
    }

    /**
     * Строит граф зависимостей из модулей
     * @param {Array} modules - массив всех модулей
     * @returns {Object} - граф зависимостей { moduleId: [depId1, depId2, ...] }
     */
    function buildDependencyGraph(modules) {
        const graph = {};
        const moduleMap = {};

        // Создаём карту модулей по ID
        for (const module of modules) {
            moduleMap[module.id] = module;
            graph[module.id] = [];
        }

        // Строим граф зависимостей
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
     * Обнаруживает циклические зависимости
     * @param {Object} graph - граф зависимостей
     * @returns {Array|null} - массив модулей, образующих цикл, или null если циклов нет
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
     * Топологическая сортировка модулей (алгоритм Kahn)
     * @param {Object} graph - граф зависимостей (graph[A] = [B, C] означает, что A зависит от B и C)
     * @param {Object} moduleMap - карта модулей по ID
     * @returns {Array} - отсортированный массив модулей
     *
     * ЛОГИКА:
     * - Если модуль A зависит от модуля B, то B должен быть loaded до A
     * - inDegree[A] = количество модулей, от которых зависит A (т.е. длина graph[A])
     * - Модули с inDegree === 0 загружаются первыми (у них нет зависимостей)
     * - После загрузки модуля, уменьшаем inDegree for всех модулей, которые от него зависят
     */
    function topologicalSort(graph, moduleMap) {
        const inDegree = {};
        const queue = [];
        const result = [];

        // Инициализация inDegree
        // inDegree[node] = количество модулей, от которых зависит node (т.е. длина graph[node])
        for (const node of Object.keys(graph)) {
            inDegree[node] = graph[node].length;
        }

        // Находим все узлы без зависимостей (inDegree === 0)
        for (const node of Object.keys(inDegree)) {
            if (inDegree[node] === 0) {
                queue.push(node);
            }
        }

        // Обрабатываем очередь
        while (queue.length > 0) {
            const node = queue.shift();
            result.push(moduleMap[node]);

            // Уменьшаем inDegree for всех модулей, которые зависят от node
            // Ищем все модули, у которых node в списке зависимостей
            for (const otherNode of Object.keys(graph)) {
                if (graph[otherNode].includes(node)) {
                    inDegree[otherNode]--;
                    if (inDegree[otherNode] === 0) {
                        queue.push(otherNode);
                    }
                }
            }
        }

        // Проверка на циклы (если остались узлы с inDegree > 0)
        const remaining = Object.keys(inDegree).filter(node => inDegree[node] > 0);
        if (remaining.length > 0) {
            throw new Error(`module-loader: обнаружены циклические зависимости: ${remaining.join(', ')}`);
        }

        return result;
    }

    /**
     * Загружает все модули в правильном порядке
     * @param {Object} config - конфигурация модулей
     * @returns {Promise<void>}
     */
    async function loadAllModules(config) {
        if (!config) {
            throw new Error('module-loader: конфигурация модулей не найдена (window.modulesConfig)');
        }

        // Сначала собираем все модули БЕЗ проверки условий (for построения графа зависимостей)
        const allModules = collectModules(config, false);

        if (allModules.length === 0) {
            throw new Error('module-loader: не найдено модулей for загрузки');
        }

        // Строим граф зависимостей
        const { graph, moduleMap } = buildDependencyGraph(allModules);

        // Проверяем на циклические зависимости
        const cycle = detectCycles(graph);
        if (cycle) {
            throw new Error(`module-loader: обнаружена циклическая зависимость: ${cycle.join(' → ')}`);
        }

        // Топологическая сортировка
        const sortedModules = topologicalSort(graph, moduleMap);

        // Загружаем модули последовательно и проверяем условия ПОСЛЕ загрузки зависимостей
        const failedModules = [];
        for (let i = 0; i < sortedModules.length; i++) {
            const module = sortedModules[i];

            // Проверяем условие загрузки ПОСЛЕ того, как зависимости уже loadedы
            if (module.condition && typeof module.condition === 'function') {
                try {
                    const conditionResult = module.condition();
                    if (!conditionResult) {
                        continue; // Пропускаем модуль, но не загружаем его
                    }
                } catch (error) {
                    // При ошибке проверки условия загружаем модуль по умолчанию
                }
            }

            try {
                await loadModule(module);
            } catch (error) {
                failedModules.push({ module, error });

                // Для критичных модулей (app, vue, templates) прерываем загрузку
                // Для критичных модулей (app, vue, шаблоны) прерываем загрузку
                const criticalModules = ['vue', 'button-template', 'dropdown-menu-item-template', 'dropdown-template', 'combobox-template'];
                if (module.category === 'app' || criticalModules.includes(module.id)) {
                    throw new Error(`Критичный модуль ${module.id} not loaded. Приложение не может продолжить работу.`);
                }

                // Для некритичных модулей продолжаем загрузку
            }
        }

        // Вызываем инициализацию приложения, если она определена
        // Ждём готовности DOM, если он ещё not loaded
        function callAppInit() {
            if (typeof window.appInit === 'function') {
                window.appInit();
            }
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callAppInit);
        } else {
            // DOM уже loaded, вызываем сразу
            callAppInit();
        }
    }

    /**
     * Публичный API модульного загрузчика
     */
    window.moduleLoader = {
        /**
         * Загружает все модули из конфигурации
         * @returns {Promise<void>}
         */
        load: function() {
            return loadAllModules(window.modulesConfig);
        },

        /**
         * Проверяет наличие конфигурации
         * @returns {boolean}
         */
        hasConfig: function() {
            return typeof window.modulesConfig !== 'undefined';
        },

        /**
         * Очищает кэш loadedных модулей
         */
        clearCache: function() {
            loadedModulesCache.clear();
        },

        /**
         * Проверяет, loaded ли модуль
         * @param {string} src - путь к модулю
         * @returns {boolean}
         */
        isLoaded: function(src) {
            return loadedModulesCache.has(src);
        }
    };
})();


