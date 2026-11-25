import { readdir, readFile } from 'node:fs/promises';
import pg from 'pg';

const dir = new URL('./migrations/', import.meta.url);
const client = new pg.Client();

await client.connect();

try {
  await client.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
  );
  const { rows } = await client.query<{ name: string }>('SELECT name FROM schema_migrations');
  const applied = new Set(rows.map((row) => row.name));
  const files = (await readdir(dir)).filter((fileName) => fileName.endsWith('.sql')).sort();

  for (const name of files) {
    if (applied.has(name)) continue;
    const sql = await readFile(new URL(name, dir), 'utf8');

    await client.query('BEGIN');

    try {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name]);
      await client.query('COMMIT');
      console.log(`applied ${name}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }
} finally {
  await client.end();
}
