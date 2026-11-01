import React from 'react';

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
  onSubmitOrder
}) {
  function formatCurrency(cents) {
    return `$${(cents / 100).toFixed(2)}`;
  }

  return (
    <aside className="cashier-cart" aria-label="Current order" aria-busy={submitting}>
      <header className="cashier-cart-header">
        <h2>Current Order</h2>
        <span>{drinkCount} {drinkCount === 1 ? 'drink' : 'drinks'}</span>
      </header>

      {cart.length === 0 ? (
        <p className="cart-empty-message">Your order is empty. Select a drink to get started.</p>
      ) : (
        <ul className="cart-items">
          {cart.map((item) => {
            const lineTotalCents = Math.round(item.unit_price * 100) * item.quantity;
            return (
              <li className="cart-item" key={item.id}>
                <div className="cart-item-heading">
                  <div>
                    <h3>{item.name}</h3>
                    <p>{formatCurrency(Math.round(item.unit_price * 100))} each</p>
                  </div>
                  <button
                    className="cart-item-remove"
                    type="button"
                    disabled={submitting}
                    onClick={() => onRemoveItem(item.id)}
                    aria-label={`Remove ${item.name} from order`}
                    title="Remove item"
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
                  <div><dt>Sugar</dt><dd>{item.sugar_level}</dd></div>
                  <div><dt>Ice</dt><dd>{item.ice_level}</dd></div>
                  {item.toppings.length > 0 && (
                    <div><dt>Toppings</dt><dd>{item.toppings.map((topping) => topping.name).join(', ')}</dd></div>
                  )}
                  {item.notes && (
                    <div><dt>Notes</dt><dd>{item.notes}</dd></div>
                  )}
                </dl>
                <div className="cart-item-footer">
                  <div className="cart-quantity-control" aria-label={`Quantity of ${item.name}`}>
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.id, -1)}
                      disabled={submitting || item.quantity <= 1}
                      aria-label={`Decrease ${item.name} quantity`}
                    >
                      −
                    </button>
                    <output>{item.quantity}</output>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => onUpdateQuantity(item.id, 1)}
                      aria-label={`Increase ${item.name} quantity`}
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
        <div><dt>Subtotal</dt><dd>{formatCurrency(subtotalCents)}</dd></div>
        <div><dt>Tax (8.25%)</dt><dd>{formatCurrency(taxCents)}</dd></div>
        <div className="cart-total"><dt>Total</dt><dd>{formatCurrency(totalCents)}</dd></div>
      </dl>
      {submitError && <p className="order-submit-message menu-error" role="alert">{submitError}</p>}
      {completedOrder && (
        <p className="order-submit-message order-submit-success" role="status">
          Order #{completedOrder.order_id} submitted successfully. Total: ${completedOrder.total}.
        </p>
      )}
      <button
        className="submit-order-button"
        type="button"
        onClick={onSubmitOrder}
        disabled={cart.length === 0 || submitting}
      >
        {submitting ? 'Submitting…' : 'Submit Order'}
      </button>
    </aside>
  );
}
