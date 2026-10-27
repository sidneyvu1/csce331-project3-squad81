import React from 'react';
import { Link } from 'react-router-dom';
import './pages.css';

export default function CashierScreen() {
  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Cashier Screen</h1>
        <Link to="/" className="home-button">Home</Link>
      </header>

      <main className="page-content">
        <p>Cashier Screen content will go here</p>
      </main>
    </div>
  );
}
