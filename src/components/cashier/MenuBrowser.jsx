import React, { useMemo, useState } from 'react';
import { translate as t, translateCategory } from '../kiosk/kioskText';

export default function MenuBrowser({ menuItems, loading, error, disabled, onSelectItem, language = 'en' }) {
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
      <section className="cashier-menu" aria-label={t(language, 'menu')}>
        <MenuHeading language={language} />
        <p className="menu-message" role="status">{t(language, 'loadingMenu')}</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="cashier-menu" aria-label={t(language, 'menu')}>
        <MenuHeading language={language} />
        <p className="menu-message menu-error" role="alert">{error}</p>
      </section>
    );
  }

  if (menuItems.length === 0) {
    return (
      <section className="cashier-menu" aria-label={t(language, 'menu')}>
        <MenuHeading language={language} />
        <p className="menu-message">{t(language, 'noMenuItems')}</p>
      </section>
    );
  }

  return (
    <section className="cashier-menu" aria-label={t(language, 'menu')}>
      <MenuHeading language={language} />
      <div className="cashier-menu-layout">
        <nav className="menu-categories" aria-label={t(language, 'menuCategories')}>
          {categories.map((category) => (
            <button
              className={`menu-category${activeCategory === category ? ' is-selected' : ''}`}
              type="button"
              key={category}
              disabled={disabled}
              onClick={() => setSelectedCategory(category)}
              aria-pressed={activeCategory === category}
            >
              {translateCategory(language, category)}
            </button>
          ))}
        </nav>

        <div className="menu-items" aria-live="polite">
          <h3>{translateCategory(language, activeCategory)}</h3>
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

function MenuHeading({ language }) {
  return (
    <div className="cashier-menu-heading">
      <div>
        <h2>{t(language, 'menu')}</h2>
        <p>{t(language, 'menuIntro')}</p>
      </div>
    </div>
  );
}
