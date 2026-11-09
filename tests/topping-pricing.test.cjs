const { test } = require('node:test');
const assert = require('node:assert/strict');
const { submitOrder } = require('../orderService');
const { toppingPriceCents } = require('../toppingPrices');

const names = ['Coffee Jelly', 'Crystal Boba', 'Halo Halo Topping Mix', 'Honey Jelly', 'Lychee Jelly', 'Oreo Cookie Crumbs', 'Pudding', 'Tapioca Pearls'];
test('recommended topping prices are configured in cents', () => {
  assert.deepEqual(names.map(toppingPriceCents), [75, 75, 100, 75, 75, 50, 75, 50]);
  assert.equal(toppingPriceCents('Unknown topping'), null);
});

function database(toppingNames) {
  const insertedItems = [];
  const commands = [];
  const client = {
    release() {},
    async query(sql, values) {
      commands.push(sql);
      if (sql.startsWith('SELECT menu_item_id')) return { rows: [{ menu_item_id: 1, price: '5.00' }] };
      if (sql.startsWith('SELECT inventory_id, menu_item_id')) return { rows: [] };
      if (sql.startsWith('SELECT inventory_id, item_name')) return { rows: toppingNames.map((name, index) => ({ inventory_id: index + 1, item_name: name, category: 'Topping', quantity_on_hand: 100 })) };
      if (sql.startsWith('INSERT INTO orders')) return { rows: [{ order_id: 42 }] };
      if (sql.startsWith('INSERT INTO order_items')) insertedItems.push(values);
      return { rows: [] };
    }
  };
  return { pool: { connect: async () => client }, insertedItems, commands };
}

test('charges all toppings per drink, taxes the subtotal, and saves inclusive unit prices', async () => {
  const db = database(names);
  const order = await submitOrder(db.pool, [
    { menu_item_id: 1, quantity: 2, toppings: names.map((_, i) => i + 1), unit_price: 0 },
    { menu_item_id: 1, quantity: 1, toppings: [] }
  ]);
  // All eight toppings cost $5.75 per drink: 2 × $10.75 + $5 = $26.50.
  assert.equal(order.subtotal, '26.50');
  assert.equal(order.tax, '2.19');
  assert.equal(order.total, '28.69');
  assert.equal(db.insertedItems[0][3], '10.75');
  assert.equal(db.insertedItems[1][3], '5.00');
  assert.equal(JSON.parse(db.insertedItems[0][4])[0].price_cents, 75);
  assert.ok(db.commands.includes('COMMIT'));
});

test('unpriced toppings fail without creating an order', async () => {
  const db = database(['Unknown topping']);
  await assert.rejects(submitOrder(db.pool, [{ menu_item_id: 1, quantity: 1, toppings: [1] }]), /not currently available/);
  assert.ok(db.commands.includes('ROLLBACK'));
  assert.ok(!db.commands.some((sql) => sql.startsWith('INSERT INTO orders')));
});
