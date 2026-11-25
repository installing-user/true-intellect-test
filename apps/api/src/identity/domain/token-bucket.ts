export const LOGIN_BURST = 10;
export const LOGIN_REFILL_MS = 60_000;
// larger and slower than the IP bucket: it stops a distributed guess at one account while keeping a lockout by a stranger short
export const ACCOUNT_LOGIN_BURST = 20;
export const ACCOUNT_LOGIN_REFILL_MS = 180_000;
const SWEEP_THRESHOLD = 10_000;

interface Bucket {
  tokens: number;
  updatedAt: number;
}

// shortcut: buckets live in process memory, so each API instance limits separately; move to Redis when running several instances
export class TokenBucket {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly capacity = LOGIN_BURST,
    private readonly refillMs = LOGIN_REFILL_MS,
    private readonly now: () => number = Date.now,
  ) {}

  retryAfterSeconds(key: string): number {
    const tokens = this.refill(key)?.tokens ?? this.capacity;

    return tokens >= 1 ? 0 : Math.ceil(((1 - tokens) * this.refillMs) / 1000);
  }

  take(key: string): void {
    const bucket = this.refill(key);

    if (bucket) {
      bucket.tokens = Math.max(0, bucket.tokens - 1);

      return;
    }

    if (this.buckets.size >= SWEEP_THRESHOLD) this.sweep();
    this.buckets.set(key, { tokens: this.capacity - 1, updatedAt: this.now() });
  }

  // a full bucket is the same as no bucket, so it is dropped to keep memory bounded by active offenders
  private refill(key: string): Bucket | undefined {
    const bucket = this.buckets.get(key);

    if (!bucket) return undefined;
    const now = this.now();

    bucket.tokens = Math.min(this.capacity, bucket.tokens + (now - bucket.updatedAt) / this.refillMs);
    bucket.updatedAt = now;
    if (bucket.tokens < this.capacity) return bucket;
    this.buckets.delete(key);

    return undefined;
  }

  private sweep(): void {
    for (const key of [...this.buckets.keys()]) this.refill(key);
  }
}
