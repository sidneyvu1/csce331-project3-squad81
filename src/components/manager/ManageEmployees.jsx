import React, { useState } from 'react';


function EmployeesRow({ employee, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save(event) {
    event.preventDefault();
  
    setSaving(true);
    setError('');
    try {
      // await onUpdate(item, Number(quantity));
      setEditing(false);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <tr>
      <th scope="row">{employee.employee_id}</th>
      <td> {employee.first_name}</td>
      <td> {employee.last_name}</td>
      <td> {employee.role}</td>
      <td> {employee.hourly_wage}</td>
      {/* <td>
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
      </td> */}
    </tr>
  );
}

export default function ManageEmployees({ employees, onUpdate }) {
  return (
    <div className="inventory-table-scroll">
      <table className="inventory-table">
        <caption className="inventory-table-caption">Employees</caption>
        <thead><tr><th scope="col">ID</th><th scope="col">First Name</th><th scope="col">Last Name</th><th scope="col">Role</th><th scope="col">Wage</th></tr></thead>
        <tbody>{employees.map((employee) => <EmployeesRow key={employee.employee_id} employee={employee} onUpdate={onUpdate} />)}</tbody>
      </table>
    </div>
  );
}

//double check all items cleared