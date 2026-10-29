import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import './pages.css';

export default function CashierScreen() {
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadMenu() {
      try {
        const response = await fetch('/api/menu');
        if (!response.ok) {
          throw new Error('Unable to load the menu. Refresh the page to try again.');
        }

        const data = await response.json();
        if (!Array.isArray(data.menuItems)) {
          throw new Error('The menu response was not in the expected format.');
        }

        if (active) {
          setMenuItems(data.menuItems);
          setSelectedCategory((current) => current || data.menuItems[0]?.category || '');
          setError('');
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || 'Unable to load the menu. Refresh the page to try again.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadMenu();
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(
    () => [...new Set(menuItems.map((item) => item.category))],
    [menuItems]
  );
  const visibleItems = menuItems.filter((item) => item.category === selectedCategory);

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Cashier Screen</h1>
        <Link to="/" className="home-button">Home</Link>
      </header>

      <main className="page-content">
        <section className="cashier-menu" aria-label="Menu">
          <div className="cashier-menu-heading">
            <div>
              <h2>Menu</h2>
              <p>Choose a category to browse available drinks.</p>
            </div>
          </div>

          {loading ? (
            <p className="menu-message" role="status">Loading menu…</p>
          ) : error ? (
            <p className="menu-message menu-error" role="alert">{error}</p>
          ) : menuItems.length === 0 ? (
            <p className="menu-message">There are no menu items available.</p>
          ) : (
            <div className="cashier-menu-layout">
              <nav className="menu-categories" aria-label="Menu categories">
                {categories.map((category) => (
                  <button
                    className={`menu-category${selectedCategory === category ? ' is-selected' : ''}`}
                    type="button"
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    aria-pressed={selectedCategory === category}
                  >
                    {category}
                  </button>
                ))}
              </nav>

              <div className="menu-items" aria-live="polite">
                <h3>{selectedCategory}</h3>
                <div className="menu-item-grid">
                  {visibleItems.map((item) => (
                    <article className="menu-item-card" key={item.menu_item_id}>
                      <h4>{item.name}</h4>
                      <p>${Number(item.price).toFixed(2)}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
