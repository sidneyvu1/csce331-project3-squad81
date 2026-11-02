import React, { useEffect, useRef, useState } from 'react';

const money = (amount) => `$${Number(amount).toFixed(2)}`;

export default function KioskCheckout({
  step, order, phone, onPhoneChange, totalCents, submitting, error,
  onSubmit, onBack, onNewOrder
}) {
  const heading = useRef(null);
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => { heading.current?.focus(); }, [step]);

  function continueWithRewards(event) {
    event.preventDefault();
    const digits = phone.replace(/\D/g, '');
    const normalized = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
    if (normalized.length !== 10) {
      setPhoneError('Enter a 10-digit phone number, including the area code.');
      return;
    }
    setPhoneError('');
    onSubmit(normalized);
  }

  if (step === 'confirmation' && order) {
    return (
      <section className="kiosk-checkout kiosk-receipt" aria-labelledby="checkout-heading">
        <span className="kiosk-success-icon" aria-hidden="true">✓</span>
        <p className="kiosk-eyebrow">Order confirmed</p>
        <h2 id="checkout-heading" ref={heading} tabIndex={-1}>Thank you for your order!</h2>
        <p className="kiosk-order-number">Order #{order.order_id}</p>
        <p>We’ve received your order. Here’s your full order summary.</p>
        <ul className="kiosk-receipt-items">
          {order.items.map((item) => (
            <li key={item.id}>
              <div className="kiosk-receipt-line">
                <strong>{item.quantity} × {item.name}</strong>
                <strong>{money(Math.round(item.unit_price * 100) * item.quantity / 100)}</strong>
              </div>
              <p>{money(item.unit_price)} each · Sugar: {item.sugar_level} · Ice: {item.ice_level}</p>
              {item.toppings.length > 0 && <p>Toppings: {item.toppings.map((topping) => topping.name).join(', ')}</p>}
              {item.notes && <p>Notes: {item.notes}</p>}
            </li>
          ))}
        </ul>
        <dl className="cart-totals">
          <div><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
          <div><dt>Tax (8.25%)</dt><dd>{money(order.tax)}</dd></div>
          <div className="cart-total"><dt>Order total</dt><dd>{money(order.total)}</dd></div>
        </dl>
        {order.rewardsPhone && (
          <p className="kiosk-rewards-note">Rewards phone entered: ••• ••• {order.rewardsPhone.slice(-4)}. Points are not credited yet; rewards integration is coming soon.</p>
        )}
        <button type="button" className="submit-order-button" onClick={onNewOrder}>Start a new order</button>
      </section>
    );
  }

  return (
    <section className="kiosk-checkout" aria-labelledby="checkout-heading" aria-busy={submitting}>
      <p className="kiosk-eyebrow">Rewards · Optional</p>
      <h2 id="checkout-heading" ref={heading} tabIndex={-1}>Add your rewards number</h2>
      <p>Enter your phone number for rewards, or skip to place your order.</p>
      <p id="rewards-help" className="kiosk-rewards-note">Rewards are coming soon. This screen collects your number for this checkout only; points are not credited yet.</p>
      <form onSubmit={continueWithRewards} noValidate>
        <label htmlFor="rewards-phone">Phone number</label>
        <input
          id="rewards-phone" type="tel" inputMode="tel" autoComplete="off"
          placeholder="(555) 123-4567" maxLength={24} value={phone}
          disabled={submitting} aria-describedby={`rewards-help${phoneError ? ' phone-error' : ''}`}
          aria-invalid={Boolean(phoneError)}
          onChange={(event) => { onPhoneChange(event.target.value); setPhoneError(''); }}
        />
        {phoneError && <p id="phone-error" className="menu-error" role="alert">{phoneError}</p>}
        <div className="kiosk-checkout-total"><span>Order total</span><strong>{money(totalCents / 100)}</strong></div>
        {error && <p className="menu-error" role="alert">{error}</p>}
        <div className="kiosk-checkout-actions">
          <button type="submit" className="submit-order-button" disabled={submitting}>{submitting ? 'Placing order…' : 'Add number & place order'}</button>
          <button type="button" className="kiosk-secondary-button" disabled={submitting} onClick={() => { setPhoneError(''); onSubmit(''); }}>Skip rewards & place order</button>
          <button type="button" className="kiosk-back-button" disabled={submitting} onClick={onBack}>Back to my order</button>
        </div>
      </form>
    </section>
  );
}
