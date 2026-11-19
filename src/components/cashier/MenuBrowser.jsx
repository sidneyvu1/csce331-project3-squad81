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
              <CategoryIcon category={category} />
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

function CategoryIcon({ category }) {
  const normalizedCategory = category.toLowerCase().replace(/[^a-z]/g, '');
  let icon = 'tea';

  if (normalizedCategory.includes('fresh')) icon = 'coffee';
  else if (normalizedCategory.includes('fruit')) icon = 'fruit';
  else if (normalizedCategory.includes('ice')) icon = 'ice';
  else if (normalizedCategory.includes('milk')) icon = 'milk';
  else if (normalizedCategory.includes('matcha')) icon = 'leaf';
  else if (normalizedCategory.includes('caffeine')) icon = 'leaf';
  else if (normalizedCategory.includes('seasonal')) icon = 'sparkle';

  return (
    <svg className="menu-category-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {icon === 'coffee' && (
        <>
          <path d="M5 8h12v8a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8Z" />
          <path d="M17 10h1a3 3 0 1 1 0 6h-1M8 4c0 1 1 1 1 2m3-3c0 1 1 1 1 2" />
        </>
      )}
      {icon === 'fruit' && (
        <>
          <path d="M12 7c-4.4 0-8 2.8-8 6.5S7.6 20 12 20s8-2.8 8-6.5S16.4 7 12 7Z" />
          <path d="M12 7c1-3 3-4 5-4-1 2-2 4-5 4ZM12 8v11M6.5 11c2 1 3.8 1.5 5.5 1.5s3.5-.5 5.5-1.5" />
        </>
      )}
      {icon === 'ice' && (
        <>
          <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9 4.5l3 2 3-2M9 19.5l3-2 3 2M4.8 11l.2-3.6 3.2-1.2M19.2 13l-.2 3.6-3.2 1.2M8.2 18.2 5 17l-.2-3.6M15.8 5.8 19 7l.2 3.6" />
        </>
      )}
      {icon === 'milk' && (
        <>
          <path d="M7 8h10l-1 12H8L7 8ZM9 8l1-4h5l1 4M13 4l3-2" />
          <circle cx="10" cy="15" r="1" />
          <circle cx="14" cy="17" r="1" />
        </>
      )}
      {icon === 'leaf' && (
        <>
          <path d="M20 4C11 4 5 6.5 5 12a5 5 0 0 0 5 5c5.5 0 8-6 10-13Z" />
          <path d="M4 21c3-6 7-9 13-13" />
        </>
      )}
      {icon === 'sparkle' && (
        <>
          <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
          <path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16ZM5 3l.6 1.4L7 5l-1.4.6L5 7l-.6-1.4L3 5l1.4-.6L5 3Z" />
        </>
      )}
      {icon === 'tea' && (
        <>
          <path d="M5 8h12v8a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8ZM17 10h1a3 3 0 1 1 0 6h-1" />
          <path d="M8 5h8" />
        </>
      )}
    </svg>
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
