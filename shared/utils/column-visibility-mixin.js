/**
 * Column Visibility Mixin - CSS-driven column toggling without DOM re-render.
 * @skill-anchor id:sk-318305
 */
window.columnVisibilityMixin = {
  computed: {
    /**
     * CSS classes for column visibility via colgroup. Key = column class, value = 'col-hidden' or ''. Prefix match: 'col-percent' hides 'col-percent-*'.
     */
    columnVisibilityClasses() {
      if (!this.columnVisibilityConfig || !this.activeTabId) {
        // No config or active tab -> all columns visible
        return {};
      }

      const config = this.columnVisibilityConfig[this.activeTabId];
      if (!config || !config.hide) {
        // No config for current tab -> all columns visible
        return {};
      }

      const result = {};
      const hideColumns = config.hide || [];

      // Get all column classes
      let allColumnClasses = [];
      if (this.getColumnClasses && typeof this.getColumnClasses === 'function') {
        allColumnClasses = this.getColumnClasses();
      } else {
        // Collect all unique column classes from config
        const classSet = new Set();
        Object.values(this.columnVisibilityConfig).forEach(tabConfig => {
          if (tabConfig.hide) {
            tabConfig.hide.forEach(colClass => classSet.add(colClass));
          }
        });
        allColumnClasses = Array.from(classSet);
      }

      // For each column determine if it should be hidden
      allColumnClasses.forEach(colClass => {
        // Check if this column should be hidden on current tab (exact or prefix match)
        const shouldHide = hideColumns.some(hideClass => {
          if (hideClass === colClass) {
            return true; // Exact match
          }
          // Prefix match: e.g. 'col-percent' hides 'col-percent-1h', 'col-percent-24h'
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
