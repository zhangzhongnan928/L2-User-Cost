type CacheEntry<T> = {
  value: T;
  updatedAtMs: number;
};

export class TimedCache<T> {
  private store: Map<string, CacheEntry<T>> = new Map();
  constructor(private ttlMs: number) {}

  get(key: string): CacheEntry<T> | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    const isExpired = Date.now() - entry.updatedAtMs > this.ttlMs;
    if (isExpired) return undefined;
    return entry;
  }

  set(key: string, value: T): CacheEntry<T> {
    const entry = { value, updatedAtMs: Date.now() } as CacheEntry<T>;
    this.store.set(key, entry);
    return entry;
  }

  // Return entry without TTL checks (may be expired). Useful for fallbacks.
  peek(key: string): CacheEntry<T> | undefined {
    return this.store.get(key);
  }
}

export const TEN_SECONDS_MS = 10_000;

