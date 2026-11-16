import React, { useEffect, useRef } from 'react';

const money = (cents) => `$${(cents / 100).toFixed(2)}`;

export default function KioskRedeem({ points, redeemPoints, freeItem, discountCents, onRedeem, onSkip, onBack }) {
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus(); }, []);

  return (
    <section className="kiosk-checkout" aria-labelledby="redeem-heading">
      <p className="kiosk-eyebrow">Rewards</p>
      <h2 id="redeem-heading" ref={heading} tabIndex={-1}>You have {points} points</h2>
      <p>
        Use {redeemPoints} points to get your cheapest drink free: <strong>{freeItem.name}</strong> ({money(discountCents)} off).
        You will have {points - redeemPoints} points left, plus whatever you earn on this order.
      </p>
      <div className="kiosk-checkout-actions kiosk-redeem-actions">
        <button type="button" className="submit-order-button" onClick={onRedeem}>Use {redeemPoints} points · save {money(discountCents)}</button>
        <button type="button" className="kiosk-secondary-button" onClick={onSkip}>Keep my points</button>
        <button type="button" className="kiosk-back-button" onClick={onBack}>Back</button>
      </div>
    </section>
  );
}
