import React, { useEffect, useState } from 'react';
import { translate as t } from '../kiosk/kioskText';

export default function DrinkCustomizationModal({
  item,
  toppings,
  toppingsLoading,
  toppingsError,
  onClose,
  onAddToCart,
  customerFacing = false,
  language = 'en'
}) {
  const [sugarLevel, setSugarLevel] = useState('100%');
  const [iceLevel, setIceLevel] = useState('Regular');
  const [selectedToppings, setSelectedToppings] = useState([]);
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState(1);

  const toppingTotalCents = selectedToppings.reduce((total, id) => total + (toppings.find((topping) => topping.inventory_id === id)?.price_cents ?? 0), 0);
  const unitPriceCents = Math.round(Number(item.price) * 100) + toppingTotalCents;

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
      unit_price: unitPriceCents / 100,
      toppings: selectedToppings.map((toppingId) => {
        const topping = toppings.find((candidate) => candidate.inventory_id === toppingId);
        return {
          inventory_id: topping.inventory_id,
          name: topping.name,
          price_cents: topping.price_cents
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
            aria-label={t(language, 'close')}
          >
            ×
          </button>
        </header>
        <fieldset className="drink-adjustment-control">
          <legend>{t(language, 'sugarLevel')}</legend>
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
          <legend>{t(language, 'iceLevel')}</legend>
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
                <span>{level === 'Regular' ? t(language, 'regularIce') : level === 'Less' ? t(language, 'lessIce') : t(language, 'noIce')}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="drink-adjustment-control topping-control">
          <legend>{t(language, 'toppings')}</legend>
          <p className="topping-message" style={{ marginBottom: 12 }}>{t(language, 'optionalToppings')}</p>
          {toppingsLoading ? (
            <p className="topping-message" role="status">{t(language, 'loadingToppings')}</p>
          ) : toppingsError ? (
            <p className="topping-message menu-error" role="alert">{toppingsError}</p>
          ) : toppings.length === 0 ? (
            <p className="topping-message">{t(language, 'noToppings')}</p>
          ) : (
            <div className="topping-options">
              {toppings.map((topping) => {
                const outOfStock = Number(topping.quantity_on_hand) <= 0;
                const priceUnavailable = !Number.isInteger(topping.price_cents);
                return (
                  <label
                    className={`topping-option${selectedToppings.includes(topping.inventory_id) ? ' is-selected' : ''}${outOfStock ? ' is-out-of-stock' : ''}`}
                    key={topping.inventory_id}
                  >
                    <input
                      type="checkbox"
                      checked={selectedToppings.includes(topping.inventory_id)}
                      disabled={outOfStock || priceUnavailable}
                      onChange={() => toggleTopping(topping.inventory_id)}
                    />
                    <span>{topping.name}{!priceUnavailable && ` (+$${(topping.price_cents / 100).toFixed(2)})`}</span>
                    <span className="topping-stock">
                      {priceUnavailable ? t(language, 'unavailable') : customerFacing
                        ? (outOfStock ? t(language, 'soldOut') : t(language, 'available'))
                        : (outOfStock ? t(language, 'outOfStock') : `${topping.quantity_on_hand} ${t(language, 'available').toLowerCase()}`)}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </fieldset>
        <div className="drink-notes">
          <label htmlFor="drink-notes">{t(language, 'specialRequests')}</label>
          <textarea
            id="drink-notes"
            name="drink-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder={t(language, 'addRequests')}
            rows={3}
          />
        </div>
        <div className="cart-add-controls">
          <div className="quantity-control" aria-label={t(language, 'drinkQuantity')}>
            <button
              type="button"
              onClick={() => setQuantity((current) => Math.max(1, current - 1))}
              disabled={quantity <= 1}
              aria-label={t(language, 'decreaseQuantity')}
            >
              −
            </button>
            <output aria-live="polite">{quantity}</output>
            <button
              type="button"
              onClick={() => setQuantity((current) => current + 1)}
              aria-label={t(language, 'increaseQuantity')}
            >
              +
            </button>
          </div>
          <button className="add-to-cart-button" type="button" onClick={addToCart}>
            {t(language, 'addToCart')} · ${(unitPriceCents * quantity / 100).toFixed(2)}
          </button>
        </div>
        <p className="topping-message" style={{ marginTop: 12 }} aria-live="polite">
          {quantity} {t(language, quantity === 1 ? 'drink' : 'drinks')} · ${(unitPriceCents * quantity / 100).toFixed(2)} {t(language, 'beforeTax')}. {t(language, 'selectedToppings')}: +${(toppingTotalCents / 100).toFixed(2)} {t(language, 'perDrink')}.
        </p>
      </section>
    </div>
  );
}
