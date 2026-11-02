const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function api(query) {
  const routes = {};
  const app = { use() {}, get(path, handler) { routes[`GET ${path}`] = handler; }, patch(path, handler) { routes[`PATCH ${path}`] = handler; }, post() {}, listen() {} };
  const express = Object.assign(() => app, { static() {}, json() {} });
  vm.runInNewContext(fs.readFileSync(require.resolve('../index.js'), 'utf8'), {
    require(name) {
      if (name === 'express') return express;
      if (name === 'pg') return { Pool: function () { this.query = query; } };
      if (name === 'dotenv') return { config() {} };
      return require(name === './orderService' ? '../orderService' : name);
    },
    process: { env: {}, on() {} }, __dirname: __dirname, console: { error() {} }
  });
  return routes;
}
function response() {
  return { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
}

test('inventory GET returns database stock and thresholds', async () => {
  const rows = [{ inventory_id: 1, quantity_on_hand: 12, reorder_threshold: 20 }];
  const routes = api(async (sql) => { assert.match(sql, /reorder_threshold/); return { rows }; });
  const res = response();
  await routes['GET /api/inventory']({}, res);
  assert.equal(res.body.inventory, rows);
});

test('PATCH rejects invalid quantities without querying the database', async () => {
  const routes = api(() => { throw new Error('Must not query'); });
  for (const quantity of [-1, 1.5, '12', null, 2147483648]) {
    const res = response();
    await routes['PATCH /api/inventory/:id']({ params: { id: '1' }, body: { quantity_on_hand: quantity, expected_quantity: 10 } }, res);
    assert.equal(res.code, 400);
  }
});

test('PATCH supports zero stock and uses optimistic concurrency', async () => {
  const routes = api(async (sql, values) => {
    assert.match(sql, /AND quantity_on_hand = \$3/);
    assert.deepEqual(Array.from(values), [0, 1, 10]);
    return { rows: [{ inventory_id: 1, quantity_on_hand: 0 }] };
  });
  const res = response();
  await routes['PATCH /api/inventory/:id']({ params: { id: '1' }, body: { quantity_on_hand: 0, expected_quantity: 10 } }, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.item.quantity_on_hand, 0);
});

test('PATCH reports concurrent changes and database failures', async () => {
  for (const [query, code] of [[async () => ({ rows: [] }), 409], [async () => { throw new Error('Database unavailable'); }, 500]]) {
    const routes = api(query);
    const res = response();
    await routes['PATCH /api/inventory/:id']({ params: { id: '1' }, body: { quantity_on_hand: 5, expected_quantity: 10 } }, res);
    assert.equal(res.code, code);
  }
});
