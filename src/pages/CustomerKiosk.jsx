import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import CartPanel from '../components/cashier/CartPanel';
import DrinkCustomizationModal from '../components/cashier/DrinkCustomizationModal';
import MenuBrowser from '../components/cashier/MenuBrowser';
import KioskCheckout from '../components/kiosk/KioskCheckout';
import KioskPayment from '../components/kiosk/KioskPayment';
import KioskRedeem from '../components/kiosk/KioskRedeem';
import AssistantChat from '../components/kiosk/AssistantChat';
import { kioskLanguages, translate as t } from '../components/kiosk/kioskText';
import { useLanguage } from '../components/kiosk/LanguageContext';
import KioskWeather from '../components/kiosk/KioskWeather';
import './pages.css';

// The browser reports an unreachable server as a bare "Failed to fetch".
function describeFailure(failure, fallback) {
  if (failure instanceof TypeError) return 'We could not reach the server. Please check the connection and try again.';
  return failure.message || fallback;
}

async function fetchToppings() {
  const response = await fetch('/api/toppings');
  if (!response.ok) {
    throw new Error('Unable to refresh topping stock.');
  }

  const data = await response.json();
  if (!Array.isArray(data.toppings)) {
    throw new Error('The toppings response was not in the expected format.');
  }

  return data.toppings;
}

export default function CustomerKiosk() {
  const {
    language: selectedLanguage,
    setLanguage: setSelectedLanguage,
    setKioskWelcomeVisible
  } = useLanguage();
  const [hasStarted, setHasStarted] = useState(false);
  const nextCartItemId = useRef(1);
  const [cart, setCart] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [toppings, setToppings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toppingsLoading, setToppingsLoading] = useState(true);
  const [error, setError] = useState('');
  const [toppingsError, setToppingsError] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [completedOrder, setCompletedOrder] = useState(null);
  const [checkoutStep, setCheckoutStep] = useState('menu');
  const [rewardsPhone, setRewardsPhone] = useState('');
  const [rewardsInfo, setRewardsInfo] = useState(null);
  const [redeemReward, setRedeemReward] = useState(false);
  const [lookingUpRewards, setLookingUpRewards] = useState(false);

  useLayoutEffect(() => {
    setKioskWelcomeVisible(!hasStarted);
    return () => setKioskWelcomeVisible(false);
  }, [hasStarted, setKioskWelcomeVisible]);

  const cartDrinkCount = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotalCents = cart.reduce(
    (total, item) => total + Math.round(item.unit_price * 100) * item.quantity,
    0
  );
  // Redeeming makes one unit of the cheapest drink free. The server recomputes this authoritatively.
  const cheapestItem = cart.reduce((best, item) => (!best || item.unit_price < best.unit_price ? item : best), null);
  const rewardDiscountCents = redeemReward && cheapestItem ? Math.round(cheapestItem.unit_price * 100) : 0;
  const taxCents = Math.round((subtotalCents - rewardDiscountCents) * 0.0825);
  const totalCents = subtotalCents - rewardDiscountCents + taxCents;

  function resetRewards() {
    setRedeemReward(false);
    setRewardsInfo(null);
  }

  async function continueFromRewards(normalizedPhone) {
    setRewardsPhone(normalizedPhone);
    setSubmitError('');
    setRedeemReward(false);
    if (!normalizedPhone) {
      setRewardsInfo(null);
      setCheckoutStep('payment');
      return;
    }

    setLookingUpRewards(true);
    try {
      const response = await fetch('/api/rewards/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizedPhone })
      });
      const data = (response.headers.get('content-type') || '').includes('application/json') ? await response.json() : {};
      if (!response.ok) throw new Error(data.error || 'Unable to look up rewards.');
      setRewardsInfo(data);
      setCheckoutStep(data.can_redeem && cart.length > 0 ? 'redeem' : 'payment');
    } catch (lookupFailure) {
      setSubmitError(`${describeFailure(lookupFailure, 'Unable to look up rewards.')} You can try again or skip rewards.`);
    } finally {
      setLookingUpRewards(false);
    }
  }

  function addToCart(item) {
    setCompletedOrder(null);
    setSubmitError('');
    setCart((current) => [...current, { ...item, id: nextCartItemId.current++ }]);
    setSelectedItem(null);
  }

  function addAssistantItems(items) {
    setCompletedOrder(null);
    setSubmitError('');
    setCart((current) => [...current, ...items.map((item) => ({ ...item, id: nextCartItemId.current++ }))]);
  }

  function updateCartQuantity(itemId, change) {
    setCompletedOrder(null);
    setSubmitError('');
    setCart((current) => current.map((item) => (
      item.id === itemId
        ? { ...item, quantity: Math.max(1, item.quantity + change) }
        : item
    )));
  }

  function removeCartItem(itemId) {
    setCompletedOrder(null);
    setSubmitError('');
    setCart((current) => current.filter((item) => item.id !== itemId));
  }

  async function submitOrder(payment) {
    if (cart.length === 0 || submittingOrder) return;

    setSubmittingOrder(true);
    setSubmitError('');
    setCompletedOrder(null);
    const orderItems = cart.map((item) => ({
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      sugar_level: item.sugar_level,
      ice_level: item.ice_level,
      toppings: item.toppings.map((topping) => topping.inventory_id),
      notes: item.notes
    }));

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: orderItems,
          payment_method: payment.method,
          ...(rewardsPhone && { rewards_phone: rewardsPhone, redeem_reward: redeemReward })
        })
      });
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(
          `Order submission returned a non-JSON response (HTTP ${response.status}). ` +
          'Check that the backend server is running the latest code.'
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to submit the order.');
      }

      if (!data.order || data.order.order_id == null) {
        throw new Error('The server response did not include the completed order.');
      }

      setCart([]);
      resetRewards();
      setCompletedOrder({ ...data.order, items: cart, rewardsPhone, payment });
      setCheckoutStep('confirmation');
      try {
        setToppings(await fetchToppings());
        setToppingsError('');
      } catch (refreshError) {
        setToppingsError(
          refreshError.message || 'Order was submitted, but topping stock could not be refreshed.'
        );
      }
    } catch (submitFailure) {
      setSubmitError(describeFailure(submitFailure, 'Unable to submit the order. Please try again.'));
    } finally {
      setSubmittingOrder(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadMenu() {
      try {
        const response = await fetch('/api/menu');
        if (!response.ok) {
          throw new Error('Unable to load the menu. Refresh the page to try again.');
        }

        const data = await response.json();
        if (!Array.isArray(data.menuItems)) {
          throw new Error('The menu response was not in the expected format.');
        }

        if (active) {
          setMenuItems(data.menuItems);
          setError('');
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || 'Unable to load the menu. Refresh the page to try again.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadMenu();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadToppings() {
      try {
        if (active) {
          setToppings(await fetchToppings());
          setToppingsError('');
        }
      } catch (loadError) {
        if (active) {
          setToppingsError(loadError.message || 'Unable to load toppings. Refresh the page to try again.');
        }
      } finally {
        if (active) setToppingsLoading(false);
      }
    }

    loadToppings();
    return () => {
      active = false;
    };
  }, []);

  if (!hasStarted) {
    return (
      <main className="kiosk-welcome" lang={selectedLanguage === 'zh' ? 'zh-CN' : selectedLanguage}>
        <section className="kiosk-welcome-panel" aria-label={t(selectedLanguage, 'startLabel')}>
          <div className="kiosk-welcome-content">
            <div className="kiosk-welcome-brand">{t(selectedLanguage, 'brand')}</div>
            <h1>{t(selectedLanguage, 'chooseLanguage')}</h1>
            <div className="kiosk-language-options" role="group" aria-label={t(selectedLanguage, 'language')}>
              {kioskLanguages.map((language) => (
                <button
                  key={language.code}
                  type="button"
                  className={`kiosk-language-option${selectedLanguage === language.code ? ' is-selected' : ''}`}
                  aria-pressed={selectedLanguage === language.code}
                  onClick={() => setSelectedLanguage(language.code)}
                >
                  <span className="kiosk-language-flag" aria-hidden="true">{language.flag}</span>
                  <span>{language.name}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="kiosk-start-button"
              onClick={() => setHasStarted(true)}
            >
              <span>{t(selectedLanguage, 'beginOrder')}</span>
              <span className="kiosk-start-arrow" aria-hidden="true">→</span>
            </button>
            <KioskWeather />
          </div>
          <div className="kiosk-welcome-art" aria-hidden="true">
            <svg viewBox="0 0 360 400" role="presentation">
              <ellipse cx="184" cy="359" rx="122" ry="17" fill="#d9cdb8" opacity=".58" />
              <path d="M92 123h184l-17 193a23 23 0 0 1-23 21h-104a23 23 0 0 1-23-21L92 123Z" fill="#fffaf0" stroke="#573d33" strokeWidth="7" strokeLinejoin="round" />
              <path d="M100 178h168l-12 139a16 16 0 0 1-16 14h-103a16 16 0 0 1-16-14l-21-139Z" fill="#e9a164" />
              <path d="M154 35l32 192" fill="none" stroke="#573d33" strokeWidth="12" strokeLinecap="round" />
              <path d="M80 119h207" fill="none" stroke="#573d33" strokeWidth="9" strokeLinecap="round" />
              <circle cx="133" cy="281" r="13" fill="#573d33" />
              <circle cx="179" cy="296" r="13" fill="#573d33" />
              <circle cx="222" cy="277" r="13" fill="#573d33" />
              <circle cx="153" cy="326" r="12" fill="#573d33" />
              <circle cx="204" cy="328" r="12" fill="#573d33" />
              <circle cx="242" cy="309" r="11" fill="#573d33" />
              <path d="M65 78c-13-15-10-33 2-43M284 79c15-15 13-34 2-45" fill="none" stroke="#c97855" strokeWidth="7" strokeLinecap="round" />
            </svg>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="page-container customer-page" lang={selectedLanguage === 'zh' ? 'zh-CN' : selectedLanguage}>
      <header className="page-header">
        <h1>{t(selectedLanguage, 'customerScreen')}</h1>
        <div className="customer-header-actions">
          <span className="cart-count" aria-live="polite">{t(selectedLanguage, 'cartCount', { count: cartDrinkCount })}</span>
          <Link to="/" className="home-button">{t(selectedLanguage, 'home')}</Link>
        </div>
      </header>

      <main className={`page-content customer-page-content${checkoutStep !== 'menu' ? ' is-checkout-step' : ''}`}>
        {checkoutStep === 'payment' ? (
          <KioskPayment
            totalCents={totalCents}
            language={selectedLanguage}
            submitting={submittingOrder}
            error={submitError}
            onPay={submitOrder}
            onBack={() => { setSubmitError(''); resetRewards(); setCheckoutStep('rewards'); }}
          />
        ) : checkoutStep === 'redeem' && rewardsInfo && cheapestItem ? (
          <KioskRedeem
            points={rewardsInfo.points}
            redeemPoints={rewardsInfo.redeem_points}
            freeItem={cheapestItem}
            discountCents={Math.round(cheapestItem.unit_price * 100)}
            language={selectedLanguage}
            onRedeem={() => { setRedeemReward(true); setCheckoutStep('payment'); }}
            onSkip={() => { setRedeemReward(false); setCheckoutStep('payment'); }}
            onBack={() => { resetRewards(); setCheckoutStep('rewards'); }}
          />
        ) : checkoutStep !== 'menu' ? (
          <KioskCheckout
            step={checkoutStep}
            order={completedOrder}
            phone={rewardsPhone}
            language={selectedLanguage}
            onPhoneChange={setRewardsPhone}
            totalCents={totalCents}
            submitting={submittingOrder || lookingUpRewards}
            error={submitError}
            onContinue={continueFromRewards}
            onBack={() => { setSubmitError(''); resetRewards(); setCheckoutStep('menu'); }}
            onNewOrder={() => {
              setCompletedOrder(null);
              setRewardsPhone('');
              resetRewards();
              setSubmitError('');
              setCheckoutStep('menu');
            }}
          />
        ) : (
        <div className="customer-workspace">
          <MenuBrowser
            menuItems={menuItems}
            loading={loading}
            error={error}
            language={selectedLanguage}
            disabled={submittingOrder}
            onSelectItem={(item) => {
              setCompletedOrder(null);
              setSelectedItem(item);
            }}
          />
          <CartPanel
            cart={cart}
            drinkCount={cartDrinkCount}
            subtotalCents={subtotalCents}
            taxCents={taxCents}
            totalCents={totalCents}
            onUpdateQuantity={updateCartQuantity}
            onRemoveItem={removeCartItem}
            submitting={submittingOrder}
            submitError={submitError}
            completedOrder={completedOrder}
            submitLabel={t(selectedLanguage, 'continueCheckout')}
            language={selectedLanguage}
            onSubmitOrder={() => setCheckoutStep('rewards')}
          />
        </div>
        )}
      </main>

      {checkoutStep === 'menu' && <AssistantChat language={selectedLanguage} disabled={submittingOrder} onAddItems={addAssistantItems} />}

      {selectedItem && (
        <DrinkCustomizationModal
          customerFacing
          language={selectedLanguage}
          item={selectedItem}
          toppings={toppings}
          toppingsLoading={toppingsLoading}
          toppingsError={toppingsError}
          onClose={() => setSelectedItem(null)}
          onAddToCart={addToCart}
        />
      )}
    </div>
  );
}
