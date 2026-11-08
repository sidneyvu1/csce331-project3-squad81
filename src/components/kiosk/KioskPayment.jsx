import React, { useEffect, useRef, useState } from 'react';

const money = (amount) => `$${Number(amount).toFixed(2)}`;

function formatCardNumber(value) {
  return value.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

function passesLuhn(digits) {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
}

function validateCard({ name, number, expiry, cvc }) {
  const errors = {};
  const digits = number.replace(/\D/g, '');
  if (!name.trim()) errors.name = 'Enter the name on the card.';
  if (digits.length < 13 || digits.length > 19 || !passesLuhn(digits)) {
    errors.number = 'Enter a valid card number.';
  }

  const match = /^(\d{2})\/(\d{2})$/.exec(expiry);
  const month = match ? Number(match[1]) : 0;
  const year = match ? 2000 + Number(match[2]) : 0;
  const now = new Date();
  const expired = year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1);
  if (!match || month < 1 || month > 12 || expired) {
    errors.expiry = 'Enter a valid expiration date (MM/YY).';
  }

  if (!/^\d{3,4}$/.test(cvc)) errors.cvc = 'Enter the 3 or 4 digit security code.';
  return errors;
}

export default function KioskPayment({ totalCents, submitting, error, onPay, onBack }) {
  const heading = useRef(null);
  const [method, setMethod] = useState('card');
  const [card, setCard] = useState({ name: '', number: '', expiry: '', cvc: '' });
  const [errors, setErrors] = useState({});
  const [processing, setProcessing] = useState(false);
  const busy = processing || submitting;

  useEffect(() => { heading.current?.focus(); }, []);

  function updateCard(field, value) {
    setCard((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  }

  async function pay(event) {
    event.preventDefault();
    if (busy) return;

    let payment = { method: 'counter' };
    if (method === 'card') {
      const found = validateCard(card);
      if (Object.keys(found).length > 0) {
        setErrors(found);
        return;
      }
      payment = { method: 'card', last4: card.number.replace(/\D/g, '').slice(-4) };
    }

    // Payment is simulated for this project: card details stay in this component
    // and are never sent to the server or stored.
    setProcessing(true);
    if (method === 'card') await new Promise((resolve) => setTimeout(resolve, 1200));
    setProcessing(false);
    onPay(payment);
  }

  const fieldProps = (field) => ({
    'aria-invalid': Boolean(errors[field]),
    'aria-describedby': errors[field] ? `${field}-error` : undefined,
    disabled: busy
  });
  const fieldError = (field) => errors[field] && (
    <p id={`${field}-error`} className="menu-error" role="alert">{errors[field]}</p>
  );

  return (
    <section className="kiosk-checkout" aria-labelledby="checkout-heading" aria-busy={busy}>
      <h2 id="checkout-heading" ref={heading} tabIndex={-1}>Pay!</h2>

      <form onSubmit={pay} noValidate>
        <fieldset className="kiosk-payment-methods" disabled={busy}>
          <legend>Payment method</legend>
          <label className={method === 'card' ? 'kiosk-payment-option selected' : 'kiosk-payment-option'}>
            <input type="radio" name="payment-method" value="card" checked={method === 'card'} onChange={() => setMethod('card')} />
            Credit or debit card
          </label>
          <label className={method === 'counter' ? 'kiosk-payment-option selected' : 'kiosk-payment-option'}>
            <input type="radio" name="payment-method" value="counter" checked={method === 'counter'} onChange={() => setMethod('counter')} />
            Pay at the counter
          </label>
        </fieldset>

        {method === 'card' ? (
          <>
            <label htmlFor="card-name">Name on card</label>
            <input id="card-name" type="text" autoComplete="cc-name" maxLength={60}
              value={card.name} onChange={(e) => updateCard('name', e.target.value)} {...fieldProps('name')} />
            {fieldError('name')}

            <label htmlFor="card-number">Card number</label>
            <input id="card-number" type="text" inputMode="numeric" autoComplete="cc-number"
              placeholder="1234 5678 9012 3456" maxLength={23}
              value={card.number} onChange={(e) => updateCard('number', formatCardNumber(e.target.value))} {...fieldProps('number')} />
            {fieldError('number')}

            <div className="kiosk-payment-row">
              <div>
                <label htmlFor="card-expiry">Expires</label>
                <input id="card-expiry" type="text" inputMode="numeric" autoComplete="cc-exp"
                  placeholder="MM/YY" maxLength={5}
                  value={card.expiry} onChange={(e) => updateCard('expiry', formatExpiry(e.target.value))} {...fieldProps('expiry')} />
                {fieldError('expiry')}
              </div>
              <div>
                <label htmlFor="card-cvc">Security code</label>
                <input id="card-cvc" type="password" inputMode="numeric" autoComplete="cc-csc"
                  placeholder="CVC" maxLength={4}
                  value={card.cvc} onChange={(e) => updateCard('cvc', e.target.value.replace(/\D/g, ''))} {...fieldProps('cvc')} />
                {fieldError('cvc')}
              </div>
            </div>
          </>
        ) : (
          <p>Place your order now and pay the cashier when you pick up your drinks.</p>
        )}

        <div className="kiosk-checkout-total"><span>Order total</span><strong>{money(totalCents / 100)}</strong></div>
        {error && <p className="menu-error" role="alert">{error}</p>}
        <div className="kiosk-checkout-actions">
          <button type="submit" className="submit-order-button" disabled={busy}>
            {processing ? 'Processing payment…' : submitting ? 'Placing order…' : method === 'card' ? `Pay ${money(totalCents / 100)}` : 'Place order'}
          </button>
          <button type="button" className="kiosk-back-button" disabled={busy} onClick={onBack}>Back to rewards</button>
        </div>
      </form>
    </section>
  );
}
