import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import OrderTicket from '../components/kitchen/OrderTicket';
import './pages.css';

const POLL_MS = 5000;

const COLUMNS = [
  { status: 'pending', title: 'New' },
  { status: 'preparing', title: 'Preparing' },
  { status: 'ready', title: 'Ready for Pickup' }
];

export default function KitchenDisplay() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyIds, setBusyIds] = useState(() => new Set());

  const loadOrders = useCallback(async () => {
    try {
      const response = await fetch('/api/kitchen/orders');
      if (!response.ok) throw new Error('Unable to load orders.');
      const data = await response.json();
      if (!Array.isArray(data.orders)) throw new Error('Unexpected orders response.');
      setOrders(data.orders);
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Unable to load orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    const timer = setInterval(loadOrders, POLL_MS);
    return () => clearInterval(timer);
  }, [loadOrders]);

  async function updateStatus(orderId, status) {
    setActionError('');
    setBusyIds((current) => new Set(current).add(orderId));
    try {
      const response = await fetch(`/api/kitchen/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Unable to update the order.');
      }
      // Update locally right away so the ticket moves without waiting for the next poll.
      setOrders((current) => (
        status === 'completed'
          ? current.filter((order) => order.order_id !== orderId)
          : current.map((order) => (order.order_id === orderId ? { ...order, status } : order))
      ));
    } catch (updateError) {
      setActionError(updateError.message || 'Unable to update the order.');
    } finally {
      setBusyIds((current) => {
        const next = new Set(current);
        next.delete(orderId);
        return next;
      });
    }
  }

  const activeCount = orders.filter((order) => order.status !== 'ready').length;
  const errorMessage = error ? `${error} Retrying…` : actionError;

  return (
    <div className="page-container cashier-page kitchen-page">
      <header className="page-header">
        <h1>Kitchen Display</h1>
        <div className="cashier-header-actions">
          {errorMessage && <span className="menu-error" role="alert">{errorMessage}</span>}
          <span className="cart-count" aria-live="polite">To make: {activeCount}</span>
          <Link to="/" className="home-button">Home</Link>
        </div>
      </header>

      <main className="page-content cashier-page-content">
        {loading ? (
          <p className="menu-message" role="status">Loading orders…</p>
        ) : (
          <div className="cashier-workspace kitchen-board">
            {COLUMNS.map((column) => {
              const columnOrders = orders.filter((order) => order.status === column.status);
              return (
                <section className="cashier-cart" key={column.status} aria-label={column.title}>
                  <header className="cashier-cart-header">
                    <h2>{column.title}</h2>
                    <span>{columnOrders.length}</span>
                  </header>
                  {columnOrders.length === 0 ? (
                    <p className="cart-empty-message">No orders.</p>
                  ) : (
                    <ul className="cart-items">
                      {columnOrders.map((order) => (
                        <OrderTicket
                          key={order.order_id}
                          order={order}
                          busy={busyIds.has(order.order_id)}
                          onUpdateStatus={updateStatus}
                        />
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
