import { randomBytes, scryptSync } from 'node:crypto';
import pg from 'pg';
import { authors, companies, DAYS, DEMO_PASSWORD, statuses, texts } from './seed-data.ts';

const ifEmpty = process.argv.includes('--if-empty');

if (!ifEmpty && process.env.NODE_ENV === 'production') {
  console.error('seed: refusing to wipe data with NODE_ENV=production; use --if-empty');
  process.exit(1);
}

function hashPassword(password: string): string {
  const salt = randomBytes(16);

  return `scrypt$${salt.toString('hex')}$${scryptSync(password, salt, 64).toString('hex')}`;
}

const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
const dayMs = 86_400_000;

function dailyMetrics(branchNo: number) {
  const dates: string[] = [];
  const views: number[] = [];
  const clicks: number[] = [];
  const calls: number[] = [];
  const routes: number[] = [];

  for (let day = 0; day < DAYS; day++) {
    const date = new Date(today.getTime() - (DAYS - 1 - day) * dayMs);
    // weekly wave plus a slow upward trend, deterministic so tests are reproducible
    const base = 80 + branchNo * 35 + day * ((branchNo % 3) + 1) * 0.6;
    const wave = 1 + 0.25 * Math.sin(((date.getUTCDay() + branchNo) / 7) * 2 * Math.PI);
    const viewCount = Math.round(base * wave);

    dates.push(date.toISOString().slice(0, 10));
    views.push(viewCount);
    clicks.push(Math.round(viewCount * (0.05 + branchNo * 0.01)));
    calls.push(Math.round(viewCount * 0.03) + (day % 4));
    routes.push(Math.round(viewCount * (0.08 + (branchNo % 2) * 0.04)));
  }

  return { dates, views, clicks, calls, routes };
}

async function insertReviews(branchId: number, branchNo: number) {
  const count = 30 + ((branchNo * 7) % 11);

  for (let index = 0; index < count; index++) {
    const seedKey = index * 31 + branchNo * 17;
    // each branch leans to a different average rating
    const rating = Math.min(5, Math.max(1, (seedKey % 5) + (branchNo % 3)));
    const publishedAt = new Date(
      today.getTime() - Math.floor((index * DAYS) / count) * dayMs + ((seedKey * 3_607_000) % dayMs),
    );

    await client.query(
      `INSERT INTO reviews (branch_id, author_name, rating, text, status, published_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [branchId, authors[seedKey % authors.length], rating, texts[rating], statuses[(seedKey >> 1) % 3], publishedAt],
    );
  }
}

const client = new pg.Client();

await client.connect();

try {
  await client.query('BEGIN');

  if (ifEmpty) {
    const { rows } = await client.query('SELECT 1 FROM companies LIMIT 1');

    if (rows.length > 0) {
      await client.query('ROLLBACK');
      console.log('seed: database is not empty, skipped');
      process.exit(0);
    }
  } else {
    await client.query(
      'TRUNCATE companies, branches, users, sessions, daily_metrics, reviews RESTART IDENTITY CASCADE',
    );
  }

  await client.query("INSERT INTO users (email, password_hash, role) VALUES ('admin@demo.test', $1, 'admin')", [
    hashPassword(DEMO_PASSWORD),
  ]);

  let branchNo = 0;

  for (const company of companies) {
    const {
      rows: [{ id: companyId }],
    } = await client.query<{ id: number }>('INSERT INTO companies (name) VALUES ($1) RETURNING id', [company.name]);

    await client.query("INSERT INTO users (email, password_hash, role, company_id) VALUES ($1, $2, 'client', $3)", [
      company.user,
      hashPassword(DEMO_PASSWORD),
      companyId,
    ]);

    for (const [name, address] of company.branches) {
      branchNo += 1;
      const {
        rows: [{ id: branchId }],
      } = await client.query<{ id: number }>(
        'INSERT INTO branches (company_id, name, address) VALUES ($1, $2, $3) RETURNING id',
        [companyId, name, address],
      );

      const { dates, views, clicks, calls, routes } = dailyMetrics(branchNo);

      await client.query(
        `INSERT INTO daily_metrics (branch_id, date, views, site_clicks, calls, routes)
         SELECT $1, * FROM unnest($2::date[], $3::int[], $4::int[], $5::int[], $6::int[])`,
        [branchId, dates, views, clicks, calls, routes],
      );

      await insertReviews(branchId, branchNo);
    }
  }

  await client.query('COMMIT');
  console.log('seed: done');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}
