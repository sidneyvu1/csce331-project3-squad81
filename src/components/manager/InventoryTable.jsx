import React, { useState } from 'react';

export function inventoryStatus(item) {
  if (item.quantity_on_hand === 0) return 'Critical';
  if (item.reorder_threshold == null) return 'Not configured';
  if (item.quantity_on_hand <= item.reorder_threshold / 2) return 'Critical';
  return item.quantity_on_hand <= item.reorder_threshold ? 'Low' : 'Good';
}

function InventoryRow({ item, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const status = inventoryStatus(item);
  async function save(event) {
    event.preventDefault();
    if (!/^\d+$/.test(quantity) || Number(quantity) > 2147483647) {
      setError('Enter a nonnegative whole number.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onUpdate(item, Number(quantity));
      setEditing(false);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <tr>
      <th scope="row">{item.item_name}<small>{item.category}</small></th>
      <td>{item.quantity_on_hand.toLocaleString()} <small>{item.unit}</small></td>
      <td>{item.reorder_threshold == null ? 'Not set' : item.reorder_threshold.toLocaleString()} <small>{item.unit}</small></td>
      <td><span className={`inventory-status status-${status.toLowerCase().replace(' ', '-')}`}>{status}</span></td>
      <td>
        {editing ? (
          <form onSubmit={save} className="inventory-edit">
            <label className="inventory-quantity-label">New quantity for {item.item_name}
              <input type="number" min="0" max="2147483647" step="1" required value={quantity} disabled={saving} onChange={(event) => setQuantity(event.target.value)} autoFocus />
            </label>
            <div className="inventory-edit-actions">
              <button className="manager-small-button" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              <button className="manager-small-button" type="button" disabled={saving} onClick={() => setEditing(false)}>Cancel</button>
            </div>
            {error && <p className="menu-error" role="alert">{error}</p>}
          </form>
        ) : <button type="button" className="manager-small-button" aria-label={`Update ${item.item_name}`} onClick={() => { setQuantity(String(item.quantity_on_hand)); setError(''); setEditing(true); }}>Update</button>}
      </td>
    </tr>
  );
}

export default function InventoryTable({ items, onUpdate }) {
  return (
    <div className="inventory-table-scroll">
      <table className="inventory-table">
        <caption className="inventory-table-caption">Stock quantities and reorder levels</caption>
        <thead><tr><th scope="col">Item</th><th scope="col">Current Quantity</th><th scope="col">Reorder Level</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead>
        <tbody>{items.map((item) => <InventoryRow key={item.inventory_id} item={item} onUpdate={onUpdate} />)}</tbody>
      </table>
    </div>
  );
}
