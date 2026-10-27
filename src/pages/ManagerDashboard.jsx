import React from 'react';
import { Link } from 'react-router-dom';
import './pages.css';

export default function ManagerDashboard() {
  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Manager Dashboard</h1>
        <Link to="/" className="home-button">Home</Link>
      </header>

      <main className="page-content">
        <p>Manager Dashboard content will go here</p>
      </main>
    </div>
  );
}
