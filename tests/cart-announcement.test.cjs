const { test } = require('node:test');
const assert = require('node:assert/strict');
const load = () => import('../src/components/accessibility/cartAnnouncement.mjs');

test('cart additions announce quantity and the full total without notes', async () => {
  const { cartAnnouncement } = await load();
  const message = cartAnnouncement([], [{ id: 1, name: 'Milk Tea', quantity: 2, notes: 'private information' }], 1353);
  assert.match(message, /Added 2 Milk Tea/);
  assert.match(message, /Cart: 2 drinks/);
  assert.match(message, /including tax: \$13.53/);
  assert.doesNotMatch(message, /private information/);
});
test('quantity edits, removals and empty carts are announced', async () => {
  const { cartAnnouncement } = await load();
  const item = { id: 1, name: 'Milk Tea', quantity: 2 };
  assert.match(cartAnnouncement([item], [{ ...item, quantity: 1 }], 650), /quantity is now 1.*Cart: 1 drink/);
  assert.match(cartAnnouncement([item], [], 0), /Removed Milk Tea.*Cart: 0 drinks.*\$0.00/);
});
test('unchanged carts remain silent and assistant additions include every drink', async () => {
  const { cartAnnouncement } = await load();
  const first = { id: 1, name: 'Milk Tea', quantity: 1 };
  const second = { id: 2, name: 'Matcha', quantity: 2 };
  assert.equal(cartAnnouncement([first], [first], 500), '');
  const message = cartAnnouncement([], [first, second], 1500);
  assert.match(message, /Added 1 Milk Tea/);
  assert.match(message, /Added 2 Matcha/);
  assert.match(message, /Cart: 3 drinks/);
});
