import React, { useEffect, useRef, useState } from 'react';
import { translate as t } from './kioskText';

const money = (amount) => `$${Number(amount).toFixed(2)}`;
const iceLabel = (language, level) => level === 'Regular'
  ? t(language, 'regularIce')
  : level === 'Less' ? t(language, 'lessIce') : level === 'No Ice' ? t(language, 'noIce') : level;

export default function KioskCheckout({
  step, order, phone, onPhoneChange, totalCents, submitting, error,
  onContinue, onBack, onNewOrder, language = 'en'
}) {
  const heading = useRef(null);
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => { heading.current?.focus(); }, [step]);

  function continueWithRewards(event) {
    event.preventDefault();
    const digits = phone.replace(/\D/g, '');
    const normalized = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
    if (normalized.length !== 10) {
      setPhoneError(t(language, 'invalidPhone'));
      document.getElementById('rewards-phone')?.focus();
      return;
    }
    setPhoneError('');
    onContinue(normalized);
  }

  if (step === 'confirmation' && order) {
    return (
      <section className="kiosk-checkout kiosk-receipt" aria-labelledby="checkout-heading">
        <span className="kiosk-success-icon" aria-hidden="true">✓</span>
        <p className="kiosk-eyebrow">{t(language, 'orderConfirmed')}</p>
        <h2 id="checkout-heading" ref={heading} tabIndex={-1}>{t(language, 'thankYou')}</h2>
        <p className="kiosk-order-number">Order #{order.order_id}</p>
        <p>{t(language, 'receiptSummary')}</p>
        <ul className="kiosk-receipt-items">
          {order.items.map((item) => (
            <li key={item.id}>
              <div className="kiosk-receipt-line">
                <strong>{item.quantity} × {item.name}</strong>
                <strong>{money(Math.round(item.unit_price * 100) * item.quantity / 100)}</strong>
              </div>
              <p>{money(item.unit_price)} {t(language, 'each')} · {t(language, 'sugar')}: {item.sugar_level} · {t(language, 'ice')}: {iceLabel(language, item.ice_level)}</p>
              {item.toppings.length > 0 && <p>{t(language, 'toppings')}: {item.toppings.map((topping) => `${topping.name}${Number.isInteger(topping.price_cents) ? ` (+$${(topping.price_cents / 100).toFixed(2)} ${t(language, 'each')})` : ''}`).join(', ')}</p>}
              {item.notes && <p data-read-aloud-private>{t(language, 'notes')}: {item.notes}</p>}
            </li>
          ))}
        </ul>
        <dl className="cart-totals">
          <div><dt>{t(language, 'subtotal')}</dt><dd>{money(order.subtotal)}</dd></div>
          {Number(order.reward_discount) > 0 && <div className="kiosk-reward-discount"><dt>{t(language, 'rewardsDiscount')}</dt><dd>-{money(order.reward_discount)}</dd></div>}
          <div><dt>{t(language, 'tax')}</dt><dd>{money(order.tax)}</dd></div>
          <div className="cart-total"><dt>{t(language, 'orderTotal')}</dt><dd>{money(order.total)}</dd></div>
        </dl>
        {order.payment && (
          <p className="kiosk-rewards-note" data-read-aloud-private>
            {order.payment.method === 'card'
              ? t(language, 'paidCard', { last4: order.payment.last4 })
              : order.payment.method === 'rewards'
                ? t(language, 'paidRewards')
                : t(language, 'paymentDue')}
          </p>
        )}
        {order.rewardsPhone && (
          <p className="kiosk-rewards-note" data-read-aloud-private>
            {t(language, 'rewardsAccount', { last4: order.rewardsPhone.slice(-4) })}
            {order.points_redeemed > 0 && ` ${t(language, 'redeemedPoints', { points: order.points_redeemed })}`}
            {order.points_earned != null && ` ${t(language, 'earnedPoints', { points: order.points_earned, balance: order.points_balance })}`}
          </p>
        )}
        <button type="button" className="submit-order-button" onClick={onNewOrder}>{t(language, 'newOrder')}</button>
      </section>
    );
  }

  return (
    <section className="kiosk-checkout" aria-labelledby="checkout-heading" aria-busy={submitting}>
      <h2 id="checkout-heading" ref={heading} tabIndex={-1}>{t(language, 'rewardsHeading')}</h2>
      <p>{t(language, 'rewardsIntro')}</p>
      <form onSubmit={continueWithRewards} noValidate>
        <label htmlFor="rewards-phone">{t(language, 'phoneNumber')}</label>
        <input
          id="rewards-phone" type="tel" inputMode="tel" autoComplete="off"
          placeholder="(555) 123-4567" maxLength={24} value={phone}
          disabled={submitting} aria-describedby={phoneError ? 'phone-error' : undefined}
          aria-invalid={Boolean(phoneError)}
          onChange={(event) => { onPhoneChange(event.target.value); setPhoneError(''); }}
        />
        {phoneError && <p id="phone-error" className="menu-error" role="alert">{phoneError}</p>}
        <div className="kiosk-checkout-total"><span>{t(language, 'orderTotal')}</span><strong>{money(totalCents / 100)}</strong></div>
        {error && <p className="menu-error" role="alert">{error}</p>}
        <div className="kiosk-checkout-actions">
          <button type="submit" className="submit-order-button" disabled={submitting}>{submitting ? t(language, 'checkingRewards') : t(language, 'addAndContinue')}</button>
          <button type="button" className="kiosk-secondary-button" disabled={submitting} onClick={() => { setPhoneError(''); onContinue(''); }}>{t(language, 'skipRewards')}</button>
          <button type="button" className="kiosk-back-button" disabled={submitting} onClick={onBack}>{t(language, 'backToOrder')}</button>
        </div>
      </form>
    </section>
  );
}
