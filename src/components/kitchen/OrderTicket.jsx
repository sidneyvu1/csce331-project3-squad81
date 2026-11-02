import React, { useEffect, useState } from 'react';

const NEXT_ACTION = {
  pending: { label: 'Start Preparing', status: 'preparing' },
  preparing: { label: 'Mark Ready', status: 'ready' },
  ready: { label: 'Picked Up', status: 'completed' }
};

function formatElapsed(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function OrderTicket({ order, busy, onUpdateStatus }) {
  // age_seconds comes from the server clock; tick forward locally between polls.
  const [receivedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const elapsedSeconds = Math.max(0, order.age_seconds + Math.floor((now - receivedAt) / 1000));
  const isLate = order.status !== 'ready' && elapsedSeconds >= 600;
  const action = NEXT_ACTION[order.status];

  return (
    <li className="cart-item" aria-busy={busy}>
      <div className="cart-item-heading">
        <div>
          <h3>Order #{order.order_id}</h3>
          <p className={isLate ? 'menu-error' : undefined}>
            Waiting {formatElapsed(elapsedSeconds)}
          </p>
        </div>
      </div>

      {order.items.map((item, index) => (
        <dl className="cart-item-details" key={index}>
          <div><dt>{item.quantity}×</dt><dd><strong>{item.name}</strong></dd></div>
          <div><dt>Sugar</dt><dd>{item.sugar_level}</dd></div>
          <div><dt>Ice</dt><dd>{item.ice_level}</dd></div>
          {item.toppings.length > 0 && (
            <div><dt>Toppings</dt><dd>{item.toppings.join(', ')}</dd></div>
          )}
          {item.notes && (
            <div><dt>Notes</dt><dd>{item.notes}</dd></div>
          )}
        </dl>
      ))}

      {action && (
        <button
          className="submit-order-button"
          type="button"
          disabled={busy}
          onClick={() => onUpdateStatus(order.order_id, action.status)}
        >
          {busy ? 'Updating…' : action.label}
        </button>
      )}
    </li>
  );
}