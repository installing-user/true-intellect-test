import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { after, before, test } from 'node:test';
import pg from 'pg';
import { startApp, type TestContext } from './helpers.ts';

let ctx: TestContext;
let db: pg.Client;
before(async () => {
  ctx = await startApp();
  db = new pg.Client();
  await db.connect();
});
after(async () => {
  await db.end();
  await ctx.app.close();
});

test('wrong password gives 401 without a session cookie', async () => {
  const res = await ctx.request('/auth/login', {
    method: 'POST',
    body: { email: 'admin@demo.test', password: 'wrong-password' },
  });
  assert.equal(res.status, 401);
  assert.equal(res.headers.get('set-cookie'), null);
});

test('old cookie stops working after logout', async () => {
  const cookie = await ctx.login('north@demo.test');
  assert.equal((await ctx.request('/auth/me', { cookie })).status, 200);

  const logout = await ctx.request('/auth/logout', { method: 'POST', cookie });
  assert.equal(logout.status, 204);
  assert.equal((await ctx.request('/auth/me', { cookie })).status, 401);
});

test('expired session gives 401', async (t) => {
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  await db.query(
    `INSERT INTO sessions (token_hash, user_id, expires_at)
     SELECT $1, id, now() - interval '1 hour' FROM users WHERE email = 'north@demo.test'`,
    [tokenHash],
  );
  t.after(() => db.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]));

  assert.equal((await ctx.request('/auth/me', { cookie: `sid=${token}` })).status, 401);
});

test('login removes expired sessions', async () => {
  const tokenHash = createHash('sha256').update(randomBytes(32)).digest('hex');
  await db.query(
    `INSERT INTO sessions (token_hash, user_id, expires_at)
     SELECT $1, id, now() - interval '1 hour' FROM users WHERE email = 'north@demo.test'`,
    [tokenHash],
  );
  await ctx.login('north@demo.test');
  const { rows } = await db.query('SELECT 1 FROM sessions WHERE token_hash = $1', [tokenHash]);
  assert.equal(rows.length, 0);
});

test('login accepts only JSON and rejects cross-site requests', async () => {
  const form = await ctx.request('/auth/login', {
    method: 'POST',
    body: 'email=north%40demo.test&password=demo-password',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
  });
  assert.equal(form.status, 415);
  assert.equal(form.headers.get('set-cookie'), null);

  const crossSite = await ctx.request('/auth/login', {
    method: 'POST',
    body: { email: 'north@demo.test', password: 'demo-password' },
    headers: { 'sec-fetch-site': 'cross-site' },
  });
  assert.equal(crossSite.status, 403);
  assert.equal(crossSite.headers.get('set-cookie'), null);
});

test('five failed logins block the email for this IP with 429 and Retry-After', async () => {
  const email = 'gaika@demo.test';
  for (let i = 0; i < 5; i++) {
    const res = await ctx.request('/auth/login', { method: 'POST', body: { email, password: 'wrong-password' } });
    assert.equal(res.status, 401);
  }
  const blocked = await ctx.request('/auth/login', { method: 'POST', body: { email, password: 'demo-password' } });
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get('retry-after')) > 0);
  assert.equal(blocked.headers.get('set-cookie'), null);

  assert.equal((await ctx.request('/auth/login', { method: 'POST', body: { email: 'north@demo.test', password: 'demo-password' } })).status, 200);
});

test('security headers are set and X-Powered-By is not', async () => {
  const res = await ctx.request('/health');
  assert.equal(res.headers.get('x-powered-by'), null);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('x-frame-options'), 'DENY');
});
