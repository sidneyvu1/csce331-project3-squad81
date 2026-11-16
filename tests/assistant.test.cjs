const { test } = require('node:test');
const assert = require('node:assert/strict');
const { runAssistant, createRateLimiter, normalizeMessages, AssistantRequestError } = require('../assistantService');

const pool = {
  async query(sql) {
    if (sql.includes('FROM menu_items')) return { rows: [{ menu_item_id: 1, name: 'Classic Milk Tea', category: 'Milk Tea', price: '5.00' }] };
    return { rows: [
      { inventory_id: 10, name: 'Tapioca Pearls', quantity_on_hand: 5 },
      { inventory_id: 11, name: 'Pudding', quantity_on_hand: 0 },
      { inventory_id: 12, name: 'Mystery Topping', quantity_on_hand: 5 }
    ] };
  }
};

function gemini(...replies) {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, options, body: JSON.parse(options.body) });
    return { ok: true, status: 200, json: async () => replies.shift() };
  };
  return { fetchImpl, requests };
}
const text = (value) => ({ candidates: [{ content: { role: 'model', parts: [{ text: value }] } }] });
const call = (args) => ({ candidates: [{ content: { role: 'model', parts: [{ functionCall: { name: 'add_to_cart', args } }] } }] });
const ask = (fetchImpl) => runAssistant(pool, [{ role: 'user', text: 'hi' }], { apiKey: 'k', fetchImpl });

test('answers a menu question and keeps the key in a header, not the URL', async () => {
  const { fetchImpl, requests } = gemini(text('We have Classic Milk Tea.'));
  const result = await ask(fetchImpl);
  assert.equal(result.reply, 'We have Classic Milk Tea.');
  assert.deepEqual(result.cartItems, []);
  assert.equal(requests[0].options.headers['x-goog-api-key'], 'k');
  assert.ok(!requests[0].url.includes('k='));
  const prompt = requests[0].body.systemInstruction.parts[0].text;
  assert.match(prompt, /Classic Milk Tea/);
  assert.match(prompt, /Pudding.*OUT OF STOCK/);
  assert.doesNotMatch(prompt, /Mystery Topping/);
});

test('add_to_cart is validated and priced server-side', async () => {
  const { fetchImpl } = gemini(call({ menu_item_id: 1, quantity: 2, topping_ids: [10], sugar_level: '50%' }), text('Added!'));
  const result = await ask(fetchImpl);
  assert.equal(result.reply, 'Added!');
  assert.deepEqual(result.cartItems, [{
    menu_item_id: 1, name: 'Classic Milk Tea', quantity: 2, unit_price: 5.5,
    toppings: [{ inventory_id: 10, name: 'Tapioca Pearls', price_cents: 50 }],
    sugar_level: '50%', ice_level: 'Regular', notes: ''
  }]);
});

test('rejects unknown drinks, out-of-stock toppings and bad quantities, and tells the model', async () => {
  const { fetchImpl, requests } = gemini(
    call({ menu_item_id: 999 }), call({ menu_item_id: 1, topping_ids: [11] }), call({ menu_item_id: 1, quantity: 99 }), text('Sorry.')
  );
  const result = await ask(fetchImpl);
  assert.deepEqual(result.cartItems, []);
  const errors = requests.slice(1).map((r) => r.body.contents.at(-1).parts[0].functionResponse.response.error);
  assert.match(errors[0], /does not exist/);
  assert.match(errors[1], /out of stock/);
  assert.match(errors[2], /quantity/);
});

test('stops after a bounded number of tool rounds', async () => {
  const { fetchImpl, requests } = gemini(...Array(10).fill(call({ menu_item_id: 1 })));
  const result = await ask(fetchImpl);
  assert.equal(requests.length, 4);
  assert.equal(result.cartItems.length, 4);
});

test('requires configuration and valid messages', async () => {
  await assert.rejects(runAssistant(pool, [{ role: 'user', text: 'hi' }], {}), (e) => e instanceof AssistantRequestError && e.statusCode === 503);
  assert.throws(() => normalizeMessages([]), AssistantRequestError);
  assert.throws(() => normalizeMessages([{ role: 'system', text: 'x' }]), AssistantRequestError);
  assert.throws(() => normalizeMessages([{ role: 'user', text: 'x' }, { role: 'assistant', text: 'y' }]), AssistantRequestError);
  assert.equal(normalizeMessages([{ role: 'assistant', text: 'welcome' }, { role: 'user', text: 'x'.repeat(900) }]).length, 1);
});

test('upstream failures become safe errors', async () => {
  const fetchImpl = async () => ({ ok: false, status: 429, text: async () => 'quota' });
  await assert.rejects(ask(fetchImpl), (e) => e.statusCode === 429 && !/quota/.test(e.message));
});

test('rate limiter blocks bursts and recovers', () => {
  let time = 0;
  const allow = createRateLimiter({ limit: 2, windowMs: 1000, now: () => time });
  assert.ok(allow('a')); assert.ok(allow('a')); assert.ok(!allow('a')); assert.ok(allow('b'));
  time = 1500;
  assert.ok(allow('a'));
});
