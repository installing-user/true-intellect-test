import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import pg from 'pg';
import { startApp, type TestContext } from './helpers.ts';

const DAY_MS = 86_400_000;

let ctx: TestContext;
let admin: string;
let db: pg.Client;
let companyId: number | undefined;
let from: string;
let to: string;

before(async () => {
  ctx = await startApp();
  admin = await ctx.login('admin@demo.test');
  db = new pg.Client();
  await db.connect();
  const { rows: [latest] } = await db.query<{ day: string }>("SELECT to_char(max(date), 'YYYY-MM-DD') AS day FROM daily_metrics");
  to = latest.day;
  from = new Date(Date.parse(to) - 59 * DAY_MS).toISOString().slice(0, 10);
  const companies = (await ctx.request('/companies', { cookie: admin })).body;
  for (const company of companies) {
    const branches = (await ctx.request(`/branches?companyId=${company.id}`, { cookie: admin })).body;
    if (branches.length > 1) {
      companyId = company.id;
      break;
    }
  }
  assert.ok(companyId, 'seed should have a company with several branches');
});
after(async () => {
  await db.end();
  await ctx.app.close();
});

const analytics = async (query: string) => {
  const res = await ctx.request(`/analytics?from=${from}&to=${to}&${query}`, { cookie: admin });
  assert.equal(res.status, 200);
  return res.body;
};

test('company summary equals the sum of its branches', async () => {
  const company = await analytics(`companyId=${companyId}`);
  const branches = (await ctx.request(`/branches?companyId=${companyId}`, { cookie: admin })).body;

  const perBranch = await Promise.all(branches.map((b: { id: number }) => analytics(`branchId=${b.id}`)));
  for (const key of ['views', 'siteClicks', 'calls', 'routes', 'reviewsCount']) {
    const sum: number = perBranch.reduce((acc: number, b) => acc + b.summary[key], 0);
    assert.equal(company.summary[key], sum, key);
  }
});

test('avgRating is weighted by number of reviews', async () => {
  const company = await analytics(`companyId=${companyId}`);
  const { rows } = await db.query<{ branch_id: number; total: number; n: number }>(
    `SELECT r.branch_id, sum(r.rating)::int AS total, count(*)::int AS n
     FROM reviews r JOIN branches b ON b.id = r.branch_id
     WHERE b.company_id = $1 AND r.published_at >= $2::date::timestamp AT TIME ZONE 'UTC'
       AND r.published_at < ($3::date + 1)::timestamp AT TIME ZONE 'UTC'
     GROUP BY r.branch_id`,
    [companyId, from, to],
  );
  const total = rows.reduce((acc, r) => acc + r.total, 0);
  const n = rows.reduce((acc, r) => acc + r.n, 0);
  const weighted = Math.round((total / n) * 10) / 10;
  const meanOfMeans = Math.round((rows.reduce((acc, r) => acc + r.total / r.n, 0) / rows.length) * 10) / 10;

  assert.equal(company.summary.reviewsCount, n);
  assert.equal(company.summary.avgRating, weighted);
  assert.notEqual(weighted, meanOfMeans, 'seed should make the two averages differ');
});

test('timeseries has one row per day of the period', async () => {
  const body = await analytics(`companyId=${companyId}`);
  assert.equal(body.timeseries.length, 60);
  assert.equal(body.timeseries[0].date, from);
  assert.equal(body.timeseries.at(-1).date, to);
  assert.ok(body.timeseries.every((d: { views: unknown }) => typeof d.views === 'number'));
});

test('default period ends at the latest day with data', async () => {
  const res = await ctx.request('/analytics', { cookie: admin });
  assert.equal(res.status, 200);
  assert.equal(res.body.period.to, to);
  assert.equal(res.body.period.from, new Date(Date.parse(to) - 29 * DAY_MS).toISOString().slice(0, 10));
  const lastDay = res.body.timeseries.at(-1);
  assert.equal(lastDay.date, to);
  assert.ok(lastDay.views > 0 && lastDay.calls > 0);
});

test('dates outside 2000..2100 or invalid give 400', async () => {
  for (const query of [
    'from=0000-01-01&to=0000-12-31',
    'from=1999-12-31&to=2000-01-10',
    'from=2101-01-01&to=2101-01-02',
    'from=2024-02-30',
    'to=20240101',
  ]) {
    const res = await ctx.request(`/analytics?${query}`, { cookie: admin });
    assert.equal(res.status, 400, query);
    const reviews = await ctx.request(`/reviews?${query}`, { cookie: admin });
    assert.equal(reviews.status, 400, query);
  }
});
