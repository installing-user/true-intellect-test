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

test('session cookie is Secure only when the request came over HTTPS', async () => {
  const body = { email: 'north@demo.test', password: 'demo-password' };
  const plain = await ctx.request('/auth/login', { method: 'POST', body });
  const overHttps = await ctx.request('/auth/login', {
    method: 'POST',
    body,
    headers: { 'x-forwarded-proto': 'https' },
  });

  assert.doesNotMatch(plain.headers.get('set-cookie') ?? '', /;\s*Secure/i);
  assert.match(overHttps.headers.get('set-cookie') ?? '', /;\s*Secure/i);
});

test('old cookie stops working after logout', async () => {
  const cookie = await ctx.login('north@demo.test');

  assert.equal((await ctx.request('/auth/me', { cookie })).status, 200);

  const logout = await ctx.request('/auth/logout', { method: 'POST', cookie });

  assert.equal(logout.status, 204);
  assert.equal((await ctx.request('/auth/me', { cookie })).status, 401);
});

test('expired session gives 401', async (context) => {
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');

  await db.query(
    `INSERT INTO sessions (token_hash, user_id, expires_at)
     SELECT $1, id, now() - interval '1 hour' FROM users WHERE email = 'north@demo.test'`,
    [tokenHash],
  );
  context.after(() => db.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]));

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

test('failed logins from many IPs drain the account bucket: then even the right password gets 429', async () => {
  const email = 'gaika@demo.test';
  let res;
  let attempts = 0;

  do {
    res = await ctx.request('/auth/login', {
      method: 'POST',
      body: { email, password: 'wrong-password' },
      headers: { 'x-forwarded-for': `10.20.${attempts}.1` },
    });
    attempts += 1;
  } while (res.status === 401 && attempts <= 40);

  assert.equal(res.status, 429);
  assert.ok(attempts <= 21, `limited after ${attempts} attempts`);

  const rightPassword = await ctx.request('/auth/login', {
    method: 'POST',
    body: { email, password: 'demo-password' },
    headers: { 'x-forwarded-for': '10.30.0.1' },
  });
  const retryAfter = Number(rightPassword.headers.get('retry-after'));

  assert.equal(rightPassword.status, 429);
  assert.ok(retryAfter > 0 && retryAfter <= 180, `Retry-After ${retryAfter}`);

  const otherAccount = await ctx.request('/auth/login', {
    method: 'POST',
    body: { email: 'admin@demo.test', password: 'demo-password' },
    headers: { 'x-forwarded-for': '10.30.0.2' },
  });

  assert.equal(otherAccount.status, 200);
});

test('failed logins drain the IP token bucket: then any email from this IP gets 429 with Retry-After', async () => {
  let res;
  let attempts = 0;

  do {
    res = await ctx.request('/auth/login', {
      method: 'POST',
      body: { email: `user${attempts}@demo.test`, password: 'wrong-password' },
    });
    attempts += 1;
  } while (res.status === 401 && attempts <= 20);

  assert.equal(res.status, 429);
  assert.ok(attempts <= 11, `limited after ${attempts} attempts`);
  const retryAfter = Number(res.headers.get('retry-after'));

  assert.ok(retryAfter > 0 && retryAfter <= 60, `Retry-After ${retryAfter}`);
  assert.equal(res.headers.get('set-cookie'), null);

  const valid = await ctx.request('/auth/login', {
    method: 'POST',
    body: { email: 'north@demo.test', password: 'demo-password' },
  });

  assert.equal(valid.status, 429);
});

test('security headers are set and X-Powered-By is not', async () => {
  const res = await ctx.request('/health');

  assert.equal(res.headers.get('x-powered-by'), null);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('x-frame-options'), 'DENY');
});
