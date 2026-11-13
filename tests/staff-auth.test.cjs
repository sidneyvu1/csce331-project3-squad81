const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createStaffAuth } = require('../staffAuth');

function response() {
  return { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
}

test('missing authentication configuration denies staff access', () => {
  const { requireRoles } = createStaffAuth({ query() { throw new Error('Unexpected query'); } }, {});
  const res = response();
  requireRoles('manager')[0]({}, res, () => assert.fail('Must not authorize'));
  assert.equal(res.code, 503);
});

test('configured JWT verification rejects missing bearer tokens', async () => {
  const { requireRoles } = createStaffAuth({}, { AUTH0_ISSUER_BASE_URL: 'https://example.auth0.com/', AUTH0_AUDIENCE: 'https://pos-api' });
  const error = await new Promise((resolve) => requireRoles('manager')[0]({ headers: {}, query: {}, body: {}, method: 'GET', protocol: 'http', originalUrl: '/api/inventory', get: (name) => name === 'Host' ? 'localhost:3000' : undefined, is: () => false }, response(), resolve));
  assert.equal(error.status, 401);
});

test('only active staff with an allowed database role pass authorization', async () => {
  for (const [staff, expected] of [[undefined, 403], [{ role: 'cashier' }, 403], [{ role: 'manager', employee_id: 7 }, 200]]) {
    const pool = { async query(sql, values) {
      assert.match(sql, /active = TRUE/);
      assert.deepEqual(values, ['auth0|verified']);
      return { rows: staff ? [staff] : [] };
    } };
    const handler = createStaffAuth(pool, {}).requireRoles('manager')[1];
    const req = { auth: { payload: { sub: 'auth0|verified' } }, body: { role: 'manager', employee_id: 999 } };
    const res = response();
    let allowed = false;
    await handler(req, res, () => { allowed = true; });
    assert.equal(res.code, expected);
    assert.equal(allowed, expected === 200);
    if (allowed) assert.equal(req.staff.employee_id, 7);
  }
});

test('role checks fail closed if database is unavailable', async () => {
  const handler = createStaffAuth({ query: async () => { throw new Error('Unavailable'); } }, {}).requireRoles('manager')[1];
  const res = response();
  await handler({ auth: { payload: { sub: 'auth0|verified' } } }, res, () => assert.fail('Must not authorize'));
  assert.equal(res.code, 503);
});
