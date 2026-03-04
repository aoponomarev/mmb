/**
 * LAYOUT SYNC - Sync header/footer height with body padding to avoid content overlap. Skill: id:sk-318305
 * ResizeObserver + MutationObserver; CSS vars --header-height, --footer-height. Usage: auto on load; layoutSync.update(); stop(); start(). Ref: id:sk-483943
 */

(function() {
    'use strict';

    let headerObserver = null;
    let footerObserver = null;
    let headerResizeObserver = null;
    let footerResizeObserver = null;
    let resizeHandler = null;
    let isActive = false;

    /** Update body padding from header/footer height */
    function updateBodyPadding() {
        const header = document.querySelector('header');
        const footer = document.querySelector('footer');
        const body = document.body;

        if (!body) return;

        let headerHeight = 0;
        let footerHeight = 0;

        // Get header height
        if (header) {
            headerHeight = header.offsetHeight;
        }

        // Get footer height
        if (footer) {
            footerHeight = footer.offsetHeight;
        }

        // Set CSS vars
        body.style.setProperty('--header-height', `${headerHeight}px`);
        body.style.setProperty('--footer-height', `${footerHeight}px`);

        // Set padding
        body.style.paddingTop = `${headerHeight}px`;
        body.style.paddingBottom = `${footerHeight}px`;
    }

    /** Start observing header and footer */
    function start() {
        if (isActive) {
            return; // Already started
        }

        const header = document.querySelector('header');
        const footer = document.querySelector('footer');

        if (!header && !footer) {
            console.warn('layout-sync: header and footer not found, sync not started');
            return;
        }

        isActive = true;

        // Add resize handler if not yet added
        if (!resizeHandler) {
            resizeHandler = update;
            window.addEventListener('resize', resizeHandler);
        }

        // Observe header
        if (header) {
            // ResizeObserver for size changes
            if (window.ResizeObserver) {
                headerResizeObserver = new ResizeObserver(() => {
                    updateBodyPadding();
                });
                headerResizeObserver.observe(header);
            }

            // MutationObserver for attribute changes
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

        // Observe footer
        if (footer) {
            // ResizeObserver for size changes
            if (window.ResizeObserver) {
                footerResizeObserver = new ResizeObserver(() => {
                    updateBodyPadding();
                });
                footerResizeObserver.observe(footer);
            }

            // MutationObserver for attribute changes
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

        // Initial update
        updateBodyPadding();
    }

    /**
     * Stop observing header and footer
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

        // Remove resize handler
        if (resizeHandler) {
            window.removeEventListener('resize', resizeHandler);
            resizeHandler = null;
        }

        isActive = false;
    }

    /**
     * Manual padding update (no observer restart)
     */
    function update() {
        updateBodyPadding();
    }

    // Export API
    window.layoutSync = {
        start,
        stop,
        update,
        isActive: () => isActive
    };

    /**
     * Check header/footer and start observing
     */
    function tryStart() {
        const header = document.querySelector('header');
        const footer = document.querySelector('footer');

        if (header || footer) {
            start();
        } else if (!isActive) {
            // If elements not yet in DOM, wait via MutationObserver
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

    // Auto-init on DOM load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryStart);
    } else {
        // DOM already loaded
        tryStart();
    }

    // Resize handler added in start() on first run to avoid adding before observer init
})();

