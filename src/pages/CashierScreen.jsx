import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './pages.css';

export default function CashierScreen() {
  const nextCartItemId = useRef(1);
  const [cart, setCart] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [toppings, setToppings] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [toppingsLoading, setToppingsLoading] = useState(true);
  const [error, setError] = useState('');
  const [toppingsError, setToppingsError] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [sugarLevel, setSugarLevel] = useState('100%');
  const [iceLevel, setIceLevel] = useState('Regular');
  const [selectedToppings, setSelectedToppings] = useState([]);
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState(1);

  const cartDrinkCount = cart.reduce((total, item) => total + item.quantity, 0);

  function resetDrinkAdjustments() {
    setSugarLevel('100%');
    setIceLevel('Regular');
    setSelectedToppings([]);
    setNotes('');
    setQuantity(1);
  }

  function toggleTopping(toppingId) {
    setSelectedToppings((current) => (
      current.includes(toppingId)
        ? current.filter((id) => id !== toppingId)
        : [...current, toppingId]
    ));
  }

  function openItem(item) {
    resetDrinkAdjustments();
    setSelectedItem(item);
  }

  function closeItem() {
    setSelectedItem(null);
    resetDrinkAdjustments();
  }

  function addToCart() {
    setCart((current) => [
      ...current,
      {
        id: nextCartItemId.current++,
        menu_item_id: selectedItem.menu_item_id,
        name: selectedItem.name,
        quantity,
        unit_price: Number(selectedItem.price),
        toppings: selectedToppings.map((toppingId) => {
          const topping = toppings.find((item) => item.inventory_id === toppingId);
          return {
            inventory_id: topping.inventory_id,
            name: topping.name
          };
        }),
        sugar_level: sugarLevel,
        ice_level: iceLevel,
        notes: notes.trim()
      }
    ]);
    closeItem();
  }

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

  useEffect(() => {
    let active = true;

    async function loadToppings() {
      try {
        const response = await fetch('/api/toppings');
        if (!response.ok) {
          throw new Error('Unable to load toppings. Refresh the page to try again.');
        }

        const data = await response.json();
        if (!Array.isArray(data.toppings)) {
          throw new Error('The toppings response was not in the expected format.');
        }

        if (active) {
          setToppings(data.toppings);
          setToppingsError('');
        }
      } catch (loadError) {
        if (active) {
          setToppingsError(loadError.message || 'Unable to load toppings. Refresh the page to try again.');
        }
      } finally {
        if (active) setToppingsLoading(false);
      }
    }

    loadToppings();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedItem) return undefined;

    function closeOnEscape(event) {
      if (event.key === 'Escape') closeItem();
    }

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [selectedItem]);

  const categories = useMemo(
    () => [...new Set(menuItems.map((item) => item.category))],
    [menuItems]
  );
  const visibleItems = menuItems.filter((item) => item.category === selectedCategory);

  return (
    <div className="page-container cashier-page">
      <header className="page-header">
        <h1>Cashier Screen</h1>
        <div className="cashier-header-actions">
          <span className="cart-count" aria-live="polite">Cart: {cartDrinkCount}</span>
          <Link to="/" className="home-button">Home</Link>
        </div>
      </header>

      <main className="page-content cashier-page-content">
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
                    <button
                      className="menu-item-card"
                      key={item.menu_item_id}
                      type="button"
                      onClick={() => openItem(item)}
                    >
                      <h4>{item.name}</h4>
                      <p>${Number(item.price).toFixed(2)}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {selectedItem && (
        <div className="menu-item-modal-backdrop">
          <section
            className="menu-item-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="menu-item-modal-title"
          >
            <header className="menu-item-modal-header">
              <h2 id="menu-item-modal-title">{selectedItem.name}</h2>
              <button
                className="menu-item-modal-close"
                type="button"
                onClick={closeItem}
                aria-label="Close"
              >
                ×
              </button>
            </header>
            <fieldset className="drink-adjustment-control">
              <legend>Sugar Level</legend>
              <div className="sugar-level-options">
                {['100%', '70%', '50%', '30%', '0%'].map((level) => (
                  <label
                    className={`drink-adjustment-option${sugarLevel === level ? ' is-selected' : ''}`}
                    key={level}
                  >
                    <input
                      type="radio"
                      name="sugar-level"
                      value={level}
                      checked={sugarLevel === level}
                      onChange={() => setSugarLevel(level)}
                    />
                    <span>{level}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="ice-level-control">
              <legend>Ice Level</legend>
              <div className="ice-level-options">
                {['Regular', 'Less', 'No Ice'].map((level) => (
                  <label
                    className={`drink-adjustment-option${iceLevel === level ? ' is-selected' : ''}`}
                    key={level}
                  >
                    <input
                      type="radio"
                      name="ice-level"
                      value={level}
                      checked={iceLevel === level}
                      onChange={() => setIceLevel(level)}
                    />
                    <span>{level}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="drink-adjustment-control topping-control">
              <legend>Toppings</legend>
              {toppingsLoading ? (
                <p className="topping-message" role="status">Loading toppings…</p>
              ) : toppingsError ? (
                <p className="topping-message menu-error" role="alert">{toppingsError}</p>
              ) : toppings.length === 0 ? (
                <p className="topping-message">No toppings are available.</p>
              ) : (
                <div className="topping-options">
                  {toppings.map((topping) => {
                    const outOfStock = Number(topping.quantity_on_hand) <= 0;
                    return (
                      <label
                        className={`topping-option${selectedToppings.includes(topping.inventory_id) ? ' is-selected' : ''}${outOfStock ? ' is-out-of-stock' : ''}`}
                        key={topping.inventory_id}
                      >
                        <input
                          type="checkbox"
                          checked={selectedToppings.includes(topping.inventory_id)}
                          disabled={outOfStock}
                          onChange={() => toggleTopping(topping.inventory_id)}
                        />
                        <span>{topping.name}</span>
                        <span className="topping-stock">
                          {outOfStock ? 'Out of stock' : `${topping.quantity_on_hand} available`}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </fieldset>
            <div className="drink-notes">
              <label htmlFor="drink-notes">Special requests</label>
              <textarea
                id="drink-notes"
                name="drink-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add any special requests"
                rows={3}
              />
            </div>
            <div className="cart-add-controls">
              <div className="quantity-control" aria-label="Drink quantity">
                <button
                  type="button"
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <output aria-live="polite">{quantity}</output>
                <button
                  type="button"
                  onClick={() => setQuantity((current) => current + 1)}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
              <button className="add-to-cart-button" type="button" onClick={addToCart}>
                Add to Cart
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
