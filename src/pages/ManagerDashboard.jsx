import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import InventoryTable, { inventoryStatus } from '../components/manager/InventoryTable';
import './pages.css';

async function inventoryRequest(path = '', options) {
  const response = await fetch(`/api/inventory${path}`, options);
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('Unable to load inventory.');
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to load inventory.');
  return data;
}

export default function ManagerDashboard() {
  const [section, setSection] = useState('Inventory');
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [search, setSearch] = useState('');

  async function loadInventory() {
    setLoading(true);
    setError('');
    try {
      const data = await inventoryRequest();
      if (!Array.isArray(data.inventory)) throw new Error('Invalid inventory response.');
      setInventory(data.inventory);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { loadInventory(); }, []);

  async function updateQuantity(item, quantity) {
    const data = await inventoryRequest(`/${item.inventory_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity_on_hand: quantity, expected_quantity: item.quantity_on_hand })
    });
    setInventory((current) => current.map((entry) => entry.inventory_id === data.item.inventory_id ? data.item : entry));
    setNotice(`${item.item_name} quantity updated.`);
  }

  const restock = inventory.filter((item) => ['Low', 'Critical'].includes(inventoryStatus(item)));
  const criticalCount = restock.filter((item) => inventoryStatus(item) === 'Critical').length;
  const visible = inventory.filter((item) => (!lowOnly || restock.includes(item)) && `${item.item_name} ${item.category}`.toLowerCase().includes(search.toLowerCase()));
  const metrics = [['Inventory Items', inventory.length], ['Low Stock', restock.length - criticalCount], ['Critical Items', criticalCount], ['Need Restock', restock.length]];

  return (
    <div className="page-container manager-page">
      <header className="page-header">
        <div><h1>Manager Dashboard</h1><p className="manager-subtitle">Manage inventory, menu items, employees, and reports.</p></div>
        <div className="cashier-header-actions"><span>Peter Castillo</span><Link to="/" className="home-button">Home</Link></div>
      </header>
      <main className="page-content manager-content">
        <nav className="manager-nav" aria-label="Manager sections">
          {['Overview', 'Inventory', 'Menu', 'Employees', 'Reports'].map((name) => (
            <button type="button" key={name} className={`menu-category${section === name ? ' is-selected' : ''}`} aria-current={section === name ? 'page' : undefined} onClick={() => setSection(name)}>{name}</button>
          ))}
        </nav>
        {(section === 'Inventory' || section === 'Overview') ? <>
          <div className="manager-metrics">{metrics.map(([label, value]) => <article className="manager-metric" key={label}><strong>{loading || error ? '—' : value}</strong><span>{label}</span></article>)}</div>
          <div className="manager-workspace">
            <section className="cashier-menu manager-inventory" aria-labelledby="inventory-title" aria-busy={loading}>
              <div className="cashier-menu-heading"><h2 id="inventory-title">{section === 'Overview' ? 'Inventory Overview' : 'Inventory'}</h2><p>Monitor current ingredient and supply levels.</p></div>
              <div className="inventory-toolbar">
                <label>Search inventory<input type="search" placeholder="Search items or categories" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
                <label className="inventory-filter"><input type="checkbox" checked={lowOnly} onChange={(event) => setLowOnly(event.target.checked)} /> Low stock only</label>
                <button type="button" className="manager-small-button" disabled={loading} onClick={loadInventory}>Refresh</button>
              </div>
              <p className="inventory-help">Reorder level is the configured stock threshold, not a target quantity. Critical means zero stock or at most half the reorder level.</p>
              {notice && <p role="status" className="order-submit-success">{notice}</p>}
              {loading ? <p role="status">Loading inventory…</p> : error ? null : visible.length ? <InventoryTable items={visible} onUpdate={updateQuantity} /> : <p className="menu-message">{inventory.length ? 'No items match your filters.' : 'No inventory items available.'}</p>}
            </section>
            <aside className="cashier-cart manager-insights" aria-labelledby="insights-title">
              <header className="cashier-cart-header"><h2 id="insights-title">Inventory Insights</h2></header>
              <section><h3>Weekly Activity</h3><p>Weekly trends are unavailable until inventory history is connected.</p></section>
              <section><h3>Today</h3><p>Daily trends are unavailable until inventory history is connected.</p></section>
              <section><h3>Restock Recommendations</h3>
                {loading ? <p>Loading recommendations…</p> : error ? <p>Inventory is unavailable.</p> : restock.length ? <ul className="inventory-restock">{restock.map((item) => <li key={item.inventory_id}><strong>{item.item_name}</strong><span>{item.quantity_on_hand} {item.unit} remaining · {inventoryStatus(item)}</span></li>)}</ul> : <p>All configured stock levels are above their reorder thresholds.</p>}
              </section>
              <button type="button" className="submit-order-button" disabled={loading || Boolean(error)} onClick={() => { setSection('Inventory'); setSearch(''); setLowOnly(true); document.getElementById('inventory-title')?.scrollIntoView({ behavior: 'smooth' }); }}>Review Low Stock</button>
            </aside>
          </div>
        </> : <section className="cashier-menu manager-placeholder"><div className="cashier-menu-heading"><h2>{section}</h2><p>{section} management is not available yet. Inventory management is ready to use.</p></div><button className="manager-small-button" type="button" onClick={() => setSection('Inventory')}>Go to Inventory</button></section>}
      </main>
    </div>
  );
}
