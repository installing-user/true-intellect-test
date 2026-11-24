import { randomBytes, scryptSync } from 'node:crypto';
import pg from 'pg';

const DEMO_PASSWORD = 'demo-password';
const DAYS = 90;
const ifEmpty = process.argv.includes('--if-empty');

if (!ifEmpty && process.env.NODE_ENV === 'production') {
  console.error('seed: refusing to wipe data with NODE_ENV=production; use --if-empty');
  process.exit(1);
}

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString('hex')}$${scryptSync(password, salt, 64).toString('hex')}`;
}

const companies: { name: string; user: string; branches: [name: string, address: string][] }[] = [
  {
    name: 'Кофейни «Северный ветер»',
    user: 'north@demo.test',
    branches: [
      ['Северный ветер на Ясной', 'г. Светлогорск-на-Неве, ул. Ясная, 12'],
      ['Северный ветер у парка', 'г. Светлогорск-на-Неве, Парковый пр., 3'],
      ['Северный ветер на вокзале', 'г. Светлогорск-на-Неве, Вокзальная пл., 1'],
    ],
  },
  {
    name: 'Автосервис «Гайка»',
    user: 'gaika@demo.test',
    branches: [
      ['Гайка на Кольцевой', 'г. Новоозёрск, Кольцевая ул., 45'],
      ['Гайка в Промзоне', 'г. Новоозёрск, Промышленный пр., 8, стр. 2'],
    ],
  },
];

const authors = ['Анна К.', 'Игорь П.', 'Мария С.', 'Дмитрий Л.', 'Ольга В.', 'Сергей Н.', 'Елена Т.', 'Павел Р.'];
const texts: Record<number, string> = {
  1: 'Очень плохо, больше не приду.',
  2: 'Ожидал большего, есть проблемы с обслуживанием.',
  3: 'Нормально, но есть что улучшить.',
  4: 'Хорошо, рекомендую.',
  5: 'Отлично, всё понравилось!',
};
const statuses = ['new', 'in_progress', 'done'];

const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
const dayMs = 86_400_000;

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

  await client.query(
    "INSERT INTO users (email, password_hash, role) VALUES ('admin@demo.test', $1, 'admin')",
    [hashPassword(DEMO_PASSWORD)],
  );

  let branchNo = 0;
  for (const company of companies) {
    const { rows: [{ id: companyId }] } = await client.query<{ id: number }>(
      'INSERT INTO companies (name) VALUES ($1) RETURNING id',
      [company.name],
    );
    await client.query(
      "INSERT INTO users (email, password_hash, role, company_id) VALUES ($1, $2, 'client', $3)",
      [company.user, hashPassword(DEMO_PASSWORD), companyId],
    );

    for (const [name, address] of company.branches) {
      branchNo += 1;
      const { rows: [{ id: branchId }] } = await client.query<{ id: number }>(
        'INSERT INTO branches (company_id, name, address) VALUES ($1, $2, $3) RETURNING id',
        [companyId, name, address],
      );

      const dates: string[] = [];
      const views: number[] = [];
      const clicks: number[] = [];
      const calls: number[] = [];
      const routes: number[] = [];
      for (let d = 0; d < DAYS; d++) {
        const date = new Date(today.getTime() - (DAYS - 1 - d) * dayMs);
        // weekly wave plus a slow upward trend, deterministic so tests are reproducible
        const base = 80 + branchNo * 35 + d * (branchNo % 3 + 1) * 0.6;
        const wave = 1 + 0.25 * Math.sin(((date.getUTCDay() + branchNo) / 7) * 2 * Math.PI);
        const v = Math.round(base * wave);
        dates.push(date.toISOString().slice(0, 10));
        views.push(v);
        clicks.push(Math.round(v * (0.05 + branchNo * 0.01)));
        calls.push(Math.round(v * 0.03) + (d % 4));
        routes.push(Math.round(v * (0.08 + (branchNo % 2) * 0.04)));
      }
      await client.query(
        `INSERT INTO daily_metrics (branch_id, date, views, site_clicks, calls, routes)
         SELECT $1, * FROM unnest($2::date[], $3::int[], $4::int[], $5::int[], $6::int[])`,
        [branchId, dates, views, clicks, calls, routes],
      );

      const count = 30 + ((branchNo * 7) % 11);
      for (let i = 0; i < count; i++) {
        const k = i * 31 + branchNo * 17;
        // each branch leans to a different average rating
        const rating = Math.min(5, Math.max(1, (k % 5) + (branchNo % 3)));
        const publishedAt = new Date(
          today.getTime() - Math.floor((i * DAYS) / count) * dayMs + ((k * 3_607_000) % dayMs),
        );
        await client.query(
          `INSERT INTO reviews (branch_id, author_name, rating, text, status, published_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [branchId, authors[k % authors.length], rating, texts[rating], statuses[(k >> 1) % 3], publishedAt],
        );
      }
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
