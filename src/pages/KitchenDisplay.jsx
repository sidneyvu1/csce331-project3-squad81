import React from 'react';
import { Link } from 'react-router-dom';
import './pages.css';

export default function KitchenDisplay() {
  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Kitchen Display</h1>
        <Link to="/" className="home-button">Home</Link>
      </header>

      <main className="page-content">
        <p>Kitchen Display content will go here</p>
      </main>
    </div>
  );
}
