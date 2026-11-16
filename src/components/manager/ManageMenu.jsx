import React, { useState } from 'react';


function MenuRow({ menu_item, onUpdate }) {
//   const [editing, setEditing] = useState(false);
//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState('');

  async function save(event) {
    event.preventDefault();
  
    setSaving(true);
    setError('');
    try {
      setEditing(false);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <tr>
      <th scope="row">{menu_item.menu_item_id}</th>
      <td> {menu_item.name}</td>
      <td> {menu_item.category}</td>
      <td> {menu_item.price}</td>
    </tr>
  );
}


export default function ManageMenu({ menuItems, onUpdate }) {
  return (
    <div className="inventory-table-scroll">
      <table className="inventory-table">
        <caption className="inventory-table-caption">Menu</caption>
        <thead><tr><th scope="col">ID</th><th scope="col">Name</th><th scope="col">Category</th><th scope="col">Price</th></tr></thead>
        <tbody>{menuItems.map((menu_item) => <MenuRow key={menu_item.menu_item_id} menu_item={menu_item} onUpdate={onUpdate} />)}</tbody>
      </table>
    </div>
  );
}
