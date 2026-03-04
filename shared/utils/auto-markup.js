/**
 * AUTO-MARKUP - Auto-markup of DOM elements with avto-{hash} for DevTools/navigation. Skill: id:sk-318305
 * MutationObserver + deterministic Base58 hash from element path. Mark: main, section, header, footer, .container, .card*, data-markup. Skip: inside Vue, .row/.col-*, data-no-markup, elements with ID, script/style. Usage: auto on load; window.autoMarkup.markupContainer(el); stopObserver(). Ref: id:sk-483943
 */

window.autoMarkup = {
  observer: null,
  isInitialized: false,

  // Rules for which elements to markup
  shouldMarkup(element) {
    // Exclusions
    if (element.hasAttribute('data-no-markup')) return false;
    if (element.classList.contains('row') || element.classList.contains('col-')) return false;
    if (element.tagName === 'SCRIPT' || element.tagName === 'STYLE') return false;
    if (element.tagName === 'NOSCRIPT') return false;

    // Already has hash
    if (Array.from(element.classList).some(cls => cls.startsWith('avto-'))) return false;

    // Has ID (JS-bound)
    if (element.id) return false;

    // Skip inside Vue components
    if (element.__vue__) return false;
    if (element.closest('[data-v-]')) return false;

    // Check if inside Vue component
    let parent = element.parentElement;
    while (parent && parent !== document.body) {
      if (parent.__vue__ || parent.hasAttribute('data-v-')) {
        return false;
      }
      parent = parent.parentElement;
    }

    // Significant containers: markup
    const significantTags = ['MAIN', 'SECTION', 'ARTICLE', 'ASIDE', 'HEADER', 'FOOTER', 'NAV'];
    if (significantTags.includes(element.tagName)) return true;

    // Headings (h1-h6)
    if (/^H[1-6]$/.test(element.tagName)) return true;

    // Containers with specific classes
    if (element.classList.contains('container') ||
        element.classList.contains('container-fluid') ||
        element.classList.contains('card') ||
        element.classList.contains('card-body') ||
        element.classList.contains('card-header') ||
        element.classList.contains('card-footer')) return true;

    // Elements with data-markup
    if (element.hasAttribute('data-markup')) return true;

    return false;
  },

  // Generate element id from DOM path
  generateElementId(element) {
    const path = [];
    let current = element;
    let depth = 0;
    const maxDepth = 10; // Depth limit

    while (current && depth < maxDepth && current !== document.body) {
      const tag = current.tagName.toLowerCase();
      const index = Array.from(current.parentElement?.children || []).indexOf(current);
      const classes = Array.from(current.classList)
        .filter(c => !c.startsWith('avto-'))
        .slice(0, 3) // Limit classes for stability
        .join('.');
      const id = current.id ? `#${current.id}` : '';

      path.unshift(`${tag}[${index}]${classes ? '.' + classes : ''}${id}`);
      current = current.parentElement;
      depth++;
    }

    return path.join(' > ') || 'root';
  },

  // Markup single element
  markupElement(element) {
    if (!this.shouldMarkup(element)) return false;

    if (!window.hashGenerator) {
      console.warn('hashGenerator not found, skipping markup');
      return false;
    }

    const elementId = this.generateElementId(element);
    const hash = window.hashGenerator.generateMarkupClass(elementId);
    element.classList.add(hash);

    return true;
  },

  // Markup entire DOM tree (recursive)
  markupTree(root = document.body) {
    if (!root) return;

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          // Skip inside Vue components
          if (node.__vue__ || node.closest('[data-v-]')) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const elements = [];
    let node;
    while (node = walker.nextNode()) {
      if (this.shouldMarkup(node)) {
        elements.push(node);
      }
    }

    elements.forEach(el => this.markupElement(el));

    return elements.length;
  },

  // Markup specific container (for manual call)
  markupContainer(container) {
    if (!container || !container.nodeType) {
      console.warn('autoMarkup.markupContainer: invalid container');
      return 0;
    }

    return this.markupTree(container);
  },

  // Init observer for auto-markup of new elements
  initObserver() {
    if (this.observer) return; // Already initialized

    this.observer = new MutationObserver((mutations) => {
      // Batch: collect new elements
      const newElements = new Set();

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            // Check element itself
            if (this.shouldMarkup(node)) {
              newElements.add(node);
            }

            // Check children (first level only for perf)
            if (node.querySelectorAll) {
              node.querySelectorAll('*').forEach(child => {
                if (this.shouldMarkup(child)) {
                  newElements.add(child);
                }
              });
            }
          }
        });
      });

      // Markup new elements in one batch via requestAnimationFrame
      if (newElements.size > 0) {
        requestAnimationFrame(() => {
          newElements.forEach(el => this.markupElement(el));
        });
      }
    });

    // Observe body changes
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  },

  // Stop observing
  stopObserver() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  },

  // Init (once on load)
  init() {
    if (this.isInitialized) {
      console.warn('autoMarkup already initialized');
      return;
    }

    if (!window.hashGenerator) {
      console.warn('hashGenerator not found, autoMarkup will not work');
      return;
    }

    // Initial markup of existing elements
    this.markupTree(document.body);

    // Start observer for future changes
    this.initObserver();

    this.isInitialized = true;
  },

  // Deinit (for testing)
  destroy() {
    this.stopObserver();
    this.isInitialized = false;
  }
};

