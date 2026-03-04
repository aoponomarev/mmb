/**
 * ================================================================================================
 * LAYOUT SYNC - Утилита синхронизации высоты header и footer с padding body
 * ================================================================================================
 * Skill: id:sk-318305
 *
 * PURPOSE: Автоматическая синхронизация padding-top и padding-bottom body с высотой
 * фиксированных header и footer for предотвращения перекрытия контента.
 *
 * ПРОБЛЕМА: Фиксированные header (fixed-top) и footer (fixed-bottom) перекрывают контент,
 * если не зарезервировать for них место через padding body.
 *
 * РЕШЕНИЕ: Автоматическое отслеживание высоты header и footer через ResizeObserver
 * и MutationObserver с установкой соответствующих padding на body.
 *
 * КАК ДОСТИГАЕТСЯ:
 * - ResizeObserver отслеживает изменения размеров header и footer
 * - MutationObserver отслеживает изменения атрибутов (class, style)
 * - CSS переменные (--header-height, --footer-height) for нативного подхода
 * - Автоматическая инициализация при загрузке DOM
 * - Поддержка ручного обновления и остановки наблюдения
 *
 * ОСОБЕННОСТИ:
 * - Работает с фиксированными элементами (fixed-top, fixed-bottom)
 * - Автоматически обновляется при изменении размеров
 * - Использует CSS переменные for совместимости с CSS
 * - Поддержка множественных header/footer (берет первый найденный)
 *
 * USAGE:
 * - Автоматически инициализируется при загрузке DOM
 * - Ручное обновление: window.layoutSync.update()
 * - Остановка наблюдения: window.layoutSync.stop()
 * - Перезапуск: window.layoutSync.start()
 *
 * REFERENCES:
 * - General principles утилит: id:sk-483943
 */

(function() {
    'use strict';

    let headerObserver = null;
    let footerObserver = null;
    let headerResizeObserver = null;
    let footerResizeObserver = null;
    let resizeHandler = null;
    let isActive = false;

    /**
     * Обновляет padding body на основе высоты header и footer
     */
    function updateBodyPadding() {
        const header = document.querySelector('header');
        const footer = document.querySelector('footer');
        const body = document.body;

        if (!body) return;

        let headerHeight = 0;
        let footerHeight = 0;

        // Получаем высоту header
        if (header) {
            headerHeight = header.offsetHeight;
        }

        // Получаем высоту footer
        if (footer) {
            footerHeight = footer.offsetHeight;
        }

        // Устанавливаем CSS переменные
        body.style.setProperty('--header-height', `${headerHeight}px`);
        body.style.setProperty('--footer-height', `${footerHeight}px`);

        // Устанавливаем padding
        body.style.paddingTop = `${headerHeight}px`;
        body.style.paddingBottom = `${footerHeight}px`;
    }

    /**
     * Запускает наблюдение за header и footer
     */
    function start() {
        if (isActive) {
            return; // Уже запущено
        }

        const header = document.querySelector('header');
        const footer = document.querySelector('footer');

        if (!header && !footer) {
            console.warn('layout-sync: header и footer не найдены, синхронизация не запущена');
            return;
        }

        isActive = true;

        // Добавляем обработчик resize события (если еще не добавлен)
        if (!resizeHandler) {
            resizeHandler = update;
            window.addEventListener('resize', resizeHandler);
        }

        // Наблюдение за header
        if (header) {
            // ResizeObserver for отслеживания изменений размеров
            if (window.ResizeObserver) {
                headerResizeObserver = new ResizeObserver(() => {
                    updateBodyPadding();
                });
                headerResizeObserver.observe(header);
            }

            // MutationObserver for отслеживания изменений атрибутов
            headerObserver = new MutationObserver(() => {
                updateBodyPadding();
            });
            headerObserver.observe(header, {
                attributes: true,
                attributeFilter: ['class', 'style'],
                childList: true,
                subtree: true
            });
        }

        // Наблюдение за footer
        if (footer) {
            // ResizeObserver for отслеживания изменений размеров
            if (window.ResizeObserver) {
                footerResizeObserver = new ResizeObserver(() => {
                    updateBodyPadding();
                });
                footerResizeObserver.observe(footer);
            }

            // MutationObserver for отслеживания изменений атрибутов
            footerObserver = new MutationObserver(() => {
                updateBodyPadding();
            });
            footerObserver.observe(footer, {
                attributes: true,
                attributeFilter: ['class', 'style'],
                childList: true,
                subtree: true
            });
        }

        // Первоначальное обновление
        updateBodyPadding();
    }

    /**
     * Останавливает наблюдение за header и footer
     */
    function stop() {
        if (!isActive) {
            return; // Уже остановлено
        }

        if (headerObserver) {
            headerObserver.disconnect();
            headerObserver = null;
        }

        if (footerObserver) {
            footerObserver.disconnect();
            footerObserver = null;
        }

        if (headerResizeObserver) {
            headerResizeObserver.disconnect();
            headerResizeObserver = null;
        }

        if (footerResizeObserver) {
            footerResizeObserver.disconnect();
            footerResizeObserver = null;
        }

        // Удаляем обработчик resize события
        if (resizeHandler) {
            window.removeEventListener('resize', resizeHandler);
            resizeHandler = null;
        }

        isActive = false;
    }

    /**
     * Ручное обновление padding (без перезапуска наблюдения)
     */
    function update() {
        updateBodyPadding();
    }

    // Экспорт API
    window.layoutSync = {
        start,
        stop,
        update,
        isActive: () => isActive
    };

    /**
     * Проверяет наличие header и footer и запускает наблюдение
     */
    function tryStart() {
        const header = document.querySelector('header');
        const footer = document.querySelector('footer');

        if (header || footer) {
            start();
        } else if (!isActive) {
            // Если элементы еще не появились, ждем их появления через MutationObserver
            const bodyObserver = new MutationObserver(() => {
                const header = document.querySelector('header');
                const footer = document.querySelector('footer');
                if ((header || footer) && !isActive) {
                    start();
                    bodyObserver.disconnect();
                }
            });
            bodyObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }

    // Автоматическая инициализация при загрузке DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryStart);
    } else {
        // DOM уже loaded
        tryStart();
    }

    // Обработчик resize будет добавлен в start() при первом запуске
    // Это предотвращает добавление обработчика до инициализации наблюдения
})();

