---
name: bootstrap-nested-dropdown
description: >
  Handles nested Bootstrap dropdowns (menu inside menu) so inner dropdowns
  don't close their parents. Use when a dropdown trigger and its menu live
  inside another dropdown (e.g. action menu on a badge inside a list item).
---

# Bootstrap Nested Dropdowns

## Purpose

This skill describes a robust pattern for handling **nested Bootstrap dropdowns** in Vue/JS:

- Родительский `cmp-dropdown` управляет своим состоянием (`isOpen`) и не должен реагировать
  на события от вложенных dropdown’ов.
- Внутренние dropdown’ы (например, меню над бейджем в списке портфелей) должны:
  - открываться/закрываться независимо от родительского,
  - по `mouseleave` закрывать **только себя**, не сворачивая родительский список.

## When to Use

Применяй этот паттерн, когда:

- внутри dropdown‑меню нужно повесить ещё один dropdown (меню действий),
- при закрытии вложенного dropdown’а Bootstrap закрывает и родительский,
- родительский компонент держит локальное состояние `isOpen` и слушает `show.bs.dropdown` / `hide.bs.dropdown`.

## Core Pattern

### 1. Фильтрация Bootstrap‑событий по «своему» toggle

В компоненте-обёртке над Bootstrap Dropdown (аналог `shared/components/dropdown.js`):

```javascript
mounted() {
  this.$nextTick(() => {
    if (!window.bootstrap?.Dropdown || !this.$refs.dropdownContainer) return;

    let toggleElement = null;
    if (this.$refs.dropdownButton) {
      toggleElement = this.$refs.dropdownButton.$el;
    } else {
      toggleElement = this.$refs.dropdownContainer.querySelector('[data-bs-toggle="dropdown"]');
    }
    if (!toggleElement) return;

    this.__ownToggleElement = toggleElement;
    this.dropdownInstance = new window.bootstrap.Dropdown(toggleElement, dropdownOptions);

    this.$refs.dropdownContainer.addEventListener('show.bs.dropdown', (e) => {
      if (e?.target !== this.__ownToggleElement) return; // ignore nested dropdowns
      this.isOpen = true;
      this.$emit('show');
    });

    this.$refs.dropdownContainer.addEventListener('hide.bs.dropdown', (e) => {
      if (e?.target !== this.__ownToggleElement) return; // ignore nested dropdowns
      this.isOpen = false;
      this.$emit('hide');
    });

    this.$refs.dropdownContainer.addEventListener('hidden.bs.dropdown', (e) => {
      if (e?.target !== this.__ownToggleElement) return; // ignore nested dropdowns
      if (this.searchable) this.searchQuery = '';
    });
  });
}
```

**Ключевая идея:** всегда хранить ссылку на **свой** toggle (`__ownToggleElement`) и
игнорировать все `show.bs.dropdown` / `hide.bs.dropdown`, у которых `e.target` — не он.
Так всплывающие события от вложенных dropdown’ов не трогают состояние родительского.

### 2. Автозакрытие вложенного меню по `mouseleave`

Когда у элемента внутри меню (например, бейджа) есть своё dropdown‑меню и его нужно
закрывать, как только мышь покидает область, используй следующий приём:

Разметка:

```html
<div class="dropdown" @mouseleave="hideBadgeDropdownOnMouseLeave">
  <span
    class="badge bg-success"
    role="button"
    tabindex="0"
    data-bs-toggle="dropdown"
    data-role="badge-dropdown-toggle"
    aria-expanded="false"
    @click.stop.prevent
  >
    {{ plValue }}%
  </span>
  <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end shadow-lg border-secondary">
    <!-- пункты меню -->
  </ul>
</div>
```

Логика:

```javascript
methods: {
  hideBadgeDropdownOnMouseLeave(event) {
    const root = event?.currentTarget;
    const toggle = root?.querySelector?.('[data-role="badge-dropdown-toggle"]');
    if (!toggle || !window.bootstrap?.Dropdown) return;
    try {
      const instance = window.bootstrap.Dropdown.getInstance(toggle);
      if (instance) instance.hide(); // закрываем только этот маленький dropdown
    } catch (_) {
      // best-effort, без падения UI
    }
  }
}
```

Замечания:

- Используем `getInstance`, а не `getOrCreateInstance`, чтобы не создавать лишних
  инстансов и не влиять на другие dropdown’ы.
- Идентифицируем нужный toggle через дополнительный атрибут `data-role="badge-dropdown-toggle"`,
  чтобы случайно не выбрать что‑то ещё внутри контейнера.

## Examples

### Пример 1: Меню портфелей в шапке

- Родительский `cmp-dropdown` показывает список портфелей.
- В каждой строке есть бейдж доходности с собственным dropdown (Архив / Удалить / Сохранить).
- Проблема: при закрытии меню бейджа закрывается и родительский список.
- Решение:
  - в `cmp-dropdown` фильтруем события `show.bs.dropdown`/`hide.bs.dropdown` по `__ownToggleElement`;
  - в строке портфеля вешаем `@mouseleave="hideBadgeDropdownOnMouseLeave"` и закрываем только
    внутренний dropdown.

### Пример 2: Архив в модалке

- В модалке «Архив в облаке» строки показываются в таблице, справа у каждой — бейдж с dropdown
  (Сохранить / Вернуть / Удалить).
- Вся логика та же: контейнер таблицы не должен реагировать на `hide.bs.dropdown` от бейджа,
  а сам бейдж по `mouseleave` мягко закрывает своё меню.

## Checklist

Перед тем как считать задачу закрытой:

- [ ] Родительский dropdown остаётся открытым при закрытии вложенного меню.
- [ ] Вложенное меню закрывается по `mouseleave` ожидаемо, без рывков.
- [ ] Нет лишних глобальных слушателей `show.bs.dropdown` / `hide.bs.dropdown`; вся логика
      локализована в компоненте dropdown и контейнере бейджа.

