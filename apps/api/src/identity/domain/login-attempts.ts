export const MAX_FAILED_LOGINS = 5;
export const LOGIN_WINDOW_MS = 15 * 60_000;
const SWEEP_THRESHOLD = 10_000;

interface Failures {
  count: number;
  windowEnds: number;
}

// shortcut: counters live in process memory, so each API instance limits separately; move to the database or Redis when running several instances
export class LoginAttempts {
  private readonly failures = new Map<string, Failures>();

  constructor(private readonly now: () => number = Date.now) {}

  retryAfterSeconds(key: string): number {
    const entry = this.current(key);
    if (!entry || entry.count < MAX_FAILED_LOGINS) return 0;
    return Math.ceil((entry.windowEnds - this.now()) / 1000);
  }

  fail(key: string): void {
    const entry = this.current(key);
    if (entry) entry.count += 1;
    else {
      if (this.failures.size >= SWEEP_THRESHOLD) this.sweep();
      this.failures.set(key, { count: 1, windowEnds: this.now() + LOGIN_WINDOW_MS });
    }
  }

  reset(key: string): void {
    this.failures.delete(key);
  }

  private current(key: string): Failures | undefined {
    const entry = this.failures.get(key);
    if (entry && entry.windowEnds <= this.now()) {
      this.failures.delete(key);
      return undefined;
    }
    return entry;
  }

  private sweep(): void {
    const now = this.now();
    for (const [key, entry] of this.failures) if (entry.windowEnds <= now) this.failures.delete(key);
  }
}
