import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { startApp, type TestContext } from './helpers.ts';

interface ClientContext {
  cookie: string;
  companyId: number;
  foreign?: { companyId: number; branchId: number; review: { id: number; status: string } };
}

let ctx: TestContext;
let admin: string;
const clients: Record<'north' | 'gaika', ClientContext> = {} as Record<'north' | 'gaika', ClientContext>;

async function clientContext(email: string): Promise<ClientContext> {
  const cookie = await ctx.login(email);
  const me = await ctx.request('/auth/me', { cookie });
  return { cookie, companyId: me.body.companyId };
}

before(async () => {
  ctx = await startApp();
  admin = await ctx.login('admin@demo.test');
  clients.north = await clientContext('north@demo.test');
  clients.gaika = await clientContext('gaika@demo.test');
  for (const [self, other] of [['north', 'gaika'], ['gaika', 'north']] as const) {
    const foreignCompanyId = clients[other].companyId;
    const branches = await ctx.request(`/branches?companyId=${foreignCompanyId}`, { cookie: admin });
    const reviews = await ctx.request(`/reviews?companyId=${foreignCompanyId}&limit=1`, { cookie: admin });
    clients[self].foreign = {
      companyId: foreignCompanyId,
      branchId: branches.body[0].id,
      review: reviews.body.items[0],
    };
  }
  assert.notEqual(clients.north.companyId, clients.gaika.companyId);
});
after(() => ctx.app.close());

for (const name of ['north', 'gaika'] as const) {
  describe(`client ${name}`, () => {
    test('sees only branches and company of its own', async () => {
      const { cookie, companyId } = clients[name];
      const res = await ctx.request('/branches', { cookie });
      assert.equal(res.status, 200);
      assert.ok(res.body.length > 0);
      assert.ok(res.body.every((b: { companyId: number }) => b.companyId === companyId));

      const companies = await ctx.request('/companies', { cookie });
      assert.deepEqual(companies.body.map((c: { id: number }) => c.id), [companyId]);
    });

    test('foreign companyId and branchId give 404', async () => {
      const { cookie, foreign } = clients[name] as Required<ClientContext>;
      for (const path of [
        `/branches?companyId=${foreign.companyId}`,
        `/analytics?companyId=${foreign.companyId}`,
        `/analytics?branchId=${foreign.branchId}`,
        `/reviews?companyId=${foreign.companyId}`,
        `/reviews?branchId=${foreign.branchId}`,
      ]) {
        const res = await ctx.request(path, { cookie });
        assert.equal(res.status, 404, path);
        assert.equal(res.body.summary, undefined, path);
        assert.equal(res.body.items, undefined, path);
      }
    });

    test('summary equals admin summary for own company', async () => {
      const { cookie, companyId } = clients[name];
      const mine = await ctx.request('/analytics', { cookie });
      const adminView = await ctx.request(`/analytics?companyId=${companyId}`, { cookie: admin });
      assert.equal(mine.status, 200);
      assert.deepEqual(mine.body, adminView.body);

      const all = await ctx.request('/analytics', { cookie: admin });
      assert.ok(all.body.summary.views > mine.body.summary.views);
    });

    test('reviews belong to own company and respect filters', async () => {
      const { cookie } = clients[name];
      const ownBranches = await ctx.request('/branches', { cookie });
      const ownIds = new Set(ownBranches.body.map((b: { id: number }) => b.id));

      const all = await ctx.request('/reviews?limit=100', { cookie });
      assert.equal(all.status, 200);
      assert.ok(all.body.total > 0);
      assert.ok(all.body.items.every((r: { branchId: number }) => ownIds.has(r.branchId)));

      const filtered = await ctx.request('/reviews?rating=1&status=new&limit=100', { cookie });
      assert.equal(filtered.status, 200);
      assert.ok(filtered.body.items.every((r: { rating: number; status: string }) => r.rating === 1 && r.status === 'new'));
      assert.ok(filtered.body.total < all.body.total);
    });

    test('cannot change review of another company', async () => {
      const { cookie, foreign } = clients[name] as Required<ClientContext>;
      const target = foreign.review;
      const newStatus = target.status === 'done' ? 'new' : 'done';

      const res = await ctx.request(`/reviews/${target.id}`, { cookie, method: 'PATCH', body: { status: newStatus } });
      assert.equal(res.status, 404);

      const reread = await ctx.request(`/reviews?companyId=${foreign.companyId}&limit=1`, { cookie: admin });
      assert.equal(reread.body.items[0].id, target.id);
      assert.equal(reread.body.items[0].status, target.status);
    });
  });
}

test('invalid review filters give 400', async () => {
  for (const path of ['/reviews?rating=7', '/reviews?rating=0', '/reviews?status=bad', '/reviews?limit=101', '/reviews?companyId=1&companyId=2']) {
    const res = await ctx.request(path, { cookie: clients.north.cookie });
    assert.equal(res.status, 400, path);
  }
});

test('requests without session cookie give 401', async () => {
  for (const path of ['/companies', '/branches', '/analytics', '/reviews']) {
    const res = await ctx.request(path);
    assert.equal(res.status, 401, path);
  }
});

test('client changes status of own review', async (t) => {
  const { cookie } = clients.north;
  const own = await ctx.request('/reviews?limit=1', { cookie });
  const target = own.body.items[0];
  const newStatus = target.status === 'done' ? 'in_progress' : 'done';
  t.after(() =>
    ctx.request(`/reviews/${target.id}`, { cookie: admin, method: 'PATCH', body: { status: target.status } }),
  );

  const res = await ctx.request(`/reviews/${target.id}`, { cookie, method: 'PATCH', body: { status: newStatus } });
  assert.equal(res.status, 200);
  assert.equal(res.body.id, target.id);
  assert.equal(res.body.status, newStatus);

  const reread = await ctx.request('/reviews?limit=1', { cookie });
  assert.equal(reread.body.items[0].status, newStatus);

  const invalid = await ctx.request(`/reviews/${target.id}`, { cookie, method: 'PATCH', body: { status: 'bad' } });
  assert.equal(invalid.status, 400);
  const anonymous = await ctx.request(`/reviews/${target.id}`, { method: 'PATCH', body: { status: 'new' } });
  assert.equal(anonymous.status, 401);
  const crossSite = await ctx.request(`/reviews/${target.id}`, {
    cookie,
    method: 'PATCH',
    body: { status: target.status },
    headers: { 'sec-fetch-site': 'cross-site' },
  });
  assert.equal(crossSite.status, 403);
  const form = await ctx.request(`/reviews/${target.id}`, {
    cookie,
    method: 'PATCH',
    body: 'status=new',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
  });
  assert.equal(form.status, 415);
});
