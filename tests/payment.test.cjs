const { test } = require('node:test');
const assert = require('node:assert/strict');
const { submitOrder } = require('../orderService');

// Menu item 1 costs $5.00.
function database() {
  const log = [];
  const client = {
    release() {},
    async query(sql, values) {
      log.push({ sql, values });
      if (sql.startsWith('SELECT menu_item_id')) return { rows: [{ menu_item_id: 1, price: '5.00' }] };
      if (sql.startsWith('SELECT inventory_id, menu_item_id')) return { rows: [] };
      if (sql.startsWith('SELECT inventory_id, item_name')) return { rows: [] };
      if (sql.startsWith('SELECT customer_id, points')) return { rows: [{ customer_id: 7, points: 100 }] };
      if (sql.startsWith('INSERT INTO orders')) return { rows: [{ order_id: 42 }] };
      return { rows: [] };
    }
  };
  return { pool: { connect: async () => client, query: async () => ({ rows: [] }) }, insert: () => log.find((e) => e.sql.startsWith('INSERT INTO orders')).values };
}

const items = [{ menu_item_id: 1, quantity: 1 }];

test('a card payment is recorded as a paid card order', async () => {
  const db = database();
  const order = await submitOrder(db.pool, items, null, null, { method: 'card' });
  assert.deepEqual(db.insert().slice(5), ['Card', true]);
  assert.equal(order.payment_type, 'Card');
  assert.equal(order.is_paid, true);
});

test('paying at the counter is recorded as unpaid until the customer pays', async () => {
  const db = database();
  const order = await submitOrder(db.pool, items, null, null, { method: 'counter' });
  assert.deepEqual(db.insert().slice(5), ['Counter', false]);
  assert.equal(order.is_paid, false);
});

test('a fully rewarded order is recorded as paid by rewards', async () => {
  const db = database();
  const order = await submitOrder(db.pool, items, null, { phone: '5551234567', redeem: true }, { method: 'rewards' });
  assert.equal(order.total, '0.00');
  assert.deepEqual(db.insert().slice(5), ['Rewards', true]);
});

test('rewards cannot be claimed as the payment for an order with a balance', async () => {
  await assert.rejects(submitOrder(database().pool, items, null, null, { method: 'rewards' }), /nothing left to pay/);
});

test('rejects a missing or unknown payment method from the kiosk', async () => {
  await assert.rejects(submitOrder(database().pool, items, null, null, { method: undefined }), /valid payment method/);
  await assert.rejects(submitOrder(database().pool, items, null, null, { method: 'bitcoin' }), /valid payment method/);
});

test('staff orders without payment info keep the register defaults', async () => {
  const db = database();
  const order = await submitOrder(db.pool, items);
  assert.deepEqual(db.insert().slice(5), [null, null]);
  assert.equal(order.payment_type, undefined);
});
