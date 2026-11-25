import assert from 'node:assert/strict';
import { test } from 'node:test';

const distDir = new URL(`../${process.env.API_DIST ?? 'dist'}/`, import.meta.url);
const { TokenBucket } = (await import(new URL('identity/domain/token-bucket.js', distDir).href)) as {
  TokenBucket: new (
    capacity: number,
    refillMs: number,
    now: () => number,
  ) => { take(key: string): void; retryAfterSeconds(key: string): number };
};

test('token bucket allows a burst, then refills one token per interval', () => {
  let now = 0;
  const bucket = new TokenBucket(3, 1000, () => now);

  for (let attempt = 0; attempt < 3; attempt++) {
    assert.equal(bucket.retryAfterSeconds('ip'), 0);
    bucket.take('ip');
  }

  assert.equal(bucket.retryAfterSeconds('ip'), 1);
  assert.equal(bucket.retryAfterSeconds('other'), 0);

  now = 999;
  assert.equal(bucket.retryAfterSeconds('ip'), 1);
  now = 1000;
  assert.equal(bucket.retryAfterSeconds('ip'), 0);
  bucket.take('ip');
  assert.equal(bucket.retryAfterSeconds('ip'), 1);

  now = 10_000;
  for (let attempt = 0; attempt < 3; attempt++) bucket.take('ip');
  assert.equal(bucket.retryAfterSeconds('ip'), 1, 'refill is capped at capacity');
});
