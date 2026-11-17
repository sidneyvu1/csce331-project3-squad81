import React, { useEffect, useRef, useState } from 'react';
import { translate as t } from './kioskText';

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

function validateCard({ name, number, expiry, cvc }, language) {
  const errors = {};
  const digits = number.replace(/\D/g, '');
  if (!name.trim()) errors.name = t(language, 'validCardName');
  if (digits.length < 13 || digits.length > 19 || !passesLuhn(digits)) {
    errors.number = t(language, 'validCardNumber');
  }

  const match = /^(\d{2})\/(\d{2})$/.exec(expiry);
  const month = match ? Number(match[1]) : 0;
  const year = match ? 2000 + Number(match[2]) : 0;
  const now = new Date();
  const expired = year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1);
  if (!match || month < 1 || month > 12 || expired) {
    errors.expiry = t(language, 'validExpiry');
  }

  if (!/^\d{3,4}$/.test(cvc)) errors.cvc = t(language, 'validSecurityCode');
  return errors;
}

export default function KioskPayment({ totalCents, submitting, error, onPay, onBack, language = 'en' }) {
  const heading = useRef(null);
  const [method, setMethod] = useState('card');
  const [card, setCard] = useState({ name: '', number: '', expiry: '', cvc: '' });
  const [errors, setErrors] = useState({});
  const [processing, setProcessing] = useState(false);
  const busy = processing || submitting;
  const free = totalCents === 0;

  useEffect(() => { heading.current?.focus(); }, []);

  function updateCard(field, value) {
    setCard((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  }

  async function pay(event) {
    event.preventDefault();
    if (busy) return;

    let payment = { method: free ? 'rewards' : 'counter' };
    if (!free && method === 'card') {
      const found = validateCard(card, language);
      if (Object.keys(found).length > 0) {
        setErrors(found);
        return;
      }
      payment = { method: 'card', last4: card.number.replace(/\D/g, '').slice(-4) };
    }

    // Payment is simulated for this project: card details stay in this component
    // and are never sent to the server or stored.
    setProcessing(true);
    if (!free && method === 'card') await new Promise((resolve) => setTimeout(resolve, 1200));
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
      <h2 id="checkout-heading" ref={heading} tabIndex={-1}>{t(language, 'pay')}</h2>

      <form onSubmit={pay} noValidate>
        {free ? (
          <p>{t(language, 'rewardsCover')}</p>
        ) : (<>
        <fieldset className="kiosk-payment-methods" disabled={busy}>
          <legend>{t(language, 'paymentMethod')}</legend>
          <label className={method === 'card' ? 'kiosk-payment-option selected' : 'kiosk-payment-option'}>
            <input type="radio" name="payment-method" value="card" checked={method === 'card'} onChange={() => setMethod('card')} />
            {t(language, 'card')}
          </label>
          <label className={method === 'counter' ? 'kiosk-payment-option selected' : 'kiosk-payment-option'}>
            <input type="radio" name="payment-method" value="counter" checked={method === 'counter'} onChange={() => setMethod('counter')} />
            {t(language, 'counter')}
          </label>
        </fieldset>

        {method === 'card' ? (
          <>
            <label htmlFor="card-name">{t(language, 'nameOnCard')}</label>
            <input id="card-name" type="text" autoComplete="cc-name" maxLength={60}
              value={card.name} onChange={(e) => updateCard('name', e.target.value)} {...fieldProps('name')} />
            {fieldError('name')}

            <label htmlFor="card-number">{t(language, 'cardNumber')}</label>
            <input id="card-number" type="text" inputMode="numeric" autoComplete="cc-number"
              placeholder="1234 5678 9012 3456" maxLength={23}
              value={card.number} onChange={(e) => updateCard('number', formatCardNumber(e.target.value))} {...fieldProps('number')} />
            {fieldError('number')}

            <div className="kiosk-payment-row">
              <div>
                <label htmlFor="card-expiry">{t(language, 'expires')}</label>
                <input id="card-expiry" type="text" inputMode="numeric" autoComplete="cc-exp"
                  placeholder="MM/YY" maxLength={5}
                  value={card.expiry} onChange={(e) => updateCard('expiry', formatExpiry(e.target.value))} {...fieldProps('expiry')} />
                {fieldError('expiry')}
              </div>
              <div>
                <label htmlFor="card-cvc">{t(language, 'securityCode')}</label>
                <input id="card-cvc" type="password" inputMode="numeric" autoComplete="cc-csc"
                  placeholder="CVC" maxLength={4}
                  value={card.cvc} onChange={(e) => updateCard('cvc', e.target.value.replace(/\D/g, ''))} {...fieldProps('cvc')} />
                {fieldError('cvc')}
              </div>
            </div>
          </>
        ) : (
          <p>{t(language, 'payAtCounterInfo')}</p>
        )}
        </>)}

        <div className="kiosk-checkout-total"><span>{t(language, 'orderTotal')}</span><strong>{money(totalCents / 100)}</strong></div>
        {error && <p className="menu-error" role="alert">{error}</p>}
        <div className="kiosk-checkout-actions">
          <button type="submit" className="submit-order-button" disabled={busy}>
            {processing ? t(language, 'processingPayment') : submitting ? t(language, 'placingOrder') : !free && method === 'card' ? `${t(language, 'pay')} ${money(totalCents / 100)}` : t(language, 'placeOrder')}
          </button>
          <button type="button" className="kiosk-back-button" disabled={busy} onClick={onBack}>{t(language, 'backToRewards')}</button>
        </div>
      </form>
    </section>
  );
}
