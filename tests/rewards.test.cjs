const { test } = require('node:test');
const assert = require('node:assert/strict');
const { submitOrder, getRewardsBalance, OrderRequestError } = require('../orderService');

// Menu item 1 costs $5.00, item 2 costs $6.00. Topping 1 is Tapioca Pearls (+$0.50).
function database({ points = 0 } = {}) {
  const log = [];
  const customer = { customer_id: 7, points };
  const client = {
    release() {},
    async query(sql, values) {
      log.push({ sql, values });
      if (sql.startsWith('SELECT menu_item_id')) return { rows: [{ menu_item_id: 1, price: '5.00' }, { menu_item_id: 2, price: '6.00' }].filter((row) => values[0].includes(row.menu_item_id)) };
      if (sql.startsWith('SELECT inventory_id, menu_item_id')) return { rows: [] };
      if (sql.startsWith('SELECT inventory_id, item_name')) return { rows: [{ inventory_id: 1, item_name: 'Tapioca Pearls', category: 'Topping', quantity_on_hand: 100 }] };
      if (sql.startsWith('SELECT customer_id, points')) return { rows: [{ ...customer }] };
      if (sql.startsWith('INSERT INTO orders')) return { rows: [{ order_id: 42 }] };
      return { rows: [] };
    }
  };
  const find = (prefix) => log.filter((entry) => entry.sql.startsWith(prefix));
  return { pool: { connect: async () => client, query: async () => ({ rows: points === null ? [] : [{ points }] }) }, log, find };
}

test('earns 1 point per whole dollar before tax and records the transaction', async () => {
  const db = database({ points: 10 });
  const order = await submitOrder(db.pool, [{ menu_item_id: 1, quantity: 2, toppings: [1] }], null, { phone: '(555) 123-4567' });
  // 2 x $5.50 = $11.00 subtotal -> 11 points.
  assert.equal(order.points_earned, 11);
  assert.equal(order.points_redeemed, 0);
  assert.equal(order.points_balance, 21);
  assert.equal(order.reward_discount, '0.00');
  assert.deepEqual(db.find('UPDATE customers')[0].values, [7, 21]);
  assert.deepEqual(db.find('INSERT INTO reward_transactions').map((e) => e.values), [[7, 42, 11]]);
  assert.equal(db.find('INSERT INTO orders')[0].values[4], 7);
  assert.equal(db.find('INSERT INTO customers')[0].values[0], '5551234567');
  assert.match(db.find('SELECT customer_id')[0].sql, /FOR UPDATE/);
});

test('redeeming 100 points makes the cheapest drink free and taxes the discounted subtotal', async () => {
  const db = database({ points: 120 });
  const order = await submitOrder(db.pool, [
    { menu_item_id: 2, quantity: 1, toppings: [] },
    { menu_item_id: 1, quantity: 2, toppings: [] }
  ], null, { phone: '5551234567', redeem: true });
  // Subtotal $16.00, one $5.00 drink free -> $11.00 taxable, tax $0.91.
  assert.equal(order.subtotal, '16.00');
  assert.equal(order.reward_discount, '5.00');
  assert.equal(order.tax, '0.91');
  assert.equal(order.total, '11.91');
  assert.equal(order.points_redeemed, 100);
  assert.equal(order.points_earned, 11);
  assert.equal(order.points_balance, 31);
  assert.deepEqual(db.find('INSERT INTO reward_transactions').map((e) => e.values), [[7, 42, -100], [7, 42, 11]]);
});

test('rejects redemption without enough points and rolls back', async () => {
  const db = database({ points: 99 });
  await assert.rejects(
    submitOrder(db.pool, [{ menu_item_id: 1, quantity: 1 }], null, { phone: '5551234567', redeem: true }),
    (error) => error instanceof OrderRequestError && error.statusCode === 409
  );
  assert.ok(db.log.some((e) => e.sql === 'ROLLBACK'));
  assert.equal(db.find('INSERT INTO orders').length, 0);
});

test('orders without a phone behave as before and never touch rewards tables', async () => {
  const db = database();
  const order = await submitOrder(db.pool, [{ menu_item_id: 1, quantity: 1 }]);
  assert.equal(order.points_earned, undefined);
  assert.equal(order.total, '5.41');
  assert.equal(db.find('INSERT INTO customers').length, 0);
  assert.equal(db.find('INSERT INTO orders')[0].values[4], null);
});

test('validates phone numbers and requires one to redeem', async () => {
  const db = database();
  await assert.rejects(submitOrder(db.pool, [{ menu_item_id: 1, quantity: 1 }], null, { phone: '123' }), /10-digit/);
  await assert.rejects(submitOrder(db.pool, [{ menu_item_id: 1, quantity: 1 }], null, { redeem: true }), /phone number is required/);
  const order = await submitOrder(db.pool, [{ menu_item_id: 1, quantity: 1 }], null, { phone: '1-555-123-4567' });
  assert.equal(order.points_earned, 5);
});

test('balance lookup reports points and redeemability', async () => {
  assert.deepEqual(await getRewardsBalance(database({ points: 100 }).pool, '555-123-4567'), { points: 100, redeem_points: 100, can_redeem: true });
  assert.deepEqual(await getRewardsBalance(database({ points: null }).pool, '5551234567'), { points: 0, redeem_points: 100, can_redeem: false });
  await assert.rejects(getRewardsBalance(database().pool, 'abc'), /10-digit/);
});
