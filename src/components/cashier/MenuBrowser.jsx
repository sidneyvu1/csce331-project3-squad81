import React, { useMemo, useState } from 'react';

export default function MenuBrowser({ menuItems, loading, error, disabled, onSelectItem }) {
  const [selectedCategory, setSelectedCategory] = useState('');
  const categories = useMemo(
    () => [...new Set(menuItems.map((item) => item.category))],
    [menuItems]
  );
  const activeCategory = categories.includes(selectedCategory)
    ? selectedCategory
    : categories[0] || '';
  const visibleItems = menuItems.filter((item) => item.category === activeCategory);

  if (loading) {
    return (
      <section className="cashier-menu" aria-label="Menu">
        <MenuHeading />
        <p className="menu-message" role="status">Loading menu…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="cashier-menu" aria-label="Menu">
        <MenuHeading />
        <p className="menu-message menu-error" role="alert">{error}</p>
      </section>
    );
  }

  if (menuItems.length === 0) {
    return (
      <section className="cashier-menu" aria-label="Menu">
        <MenuHeading />
        <p className="menu-message">There are no menu items available.</p>
      </section>
    );
  }

  return (
    <section className="cashier-menu" aria-label="Menu">
      <MenuHeading />
      <div className="cashier-menu-layout">
        <nav className="menu-categories" aria-label="Menu categories">
          {categories.map((category) => (
            <button
              className={`menu-category${activeCategory === category ? ' is-selected' : ''}`}
              type="button"
              key={category}
              disabled={disabled}
              onClick={() => setSelectedCategory(category)}
              aria-pressed={activeCategory === category}
            >
              {category}
            </button>
          ))}
        </nav>

        <div className="menu-items" aria-live="polite">
          <h3>{activeCategory}</h3>
          <div className="menu-item-grid">
            {visibleItems.map((item) => (
              <button
                className="menu-item-card"
                key={item.menu_item_id}
                type="button"
                disabled={disabled}
                onClick={() => onSelectItem(item)}
              >
                <h4>{item.name}</h4>
                <p>${Number(item.price).toFixed(2)}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function MenuHeading() {
  return (
    <div className="cashier-menu-heading">
      <div>
        <h2>Menu</h2>
        <p>Choose a category to browse available drinks.</p>
      </div>
    </div>
  );
}
