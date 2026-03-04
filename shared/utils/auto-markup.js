/**
 * ================================================================================================
 * AUTO-MARKUP - Утилита автоматической маркировки элементов DOM
 * ================================================================================================
 * Skill: id:sk-318305
 *
 * PURPOSE: Автоматическая маркировка всех значимых контейнеров в DOM через CSS классы avto-{hash}
 * for навигации в коде через DevTools и указания агенту места в разметке.
 *
 * ПРОБЛЕМА: Ручная маркировка контейнеров for навигации в коде требует постоянного внимания
 * и can be пропущена при добавлении новых элементов, особенно асинхронно загружаемых.
 *
 * РЕШЕНИЕ: Автоматическая маркировка через MutationObserver с детерминированными хэшами
 * на основе пути элемента в DOM.
 *
 * КАК ДОСТИГАЕТСЯ:
 * - MutationObserver отслеживает добавление новых элементов в DOM
 * - Правила shouldMarkup() определяют, какие элементы нужно маркировать
 * - Генерация детерминированного Base58 хэша на основе пути элемента (tagName, позиция, классы)
 * - Автоматическая инициализация после монтирования Vue приложения
 * - Поддержка ручного вызова for асинхронно загружаемых элементов
 *
 * ПРАВИЛА ПРИМЕНЕНИЯ:
 * - Маркируются: основные секции (main, section, article, aside, header, footer, nav),
 *   заголовки (h1-h6), корневые .container, .container-fluid, функциональные блоки
 *   (.card, .card-body, .card-header, .card-footer), элементы с атрибутом data-markup
 * - НЕ маркируются: элементы внутри Vue компонентов (у них уже есть instanceHash),
 *   мелкие обертки без функционального значения (.row, .col-*), элементы с data-no-markup,
 *   элементы с ID (JS-зависимые элементы), служебные элементы (script, style, noscript)
 *
 * ОСОБЕННОСТИ:
 * - Детерминированные хэши: один и тот же путь в DOM всегда дает один и тот же хэш
 * - Стабильность между сессиями for статичных элементов
 * - Исключение элементов внутри Vue компонентов for избежания конфликтов с instanceHash
 * - Поддержка асинхронной загрузки через MutationObserver
 *
 * USAGE:
 * - Автоматически маркирует элементы при загрузке и при добавлении новых элементов
 * - Ручной вызов: window.autoMarkup.markupContainer(element)
 * - Отключение: window.autoMarkup.stopObserver()
 *
 * REFERENCES:
 * - General principles маркировки: id:sk-483943
 * - Детерминированные хэши компонентов: id:sk-483943
 */

window.autoMarkup = {
  observer: null,
  isInitialized: false,

  // Правила for определения значимых контейнеров
  shouldMarkup(element) {
    // Исключения: не маркируем
    if (element.hasAttribute('data-no-markup')) return false;
    if (element.classList.contains('row') || element.classList.contains('col-')) return false;
    if (element.tagName === 'SCRIPT' || element.tagName === 'STYLE') return false;
    if (element.tagName === 'NOSCRIPT') return false;

    // Уже имеет хэш
    if (Array.from(element.classList).some(cls => cls.startsWith('avto-'))) return false;

    // Уже имеет ID (JS-зависимый элемент)
    if (element.id) return false;

    // Пропускаем элементы внутри Vue компонентов
    if (element.__vue__) return false;
    if (element.closest('[data-v-]')) return false;

    // Проверяем, не находится ли элемент внутри Vue компонента
    let parent = element.parentElement;
    while (parent && parent !== document.body) {
      if (parent.__vue__ || parent.hasAttribute('data-v-')) {
        return false;
      }
      parent = parent.parentElement;
    }

    // Значимые контейнеры: маркируем
    const significantTags = ['MAIN', 'SECTION', 'ARTICLE', 'ASIDE', 'HEADER', 'FOOTER', 'NAV'];
    if (significantTags.includes(element.tagName)) return true;

    // Заголовки (h1-h6) - значимые элементы структуры документа
    if (/^H[1-6]$/.test(element.tagName)) return true;

    // Контейнеры с определенными классами
    if (element.classList.contains('container') ||
        element.classList.contains('container-fluid') ||
        element.classList.contains('card') ||
        element.classList.contains('card-body') ||
        element.classList.contains('card-header') ||
        element.classList.contains('card-footer')) return true;

    // Элементы с определенными data-атрибутами
    if (element.hasAttribute('data-markup')) return true;

    return false;
  },

  // Генерация уникального идентификатора for элемента на основе пути в DOM
  generateElementId(element) {
    const path = [];
    let current = element;
    let depth = 0;
    const maxDepth = 10; // Ограничение глубины

    while (current && depth < maxDepth && current !== document.body) {
      const tag = current.tagName.toLowerCase();
      const index = Array.from(current.parentElement?.children || []).indexOf(current);
      const classes = Array.from(current.classList)
        .filter(c => !c.startsWith('avto-'))
        .slice(0, 3) // Ограничиваем количество классов for стабильности
        .join('.');
      const id = current.id ? `#${current.id}` : '';

      path.unshift(`${tag}[${index}]${classes ? '.' + classes : ''}${id}`);
      current = current.parentElement;
      depth++;
    }

    return path.join(' > ') || 'root';
  },

  // Маркировка одного элемента
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

  // Маркировка всего DOM дерева (рекурсивно)
  markupTree(root = document.body) {
    if (!root) return;

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          // Пропускаем элементы внутри Vue компонентов
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

  // Маркировка конкретного контейнера (for ручного вызова)
  markupContainer(container) {
    if (!container || !container.nodeType) {
      console.warn('autoMarkup.markupContainer: invalid container');
      return 0;
    }

    return this.markupTree(container);
  },

  // Инициализация наблюдателя for автоматической маркировки новых элементов
  initObserver() {
    if (this.observer) return; // Уже initialized

    this.observer = new MutationObserver((mutations) => {
      // Батчинг: собираем все новые элементы
      const newElements = new Set();

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            // Проверяем сам элемент
            if (this.shouldMarkup(node)) {
              newElements.add(node);
            }

            // Проверяем дочерние элементы (только первый уровень for производительности)
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

      // Маркируем все новые элементы одним батчем через requestAnimationFrame
      if (newElements.size > 0) {
        requestAnimationFrame(() => {
          newElements.forEach(el => this.markupElement(el));
        });
      }
    });

    // Наблюдаем за изменениями в body
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  },

  // Остановка наблюдения
  stopObserver() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  },

  // Инициализация (вызывается один раз при загрузке)
  init() {
    if (this.isInitialized) {
      console.warn('autoMarkup already initialized');
      return;
    }

    if (!window.hashGenerator) {
      console.warn('hashGenerator not found, autoMarkup will not work');
      return;
    }

    // Первичная маркировка существующих элементов
    this.markupTree(document.body);

    // Запуск наблюдателя for будущих изменений
    this.initObserver();

    this.isInitialized = true;
  },

  // Деинициализация (for тестирования)
  destroy() {
    this.stopObserver();
    this.isInitialized = false;
  }
};

