// =========================
// Переиспользуемая фича for переключения видимости колонок в зависимости от активной вкладки
// Переиспользуемая фича for переключения видимости колонок в зависимости от активной вкладки
// =========================

window.columnVisibilityMixin = {
  computed: {
    /**
     * CSS-классы for managing видимостью колонок через colgroup
     * Возвращает объект, где ключ - класс колонки, значение - 'col-hidden' или ''
     * Поддерживает префиксное совпадение: 'col-percent' скрывает все 'col-percent-*'
     */
    columnVisibilityClasses() {
      if (!this.columnVisibilityConfig || !this.activeTabId) {
        // Если нет конфигурации или активной вкладки - все колонки видимы
        return {};
      }

      const config = this.columnVisibilityConfig[this.activeTabId];
      if (!config || !config.hide) {
        // Если for текущей вкладки нет конфигурации - все колонки видимы
        return {};
      }

      const result = {};
      const hideColumns = config.hide || [];

      // Получаем все классы колонок
      let allColumnClasses = [];
      if (this.getColumnClasses && typeof this.getColumnClasses === 'function') {
        allColumnClasses = this.getColumnClasses();
      } else {
        // Собираем все уникальные классы колонок из конфигурации
        const classSet = new Set();
        Object.values(this.columnVisibilityConfig).forEach(tabConfig => {
          if (tabConfig.hide) {
            tabConfig.hide.forEach(colClass => classSet.add(colClass));
          }
        });
        allColumnClasses = Array.from(classSet);
      }

      // Для каждой колонки определяем, должна ли она быть скрыта
      allColumnClasses.forEach(colClass => {
        // Проверяем, нужно ли скрыть эту колонку на текущей вкладке
        // Поддерживаем как точное совпадение, так и префиксное (например, 'col-percent' скрывает все 'col-percent-*')
        const shouldHide = hideColumns.some(hideClass => {
          if (hideClass === colClass) {
            return true; // Точное совпадение
          }
          // Префиксное совпадение: если hideClass = 'col-percent', то скрываем 'col-percent-1h', 'col-percent-24h' и т.д.
          if (colClass.startsWith(hideClass + '-')) {
            return true;
          }
          return false;
        });

        result[colClass] = shouldHide ? 'col-hidden' : '';
      });

      return result;
    }
  }
};

console.log('✅ Column Visibility Mixin loaded');
