import React, { useEffect, useRef } from 'react';
import { translate as t } from './kioskText';

const money = (cents) => `$${(cents / 100).toFixed(2)}`;

export default function KioskRedeem({ points, redeemPoints, freeItem, discountCents, onRedeem, onSkip, onBack, language = 'en' }) {
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus(); }, []);

  return (
    <section className="kiosk-checkout" aria-labelledby="redeem-heading">
      <p className="kiosk-eyebrow">{t(language, 'rewards')}</p>
      <h2 id="redeem-heading" ref={heading} tabIndex={-1}>{t(language, 'pointsAvailable', { points })}</h2>
      <p>
        {t(language, 'redeemDescription', {
          redeem: redeemPoints,
          drink: freeItem.name,
          discount: money(discountCents),
          remaining: points - redeemPoints
        })}
      </p>
      <div className="kiosk-checkout-actions kiosk-redeem-actions">
        <button type="button" className="submit-order-button" onClick={onRedeem}>{t(language, 'redeemPoints', { points: redeemPoints, discount: money(discountCents) })}</button>
        <button type="button" className="kiosk-secondary-button" onClick={onSkip}>{t(language, 'keepPoints')}</button>
        <button type="button" className="kiosk-back-button" onClick={onBack}>{t(language, 'back')}</button>
      </div>
    </section>
  );
}
