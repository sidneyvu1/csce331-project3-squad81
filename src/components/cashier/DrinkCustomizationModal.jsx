import React, { useEffect, useState } from 'react';

export default function DrinkCustomizationModal({
  item,
  toppings,
  toppingsLoading,
  toppingsError,
  onClose,
  onAddToCart
}) {
  const [sugarLevel, setSugarLevel] = useState('100%');
  const [iceLevel, setIceLevel] = useState('Regular');
  const [selectedToppings, setSelectedToppings] = useState([]);
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  function toggleTopping(toppingId) {
    setSelectedToppings((current) => (
      current.includes(toppingId)
        ? current.filter((id) => id !== toppingId)
        : [...current, toppingId]
    ));
  }

  function addToCart() {
    onAddToCart({
      menu_item_id: item.menu_item_id,
      name: item.name,
      quantity,
      unit_price: Number(item.price),
      toppings: selectedToppings.map((toppingId) => {
        const topping = toppings.find((candidate) => candidate.inventory_id === toppingId);
        return {
          inventory_id: topping.inventory_id,
          name: topping.name
        };
      }),
      sugar_level: sugarLevel,
      ice_level: iceLevel,
      notes: notes.trim()
    });
  }

  return (
    <div className="menu-item-modal-backdrop">
      <section
        className="menu-item-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="menu-item-modal-title"
      >
        <header className="menu-item-modal-header">
          <h2 id="menu-item-modal-title">{item.name}</h2>
          <button
            className="menu-item-modal-close"
            type="button"
            onClick={onClose}
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
  );
}
