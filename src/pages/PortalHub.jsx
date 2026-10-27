import React from 'react';
import { Link } from 'react-router-dom';
import './pages.css';

export default function PortalHub() {
  return (
    <div className="hub-container">
      <h1>Bubble Tea POS System</h1>
      <p className="subtitle">Select a view:</p>

      <div className="button-grid">
        <Link to="/cashier" className="hub-button">
          <h2>Cashier Screen</h2>
          <p>Process orders and payments</p>
        </Link>

        <Link to="/manager" className="hub-button">
          <h2>Manager Dashboard</h2>
          <p>View analytics and reports</p>
        </Link>

        <Link to="/kiosk" className="hub-button">
          <h2>Customer Kiosk</h2>
          <p>Self-service ordering</p>
        </Link>

        <Link to="/kitchen" className="hub-button">
          <h2>Kitchen Display</h2>
          <p>View and manage orders</p>
        </Link>
      </div>
    </div>
  );
}
