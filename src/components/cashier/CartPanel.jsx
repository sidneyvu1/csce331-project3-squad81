import React from 'react';
import { translate as t } from '../kiosk/kioskText';

function formatIceLevel(language, level) {
  if (level === 'Regular') return t(language, 'regularIce');
  if (level === 'Less') return t(language, 'lessIce');
  if (level === 'No Ice') return t(language, 'noIce');
  return level;
}

export default function CartPanel({
  cart,
  drinkCount,
  subtotalCents,
  taxCents,
  totalCents,
  onUpdateQuantity,
  onRemoveItem,
  submitting,
  submitError,
  completedOrder,
  onSubmitOrder,
  submitLabel = 'Submit Order',
  language = 'en'
}) {
  function formatCurrency(cents) {
    return `$${(cents / 100).toFixed(2)}`;
  }

  return (
    <aside className="cashier-cart" aria-label={t(language, 'currentOrder')} aria-busy={submitting}>
      <header className="cashier-cart-header">
        <h2>{t(language, 'currentOrder')}</h2>
        <span>{drinkCount} {t(language, drinkCount === 1 ? 'drink' : 'drinks')}</span>
      </header>

      {cart.length === 0 ? (
        <p className="cart-empty-message">{t(language, 'emptyOrder')}</p>
      ) : (
        <ul className="cart-items">
          {cart.map((item) => {
            const lineTotalCents = Math.round(item.unit_price * 100) * item.quantity;
            return (
              <li className="cart-item" key={item.id}>
                <div className="cart-item-heading">
                  <div>
                    <h3>{item.name}</h3>
                    <p>{formatCurrency(Math.round(item.unit_price * 100))} {t(language, 'each')}</p>
                  </div>
                  <button
                    className="cart-item-remove"
                    type="button"
                    disabled={submitting}
                    onClick={() => onRemoveItem(item.id)}
                    aria-label={t(language, 'removeItem', { name: item.name })}
                    title={t(language, 'removeTitle')}
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      focusable="false"
                    >
                      <path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" />
                    </svg>
                  </button>
                </div>
                <dl className="cart-item-details">
                  <div><dt>{t(language, 'sugar')}</dt><dd>{item.sugar_level}</dd></div>
                  <div><dt>{t(language, 'ice')}</dt><dd>{formatIceLevel(language, item.ice_level)}</dd></div>
                  {item.toppings.length > 0 && (
                    <div><dt>{t(language, 'toppings')}</dt><dd>{item.toppings.map((topping) => `${topping.name}${Number.isInteger(topping.price_cents) ? ` (+$${(topping.price_cents / 100).toFixed(2)} ${t(language, 'each')})` : ''}`).join(', ')}</dd></div>
                  )}
                  {item.notes && (
                    <div><dt>{t(language, 'notes')}</dt><dd>{item.notes}</dd></div>
                  )}
                </dl>
                <div className="cart-item-footer">
                  <div className="cart-quantity-control" aria-label={t(language, 'quantityOf', { name: item.name })}>
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.id, -1)}
                      disabled={submitting || item.quantity <= 1}
                      aria-label={t(language, 'decreaseItem', { name: item.name })}
                    >
                      −
                    </button>
                    <output>{item.quantity}</output>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => onUpdateQuantity(item.id, 1)}
                      aria-label={t(language, 'increaseItem', { name: item.name })}
                    >
                      +
                    </button>
                  </div>
                  <strong>{formatCurrency(lineTotalCents)}</strong>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <dl className="cart-totals">
        <div><dt>{t(language, 'subtotal')}</dt><dd>{formatCurrency(subtotalCents)}</dd></div>
        <div><dt>{t(language, 'tax')}</dt><dd>{formatCurrency(taxCents)}</dd></div>
        <div className="cart-total"><dt>{t(language, 'total')}</dt><dd>{formatCurrency(totalCents)}</dd></div>
      </dl>
      {submitError && <p className="order-submit-message menu-error" role="alert">{submitError}</p>}
      {completedOrder && (
        <p className="order-submit-message order-submit-success" role="status">
          {t(language, 'submittedSuccess', { order: completedOrder.order_id, total: completedOrder.total })}
        </p>
      )}
      <button
        className="submit-order-button"
        type="button"
        onClick={onSubmitOrder}
        disabled={cart.length === 0 || submitting}
      >
        {submitting ? t(language, 'submitting') : submitLabel}
      </button>
    </aside>
  );
}
