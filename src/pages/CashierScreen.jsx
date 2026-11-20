import { useStaff, StaffControls } from '../auth/StaffAuth';
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import CashierOrderBoard from '../components/cashier/CashierOrderBoard';
import './pages.css';

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

export default function CashierScreen() {
  const { request: staffFetch } = useStaff();
  const nextCartItemId = useRef(1);
  const [cart, setCart] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [toppings, setToppings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toppingsLoading, setToppingsLoading] = useState(true);
  const [error, setError] = useState('');
  const [toppingsError, setToppingsError] = useState('');
  const [popularIds, setPopularIds] = useState([]);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [completedOrder, setCompletedOrder] = useState(null);

  const cartDrinkCount = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotalCents = cart.reduce(
    (total, item) => total + Math.round(item.unit_price * 100) * item.quantity,
    0
  );
  const taxCents = Math.round(subtotalCents * 0.0825);
  const totalCents = subtotalCents + taxCents;

  function addToCart(item) {
    setCompletedOrder(null);
    setSubmitError('');
    setCart((current) => [...current, { ...item, id: nextCartItemId.current++ }]);
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

  async function submitOrder() {
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
      const response = await staffFetch('/api/staff/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: orderItems })
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
      setCompletedOrder(data.order);
      try {
        setToppings(await fetchToppings());
        setToppingsError('');
      } catch (refreshError) {
        setToppingsError(
          refreshError.message || 'Order was submitted, but topping stock could not be refreshed.'
        );
      }
    } catch (submitFailure) {
      setSubmitError(submitFailure.message || 'Unable to submit the order. Please try again.');
    } finally {
      setSubmittingOrder(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadMenu() {
      try {
        const response = await staffFetch('/api/menu');
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

    async function loadPopular() {
      try {
        const response = await fetch('/api/menu/popular');
        if (!response.ok) return;
        const data = await response.json();
        if (active && Array.isArray(data.popularIds)) setPopularIds(data.popularIds);
      } catch {
        // Popular drinks are a convenience; the board falls back to the menu order.
      }
    }

    loadPopular();
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

  return (
    <div className="page-container cashier-page">
      <header className="page-header">
        <h1>Cashier Screen</h1>
        <div className="cashier-header-actions">
          <span className="cart-count" aria-live="polite">Cart: {cartDrinkCount}</span>
          <StaffControls /><Link to="/" className="home-button">Home</Link>
        </div>
      </header>

      <main className="page-content cashier-page-content">
        <CashierOrderBoard
          menuItems={menuItems}
          popularIds={popularIds}
          loading={loading}
          error={error}
          toppings={toppings}
          toppingsLoading={toppingsLoading}
          toppingsError={toppingsError}
          disabled={submittingOrder}
          onAddToCart={addToCart}
          cartProps={{
            cart,
            drinkCount: cartDrinkCount,
            subtotalCents,
            taxCents,
            totalCents,
            onUpdateQuantity: updateCartQuantity,
            onRemoveItem: removeCartItem,
            submitting: submittingOrder,
            submitError,
            completedOrder,
            onSubmitOrder: submitOrder
          }}
        />
      </main>
    </div>
  );
}
